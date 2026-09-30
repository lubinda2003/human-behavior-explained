import type { D1InteractionRepository } from './repository';
import type { VoteTracker } from './vote-tracker';
import type { DiscussionProcessingResult, InteractionRecord, TelegramMessage, TelegramUpdate } from './types';

export interface WebhookHandlerOptions {
  secretToken?: string;
}

export class TelegramWebhookHandler {
  constructor(
    private readonly repo: D1InteractionRepository,
    private readonly voteTracker: VoteTracker,
    private readonly options?: WebhookHandlerOptions,
  ) {}

  /**
   * Validates webhook authentication headers.
   * Safe error handling without logging or leaking secrets.
   */
  validateAuth(requestHeaders: Headers): boolean {
    const configuredSecret = this.options?.secretToken;
    if (!configuredSecret) {
      // No secret configured, allow (e.g. local development / tests)
      return true;
    }

    const providedSecret = requestHeaders.get('x-telegram-bot-api-secret-token');
    if (!providedSecret) {
      return false;
    }

    // Constant-time-like string comparison to avoid timing attacks
    if (providedSecret.length !== configuredSecret.length) {
      return false;
    }

    let mismatch = 0;
    for (let i = 0; i < providedSecret.length; i++) {
      mismatch |= providedSecret.charCodeAt(i) ^ configuredSecret.charCodeAt(i);
    }
    return mismatch === 0;
  }

  async handleUpdate(
    update: TelegramUpdate,
    requestHeaders?: Headers,
    nowIso?: string,
  ): Promise<{ status: number; body: Record<string, unknown> }> {
    const now = nowIso ?? new Date().toISOString();

    // 1. Webhook Authentication
    if (requestHeaders && !this.validateAuth(requestHeaders)) {
      console.warn('[TelegramWebhookHandler] Rejected unauthorized request: secret token mismatch');
      return {
        status: 401,
        body: { ok: false, error: 'Unauthorized: invalid secret token' },
      };
    }

    if (!update || typeof update.update_id !== 'number') {
      return {
        status: 400,
        body: { ok: false, error: 'Bad Request: missing update_id' },
      };
    }

    // 2. Idempotency & Deduplication
    const isNewEvent = await this.repo.recordWebhookEvent({
      updateId: update.update_id,
      eventType: update.poll_answer
        ? 'poll_answer'
        : update.poll
        ? 'poll'
        : update.message
        ? 'message'
        : 'other',
      payloadJson: JSON.stringify(update),
      receivedAt: now,
      status: 'processed',
    });

    if (!isNewEvent) {
      // Duplicate update already received; return 200 OK idempotently
      return {
        status: 200,
        body: { ok: true, duplicate: true, update_id: update.update_id },
      };
    }

    // 3. Process poll_answer (non-anonymous / direct user votes)
    if (update.poll_answer) {
      const voteResult = await this.voteTracker.processPollAnswer(update.poll_answer, now);
      return {
        status: 200,
        body: { ok: true, update_id: update.update_id, voteResult },
      };
    }

    // 4. Process poll updates (anonymous / channel polls)
    if (update.poll) {
      await this.repo.updatePollCountsFromTelegram(update.poll, now);
      return {
        status: 200,
        body: { ok: true, update_id: update.update_id, pollUpdated: true },
      };
    }

    // 5. Process discussion messages / replies
    if (update.message) {
      const discussionResult = await this.processDiscussionMessage(update.message, now);
      return {
        status: 200,
        body: { ok: true, update_id: update.update_id, discussionResult },
      };
    }

    // Other updates (e.g. service messages) acknowledged safely
    return {
      status: 200,
      body: { ok: true, update_id: update.update_id, acknowledged: true },
    };
  }

  async processDiscussionMessage(
    message: TelegramMessage,
    now: string,
  ): Promise<DiscussionProcessingResult> {
    if (!message || typeof message.message_id !== 'number') {
      return { status: 'noop', messageId: 0 };
    }

    // 1. Upsert user if message author is present
    let userRecord = null;
    if (message.from && !message.from.is_bot) {
      userRecord = await this.repo.upsertUser({
        telegramUserId: message.from.id,
        username: message.from.username,
        firstName: message.from.first_name,
        lastName: message.from.last_name,
        languageCode: message.from.language_code,
        isBot: false,
        nowIso: now,
      });
    }

    // 2. Resolve associated interaction
    let interaction: InteractionRecord | null = null;

    const reply = message.reply_to_message;
    if (reply) {
      // Check forward_from_message_id (channel post forwarded to discussion group)
      if (reply.forward_from_message_id) {
        interaction = await this.repo.getInteractionByMainMessageId(reply.forward_from_message_id);
      }

      // Check direct reply to mainMessageId
      if (!interaction && reply.message_id) {
        interaction = await this.repo.getInteractionByMainMessageId(reply.message_id);
      }

      // Check reply to any published message
      if (!interaction && reply.message_id) {
        const pubMsg = await this.repo.getPublishedMessageByMessageId(reply.message_id);
        if (pubMsg) {
          interaction = await this.repo.getInteractionByPostId(pubMsg.postId);
        }
      }

      // Check reply to poll
      if (!interaction && reply.message_id) {
        const poll = await this.repo.getPollByMessageId(reply.message_id);
        if (poll) {
          interaction = await this.repo.getInteraction(poll.interactionId);
        }
      }
    }

    // Check message_thread_id
    if (!interaction && message.message_thread_id) {
      interaction = await this.repo.getInteractionByMainMessageId(message.message_thread_id);
      if (!interaction) {
        const pubMsg = await this.repo.getPublishedMessageByMessageId(message.message_thread_id);
        if (pubMsg) {
          interaction = await this.repo.getInteractionByPostId(pubMsg.postId);
        }
      }
    }

    if (!interaction) {
      return {
        status: 'unassociated_message',
        messageId: message.message_id,
        threadId: message.message_thread_id,
      };
    }

    // Invariant: Closed/completed/failed interaction MUST NOT be reopened or changed by comments
    if (interaction.lifecycleState !== 'OPEN') {
      return {
        status: 'ignored_closed',
        interactionId: interaction.id,
        postId: interaction.postId,
        userId: userRecord?.id,
        messageId: message.message_id,
        threadId: message.message_thread_id,
      };
    }

    // Record discussion activity safely on interaction without modifying lifecycle state
    await this.repo.recordInteractionDiscussionActivity(interaction.id, {
      threadId: message.message_thread_id,
      lastCommentAt: now,
    });

    return {
      status: 'discussion_recorded',
      interactionId: interaction.id,
      postId: interaction.postId,
      userId: userRecord?.id,
      messageId: message.message_id,
      threadId: message.message_thread_id,
    };
  }
}

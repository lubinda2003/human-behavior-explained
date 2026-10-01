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

    // 2. Persistent Event Idempotency & Lease via D1
    const eventType = update.poll_answer
      ? 'poll_answer'
      : update.poll
      ? 'poll'
      : update.message
      ? 'message'
      : update.edited_message || update.edited_channel_post
      ? 'edited_message'
      : 'other';

    const claim = await this.repo.claimWebhookEvent(
      update.update_id,
      eventType,
      JSON.stringify(update),
      now,
    );

    if (!claim.claimed) {
      // Duplicate update already processed or in-progress by another worker
      return {
        status: 200,
        body: {
          ok: true,
          duplicate: true,
          update_id: update.update_id,
          reason: claim.reason,
        },
      };
    }

    try {
      // 3. Process edited messages safely (ignore without triggering side effects)
      if (update.edited_message || update.edited_channel_post) {
        await this.repo.markWebhookEventProcessed(update.update_id, now);
        return {
          status: 200,
          body: { ok: true, update_id: update.update_id, ignored: 'edited_message' },
        };
      }

      // 4. Process poll_answer (non-anonymous / direct user votes)
      if (update.poll_answer) {
        const voteResult = await this.voteTracker.processPollAnswer(update.poll_answer, now);
        await this.repo.markWebhookEventProcessed(update.update_id, now);
        return {
          status: 200,
          body: { ok: true, update_id: update.update_id, voteResult },
        };
      }

      // 5. Process poll updates (anonymous / channel polls)
      if (update.poll) {
        await this.repo.updatePollCountsFromTelegram(update.poll, now);
        await this.repo.markWebhookEventProcessed(update.update_id, now);
        return {
          status: 200,
          body: { ok: true, update_id: update.update_id, pollUpdated: true },
        };
      }

      // 6. Process discussion messages / replies
      if (update.message) {
        const discussionResult = await this.processDiscussionMessage(update.message, now);
        await this.repo.markWebhookEventProcessed(update.update_id, now);
        return {
          status: 200,
          body: { ok: true, update_id: update.update_id, discussionResult },
        };
      }

      // Other updates acknowledged safely
      await this.repo.markWebhookEventProcessed(update.update_id, now);
      return {
        status: 200,
        body: { ok: true, update_id: update.update_id, acknowledged: true },
      };
    } catch (err) {
      // Mark event failed in D1 so a subsequent retry from Telegram can re-claim and resume
      await this.repo.markWebhookEventFailed(
        update.update_id,
        err instanceof Error ? err.message : String(err),
        now,
      );
      throw err;
    }
  }

  /**
   * Deterministically resolves which Pick Your Fate interaction a discussion message belongs to.
   *
   * Precedence Order:
   * 1. Direct channel forward reference (reply.forward_from_message_id)
   * 2. Direct reply to channel post / published message / poll message (reply.message_id)
   * 3. Reply to an existing discussion comment recorded in the discussion group (reply.message_id)
   * 4. Discussion thread / topic identifier (message.message_thread_id)
   * 5. Unassociated (no confident match -> do not guess!)
   */
  async resolveAssociatedInteraction(
    message: TelegramMessage,
  ): Promise<{ interaction: InteractionRecord | null; associationMethod?: string }> {
    const reply = message.reply_to_message;
    const chatId = String(message.chat?.id);

    // Precedence 1: Direct channel forward reference (channel post forwarded to discussion group)
    if (reply?.forward_from_message_id) {
      const byMain = await this.repo.getInteractionByMainMessageId(reply.forward_from_message_id);
      if (byMain) return { interaction: byMain, associationMethod: 'reply_forward_from_main_message' };

      const byPub = await this.repo.getPublishedMessageByMessageId(reply.forward_from_message_id);
      if (byPub) {
        const intByPost = await this.repo.getInteractionByPostId(byPub.postId);
        if (intByPost) return { interaction: intByPost, associationMethod: 'reply_forward_from_published_msg' };
      }

      const byPoll = await this.repo.getPollByMessageId(reply.forward_from_message_id);
      if (byPoll) {
        const intByPoll = await this.repo.getInteraction(byPoll.interactionId);
        if (intByPoll) return { interaction: intByPoll, associationMethod: 'reply_forward_from_poll' };
      }
    }

    // Precedence 2: Direct reply to channel post / published message / poll message
    if (reply?.message_id) {
      const byMain = await this.repo.getInteractionByMainMessageId(reply.message_id);
      if (byMain) return { interaction: byMain, associationMethod: 'reply_to_main_message' };

      const byPub = await this.repo.getPublishedMessageByMessageId(reply.message_id);
      if (byPub) {
        const intByPost = await this.repo.getInteractionByPostId(byPub.postId);
        if (intByPost) return { interaction: intByPost, associationMethod: 'reply_to_published_msg' };
      }

      const byPoll = await this.repo.getPollByMessageId(reply.message_id);
      if (byPoll) {
        const intByPoll = await this.repo.getInteraction(byPoll.interactionId);
        if (intByPoll) return { interaction: intByPoll, associationMethod: 'reply_to_poll' };
      }
    }

    // Precedence 3: Reply to an existing discussion comment recorded in the discussion group
    if (reply?.message_id) {
      const existingComment = await this.repo.getDiscussionMessageByTelegramId(chatId, reply.message_id);
      if (existingComment) {
        const intByComment = await this.repo.getInteraction(existingComment.interactionId);
        if (intByComment) return { interaction: intByComment, associationMethod: 'reply_to_discussion_comment' };
      }
    }

    // Precedence 4: Discussion thread / topic identifier (message.message_thread_id)
    if (message.message_thread_id) {
      const byMain = await this.repo.getInteractionByMainMessageId(message.message_thread_id);
      if (byMain) return { interaction: byMain, associationMethod: 'thread_main_message' };

      const byPub = await this.repo.getPublishedMessageByMessageId(message.message_thread_id);
      if (byPub) {
        const intByPost = await this.repo.getInteractionByPostId(byPub.postId);
        if (intByPost) return { interaction: intByPost, associationMethod: 'thread_published_msg' };
      }

      const existingComment = await this.repo.getDiscussionMessageByTelegramId(chatId, message.message_thread_id);
      if (existingComment) {
        const intByComment = await this.repo.getInteraction(existingComment.interactionId);
        if (intByComment) return { interaction: intByComment, associationMethod: 'thread_discussion_comment' };
      }
    }

    // Precedence 5: No confident match -> Do not guess!
    return { interaction: null };
  }

  async processDiscussionMessage(
    message: TelegramMessage,
    now: string,
  ): Promise<DiscussionProcessingResult> {
    if (!message || typeof message.message_id !== 'number') {
      return { status: 'noop', messageId: 0 };
    }

    // 1. Ignore bot messages to prevent bot-to-bot recursion loops
    if (message.from?.is_bot) {
      return {
        status: 'ignored_bot_message',
        messageId: message.message_id,
        threadId: message.message_thread_id,
      };
    }

    // 2. Upsert user if message author is present
    let userRecord = null;
    if (message.from) {
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

    // 3. Resolve associated interaction using deterministic precedence order
    const { interaction, associationMethod } = await this.resolveAssociatedInteraction(message);

    if (!interaction) {
      return {
        status: 'unassociated_message',
        messageId: message.message_id,
        threadId: message.message_thread_id,
      };
    }

    // 4. Invariant: Closed/completed/failed interaction MUST NOT be reopened or altered by comments
    if (interaction.lifecycleState !== 'OPEN') {
      return {
        status: 'ignored_closed',
        interactionId: interaction.id,
        postId: interaction.postId,
        userId: userRecord?.id,
        messageId: message.message_id,
        threadId: message.message_thread_id,
        associationMethod,
      };
    }

    // 5. Record discussion message uniquely in D1 to prevent duplicate activity records
    await this.repo.recordDiscussionMessage({
      interactionId: interaction.id,
      postId: interaction.postId,
      telegramMessageId: message.message_id,
      telegramChatId: String(message.chat?.id ?? ''),
      telegramUserId: message.from?.id,
      userId: userRecord?.id,
      replyToMessageId: message.reply_to_message?.message_id,
      threadId: message.message_thread_id,
      textContent: message.text,
      receivedAt: now,
    });

    return {
      status: 'discussion_recorded',
      interactionId: interaction.id,
      postId: interaction.postId,
      userId: userRecord?.id,
      messageId: message.message_id,
      threadId: message.message_thread_id,
      associationMethod,
    };
  }
}

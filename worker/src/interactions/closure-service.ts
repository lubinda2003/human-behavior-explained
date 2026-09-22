import type { D1InteractionRepository } from './repository';
import type { TelegramClient } from './telegram-client';
import type { ResultGenerator } from './result-generator';
import type { InteractionRecord, PublishedMessageRecord } from './types';

export interface ClosureResult {
  interactionId: string;
  processed: boolean;
  reason?: string;
  resultPostMessageId?: number;
  totalParticipants?: number;
}

export class InteractionClosureService {
  constructor(
    private readonly repo: D1InteractionRepository,
    private readonly telegram: TelegramClient,
    private readonly resultGen: ResultGenerator,
  ) {}

  /**
   * Scans D1 for interactions whose closesAt timestamp has passed and processes them.
   */
  async processDueInteractions(nowIso?: string): Promise<ClosureResult[]> {
    const now = nowIso ?? new Date().toISOString();
    const dueInteractions = await this.repo.getInteractionsDueForClosure(now);
    const results: ClosureResult[] = [];

    for (const interaction of dueInteractions) {
      const res = await this.closeInteraction(interaction, now);
      results.push(res);
    }

    return results;
  }

  /**
   * Idempotently closes a single interaction, stops any Telegram poll,
   * generates results from actual D1 data, and posts the reveal.
   */
  async closeInteraction(interaction: InteractionRecord, nowIso?: string): Promise<ClosureResult> {
    const now = nowIso ?? new Date().toISOString();

    // Step 1: Atomic transition OPEN -> CLOSED in D1.
    // If another scheduled runner already transitioned it, changes = 0.
    const closed = await this.repo.atomicCloseInteraction(interaction.id, now);
    if (!closed) {
      return {
        interactionId: interaction.id,
        processed: false,
        reason: 'already_closed_or_not_open',
      };
    }

    // Step 2: If poll exists, stop it via Telegram Bot API
    const poll = await this.repo.getPollByInteractionId(interaction.id);
    if (poll && poll.telegramMessageId && !poll.isClosed) {
      try {
        await this.telegram.stopPoll({
          chat_id: interaction.targetChatId,
          message_id: poll.telegramMessageId,
        });
      } catch (err) {
        // If poll was already stopped in Telegram, continue gracefully
        console.warn(`[ClosureService] stopPoll warning for poll ${poll.id}:`, err);
      }
      await this.repo.closePoll(poll.id, now);
    }

    // Step 3: Transition to RESOLVING
    await this.repo.updateInteractionLifecycle(interaction.id, 'RESOLVING', {
      resolvedAt: now,
      closedAt: now,
    });

    // Step 4: Handle resolution according to interaction type
    if (interaction.interactionType === 'open_discussion') {
      return this.resolveDiscussionInteraction(interaction, now);
    }

    // Poll / Prediction resolution
    return this.resolvePollInteraction(interaction, poll?.id, now);
  }

  private async resolvePollInteraction(
    interaction: InteractionRecord,
    pollId: string | undefined,
    now: string,
  ): Promise<ClosureResult> {
    const post = await this.repo.getPost(interaction.postId);
    if (!post) {
      throw new Error(`Post ${interaction.postId} not found for interaction ${interaction.id}`);
    }

    if (!pollId) {
      // No poll associated; complete directly
      await this.repo.updateInteractionLifecycle(interaction.id, 'COMPLETED');
      return {
        interactionId: interaction.id,
        processed: true,
        reason: 'no_poll_completed',
      };
    }

    const pollOptions = await this.repo.getPollOptions(pollId);
    const activeVotes = await this.repo.getActiveVotesForInteraction(interaction.id);

    // Generate result from actual D1 data
    const { text, resultRecord } = this.resultGen.generate({
      interactionId: interaction.id,
      post,
      pollOptions,
      activeVotes,
      nowIso: now,
    });

    // Save result record (idempotent, won't duplicate)
    await this.repo.saveResult(resultRecord);

    // Check if result was already published in Telegram
    const existingResult = await this.repo.getResultByInteractionId(interaction.id);
    if (existingResult && existingResult.status === 'published' && existingResult.resultPostMessageId) {
      await this.repo.updateInteractionLifecycle(interaction.id, 'COMPLETED', {
        resultPostId: existingResult.id,
      });
      return {
        interactionId: interaction.id,
        processed: true,
        reason: 'already_published',
        resultPostMessageId: existingResult.resultPostMessageId,
        totalParticipants: existingResult.totalParticipants,
      };
    }

    // Publish result post to Telegram
    const sentMsg = await this.telegram.sendMessage({
      chat_id: interaction.targetChatId,
      text,
      parse_mode: 'HTML',
      reply_to_message_id: interaction.mainMessageId ?? undefined,
    });

    // Record published message in D1
    const pubMsg: PublishedMessageRecord = {
      id: `msg_${interaction.postId}_result`,
      postId: interaction.postId,
      telegramMessageId: sentMsg.message_id,
      telegramChatId: String(interaction.targetChatId),
      messageType: 'result_reveal',
      parseMode: 'HTML',
      textContent: text,
      publishedAt: now,
    };
    await this.repo.createPublishedMessage(pubMsg);

    // Update result status in D1
    await this.repo.updateResultStatus(resultRecord.id, 'published', {
      publishedAt: now,
      resultPostMessageId: sentMsg.message_id,
    });

    // Transition lifecycle: RESOLVING -> RESULT_POSTED -> COMPLETED
    await this.repo.updateInteractionLifecycle(interaction.id, 'RESULT_POSTED', {
      resultPostId: resultRecord.id,
    });
    await this.repo.updateInteractionLifecycle(interaction.id, 'COMPLETED');

    return {
      interactionId: interaction.id,
      processed: true,
      resultPostMessageId: sentMsg.message_id,
      totalParticipants: activeVotes.length,
    };
  }

  private async resolveDiscussionInteraction(
    interaction: InteractionRecord,
    now: string,
  ): Promise<ClosureResult> {
    const post = await this.repo.getPost(interaction.postId);
    if (!post) {
      await this.repo.updateInteractionLifecycle(interaction.id, 'COMPLETED');
      return { interactionId: interaction.id, processed: true };
    }

    const payload = post.payload as Record<string, any>;
    const payoff = (payload.payoff as Record<string, any>) || {};
    const reveal = payoff.reveal || payload.twist || payoff.surprisingOutcome;

    let resultMsgId: number | undefined;

    if (reveal) {
      const text = `<b>🎯 DISCUSSION RESOLUTION: ${escapeHtml(post.title)}</b>\n\n<b>⚡ THE REVEAL:</b>\n<tg-spoiler>${escapeHtml(
        reveal,
      )}</tg-spoiler>`;

      const sentMsg = await this.telegram.sendMessage({
        chat_id: interaction.targetChatId,
        text,
        parse_mode: 'HTML',
        reply_to_message_id: interaction.mainMessageId ?? undefined,
      });

      resultMsgId = sentMsg.message_id;

      await this.repo.createPublishedMessage({
        id: `msg_${interaction.postId}_discussion_resolution`,
        postId: interaction.postId,
        telegramMessageId: sentMsg.message_id,
        telegramChatId: String(interaction.targetChatId),
        messageType: 'result_reveal',
        parseMode: 'HTML',
        textContent: text,
        publishedAt: now,
      });

      await this.repo.updateInteractionLifecycle(interaction.id, 'RESULT_POSTED');
    }

    await this.repo.updateInteractionLifecycle(interaction.id, 'COMPLETED');

    return {
      interactionId: interaction.id,
      processed: true,
      resultPostMessageId: resultMsgId,
    };
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

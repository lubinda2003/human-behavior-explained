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

    const currentInteraction = (await this.repo.getInteraction(interaction.id)) || interaction;

    // Fast-path: if already COMPLETED, return immediately
    if (currentInteraction.lifecycleState === 'COMPLETED') {
      const existingResult = await this.repo.getResultByInteractionId(interaction.id);
      return {
        interactionId: interaction.id,
        processed: true,
        reason: 'already_completed',
        resultPostMessageId: existingResult?.resultPostMessageId ?? undefined,
        totalParticipants: existingResult?.totalParticipants ?? 0,
      };
    }

    // Step 1: If OPEN, atomically transition OPEN -> CLOSED
    if (currentInteraction.lifecycleState === 'OPEN') {
      const closed = await this.repo.atomicCloseInteraction(interaction.id, now);
      if (!closed) {
        // Lost race to another worker who closed it. Re-check state.
        const fresh = await this.repo.getInteraction(interaction.id);
        if (!fresh || (fresh.lifecycleState !== 'CLOSED' && fresh.lifecycleState !== 'RESOLVING')) {
          if (fresh?.lifecycleState === 'COMPLETED') {
            const existingResult = await this.repo.getResultByInteractionId(interaction.id);
            return {
              interactionId: interaction.id,
              processed: true,
              reason: 'already_completed',
              resultPostMessageId: existingResult?.resultPostMessageId ?? undefined,
              totalParticipants: existingResult?.totalParticipants ?? 0,
            };
          }
          return {
            interactionId: interaction.id,
            processed: false,
            reason: 'already_closed_or_not_open',
          };
        }
      }
    } else if (
      currentInteraction.lifecycleState !== 'CLOSED' &&
      currentInteraction.lifecycleState !== 'RESOLVING' &&
      currentInteraction.lifecycleState !== 'RESULT_POSTED' &&
      currentInteraction.lifecycleState !== 'FAILED'
    ) {
      return {
        interactionId: interaction.id,
        processed: false,
        reason: 'not_closable_state',
      };
    }

    // Step 2: Atomic resolving lease (5 min stale timeout)
    const currentTimeMs = nowIso ? new Date(nowIso).getTime() : Date.now();
    const staleThresholdIso = new Date(currentTimeMs - 5 * 60 * 1000).toISOString();
    const canResolve = await this.repo.atomicClaimResolvingLease(interaction.id, now, staleThresholdIso);
    if (!canResolve) {
      const fresh = await this.repo.getInteraction(interaction.id);
      if (fresh?.lifecycleState === 'COMPLETED') {
        const existingResult = await this.repo.getResultByInteractionId(interaction.id);
        return {
          interactionId: interaction.id,
          processed: true,
          reason: 'already_completed',
          resultPostMessageId: existingResult?.resultPostMessageId ?? undefined,
          totalParticipants: existingResult?.totalParticipants ?? 0,
        };
      }
      return {
        interactionId: interaction.id,
        processed: false,
        reason: 'resolving_in_progress',
      };
    }

    try {
      // Step 3: If poll exists, stop it via Telegram Bot API (if not already stopped)
      const poll = await this.repo.getPollByInteractionId(interaction.id);
      if (poll && poll.telegramMessageId && !poll.isClosed) {
        try {
          const stoppedPoll = await this.telegram.stopPoll({
            chat_id: interaction.targetChatId,
            message_id: poll.telegramMessageId,
          });
          if (
            stoppedPoll &&
            stoppedPoll.options &&
            (stoppedPoll.total_voter_count > 0 || stoppedPoll.options.some((o) => (o.voter_count ?? 0) > 0))
          ) {
            await this.repo.updatePollCountsFromTelegram(stoppedPoll, now);
          }
        } catch (err) {
          // If poll was already stopped in Telegram, continue gracefully
          console.warn(`[ClosureService] stopPoll warning for poll ${poll.id}:`, err);
        }
        await this.repo.closePoll(poll.id, now);
      }

      // Step 4: Handle resolution according to interaction type
      if (interaction.interactionType === 'open_discussion') {
        return await this.resolveDiscussionInteraction(interaction, now);
      }

      // Poll / Prediction resolution
      return await this.resolvePollInteraction(interaction, poll?.id, now);
    } catch (err) {
      // On error, mark interaction as FAILED so subsequent retry can re-claim the lease immediately
      try {
        const freshInt = await this.repo.getInteraction(interaction.id);
        if (freshInt && freshInt.lifecycleState !== 'COMPLETED') {
          await this.repo.updateInteractionLifecycle(interaction.id, 'FAILED', {
            metadata: {
              ...(freshInt.metadata || interaction.metadata || {}),
              failureReason: err instanceof Error ? err.message : String(err),
            },
          });
        }
      } catch {}
      throw err;
    }
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

    // Reconcile if result was already published in Telegram:
    const existingResult = await this.repo.getResultByInteractionId(interaction.id);
    const pubMsgs = await this.repo.getPublishedMessagesForPost(interaction.postId);
    const existingResultMsg = pubMsgs.find((m) => m.messageType === 'result_reveal');

    let resultMessageId: number | undefined =
      existingResult?.resultPostMessageId ?? existingResultMsg?.telegramMessageId ?? undefined;

    if (!resultMessageId) {
      // Publish result post to Telegram
      const sentMsg = await this.telegram.sendMessage({
        chat_id: interaction.targetChatId,
        text,
        parse_mode: 'HTML',
        reply_to_message_id: interaction.mainMessageId ?? undefined,
      });
      resultMessageId = sentMsg.message_id;

      // Immediately anchor published message in D1
      try {
        await this.repo.createPublishedMessage({
          id: `msg_${interaction.postId}_result`,
          postId: interaction.postId,
          telegramMessageId: resultMessageId,
          telegramChatId: String(interaction.targetChatId),
          messageType: 'result_reveal',
          parseMode: 'HTML',
          textContent: text,
          publishedAt: now,
        });
      } catch (d1Err) {
        // Emergency update to result record so retry knows result message was already sent!
        try {
          await this.repo.updateResultStatus(resultRecord.id, 'published', {
            publishedAt: now,
            resultPostMessageId: resultMessageId,
          });
        } catch {}
        throw d1Err;
      }
    } else {
      // Re-anchor missing published message if needed
      try {
        await this.repo.createPublishedMessage({
          id: `msg_${interaction.postId}_result`,
          postId: interaction.postId,
          telegramMessageId: resultMessageId,
          telegramChatId: String(interaction.targetChatId),
          messageType: 'result_reveal',
          parseMode: 'HTML',
          textContent: text,
          publishedAt: now,
        });
      } catch {}
    }

    // Update result status in D1
    await this.repo.updateResultStatus(resultRecord.id, 'published', {
      publishedAt: now,
      resultPostMessageId: resultMessageId,
    });

    // Transition lifecycle: RESOLVING -> RESULT_POSTED -> COMPLETED
    await this.repo.updateInteractionLifecycle(interaction.id, 'RESULT_POSTED', {
      resultPostId: resultRecord.id,
    });
    await this.repo.updateInteractionLifecycle(interaction.id, 'COMPLETED');

    return {
      interactionId: interaction.id,
      processed: true,
      resultPostMessageId: resultMessageId,
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
      const pubMsgs = await this.repo.getPublishedMessagesForPost(interaction.postId);
      const resultMsgRecordId = `msg_${interaction.postId}_discussion_resolution`;
      const existingResultMsg = pubMsgs.find(
        (m) => m.id === resultMsgRecordId || m.messageType === 'result_reveal',
      );

      const existingResult = await this.repo.getResultByInteractionId(interaction.id);

      // Reconcile existing Telegram result message ID from D1 records
      resultMsgId =
        (interaction.metadata as any)?.resultMessageId ??
        existingResult?.resultPostMessageId ??
        existingResultMsg?.telegramMessageId ??
        undefined;

      const text = `<b>🎯 DISCUSSION RESOLUTION: ${escapeHtml(post.title)}</b>\n\n<b>⚡ THE REVEAL:</b>\n<tg-spoiler>${escapeHtml(
        reveal,
      )}</tg-spoiler>`;

      if (!resultMsgId) {
        const sentMsg = await this.telegram.sendMessage({
          chat_id: interaction.targetChatId,
          text,
          parse_mode: 'HTML',
          reply_to_message_id: interaction.mainMessageId ?? undefined,
        });

        resultMsgId = sentMsg.message_id;

        // Immediately anchor published message in D1
        try {
          await this.repo.createPublishedMessage({
            id: resultMsgRecordId,
            postId: interaction.postId,
            telegramMessageId: resultMsgId,
            telegramChatId: String(interaction.targetChatId),
            messageType: 'result_reveal',
            parseMode: 'HTML',
            textContent: text,
            publishedAt: now,
          });
        } catch (d1Err) {
          // Emergency anchor: preserve Telegram message ID in interaction metadata so retry will not duplicate!
          try {
            const freshInt = await this.repo.getInteraction(interaction.id);
            await this.repo.updateInteractionLifecycle(interaction.id, 'RESOLVING', {
              metadata: {
                ...(freshInt?.metadata || interaction.metadata || {}),
                resultMessageId: resultMsgId,
                failureReason: d1Err instanceof Error ? d1Err.message : String(d1Err),
              },
            });
          } catch {}
          throw d1Err;
        }
      } else {
        // Re-anchor missing published message record if needed
        try {
          await this.repo.createPublishedMessage({
            id: resultMsgRecordId,
            postId: interaction.postId,
            telegramMessageId: resultMsgId,
            telegramChatId: String(interaction.targetChatId),
            messageType: 'result_reveal',
            parseMode: 'HTML',
            textContent: text,
            publishedAt: now,
          });
        } catch {}
      }

      await this.repo.updateInteractionLifecycle(interaction.id, 'RESULT_POSTED', {
        metadata: {
          ...(interaction.metadata || {}),
          resultMessageId: resultMsgId,
        },
      });
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

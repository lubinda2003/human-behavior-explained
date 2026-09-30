/**
 * TelegramInteractionPublisher (Phase 5A.2)
 *
 * Provides recoverable, idempotent, and race-safe publishing of interactive Pick Your Fate
 * dilemmas to Telegram, with transactional reconciliation across Cloudflare D1 tables:
 * - posts
 * - interactions
 * - published_messages
 * - polls & poll_options
 *
 * NOTE ON TELEGRAM & D1 DISTRIBUTED COUPLING:
 * Telegram's Bot API is an external HTTP service without 2-phase commit, transactional rollback,
 * or idempotency headers. If Telegram accepts a request and the worker process subsequently dies
 * or D1 fails, Telegram cannot be "rolled back." To eliminate duplicate publishing:
 * 1. Component identities are deterministic (derived from post.id, never Date.now()).
 * 2. Every successful Telegram call immediately commits its message/poll ID to D1.
 * 3. On retry, the publisher cross-reconciles across all 4 D1 entity stores to detect existing
 *    component IDs before issuing any external Telegram API calls.
 * 4. Concurrent retries are serialized via D1 atomic compare-and-swap leases.
 * 5. Stale in-progress publishing attempts (> 5 minutes) can be safely recovered.
 */

import type { D1InteractionRepository } from './repository';
import type { TelegramClient } from './telegram-client';
import type { InteractionPlan } from './planner';
import type {
  PollOptionRecord,
  PollRecord,
  PostRecord,
  PublishedMessageRecord,
} from './types';

export interface PublishResult {
  postId: string;
  interactionId: string;
  telegramMessageId?: number;
  telegramPollId?: string;
  telegramPollMessageId?: number;
}

export interface PublishOptions {
  post: PostRecord;
  plan: InteractionPlan;
  formattedText: string;
  replyToMessageId?: number;
  nowIso?: string;
  staleTimeoutMs?: number;
}

interface ReconciledPublishState {
  mainMessageId?: number;
  pollMessageId?: number;
  telegramPollId?: string;
}

export class TelegramInteractionPublisher {
  constructor(
    private readonly repo: D1InteractionRepository,
    private readonly telegram: TelegramClient,
  ) {}

  async publishInteraction(params: PublishOptions): Promise<PublishResult> {
    const now = params.nowIso ?? new Date().toISOString();
    const interactionId = `int_${params.post.id}`;

    // 1. Ensure post record is anchored in D1
    let existingPost = await this.repo.getPost(params.post.id);
    if (!existingPost) {
      await this.repo.createPost({
        ...params.post,
        status: 'draft',
      });
      existingPost = await this.repo.getPost(params.post.id);
    }

    // 2. Ensure interaction record is anchored in D1
    const closesAt = params.plan.durationSeconds
      ? new Date(new Date(now).getTime() + params.plan.durationSeconds * 1000).toISOString()
      : null;

    let interaction = await this.repo.getInteraction(interactionId);
    if (!interaction) {
      try {
        await this.repo.createInteraction({
          id: interactionId,
          postId: params.post.id,
          interactionType: params.plan.interactionType,
          lifecycleState: 'DRAFT',
          targetChatId: params.plan.targetChatId,
          closeStrategy: params.plan.closeStrategy,
          durationSeconds: params.plan.durationSeconds ?? null,
          opensAt: now,
          closesAt,
          createdAt: now,
          updatedAt: now,
        });
      } catch {
        // Safe concurrent insert handling
      }
      interaction = await this.repo.getInteraction(interactionId);
    }

    // 3. Fast-path idempotency check: If already fully published or open, return immediately
    if (
      interaction?.lifecycleState === 'OPEN' ||
      interaction?.lifecycleState === 'PUBLISHED' ||
      interaction?.lifecycleState === 'COMPLETED' ||
      existingPost?.status === 'published'
    ) {
      const existingPoll = await this.repo.getPollByInteractionId(interactionId);
      return {
        postId: params.post.id,
        interactionId,
        telegramMessageId: interaction?.mainMessageId ?? existingPost?.telegramMessageId ?? undefined,
        telegramPollId: existingPoll?.telegramPollId ?? undefined,
        telegramPollMessageId:
          existingPost?.telegramPollMessageId ?? existingPoll?.telegramMessageId ?? undefined,
      };
    }

    // 4. Concurrency Guard & Stale Lease Recovery:
    // Atomic compare-and-swap lease acquisition in D1 prevents concurrent workers
    // from duplicating Telegram messages for the same logical interaction.
    const staleTimeoutMs = params.staleTimeoutMs ?? 5 * 60 * 1000; // 5 minutes default
    const staleThresholdIso = new Date(new Date(now).getTime() - staleTimeoutMs).toISOString();

    const leaseAcquired = await this.repo.atomicClaimPublishingLease(
      interactionId,
      now,
      staleThresholdIso,
    );

    if (!leaseAcquired) {
      // Re-read fresh state: if another worker just finished publishing, return result cleanly
      const freshInteraction = await this.repo.getInteraction(interactionId);
      const freshPost = await this.repo.getPost(params.post.id);

      if (
        freshInteraction?.lifecycleState === 'OPEN' ||
        freshInteraction?.lifecycleState === 'PUBLISHED' ||
        freshInteraction?.lifecycleState === 'COMPLETED' ||
        freshPost?.status === 'published'
      ) {
        const existingPoll = await this.repo.getPollByInteractionId(interactionId);
        return {
          postId: params.post.id,
          interactionId,
          telegramMessageId:
            freshInteraction?.mainMessageId ?? freshPost?.telegramMessageId ?? undefined,
          telegramPollId: existingPoll?.telegramPollId ?? undefined,
          telegramPollMessageId:
            freshPost?.telegramPollMessageId ?? existingPoll?.telegramMessageId ?? undefined,
        };
      }

      throw new Error(
        `Publishing lease active: Another worker is actively publishing interaction ${interactionId} (lease started at ${
          freshInteraction?.updatedAt || 'unknown'
        })`,
      );
    }

    await this.repo.updatePostStatus(params.post.id, 'publishing');

    // 5. Cross-reconcile existing published components across all D1 tables
    const reconciled = await this.reconcilePublishedComponents(params.post.id, interactionId);

    try {
      if (params.plan.interactionType === 'poll' || params.plan.interactionType === 'prediction_vote') {
        return await this.publishPollInteraction(
          params.post,
          params.plan,
          interactionId,
          params.formattedText,
          now,
          reconciled,
          params.replyToMessageId,
        );
      }

      if (params.plan.interactionType === 'open_discussion') {
        return await this.publishDiscussionInteraction(
          params.post,
          params.plan,
          interactionId,
          params.formattedText,
          now,
          reconciled,
          params.replyToMessageId,
        );
      }

      // Default message post
      return await this.publishDefaultMessageInteraction(
        params.post,
        params.plan,
        interactionId,
        params.formattedText,
        now,
        reconciled,
        params.replyToMessageId,
      );
    } catch (err: any) {
      // Safe failure handling: Check if any Telegram progress was made to determine intermediate state
      try {
        const postCheck = await this.repo.getPost(params.post.id);
        const intCheck = await this.repo.getInteraction(interactionId);
        const hasPartial = Boolean(
          postCheck?.telegramMessageId ||
          postCheck?.telegramPollMessageId ||
          intCheck?.mainMessageId,
        );

        if (hasPartial) {
          await this.repo.updateInteractionLifecycle(interactionId, 'PARTIALLY_PUBLISHED');
          await this.repo.updatePostStatus(params.post.id, 'partially_published', {
            failureReason: err?.message || String(err),
          });
        } else {
          await this.repo.updateInteractionLifecycle(interactionId, 'FAILED');
          await this.repo.updatePostStatus(params.post.id, 'failed', {
            failureReason: err?.message || String(err),
          });
        }
      } catch {
        // Preserve primary error
      }
      throw err;
    }
  }

  /**
   * Cross-inspects all 4 D1 stores (posts, interactions, published_messages, polls)
   * to resolve already-published component identifiers before issuing any Telegram calls.
   */
  private async reconcilePublishedComponents(
    postId: string,
    interactionId: string,
  ): Promise<ReconciledPublishState> {
    const post = await this.repo.getPost(postId);
    const interaction = await this.repo.getInteraction(interactionId);
    const pubMsgs = await this.repo.getPublishedMessagesForPost(postId);
    const poll = await this.repo.getPollByInteractionId(interactionId);

    const mainMsg = pubMsgs.find(
      (m) => m.messageType === 'main_post' || m.messageType === 'discussion_prompt',
    );
    const pollMsg = pubMsgs.find((m) => m.messageType === 'native_poll');

    const mainMessageId: number | undefined =
      interaction?.mainMessageId ??
      post?.telegramMessageId ??
      mainMsg?.telegramMessageId ??
      undefined;

    const pollMessageId: number | undefined =
      post?.telegramPollMessageId ??
      poll?.telegramMessageId ??
      pollMsg?.telegramMessageId ??
      undefined;

    let telegramPollId: string | undefined = poll?.telegramPollId ?? undefined;
    if (!telegramPollId && pollMsg?.textContent) {
      try {
        const parsed = JSON.parse(pollMsg.textContent);
        if (parsed?.telegramPollId) {
          telegramPollId = parsed.telegramPollId;
        }
      } catch {}
    }
    if (!telegramPollId && (post?.payload as any)?._telegramPollId) {
      telegramPollId = (post?.payload as any)._telegramPollId;
    }
    if (!telegramPollId && (interaction?.metadata as any)?.telegramPollId) {
      telegramPollId = (interaction?.metadata as any).telegramPollId;
    }
    if (!telegramPollId && pollMessageId) {
      telegramPollId = `tg_poll_${pollMessageId}`;
    }

    return { mainMessageId, pollMessageId, telegramPollId };
  }

  private async publishPollInteraction(
    post: PostRecord,
    plan: InteractionPlan,
    interactionId: string,
    formattedText: string,
    now: string,
    reconciled: ReconciledPublishState,
    replyToMessageId?: number,
  ): Promise<PublishResult> {
    if (!plan.pollConfig) {
      throw new Error(`Poll configuration missing for poll interaction on post ${post.id}`);
    }

    let mainMessageId = reconciled.mainMessageId;

    // Step A: Send main scenario / narrative message (if not already published)
    if (!mainMessageId) {
      const mainMsg = await this.telegram.sendMessage({
        chat_id: plan.targetChatId,
        text: formattedText,
        parse_mode: 'HTML',
        reply_to_message_id: replyToMessageId ?? undefined,
      });
      mainMessageId = mainMsg.message_id;

      // Immediately persist to D1 to anchor partial progress
      try {
        await this.repo.createPublishedMessage({
          id: `msg_${post.id}_main`,
          postId: post.id,
          telegramMessageId: mainMessageId,
          telegramChatId: String(plan.targetChatId),
          messageType: 'main_post',
          parseMode: 'HTML',
          textContent: formattedText,
          publishedAt: now,
        });

        await this.repo.updateInteractionLifecycle(interactionId, 'PARTIALLY_PUBLISHED', {
          mainMessageId,
        });
        await this.repo.updatePostStatus(post.id, 'partially_published', {
          telegramMessageId: mainMessageId,
        });
      } catch (d1Err) {
        // Emergency recording on post so retries never duplicate mainMessage
        try {
          await this.repo.updatePostStatus(post.id, 'partially_published', {
            telegramMessageId: mainMessageId,
            failureReason: (d1Err as Error)?.message,
          });
        } catch {}
        throw d1Err;
      }
    } else {
      // Heal any missing D1 record for main message
      try {
        await this.repo.createPublishedMessage({
          id: `msg_${post.id}_main`,
          postId: post.id,
          telegramMessageId: mainMessageId,
          telegramChatId: String(plan.targetChatId),
          messageType: 'main_post',
          parseMode: 'HTML',
          textContent: formattedText,
          publishedAt: now,
        });
        await this.repo.updateInteractionLifecycle(interactionId, 'PARTIALLY_PUBLISHED', {
          mainMessageId,
        });
        await this.repo.updatePostStatus(post.id, 'partially_published', {
          telegramMessageId: mainMessageId,
        });
      } catch {}
    }

    // Step B: Send native Telegram poll attached/replied to main scenario (if not already published)
    let pollMessageId = reconciled.pollMessageId;
    let telegramPollId = reconciled.telegramPollId;

    if (!pollMessageId) {
      const pollSent = await this.telegram.sendPoll({
        chat_id: plan.targetChatId,
        question: plan.pollConfig.question,
        options: plan.pollConfig.options.map((o) => o.text),
        is_anonymous: plan.pollConfig.isAnonymous,
        allows_multiple_answers: plan.pollConfig.allowsMultipleAnswers,
        reply_to_message_id: mainMessageId,
      });

      telegramPollId = pollSent.poll?.id;
      if (!telegramPollId) {
        throw new Error(`Telegram did not return a poll_id for post ${post.id}`);
      }
      pollMessageId = pollSent.message_id;
    } else if (!telegramPollId) {
      telegramPollId = `tg_poll_${pollMessageId}`;
    }

    // Step C: Persist Poll and Options in D1 (if not already created)
    const pollRecordId = `poll_${post.id}`;
    try {
      await this.repo.createPublishedMessage({
        id: `msg_${post.id}_poll`,
        postId: post.id,
        telegramMessageId: pollMessageId,
        telegramChatId: String(plan.targetChatId),
        messageType: 'native_poll',
        parseMode: 'HTML',
        textContent: JSON.stringify({ question: plan.pollConfig.question, telegramPollId }),
        publishedAt: now,
      });

      const existingPollRecord = await this.repo.getPollByInteractionId(interactionId);
      if (!existingPollRecord) {
        const pollRecord: PollRecord = {
          id: pollRecordId,
          interactionId,
          telegramPollId,
          telegramMessageId: pollMessageId,
          question: plan.pollConfig.question,
          pollType: 'regular',
          isAnonymous: plan.pollConfig.isAnonymous,
          allowsMultipleAnswers: plan.pollConfig.allowsMultipleAnswers,
          openPeriodSeconds: plan.durationSeconds ?? null,
          isClosed: false,
          totalVoterCount: 0,
          createdAt: now,
        };

        const optionRecords: PollOptionRecord[] = plan.pollConfig.options.map((opt, idx) => ({
          id: `opt_${pollRecordId}_${idx}`,
          pollId: pollRecordId,
          optionIndex: idx,
          optionText: opt.text,
          tradeOff: opt.tradeOff ?? null,
          voteCount: 0,
        }));

        await this.repo.createPoll(pollRecord, optionRecords);
      }
    } catch (d1Err) {
      // Record partial poll progress in post before re-throwing so retry knows poll was sent
      try {
        await this.repo.updatePostStatus(post.id, 'partially_published', {
          telegramMessageId: mainMessageId,
          telegramPollMessageId: pollMessageId,
          failureReason: (d1Err as Error)?.message,
        });
      } catch {}
      throw d1Err;
    }

    // Step D: Transition lifecycle to PUBLISHED then OPEN
    await this.repo.updateInteractionLifecycle(interactionId, 'PUBLISHED', {
      mainMessageId,
    });
    await this.repo.updateInteractionLifecycle(interactionId, 'OPEN');

    await this.repo.updatePostStatus(post.id, 'published', {
      publishedAt: now,
      telegramMessageId: mainMessageId,
      telegramPollMessageId: pollMessageId,
    });

    return {
      postId: post.id,
      interactionId,
      telegramMessageId: mainMessageId,
      telegramPollId,
      telegramPollMessageId: pollMessageId,
    };
  }

  private async publishDiscussionInteraction(
    post: PostRecord,
    plan: InteractionPlan,
    interactionId: string,
    formattedText: string,
    now: string,
    reconciled: ReconciledPublishState,
    replyToMessageId?: number,
  ): Promise<PublishResult> {
    const textWithPrompt = plan.discussionPrompt
      ? `${formattedText}\n\n💬 <b>DISCUSSION CHALLENGE:</b>\n<i>${plan.discussionPrompt}</i>`
      : formattedText;

    let mainMessageId = reconciled.mainMessageId;

    if (!mainMessageId) {
      const mainMsg = await this.telegram.sendMessage({
        chat_id: plan.targetChatId,
        text: textWithPrompt,
        parse_mode: 'HTML',
        reply_to_message_id: replyToMessageId ?? undefined,
      });
      mainMessageId = mainMsg.message_id;

      try {
        await this.repo.createPublishedMessage({
          id: `msg_${post.id}_main`,
          postId: post.id,
          telegramMessageId: mainMessageId,
          telegramChatId: String(plan.targetChatId),
          messageType: 'discussion_prompt',
          parseMode: 'HTML',
          textContent: textWithPrompt,
          publishedAt: now,
        });

        await this.repo.updateInteractionLifecycle(interactionId, 'PARTIALLY_PUBLISHED', {
          mainMessageId,
        });
        await this.repo.updatePostStatus(post.id, 'partially_published', {
          telegramMessageId: mainMessageId,
        });
      } catch (d1Err) {
        try {
          await this.repo.updatePostStatus(post.id, 'partially_published', {
            telegramMessageId: mainMessageId,
            failureReason: (d1Err as Error)?.message,
          });
        } catch {}
        throw d1Err;
      }
    } else {
      try {
        await this.repo.createPublishedMessage({
          id: `msg_${post.id}_main`,
          postId: post.id,
          telegramMessageId: mainMessageId,
          telegramChatId: String(plan.targetChatId),
          messageType: 'discussion_prompt',
          parseMode: 'HTML',
          textContent: textWithPrompt,
          publishedAt: now,
        });
      } catch {}
    }

    await this.repo.updateInteractionLifecycle(interactionId, 'PUBLISHED', {
      mainMessageId,
    });
    await this.repo.updateInteractionLifecycle(interactionId, 'OPEN');

    await this.repo.updatePostStatus(post.id, 'published', {
      publishedAt: now,
      telegramMessageId: mainMessageId,
    });

    return {
      postId: post.id,
      interactionId,
      telegramMessageId: mainMessageId,
    };
  }

  private async publishDefaultMessageInteraction(
    post: PostRecord,
    plan: InteractionPlan,
    interactionId: string,
    formattedText: string,
    now: string,
    reconciled: ReconciledPublishState,
    replyToMessageId?: number,
  ): Promise<PublishResult> {
    let mainMessageId = reconciled.mainMessageId;

    if (!mainMessageId) {
      const sent = await this.telegram.sendMessage({
        chat_id: plan.targetChatId,
        text: formattedText,
        parse_mode: 'HTML',
        reply_to_message_id: replyToMessageId ?? undefined,
      });
      mainMessageId = sent.message_id;

      try {
        const pubMsg: PublishedMessageRecord = {
          id: `msg_${post.id}_main`,
          postId: post.id,
          telegramMessageId: mainMessageId,
          telegramChatId: String(plan.targetChatId),
          messageType: 'main_post',
          parseMode: 'HTML',
          textContent: formattedText,
          publishedAt: now,
        };
        await this.repo.createPublishedMessage(pubMsg);

        await this.repo.updateInteractionLifecycle(interactionId, 'PARTIALLY_PUBLISHED', {
          mainMessageId,
        });
        await this.repo.updatePostStatus(post.id, 'partially_published', {
          telegramMessageId: mainMessageId,
        });
      } catch (d1Err) {
        try {
          await this.repo.updatePostStatus(post.id, 'partially_published', {
            telegramMessageId: mainMessageId,
            failureReason: (d1Err as Error)?.message,
          });
        } catch {}
        throw d1Err;
      }
    }

    await this.repo.updateInteractionLifecycle(interactionId, 'PUBLISHED', {
      mainMessageId,
    });
    await this.repo.updateInteractionLifecycle(interactionId, 'OPEN');
    await this.repo.updatePostStatus(post.id, 'published', {
      publishedAt: now,
      telegramMessageId: mainMessageId,
    });

    return {
      postId: post.id,
      interactionId,
      telegramMessageId: mainMessageId,
    };
  }
}

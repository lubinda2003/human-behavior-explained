import type { D1InteractionRepository } from './repository';
import type { TelegramClient } from './telegram-client';
import type { InteractionPlan } from './planner';
import type {
  InteractionRecord,
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

export class TelegramInteractionPublisher {
  constructor(
    private readonly repo: D1InteractionRepository,
    private readonly telegram: TelegramClient,
  ) {}

  async publishInteraction(params: {
    post: PostRecord;
    plan: InteractionPlan;
    formattedText: string;
    replyToMessageId?: number;
    nowIso?: string;
  }): Promise<PublishResult> {
    const now = params.nowIso ?? new Date().toISOString();
    const interactionId = `int_${params.post.id}`;

    // 1. Ensure post record is saved in D1
    const existingPost = await this.repo.getPost(params.post.id);
    if (!existingPost) {
      await this.repo.createPost({
        ...params.post,
        status: 'draft',
      });
    }

    // 2. Create or resume interaction record in DRAFT then transition to VALIDATED
    const closesAt = params.plan.durationSeconds
      ? new Date(new Date(now).getTime() + params.plan.durationSeconds * 1000).toISOString()
      : null;

    let interaction = await this.repo.getInteraction(interactionId);
    if (!interaction) {
      interaction = {
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
      };
      await this.repo.createInteraction(interaction);
    }

    if (interaction.lifecycleState === 'DRAFT') {
      await this.repo.updateInteractionLifecycle(interactionId, 'VALIDATED');
    } else if (interaction.lifecycleState === 'OPEN' || interaction.lifecycleState === 'COMPLETED') {
      // Already published and open
      return {
        postId: params.post.id,
        interactionId,
        telegramMessageId: interaction.mainMessageId ?? undefined,
      };
    }

    // 3. Dispatch to Telegram based on interaction mechanism
    if (params.plan.interactionType === 'poll' || params.plan.interactionType === 'prediction_vote') {
      return this.publishPollInteraction(
        params.post,
        params.plan,
        interactionId,
        params.formattedText,
        now,
        params.replyToMessageId,
      );
    }

    if (params.plan.interactionType === 'open_discussion') {
      return this.publishDiscussionInteraction(
        params.post,
        params.plan,
        interactionId,
        params.formattedText,
        now,
        params.replyToMessageId,
      );
    }

    // Default message post
    const sent = await this.telegram.sendMessage({
      chat_id: params.plan.targetChatId,
      text: params.formattedText,
      parse_mode: 'HTML',
      reply_to_message_id: params.replyToMessageId ?? undefined,
    });

    const pubMsg: PublishedMessageRecord = {
      id: `msg_${params.post.id}_main`,
      postId: params.post.id,
      telegramMessageId: sent.message_id,
      telegramChatId: String(params.plan.targetChatId),
      messageType: 'main_post',
      parseMode: 'HTML',
      textContent: params.formattedText,
      publishedAt: now,
    };
    await this.repo.createPublishedMessage(pubMsg);

    await this.repo.updateInteractionLifecycle(interactionId, 'PUBLISHED', { mainMessageId: sent.message_id });
    await this.repo.updateInteractionLifecycle(interactionId, 'OPEN');
    await this.repo.updatePostStatus(params.post.id, 'published', {
      publishedAt: now,
      telegramMessageId: sent.message_id,
    });

    return {
      postId: params.post.id,
      interactionId,
      telegramMessageId: sent.message_id,
    };
  }

  private async publishPollInteraction(
    post: PostRecord,
    plan: InteractionPlan,
    interactionId: string,
    formattedText: string,
    now: string,
    replyToMessageId?: number,
  ): Promise<PublishResult> {
    if (!plan.pollConfig) {
      throw new Error(`Poll configuration missing for poll interaction on post ${post.id}`);
    }

    // Step A: Send main scenario / narrative message (optionally replied to parent post)
    const mainMsg = await this.telegram.sendMessage({
      chat_id: plan.targetChatId,
      text: formattedText,
      parse_mode: 'HTML',
      reply_to_message_id: replyToMessageId ?? undefined,
    });

    await this.repo.createPublishedMessage({
      id: `msg_${post.id}_main`,
      postId: post.id,
      telegramMessageId: mainMsg.message_id,
      telegramChatId: String(plan.targetChatId),
      messageType: 'main_post',
      parseMode: 'HTML',
      textContent: formattedText,
      publishedAt: now,
    });

    // Step B: Send native Telegram poll attached/replied to main scenario
    const pollSent = await this.telegram.sendPoll({
      chat_id: plan.targetChatId,
      question: plan.pollConfig.question,
      options: plan.pollConfig.options.map((o) => o.text),
      is_anonymous: plan.pollConfig.isAnonymous,
      allows_multiple_answers: plan.pollConfig.allowsMultipleAnswers,
      reply_to_message_id: mainMsg.message_id,
    });

    const telegramPollId = pollSent.poll?.id;
    if (!telegramPollId) {
      throw new Error(`Telegram did not return a poll_id for post ${post.id}`);
    }

    await this.repo.createPublishedMessage({
      id: `msg_${post.id}_poll`,
      postId: post.id,
      telegramMessageId: pollSent.message_id,
      telegramChatId: String(plan.targetChatId),
      messageType: 'native_poll',
      parseMode: 'HTML',
      textContent: plan.pollConfig.question,
      publishedAt: now,
    });

    // Step C: Persist Poll and Options in D1
    const pollRecordId = `poll_${post.id}`;
    const pollRecord: PollRecord = {
      id: pollRecordId,
      interactionId,
      telegramPollId,
      telegramMessageId: pollSent.message_id,
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

    // Step D: Transition lifecycle
    await this.repo.updateInteractionLifecycle(interactionId, 'PUBLISHED', {
      mainMessageId: mainMsg.message_id,
    });
    await this.repo.updateInteractionLifecycle(interactionId, 'OPEN');

    await this.repo.updatePostStatus(post.id, 'published', {
      publishedAt: now,
      telegramMessageId: mainMsg.message_id,
      telegramPollMessageId: pollSent.message_id,
    });

    return {
      postId: post.id,
      interactionId,
      telegramMessageId: mainMsg.message_id,
      telegramPollId,
      telegramPollMessageId: pollSent.message_id,
    };
  }

  private async publishDiscussionInteraction(
    post: PostRecord,
    plan: InteractionPlan,
    interactionId: string,
    formattedText: string,
    now: string,
    replyToMessageId?: number,
  ): Promise<PublishResult> {
    const textWithPrompt = plan.discussionPrompt
      ? `${formattedText}\n\n💬 <b>DISCUSSION CHALLENGE:</b>\n<i>${plan.discussionPrompt}</i>`
      : formattedText;

    const mainMsg = await this.telegram.sendMessage({
      chat_id: plan.targetChatId,
      text: textWithPrompt,
      parse_mode: 'HTML',
      reply_to_message_id: replyToMessageId ?? undefined,
    });

    await this.repo.createPublishedMessage({
      id: `msg_${post.id}_main`,
      postId: post.id,
      telegramMessageId: mainMsg.message_id,
      telegramChatId: String(plan.targetChatId),
      messageType: 'discussion_prompt',
      parseMode: 'HTML',
      textContent: textWithPrompt,
      publishedAt: now,
    });

    await this.repo.updateInteractionLifecycle(interactionId, 'PUBLISHED', {
      mainMessageId: mainMsg.message_id,
    });
    await this.repo.updateInteractionLifecycle(interactionId, 'OPEN');

    await this.repo.updatePostStatus(post.id, 'published', {
      publishedAt: now,
      telegramMessageId: mainMsg.message_id,
    });

    return {
      postId: post.id,
      interactionId,
      telegramMessageId: mainMsg.message_id,
    };
  }
}

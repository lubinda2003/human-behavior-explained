import type { D1InteractionRepository } from './repository';
import type { TelegramPollAnswer } from './types';

export interface VoteProcessingResult {
  status: 'recorded' | 'changed' | 'withdrawn' | 'ignored_closed' | 'ignored_unknown_poll' | 'noop';
  pollId?: string;
  interactionId?: string;
  userId?: string;
  telegramUserId?: number;
  optionIds: number[];
  version: number;
}

export class VoteTracker {
  constructor(private readonly repo: D1InteractionRepository) {}

  async processPollAnswer(
    answer: TelegramPollAnswer,
    nowIso?: string,
  ): Promise<VoteProcessingResult> {
    const now = nowIso ?? new Date().toISOString();

    if (!answer.user || !answer.poll_id) {
      return {
        status: 'noop',
        optionIds: answer.option_ids || [],
        version: 0,
      };
    }

    // 1. Resolve poll by Telegram poll_id
    const poll = await this.repo.getPollByTelegramId(answer.poll_id);
    if (!poll) {
      return {
        status: 'ignored_unknown_poll',
        optionIds: answer.option_ids || [],
        version: 0,
      };
    }

    // 2. Resolve associated interaction and verify it is OPEN
    const interaction = await this.repo.getInteraction(poll.interactionId);
    if (!interaction) {
      return {
        status: 'ignored_unknown_poll',
        pollId: poll.id,
        optionIds: answer.option_ids || [],
        version: 0,
      };
    }

    if (interaction.lifecycleState !== 'OPEN' || poll.isClosed) {
      return {
        status: 'ignored_closed',
        pollId: poll.id,
        interactionId: interaction.id,
        optionIds: answer.option_ids || [],
        version: 0,
      };
    }

    // 3. Upsert user / participant
    const user = await this.repo.upsertUser({
      telegramUserId: answer.user.id,
      username: answer.user.username,
      firstName: answer.user.first_name,
      lastName: answer.user.last_name,
      languageCode: answer.user.language_code,
      isBot: answer.user.is_bot,
      nowIso: now,
    });

    // 4. Apply vote update atomically in D1
    const res = await this.repo.applyVoteUpdate({
      pollId: poll.id,
      interactionId: interaction.id,
      userId: user.id,
      telegramUserId: user.telegramUserId,
      newOptionIndices: answer.option_ids || [],
      nowIso: now,
    });

    return {
      status: res.action === 'voted' ? 'recorded' : res.action,
      pollId: poll.id,
      interactionId: interaction.id,
      userId: user.id,
      telegramUserId: user.telegramUserId,
      optionIds: answer.option_ids || [],
      version: res.version,
    };
  }
}

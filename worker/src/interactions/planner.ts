import type { CloseStrategy, InteractionType } from './types';

export interface InteractionPlan {
  interactionType: InteractionType;
  closeStrategy: CloseStrategy;
  durationSeconds?: number;
  pollConfig?: {
    question: string;
    options: Array<{
      text: string;
      tradeOff?: string;
    }>;
    isAnonymous: boolean;
    allowsMultipleAnswers: boolean;
    quizCorrectOptionId?: number;
    explanation?: string;
  };
  discussionPrompt?: string;
  targetChatId: string;
}

export interface PostContentForPlanning {
  id: string;
  title: string;
  contentType?: string;
  format?: string;
  choices?: Array<{ label: string; tradeOff?: string; description?: string }>;
  pollQuestion?: string;
  discussionPrompt?: string;
  question?: string;
  payoff?: {
    reveal?: string;
    surprisingOutcome?: string;
    communityTension?: string;
  };
}

export class InteractionPlanner {
  constructor(private readonly defaultChannelId: string) {}

  plan(
    content: PostContentForPlanning,
    options?: {
      targetChatId?: string;
      customDurationSeconds?: number;
      forceType?: InteractionType;
    },
  ): InteractionPlan {
    const targetChatId = options?.targetChatId || this.defaultChannelId;
    const format = (content.format || content.contentType || 'impossible_dilemma').toLowerCase();

    // If explicit type forced:
    if (options?.forceType) {
      return this.buildPlanForType(options.forceType, content, targetChatId, options?.customDurationSeconds);
    }

    // Choose interaction mechanism according to content format & archetype:
    if (format === 'result_reveal') {
      return {
        interactionType: 'result_reveal',
        closeStrategy: 'never',
        targetChatId,
      };
    }

    if (format === 'open_discussion' || format === 'hot_take') {
      return {
        interactionType: 'open_discussion',
        closeStrategy: 'scheduled',
        durationSeconds: options?.customDurationSeconds ?? 43200, // 12 hours
        discussionPrompt:
          content.discussionPrompt ||
          'Defend your perspective in the discussion thread below. Can your reasoning withstand scrutiny?',
        targetChatId,
      };
    }

    if (format === 'mini_mystery' || format === 'brain_logic') {
      return {
        interactionType: 'open_discussion',
        closeStrategy: 'scheduled',
        durationSeconds: options?.customDurationSeconds ?? 28800, // 8 hours
        discussionPrompt:
          content.discussionPrompt ||
          'What did everyone else overlook? Drop your deduction below before the spoiler reveal.',
        targetChatId,
      };
    }

    if (format === 'future_tech') {
      return {
        interactionType: 'open_discussion',
        closeStrategy: 'scheduled',
        durationSeconds: options?.customDurationSeconds ?? 21600, // 6 hours
        discussionPrompt:
          content.discussionPrompt ||
          'What are the societal and moral trade-offs of this technology? Join the debate below.',
        targetChatId,
      };
    }

    if (format === 'prediction' || format === 'prediction_vote') {
      const choices = (content.choices && content.choices.length >= 2)
        ? content.choices
        : [
            { label: 'Option A: High probability path', tradeOff: 'Conservative estimate' },
            { label: 'Option B: Unprecedented disruption', tradeOff: 'Radical outlier risk' },
          ];

      return {
        interactionType: 'prediction_vote',
        closeStrategy: 'scheduled',
        durationSeconds: options?.customDurationSeconds ?? 14400, // 4 hours
        pollConfig: {
          question: content.pollQuestion || content.question || `PREDICTION: ${content.title}`,
          options: choices.slice(0, 2).map((c) => ({
            text: c.label.length > 100 ? c.label.slice(0, 97) + '...' : c.label,
            tradeOff: c.tradeOff,
          })),
          isAnonymous: true,
          allowsMultipleAnswers: false,
        },
        targetChatId,
      };
    }

    if (format === 'interactive_minigame') {
      const choices = (content.choices && content.choices.length >= 2)
        ? content.choices
        : [
            { label: 'Option 1', tradeOff: 'Tradeoff 1' },
            { label: 'Option 2', tradeOff: 'Tradeoff 2' },
          ];

      return {
        interactionType: 'poll',
        closeStrategy: 'scheduled',
        durationSeconds: options?.customDurationSeconds ?? 21600, // 6 hours
        pollConfig: {
          question: (content.pollQuestion || content.question || content.title).slice(0, 300),
          options: choices.slice(0, 10).map((c) => ({
            text: c.label.length > 100 ? c.label.slice(0, 97) + '...' : c.label,
            tradeOff: c.tradeOff,
          })),
          isAnonymous: true,
          allowsMultipleAnswers: true,
        },
        targetChatId,
      };
    }

    if (format === 'versus_battle') {
      const choices = (content.choices && content.choices.length >= 2)
        ? content.choices
        : [
            { label: 'Side A', tradeOff: 'Cost A' },
            { label: 'Side B', tradeOff: 'Cost B' },
          ];

      return {
        interactionType: 'poll',
        closeStrategy: 'scheduled',
        durationSeconds: options?.customDurationSeconds ?? 14400, // 4 hours
        pollConfig: {
          question: (content.pollQuestion || content.question || content.title).slice(0, 300),
          options: choices.slice(0, 2).map((c) => ({
            text: c.label.length > 100 ? c.label.slice(0, 97) + '...' : c.label,
            tradeOff: c.tradeOff,
          })),
          isAnonymous: true,
          allowsMultipleAnswers: false,
        },
        targetChatId,
      };
    }

    if (format === 'strategy_challenge') {
      const choices = (content.choices && content.choices.length >= 2)
        ? content.choices
        : [
            { label: 'Strategy A', tradeOff: 'Cost A' },
            { label: 'Strategy B', tradeOff: 'Cost B' },
            { label: 'Strategy C', tradeOff: 'Cost C' },
          ];

      return {
        interactionType: 'poll',
        closeStrategy: 'scheduled',
        durationSeconds: options?.customDurationSeconds ?? 14400, // 4 hours
        pollConfig: {
          question: (content.pollQuestion || content.question || content.title).slice(0, 300),
          options: choices.slice(0, 4).map((c) => ({
            text: c.label.length > 100 ? c.label.slice(0, 97) + '...' : c.label,
            tradeOff: c.tradeOff,
          })),
          isAnonymous: true,
          allowsMultipleAnswers: false,
        },
        targetChatId,
      };
    }

    // impossible_dilemma (3h), survival_scenario (3h), chaotic_funny (2h) -> Poll
    let defaultDuration = 10800; // 3 hours
    let maxOpts = 3;
    if (format === 'chaotic_funny') {
      defaultDuration = 7200; // 2 hours
    } else if (format === 'survival_scenario') {
      defaultDuration = 10800; // 3 hours
      maxOpts = 2;
    }

    const choices = (content.choices && content.choices.length >= 2)
      ? content.choices
      : [
          { label: 'Option A', tradeOff: 'Trade-off A' },
          { label: 'Option B', tradeOff: 'Trade-off B' },
        ];

    return {
      interactionType: 'poll',
      closeStrategy: 'scheduled',
      durationSeconds: options?.customDurationSeconds ?? defaultDuration,
      pollConfig: {
        question: (content.pollQuestion || content.question || content.title).slice(0, 300),
        options: choices.slice(0, maxOpts).map((c) => ({
          text: c.label.length > 100 ? c.label.slice(0, 97) + '...' : c.label,
          tradeOff: c.tradeOff,
        })),
        isAnonymous: true,
        allowsMultipleAnswers: false,
      },
      targetChatId,
    };
  }

  private buildPlanForType(
    type: InteractionType,
    content: PostContentForPlanning,
    targetChatId: string,
    durationSeconds?: number,
  ): InteractionPlan {
    switch (type) {
      case 'open_discussion':
        return {
          interactionType: 'open_discussion',
          closeStrategy: 'scheduled',
          durationSeconds: durationSeconds ?? 43200,
          discussionPrompt:
            content.discussionPrompt || 'Defend your choice in the discussion thread below.',
          targetChatId,
        };
      case 'prediction_vote':
      case 'poll': {
        const choices = content.choices || [
          { label: 'Option 1', tradeOff: 'Risk 1' },
          { label: 'Option 2', tradeOff: 'Risk 2' },
        ];
        return {
          interactionType: type,
          closeStrategy: 'scheduled',
          durationSeconds: durationSeconds ?? 7200,
          pollConfig: {
            question: (content.pollQuestion || content.question || content.title).slice(0, 300),
            options: choices.map((c) => ({
              text: c.label.slice(0, 100),
              tradeOff: c.tradeOff,
            })),
            isAnonymous: true,
            allowsMultipleAnswers: false,
          },
          targetChatId,
        };
      }
      case 'result_reveal':
        return {
          interactionType: 'result_reveal',
          closeStrategy: 'never',
          targetChatId,
        };
      case 'scenario_choice':
      default:
        return {
          interactionType: type,
          closeStrategy: 'scheduled',
          durationSeconds: durationSeconds ?? 7200,
          targetChatId,
        };
    }
  }
}

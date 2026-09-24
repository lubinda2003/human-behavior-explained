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
    if (
      format === 'open_discussion' ||
      format === 'mini_mystery' ||
      format === 'hot_take'
    ) {
      return {
        interactionType: 'open_discussion',
        closeStrategy: 'scheduled',
        durationSeconds: options?.customDurationSeconds ?? 43200, // 12 hours default for open debate
        discussionPrompt:
          content.discussionPrompt ||
          'Drop your reasoning and defense below. Can your strategy withstand peer scrutiny?',
        targetChatId,
      };
    }

    if (format === 'prediction' || format === 'prediction_vote' || format === 'future_tech') {
      const choices = (content.choices && content.choices.length >= 2)
        ? content.choices
        : [
            { label: 'Option A: High probability path', tradeOff: 'Conservative estimate' },
            { label: 'Option B: Unprecedented disruption', tradeOff: 'Radical outlier risk' },
          ];

      return {
        interactionType: 'prediction_vote',
        closeStrategy: 'scheduled',
        durationSeconds: options?.customDurationSeconds ?? 14400, // 4 hours for prediction locks
        pollConfig: {
          question: content.pollQuestion || content.question || `PREDICTION: ${content.title}`,
          options: choices.map((c) => ({
            text: c.label.length > 100 ? c.label.slice(0, 97) + '...' : c.label,
            tradeOff: c.tradeOff,
          })),
          isAnonymous: true,
          allowsMultipleAnswers: false,
        },
        targetChatId,
      };
    }

    if (format === 'result_reveal') {
      return {
        interactionType: 'result_reveal',
        closeStrategy: 'never',
        targetChatId,
      };
    }

    // Standard dilemma / survival / versus / ranking -> Native Poll
    const choices = (content.choices && content.choices.length >= 2)
      ? content.choices
      : [
          { label: 'Option A', tradeOff: 'Heavy trade-off A' },
          { label: 'Option B', tradeOff: 'Heavy trade-off B' },
        ];

    const isInteractiveRanking = format === 'interactive_minigame';

    return {
      interactionType: 'poll',
      closeStrategy: 'scheduled',
      durationSeconds: options?.customDurationSeconds ?? 7200, // 2 hours default poll lifecycle
      pollConfig: {
        question:
          (content.pollQuestion || content.question || content.title).slice(0, 300),
        options: choices.slice(0, 10).map((c) => ({
          text: c.label.length > 100 ? c.label.slice(0, 97) + '...' : c.label,
          tradeOff: c.tradeOff,
        })),
        isAnonymous: true, // Anonymous for channel chats per Telegram requirements
        allowsMultipleAnswers: isInteractiveRanking,
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

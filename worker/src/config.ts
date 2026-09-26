import type { ContentTypeId } from './types';

/** Telegram Bot API poll limits. Generated text must be validated against these. */
export const POLL_LIMITS = {
  questionMax: 300,
  optionMax: 100,
  optionsMin: 2,
  optionsMax: 10,
  explanationMax: 200,
} as const;

/**
 * How a post collects audience input:
 *  - poll:     native Telegram poll
 *  - reaction: vote by emoji reaction on the post (no poll)
 *  - comments: answers go in the linked discussion group
 *  - derived:  built from earlier posts / stored results, not from scratch
 */
export type Mechanic = 'poll' | 'reaction' | 'comments' | 'derived';

export interface ContentTypeSpec {
  id: ContentTypeId;
  label: string;
  description: string;
  mechanic: Mechanic;
  /** "fresh" types are chosen by the variety planner; "derived" types are triggered by events. */
  origin: 'fresh' | 'derived';
  /** Relative chance of being picked among eligible fresh types. */
  weight: number;
  /** Minimum number of fresh posts before this type may repeat. */
  cooldownPosts: number;
  minChoices: number;
  maxChoices: number;
  needsDiscussionGroup: boolean;
  enabled: boolean;
}

export const CONTENT_TYPES: Record<ContentTypeId, ContentTypeSpec> = {
  impossible_dilemma: {
    id: 'impossible_dilemma',
    label: 'Impossible dilemma',
    description: 'High-stakes impossible choice between painful or agonizing alternatives.',
    mechanic: 'poll',
    origin: 'fresh',
    weight: 20,
    cooldownPosts: 1,
    minChoices: 2,
    maxChoices: 4,
    needsDiscussionGroup: false,
    enabled: true,
  },
  survival_scenario: {
    id: 'survival_scenario',
    label: 'Survival scenario',
    description: 'Urgent physical or situational survival dilemma requiring quick tactical decision.',
    mechanic: 'poll',
    origin: 'fresh',
    weight: 12,
    cooldownPosts: 2,
    minChoices: 2,
    maxChoices: 4,
    needsDiscussionGroup: false,
    enabled: true,
  },
  mini_mystery: {
    id: 'mini_mystery',
    label: 'Mini mystery',
    description: 'Hidden information and deduction scenario where readers uncover the trap.',
    mechanic: 'poll',
    origin: 'fresh',
    weight: 10,
    cooldownPosts: 2,
    minChoices: 2,
    maxChoices: 4,
    needsDiscussionGroup: false,
    enabled: true,
  },
  strategy_challenge: {
    id: 'strategy_challenge',
    label: 'Strategy challenge',
    description: 'Resource allocation or high-stakes strategy dilemma under extreme constraints.',
    mechanic: 'poll',
    origin: 'fresh',
    weight: 12,
    cooldownPosts: 2,
    minChoices: 2,
    maxChoices: 4,
    needsDiscussionGroup: false,
    enabled: true,
  },
  prediction: {
    id: 'prediction',
    label: 'Prediction challenge',
    description: 'Forecasting future development or outcome with verifiable resolution criteria.',
    mechanic: 'poll',
    origin: 'fresh',
    weight: 10,
    cooldownPosts: 2,
    minChoices: 2,
    maxChoices: 4,
    needsDiscussionGroup: false,
    enabled: true,
  },
  versus_battle: {
    id: 'versus_battle',
    label: 'Versus battle',
    description: 'Two iconic or contrasting forces and philosophies in direct clash.',
    mechanic: 'poll',
    origin: 'fresh',
    weight: 14,
    cooldownPosts: 2,
    minChoices: 2,
    maxChoices: 3,
    needsDiscussionGroup: false,
    enabled: true,
  },
  chaotic_funny: {
    id: 'chaotic_funny',
    label: 'Chaotic & funny',
    description: 'Bizarre, absurd, comedic hypothetical choice with unexpected trade-offs.',
    mechanic: 'poll',
    origin: 'fresh',
    weight: 12,
    cooldownPosts: 2,
    minChoices: 2,
    maxChoices: 4,
    needsDiscussionGroup: false,
    enabled: true,
  },
  future_tech: {
    id: 'future_tech',
    label: 'Future tech & AI',
    description: 'AI, biotechnology, or futuristic crisis with societal or moral implications.',
    mechanic: 'poll',
    origin: 'fresh',
    weight: 10,
    cooldownPosts: 2,
    minChoices: 2,
    maxChoices: 4,
    needsDiscussionGroup: false,
    enabled: true,
  },
  brain_logic: {
    id: 'brain_logic',
    label: 'Brain logic & paradox',
    description: 'Paradox or lateral thinking dilemma testing audience logic and wits.',
    mechanic: 'poll',
    origin: 'fresh',
    weight: 10,
    cooldownPosts: 2,
    minChoices: 2,
    maxChoices: 4,
    needsDiscussionGroup: false,
    enabled: true,
  },
  hot_take: {
    id: 'hot_take',
    label: 'Hot take debate',
    description: 'Provocative question or divisive position driving debate in discussion group.',
    mechanic: 'comments',
    origin: 'fresh',
    weight: 10,
    cooldownPosts: 2,
    minChoices: 2,
    maxChoices: 3,
    needsDiscussionGroup: true,
    enabled: true,
  },
  interactive_minigame: {
    id: 'interactive_minigame',
    label: 'Interactive minigame',
    description: 'Multi-option ranking or mini-game mechanic allowing multiple selections.',
    mechanic: 'poll',
    origin: 'fresh',
    weight: 10,
    cooldownPosts: 2,
    minChoices: 2,
    maxChoices: 5,
    needsDiscussionGroup: false,
    enabled: true,
  },
  result_reveal: {
    id: 'result_reveal',
    label: 'Result & reveal',
    description: 'Outcome payoff and reveal of past interaction results.',
    mechanic: 'derived',
    origin: 'derived',
    weight: 0,
    cooldownPosts: 0,
    minChoices: 0,
    maxChoices: 0,
    needsDiscussionGroup: false,
    enabled: true,
  },
};

/**
 * How many of the most recent posts each variety axis looks back over.
 * Recently used values get a lower chance; the immediately previous value is skipped.
 */
export const RECENCY_WINDOWS = {
  category: 6,
  tone: 4,
  stakes: 3,
  layout: 4,
  hookStyle: 4,
} as const;

/**
 * Default cooldown between fresh content publications in minutes (180 minutes = 3 hours).
 * Prevents channel spamming when the worker cron runs frequently (e.g. every 30 minutes).
 */
export const DEFAULT_PUBLISHING_COOLDOWN_MINUTES = 180;

/** Stock phrases that make text read as machine-written. Quality checks reject these. */
export const BANNED_PHRASES: readonly string[] = [
  'imagine a world',
  'in a world where',
  "let's dive in",
  'buckle up',
  'get ready',
  'are you ready',
  'game-changer',
  'delve',
  'tapestry',
  'unlock the',
  'in today\'s fast-paced',
  'ultimate test',
];

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
  classic_poll: {
    id: 'classic_poll',
    label: 'Classic poll dilemma',
    description: 'A high-stakes scenario with 2-4 costly options and a native Telegram poll.',
    mechanic: 'poll',
    origin: 'fresh',
    weight: 34,
    cooldownPosts: 1,
    minChoices: 2,
    maxChoices: 4,
    needsDiscussionGroup: false,
    enabled: true,
  },
  reaction_vote: {
    id: 'reaction_vote',
    label: 'Reaction vote',
    description: 'A punchy either/or where each option has its own emoji. Vote by reacting, no poll.',
    mechanic: 'reaction',
    origin: 'fresh',
    weight: 18,
    cooldownPosts: 2,
    minChoices: 2,
    maxChoices: 3,
    needsDiscussionGroup: false,
    enabled: true,
  },
  open_debate: {
    id: 'open_debate',
    label: 'Open debate',
    description: 'No vote. A dilemma with no clean answer; the audience defends their pick in comments.',
    mechanic: 'comments',
    origin: 'fresh',
    weight: 16,
    cooldownPosts: 3,
    minChoices: 2,
    maxChoices: 3,
    needsDiscussionGroup: true,
    enabled: true,
  },
  story_fork: {
    id: 'story_fork',
    label: 'Story fork',
    description: 'A short narrative that stops at the decision point. Readers say what they would do.',
    mechanic: 'comments',
    origin: 'fresh',
    weight: 14,
    cooldownPosts: 3,
    minChoices: 2,
    maxChoices: 3,
    needsDiscussionGroup: true,
    enabled: true,
  },
  rank_it: {
    id: 'rank_it',
    label: 'Rank it',
    description: 'Four terrible-but-tempting options. Readers rank them from best to worst.',
    mechanic: 'poll',
    origin: 'fresh',
    weight: 12,
    cooldownPosts: 4,
    minChoices: 4,
    maxChoices: 4,
    needsDiscussionGroup: false,
    enabled: true,
  },
  trap_breakdown: {
    id: 'trap_breakdown',
    label: 'Trap breakdown',
    description: 'Revisits a past dilemma and explains the hidden catch behind the "obvious" answer.',
    mechanic: 'derived',
    origin: 'derived',
    weight: 0,
    cooldownPosts: 0,
    minChoices: 0,
    maxChoices: 0,
    needsDiscussionGroup: false,
    enabled: true,
  },
  results_reveal: {
    id: 'results_reveal',
    label: 'Results and reveal',
    description: 'Closes a poll, shows the real vote split, then delivers the payoff.',
    mechanic: 'derived',
    origin: 'derived',
    weight: 0,
    cooldownPosts: 0,
    minChoices: 0,
    maxChoices: 0,
    needsDiscussionGroup: false,
    enabled: true,
  },
  weekly_recap: {
    id: 'weekly_recap',
    label: 'Weekly recap',
    description: 'The week\'s most divisive dilemmas, built from stored poll results.',
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

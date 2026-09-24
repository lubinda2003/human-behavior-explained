/**
 * Core domain types for the Interactive Dilemmas & Impossible Choices Worker.
 * One niche, many shapes: every post is a combination of a content type plus
 * several "variety axes" (category, tone, stakes, layout, hook style).
 */

export const DILEMMA_CATEGORIES = [
  'money/lifestyle',
  'moral',
  'social/relationship',
  'strategy',
  'survival',
  'funny/chaotic',
  'technology/future',
  'adventure/travel',
  'fantasy',
  'bizarre hypothetical situations',
] as const;
export type DilemmaCategory = (typeof DILEMMA_CATEGORIES)[number];

export const TONES = [
  'funny',
  'tense',
  'absurd',
  'wholesome',
  'dark-comic',
  'dramatic',
  'deadpan',
] as const;
export type Tone = (typeof TONES)[number];

export const STAKES = ['personal', 'social', 'world-scale', 'ridiculous'] as const;
export type Stakes = (typeof STAKES)[number];

/** Message skeletons. The formatter (later stage) renders one template per id. */
export const LAYOUTS = [
  'stacked',
  'conversational',
  'minimal',
  'story',
  'punchline',
  'ledger',
] as const;
export type LayoutId = (typeof LAYOUTS)[number];

export const HOOK_STYLES = [
  'question',
  'statement',
  'countdown',
  'breaking',
  'second-person',
  'confession',
] as const;
export type HookStyle = (typeof HOOK_STYLES)[number];

export const CONTENT_TYPE_IDS = [
  'impossible_dilemma',
  'survival_scenario',
  'mini_mystery',
  'strategy_challenge',
  'prediction',
  'versus_battle',
  'chaotic_funny',
  'future_tech',
  'brain_logic',
  'hot_take',
  'interactive_minigame',
  'result_reveal',
] as const;
export type ContentTypeId = (typeof CONTENT_TYPE_IDS)[number];

/** The combination of choices that makes one post feel different from the last. */
export interface VarietyPlan {
  contentType: ContentTypeId;
  category: DilemmaCategory;
  tone: Tone;
  stakes: Stakes;
  layout: LayoutId;
  hookStyle: HookStyle;
}

/** A previously published post's plan. History is always ordered most-recent-first. */
export type HistoryEntry = VarietyPlan;

export interface DilemmaChoice {
  label: string;
  description: string;
  tradeOff: string;
}

export interface DilemmaPayoff {
  reveal: string;
  twist: string;
  splitReason: string;
}

/** What the model generates for a post. Which fields matter depends on the content type. */
export interface DilemmaContent {
  title: string;
  hook: string;
  scenario: string;
  choices: DilemmaChoice[];
  question: string;
  payoff: DilemmaPayoff;
}

export type PostStatus = 'draft' | 'queued' | 'published' | 'failed' | 'skipped';

/** A row in the D1 `posts` table (payload is stored as JSON text). */
export interface PostRecord {
  id: string;
  contentType: ContentTypeId;
  category: DilemmaCategory;
  tone: Tone;
  stakes: Stakes;
  layout: LayoutId;
  hookStyle: HookStyle;
  title: string;
  status: PostStatus;
  payload: DilemmaContent;
  parentPostId?: string;
  telegramMessageId?: number;
  telegramPollMessageId?: number;
  rawR2Key?: string;
  scheduledFor?: string;
  publishedAt?: string;
  failureReason?: string;
  createdAt: string;
}

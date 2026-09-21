import { CONTENT_TYPES, RECENCY_WINDOWS } from '../config';
import {
  DILEMMA_CATEGORIES,
  HOOK_STYLES,
  LAYOUTS,
  STAKES,
  TONES,
  type ContentTypeId,
  type DilemmaCategory,
  type HistoryEntry,
  type VarietyPlan,
} from '../types';

export interface PlanOptions {
  /** Random source returning [0, 1). Injectable so tests are deterministic. */
  rng?: () => number;
  /** Whether a discussion group is linked. Comment-driven types need it. */
  discussionGroup?: boolean;
  forceType?: ContentTypeId;
  forceCategory?: DilemmaCategory;
}

function weightedPick<T>(items: { value: T; weight: number }[], rng: () => number): T {
  const total = items.reduce((sum, item) => sum + Math.max(0, item.weight), 0);
  if (total <= 0) return items[Math.floor(rng() * items.length)].value;
  let r = rng() * total;
  for (const item of items) {
    r -= Math.max(0, item.weight);
    if (r < 0) return item.value;
  }
  return items[items.length - 1].value;
}

/**
 * Pick from `options`, skipping the value used last time and down-weighting
 * values that appeared often inside the recent window.
 */
function pickAvoidingRecent<T extends string>(
  options: readonly T[],
  recent: T[],
  window: number,
  rng: () => number,
): T {
  const slice = recent.slice(0, window);
  const last = slice[0];
  const candidates = options.length > 1 ? options.filter((o) => o !== last) : [...options];
  return weightedPick(
    candidates.map((value) => ({
      value,
      weight: 1 / (1 + 3 * slice.filter((r) => r === value).length),
    })),
    rng,
  );
}

function pickContentType(
  history: HistoryEntry[],
  discussionGroup: boolean,
  rng: () => number,
): ContentTypeId {
  const fresh = Object.values(CONTENT_TYPES).filter(
    (spec) =>
      spec.origin === 'fresh' &&
      spec.enabled &&
      (discussionGroup || !spec.needsDiscussionGroup),
  );

  const offCooldown = fresh.filter(
    (spec) => !history.slice(0, spec.cooldownPosts).some((h) => h.contentType === spec.id),
  );

  // If cooldowns exclude everything (few types enabled), relax to "anything but last time".
  const pool =
    offCooldown.length > 0
      ? offCooldown
      : fresh.filter((spec) => spec.id !== history[0]?.contentType);

  const finalPool = pool.length > 0 ? pool : fresh;
  return weightedPick(
    finalPool.map((spec) => ({ value: spec.id, weight: spec.weight })),
    rng,
  );
}

/**
 * Decide the shape of the next fresh post: which content type, and which
 * category / tone / stakes / layout / hook style, so consecutive posts differ.
 * `history` must contain fresh posts only, most recent first.
 */
export function planVariety(history: HistoryEntry[], options: PlanOptions = {}): VarietyPlan {
  const rng = options.rng ?? Math.random;
  const discussionGroup = options.discussionGroup ?? false;

  const contentType = options.forceType ?? pickContentType(history, discussionGroup, rng);

  const category =
    options.forceCategory ??
    pickAvoidingRecent(
      DILEMMA_CATEGORIES,
      history.map((h) => h.category),
      RECENCY_WINDOWS.category,
      rng,
    );

  return {
    contentType,
    category,
    tone: pickAvoidingRecent(TONES, history.map((h) => h.tone), RECENCY_WINDOWS.tone, rng),
    stakes: pickAvoidingRecent(STAKES, history.map((h) => h.stakes), RECENCY_WINDOWS.stakes, rng),
    layout: pickAvoidingRecent(LAYOUTS, history.map((h) => h.layout), RECENCY_WINDOWS.layout, rng),
    hookStyle: pickAvoidingRecent(
      HOOK_STYLES,
      history.map((h) => h.hookStyle),
      RECENCY_WINDOWS.hookStyle,
      rng,
    ),
  };
}

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CONTENT_TYPES, POLL_LIMITS } from '../src/config';
import { planVariety } from '../src/variety/planner';
import { DILEMMA_CATEGORIES, type HistoryEntry } from '../src/types';

/** Small deterministic PRNG so failures are reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function simulate(n: number, seed: number, discussionGroup: boolean): HistoryEntry[] {
  const rng = mulberry32(seed);
  const history: HistoryEntry[] = [];
  const chronological: HistoryEntry[] = [];
  for (let i = 0; i < n; i++) {
    const plan = planVariety(history, { rng, discussionGroup });
    chronological.push(plan);
    history.unshift(plan);
  }
  return chronological;
}

test('never repeats the same content type back to back', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const run = simulate(200, seed, true);
    for (let i = 1; i < run.length; i++) {
      assert.notEqual(run[i].contentType, run[i - 1].contentType, `seed ${seed}, index ${i}`);
    }
  }
});

test('respects per-type cooldowns when all fresh types are available', () => {
  const run = simulate(300, 42, true);
  run.forEach((post, i) => {
    const cooldown = CONTENT_TYPES[post.contentType].cooldownPosts;
    for (let back = 1; back <= cooldown && i - back >= 0; back++) {
      assert.notEqual(run[i - back].contentType, post.contentType, `index ${i}, back ${back}`);
    }
  });
});

test('uses every fresh content type over a long run', () => {
  const seen = new Set(simulate(200, 7, true).map((p) => p.contentType));
  for (const spec of Object.values(CONTENT_TYPES)) {
    if (spec.origin === 'fresh') assert.ok(seen.has(spec.id), `missing ${spec.id}`);
  }
});

test('never picks derived content types', () => {
  for (const post of simulate(200, 9, true)) {
    assert.equal(CONTENT_TYPES[post.contentType].origin, 'fresh');
  }
});

test('excludes comment-driven types when no discussion group is linked', () => {
  for (const post of simulate(200, 11, false)) {
    assert.equal(CONTENT_TYPES[post.contentType].needsDiscussionGroup, false);
  }
});

test('category, tone, layout and hook style never repeat back to back', () => {
  const run = simulate(200, 13, true);
  for (let i = 1; i < run.length; i++) {
    assert.notEqual(run[i].category, run[i - 1].category);
    assert.notEqual(run[i].tone, run[i - 1].tone);
    assert.notEqual(run[i].layout, run[i - 1].layout);
    assert.notEqual(run[i].hookStyle, run[i - 1].hookStyle);
  }
});

test('covers all ten categories over a long run', () => {
  const seen = new Set(simulate(200, 17, true).map((p) => p.category));
  assert.equal(seen.size, DILEMMA_CATEGORIES.length);
});

test('forced type and category are respected', () => {
  const plan = planVariety([], { forceType: 'rank_it', forceCategory: 'survival' });
  assert.equal(plan.contentType, 'rank_it');
  assert.equal(plan.category, 'survival');
});

test('content type specs are internally consistent', () => {
  for (const spec of Object.values(CONTENT_TYPES)) {
    assert.ok(spec.minChoices <= spec.maxChoices, spec.id);
    if (spec.mechanic === 'poll') {
      assert.ok(spec.minChoices >= POLL_LIMITS.optionsMin, spec.id);
      assert.ok(spec.maxChoices <= POLL_LIMITS.optionsMax, spec.id);
    }
    if (spec.origin === 'derived') assert.equal(spec.weight, 0, spec.id);
  }
});

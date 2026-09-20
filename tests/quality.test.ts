/**
 * Editorial Quality & Post Schema Validation Tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { QualityChecker } from '../src/pipeline/quality.js';
import { PostDraft } from '../src/pipeline/types.js';

describe('Editorial Quality & Content Linter', () => {
  const validDraft: PostDraft = {
    title: 'Why You Forget Why You Entered a Room',
    pillar: 'Brain, Memory & Perception',
    hook: 'Walk through a doorway into another room, and your working memory abruptly empties.',
    bodyParagraphs: [
      'In a 2011 study at the University of Notre Dame, researcher Gabriel Radvansky tested participants navigating virtual environments. Walking across a single large room caused minimal memory decay. However, passing through an open doorway immediately tripled the rate of forgetting previously memorized objects.',
      'Radvansky termed this the Event Horizon Model. The human brain perceives doorways as cognitive "event boundaries." Just as an author starts a new chapter, the hippocampus flushes current working memory to prepare for the novel sensory cues of the new environment.',
    ],
    coreTakeaway:
      'Physical architectural thresholds signal the brain to compartmentalize and archive current working memory.',
    sourcesCited: ['Radvansky et al. (2011), Q J Exp Psychol'],
    caveatNote:
      'The effect is weaker when subjects intentionally rehearse the object name during transit.',
    cta: {
      type: 'reflection',
      text: 'Next time you walk into a room and blank out, notice whether your eyes already shifted toward an unfamiliar doorway.',
    },
  };

  it('should pass a high-quality, evidence-based post draft', () => {
    const res = QualityChecker.validate(validDraft);
    assert.equal(res.isValid, true);
    assert.equal(res.errors.length, 0);
  });

  it('should reject banned AI clichés like "Have you ever wondered"', () => {
    const invalidDraft: PostDraft = {
      ...validDraft,
      hook: 'Have you ever wondered why you forget things when entering a room?',
    };
    const res = QualityChecker.validate(invalidDraft);
    assert.equal(res.isValid, false);
    assert.ok(
      res.errors.some((e) => e.includes('have you ever wondered')),
      'Should flag "have you ever wondered"'
    );
  });

  it('should reject banned AI clichés like "In today\'s fast-paced world" or "Let\'s dive in"', () => {
    const invalidDraft: PostDraft = {
      ...validDraft,
      hook: "In today's fast-paced world, our brains get distracted easily. Let's dive in!",
    };
    const res = QualityChecker.validate(invalidDraft);
    assert.equal(res.isValid, false);
    assert.ok(
      res.errors.some((e) => e.includes("in today's fast-paced world")),
      'Should flag "in today\'s fast-paced world"'
    );
    assert.ok(
      res.errors.some((e) => e.includes("let's dive in")),
      'Should flag "let\'s dive in"'
    );
  });

  it('should reject pop-psychology and pseudoscience phrases', () => {
    const invalidDraft: PostDraft = {
      ...validDraft,
      bodyParagraphs: [
        'Here are the signs someone secretly hates you and how to read their aura.',
        'This technique teaches you dark psychology tricks.',
      ],
    };
    const res = QualityChecker.validate(invalidDraft);
    assert.equal(res.isValid, false);
    assert.ok(
      res.errors.some((e) => e.includes('signs someone secretly hates you')),
      'Should flag fake behavioral signs'
    );
  });

  it('should reject generic engagement begging in CTAs', () => {
    const invalidDraft: PostDraft = {
      ...validDraft,
      cta: {
        type: 'conversation',
        text: 'Like this post and comment below if this happens to you!',
      },
    };
    const res = QualityChecker.validate(invalidDraft);
    assert.equal(res.isValid, false);
    assert.ok(
      res.errors.some((e) => e.includes('like this post')),
      'Should flag "like this post"'
    );
    assert.ok(
      res.errors.some((e) => e.includes('comment below')),
      'Should flag "comment below"'
    );
  });

  it('should require empirical sources and scientific caveats', () => {
    const invalidDraft: PostDraft = {
      ...validDraft,
      sourcesCited: [],
      caveatNote: '',
    };
    const res = QualityChecker.validate(invalidDraft);
    assert.equal(res.isValid, false);
    assert.ok(
      res.errors.some((e) => e.includes('missing empirical sources')),
      'Should flag missing sources'
    );
    assert.ok(
      res.errors.some((e) => e.includes('scientific limitation')),
      'Should flag missing caveats'
    );
  });

  it('should flag clickbait headlines', () => {
    const invalidDraft: PostDraft = {
      ...validDraft,
      title: 'You Won’t Believe What Doors Do to Your Brain!',
    };
    const res = QualityChecker.validate(invalidDraft);
    assert.equal(res.isValid, false);
    assert.ok(
      res.errors.some((e) => e.includes('Clickbait title pattern')),
      'Should flag clickbait title'
    );
  });
});

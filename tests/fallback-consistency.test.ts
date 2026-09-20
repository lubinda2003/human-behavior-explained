/**
 * Fallback Content Consistency Tests
 * Ensures that if Gemini is unavailable, the fallback topic, research, post, and visual
 * all describe the exact same phenomenon and never mix unrelated topics.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GeminiContentEngine } from '../src/pipeline/gemini.js';
import { QualityChecker } from '../src/pipeline/quality.js';
import { CURATED_ENTRIES } from '../src/pipeline/curatedContent.js';
import { ContentPillar } from '../src/pipeline/types.js';

describe('Fallback Content Consistency', () => {
  const engine = new GeminiContentEngine(''); // Empty key forces curated fallbacks

  it('every curated entry must have internally consistent topic, research, draft, and visual', () => {
    for (const entry of CURATED_ENTRIES) {
      assert.ok(entry.topic, `Entry ${entry.id} missing topic`);
      assert.ok(entry.research, `Entry ${entry.id} missing research`);
      assert.ok(entry.draft, `Entry ${entry.id} missing draft`);
      assert.ok(entry.visual, `Entry ${entry.id} missing visual`);

      // 1. Pillar consistency
      assert.equal(
        entry.topic.pillar,
        entry.draft.pillar,
        `Pillar mismatch in ${entry.id}`
      );

      // 2. Draft title and topic alignment
      const topicLower = entry.topic.topic.toLowerCase();
      const draftText = (entry.draft.title + ' ' + entry.draft.hook + ' ' + entry.draft.bodyParagraphs.join(' ')).toLowerCase();

      // Check key concept words exist in both
      if (entry.id === 'ironic_process') {
        assert.ok(draftText.includes('white bear') || draftText.includes('suppress'));
      } else if (entry.id === 'trolley_footbridge') {
        assert.ok(draftText.includes('trolley') || draftText.includes('footbridge') || draftText.includes('lever'));
        assert.ok(!draftText.includes('wooden pegs') && !draftText.includes('festinger'));
      } else if (entry.id === 'doorway_effect') {
        assert.ok(draftText.includes('doorway') || draftText.includes('room'));
      } else if (entry.id === 'cognitive_dissonance') {
        assert.ok(draftText.includes('peg') || draftText.includes('dissonance') || draftText.includes('boring'));
      }

      // 3. CTA type validation
      const validCtaTypes = ['reflection', 'continuation', 'conversation', 'connection', 'none'];
      assert.ok(
        validCtaTypes.includes(entry.draft.cta.type),
        `Invalid CTA type "${entry.draft.cta.type}" in ${entry.id}`
      );
      assert.notEqual(
        (entry.draft.cta.type as string),
        'curiosity',
        `CTA type cannot be "curiosity" in ${entry.id}`
      );

      // 4. Quality validation check
      const quality = QualityChecker.validate(entry.draft);
      assert.ok(
        quality.isValid,
        `Draft for ${entry.id} failed QualityChecker: ${quality.errors.join(', ')}`
      );
    }
  });

  it('curated fallback for Trolley Problem must return Trolley research and Trolley post', async () => {
    const topic = {
      topic: 'The Trolley Problem: Footbridge Dilemma (Greene Neuroimaging)',
      pillar: 'Psychology Thought Experiments' as ContentPillar,
      coreQuestion: 'Why do people switch a lever to save five lives, but refuse to push one person directly?',
      rationale: 'Highlights dual-process moral neuroimaging.',
    };

    const research = await engine.researchTopic(topic);
    assert.ok(
      research.coreConcept.toLowerCase().includes('physical harm') ||
      research.coreConcept.toLowerCase().includes('utilitarian') ||
      research.coreConcept.toLowerCase().includes('greene')
    );
    assert.ok(
      research.keyStudies.some((s) => s.authors.toLowerCase().includes('greene')),
      'Research should cite Greene'
    );

    const draft = await engine.writeEditorialPost(topic, research);
    assert.ok(
      draft.title.toLowerCase().includes('lever') || draft.title.toLowerCase().includes('trolley'),
      `Draft title "${draft.title}" should describe trolley/lever`
    );
    assert.ok(
      !draft.title.toLowerCase().includes('boring tasks'),
      'Must NOT return Festinger peg-turning post for Trolley Problem!'
    );
    assert.ok(
      !draft.title.toLowerCase().includes('white bear'),
      'Must NOT return White Bear post for Trolley Problem!'
    );
  });

  it('curated fallback for White Bear must return Ironic Process research and post', async () => {
    const topic = {
      topic: 'Ironic Process Theory (The White Bear Problem)',
      pillar: 'Everyday Psychology' as ContentPillar,
      coreQuestion: 'Why does trying to suppress a thought make it rebound?',
      rationale: 'Demonstrates dual-process cognitive monitoring.',
    };

    const research = await engine.researchTopic(topic);
    assert.ok(
      research.coreConcept.toLowerCase().includes('suppression'),
      'Research should describe thought suppression'
    );

    const draft = await engine.writeEditorialPost(topic, research);
    assert.ok(
      draft.title.toLowerCase().includes('not to think'),
      'Draft title should describe thought suppression'
    );
    assert.ok(
      draft.sourcesCited.some((s) => s.toLowerCase().includes('wegner')),
      'Must cite Wegner'
    );
  });

  it('curated fallback for Doorway Effect must return Doorway research and post', async () => {
    const topic = {
      topic: 'The Doorway Effect (Event Horizon Model)',
      pillar: 'Brain, Memory & Perception' as ContentPillar,
      coreQuestion: 'Why do we forget why we entered a room?',
      rationale: 'Shows hippocampal event boundary resets.',
    };

    const research = await engine.researchTopic(topic);
    assert.ok(
      research.coreConcept.toLowerCase().includes('doorway') || research.coreConcept.toLowerCase().includes('event boundaries'),
      'Research should describe doorway effect'
    );

    const draft = await engine.writeEditorialPost(topic, research);
    assert.ok(
      draft.title.toLowerCase().includes('room') || draft.title.toLowerCase().includes('doorway'),
      'Draft title should describe entering a room/doorway'
    );
  });

  it('should support fallbacks across all 4 pillars with valid topics and drafts', async () => {
    const pillars: ContentPillar[] = [
      'Everyday Psychology',
      'Strange Human Behavior',
      'Brain, Memory & Perception',
      'Psychology Thought Experiments',
    ];

    for (const pillar of pillars) {
      const topic = engine.getCuratedFallbackTopic(pillar);
      assert.equal(topic.pillar, pillar);
      const research = engine.getCuratedFallbackResearch(topic);
      assert.ok(research.keyStudies.length > 0);
      const draft = engine.getCuratedFallbackPostDraft(topic, research);
      assert.equal(draft.pillar, pillar);
      const quality = QualityChecker.validate(draft);
      assert.ok(quality.isValid, `Draft for ${pillar} failed: ${quality.errors.join('; ')}`);
    }
  });
});

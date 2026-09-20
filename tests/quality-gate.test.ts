/**
 * Quality Gate & Editorial Validation Tests
 * Verifies that the quality gate strictly prevents invalid content from reaching the publishing queue.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PipelineCoordinator } from '../src/pipeline/coordinator.js';
import { ContentMemoryStore } from '../src/pipeline/memory.js';
import { ContentQueueStore } from '../src/pipeline/queue.js';
import { GeminiContentEngine } from '../src/pipeline/gemini.js';
import { QualityChecker } from '../src/pipeline/quality.js';
import { PostDraft, ResearchNotes, TopicCandidate } from '../src/pipeline/types.js';

describe('Quality Control Gate', () => {
  const testQueuePath = path.resolve('/tmp', 'test-quality-gate-queue.json');
  const testMemoryPath = path.resolve('/tmp', 'test-quality-gate-memory.json');
  let queueStore: ContentQueueStore;
  let memoryStore: ContentMemoryStore;

  beforeEach(() => {
    if (fs.existsSync(testQueuePath)) fs.unlinkSync(testQueuePath);
    if (fs.existsSync(testMemoryPath)) fs.unlinkSync(testMemoryPath);
    queueStore = new ContentQueueStore(testQueuePath);
    memoryStore = new ContentMemoryStore(testMemoryPath);
  });

  it('QualityChecker should reject drafts with banned AI clichés', () => {
    const invalidDraft: PostDraft = {
      title: 'Mind-Blowing Secrets of the Brain',
      pillar: 'Brain, Memory & Perception',
      hook: "Have you ever wondered why you can't focus? Let's dive in.",
      bodyParagraphs: [
        'Paragraph 1 discussing some basic thoughts and observations about the human brain.',
        'Paragraph 2 explaining cognitive mechanisms and everyday details with clarity.',
      ],
      coreTakeaway: 'Focus is a cognitive skill developed through repetition.',
      sourcesCited: ['Smith (2020)'],
      caveatNote: 'This effect only holds under quiet conditions.',
      cta: { type: 'reflection', text: 'Consider your focus habits.' },
    };

    const res = QualityChecker.validate(invalidDraft);
    assert.equal(res.isValid, false);
    assert.ok(res.errors.some((e) => e.includes('banned AI cliché')));
  });

  it('QualityChecker should reject drafts with invalid CTA type', () => {
    const invalidDraft: PostDraft = {
      title: 'The Stroop Interference Effect',
      pillar: 'Brain, Memory & Perception',
      hook: 'Try naming the ink color of an incongruent word rapidly without hesitation.',
      bodyParagraphs: [
        'In 1935, John Ridley Stroop tested speeded verbal color naming across participant cohorts in university laboratories.',
        'Automatic lexical processing creates cognitive interference in the anterior cingulate cortex, delaying reaction times.',
      ],
      coreTakeaway: 'Linguistic reading reflexes execute faster than color naming.',
      sourcesCited: ['Stroop (1935), J Exp Psychol'],
      caveatNote: 'Does not occur in non-readers or young children before literacy.',
      cta: { type: 'curiosity' as any, text: 'Look at the color words again.' },
    };

    const res = QualityChecker.validate(invalidDraft);
    assert.equal(res.isValid, false);
    assert.ok(res.errors.some((e) => e.includes('Invalid or missing CTA type')));
  });

  it('PipelineCoordinator should reject invalid drafts and never enqueue them', async () => {
    // Mock engine that produces an unfixable invalid draft
    class FailingEngine extends GeminiContentEngine {
      public override async selectTopic(): Promise<TopicCandidate> {
        return {
          topic: 'Fake Cliche Topic',
          pillar: 'Everyday Psychology',
          coreQuestion: 'Why?',
          rationale: 'Testing',
        };
      }
      public override async researchTopic(): Promise<ResearchNotes> {
        return {
          coreConcept: 'Test concept',
          scientificClaims: ['Claim 1'],
          keyStudies: [{ authors: 'Tester', year: 2020, findings: 'Something' }],
          cognitiveMechanisms: ['Mechanism'],
          caveatsAndLimitations: ['Caveat note explaining boundary conditions'],
          uncertaintyLevel: 'low',
          everydayManifestation: 'Everyday scenario',
        };
      }
      public override async writeEditorialPost(): Promise<PostDraft> {
        return {
          title: 'Shocking Secret!',
          pillar: 'Everyday Psychology',
          hook: "Have you ever wondered why people do this? Let's dive in.",
          bodyParagraphs: ['P1', 'P2'],
          coreTakeaway: 'Short',
          sourcesCited: [],
          caveatNote: '',
          cta: { type: 'reflection', text: 'Like this post!' },
        };
      }
      public override async reviseEditorialPost(): Promise<PostDraft> {
        // Revision still produces banned AI cliché
        return {
          title: 'Shocking Secret Still',
          pillar: 'Everyday Psychology',
          hook: "Have you ever wondered why this happens? Unlock the secrets now.",
          bodyParagraphs: ['P1', 'P2'],
          coreTakeaway: 'Short',
          sourcesCited: [],
          caveatNote: '',
          cta: { type: 'reflection', text: 'Share with a friend!' },
        };
      }
    }

    const coordinator = new PipelineCoordinator({
      queueStore,
      memoryStore,
      geminiEngine: new FailingEngine(''),
    });

    const items = await coordinator.generatePosts({ count: 1 });
    assert.equal(items.length, 0, 'Coordinator must reject invalid item');

    const queue = await queueStore.peek();
    assert.equal(queue.length, 0, 'Invalid item must NEVER reach the queue');
  });

  it('PipelineCoordinator should admit draft when revision corrects the errors', async () => {
    let revisedAttempt = false;

    class SelfCorrectingEngine extends GeminiContentEngine {
      public override async selectTopic(): Promise<TopicCandidate> {
        return {
          topic: 'The Zeigarnik Effect',
          pillar: 'Everyday Psychology',
          coreQuestion: 'Why do unfinished tasks stay in memory?',
          rationale: 'Testing',
        };
      }
      public override async researchTopic(): Promise<ResearchNotes> {
        return {
          coreConcept: 'Incomplete tasks maintain cognitive tension in working memory.',
          scientificClaims: ['Claim 1'],
          keyStudies: [{ authors: 'Zeigarnik', year: 1927, findings: 'Twice as memorable' }],
          cognitiveMechanisms: ['Psychological tension'],
          caveatsAndLimitations: ['Requires task engagement to trigger effect'],
          uncertaintyLevel: 'low',
          everydayManifestation: 'Unfinished email lingering at dinner',
        };
      }
      public override async writeEditorialPost(): Promise<PostDraft> {
        // First draft has an AI cliché
        return {
          title: 'Why Tasks Refuse to Leave Your Head',
          pillar: 'Everyday Psychology',
          hook: "Have you ever wondered why unfinished tasks stick? Let's dive in.",
          bodyParagraphs: [
            'In 1927, Soviet psychologist Bluma Zeigarnik sat in a bustling Vienna café and noticed something peculiar about the waiters. They possessed an uncanny ability to recall complex, unpaid food orders without taking notes. Yet the exact moment a bill was paid and settled, their memory of the customers and their specific dishes vanished completely.',
            'Zeigarnik brought the phenomenon into her university laboratory, giving participants various manual and cognitive puzzles. Whenever she deliberately interrupted subjects midway through a puzzle, their recall for the unfinished task was twice as sharp as for completed ones. The brain maintains active prefrontal cognitive tension that holds unresolved goals in working memory until deliberate cognitive closure is reached.',
          ],
          coreTakeaway: 'The brain maintains active neural representations for open goals.',
          sourcesCited: ['Zeigarnik (1927), Psychol Forsch'],
          caveatNote: 'Indifferent participants who felt no personal investment showed little to no cognitive tension.',
          cta: { type: 'continuation', text: 'Write down your first step for tomorrow to release mental tension.' },
        };
      }
      public override async reviseEditorialPost(
        _t: TopicCandidate,
        _r: ResearchNotes,
        _prev: PostDraft,
        errors: string[]
      ): Promise<PostDraft> {
        revisedAttempt = true;
        assert.ok(errors.length > 0, 'Revision must receive validation errors');
        // Corrected draft without clichés, proper length > 120 words
        return {
          title: 'Why Unfinished Tasks Stay in Mind',
          pillar: 'Everyday Psychology',
          hook: 'Leave a work task unfinished before leaving the office, and your brain quietly paces around it for the rest of the evening.',
          bodyParagraphs: [
            'In 1927, Soviet psychologist Bluma Zeigarnik sat in a bustling Vienna café and noticed something peculiar about the waiters. They possessed an uncanny ability to recall complex, unpaid food orders without taking notes. Yet the exact moment a bill was paid and settled, their memory of the customers and their specific dishes vanished completely.',
            'Zeigarnik brought the phenomenon into her university laboratory, giving participants various manual and cognitive puzzles. Whenever she deliberately interrupted subjects midway through a puzzle, their recall for the unfinished task was twice as sharp as for completed ones. The brain maintains active prefrontal cognitive tension that holds unresolved goals in working memory until deliberate cognitive closure is reached.',
          ],
          coreTakeaway: 'The mind treats unresolved tasks as active working memory loops.',
          sourcesCited: ['Zeigarnik (1927), Psychol Forsch'],
          caveatNote: 'Indifferent participants who felt no personal investment showed little to no cognitive tension.',
          cta: { type: 'continuation', text: 'Note down tomorrow’s starting action tonight to signal cognitive closure.' },
        };
      }
    }

    const coordinator = new PipelineCoordinator({
      queueStore,
      memoryStore,
      geminiEngine: new SelfCorrectingEngine(''),
    });

    const items = await coordinator.generatePosts({ count: 1 });
    assert.equal(revisedAttempt, true, 'Should have called reviseEditorialPost');
    assert.equal(items.length, 1, 'Should have accepted the corrected post');

    const queue = await queueStore.peek();
    assert.equal(queue.length, 1, 'Corrected item should be enqueued');
    assert.equal(queue[0].draft.title, 'Why Unfinished Tasks Stay in Mind');
  });
});

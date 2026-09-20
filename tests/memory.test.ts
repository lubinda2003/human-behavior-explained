/**
 * Content Memory Tests
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ContentMemoryStore } from '../src/pipeline/memory.js';
import { ContentItem, ContentMemoryItem } from '../src/pipeline/types.js';

describe('Content Memory Store', () => {
  const testMemoryPath = path.resolve('/tmp', 'test-content-memory-unit.json');
  let memoryStore: ContentMemoryStore;

  beforeEach(() => {
    if (fs.existsSync(testMemoryPath)) {
      fs.unlinkSync(testMemoryPath);
    }
    memoryStore = new ContentMemoryStore(testMemoryPath);
  });

  it('should initialize and load default memory', async () => {
    const memory = await memoryStore.loadMemory();
    assert.ok(Array.isArray(memory));
    assert.equal(memory.length, 0, 'New memory store should initialize clean without contamination');
  });

  it('should record new published posts into memory', async () => {
    const mockItem: ContentItem = {
      id: 'pub-test-1',
      status: 'published',
      createdAt: '2026-09-20T10:00:00.000Z',
      publishedAt: '2026-09-20T11:00:00.000Z',
      pillar: 'Brain, Memory & Perception',
      topic: 'The Stroop Effect',
      draft: {
        title: 'Why Reading Words Overrides Color Recognition',
        pillar: 'Brain, Memory & Perception',
        hook: 'Try naming the font color of the word "RED" written in blue ink.',
        bodyParagraphs: ['Paragraph 1', 'Paragraph 2'],
        coreTakeaway: 'Automated linguistic decoding precedes color feature binding.',
        sourcesCited: ['Stroop (1935), J Exp Psychol'],
        caveatNote: 'Effect diminishes with intensive practice or non-readers.',
        cta: { type: 'reflection', text: 'Test yourself on the color grid.' },
      },
      visualDecision: {
        needed: true,
        reason: 'Visual contrast makes the cognitive interference visceral.',
        template: 'comparison',
      },
      formattedText: 'Formatted Stroop post',
    };

    await memoryStore.recordPublication(mockItem);
    const updated = await memoryStore.loadMemory();
    const recorded = updated.find((m) => m.id === 'pub-test-1');

    assert.ok(recorded);
    assert.equal(recorded.title, 'Why Reading Words Overrides Color Recognition');
    assert.equal(recorded.visualUsed, true);
    assert.equal(recorded.visualTemplate, 'comparison');
    assert.equal(recorded.ctaType, 'reflection');
  });

  it('should calculate under-represented target pillar accurately', () => {
    // 35% Everyday Psych, 30% Strange Human Behavior, 20% Brain/Memory, 15% Thought Experiments
    const sampleMemory: ContentMemoryItem[] = [
      {
        id: '1',
        topic: 'T1',
        title: 'Title 1',
        pillar: 'Everyday Psychology',
        coreConcept: 'C1',
        publicationDate: '2026-09-01',
        sources: ['S1'],
        visualUsed: false,
        ctaType: 'none',
      },
      {
        id: '2',
        topic: 'T2',
        title: 'Title 2',
        pillar: 'Everyday Psychology',
        coreConcept: 'C2',
        publicationDate: '2026-09-02',
        sources: ['S2'],
        visualUsed: false,
        ctaType: 'none',
      },
      {
        id: '3',
        topic: 'T3',
        title: 'Title 3',
        pillar: 'Strange Human Behavior',
        coreConcept: 'C3',
        publicationDate: '2026-09-03',
        sources: ['S3'],
        visualUsed: false,
        ctaType: 'none',
      },
      {
        id: '4',
        topic: 'T4',
        title: 'Title 4',
        pillar: 'Strange Human Behavior',
        coreConcept: 'C4',
        publicationDate: '2026-09-04',
        sources: ['S4'],
        visualUsed: false,
        ctaType: 'none',
      },
    ];

    // Brain/Memory and Thought Experiments have 0 items!
    // Target ratio for Brain/Memory is 20%, Thought Experiments is 15%.
    // Deficit for Brain/Memory: 0.20 - 0 = 0.20.
    // Deficit for Thought Experiments: 0.15 - 0 = 0.15.
    // So Brain/Memory has the largest deficit!
    const target = memoryStore.getNextTargetPillar(sampleMemory);
    assert.equal(target, 'Brain, Memory & Perception');
  });

  it('should generate scannable summary for prompting', () => {
    const sampleMemory: ContentMemoryItem[] = [
      {
        id: '1',
        topic: 'Endowment Effect',
        title: 'Why We Overvalue Owned Items',
        pillar: 'Everyday Psychology',
        coreConcept: 'Ownership generates loss aversion.',
        publicationDate: '2026-09-01',
        sources: ['Kahneman (1990)'],
        visualUsed: false,
        ctaType: 'reflection',
      },
    ];

    const summary = memoryStore.getRecentTopicsSummary(sampleMemory);
    assert.ok(summary.includes('Endowment Effect'));
    assert.ok(summary.includes('Everyday Psychology'));
    assert.ok(summary.includes('Why We Overvalue Owned Items'));
  });
});

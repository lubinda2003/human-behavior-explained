/**
 * Topic Duplication Prevention Tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ContentMemoryStore } from '../src/pipeline/memory.js';
import { ContentMemoryItem } from '../src/pipeline/types.js';

describe('Topic Duplication Prevention', () => {
  const memoryStore = new ContentMemoryStore('/tmp/test-memory-dup.json');

  const existingMemory: ContentMemoryItem[] = [
    {
      id: 'm1',
      topic: 'The Bystander Effect (Genovese & Latane Research)',
      title: 'Why Large Crowds Are Slower to Help in Emergencies',
      pillar: 'Everyday Psychology',
      coreConcept: 'Diffusion of responsibility decreases individual intervention probability.',
      publicationDate: '2026-09-01T12:00:00.000Z',
      sources: ['Darley & Latane (1968)'],
      visualUsed: true,
      ctaType: 'reflection',
    },
    {
      id: 'm2',
      topic: 'Choice Overload (The Jam Experiment)',
      title: 'Why Having 24 Options Makes Us Buy Nothing',
      pillar: 'Everyday Psychology',
      coreConcept: 'Excess alternatives induce decision paralysis and post-decision regret.',
      publicationDate: '2026-09-02T12:00:00.000Z',
      sources: ['Iyengar & Lepper (2000)'],
      visualUsed: false,
      ctaType: 'conversation',
    },
  ];

  it('should detect exact topic match', () => {
    const result = memoryStore.isDuplicate(
      'The Bystander Effect (Genovese & Latane Research)',
      existingMemory
    );
    assert.equal(result.isDuplicate, true);
    assert.match(result.reason || '', /Exact match/);
  });

  it('should detect exact match case-insensitively with stripped punctuation', () => {
    const result = memoryStore.isDuplicate(
      'the bystander effect genovese latane research',
      existingMemory
    );
    assert.equal(result.isDuplicate, true);
  });

  it('should detect high semantic keyword overlap for rewritten versions of the same topic', () => {
    const result = memoryStore.isDuplicate(
      'Bystander Intervention and Diffusion of Responsibility in Crowds',
      existingMemory
    );
    assert.equal(result.isDuplicate, true);
    assert.match(result.reason || '', /High semantic overlap/);
  });

  it('should detect jam experiment alternative phrasing', () => {
    const result = memoryStore.isDuplicate(
      'Why 24 Choices of Jam Cause Choice Overload and Decision Paralysis',
      existingMemory
    );
    assert.equal(result.isDuplicate, true);
  });

  it('should allow genuinely novel psychological concepts', () => {
    const result = memoryStore.isDuplicate(
      'Capgras Delusion and Facial Emotional Recognition in Neural Pathways',
      existingMemory
    );
    assert.equal(result.isDuplicate, false);
  });

  it('should allow another distinct memory phenomenon', () => {
    const result = memoryStore.isDuplicate(
      'The Baker-Baker Paradox in Semantic Recall',
      existingMemory
    );
    assert.equal(result.isDuplicate, false);
  });
});

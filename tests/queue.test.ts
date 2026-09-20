/**
 * Content Queue Tests
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ContentQueueStore } from '../src/pipeline/queue.js';
import { ContentItem } from '../src/pipeline/types.js';

describe('Content Queue Store', () => {
  const testQueuePath = path.resolve('/tmp', 'test-content-queue.json');
  let queueStore: ContentQueueStore;

  const mockItem1: ContentItem = {
    id: 'test-item-1',
    status: 'queued',
    createdAt: '2026-09-20T10:00:00.000Z',
    pillar: 'Everyday Psychology',
    topic: 'The Endowment Effect',
    draft: {
      title: 'Why We Overvalue What We Already Own',
      pillar: 'Everyday Psychology',
      hook: 'Hand someone a coffee mug for five minutes, and they value it twice as high.',
      bodyParagraphs: ['Paragraph 1', 'Paragraph 2'],
      coreTakeaway: 'Loss aversion makes giving up an item feel like an unacceptable loss.',
      sourcesCited: ['Kahneman, Knetsch & Thaler (1990)'],
      caveatNote: 'Does not apply to items purchased specifically for trade.',
      cta: { type: 'none' },
    },
    visualDecision: { needed: false, reason: 'Text is self-sufficient' },
    formattedText: 'Formatted text content',
  };

  const mockItem2: ContentItem = {
    ...mockItem1,
    id: 'test-item-2',
    topic: 'Anchoring Heuristic',
    draft: {
      ...mockItem1.draft,
      title: 'How Random Numbers Dictate Our Valuations',
    },
  };

  beforeEach(() => {
    if (fs.existsSync(testQueuePath)) {
      fs.unlinkSync(testQueuePath);
    }
    queueStore = new ContentQueueStore(testQueuePath);
  });

  it('should initialize an empty queue', async () => {
    const items = await queueStore.peek();
    assert.equal(items.length, 0);
  });

  it('should enqueue items and maintain FIFO ordering', async () => {
    await queueStore.enqueue(mockItem1);
    await queueStore.enqueue(mockItem2);

    const peeked = await queueStore.peek();
    assert.equal(peeked.length, 2);
    assert.equal(peeked[0].id, 'test-item-1');
    assert.equal(peeked[1].id, 'test-item-2');
  });

  it('should not add duplicate IDs to the queue', async () => {
    await queueStore.enqueue(mockItem1);
    await queueStore.enqueue(mockItem1);

    const count = await queueStore.count();
    assert.equal(count, 1);
  });

  it('should dequeue the next pending item in FIFO order', async () => {
    await queueStore.enqueue(mockItem1);
    await queueStore.enqueue(mockItem2);

    const nextItem = await queueStore.dequeueNext();
    assert.ok(nextItem);
    assert.equal(nextItem.id, 'test-item-1');

    const remaining = await queueStore.peek();
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].id, 'test-item-2');
  });

  it('should return null when dequeuing from an empty queue', async () => {
    const nextItem = await queueStore.dequeueNext();
    assert.equal(nextItem, null);
  });

  it('should remove items by ID', async () => {
    await queueStore.enqueue(mockItem1);
    await queueStore.enqueue(mockItem2);

    const removed = await queueStore.remove('test-item-1');
    assert.equal(removed, true);

    const remaining = await queueStore.peek();
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].id, 'test-item-2');
  });
});

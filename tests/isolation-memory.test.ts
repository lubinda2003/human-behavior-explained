/**
 * Publication Memory Isolation & Duplicate Prevention Tests
 * Ensures dry-runs, tests, generated-only items, and failures NEVER contaminate publication memory.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PipelineCoordinator } from '../src/pipeline/coordinator.js';
import { GeminiContentEngine } from '../src/pipeline/gemini.js';
import { ContentMemoryStore } from '../src/pipeline/memory.js';
import { ContentQueueStore } from '../src/pipeline/queue.js';
import { TelegramPublisher } from '../src/pipeline/telegram.js';
import { ContentItem, TopicCandidate } from '../src/pipeline/types.js';

describe('Publication Memory Isolation', () => {
  const testQueuePath = path.resolve('/tmp', 'test-isolation-queue.json');
  const testMemoryPath = path.resolve('/tmp', 'test-isolation-memory.json');
  let queueStore: ContentQueueStore;
  let memoryStore: ContentMemoryStore;

  beforeEach(() => {
    if (fs.existsSync(testQueuePath)) fs.unlinkSync(testQueuePath);
    if (fs.existsSync(testMemoryPath)) fs.unlinkSync(testMemoryPath);
    queueStore = new ContentQueueStore(testQueuePath);
    memoryStore = new ContentMemoryStore(testMemoryPath);
  });

  it('generating posts should enqueue items but NEVER record to publication memory', async () => {
    const coordinator = new PipelineCoordinator({
      queueStore,
      memoryStore,
    });

    const items = await coordinator.generatePosts({ count: 2 });
    assert.equal(items.length, 2);

    const queue = await queueStore.peek();
    assert.equal(queue.length, 2, 'Queue should have 2 items');

    const memory = await memoryStore.loadMemory();
    assert.equal(memory.length, 0, 'Generated-only posts must NEVER be recorded into publication memory');
  });

  it('dry-run publication should simulate success but NEVER record to publication memory', async () => {
    const coordinator = new PipelineCoordinator({
      queueStore,
      memoryStore,
    });

    // Generate 1 post
    await coordinator.generatePosts({ count: 1 });

    // Dry-run publish
    const pubResult = await coordinator.publishNext({ dryRun: true });
    assert.equal(pubResult.success, true);
    assert.ok(pubResult.result?.dryRun);

    const memory = await memoryStore.loadMemory();
    assert.equal(
      memory.length,
      0,
      'Dry-run publication must NEVER record to publication memory'
    );

    // Ensure item was not permanently removed from queue by dry run
    const queue = await queueStore.peek();
    assert.equal(queue.length, 1, 'Dry run should preserve item in queue for real publication');
  });

  it('failed Telegram publication should return item to queue and NOT record to memory', async () => {
    class FailingPublisher extends TelegramPublisher {
      public override async publish(): Promise<{ success: boolean; error?: string }> {
        return { success: false, error: 'Telegram API 400: Bad Request' };
      }
    }

    const coordinator = new PipelineCoordinator({
      queueStore,
      memoryStore,
      telegramPublisher: new FailingPublisher('fake_token', 'fake_chat'),
    });

    await coordinator.generatePosts({ count: 1 });

    const pubResult = await coordinator.publishNext();
    assert.equal(pubResult.success, false);

    const memory = await memoryStore.loadMemory();
    assert.equal(memory.length, 0, 'Failed publication must NOT be recorded in memory');

    const rawQueue = await queueStore.loadQueue();
    assert.equal(rawQueue.length, 1, 'Failed item must be retained in queue store');
    assert.equal(rawQueue[0].status, 'failed');
    assert.ok(rawQueue[0].failureReason?.includes('Telegram API 400'));
  });

  it('successful publication should record publication memory accurately', async () => {
    class SuccessfulPublisher extends TelegramPublisher {
      public override async publish(): Promise<{ success: boolean; messageId: number; dryRun: boolean }> {
        return { success: true, messageId: 998877, dryRun: false };
      }
    }

    const coordinator = new PipelineCoordinator({
      queueStore,
      memoryStore,
      telegramPublisher: new SuccessfulPublisher('token', 'chat'),
    });

    await coordinator.generatePosts({ count: 1 });

    const pubResult = await coordinator.publishNext();
    assert.equal(pubResult.success, true);

    const memory = await memoryStore.loadMemory();
    assert.equal(memory.length, 1, 'Confirmed publication must be recorded in memory');
    assert.equal(memory[0].title, pubResult.item?.draft.title);
    assert.equal(memory[0].topic, pubResult.item?.topic);
    assert.equal(memory[0].pillar, pubResult.item?.pillar);
  });

  it('duplicate prevention should halt rather than publishing a duplicate if no unique topic can be found', async () => {
    // Engine that persistently returns a duplicate topic regardless of exclusions
    class PersistentDuplicateEngine extends GeminiContentEngine {
      public override async selectTopic(): Promise<TopicCandidate> {
        return {
          topic: 'Ironic Process Theory (The White Bear Problem)',
          pillar: 'Everyday Psychology',
          coreQuestion: 'Why does trying to suppress a thought make it rebound?',
          rationale: 'Always returns the same duplicate topic',
        };
      }
    }

    // Pre-populate memory with the topic
    const preItem: ContentItem = {
      id: 'pre-1',
      status: 'published',
      createdAt: '2026-09-01T00:00:00Z',
      publishedAt: '2026-09-01T00:00:00Z',
      pillar: 'Everyday Psychology',
      topic: 'Ironic Process Theory (The White Bear Problem)',
      draft: {
        title: 'Why Trying Not to Think Guarantees You Will',
        pillar: 'Everyday Psychology',
        hook: 'Hook',
        bodyParagraphs: ['P1', 'P2'],
        coreTakeaway: 'Takeaway',
        sourcesCited: ['Wegner (1987)'],
        caveatNote: 'Caveat note boundary condition',
        cta: { type: 'reflection', text: 'CTA' },
      },
      visualDecision: { needed: false, reason: 'Text only' },
      formattedText: 'text',
    };
    await memoryStore.recordPublication(preItem);

    const coordinator = new PipelineCoordinator({
      queueStore,
      memoryStore,
      geminiEngine: new PersistentDuplicateEngine(''),
    });

    // Forced topic that is already in memory and engine keeps returning it
    await assert.rejects(
      async () => {
        await coordinator.generatePosts();
      },
      /Halting generation to prevent duplicate publication/,
      'Should reject duplicate topic and fail rather than publishing'
    );
  });
});

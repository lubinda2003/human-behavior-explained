import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import { createMockD1Database } from './mock-d1';
import { SCHEMA_STATEMENTS } from '../src/store/schema';
import {
  D1InteractionRepository,
  MockTelegramClient,
  InteractionPlanner,
  TelegramInteractionPublisher,
  type PostRecord,
} from '../src/interactions';

describe('Phase 5A.1: Production Publishing Reliability & Idempotency', () => {
  let db: D1Database;
  let repo: D1InteractionRepository;
  let telegram: MockTelegramClient;
  let planner: InteractionPlanner;
  let publisher: TelegramInteractionPublisher;

  const CHANNEL_ID = '@pickyourfate_test';

  beforeEach(async () => {
    db = createMockD1Database();
    for (const sql of SCHEMA_STATEMENTS) {
      await db.prepare(sql).run();
    }

    repo = new D1InteractionRepository(db);
    telegram = new MockTelegramClient();
    planner = new InteractionPlanner(CHANNEL_ID);
    publisher = new TelegramInteractionPublisher(repo, telegram);
  });

  const samplePollPost: PostRecord = {
    id: 'post_arctic_crisis_001',
    contentType: 'impossible_dilemma',
    category: 'survival',
    tone: 'tense',
    stakes: 'life_or_death',
    layout: 'standard',
    hookStyle: 'direct_question',
    title: 'The Arctic Sensor Whiteout',
    status: 'draft',
    payload: {
      title: 'The Arctic Sensor Whiteout',
      hook: 'The thermal generators stall in a -40°C blizzard.',
      setup: 'Two engineers must choose whether to reroute battery power or clear the intake.',
    },
    createdAt: new Date().toISOString(),
  };

  const sampleFormattedText = '<b>The Arctic Sensor Whiteout</b>\n\nThe thermal generators stall...';

  // --------------------------------------------------------------------------
  // A. NORMAL PUBLISH
  // --------------------------------------------------------------------------
  it('A. NORMAL PUBLISH: successfully publishes valid interaction through full lifecycle', async () => {
    const plan = planner.plan({
      id: samplePollPost.id,
      title: samplePollPost.title,
      contentType: 'impossible_dilemma',
      choices: [
        { label: 'Reroute Power', tradeOff: 'Depletes batteries', description: 'Immediate heat' },
        { label: 'Clear Intake', tradeOff: 'Frostbite risk', description: 'Venture outside' },
      ],
      pollQuestion: 'Which tactical move do you execute?',
    });

    const result = await publisher.publishInteraction({
      post: samplePollPost,
      plan,
      formattedText: sampleFormattedText,
    });

    // Assert expected return IDs
    assert.equal(result.postId, samplePollPost.id);
    assert.equal(result.interactionId, `int_${samplePollPost.id}`);
    assert.ok(result.telegramMessageId);
    assert.ok(result.telegramPollId);
    assert.ok(result.telegramPollMessageId);

    // Assert Telegram calls: exactly 1 narrative message and 1 attached poll
    assert.equal(telegram.history.messages.length, 1);
    assert.equal(telegram.history.polls.length, 1);
    assert.equal(telegram.history.polls[0].reply_to_message_id, result.telegramMessageId);

    // Assert D1 state: Post is published with telegram IDs recorded
    const postInDb = await repo.getPost(samplePollPost.id);
    assert.ok(postInDb);
    assert.equal(postInDb.status, 'published');
    assert.equal(postInDb.telegramMessageId, result.telegramMessageId);
    assert.equal(postInDb.telegramPollMessageId, result.telegramPollMessageId);

    // Assert D1 state: Interaction is OPEN
    const interactionInDb = await repo.getInteraction(result.interactionId);
    assert.ok(interactionInDb);
    assert.equal(interactionInDb.lifecycleState, 'OPEN');
    assert.equal(interactionInDb.mainMessageId, result.telegramMessageId);

    // Assert published_messages in D1
    const pubMsgs = await repo.getPublishedMessagesForPost(samplePollPost.id);
    assert.equal(pubMsgs.length, 2);
    assert.ok(pubMsgs.some((m) => m.messageType === 'main_post'));
    assert.ok(pubMsgs.some((m) => m.messageType === 'native_poll'));

    // Assert poll in D1
    const pollInDb = await repo.getPollByInteractionId(result.interactionId);
    assert.ok(pollInDb);
    assert.equal(pollInDb.telegramPollId, result.telegramPollId);
  });

  // --------------------------------------------------------------------------
  // B. MAIN MESSAGE PARTIAL FAILURE
  // --------------------------------------------------------------------------
  it('B. MAIN MESSAGE PARTIAL FAILURE: records partial progress, surfaces error, and does not claim published', async () => {
    const plan = planner.plan({
      id: samplePollPost.id,
      title: samplePollPost.title,
      contentType: 'impossible_dilemma',
      choices: [
        { label: 'Option A', tradeOff: 'Cost A' },
        { label: 'Option B', tradeOff: 'Cost B' },
      ],
      pollQuestion: 'Which option?',
    });

    // Simulate: sendMessage succeeds, but sendPoll fails on Telegram
    telegram.sendPoll = async () => {
      throw new Error('Telegram HTTP 502: Bad Gateway on sendPoll');
    };

    await assert.rejects(
      async () => {
        await publisher.publishInteraction({
          post: samplePollPost,
          plan,
          formattedText: sampleFormattedText,
        });
      },
      (err: Error) => {
        assert.ok(err.message.includes('Telegram HTTP 502'));
        return true;
      },
    );

    // Verify Telegram call history: main message sent, poll failed
    assert.equal(telegram.history.messages.length, 1);
    const pubMsgs = await repo.getPublishedMessagesForPost(samplePollPost.id);
    assert.equal(pubMsgs.length, 1);
    const sentMainMessageId = pubMsgs[0].telegramMessageId;
    assert.ok(sentMainMessageId);

    // Verify D1 state: MUST NOT be claimed as published or OPEN
    const postInDb = await repo.getPost(samplePollPost.id);
    assert.ok(postInDb);
    assert.notEqual(postInDb.status, 'published');
    assert.equal(postInDb.status, 'partially_published');
    assert.equal(postInDb.telegramMessageId, sentMainMessageId);

    const interactionInDb = await repo.getInteraction(`int_${samplePollPost.id}`);
    assert.ok(interactionInDb);
    assert.notEqual(interactionInDb.lifecycleState, 'OPEN');
    assert.notEqual(interactionInDb.lifecycleState, 'PUBLISHED');
    assert.equal(interactionInDb.lifecycleState, 'PARTIALLY_PUBLISHED');
    assert.equal(interactionInDb.mainMessageId, sentMainMessageId);

    // Verify main message record is safely retained for recovery
    assert.equal(pubMsgs[0].messageType, 'main_post');
    assert.equal(pubMsgs[0].messageType, 'main_post');
    assert.equal(pubMsgs[0].telegramMessageId, sentMainMessageId);
  });

  // --------------------------------------------------------------------------
  // C. RETRY AFTER PARTIAL SUCCESS
  // --------------------------------------------------------------------------
  it('C. RETRY AFTER PARTIAL SUCCESS: reuses existing main message ID and does not duplicate main message', async () => {
    const plan = planner.plan({
      id: samplePollPost.id,
      title: samplePollPost.title,
      contentType: 'impossible_dilemma',
      choices: [
        { label: 'Option A', tradeOff: 'Cost A' },
        { label: 'Option B', tradeOff: 'Cost B' },
      ],
      pollQuestion: 'Which option?',
    });

    // 1. First attempt fails on sendPoll
    const originalSendPoll = telegram.sendPoll.bind(telegram);
    telegram.sendPoll = async () => {
      throw new Error('Telegram network timeout on sendPoll');
    };
    await assert.rejects(async () => {
      await publisher.publishInteraction({
        post: samplePollPost,
        plan,
        formattedText: sampleFormattedText,
      });
    });

    // Initial state after failure: 1 message sent
    assert.equal(telegram.history.messages.length, 1);
    const pubMsgsBeforeRetry = await repo.getPublishedMessagesForPost(samplePollPost.id);
    assert.equal(pubMsgsBeforeRetry.length, 1);
    const recordedMainMsgId = pubMsgsBeforeRetry[0].telegramMessageId;
    assert.ok(recordedMainMsgId);

    // Reset history tracking and restore sendPoll to measure the second attempt cleanly
    telegram.reset();
    telegram.sendPoll = originalSendPoll;

    // 2. Second attempt (retry)
    const result = await publisher.publishInteraction({
      post: samplePollPost,
      plan,
      formattedText: sampleFormattedText,
    });

    // In the retry:
    // - sendMessage MUST NOT be called again (0 messages)
    // - sendPoll MUST be called (1 poll)
    assert.equal(telegram.history.messages.length, 0, 'Main message must NOT be re-sent on retry');
    assert.equal(telegram.history.polls.length, 1, 'Poll must be dispatched on retry');
    assert.equal(result.telegramMessageId, recordedMainMsgId, 'Reused recorded mainMessageId');
    assert.equal(telegram.history.polls[0].reply_to_message_id, recordedMainMsgId);

    // D1 is now fully PUBLISHED and OPEN
    const postInDb = await repo.getPost(samplePollPost.id);
    assert.ok(postInDb);
    assert.equal(postInDb.status, 'published');
    assert.equal(postInDb.telegramMessageId, recordedMainMsgId);
    assert.ok(postInDb.telegramPollMessageId);

    const interactionInDb = await repo.getInteraction(`int_${samplePollPost.id}`);
    assert.ok(interactionInDb);
    assert.equal(interactionInDb.lifecycleState, 'OPEN');

    // Exactly 2 published messages (main_post + native_poll) — no duplicates!
    const pubMsgs = await repo.getPublishedMessagesForPost(samplePollPost.id);
    assert.equal(pubMsgs.length, 2);
  });

  // --------------------------------------------------------------------------
  // D. ALREADY PUBLISHED
  // --------------------------------------------------------------------------
  it('D. ALREADY PUBLISHED: republishing an already published interaction is fully idempotent', async () => {
    const plan = planner.plan({
      id: samplePollPost.id,
      title: samplePollPost.title,
      contentType: 'impossible_dilemma',
      choices: [
        { label: 'Option A', tradeOff: 'Cost A' },
        { label: 'Option B', tradeOff: 'Cost B' },
      ],
      pollQuestion: 'Which option?',
    });

    // First publish succeeds
    const firstResult = await publisher.publishInteraction({
      post: samplePollPost,
      plan,
      formattedText: sampleFormattedText,
    });

    assert.equal(telegram.history.messages.length, 1);
    assert.equal(telegram.history.polls.length, 1);

    // Clear history to inspect subsequent idempotent call
    telegram.reset();

    // Second publish call with same interaction
    const secondResult = await publisher.publishInteraction({
      post: samplePollPost,
      plan,
      formattedText: sampleFormattedText,
    });

    // Zero Telegram calls on second invocation
    assert.equal(telegram.history.messages.length, 0, 'Must NOT call sendMessage on already-published post');
    assert.equal(telegram.history.polls.length, 0, 'Must NOT call sendPoll on already-published post');

    // Returns identical recorded result
    assert.equal(secondResult.postId, firstResult.postId);
    assert.equal(secondResult.interactionId, firstResult.interactionId);
    assert.equal(secondResult.telegramMessageId, firstResult.telegramMessageId);
    assert.equal(secondResult.telegramPollId, firstResult.telegramPollId);
    assert.equal(secondResult.telegramPollMessageId, firstResult.telegramPollMessageId);

    // No duplicate records in D1
    const pubMsgs = await repo.getPublishedMessagesForPost(samplePollPost.id);
    assert.equal(pubMsgs.length, 2);
  });

  // --------------------------------------------------------------------------
  // E. D1 FAILURE AFTER TELEGRAM SUCCESS
  // --------------------------------------------------------------------------
  it('E. D1 FAILURE AFTER TELEGRAM SUCCESS: surfaces failure, does not claim OPEN, and preserves recoverable state', async () => {
    const plan = planner.plan({
      id: samplePollPost.id,
      title: samplePollPost.title,
      contentType: 'impossible_dilemma',
      choices: [
        { label: 'Option A', tradeOff: 'Cost A' },
        { label: 'Option B', tradeOff: 'Cost B' },
      ],
      pollQuestion: 'Which option?',
    });

    // Mock repo.createPoll to throw a simulated D1 write failure
    const originalCreatePoll = repo.createPoll.bind(repo);
    (repo as any).createPoll = async () => {
      throw new Error('D1 database disk I/O write error during poll creation');
    };

    // Assert publisher surfaces the D1 failure
    await assert.rejects(
      async () => {
        await publisher.publishInteraction({
          post: samplePollPost,
          plan,
          formattedText: sampleFormattedText,
        });
      },
      (err: Error) => {
        assert.ok(err.message.includes('D1 database disk I/O write error'));
        return true;
      },
    );

    // Verify: Interaction MUST NOT be marked OPEN or PUBLISHED
    const interactionInDb = await repo.getInteraction(`int_${samplePollPost.id}`);
    assert.ok(interactionInDb);
    assert.notEqual(interactionInDb.lifecycleState, 'OPEN');
    assert.notEqual(interactionInDb.lifecycleState, 'PUBLISHED');

    // Verify: Post MUST NOT be marked published
    const postInDb = await repo.getPost(samplePollPost.id);
    assert.ok(postInDb);
    assert.notEqual(postInDb.status, 'published');

    // Restore createPoll to verify retry remains possible
    (repo as any).createPoll = originalCreatePoll;

    // Retry should now proceed to completion
    telegram.reset();
    const retryResult = await publisher.publishInteraction({
      post: samplePollPost,
      plan,
      formattedText: sampleFormattedText,
    });

    assert.ok(retryResult.telegramMessageId);
    assert.ok(retryResult.telegramPollId);

    const healedPost = await repo.getPost(samplePollPost.id);
    assert.equal(healedPost?.status, 'published');
    const healedInteraction = await repo.getInteraction(`int_${samplePollPost.id}`);
    assert.equal(healedInteraction?.lifecycleState, 'OPEN');
  });

  // --------------------------------------------------------------------------
  // Discussion / Non-Poll Idempotency
  // --------------------------------------------------------------------------
  it('Discussion Publish: handles idempotent republishing for open_discussion format', async () => {
    const discussionPost: PostRecord = {
      ...samplePollPost,
      id: 'post_discussion_001',
      contentType: 'mini_mystery',
    };

    const plan = planner.plan({
      id: discussionPost.id,
      title: discussionPost.title,
      contentType: 'mini_mystery',
      discussionPrompt: 'Who cracked the security protocol?',
    });

    // First publish succeeds
    const firstResult = await publisher.publishInteraction({
      post: discussionPost,
      plan,
      formattedText: '<b>Mini Mystery: The Vault</b>',
    });

    assert.equal(telegram.history.messages.length, 1);
    assert.equal(firstResult.telegramPollId, undefined);

    // Second publish call with same interaction
    telegram.reset();
    const secondResult = await publisher.publishInteraction({
      post: discussionPost,
      plan,
      formattedText: '<b>Mini Mystery: The Vault</b>',
    });

    assert.equal(telegram.history.messages.length, 0, 'No Telegram messages sent on republish');
    assert.equal(secondResult.telegramMessageId, firstResult.telegramMessageId);
  });
});

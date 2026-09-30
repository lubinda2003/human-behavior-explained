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

describe('Phase 5A.2: Publish Failure Recovery & Reconciliation Test Suite', () => {
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
    id: 'post_recovery_001',
    contentType: 'impossible_dilemma',
    category: 'survival',
    tone: 'tense',
    stakes: 'life_or_death',
    layout: 'standard',
    hookStyle: 'direct_question',
    title: 'The Polar Reactor Breach',
    status: 'draft',
    payload: {
      title: 'The Polar Reactor Breach',
      hook: 'The coolant valves freeze shut at -50°C.',
      setup: 'Two technicians must vent radiation to the atmosphere or risk core meltdown.',
    },
    createdAt: new Date().toISOString(),
  };

  const sampleFormattedText = '<b>The Polar Reactor Breach</b>\n\nThe coolant valves freeze shut...';

  // --------------------------------------------------------------------------
  // A. Normal publish → retry
  // Expected: no duplicate Telegram components.
  // --------------------------------------------------------------------------
  it('A. Normal publish -> retry: completely idempotent with 0 duplicate Telegram messages or polls', async () => {
    const plan = planner.plan({
      id: samplePollPost.id,
      title: samplePollPost.title,
      contentType: 'impossible_dilemma',
      choices: [
        { label: 'Vent Gas', tradeOff: 'Irradiate valley' },
        { label: 'Seal Core', tradeOff: 'Risk containment rupture' },
      ],
      pollQuestion: 'Which protocol do you authorize?',
    });

    // Attempt 1: Normal publish
    const firstResult = await publisher.publishInteraction({
      post: samplePollPost,
      plan,
      formattedText: sampleFormattedText,
    });

    assert.equal(telegram.history.messages.length, 1);
    assert.equal(telegram.history.polls.length, 1);

    // Reset history to inspect subsequent retry
    telegram.reset();

    // Attempt 2: Retry of already published interaction
    const secondResult = await publisher.publishInteraction({
      post: samplePollPost,
      plan,
      formattedText: sampleFormattedText,
    });

    // Zero Telegram calls on retry
    assert.equal(telegram.history.messages.length, 0, 'No Telegram messages must be re-sent on retry');
    assert.equal(telegram.history.polls.length, 0, 'No Telegram polls must be re-sent on retry');

    // Result IDs identical
    assert.equal(secondResult.postId, firstResult.postId);
    assert.equal(secondResult.interactionId, firstResult.interactionId);
    assert.equal(secondResult.telegramMessageId, firstResult.telegramMessageId);
    assert.equal(secondResult.telegramPollId, firstResult.telegramPollId);
    assert.equal(secondResult.telegramPollMessageId, firstResult.telegramPollMessageId);
  });

  // --------------------------------------------------------------------------
  // B. Main message succeeds → D1 persistence fails → retry
  // Expected: retry reconciles safely and does not blindly duplicate the already-successful component.
  // --------------------------------------------------------------------------
  it('B. Main message succeeds -> D1 persistence fails -> retry: reconciles existing message without duplicate', async () => {
    const plan = planner.plan({
      id: samplePollPost.id,
      title: samplePollPost.title,
      contentType: 'impossible_dilemma',
      choices: [
        { label: 'Vent Gas', tradeOff: 'Irradiate valley' },
        { label: 'Seal Core', tradeOff: 'Risk containment rupture' },
      ],
      pollQuestion: 'Which protocol do you authorize?',
    });

    // Force D1 failure when writing published_messages for main message
    const originalCreatePubMsg = repo.createPublishedMessage.bind(repo);
    let pubMsgCallCount = 0;
    (repo as any).createPublishedMessage = async (msg: any) => {
      pubMsgCallCount++;
      if (pubMsgCallCount === 1) {
        throw new Error('D1 Disk write error during main message published_messages insert');
      }
      return originalCreatePubMsg(msg);
    };

    // First attempt fails during D1 write, but AFTER telegram.sendMessage succeeded
    await assert.rejects(
      async () => {
        await publisher.publishInteraction({
          post: samplePollPost,
          plan,
          formattedText: sampleFormattedText,
        });
      },
      (err: Error) => {
        assert.ok(err.message.includes('D1 Disk write error'));
        return true;
      },
    );

    // Telegram sent the main message
    assert.equal(telegram.history.messages.length, 1);
    const sentMainMsgId = telegram.history.messages[0].id;
    assert.ok(sentMainMsgId);

    // Verify D1 emergency catch preserved the mainMessageId on post
    const postAfterFail = await repo.getPost(samplePollPost.id);
    assert.ok(postAfterFail);
    assert.equal(postAfterFail.telegramMessageId, sentMainMsgId);
    assert.equal(postAfterFail.status, 'partially_published');

    // Reset telegram history to monitor retry
    telegram.reset();

    // Second attempt (retry): D1 write is now healthy
    const retryResult = await publisher.publishInteraction({
      post: samplePollPost,
      plan,
      formattedText: sampleFormattedText,
    });

    // In retry:
    // - sendMessage MUST NOT be called again (0 messages)
    // - sendPoll MUST be called with reply_to_message_id matching the sent main message
    assert.equal(telegram.history.messages.length, 0, 'Main message must NOT be re-sent on retry');
    assert.equal(telegram.history.polls.length, 1, 'Poll must be sent attached to existing main message');
    assert.equal(telegram.history.polls[0].reply_to_message_id, sentMainMsgId);

    // Final state is fully published and OPEN
    assert.equal(retryResult.telegramMessageId, sentMainMsgId);
    const postFinal = await repo.getPost(samplePollPost.id);
    assert.equal(postFinal?.status, 'published');
    const interactionFinal = await repo.getInteraction(`int_${samplePollPost.id}`);
    assert.equal(interactionFinal?.lifecycleState, 'OPEN');
  });

  // --------------------------------------------------------------------------
  // C. Poll succeeds → D1 persistence fails → retry
  // Expected: same principle; no false assumption that missing D1 means Telegram definitely failed.
  // --------------------------------------------------------------------------
  it('C. Poll succeeds -> D1 persistence fails -> retry: retains poll ID and does not duplicate poll on retry', async () => {
    const plan = planner.plan({
      id: samplePollPost.id,
      title: samplePollPost.title,
      contentType: 'impossible_dilemma',
      choices: [
        { label: 'Vent Gas', tradeOff: 'Irradiate valley' },
        { label: 'Seal Core', tradeOff: 'Risk containment rupture' },
      ],
      pollQuestion: 'Which protocol do you authorize?',
    });

    // Mock createPoll to throw D1 error on first attempt
    const originalCreatePoll = repo.createPoll.bind(repo);
    let createPollCalls = 0;
    (repo as any).createPoll = async (poll: any, options: any) => {
      createPollCalls++;
      if (createPollCalls === 1) {
        throw new Error('D1 Disk write error during createPoll insert');
      }
      return originalCreatePoll(poll, options);
    };

    // First attempt fails during D1 createPoll
    await assert.rejects(
      async () => {
        await publisher.publishInteraction({
          post: samplePollPost,
          plan,
          formattedText: sampleFormattedText,
        });
      },
      (err: Error) => {
        assert.ok(err.message.includes('D1 Disk write error during createPoll insert'));
        return true;
      },
    );

    // Both Telegram calls succeeded in attempt 1
    assert.equal(telegram.history.messages.length, 1);
    assert.equal(telegram.history.polls.length, 1);
    const originalPollMsgId = telegram.history.polls[0].id;
    assert.ok(originalPollMsgId);

    // Verify D1 emergency catch preserved the telegramPollMessageId on post
    const postAfterFail = await repo.getPost(samplePollPost.id);
    assert.ok(postAfterFail);
    assert.equal(postAfterFail.telegramPollMessageId, originalPollMsgId);
    assert.equal(postAfterFail.status, 'partially_published');

    // Reset Telegram tracking for retry
    telegram.reset();

    // Second attempt (retry)
    const retryResult = await publisher.publishInteraction({
      post: samplePollPost,
      plan,
      formattedText: sampleFormattedText,
    });

    // In retry:
    // - NEITHER sendMessage NOR sendPoll should be called!
    assert.equal(telegram.history.messages.length, 0, 'No main message re-send');
    assert.equal(telegram.history.polls.length, 0, 'No poll re-send (reused existing pollMessageId)');

    // Result matches
    assert.equal(retryResult.telegramPollMessageId, originalPollMsgId);
    const postFinal = await repo.getPost(samplePollPost.id);
    assert.equal(postFinal?.status, 'published');
    const interactionFinal = await repo.getInteraction(`int_${samplePollPost.id}`);
    assert.equal(interactionFinal?.lifecycleState, 'OPEN');
  });

  // --------------------------------------------------------------------------
  // D. Interaction left in PUBLISHING → recovery
  // Expected: only missing components are published.
  // --------------------------------------------------------------------------
  it('D. Interaction left in PUBLISHING -> recovery: publishes only missing components', async () => {
    const plan = planner.plan({
      id: samplePollPost.id,
      title: samplePollPost.title,
      contentType: 'impossible_dilemma',
      choices: [
        { label: 'Vent Gas', tradeOff: 'Irradiate valley' },
        { label: 'Seal Core', tradeOff: 'Risk containment rupture' },
      ],
      pollQuestion: 'Which protocol do you authorize?',
    });

    // Simulate an interrupted execution where main message was published and stored,
    // but the worker process halted while interaction was in PUBLISHING before sending the poll.
    const nowIso = new Date().toISOString();
    await repo.createPost({
      ...samplePollPost,
      status: 'partially_published',
      telegramMessageId: 1001,
    });

    await repo.createInteraction({
      id: `int_${samplePollPost.id}`,
      postId: samplePollPost.id,
      interactionType: 'poll',
      lifecycleState: 'PARTIALLY_PUBLISHED',
      closeStrategy: 'scheduled',
      targetChatId: CHANNEL_ID,
      mainMessageId: 1001,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    await repo.createPublishedMessage({
      id: `msg_${samplePollPost.id}_main`,
      postId: samplePollPost.id,
      telegramMessageId: 1001,
      telegramChatId: CHANNEL_ID,
      messageType: 'main_post',
      parseMode: 'HTML',
      textContent: sampleFormattedText,
      publishedAt: nowIso,
    });

    // Run recovery publish
    const result = await publisher.publishInteraction({
      post: samplePollPost,
      plan,
      formattedText: sampleFormattedText,
    });

    // ONLY the poll was sent to Telegram (0 new main messages, 1 poll)
    assert.equal(telegram.history.messages.length, 0, 'Main message was already published; must NOT be re-sent');
    assert.equal(telegram.history.polls.length, 1, 'Only missing poll is published');
    assert.equal(telegram.history.polls[0].reply_to_message_id, 1001);

    // Lifecycle successfully completed to OPEN
    assert.equal(result.telegramMessageId, 1001);
    assert.ok(result.telegramPollId);
    const interactionInDb = await repo.getInteraction(`int_${samplePollPost.id}`);
    assert.equal(interactionInDb?.lifecycleState, 'OPEN');
  });

  // --------------------------------------------------------------------------
  // E. Stale PUBLISHING → retry
  // Expected: safe recovery.
  // --------------------------------------------------------------------------
  it('E. Stale PUBLISHING -> retry: recovers abandoned publishing attempt after timeout threshold', async () => {
    const plan = planner.plan({
      id: samplePollPost.id,
      title: samplePollPost.title,
      contentType: 'impossible_dilemma',
      choices: [
        { label: 'Vent Gas', tradeOff: 'Irradiate valley' },
        { label: 'Seal Core', tradeOff: 'Risk containment rupture' },
      ],
      pollQuestion: 'Which protocol do you authorize?',
    });

    // Simulate an abandoned attempt from 10 minutes ago
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    await repo.createPost({
      ...samplePollPost,
      status: 'publishing',
      createdAt: tenMinutesAgo,
      updatedAt: tenMinutesAgo,
    });

    await repo.createInteraction({
      id: `int_${samplePollPost.id}`,
      postId: samplePollPost.id,
      interactionType: 'poll',
      lifecycleState: 'PUBLISHING',
      closeStrategy: 'scheduled',
      targetChatId: CHANNEL_ID,
      createdAt: tenMinutesAgo,
      updatedAt: tenMinutesAgo,
    });

    // Recovery runs (stale lease check recognizes 10 minutes > 5 minutes threshold)
    const result = await publisher.publishInteraction({
      post: samplePollPost,
      plan,
      formattedText: sampleFormattedText,
    });

    assert.ok(result.telegramMessageId);
    assert.ok(result.telegramPollId);

    // Entire post is cleanly published and OPEN
    const interactionInDb = await repo.getInteraction(`int_${samplePollPost.id}`);
    assert.equal(interactionInDb?.lifecycleState, 'OPEN');
    const postInDb = await repo.getPost(samplePollPost.id);
    assert.equal(postInDb?.status, 'published');
  });

  // --------------------------------------------------------------------------
  // F. Two concurrent publish attempts
  // Expected: repository/lifecycle safeguards prevent unsafe duplicate logical publishing.
  // --------------------------------------------------------------------------
  it('F. Two concurrent publish attempts: blocks second worker from trampling active publishing lease', async () => {
    const plan = planner.plan({
      id: samplePollPost.id,
      title: samplePollPost.title,
      contentType: 'impossible_dilemma',
      choices: [
        { label: 'Vent Gas', tradeOff: 'Irradiate valley' },
        { label: 'Seal Core', tradeOff: 'Risk containment rupture' },
      ],
      pollQuestion: 'Which protocol do you authorize?',
    });

    // Create interaction in DRAFT
    const nowIso = new Date().toISOString();
    await repo.createPost({
      ...samplePollPost,
      status: 'draft',
      createdAt: nowIso,
    });
    await repo.createInteraction({
      id: `int_${samplePollPost.id}`,
      postId: samplePollPost.id,
      interactionType: 'poll',
      lifecycleState: 'DRAFT',
      closeStrategy: 'scheduled',
      targetChatId: CHANNEL_ID,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    // Worker 1 acquires the atomic publishing lease
    const staleThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const lease1 = await repo.atomicClaimPublishingLease(`int_${samplePollPost.id}`, nowIso, staleThreshold);
    assert.equal(lease1, true, 'Worker 1 must acquire lease');

    // Worker 2 attempts to publish while Worker 1 is in progress (fresh lease)
    await assert.rejects(
      async () => {
        await publisher.publishInteraction({
          post: samplePollPost,
          plan,
          formattedText: sampleFormattedText,
        });
      },
      (err: Error) => {
        assert.ok(
          err.message.includes('Publishing lease active'),
          `Expected 'Publishing lease active' error, got: ${err.message}`,
        );
        return true;
      },
    );

    // Worker 2 was prevented from making any Telegram calls
    assert.equal(telegram.history.messages.length, 0);
    assert.equal(telegram.history.polls.length, 0);
  });

  // --------------------------------------------------------------------------
  // G. Existing successful Telegram record + conflicting retry data
  // Expected: original Telegram identity is preserved; no overwrite.
  // --------------------------------------------------------------------------
  it('G. Existing successful Telegram record + conflicting retry data: preserves original and rejects overwrite', async () => {
    const originalMsgId = 1001;
    const conflictingMsgId = 9999;
    const nowIso = new Date().toISOString();

    await repo.createPost({
      ...samplePollPost,
      status: 'partially_published',
      telegramMessageId: originalMsgId,
    });

    // Insert original published message
    await repo.createPublishedMessage({
      id: `msg_${samplePollPost.id}_main`,
      postId: samplePollPost.id,
      telegramMessageId: originalMsgId,
      telegramChatId: CHANNEL_ID,
      messageType: 'main_post',
      parseMode: 'HTML',
      textContent: 'Original message content',
      publishedAt: nowIso,
    });

    // Attempt to overwrite with conflicting telegramMessageId
    await assert.rejects(
      async () => {
        await repo.createPublishedMessage({
          id: `msg_${samplePollPost.id}_main`,
          postId: samplePollPost.id,
          telegramMessageId: conflictingMsgId,
          telegramChatId: CHANNEL_ID,
          messageType: 'main_post',
          parseMode: 'HTML',
          textContent: 'Conflicting content',
          publishedAt: nowIso,
        });
      },
      (err: Error) => {
        assert.ok(err.message.includes('Conflict: Cannot overwrite existing published message'));
        return true;
      },
    );

    // Original record must be completely intact in D1
    const msgs = await repo.getPublishedMessagesForPost(samplePollPost.id);
    assert.equal(msgs.length, 1);
    assert.equal(msgs[0].telegramMessageId, originalMsgId, 'Original Telegram message ID must be preserved');

    // Also verify createPoll conflict protection
    await repo.createInteraction({
      id: `int_${samplePollPost.id}`,
      postId: samplePollPost.id,
      interactionType: 'poll',
      lifecycleState: 'DRAFT',
      closeStrategy: 'scheduled',
      targetChatId: CHANNEL_ID,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    await repo.createPoll(
      {
        id: `poll_${samplePollPost.id}`,
        interactionId: `int_${samplePollPost.id}`,
        telegramPollId: 'poll_original_123',
        telegramMessageId: 2001,
        question: 'Original question?',
        pollType: 'regular',
        isAnonymous: false,
        allowsMultipleAnswers: false,
        isClosed: false,
        totalVoterCount: 0,
        createdAt: nowIso,
      },
      [],
    );

    // Conflicting poll write
    await assert.rejects(
      async () => {
        await repo.createPoll(
          {
            id: `poll_${samplePollPost.id}`,
            interactionId: `int_${samplePollPost.id}`,
            telegramPollId: 'poll_conflict_999',
            telegramMessageId: 9999,
            question: 'Conflicting question?',
            pollType: 'regular',
            isAnonymous: false,
            allowsMultipleAnswers: false,
            isClosed: false,
            totalVoterCount: 0,
            createdAt: nowIso,
          },
          [],
        );
      },
      (err: Error) => {
        assert.ok(err.message.includes('Conflict: Cannot overwrite existing poll'));
        return true;
      },
    );

    const pollInDb = await repo.getPollByInteractionId(`int_${samplePollPost.id}`);
    assert.equal(pollInDb?.telegramPollId, 'poll_original_123', 'Original poll ID preserved');
  });

  // --------------------------------------------------------------------------
  // H. Recovery eventually completes
  // Expected lifecycle: PUBLISHING/PARTIALLY_PUBLISHED → PUBLISHED → OPEN
  // --------------------------------------------------------------------------
  it('H. Recovery eventually completes: transitions PARTIALLY_PUBLISHED -> PUBLISHED -> OPEN', async () => {
    const plan = planner.plan({
      id: samplePollPost.id,
      title: samplePollPost.title,
      contentType: 'impossible_dilemma',
      choices: [
        { label: 'Vent Gas', tradeOff: 'Irradiate valley' },
        { label: 'Seal Core', tradeOff: 'Risk containment rupture' },
      ],
      pollQuestion: 'Which protocol do you authorize?',
    });

    const nowIso = new Date().toISOString();
    await repo.createPost({
      ...samplePollPost,
      status: 'partially_published',
      telegramMessageId: 1001,
    });

    await repo.createInteraction({
      id: `int_${samplePollPost.id}`,
      postId: samplePollPost.id,
      interactionType: 'poll',
      lifecycleState: 'PARTIALLY_PUBLISHED',
      closeStrategy: 'scheduled',
      targetChatId: CHANNEL_ID,
      mainMessageId: 1001,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    // Run recovery
    const result = await publisher.publishInteraction({
      post: samplePollPost,
      plan,
      formattedText: sampleFormattedText,
    });

    assert.equal(result.postId, samplePollPost.id);
    const finalInteraction = await repo.getInteraction(`int_${samplePollPost.id}`);
    assert.equal(finalInteraction?.lifecycleState, 'OPEN');
    const finalPost = await repo.getPost(samplePollPost.id);
    assert.equal(finalPost?.status, 'published');
  });

  // --------------------------------------------------------------------------
  // I. Recovery cannot safely continue
  // Expected: meaningful failure state/error without corrupting existing successful records.
  // --------------------------------------------------------------------------
  it('I. Recovery cannot safely continue: sets FAILED without corrupting existing successful records', async () => {
    const plan = planner.plan({
      id: samplePollPost.id,
      title: samplePollPost.title,
      contentType: 'impossible_dilemma',
      choices: [
        { label: 'Vent Gas', tradeOff: 'Irradiate valley' },
        { label: 'Seal Core', tradeOff: 'Risk containment rupture' },
      ],
      pollQuestion: 'Which protocol do you authorize?',
    });

    // Pre-seed an existing successful main message
    const nowIso = new Date().toISOString();
    await repo.createPost({
      ...samplePollPost,
      status: 'partially_published',
      telegramMessageId: 1001,
    });

    await repo.createInteraction({
      id: `int_${samplePollPost.id}`,
      postId: samplePollPost.id,
      interactionType: 'poll',
      lifecycleState: 'PARTIALLY_PUBLISHED',
      closeStrategy: 'scheduled',
      targetChatId: CHANNEL_ID,
      mainMessageId: 1001,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    // Force an unrecoverable failure during sendPoll (e.g. permanent 400 Bad Request)
    telegram.sendPoll = async () => {
      throw new Error('Telegram HTTP 400: Bad Request: Poll options must be unique');
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
        assert.ok(err.message.includes('Telegram HTTP 400'));
        return true;
      },
    );

    // Verify existing successful message ID 1001 was NOT corrupted or lost
    const postInDb = await repo.getPost(samplePollPost.id);
    assert.equal(postInDb?.telegramMessageId, 1001, 'Existing telegramMessageId must remain preserved');
    assert.equal(postInDb?.status, 'partially_published');
    assert.ok(postInDb?.failureReason?.includes('Telegram HTTP 400'));

    const interactionInDb = await repo.getInteraction(`int_${samplePollPost.id}`);
    assert.equal(interactionInDb?.mainMessageId, 1001, 'Existing mainMessageId must remain preserved');
    assert.equal(interactionInDb?.lifecycleState, 'PARTIALLY_PUBLISHED');
  });
});

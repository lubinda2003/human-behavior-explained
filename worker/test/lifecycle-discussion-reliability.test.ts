import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import { createMockD1Database } from './mock-d1';
import { SCHEMA_STATEMENTS } from '../src/store/schema';
import {
  D1InteractionRepository,
  MockTelegramClient,
  InteractionPlanner,
  TelegramInteractionPublisher,
  InteractionClosureService,
  TelegramWebhookHandler,
  VoteTracker,
  ResultGenerator,
  InvalidLifecycleTransitionError,
  type PostRecord,
  type InteractionRecord,
  type PollRecord,
  type PollOptionRecord,
} from '../src/interactions';

describe('Phase 5B: Interaction Lifecycle & Discussion Reliability Test Suite', () => {
  let db: D1Database;
  let repo: D1InteractionRepository;
  let telegram: MockTelegramClient;
  let planner: InteractionPlanner;
  let publisher: TelegramInteractionPublisher;
  let voteTracker: VoteTracker;
  let webhookHandler: TelegramWebhookHandler;
  let resultGen: ResultGenerator;
  let closureService: InteractionClosureService;

  const CHANNEL_ID = '@pickyourfate_test';
  const DISCUSSION_GROUP_ID = -1001987654321;

  beforeEach(async () => {
    db = createMockD1Database();
    for (const sql of SCHEMA_STATEMENTS) {
      await db.prepare(sql).run();
    }

    repo = new D1InteractionRepository(db);
    telegram = new MockTelegramClient();
    planner = new InteractionPlanner(CHANNEL_ID);
    publisher = new TelegramInteractionPublisher(repo, telegram);
    voteTracker = new VoteTracker(repo);
    webhookHandler = new TelegramWebhookHandler(repo, voteTracker);
    resultGen = new ResultGenerator();
    closureService = new InteractionClosureService(repo, telegram, resultGen);
  });

  const samplePost: PostRecord = {
    id: 'post_lifecycle_001',
    contentType: 'impossible_dilemma',
    category: 'survival',
    tone: 'tense',
    stakes: 'life_or_death',
    layout: 'standard',
    hookStyle: 'direct_question',
    title: 'The Glacial Power Grid Failure',
    status: 'draft',
    payload: {
      title: 'The Glacial Power Grid Failure',
      hook: 'Sub-zero temperatures threaten the outpost generator.',
      setup: 'Reroute auxiliary power to medical bay or life support greenhouse.',
      payoff: {
        reveal: 'Auxiliary routing kept medical monitors online, stabilizing critical patients.',
        twist: 'Greenhouse crops froze, requiring emergency ration conservation.',
      },
    },
    createdAt: new Date().toISOString(),
  };

  const sampleFormattedText = '<b>The Glacial Power Grid Failure</b>\n\nSub-zero temperatures...';

  // --------------------------------------------------------------------------
  // A. PUBLISHED -> OPEN only after complete publishing
  // --------------------------------------------------------------------------
  it('A. PUBLISHED -> OPEN: succeeds only after all required publishing components exist', async () => {
    const nowIso = new Date().toISOString();
    const postId = samplePost.id;
    const interactionId = `int_${postId}`;

    await repo.createPost({
      ...samplePost,
      status: 'published',
      telegramMessageId: 1001,
      telegramPollMessageId: 1002,
    });

    await repo.createInteraction({
      id: interactionId,
      postId,
      interactionType: 'poll',
      lifecycleState: 'PUBLISHED',
      closeStrategy: 'scheduled',
      targetChatId: CHANNEL_ID,
      mainMessageId: 1001,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    await repo.createPoll(
      {
        id: `poll_${postId}`,
        interactionId,
        telegramPollId: 'tg_poll_9001',
        telegramMessageId: 1002,
        question: 'Which sector receives auxiliary power?',
        pollType: 'regular',
        isAnonymous: false,
        allowsMultipleAnswers: false,
        isClosed: false,
        totalVoterCount: 0,
        createdAt: nowIso,
      },
      [],
    );

    // Transition to OPEN must succeed
    const transitioned = await repo.updateInteractionLifecycle(interactionId, 'OPEN');
    assert.equal(transitioned, true);

    const intInDb = await repo.getInteraction(interactionId);
    assert.equal(intInDb?.lifecycleState, 'OPEN');
  });

  // --------------------------------------------------------------------------
  // B. Incomplete publishing cannot become OPEN
  // --------------------------------------------------------------------------
  it('B. Incomplete publishing cannot become OPEN: rejects transition when missing components', async () => {
    const nowIso = new Date().toISOString();
    const postId = 'post_incomplete_002';
    const interactionId = `int_${postId}`;

    await repo.createPost({
      ...samplePost,
      id: postId,
      status: 'draft', // Not published yet
    });

    await repo.createInteraction({
      id: interactionId,
      postId,
      interactionType: 'poll',
      lifecycleState: 'PUBLISHING',
      closeStrategy: 'scheduled',
      targetChatId: CHANNEL_ID,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    // 1. Direct transition from PUBLISHING to OPEN is illegal in lifecycle mapping
    await assert.rejects(
      async () => {
        await repo.updateInteractionLifecycle(interactionId, 'OPEN');
      },
      (err: Error) => {
        assert.ok(err instanceof InvalidLifecycleTransitionError);
        return true;
      },
    );

    // 2. Even if moved to PUBLISHED first, missing mainMessageId/poll prevents transition to OPEN
    await repo.updateInteractionLifecycle(interactionId, 'PUBLISHED');

    await assert.rejects(
      async () => {
        await repo.updateInteractionLifecycle(interactionId, 'OPEN');
      },
      (err: Error) => {
        assert.ok(err.message.includes('Missing telegram mainMessageId'));
        return true;
      },
    );

    // Interaction safely remains in PUBLISHED (or recoverable state)
    const intInDb = await repo.getInteraction(interactionId);
    assert.equal(intInDb?.lifecycleState, 'PUBLISHED');
  });

  // --------------------------------------------------------------------------
  // C. OPEN -> CLOSED is idempotent
  // --------------------------------------------------------------------------
  it('C. OPEN -> CLOSED is idempotent: duplicate close calls return false without corrupting state', async () => {
    const nowIso = new Date().toISOString();
    const postId = 'post_close_test_003';
    const interactionId = `int_${postId}`;

    await repo.createPost({
      ...samplePost,
      id: postId,
      status: 'published',
      telegramMessageId: 1001,
    });

    await repo.createInteraction({
      id: interactionId,
      postId,
      interactionType: 'open_discussion',
      lifecycleState: 'OPEN',
      closeStrategy: 'scheduled',
      targetChatId: CHANNEL_ID,
      mainMessageId: 1001,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    // First close succeeds
    const firstClose = await repo.atomicCloseInteraction(interactionId, nowIso);
    assert.equal(firstClose, true, 'First atomic close must succeed');

    const intAfterFirst = await repo.getInteraction(interactionId);
    assert.equal(intAfterFirst?.lifecycleState, 'CLOSED');

    // Second close is harmless and returns false
    const secondClose = await repo.atomicCloseInteraction(interactionId, nowIso);
    assert.equal(secondClose, false, 'Second atomic close must return false');

    const intAfterSecond = await repo.getInteraction(interactionId);
    assert.equal(intAfterSecond?.lifecycleState, 'CLOSED');
  });

  // --------------------------------------------------------------------------
  // D. CLOSED interaction cannot be reopened by discussion activity
  // --------------------------------------------------------------------------
  it('D. CLOSED interaction cannot be reopened by discussion activity: remains strictly closed', async () => {
    const nowIso = new Date().toISOString();
    const postId = 'post_closed_protection_004';
    const interactionId = `int_${postId}`;
    const mainMessageId = 1500;

    await repo.createPost({
      ...samplePost,
      id: postId,
      status: 'published',
      telegramMessageId: mainMessageId,
    });

    await repo.createInteraction({
      id: interactionId,
      postId,
      interactionType: 'open_discussion',
      lifecycleState: 'CLOSED',
      closeStrategy: 'scheduled',
      targetChatId: CHANNEL_ID,
      mainMessageId,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    // A user comments on the post in the linked discussion supergroup
    const update = {
      update_id: 10001,
      message: {
        message_id: 501,
        date: Math.floor(Date.now() / 1000),
        chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup', title: 'Pick Your Fate Discussions' },
        text: 'I think we should have chosen the medical bay!',
        from: {
          id: 777123,
          is_bot: false,
          first_name: 'Dr. Jane',
          username: 'drjane',
        },
        reply_to_message: {
          message_id: 200,
          date: Math.floor(Date.now() / 1000),
          chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
          forward_from_message_id: mainMessageId, // channel post forwarded to discussion
        },
      },
    };

    const res = await webhookHandler.handleUpdate(update, undefined, nowIso);
    assert.equal(res.status, 200);
    assert.equal((res.body.discussionResult as any)?.status, 'ignored_closed');

    // Invariant: Interaction MUST NOT be reopened!
    const intInDb = await repo.getInteraction(interactionId);
    assert.equal(intInDb?.lifecycleState, 'CLOSED');
  });

  // --------------------------------------------------------------------------
  // E. CLOSE -> RESOLVING retry is safe
  // --------------------------------------------------------------------------
  it('E. CLOSE -> RESOLVING retry is safe: allows interrupted closure to resume and complete', async () => {
    const nowIso = new Date().toISOString();
    const postId = 'post_retry_resolving_005';
    const interactionId = `int_${postId}`;
    const mainMessageId = 1600;

    await repo.createPost({
      ...samplePost,
      id: postId,
      status: 'published',
      telegramMessageId: mainMessageId,
    });

    // Interaction was closed, but the runner crashed while in RESOLVING
    const crashedTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    await repo.createInteraction({
      id: interactionId,
      postId,
      interactionType: 'open_discussion',
      lifecycleState: 'RESOLVING',
      closeStrategy: 'scheduled',
      targetChatId: CHANNEL_ID,
      mainMessageId,
      createdAt: crashedTime,
      updatedAt: crashedTime,
    });

    const intRecord = (await repo.getInteraction(interactionId))!;

    // Recovery runs closeInteraction
    const result = await closureService.closeInteraction(intRecord, nowIso);

    assert.equal(result.processed, true);
    assert.ok(result.resultPostMessageId);

    const intAfterRecovery = await repo.getInteraction(interactionId);
    assert.equal(intAfterRecovery?.lifecycleState, 'COMPLETED');
  });

  // --------------------------------------------------------------------------
  // F. Result posting is idempotent
  // --------------------------------------------------------------------------
  it('F. Result posting is idempotent: repeated closure of completed interaction sends 0 duplicate messages', async () => {
    const nowIso = new Date().toISOString();
    const plan = planner.plan({
      id: samplePost.id,
      title: samplePost.title,
      contentType: 'impossible_dilemma',
      choices: [
        { label: 'Option A', tradeOff: 'Cost A' },
        { label: 'Option B', tradeOff: 'Cost B' },
      ],
      pollQuestion: 'Which protocol do you select?',
    });

    // 1. Publish interaction
    const pubResult = await publisher.publishInteraction({
      post: samplePost,
      plan,
      formattedText: sampleFormattedText,
      nowIso,
    });

    const intRecord = (await repo.getInteraction(pubResult.interactionId))!;

    // 2. First closure: resolves and posts reveal
    const firstClosure = await closureService.closeInteraction(intRecord, nowIso);
    assert.equal(firstClosure.processed, true);
    assert.ok(firstClosure.resultPostMessageId);

    // Initial messages count (1 narrative message, 1 poll, 1 result message)
    const messagesCountAfterFirst = telegram.history.messages.length;

    // 3. Second closure (duplicate): must be no-op for Telegram
    const secondClosure = await closureService.closeInteraction(intRecord, nowIso);
    assert.equal(secondClosure.processed, true);
    assert.equal(secondClosure.reason, 'already_completed');

    assert.equal(
      telegram.history.messages.length,
      messagesCountAfterFirst,
      'No duplicate result messages sent to Telegram',
    );
  });

  // --------------------------------------------------------------------------
  // G. Result Telegram success + D1 failure -> retry without duplicate result post
  // --------------------------------------------------------------------------
  it('G. Result Telegram success + D1 failure -> retry: detects existing result message and does not duplicate', async () => {
    const nowIso = new Date().toISOString();
    const plan = planner.plan({
      id: samplePost.id,
      title: samplePost.title,
      contentType: 'impossible_dilemma',
      choices: [
        { label: 'Option A', tradeOff: 'Cost A' },
        { label: 'Option B', tradeOff: 'Cost B' },
      ],
      pollQuestion: 'Which protocol do you select?',
    });

    const pubResult = await publisher.publishInteraction({
      post: samplePost,
      plan,
      formattedText: sampleFormattedText,
      nowIso,
    });

    const intRecord = (await repo.getInteraction(pubResult.interactionId))!;

    // Mock createPublishedMessage to fail on result_reveal insert
    const originalCreatePubMsg = repo.createPublishedMessage.bind(repo);
    let createPubMsgCalls = 0;
    (repo as any).createPublishedMessage = async (msg: any) => {
      if (msg.messageType === 'result_reveal') {
        createPubMsgCalls++;
        if (createPubMsgCalls === 1) {
          throw new Error('D1 Disk write error during result_reveal published_message');
        }
      }
      return originalCreatePubMsg(msg);
    };

    // First attempt fails during D1 write, but AFTER Telegram message was sent
    await assert.rejects(
      async () => {
        await closureService.closeInteraction(intRecord, nowIso);
      },
      (err: Error) => {
        assert.ok(err.message.includes('D1 Disk write error'));
        return true;
      },
    );

    // Telegram sent the result message
    const msgsAfterFail = telegram.history.messages.length;
    assert.ok(msgsAfterFail >= 2, 'Result message was sent before D1 error');

    // Reset Telegram tracking for retry
    telegram.reset();

    // Second attempt (retry): D1 is healthy
    const retryResult = await closureService.closeInteraction(intRecord, nowIso);
    assert.equal(retryResult.processed, true);

    // In retry: ZERO new Telegram messages sent!
    assert.equal(telegram.history.messages.length, 0, 'Must NOT re-send result message on retry');

    const finalInt = await repo.getInteraction(pubResult.interactionId);
    assert.equal(finalInt?.lifecycleState, 'COMPLETED');
  });

  // --------------------------------------------------------------------------
  // H. Existing result Telegram ID is reconciled
  // --------------------------------------------------------------------------
  it('H. Existing result Telegram ID is reconciled: reuses stored result message ID cleanly', async () => {
    const nowIso = new Date().toISOString();
    const postId = 'post_reconcile_result_008';
    const interactionId = `int_${postId}`;
    const mainMessageId = 1800;
    const existingResultMsgId = 1805;

    await repo.createPost({
      ...samplePost,
      id: postId,
      status: 'published',
      telegramMessageId: mainMessageId,
    });

    const crashedTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    await repo.createInteraction({
      id: interactionId,
      postId,
      interactionType: 'open_discussion',
      lifecycleState: 'RESOLVING',
      closeStrategy: 'scheduled',
      targetChatId: CHANNEL_ID,
      mainMessageId,
      createdAt: crashedTime,
      updatedAt: crashedTime,
    });

    // Pre-seed the result message in published_messages
    await repo.createPublishedMessage({
      id: `msg_${postId}_discussion_resolution`,
      postId,
      telegramMessageId: existingResultMsgId,
      telegramChatId: CHANNEL_ID,
      messageType: 'result_reveal',
      parseMode: 'HTML',
      textContent: 'Existing result text',
      publishedAt: nowIso,
    });

    const intRecord = (await repo.getInteraction(interactionId))!;

    // Run resolution
    const res = await closureService.closeInteraction(intRecord, nowIso);

    assert.equal(res.processed, true);
    assert.equal(res.resultPostMessageId, existingResultMsgId);
    assert.equal(telegram.history.messages.length, 0, 'No Telegram messages sent because result already existed');

    const finalInt = await repo.getInteraction(interactionId);
    assert.equal(finalInt?.lifecycleState, 'COMPLETED');
  });

  // --------------------------------------------------------------------------
  // I. Repeated Telegram discussion update is handled idempotently
  // --------------------------------------------------------------------------
  it('I. Repeated Telegram discussion update: handled idempotently with 0 duplicate effects', async () => {
    const nowIso = new Date().toISOString();
    const postId = 'post_idempotent_event_009';
    const interactionId = `int_${postId}`;
    const mainMessageId = 1900;

    await repo.createPost({
      ...samplePost,
      id: postId,
      status: 'published',
      telegramMessageId: mainMessageId,
    });

    await repo.createInteraction({
      id: interactionId,
      postId,
      interactionType: 'open_discussion',
      lifecycleState: 'OPEN',
      closeStrategy: 'scheduled',
      targetChatId: CHANNEL_ID,
      mainMessageId,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    const update = {
      update_id: 20002,
      message: {
        message_id: 601,
        date: Math.floor(Date.now() / 1000),
        chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
        text: 'Great scenario! We should focus on battery conservation.',
        from: {
          id: 888222,
          is_bot: false,
          first_name: 'Explorer Bob',
          username: 'bobexplorer',
        },
        reply_to_message: {
          message_id: 300,
          date: Math.floor(Date.now() / 1000),
          chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
          forward_from_message_id: mainMessageId,
        },
      },
    };

    // First arrival
    const res1 = await webhookHandler.handleUpdate(update, undefined, nowIso);
    assert.equal(res1.status, 200);
    assert.equal((res1.body.discussionResult as any)?.status, 'discussion_recorded');

    // Duplicate arrival (same update_id)
    const res2 = await webhookHandler.handleUpdate(update, undefined, nowIso);
    assert.equal(res2.status, 200);
    assert.equal(res2.body.duplicate, true);

    // Lifecycle must remain OPEN
    const intInDb = await repo.getInteraction(interactionId);
    assert.equal(intInDb?.lifecycleState, 'OPEN');
  });

  // --------------------------------------------------------------------------
  // J. Discussion update for one interaction cannot modify another interaction
  // --------------------------------------------------------------------------
  it('J. Discussion update isolation: updates for interaction 1 cannot affect interaction 2', async () => {
    const nowIso = new Date().toISOString();

    // Interaction 1 (OPEN)
    await repo.createPost({
      ...samplePost,
      id: 'post_iso_1',
      status: 'published',
      telegramMessageId: 2101,
    });
    await repo.createInteraction({
      id: 'int_post_iso_1',
      postId: 'post_iso_1',
      interactionType: 'open_discussion',
      lifecycleState: 'OPEN',
      closeStrategy: 'scheduled',
      targetChatId: CHANNEL_ID,
      mainMessageId: 2101,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    // Interaction 2 (CLOSED)
    await repo.createPost({
      ...samplePost,
      id: 'post_iso_2',
      status: 'published',
      telegramMessageId: 2202,
    });
    await repo.createInteraction({
      id: 'int_post_iso_2',
      postId: 'post_iso_2',
      interactionType: 'open_discussion',
      lifecycleState: 'CLOSED',
      closeStrategy: 'scheduled',
      targetChatId: CHANNEL_ID,
      mainMessageId: 2202,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    // Comment replying to Interaction 1
    const update1 = {
      update_id: 30003,
      message: {
        message_id: 701,
        date: Math.floor(Date.now() / 1000),
        chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
        text: 'Commenting on interaction 1',
        from: { id: 111, is_bot: false, first_name: 'User 1' },
        reply_to_message: {
          message_id: 400,
          date: Math.floor(Date.now() / 1000),
          chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
          forward_from_message_id: 2101,
        },
      },
    };

    const res = await webhookHandler.handleUpdate(update1, undefined, nowIso);
    assert.equal(res.status, 200);
    assert.equal((res.body.discussionResult as any)?.interactionId, 'int_post_iso_1');

    // Invariant: Interaction 2 must remain completely untouched in CLOSED state
    const int2 = await repo.getInteraction('int_post_iso_2');
    assert.equal(int2?.lifecycleState, 'CLOSED');
    assert.equal((int2?.metadata as any)?.discussionCommentCount, undefined);
  });

  // --------------------------------------------------------------------------
  // K. Concurrent close/resolve operations do not create duplicate results
  // --------------------------------------------------------------------------
  it('K. Concurrent close/resolve operations: atomic guards serialize workers and prevent duplicate results', async () => {
    const nowIso = new Date().toISOString();
    const plan = planner.plan({
      id: samplePost.id,
      title: samplePost.title,
      contentType: 'impossible_dilemma',
      choices: [
        { label: 'Option A', tradeOff: 'Cost A' },
        { label: 'Option B', tradeOff: 'Cost B' },
      ],
      pollQuestion: 'Which protocol do you select?',
    });

    const pubResult = await publisher.publishInteraction({
      post: samplePost,
      plan,
      formattedText: sampleFormattedText,
      nowIso,
    });

    const intRecord = (await repo.getInteraction(pubResult.interactionId))!;

    // Worker 1 and Worker 2 both trigger close concurrently
    const [res1, res2] = await Promise.all([
      closureService.closeInteraction(intRecord, nowIso),
      closureService.closeInteraction(intRecord, nowIso),
    ]);

    // One worker processed, the other was serialized or received already_completed
    const successful = [res1, res2].filter((r) => r.processed);
    assert.ok(successful.length >= 1);

    // Exactly 1 result record in D1
    const resultsInDb = await repo.getResultByInteractionId(pubResult.interactionId);
    assert.ok(resultsInDb);

    // Exactly 1 reveal message sent
    const revealMessages = telegram.history.messages.filter((m) => m.text.includes('THE VERDICT'));
    assert.equal(revealMessages.length, 1, 'Only exactly 1 reveal message must be sent to Telegram');

    const finalInt = await repo.getInteraction(pubResult.interactionId);
    assert.equal(finalInt?.lifecycleState, 'COMPLETED');
  });

  // --------------------------------------------------------------------------
  // L. Concurrent result posting does not create duplicate Telegram result messages
  // --------------------------------------------------------------------------
  it('L. Concurrent resolving attempts: resolving lease prevents duplicate result messages', async () => {
    const nowIso = new Date().toISOString();
    const postId = 'post_lease_race_012';
    const interactionId = `int_${postId}`;
    const mainMessageId = 2301;

    await repo.createPost({
      ...samplePost,
      id: postId,
      status: 'published',
      telegramMessageId: mainMessageId,
    });

    await repo.createInteraction({
      id: interactionId,
      postId,
      interactionType: 'open_discussion',
      lifecycleState: 'CLOSED',
      closeStrategy: 'scheduled',
      targetChatId: CHANNEL_ID,
      mainMessageId,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    // Worker 1 acquires the atomic resolving lease
    const staleThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const lease1 = await repo.atomicClaimResolvingLease(interactionId, nowIso, staleThreshold);
    assert.equal(lease1, true, 'Worker 1 acquires resolving lease');

    // Worker 2 attempts resolution while Worker 1 is in progress
    const intRecord = (await repo.getInteraction(interactionId))!;
    const res2 = await closureService.closeInteraction(intRecord, nowIso);

    // Worker 2 must be turned away cleanly
    assert.equal(res2.processed, false);
    assert.equal(res2.reason, 'resolving_in_progress');
    assert.equal(telegram.history.messages.length, 0);
  });

  // --------------------------------------------------------------------------
  // M. Completed interaction remains completed under repeated updates
  // --------------------------------------------------------------------------
  it('M. Completed interaction remains completed: incoming poll answers and comments do not alter state', async () => {
    const nowIso = new Date().toISOString();
    const postId = 'post_completed_stay_013';
    const interactionId = `int_${postId}`;
    const mainMessageId = 2401;

    await repo.createPost({
      ...samplePost,
      id: postId,
      status: 'published',
      telegramMessageId: mainMessageId,
    });

    await repo.createInteraction({
      id: interactionId,
      postId,
      interactionType: 'poll',
      lifecycleState: 'COMPLETED',
      closeStrategy: 'scheduled',
      targetChatId: CHANNEL_ID,
      mainMessageId,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    await repo.createPoll(
      {
        id: `poll_${postId}`,
        interactionId,
        telegramPollId: 'tg_poll_completed_99',
        telegramMessageId: 2402,
        question: 'Completed question?',
        pollType: 'regular',
        isAnonymous: false,
        allowsMultipleAnswers: false,
        isClosed: true,
        totalVoterCount: 10,
        createdAt: nowIso,
      },
      [],
    );

    // Late poll answer after completion
    const pollAnswerUpdate = {
      update_id: 40004,
      poll_answer: {
        poll_id: 'tg_poll_completed_99',
        user: { id: 999, is_bot: false, first_name: 'Late Voter' },
        option_ids: [0],
      },
    };

    const pollRes = await webhookHandler.handleUpdate(pollAnswerUpdate, undefined, nowIso);
    assert.equal(pollRes.status, 200);
    assert.equal((pollRes.body.voteResult as any)?.status, 'ignored_closed');

    // Late comment after completion
    const commentUpdate = {
      update_id: 40005,
      message: {
        message_id: 801,
        date: Math.floor(Date.now() / 1000),
        chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
        text: 'Late comment!',
        from: { id: 999, is_bot: false, first_name: 'Late Voter' },
        reply_to_message: {
          message_id: 500,
          date: Math.floor(Date.now() / 1000),
          chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
          forward_from_message_id: mainMessageId,
        },
      },
    };

    const commentRes = await webhookHandler.handleUpdate(commentUpdate, undefined, nowIso);
    assert.equal(commentRes.status, 200);
    assert.equal((commentRes.body.discussionResult as any)?.status, 'ignored_closed');

    // State remains COMPLETED
    const finalInt = await repo.getInteraction(interactionId);
    assert.equal(finalInt?.lifecycleState, 'COMPLETED');
  });

  // --------------------------------------------------------------------------
  // N. Failure/recovery preserves previously successful publishing records
  // --------------------------------------------------------------------------
  it('N. Failure/recovery preserves records: existing successful Telegram IDs are never overwritten', async () => {
    const nowIso = new Date().toISOString();
    const postId = 'post_preserve_014';
    const originalMsgId = 2501;

    await repo.createPost({
      ...samplePost,
      id: postId,
      status: 'partially_published',
      telegramMessageId: originalMsgId,
    });

    await repo.createPublishedMessage({
      id: `msg_${postId}_main`,
      postId,
      telegramMessageId: originalMsgId,
      telegramChatId: CHANNEL_ID,
      messageType: 'main_post',
      parseMode: 'HTML',
      textContent: sampleFormattedText,
      publishedAt: nowIso,
    });

    // Attempting to overwrite post with conflicting telegramMessageId throws conflict
    await assert.rejects(
      async () => {
        await repo.updatePostStatus(postId, 'partially_published', {
          telegramMessageId: 9999,
        });
      },
      (err: Error) => {
        assert.ok(err.message.includes('Conflict: Cannot overwrite existing post'));
        return true;
      },
    );

    // Attempting to overwrite published message with conflicting telegramMessageId throws conflict
    await assert.rejects(
      async () => {
        await repo.createPublishedMessage({
          id: `msg_${postId}_main`,
          postId,
          telegramMessageId: 9999,
          telegramChatId: CHANNEL_ID,
          messageType: 'main_post',
          parseMode: 'HTML',
          textContent: 'Different text',
          publishedAt: nowIso,
        });
      },
      (err: Error) => {
        assert.ok(err.message.includes('Conflict: Cannot overwrite existing published message'));
        return true;
      },
    );

    // Original ID remains completely preserved
    const postInDb = await repo.getPost(postId);
    assert.equal(postInDb?.telegramMessageId, originalMsgId);
  });
});

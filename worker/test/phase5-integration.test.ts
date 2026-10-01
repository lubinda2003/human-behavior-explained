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
  type PostRecord,
  type TelegramUpdate,
} from '../src/interactions';
import { AutonomousPipelineService } from '../src/pipeline/autonomous-pipeline';
import type { Env } from '../src/env';

function createMockKV(): any {
  const store = new Map<string, string>();
  return {
    async get(key: string): Promise<string | null> {
      return store.get(key) ?? null;
    },
    async put(key: string, value: string): Promise<void> {
      store.set(key, value);
    },
    async delete(key: string): Promise<void> {
      store.delete(key);
    },
  };
}

describe('Phase 5D: Complete Cross-System Integration & Reliability Hardening', () => {
  let db: D1Database;
  let kv: any;
  let repo: D1InteractionRepository;
  let telegram: MockTelegramClient;
  let planner: InteractionPlanner;
  let publisher: TelegramInteractionPublisher;
  let voteTracker: VoteTracker;
  let webhookHandler: TelegramWebhookHandler;
  let resultGen: ResultGenerator;
  let closureService: InteractionClosureService;
  let baseEnv: Env;

  const CHANNEL_ID = '@pickyourfate_test';
  const DISCUSSION_GROUP_ID = -1001987654321;

  beforeEach(async () => {
    db = createMockD1Database();
    for (const sql of SCHEMA_STATEMENTS) {
      await db.prepare(sql).run();
    }
    kv = createMockKV();

    repo = new D1InteractionRepository(db);
    telegram = new MockTelegramClient();
    planner = new InteractionPlanner(CHANNEL_ID);
    publisher = new TelegramInteractionPublisher(repo, telegram);
    voteTracker = new VoteTracker(repo);
    webhookHandler = new TelegramWebhookHandler(repo, voteTracker);
    resultGen = new ResultGenerator();
    closureService = new InteractionClosureService(repo, telegram, resultGen);

    baseEnv = {
      DB: db,
      KV: kv,
      ARCHIVE: {} as any,
      TELEGRAM_BOT_TOKEN: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
      TELEGRAM_CHANNEL_ID: CHANNEL_ID,
      TELEGRAM_WEBHOOK_SECRET: 'test_secret_abc123',
      GEMINI_API_KEY: 'test_key',
      GEMINI_MODEL: 'gemini-2.5-flash',
      PUBLISHING_ENABLED: 'false',
      DISCUSSION_GROUP_LINKED: 'true',
      DRY_RUN: 'true',
      PUBLISHING_COOLDOWN_MINUTES: '0',
    };
  });

  const sampleDilemmaPost: PostRecord = {
    id: 'post_integ_001',
    contentType: 'impossible_dilemma',
    category: 'survival',
    tone: 'tense',
    stakes: 'life_or_death',
    layout: 'standard',
    hookStyle: 'direct_question',
    title: 'The Subterranean Geothermal Vault Breach',
    status: 'draft',
    payload: {
      id: 'dilemma_integ_001',
      title: 'The Subterranean Geothermal Vault Breach',
      hook: 'Superheated steam is flooding Sector 4.',
      setup: 'Vent pressure into research archive or seal blast doors with survey team inside.',
      choices: [
        { label: 'Vent into Archive', tradeOff: 'Irreplaceable research lost' },
        { label: 'Seal Blast Doors', tradeOff: 'Survey team trapped indefinitely' },
      ],
      pollQuestion: 'Which emergency protocol will you execute?',
      payoff: {
        reveal: 'Venting steam saved the crew while archival data was partially recovered.',
        twist: 'Auxiliary backup generators triggered automated safety locks.',
      },
    },
    createdAt: new Date().toISOString(),
  };

  const sampleFormattedText = '<b>The Subterranean Geothermal Vault Breach</b>\n\nSuperheated steam...';

  // --------------------------------------------------------------------------
  // 1. Full publish -> OPEN -> discussion -> CLOSE -> RESOLVE -> COMPLETED
  // --------------------------------------------------------------------------
  it('1. Complete lifecycle: Publish -> OPEN -> discussion comment -> CLOSE -> RESOLVE -> COMPLETED', async () => {
    const nowIso = new Date().toISOString();
    const plan = planner.plan({
      id: sampleDilemmaPost.id,
      title: sampleDilemmaPost.title,
      contentType: 'impossible_dilemma',
      choices: [
        { label: 'Option A', tradeOff: 'Cost A' },
        { label: 'Option B', tradeOff: 'Cost B' },
      ],
      pollQuestion: 'Which protocol do you select?',
    });

    // 1. Publish
    const pub = await publisher.publishInteraction({
      post: sampleDilemmaPost,
      plan,
      formattedText: sampleFormattedText,
      nowIso,
    });
    assert.ok(pub.telegramMessageId);
    assert.ok(pub.telegramPollId);

    const intAfterPub = await repo.getInteraction(pub.interactionId);
    assert.equal(intAfterPub?.lifecycleState, 'OPEN');

    // 2. Discussion activity via webhook
    const commentUpdate: TelegramUpdate = {
      update_id: 50001,
      message: {
        message_id: 6001,
        date: Math.floor(Date.now() / 1000),
        chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
        text: 'Crucial ethical dilemma! Option A is clearly superior.',
        from: { id: 8001, is_bot: false, first_name: 'Daniel' },
        reply_to_message: {
          message_id: 991,
          date: Math.floor(Date.now() / 1000),
          chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
          forward_from_message_id: pub.telegramMessageId,
        },
      },
    };
    const webhookRes = await webhookHandler.handleUpdate(commentUpdate, undefined, nowIso);
    assert.equal(webhookRes.status, 200);
    assert.equal((webhookRes.body.discussionResult as any)?.status, 'discussion_recorded');

    const comments = await repo.getDiscussionMessagesForInteraction(pub.interactionId);
    assert.equal(comments.length, 1);
    assert.equal(comments[0].telegramMessageId, 6001);

    // 3. Close & Resolve
    const closeRes = await closureService.closeInteraction(intAfterPub!, nowIso);
    assert.equal(closeRes.processed, true);
    assert.ok(closeRes.resultPostMessageId);

    const intAfterClose = await repo.getInteraction(pub.interactionId);
    assert.equal(intAfterClose?.lifecycleState, 'COMPLETED');

    const resultRecord = await repo.getResultByInteractionId(pub.interactionId);
    assert.ok(resultRecord);
    assert.equal(resultRecord?.status, 'published');
  });

  // --------------------------------------------------------------------------
  // 2. Publish failure -> recovery -> OPEN -> normal lifecycle
  // --------------------------------------------------------------------------
  it('2. Publish failure -> recovery -> OPEN -> normal lifecycle', async () => {
    const nowIso = new Date().toISOString();
    const postId = 'post_integ_fail_002';
    const plan = planner.plan({
      id: postId,
      title: 'Fail & Recover Post',
      contentType: 'impossible_dilemma',
      choices: [{ label: 'A', tradeOff: 'T1' }, { label: 'B', tradeOff: 'T2' }],
      pollQuestion: 'Question?',
    });

    // Mock sendPoll to fail on first attempt (so main message succeeds, but poll fails -> PARTIALLY_PUBLISHED)
    const originalSendPoll = telegram.sendPoll.bind(telegram);
    let pollCalls = 0;
    (telegram as any).sendPoll = async (p: any) => {
      pollCalls++;
      if (pollCalls === 1) throw new Error('Network error sending poll');
      return originalSendPoll(p);
    };

    await assert.rejects(async () => {
      await publisher.publishInteraction({
        post: { ...sampleDilemmaPost, id: postId },
        plan,
        formattedText: sampleFormattedText,
        nowIso,
      });
    });

    const intFail = await repo.getInteraction(`int_${postId}`);
    assert.equal(intFail?.lifecycleState, 'PARTIALLY_PUBLISHED');

    // Second attempt recovers missing components
    const recPub = await publisher.publishInteraction({
      post: { ...sampleDilemmaPost, id: postId },
      plan,
      formattedText: sampleFormattedText,
      nowIso,
    });
    assert.ok(recPub.telegramMessageId);
    assert.ok(recPub.telegramPollId);

    const intRecovered = await repo.getInteraction(`int_${postId}`);
    assert.equal(intRecovered?.lifecycleState, 'OPEN');
  });

  // --------------------------------------------------------------------------
  // 3. Telegram success + D1 failure -> recovery without duplicate side effect
  // --------------------------------------------------------------------------
  it('3. Telegram success + D1 failure during result reveal -> retry sends 0 duplicate messages', async () => {
    const nowIso = new Date().toISOString();
    const postId = 'post_integ_d1fail_003';
    const plan = planner.plan({
      id: postId,
      title: 'Result D1 Fail Post',
      contentType: 'impossible_dilemma',
      choices: [{ label: 'A', tradeOff: 'T1' }, { label: 'B', tradeOff: 'T2' }],
      pollQuestion: 'Question?',
    });

    const pub = await publisher.publishInteraction({
      post: { ...sampleDilemmaPost, id: postId },
      plan,
      formattedText: sampleFormattedText,
      nowIso,
    });
    const intRecord = (await repo.getInteraction(pub.interactionId))!;

    // Mock createPublishedMessage to fail on result_reveal
    const originalCreatePub = repo.createPublishedMessage.bind(repo);
    let calls = 0;
    (repo as any).createPublishedMessage = async (msg: any) => {
      if (msg.messageType === 'result_reveal') {
        calls++;
        if (calls === 1) throw new Error('D1 Disk write error during result_reveal');
      }
      return originalCreatePub(msg);
    };

    // Attempt 1 fails after sending Telegram message
    await assert.rejects(async () => {
      await closureService.closeInteraction(intRecord, nowIso);
    });

    // Reset Telegram tracking
    telegram.reset();

    // Attempt 2 (retry)
    const retryRes = await closureService.closeInteraction(intRecord, nowIso);
    assert.equal(retryRes.processed, true);

    // ZERO duplicate Telegram messages sent
    assert.equal(telegram.history.messages.length, 0);

    const finalInt = await repo.getInteraction(pub.interactionId);
    assert.equal(finalInt?.lifecycleState, 'COMPLETED');
  });

  // --------------------------------------------------------------------------
  // 4. Duplicate webhook -> one logical effect
  // --------------------------------------------------------------------------
  it('4. Duplicate webhook delivery produces exactly one logical effect', async () => {
    const nowIso = new Date().toISOString();
    const postId = 'post_integ_dup_004';
    const plan = planner.plan({
      id: postId,
      title: 'Dup Webhook Post',
      contentType: 'impossible_dilemma',
      choices: [{ label: 'A', tradeOff: 'T1' }, { label: 'B', tradeOff: 'T2' }],
      pollQuestion: 'Question?',
    });
    const pub = await publisher.publishInteraction({
      post: { ...sampleDilemmaPost, id: postId },
      plan,
      formattedText: sampleFormattedText,
      nowIso,
    });

    const update: TelegramUpdate = {
      update_id: 50004,
      message: {
        message_id: 6004,
        date: Math.floor(Date.now() / 1000),
        chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
        text: 'Duplicate webhook event test',
        from: { id: 8004, is_bot: false, first_name: 'Elena' },
        reply_to_message: {
          message_id: 994,
          date: Math.floor(Date.now() / 1000),
          chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
          forward_from_message_id: pub.telegramMessageId,
        },
      },
    };

    const res1 = await webhookHandler.handleUpdate(update, undefined, nowIso);
    const res2 = await webhookHandler.handleUpdate(update, undefined, nowIso);

    assert.equal(res1.status, 200);
    assert.equal(res2.status, 200);
    assert.equal(res2.body.duplicate, true);

    const comments = await repo.getDiscussionMessagesForInteraction(pub.interactionId);
    assert.equal(comments.length, 1);
  });

  // --------------------------------------------------------------------------
  // 5. Concurrent webhook -> one logical effect
  // --------------------------------------------------------------------------
  it('5. Concurrent webhook processing from separate worker instances results in exactly one effect', async () => {
    const nowIso = new Date().toISOString();
    const postId = 'post_integ_conc_hook_005';
    const plan = planner.plan({
      id: postId,
      title: 'Concurrent Hook Post',
      contentType: 'impossible_dilemma',
      choices: [{ label: 'A', tradeOff: 'T1' }, { label: 'B', tradeOff: 'T2' }],
      pollQuestion: 'Question?',
    });
    const pub = await publisher.publishInteraction({
      post: { ...sampleDilemmaPost, id: postId },
      plan,
      formattedText: sampleFormattedText,
      nowIso,
    });

    const worker1 = new TelegramWebhookHandler(new D1InteractionRepository(db), new VoteTracker(new D1InteractionRepository(db)));
    const worker2 = new TelegramWebhookHandler(new D1InteractionRepository(db), new VoteTracker(new D1InteractionRepository(db)));

    const update: TelegramUpdate = {
      update_id: 50005,
      message: {
        message_id: 6005,
        date: Math.floor(Date.now() / 1000),
        chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
        text: 'Concurrent webhook comment',
        from: { id: 8005, is_bot: false, first_name: 'Fiona' },
        reply_to_message: {
          message_id: 995,
          date: Math.floor(Date.now() / 1000),
          chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
          forward_from_message_id: pub.telegramMessageId,
        },
      },
    };

    const [res1, res2] = await Promise.all([
      worker1.handleUpdate(update, undefined, nowIso),
      worker2.handleUpdate(update, undefined, nowIso),
    ]);

    assert.equal(res1.status, 200);
    assert.equal(res2.status, 200);

    const comments = await repo.getDiscussionMessagesForInteraction(pub.interactionId);
    assert.equal(comments.length, 1);
  });

  // --------------------------------------------------------------------------
  // 6. Concurrent publishing -> one logical publication
  // --------------------------------------------------------------------------
  it('6. Concurrent publishing attempts serialize and produce exactly one logical publication', async () => {
    const nowIso = new Date().toISOString();
    const postId = 'post_integ_conc_pub_006';
    const plan = planner.plan({
      id: postId,
      title: 'Concurrent Pub Post',
      contentType: 'impossible_dilemma',
      choices: [{ label: 'A', tradeOff: 'T1' }, { label: 'B', tradeOff: 'T2' }],
      pollQuestion: 'Question?',
    });

    const pubWorker1 = new TelegramInteractionPublisher(repo, telegram);
    const pubWorker2 = new TelegramInteractionPublisher(repo, telegram);

    const results = await Promise.allSettled([
      pubWorker1.publishInteraction({
        post: { ...sampleDilemmaPost, id: postId },
        plan,
        formattedText: sampleFormattedText,
        nowIso,
      }),
      pubWorker2.publishInteraction({
        post: { ...sampleDilemmaPost, id: postId },
        plan,
        formattedText: sampleFormattedText,
        nowIso,
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    assert.ok(fulfilled.length >= 1, 'At least one worker succeeded');

    // Exactly 1 main message sent to Telegram
    assert.equal(telegram.history.messages.length, 1);
    // Exactly 1 poll sent to Telegram
    assert.equal(telegram.history.polls.length, 1);
  });

  // --------------------------------------------------------------------------
  // 7. Concurrent resolution -> one result
  // --------------------------------------------------------------------------
  it('7. Concurrent resolution attempts serialize and post exactly one result message', async () => {
    const nowIso = new Date().toISOString();
    const postId = 'post_integ_conc_res_007';
    const plan = planner.plan({
      id: postId,
      title: 'Concurrent Res Post',
      contentType: 'impossible_dilemma',
      choices: [{ label: 'A', tradeOff: 'T1' }, { label: 'B', tradeOff: 'T2' }],
      pollQuestion: 'Question?',
    });
    const pub = await publisher.publishInteraction({
      post: { ...sampleDilemmaPost, id: postId },
      plan,
      formattedText: sampleFormattedText,
      nowIso,
    });
    const intRecord = (await repo.getInteraction(pub.interactionId))!;

    const cs1 = new InteractionClosureService(repo, telegram, resultGen);
    const cs2 = new InteractionClosureService(repo, telegram, resultGen);

    const [res1, res2] = await Promise.all([
      cs1.closeInteraction(intRecord, nowIso),
      cs2.closeInteraction(intRecord, nowIso),
    ]);

    // Exactly one successfully executed resolution; the other was turned away cleanly
    const oneProcessed =
      (res1.processed && !res2.processed && res2.reason === 'resolving_in_progress') ||
      (res2.processed && !res1.processed && res1.reason === 'resolving_in_progress') ||
      (res1.processed && res2.processed); // If sequential fast-path
    assert.ok(oneProcessed, 'Concurrent resolution serialized properly');

    // Result messages in Telegram is strictly 1
    const resultMessages = telegram.history.messages.filter(
      (m) => m.text?.includes('THE VERDICT') || m.text?.includes('THE REVEAL'),
    );
    assert.equal(resultMessages.length, 1);
  });

  // --------------------------------------------------------------------------
  // 8. Existing result -> no duplicate result
  // --------------------------------------------------------------------------
  it('8. Existing result message prevents duplicate result reveal upon repeated closure', async () => {
    const nowIso = new Date().toISOString();
    const postId = 'post_integ_exist_res_008';
    const plan = planner.plan({
      id: postId,
      title: 'Existing Result Post',
      contentType: 'impossible_dilemma',
      choices: [{ label: 'A', tradeOff: 'T1' }, { label: 'B', tradeOff: 'T2' }],
      pollQuestion: 'Question?',
    });
    const pub = await publisher.publishInteraction({
      post: { ...sampleDilemmaPost, id: postId },
      plan,
      formattedText: sampleFormattedText,
      nowIso,
    });
    const intRecord = (await repo.getInteraction(pub.interactionId))!;

    // First closure
    const res1 = await closureService.closeInteraction(intRecord, nowIso);
    assert.equal(res1.processed, true);
    const totalMsgsAfterFirst = telegram.history.messages.length;

    // Second closure
    const res2 = await closureService.closeInteraction(intRecord, nowIso);
    assert.equal(res2.processed, true);
    assert.equal(res2.reason, 'already_completed');

    // ZERO new Telegram messages
    assert.equal(telegram.history.messages.length, totalMsgsAfterFirst);
  });

  // --------------------------------------------------------------------------
  // 9. CLOSED interaction isolation
  // --------------------------------------------------------------------------
  it('9. CLOSED interaction cannot be reopened by discussion activity', async () => {
    const nowIso = new Date().toISOString();
    const postId = 'post_integ_closed_009';
    const plan = planner.plan({
      id: postId,
      title: 'Closed Isolation Post',
      contentType: 'impossible_dilemma',
      choices: [{ label: 'A', tradeOff: 'T1' }, { label: 'B', tradeOff: 'T2' }],
      pollQuestion: 'Question?',
    });
    const pub = await publisher.publishInteraction({
      post: { ...sampleDilemmaPost, id: postId },
      plan,
      formattedText: sampleFormattedText,
      nowIso,
    });

    // Close
    await repo.updateInteractionLifecycle(pub.interactionId, 'CLOSED');

    const update: TelegramUpdate = {
      update_id: 50009,
      message: {
        message_id: 6009,
        date: Math.floor(Date.now() / 1000),
        chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
        text: 'Comment on closed post',
        from: { id: 8009, is_bot: false, first_name: 'George' },
        reply_to_message: {
          message_id: 999,
          date: Math.floor(Date.now() / 1000),
          chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
          forward_from_message_id: pub.telegramMessageId,
        },
      },
    };

    const res = await webhookHandler.handleUpdate(update, undefined, nowIso);
    assert.equal(res.status, 200);
    assert.equal((res.body.discussionResult as any)?.status, 'ignored_closed');

    const currentInt = await repo.getInteraction(pub.interactionId);
    assert.equal(currentInt?.lifecycleState, 'CLOSED');
  });

  // --------------------------------------------------------------------------
  // 10. COMPLETED interaction isolation
  // --------------------------------------------------------------------------
  it('10. COMPLETED interaction cannot be altered by discussion activity', async () => {
    const nowIso = new Date().toISOString();
    const postId = 'post_integ_comp_010';
    const plan = planner.plan({
      id: postId,
      title: 'Completed Isolation Post',
      contentType: 'impossible_dilemma',
      choices: [{ label: 'A', tradeOff: 'T1' }, { label: 'B', tradeOff: 'T2' }],
      pollQuestion: 'Question?',
    });
    const pub = await publisher.publishInteraction({
      post: { ...sampleDilemmaPost, id: postId },
      plan,
      formattedText: sampleFormattedText,
      nowIso,
    });
    const intRecord = (await repo.getInteraction(pub.interactionId))!;
    await closureService.closeInteraction(intRecord, nowIso);

    const update: TelegramUpdate = {
      update_id: 50010,
      message: {
        message_id: 6010,
        date: Math.floor(Date.now() / 1000),
        chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
        text: 'Comment on completed post',
        from: { id: 8010, is_bot: false, first_name: 'Hannah' },
        reply_to_message: {
          message_id: 1000,
          date: Math.floor(Date.now() / 1000),
          chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
          forward_from_message_id: pub.telegramMessageId,
        },
      },
    };

    const res = await webhookHandler.handleUpdate(update, undefined, nowIso);
    assert.equal(res.status, 200);
    assert.equal((res.body.discussionResult as any)?.status, 'ignored_closed');

    const currentInt = await repo.getInteraction(pub.interactionId);
    assert.equal(currentInt?.lifecycleState, 'COMPLETED');
  });

  // --------------------------------------------------------------------------
  // 11. Failed event -> retry -> success
  // --------------------------------------------------------------------------
  it('11. Failed event processing in D1 allows subsequent retry to succeed', async () => {
    const nowIso = new Date().toISOString();
    const updateId = 50011;

    // Simulate failure
    await repo.claimWebhookEvent(updateId, 'message', '{}', nowIso);
    await repo.markWebhookEventFailed(updateId, 'Simulated connection reset', nowIso);

    const failed = await repo.getWebhookEvent(updateId);
    assert.equal(failed?.status, 'failed');

    // Retry claim succeeds
    const retryClaim = await repo.claimWebhookEvent(updateId, 'message', '{}', nowIso);
    assert.equal(retryClaim.claimed, true);
    assert.equal(retryClaim.reason, 'retry_claimed');

    await repo.markWebhookEventProcessed(updateId, nowIso);
    const finalEvent = await repo.getWebhookEvent(updateId);
    assert.equal(finalEvent?.status, 'processed');
  });

  // --------------------------------------------------------------------------
  // 12. Stale publishing -> recovery
  // --------------------------------------------------------------------------
  it('12. Stale publishing lease allows recovery worker to resume and publish', async () => {
    const nowIso = new Date().toISOString();
    const staleTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const postId = 'post_integ_stale_pub_012';
    const interactionId = `int_${postId}`;

    await repo.createPost({
      ...sampleDilemmaPost,
      id: postId,
      status: 'publishing',
      createdAt: staleTime,
      updatedAt: staleTime,
    });

    await repo.createInteraction({
      id: interactionId,
      postId,
      interactionType: 'poll',
      lifecycleState: 'PUBLISHING',
      closeStrategy: 'scheduled',
      targetChatId: CHANNEL_ID,
      createdAt: staleTime,
      updatedAt: staleTime,
    });

    const plan = planner.plan({
      id: postId,
      title: 'Stale Pub Post',
      contentType: 'impossible_dilemma',
      choices: [{ label: 'A', tradeOff: 'T1' }, { label: 'B', tradeOff: 'T2' }],
      pollQuestion: 'Question?',
    });

    // Recovery publisher re-claims stale lease
    const pub = await publisher.publishInteraction({
      post: (await repo.getPost(postId))!,
      plan,
      formattedText: sampleFormattedText,
      nowIso,
    });

    assert.ok(pub.telegramMessageId);
    assert.ok(pub.telegramPollId);

    const finalInt = await repo.getInteraction(interactionId);
    assert.equal(finalInt?.lifecycleState, 'OPEN');
  });

  // --------------------------------------------------------------------------
  // 13. Stale resolving -> recovery
  // --------------------------------------------------------------------------
  it('13. Stale resolving lease allows recovery worker to resume and complete', async () => {
    const nowIso = new Date().toISOString();
    const staleTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const postId = 'post_integ_stale_res_013';
    const interactionId = `int_${postId}`;

    await repo.createPost({
      ...sampleDilemmaPost,
      id: postId,
      status: 'published',
      telegramMessageId: 4401,
      createdAt: staleTime,
      updatedAt: staleTime,
    });

    await repo.createInteraction({
      id: interactionId,
      postId,
      interactionType: 'open_discussion',
      lifecycleState: 'RESOLVING',
      closeStrategy: 'scheduled',
      targetChatId: CHANNEL_ID,
      mainMessageId: 4401,
      createdAt: staleTime,
      updatedAt: staleTime,
    });

    const intRecord = (await repo.getInteraction(interactionId))!;
    const res = await closureService.closeInteraction(intRecord, nowIso);
    assert.equal(res.processed, true);
    assert.ok(res.resultPostMessageId);

    const finalInt = await repo.getInteraction(interactionId);
    assert.equal(finalInt?.lifecycleState, 'COMPLETED');
  });

  // --------------------------------------------------------------------------
  // 14. Cross-interaction isolation
  // --------------------------------------------------------------------------
  it('14. Cross-interaction isolation: activity for Interaction 1 cannot affect Interaction 2', async () => {
    const nowIso = new Date().toISOString();
    const plan1 = planner.plan({
      id: 'post_integ_iso_1',
      title: 'Iso Post 1',
      contentType: 'impossible_dilemma',
      choices: [{ label: 'A', tradeOff: 'T1' }, { label: 'B', tradeOff: 'T2' }],
      pollQuestion: 'Q1?',
    });
    const plan2 = planner.plan({
      id: 'post_integ_iso_2',
      title: 'Iso Post 2',
      contentType: 'impossible_dilemma',
      choices: [{ label: 'A', tradeOff: 'T1' }, { label: 'B', tradeOff: 'T2' }],
      pollQuestion: 'Q2?',
    });

    const pub1 = await publisher.publishInteraction({
      post: { ...sampleDilemmaPost, id: 'post_integ_iso_1' },
      plan: plan1,
      formattedText: sampleFormattedText,
      nowIso,
    });
    const pub2 = await publisher.publishInteraction({
      post: { ...sampleDilemmaPost, id: 'post_integ_iso_2' },
      plan: plan2,
      formattedText: sampleFormattedText,
      nowIso,
    });

    // Send comment strictly for Post 1
    const update1: TelegramUpdate = {
      update_id: 50014,
      message: {
        message_id: 6014,
        date: Math.floor(Date.now() / 1000),
        chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
        text: 'Comment for 1',
        from: { id: 8014, is_bot: false, first_name: 'Ian' },
        reply_to_message: {
          message_id: 1014,
          date: Math.floor(Date.now() / 1000),
          chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
          forward_from_message_id: pub1.telegramMessageId,
        },
      },
    };
    await webhookHandler.handleUpdate(update1, undefined, nowIso);

    const comments1 = await repo.getDiscussionMessagesForInteraction(pub1.interactionId);
    assert.equal(comments1.length, 1);

    const comments2 = await repo.getDiscussionMessagesForInteraction(pub2.interactionId);
    assert.equal(comments2.length, 0);
  });

  // --------------------------------------------------------------------------
  // 15. Invalid Phase 4 content never reaches publishing
  // --------------------------------------------------------------------------
  it('15. Invalid Phase 4 content fails Quality Gate and never reaches D1 publishing', async () => {
    const pipeline = new AutonomousPipelineService(baseEnv);

    // Mock generator to return an invalid dilemma (missing title & choices)
    (pipeline as any).generator.generateDilemma = async () => ({
      id: 'dilemma_invalid_015',
      title: '', // Invalid empty title
      hook: '',
      setup: '',
      choices: [],
      pollQuestion: '',
    });
    (pipeline as any).generator.repairDilemma = (d: any) => d; // Does not fix empty title

    const result = await pipeline.runPipeline('manual', { ignoreCooldown: true });

    assert.equal(result.success, false);
    assert.equal(result.skipped, true);
    assert.ok(result.skipReason?.toLowerCase().includes('quality'));
    assert.equal(result.postGenerated, false);

    // No post or interaction created in D1
    const recent = await repo.getRecentPosts(5);
    assert.equal(recent.length, 0);
  });

  // --------------------------------------------------------------------------
  // 16. Already published interaction is not republished
  // --------------------------------------------------------------------------
  it('16. Already published interaction is not republished on repeated publishInteraction call', async () => {
    const nowIso = new Date().toISOString();
    const postId = 'post_integ_already_pub_016';
    const plan = planner.plan({
      id: postId,
      title: 'Already Pub Post',
      contentType: 'impossible_dilemma',
      choices: [{ label: 'A', tradeOff: 'T1' }, { label: 'B', tradeOff: 'T2' }],
      pollQuestion: 'Question?',
    });

    const pub1 = await publisher.publishInteraction({
      post: { ...sampleDilemmaPost, id: postId },
      plan,
      formattedText: sampleFormattedText,
      nowIso,
    });
    const msgsCount = telegram.history.messages.length;
    const pollsCount = telegram.history.polls.length;

    // Second call on already published interaction
    const pub2 = await publisher.publishInteraction({
      post: { ...sampleDilemmaPost, id: postId },
      plan,
      formattedText: sampleFormattedText,
      nowIso,
    });

    assert.equal(pub1.telegramMessageId, pub2.telegramMessageId);
    assert.equal(pub1.telegramPollId, pub2.telegramPollId);

    // ZERO new Telegram messages or polls
    assert.equal(telegram.history.messages.length, msgsCount);
    assert.equal(telegram.history.polls.length, pollsCount);
  });

  // --------------------------------------------------------------------------
  // 17. Partially published interaction sends only missing components
  // --------------------------------------------------------------------------
  it('17. Partially published interaction sends ONLY missing components on retry', async () => {
    const nowIso = new Date().toISOString();
    const postId = 'post_integ_partial_017';
    const interactionId = `int_${postId}`;
    const mainMsgId = 5501;

    // Main post is already published in Telegram and D1
    await repo.createPost({
      ...sampleDilemmaPost,
      id: postId,
      status: 'partially_published',
      telegramMessageId: mainMsgId,
    });

    await repo.createPublishedMessage({
      id: `msg_${postId}_main`,
      postId,
      telegramMessageId: mainMsgId,
      telegramChatId: CHANNEL_ID,
      messageType: 'main_post',
      parseMode: 'HTML',
      textContent: sampleFormattedText,
      publishedAt: nowIso,
    });

    await repo.createInteraction({
      id: interactionId,
      postId,
      interactionType: 'poll',
      lifecycleState: 'PARTIALLY_PUBLISHED',
      closeStrategy: 'scheduled',
      targetChatId: CHANNEL_ID,
      mainMessageId: mainMsgId,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    const plan = planner.plan({
      id: postId,
      title: 'Partial Post',
      contentType: 'impossible_dilemma',
      choices: [{ label: 'A', tradeOff: 'T1' }, { label: 'B', tradeOff: 'T2' }],
      pollQuestion: 'Question?',
    });

    // Reset Telegram tracking to measure retry calls
    telegram.reset();

    const retryPub = await publisher.publishInteraction({
      post: (await repo.getPost(postId))!,
      plan,
      formattedText: sampleFormattedText,
      nowIso,
    });

    // Reused mainMessageId 5501
    assert.equal(retryPub.telegramMessageId, mainMsgId);
    assert.ok(retryPub.telegramPollId);

    // ONLY the poll was sent to Telegram! ZERO main messages sent!
    assert.equal(telegram.history.messages.length, 0);
    assert.equal(telegram.history.polls.length, 1);

    const finalInt = await repo.getInteraction(interactionId);
    assert.equal(finalInt?.lifecycleState, 'OPEN');
  });

  // --------------------------------------------------------------------------
  // 18. Conflicting Telegram IDs are never silently overwritten
  // --------------------------------------------------------------------------
  it('18. Conflicting Telegram IDs are never silently overwritten in D1', async () => {
    const nowIso = new Date().toISOString();
    const postId = 'post_integ_conflict_018';
    const origId = 5601;

    await repo.createPost({
      ...sampleDilemmaPost,
      id: postId,
      status: 'published',
      telegramMessageId: origId,
    });

    await assert.rejects(
      async () => {
        await repo.updatePostStatus(postId, 'published', {
          telegramMessageId: 9999, // Conflicting ID
        });
      },
      (err: Error) => {
        assert.ok(err.message.includes('Conflict'));
        return true;
      },
    );

    const postInDb = await repo.getPost(postId);
    assert.equal(postInDb?.telegramMessageId, origId);
  });

  // --------------------------------------------------------------------------
  // 19. Cron/manual/browser-trigger execution follows the same idempotency rules
  // --------------------------------------------------------------------------
  it('19. Cron, manual, and browser trigger executions uniformly enforce publishing cooldown & locks', async () => {
    const cooldownEnv: Env = {
      ...baseEnv,
      PUBLISHING_COOLDOWN_MINUTES: '60',
    };

    const pipeline = new AutonomousPipelineService(cooldownEnv);

    // 1. First run via cron publishes post
    const runCron = await pipeline.runPipeline('cron', { nowIso: new Date().toISOString() });
    assert.equal(runCron.success, true);
    assert.equal(runCron.postGenerated, true);

    // 2. Second immediate run via browser trigger: blocked by cooldown
    const runBrowser = await pipeline.runPipeline('browser', { nowIso: new Date().toISOString() });
    assert.equal(runBrowser.success, true);
    assert.equal(runBrowser.skipped, true);
    assert.equal(runBrowser.cooldownActive, true);
    assert.equal(runBrowser.postGenerated, false);

    // 3. Third run via manual trigger without ignoreCooldown: blocked by cooldown
    const runManual = await pipeline.runPipeline('manual', { nowIso: new Date().toISOString() });
    assert.equal(runManual.success, true);
    assert.equal(runManual.skipped, true);
    assert.equal(runManual.cooldownActive, true);
    assert.equal(runManual.postGenerated, false);
  });

  // --------------------------------------------------------------------------
  // 20. Full regression path with all major Phase 5 components enabled
  // --------------------------------------------------------------------------
  it('20. End-to-end full regression path: Pipeline -> D1 -> Publisher -> Webhook -> Closure -> Reveal', async () => {
    const pipeline = new AutonomousPipelineService(baseEnv);

    const runResult = await pipeline.runPipeline('cron', {
      ignoreCooldown: true,
      nowIso: new Date().toISOString(),
    });

    assert.equal(runResult.success, true);
    assert.equal(runResult.postGenerated, true);
    assert.ok(runResult.postId);
    assert.ok(runResult.interactionId);

    // Verify interaction is OPEN
    const interaction = await repo.getInteraction(runResult.interactionId!);
    assert.equal(interaction?.lifecycleState, 'OPEN');

    // Deliver community discussion comment
    const update: TelegramUpdate = {
      update_id: 50020,
      message: {
        message_id: 6020,
        date: Math.floor(Date.now() / 1000),
        chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
        text: 'Full integration comment!',
        from: { id: 8020, is_bot: false, first_name: 'Jessica' },
        reply_to_message: {
          message_id: 1020,
          date: Math.floor(Date.now() / 1000),
          chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
          forward_from_message_id: runResult.telegramMessageId,
        },
      },
    };
    const hookRes = await webhookHandler.handleUpdate(update);
    assert.equal(hookRes.status, 200);
    assert.equal((hookRes.body.discussionResult as any)?.status, 'discussion_recorded');

    // Run closure and reveal
    const closeRes = await closureService.closeInteraction(interaction!);
    assert.equal(closeRes.processed, true);
    assert.ok(closeRes.resultPostMessageId);

    // Interaction reaches COMPLETED
    const finalInt = await repo.getInteraction(runResult.interactionId!);
    assert.equal(finalInt?.lifecycleState, 'COMPLETED');
  });
});

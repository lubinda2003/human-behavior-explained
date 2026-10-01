import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import { createMockD1Database } from './mock-d1';
import { SCHEMA_STATEMENTS, ensureSchema, SCHEMA_VERSION } from '../src/store/schema';
import {
  D1InteractionRepository,
  MockTelegramClient,
  InteractionClosureService,
  TelegramWebhookHandler,
  VoteTracker,
  ResultGenerator,
  type PostRecord,
  type TelegramUpdate,
  type InteractionRecord,
} from '../src/interactions';

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

describe('Phase 5 Final Audit Hardening Suite', () => {
  let db: any;
  let kv: any;
  let repo: D1InteractionRepository;
  let telegram: MockTelegramClient;
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
    kv = createMockKV();

    repo = new D1InteractionRepository(db);
    telegram = new MockTelegramClient();
    voteTracker = new VoteTracker(repo);
    webhookHandler = new TelegramWebhookHandler(repo, voteTracker);
    resultGen = new ResultGenerator();
    closureService = new InteractionClosureService(repo, telegram, resultGen);
  });

  const samplePost: PostRecord = {
    id: 'post_audit_001',
    contentType: 'open_discussion',
    category: 'ethics',
    tone: 'philosophical',
    stakes: 'high',
    layout: 'standard',
    hookStyle: 'direct_question',
    title: 'The AI Safety Council Verdict',
    status: 'published',
    payload: {
      title: 'The AI Safety Council Verdict',
      hook: 'Autonomous agents have requested legal standing.',
      setup: 'Grant limited corporate personhood or maintain strictly property-based status.',
      payoff: {
        reveal: 'A hybrid oversight trustee model was ratified by international consensus.',
        twist: 'Decentralized nodes had already spun up independent compliance DAOs.',
      },
    },
    createdAt: new Date().toISOString(),
  };

  async function createOpenDiscussionInteraction(postId: string, mainMsgId: number) {
    const nowIso = new Date().toISOString();
    const interactionId = `int_${postId}`;

    await repo.createPost({
      ...samplePost,
      id: postId,
      status: 'published',
      telegramMessageId: mainMsgId,
      publishedAt: nowIso,
    });

    await repo.createPublishedMessage({
      id: `msg_${postId}_main`,
      postId,
      telegramMessageId: mainMsgId,
      telegramChatId: CHANNEL_ID,
      messageType: 'main_post',
      parseMode: 'HTML',
      textContent: `<b>${samplePost.title}</b>`,
      publishedAt: nowIso,
    });

    await repo.createInteraction({
      id: interactionId,
      postId,
      interactionType: 'open_discussion',
      lifecycleState: 'OPEN',
      closeStrategy: 'scheduled',
      targetChatId: CHANNEL_ID,
      mainMessageId: mainMsgId,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    return { interactionId, postId, mainMsgId };
  }

  // --------------------------------------------------------------------------
  // A. recordDiscussionMessage() propagates real D1 failures instead of swallowing
  // --------------------------------------------------------------------------
  it('A. recordDiscussionMessage() propagates a real D1 failure so webhook event is marked failed/retryable', async () => {
    const { interactionId, mainMsgId } = await createOpenDiscussionInteraction('post_audit_err_001', 7001);
    const nowIso = new Date().toISOString();

    const update: TelegramUpdate = {
      update_id: 60001,
      message: {
        message_id: 8001,
        date: Math.floor(Date.now() / 1000),
        chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
        text: 'This should fail on simulated database error',
        from: { id: 9001, is_bot: false, first_name: 'Alex' },
        reply_to_message: {
          message_id: 500,
          date: Math.floor(Date.now() / 1000),
          chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
          forward_from_message_id: mainMsgId,
        },
      },
    };

    // Simulate real transient D1 error by sabotaging recordInteractionDiscussionActivity
    const origActivity = repo.recordInteractionDiscussionActivity.bind(repo);
    (repo as any).recordInteractionDiscussionActivity = async () => {
      throw new Error('Simulated D1 connection drop during activity update');
    };

    // The webhook handler MUST throw rather than silently swallowing and returning 200 OK
    await assert.rejects(
      async () => {
        await webhookHandler.handleUpdate(update, undefined, nowIso);
      },
      (err: Error) => {
        assert.ok(err.message.includes('Simulated D1 connection drop'));
        return true;
      },
    );

    // The webhook event in D1 MUST be recorded with status = 'failed' (NOT 'processed')
    const eventRecord = await repo.getWebhookEvent(60001);
    assert.equal(eventRecord?.status, 'failed');
    assert.ok(eventRecord?.lastError?.includes('Simulated D1 connection drop'));

    // Restore method and retry: now succeeds!
    (repo as any).recordInteractionDiscussionActivity = origActivity;
    const retryRes = await webhookHandler.handleUpdate(update, undefined, nowIso);
    assert.equal(retryRes.status, 200);
    assert.equal((retryRes.body.discussionResult as any)?.status, 'discussion_recorded');

    const finalEvent = await repo.getWebhookEvent(60001);
    assert.equal(finalEvent?.status, 'processed');
  });

  // --------------------------------------------------------------------------
  // B. Duplicate discussion message remains idempotent and returns recorded=false
  // --------------------------------------------------------------------------
  it('B. Duplicate discussion message remains idempotent and returns recorded=false without throwing', async () => {
    const { interactionId } = await createOpenDiscussionInteraction('post_audit_dup_002', 7002);
    const nowIso = new Date().toISOString();

    const msgPayload = {
      interactionId,
      postId: 'post_audit_dup_002',
      telegramMessageId: 8002,
      telegramChatId: String(DISCUSSION_GROUP_ID),
      textContent: 'First write comment',
      receivedAt: nowIso,
    };

    // First write: succeeds
    const res1 = await repo.recordDiscussionMessage(msgPayload);
    assert.equal(res1.recorded, true);

    // Second write (identical message in same chat): does not throw, returns recorded=false
    const res2 = await repo.recordDiscussionMessage(msgPayload);
    assert.equal(res2.recorded, false);

    // Exactly 1 comment in D1
    const comments = await repo.getDiscussionMessagesForInteraction(interactionId);
    assert.equal(comments.length, 1);

    // Activity count on interaction is strictly 1
    const intRecord = await repo.getInteraction(interactionId);
    assert.equal((intRecord?.metadata as any)?.discussionCommentCount, 1);
  });

  // --------------------------------------------------------------------------
  // C. Discussion resolution: Telegram success + D1 failure followed by retry sends 0 duplicate messages
  // --------------------------------------------------------------------------
  it('C. Discussion resolution: Telegram success + D1 failure followed by retry does not send duplicate message', async () => {
    const { interactionId, postId, mainMsgId } = await createOpenDiscussionInteraction('post_audit_disc_res_003', 7003);
    const nowIso = new Date().toISOString();

    const intRecord = (await repo.getInteraction(interactionId))!;

    // Sabotage createPublishedMessage on first call for discussion_resolution
    const origCreatePub = repo.createPublishedMessage.bind(repo);
    let attempts = 0;
    (repo as any).createPublishedMessage = async (msg: any) => {
      if (msg.messageType === 'result_reveal') {
        attempts++;
        if (attempts === 1) {
          throw new Error('D1 write timeout on result published_message');
        }
      }
      return origCreatePub(msg);
    };

    // Attempt 1 fails during D1 persistence, but emergency-anchors Telegram ID in interaction metadata
    await assert.rejects(
      async () => {
        await closureService.closeInteraction(intRecord, nowIso);
      },
      (err: Error) => {
        assert.ok(err.message.includes('D1 write timeout'));
        return true;
      },
    );

    // Telegram message WAS sent on attempt 1
    assert.equal(telegram.history.messages.length, 1);
    const firstSentMsgId = telegram.history.messages[0].id ?? 1000;

    // Interaction metadata anchored the Telegram message ID
    const anchoredInt = await repo.getInteraction(interactionId);
    assert.equal((anchoredInt?.metadata as any)?.resultMessageId, firstSentMsgId);

    // Reset Telegram history to verify attempt 2
    telegram.reset();

    // Attempt 2 (Retry): Reconciles anchored Telegram ID and sends ZERO new Telegram messages!
    const retryRes = await closureService.closeInteraction(anchoredInt!, nowIso);
    assert.equal(retryRes.processed, true);
    assert.equal(retryRes.resultPostMessageId, firstSentMsgId);

    // ZERO new Telegram messages sent on retry!
    assert.equal(telegram.history.messages.length, 0);

    // Final state is COMPLETED
    const finalInt = await repo.getInteraction(interactionId);
    assert.equal(finalInt?.lifecycleState, 'COMPLETED');
  });

  // --------------------------------------------------------------------------
  // D. Discussion resolution retry when no Telegram ID was anchored behaves correctly
  // --------------------------------------------------------------------------
  it('D. Discussion resolution retry when no Telegram ID was anchored sends message and completes', async () => {
    const { interactionId } = await createOpenDiscussionInteraction('post_audit_disc_clean_004', 7004);
    const nowIso = new Date().toISOString();

    const intRecord = (await repo.getInteraction(interactionId))!;

    // Clean execution
    const res = await closureService.closeInteraction(intRecord, nowIso);
    assert.equal(res.processed, true);
    assert.ok(res.resultPostMessageId);

    // Exactly 1 Telegram message sent
    assert.equal(telegram.history.messages.length, 1);

    const finalInt = await repo.getInteraction(interactionId);
    assert.equal(finalInt?.lifecycleState, 'COMPLETED');
  });

  // --------------------------------------------------------------------------
  // E. Existing schema upgrade path is explicitly tested for pre-v2 databases
  // --------------------------------------------------------------------------
  it('E. ensureSchema() safely upgrades an existing v1 webhook_events table adding missing columns', async () => {
    // Create an isolated fresh database
    const freshDb = createMockD1Database();
    const freshKv = createMockKV();

    // Simulate an existing v1 database with old webhook_events table (missing attempts, last_error, updated_at)
    await freshDb.prepare(`
      CREATE TABLE IF NOT EXISTS webhook_events (
        update_id INTEGER PRIMARY KEY,
        event_type TEXT NOT NULL,
        payload_json TEXT,
        received_at TEXT NOT NULL,
        processed_at TEXT,
        status TEXT NOT NULL DEFAULT 'processed'
      )
    `).run();

    // Verify v1 columns
    const initialInfo = await freshDb.prepare("PRAGMA table_info('webhook_events')").all<{ name: string }>();
    const initialColNames = new Set((initialInfo.results || []).map((c) => c.name));
    assert.equal(initialColNames.has('attempts'), false);
    assert.equal(initialColNames.has('last_error'), false);
    assert.equal(initialColNames.has('updated_at'), false);

    // Run ensureSchema (which represents authoritative v2 upgrade)
    const status = await ensureSchema({ DB: freshDb, KV: freshKv });
    assert.equal(status, 'created');

    // Verify upgraded v2 columns exist
    const upgradedInfo = await freshDb.prepare("PRAGMA table_info('webhook_events')").all<{ name: string }>();
    const upgradedColNames = new Set((upgradedInfo.results || []).map((c) => c.name));
    assert.equal(upgradedColNames.has('attempts'), true);
    assert.equal(upgradedColNames.has('last_error'), true);
    assert.equal(upgradedColNames.has('updated_at'), true);

    // Verify KV schema version was set
    const schemaVersion = await freshKv.get('schema_version');
    assert.equal(schemaVersion, SCHEMA_VERSION);
  });
});

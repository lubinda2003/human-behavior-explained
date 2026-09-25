import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createMockD1Database } from './mock-d1';
import { SCHEMA_STATEMENTS } from '../src/store/schema';
import {
  D1InteractionRepository,
  InteractionPlanner,
  TelegramInteractionPublisher,
  ResultGenerator,
  InteractionClosureService,
  MockTelegramClient,
  type PostRecord,
} from '../src/interactions';
import {
  AutonomousPipelineService,
  DEFAULT_PUBLISHING_COOLDOWN_MINUTES,
  getPublishingCooldownMinutes,
} from '../src/pipeline/autonomous-pipeline';
import type { Env } from '../src/env';

describe('Publishing Cadence & Cooldown Decoupling', () => {
  let db: any;
  let repo: D1InteractionRepository;
  let telegram: MockTelegramClient;
  let planner: InteractionPlanner;
  let publisher: TelegramInteractionPublisher;
  let resultGen: ResultGenerator;
  let closureService: InteractionClosureService;
  let baseEnv: Env;

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
    resultGen = new ResultGenerator();
    closureService = new InteractionClosureService(repo, telegram, resultGen);

    const mockKv = new Map<string, string>();
    baseEnv = {
      DB: db,
      KV: {
        get: async (k: string) => mockKv.get(k) ?? null,
        put: async (k: string, v: string) => {
          mockKv.set(k, v);
        },
        delete: async (k: string) => {
          mockKv.delete(k);
        },
      } as any,
      ARCHIVE: {} as any,
      GEMINI_MODEL: 'gemini-2.5-flash',
      GEMINI_API_KEY: 'mock_gemini_key',
      DISCUSSION_GROUP_LINKED: 'false',
      TELEGRAM_BOT_TOKEN: 'mock_token',
      TELEGRAM_CHANNEL_ID: CHANNEL_ID,
      PUBLISHING_ENABLED: 'false',
      DRY_RUN: 'false',
      // Default cooldown will be used if unset
    };
  });

  it('1. Verifies default cooldown configuration is 120 minutes (2 hours)', () => {
    assert.equal(DEFAULT_PUBLISHING_COOLDOWN_MINUTES, 120);
    assert.equal(getPublishingCooldownMinutes(baseEnv), 120);

    // Custom configuration
    assert.equal(getPublishingCooldownMinutes({ ...baseEnv, PUBLISHING_COOLDOWN_MINUTES: '60' }), 60);
    assert.equal(getPublishingCooldownMinutes({ ...baseEnv, PUBLISHING_COOLDOWN_MINUTES: '0' }), 0);
    assert.equal(getPublishingCooldownMinutes({ ...baseEnv, PUBLISHING_COOLDOWN_MINUTES: 'invalid' }), 120);
  });

  it('2. Fresh content is skipped while cooldown is active', async () => {
    const pipeline = new AutonomousPipelineService(baseEnv);

    // T=0: Publish initial post
    const t0 = new Date('2026-09-25T10:00:00.000Z').toISOString();
    const result1 = await pipeline.runPipeline('cron', { nowIso: t0 });

    assert.equal(result1.success, true);
    assert.equal(result1.postGenerated, true);
    assert.ok(result1.postId);

    // Verify initial post is recorded in D1 as published
    const postCountBefore = await db.prepare('SELECT COUNT(*) as cnt FROM posts').first('cnt');
    assert.equal(postCountBefore, 1);

    // T=30m (30 minutes later, e.g. next cron tick): Cooldown is 120m, so only 30m elapsed
    const t30m = new Date('2026-09-25T10:30:00.000Z').toISOString();
    const result2 = await pipeline.runPipeline('cron', { nowIso: t30m });

    // Verify pipeline finishes successfully, but skips fresh generation
    assert.equal(result2.success, true);
    assert.equal(result2.skipped, true);
    assert.equal(result2.cooldownActive, true);
    assert.equal(result2.postGenerated, false);
    assert.match(result2.skipReason!, /Publishing cooldown active/);
    assert.equal(result2.cooldownMinutes, 120);
    assert.ok(result2.remainingCooldownMs! > 0);

    // Verify no new post was inserted into D1
    const postCountAfter = await db.prepare('SELECT COUNT(*) as cnt FROM posts').first('cnt');
    assert.equal(postCountAfter, 1);
  });

  it('3. Fresh content is generated after cooldown expires', async () => {
    const pipeline = new AutonomousPipelineService(baseEnv);

    // T=0: Publish initial post
    const t0 = new Date('2026-09-25T10:00:00.000Z').toISOString();
    const result1 = await pipeline.runPipeline('cron', { nowIso: t0 });
    assert.equal(result1.postGenerated, true);

    // T=125m (125 minutes later): 120m cooldown has elapsed
    const t125m = new Date('2026-09-25T12:05:00.000Z').toISOString();
    const result2 = await pipeline.runPipeline('cron', { nowIso: t125m });

    assert.equal(result2.success, true);
    assert.equal(result2.postGenerated, true);
    assert.ok(result2.postId);
    assert.notEqual(result2.postId, result1.postId);

    // Verify both posts exist in D1
    const postCount = await db.prepare('SELECT COUNT(*) as cnt FROM posts').first('cnt');
    assert.equal(postCount, 2);
  });

  it('4. Interaction closures still execute when fresh publishing is skipped due to cooldown', async () => {
    // 1. Publish an initial scenario that will expire
    const tMinus120m = new Date('2026-09-25T08:00:00.000Z').toISOString();
    const tMinus10m = new Date('2026-09-25T10:20:00.000Z').toISOString();
    const tNow = new Date('2026-09-25T10:30:00.000Z').toISOString();

    const parentPost: PostRecord = {
      id: 'post_due_poll_01',
      contentType: 'impossible_dilemma',
      category: 'moral',
      tone: 'tense',
      stakes: 'world-scale',
      layout: 'stacked',
      hookStyle: 'statement',
      title: 'Due Interaction Test',
      status: 'draft',
      payload: {
        title: 'Due Interaction Test',
        choices: [{ label: 'Option A' }, { label: 'Option B' }],
        payoff: { reveal: 'Outcome reveal test' },
      },
      createdAt: tMinus120m,
    };

    const plan = planner.plan(
      {
        id: parentPost.id,
        title: parentPost.title,
        choices: [{ label: 'Option A' }, { label: 'Option B' }],
      },
      { customDurationSeconds: 6600 }, // 110 minutes duration -> closes at 10:20 (10 mins before 10:30)
    );

    const pub = await publisher.publishInteraction({
      post: parentPost,
      plan,
      formattedText: 'Due interaction scenario',
      nowIso: tMinus120m,
    });

    // Manually ensure closes_at is in the past (10:20)
    await db
      .prepare('UPDATE interactions SET closes_at = ? WHERE id = ?')
      .bind(tMinus10m, pub.interactionId)
      .run();

    // 2. Also seed a second recent post published just 15 minutes ago to keep fresh publishing on cooldown!
    const tMinus15m = new Date('2026-09-25T10:15:00.000Z').toISOString();
    await repo.createPost({
      id: 'post_recent_fresh_02',
      contentType: 'impossible_dilemma',
      category: 'survival',
      tone: 'urgent',
      stakes: 'personal',
      layout: 'stacked',
      hookStyle: 'statement',
      title: 'Recent Fresh Post',
      status: 'published',
      payload: {},
      publishedAt: tMinus15m,
      createdAt: tMinus15m,
    });

    const pipeline = new AutonomousPipelineService(baseEnv);

    // Run pipeline at tNow (10:30):
    // - Cooldown from post_recent_fresh_02 (10:15) is 15 minutes elapsed < 120 minutes -> fresh content MUST be skipped.
    // - BUT int_post_due_poll_01 (due at 10:20) MUST be closed and resolved!
    const result = await pipeline.runPipeline('cron', { nowIso: tNow });

    assert.equal(result.success, true);
    assert.equal(result.skipped, true);
    assert.equal(result.cooldownActive, true);
    assert.equal(result.postGenerated, false);

    // Verify due interaction was closed!
    assert.equal(result.closedInteractionsCount, 1);
    const updatedInt = await repo.getInteraction(pub.interactionId);
    assert.ok(updatedInt);
    assert.equal(updatedInt.lifecycleState, 'COMPLETED');
  });

  it('5. Connected continuation logic is preserved once cooldown elapses', async () => {
    const env: Env = {
      ...baseEnv,
      ENABLE_EPISODE_CONTINUATION: 'true',
    };

    // 1. Create and publish Episode 1 as a poll at T=0
    const t0 = new Date('2026-09-25T08:00:00.000Z').toISOString();
    const ep1Post: PostRecord = {
      id: 'post_arc_ep1',
      contentType: 'impossible_dilemma',
      category: 'moral',
      tone: 'tense',
      stakes: 'world-scale',
      layout: 'stacked',
      hookStyle: 'statement',
      title: 'Arc Episode 1',
      status: 'draft',
      payload: {
        title: 'Arc Episode 1',
        choices: [
          { label: 'Vent Gas', tradeOff: 'Lab destroyed' },
          { label: 'Seal Doors', tradeOff: '3 trapped' },
        ],
        payoff: { reveal: 'Vent gas spared the crew' },
      },
      createdAt: t0,
    };

    const ep1Plan = planner.plan({
      id: ep1Post.id,
      title: ep1Post.title,
      choices: [
        { label: 'Vent Gas', tradeOff: 'Lab destroyed' },
        { label: 'Seal Doors', tradeOff: '3 trapped' },
      ],
    });

    const ep1Pub = await publisher.publishInteraction({
      post: ep1Post,
      plan: ep1Plan,
      formattedText: 'Episode 1 text',
      nowIso: t0,
    });

    // 2. Cast vote on Episode 1
    const voter = await repo.upsertUser({ telegramUserId: 888, username: 'arc_voter', nowIso: t0 });
    await repo.applyVoteUpdate({
      pollId: `poll_${ep1Post.id}`,
      interactionId: ep1Pub.interactionId,
      userId: voter.id,
      telegramUserId: 888,
      newOptionIndices: [0],
      nowIso: t0,
    });

    // 3. Close Episode 1 at T=120m
    const t120m = new Date('2026-09-25T10:00:00.000Z').toISOString();
    const int1 = await repo.getInteraction(ep1Pub.interactionId);
    await closureService.closeInteraction(int1!, t120m);

    // 4. Run pipeline at T=125m: Cooldown (120m) has elapsed (125m elapsed since T=0)
    const pipeline = new AutonomousPipelineService(env);
    const t125m = new Date('2026-09-25T10:05:00.000Z').toISOString();
    const ep2Res = await pipeline.runPipeline('cron', { nowIso: t125m });

    assert.equal(ep2Res.success, true);
    assert.equal(ep2Res.postGenerated, true);
    assert.equal(ep2Res.isContinuation, true);
    assert.equal(ep2Res.parentPostId, ep1Post.id);

    // Verify D1 linkage
    const ep2Post = await repo.getPost(ep2Res.postId!);
    assert.ok(ep2Post);
    assert.equal(ep2Post.parentPostId, ep1Post.id);
  });

  it('6. ignoreCooldown allows manual bypass of cooldown when explicitly requested', async () => {
    const pipeline = new AutonomousPipelineService(baseEnv);

    // T=0: Publish post 1
    const t0 = new Date('2026-09-25T10:00:00.000Z').toISOString();
    const res1 = await pipeline.runPipeline('cron', { nowIso: t0 });
    assert.equal(res1.postGenerated, true);

    // T=10m: With ignoreCooldown: true, it publishes immediately
    const t10m = new Date('2026-09-25T10:10:00.000Z').toISOString();
    const res2 = await pipeline.runPipeline('manual_override', { nowIso: t10m, ignoreCooldown: true });

    assert.equal(res2.success, true);
    assert.equal(res2.postGenerated, true);
    assert.ok(res2.postId);
    assert.notEqual(res2.postId, res1.postId);
  });
});

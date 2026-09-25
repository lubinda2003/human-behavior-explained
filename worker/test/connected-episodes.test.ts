import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createMockD1Database } from './mock-d1';
import { SCHEMA_STATEMENTS } from '../src/store/schema';
import {
  D1InteractionRepository,
  InteractionPlanner,
  TelegramInteractionPublisher,
  VoteTracker,
  ResultGenerator,
  InteractionClosureService,
  MockTelegramClient,
  type PostRecord,
} from '../src/interactions';
import { DilemmaGenerator } from '../../src/pipeline/dilemmas/generator';
import { AutonomousPipelineService } from '../src/pipeline/autonomous-pipeline';
import type { Env } from '../src/env';

describe('Connected Multi-Stage Pick Your Fate Experience', () => {
  let db: any;
  let repo: D1InteractionRepository;
  let telegram: MockTelegramClient;
  let planner: InteractionPlanner;
  let publisher: TelegramInteractionPublisher;
  let voteTracker: VoteTracker;
  let resultGen: ResultGenerator;
  let closureService: InteractionClosureService;
  let generator: DilemmaGenerator;

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
    voteTracker = new VoteTracker(repo);
    resultGen = new ResultGenerator();
    closureService = new InteractionClosureService(repo, telegram, resultGen);
    generator = new DilemmaGenerator();
  });

  it('1. Standalone generation remains unchanged when no continuation context is supplied', async () => {
    const dilemma = generator.generateProceduralDilemma({
      category: 'survival',
      format: 'survival_scenario',
    });

    assert.ok(dilemma.title);
    assert.ok(dilemma.scenario);
    assert.ok(dilemma.choices.length >= 2);
    assert.equal(dilemma.title.startsWith('Aftermath:'), false);
    assert.equal(dilemma.qc?.isValid, true);
  });

  it('2. Retrieves previous-result context accurately from completed interactions', async () => {
    // 1. Create and publish initial parent scenario
    const parentPost: PostRecord = {
      id: 'post_airlock_ep1',
      contentType: 'survival_choice',
      category: 'survival',
      tone: 'tense',
      stakes: 'world-scale',
      layout: 'stacked',
      hookStyle: 'statement',
      title: 'Sector 7 Airlock Meltdown',
      status: 'published',
      payload: {
        title: 'Sector 7 Airlock Meltdown',
        hook: 'Oxygen scrubber pressure hits critical threshold.',
        scenario: 'You have 60 seconds to vent pressure or purge auxiliary tanks.',
        choices: [
          { label: 'Vent Pressure to Research Lab', tradeOff: 'Flora destroyed' },
          { label: 'Purge Auxiliary Tanks', tradeOff: 'Lost backup oxygen' },
        ],
        pollQuestion: 'Which protocol do you execute?',
        payoff: {
          reveal: 'Purging tanks prevented structural explosion but cut station reserves by half.',
          surprisingOutcome: 'Research lab was spared, keeping rare biotics alive.',
        },
      },
      createdAt: new Date(Date.now() - 10000).toISOString(),
    };

    const plan = planner.plan({
      id: parentPost.id,
      title: parentPost.title,
      choices: [
        { label: 'Vent Pressure to Research Lab', tradeOff: 'Flora destroyed' },
        { label: 'Purge Auxiliary Tanks', tradeOff: 'Lost backup oxygen' },
      ],
    });

    const pub = await publisher.publishInteraction({
      post: parentPost,
      plan,
      formattedText: 'Airlock scenario text',
    });

    // 2. Upsert user and cast votes: 1 for option 1 ('Purge Auxiliary Tanks')
    const user = await repo.upsertUser({ telegramUserId: 101, username: 'testuser' });
    await repo.applyVoteUpdate({
      pollId: `poll_${parentPost.id}`,
      interactionId: pub.interactionId,
      userId: user.id,
      telegramUserId: 101,
      newOptionIndices: [1],
    });

    // 3. Close interaction and generate verdict
    const interaction = await repo.getInteraction(pub.interactionId);
    assert.ok(interaction);
    const closeRes = await closureService.closeInteraction(interaction!);
    assert.equal(closeRes.processed, true);

    // 4. Retrieve completed continuation context
    const continuation = await repo.getLatestCompletedContinuation();
    assert.ok(continuation);
    assert.equal(continuation.postId, 'post_airlock_ep1');
    assert.equal(continuation.postTitle, 'Sector 7 Airlock Meltdown');
    assert.equal(continuation.winningOptionText, 'Purge Auxiliary Tanks');
    assert.equal(continuation.winningOptionIndex, 1);
    assert.equal(continuation.totalParticipants, 1);
    assert.ok(continuation.revealText.includes('Purging tanks prevented structural explosion'));
  });

  it('3. Continuation generator receives context and builds escalating follow-up scenario', async () => {
    const continuationContext = {
      parentPostId: 'post_airlock_ep1',
      previousTitle: 'Sector 7 Airlock Meltdown',
      category: 'survival',
      winningOptionText: 'Purge Auxiliary Tanks',
      winningPercentage: 80,
      revealText: 'Purging tanks prevented structural explosion but cut station reserves by half.',
      payoff: {
        surprisingOutcome: 'The sudden tank purge caused auxiliary valves to freeze.',
      },
      telegramMessageId: 1001,
    };

    const nextDilemma = generator.generateProceduralDilemma({
      category: 'survival',
      continuation: continuationContext,
    });

    assert.ok(nextDilemma.title.includes('Sector 7 Airlock Meltdown'));
    assert.ok(nextDilemma.hook.includes('Purge Auxiliary Tanks'));
    assert.ok(nextDilemma.hook.includes('80%'));
    assert.ok(nextDilemma.scenario.includes('Purge Auxiliary Tanks'));
    assert.equal(nextDilemma.choices.length, 2);
    assert.equal(nextDilemma.qc?.isValid, true);
  });

  it('4. Preserves lineage (parent_post_id) and sends Telegram reply_to_message_id in pipeline', async () => {
    const mockKv = new Map<string, string>();
    const env: Env = {
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
      ENABLE_EPISODE_CONTINUATION: 'true',
      PUBLISHING_COOLDOWN_MINUTES: '0',
    };

    // Episode 1: Standalone post
    const pipeline = new AutonomousPipelineService(env);
    const ep1Result = await pipeline.runPipeline('cron', { forceStandalone: true });

    assert.equal(ep1Result.success, true);
    assert.ok(ep1Result.postId);
    assert.equal(ep1Result.isContinuation, false);

    // Vote and close Episode 1
    const intRecord = await repo.getInteraction(ep1Result.interactionId!);
    assert.ok(intRecord);
    const voter = await repo.upsertUser({ telegramUserId: 991, username: 'voter_991' });
    await repo.applyVoteUpdate({
      pollId: `poll_${ep1Result.postId}`,
      interactionId: ep1Result.interactionId!,
      userId: voter.id,
      telegramUserId: 991,
      newOptionIndices: [0],
    });

    const closeRes = await closureService.closeInteraction(intRecord!);
    assert.equal(closeRes.processed, true);

    // Episode 2: Continuation post
    const ep2Result = await pipeline.runPipeline('cron', { forceContinuation: true });

    assert.equal(ep2Result.success, true);
    assert.equal(ep2Result.isContinuation, true);
    assert.equal(ep2Result.parentPostId, ep1Result.postId);

    // Verify D1 record stores parent_post_id
    const ep2Post = await repo.getPost(ep2Result.postId!);
    assert.ok(ep2Post);
    assert.equal(ep2Post.parentPostId, ep1Result.postId);

    // Verify Telegram publication recorded the reply_to_message_id
    const ep2MainMsg = telegram.history.messages.find((m) => m.reply_to_message_id === ep1Result.telegramMessageId);
    assert.ok(ep2MainMsg, 'Episode 2 main message was published as a reply to Episode 1');
  });

  it('5. hasChildPost correctly prevents duplicate automatic continuation chains', async () => {
    const parentPostId = 'post_parent_test_01';
    await repo.createPost({
      id: parentPostId,
      contentType: 'impossible_dilemma',
      category: 'moral',
      tone: 'tense',
      stakes: 'personal',
      layout: 'stacked',
      hookStyle: 'statement',
      title: 'Parent Scenario',
      status: 'published',
      payload: {},
      createdAt: new Date().toISOString(),
    });

    assert.equal(await repo.hasChildPost(parentPostId), false);

    // Create child post
    await repo.createPost({
      id: 'post_child_test_01',
      contentType: 'twist_reveal',
      category: 'moral',
      tone: 'tense',
      stakes: 'personal',
      layout: 'stacked',
      hookStyle: 'statement',
      title: 'Child Scenario',
      status: 'published',
      payload: {},
      parentPostId,
      createdAt: new Date().toISOString(),
    });

    assert.equal(await repo.hasChildPost(parentPostId), true);
  });
});

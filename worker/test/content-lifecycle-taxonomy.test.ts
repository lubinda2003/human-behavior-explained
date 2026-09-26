import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createMockD1Database } from './mock-d1';
import { SCHEMA_STATEMENTS } from '../src/store/schema';
import {
  CONTENT_TAXONOMY,
  isFreshContentFormat,
  isDerivedContentFormat,
  getFreshContentFormats,
  getDerivedContentFormats,
  mapContentTypeToFormat,
} from '../src/taxonomy';
import { CONTENT_TYPES } from '../src/config';
import { planVariety } from '../src/variety/planner';
import { AutonomousPipelineService } from '../src/pipeline/autonomous-pipeline';
import {
  D1InteractionRepository,
  InteractionClosureService,
  ResultGenerator,
  MockTelegramClient,
  type PostRecord,
  type PollRecord,
  type PollOptionRecord,
  type InteractionRecord,
} from '../src/interactions';
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

describe('Phase 1: Content Taxonomy & Lifecycle Alignment', () => {
  let db: any;
  let kv: any;
  let baseEnv: Env;
  let repo: D1InteractionRepository;
  let telegram: MockTelegramClient;
  let resultGen: ResultGenerator;
  let closureService: InteractionClosureService;

  beforeEach(async () => {
    db = createMockD1Database();
    for (const sql of SCHEMA_STATEMENTS) {
      await db.prepare(sql).run();
    }
    kv = createMockKV();
    repo = new D1InteractionRepository(db);
    telegram = new MockTelegramClient();
    resultGen = new ResultGenerator();
    closureService = new InteractionClosureService(repo, telegram, resultGen);

    baseEnv = {
      DB: db,
      KV: kv,
      ARCHIVE: {} as any,
      TELEGRAM_BOT_TOKEN: 'test_token',
      TELEGRAM_CHANNEL_ID: '@pickyourfate_test',
      TELEGRAM_WEBHOOK_SECRET: 'test_secret',
      GEMINI_API_KEY: 'test_key',
      GEMINI_MODEL: 'gemini-2.5-flash',
      PUBLISHING_ENABLED: 'false',
      DRY_RUN: 'true',
      DISCUSSION_GROUP_LINKED: 'true',
      ENABLE_EPISODE_CONTINUATION: 'true',
      PUBLISHING_COOLDOWN_MINUTES: '0',
    };
  });

  describe('1. Taxonomy Distinction: Fresh vs Derived', () => {
    it('classifies result_reveal strictly as DERIVED', () => {
      assert.equal(CONTENT_TAXONOMY.result_reveal.origin, 'derived');
      assert.equal(isDerivedContentFormat('result_reveal'), true);
      assert.equal(isFreshContentFormat('result_reveal'), false);
    });

    it('classifies all 11 genuine content formats strictly as FRESH', () => {
      const freshFormats = [
        'impossible_dilemma',
        'survival_scenario',
        'mini_mystery',
        'strategy_challenge',
        'prediction',
        'versus_battle',
        'chaotic_funny',
        'future_tech',
        'brain_logic',
        'hot_take',
        'interactive_minigame',
      ];

      for (const format of freshFormats) {
        assert.equal(
          CONTENT_TAXONOMY[format as keyof typeof CONTENT_TAXONOMY].origin,
          'fresh',
          `Format ${format} should have origin: fresh`,
        );
        assert.equal(isFreshContentFormat(format), true, `Format ${format} should be fresh`);
        assert.equal(isDerivedContentFormat(format), false, `Format ${format} should not be derived`);
      }
    });

    it('helper functions getFreshContentFormats and getDerivedContentFormats report exact sets', () => {
      const fresh = getFreshContentFormats();
      const derived = getDerivedContentFormats();

      assert.equal(fresh.length, 11);
      assert.equal(fresh.includes('result_reveal'), false);
      assert.equal(derived.length, 1);
      assert.equal(derived[0], 'result_reveal');
    });

    it('preserves backward compatibility mapping for historical D1 values', () => {
      assert.equal(mapContentTypeToFormat('results_reveal'), 'result_reveal');
      assert.equal(mapContentTypeToFormat('weekly_recap'), 'result_reveal');
    });
  });

  describe('2. Variety Planner: Exclusion of Derived Content', () => {
    it('configures result_reveal in CONTENT_TYPES with origin: derived and weight: 0', () => {
      const spec = CONTENT_TYPES.result_reveal;
      assert.equal(spec.origin, 'derived');
      assert.equal(spec.mechanic, 'derived');
      assert.equal(spec.weight, 0);
    });

    it('never selects result_reveal across hundreds of simulated variety plans', () => {
      const simulatedPicks: string[] = [];
      const history: any[] = [];

      for (let i = 0; i < 500; i++) {
        const plan = planVariety(history, { discussionGroup: true });
        simulatedPicks.push(plan.contentType);
        history.unshift({
          contentType: plan.contentType,
          category: plan.category,
          tone: plan.tone,
          stakes: plan.stakes,
          layout: plan.layout,
          hookStyle: plan.hookStyle,
          publishedAt: new Date().toISOString(),
        });
      }

      // Assert result_reveal was NEVER selected as fresh content
      assert.equal(simulatedPicks.includes('result_reveal'), false);

      // Assert all 11 genuine fresh formats WERE selected
      const uniqueSelected = new Set(simulatedPicks);
      const expectedFresh = getFreshContentFormats();
      for (const format of expectedFresh) {
        assert.ok(uniqueSelected.has(format), `Expected fresh format ${format} to be selected`);
      }
    });
  });

  describe('3. Autonomous Pipeline Safeguard', () => {
    it('always generates a verified fresh content format in autonomous runs', async () => {
      const pipeline = new AutonomousPipelineService(baseEnv);
      const result = await pipeline.runPipeline('cron', { ignoreCooldown: true });

      assert.equal(result.success, true);
      assert.equal(result.postGenerated, true);
      assert.ok(result.contentFormat);
      assert.notEqual(result.contentFormat, 'result_reveal');
      assert.equal(isFreshContentFormat(result.contentFormat!), true);
    });
  });

  describe('4. Event-Driven Result/Reveal Path Remains Fully Functional', () => {
    it('publishes result_reveal message when closing a scheduled poll interaction', async () => {
      const now = new Date().toISOString();
      const pastTime = new Date(Date.now() - 3600000).toISOString();

      // 1. Create a parent dilemma post
      const post: PostRecord = {
        id: 'post_lifecycle_test_01',
        contentType: 'impossible_dilemma',
        category: 'moral',
        tone: 'tense',
        stakes: 'personal',
        layout: 'standard',
        hookStyle: 'direct',
        title: 'The Train Line Switch',
        status: 'published',
        payload: {
          title: 'The Train Line Switch',
          hook: 'The lever sits before you.',
          choices: [
            { label: 'Pull the lever', tradeOff: 'Redirects disaster to track B' },
            { label: 'Do not pull', tradeOff: 'Maintains track A trajectory' },
          ],
          payoff: {
            reveal: 'Track B was empty, saving everyone.',
            surprisingOutcome: 'Hesitation caused secondary brake failure.',
            communityTension: 'Active intervention vs passive observation.',
          },
        },
        createdAt: pastTime,
        publishedAt: pastTime,
      };
      await repo.createPost(post);

      // 2. Create open interaction
      const interaction: InteractionRecord = {
        id: 'int_post_lifecycle_test_01',
        postId: post.id,
        interactionType: 'poll',
        lifecycleState: 'OPEN',
        targetChatId: '@pickyourfate_test',
        mainMessageId: 101,
        closeStrategy: 'scheduled',
        durationSeconds: 1800,
        opensAt: pastTime,
        closesAt: pastTime,
        createdAt: pastTime,
        updatedAt: pastTime,
      };
      await repo.createInteraction(interaction);

      // 3. Create poll and options
      const poll: PollRecord = {
        id: 'poll_post_lifecycle_test_01',
        interactionId: interaction.id,
        telegramPollId: 'tg_poll_lifecycle_01',
        telegramMessageId: 102,
        question: 'Do you pull the lever?',
        pollType: 'regular',
        isAnonymous: true,
        allowsMultipleAnswers: false,
        openPeriodSeconds: 1800,
        isClosed: false,
        totalVoterCount: 15,
        createdAt: pastTime,
      };
      const options: PollOptionRecord[] = [
        {
          id: 'opt_poll_post_lifecycle_test_01_0',
          pollId: poll.id,
          optionIndex: 0,
          optionText: 'Pull the lever',
          tradeOff: 'Redirects disaster',
          voteCount: 10,
        },
        {
          id: 'opt_poll_post_lifecycle_test_01_1',
          pollId: poll.id,
          optionIndex: 1,
          optionText: 'Do not pull',
          tradeOff: 'Maintains trajectory',
          voteCount: 5,
        },
      ];
      await repo.createPoll(poll, options);

      // 4. Process closure
      const closures = await closureService.processDueInteractions(now);
      assert.equal(closures.length, 1);
      assert.equal(closures[0].processed, true);
      assert.ok(closures[0].resultPostMessageId);

      // 5. Verify result_reveal message was recorded in published_messages with messageType: 'result_reveal'
      const messages = await repo.getPublishedMessagesForPost(post.id);
      const resultMessage = messages.find((m) => m.messageType === 'result_reveal');
      assert.ok(resultMessage, 'Expected a published_message with messageType: result_reveal');
      assert.ok(resultMessage!.textContent?.includes('THE VERDICT'));
      assert.ok(resultMessage!.textContent?.includes('THE REVEAL'));

      // 6. Verify result record stored in D1
      const storedResult = await repo.getResultByInteractionId(interaction.id);
      assert.ok(storedResult);
      assert.equal(storedResult!.winningOptionIndex, 0);
      assert.equal(storedResult!.winningOptionText, 'Pull the lever');
      assert.equal(storedResult!.revealText, 'Track B was empty, saving everyone.');
    });

    it('publishes result_reveal spoiler when closing an open_discussion interaction', async () => {
      const now = new Date().toISOString();
      const pastTime = new Date(Date.now() - 3600000).toISOString();

      const post: PostRecord = {
        id: 'post_discussion_lifecycle_01',
        contentType: 'mini_mystery',
        category: 'moral',
        tone: 'mysterious',
        stakes: 'intellectual',
        layout: 'standard',
        hookStyle: 'question',
        title: 'The Locked Archive Mystery',
        status: 'published',
        payload: {
          title: 'The Locked Archive Mystery',
          hook: 'The vault combination was written in plain sight.',
          payoff: {
            reveal: 'The clock reflections revealed the combination.',
          },
        },
        createdAt: pastTime,
        publishedAt: pastTime,
      };
      await repo.createPost(post);

      const interaction: InteractionRecord = {
        id: 'int_post_discussion_lifecycle_01',
        postId: post.id,
        interactionType: 'open_discussion',
        lifecycleState: 'OPEN',
        targetChatId: '@pickyourfate_test',
        mainMessageId: 201,
        closeStrategy: 'scheduled',
        durationSeconds: 1800,
        opensAt: pastTime,
        closesAt: pastTime,
        createdAt: pastTime,
        updatedAt: pastTime,
      };
      await repo.createInteraction(interaction);

      const closures = await closureService.processDueInteractions(now);
      assert.equal(closures.length, 1);
      assert.equal(closures[0].processed, true);

      const messages = await repo.getPublishedMessagesForPost(post.id);
      const resultMessage = messages.find((m) => m.messageType === 'result_reveal');
      assert.ok(resultMessage, 'Expected discussion resolution published with messageType: result_reveal');
      assert.ok(resultMessage!.textContent?.includes('DISCUSSION RESOLUTION'));
      assert.ok(resultMessage!.textContent?.includes('<tg-spoiler>'));
    });
  });

  describe('5. Connected Episode Continuation Remains Fully Functional', () => {
    it('chains sequel after result_reveal concludes an interaction', async () => {
      const pastTime = new Date(Date.now() - 7200000).toISOString();
      const now = new Date().toISOString();

      // Parent post & interaction
      const parentPost: PostRecord = {
        id: 'post_arc_ep1',
        contentType: 'survival_scenario',
        category: 'survival',
        tone: 'tense',
        stakes: 'survival',
        layout: 'standard',
        hookStyle: 'alarm',
        title: 'Airlock Breach Protocol',
        status: 'published',
        payload: {
          title: 'Airlock Breach Protocol',
          hook: 'Air pressure dropping rapidly.',
          choices: [
            { label: 'Seal Sector 4', tradeOff: 'Traps auxiliary drones' },
            { label: 'Vent Cargo Bay', tradeOff: 'Loses 50% fuel' },
          ],
          payoff: {
            reveal: 'Auxiliary drones were lost but hull held firm.',
          },
        },
        createdAt: pastTime,
        publishedAt: pastTime,
      };
      await repo.createPost(parentPost);

      const parentInteraction: InteractionRecord = {
        id: 'int_post_arc_ep1',
        postId: parentPost.id,
        interactionType: 'poll',
        lifecycleState: 'COMPLETED',
        targetChatId: '@pickyourfate_test',
        mainMessageId: 301,
        closeStrategy: 'scheduled',
        opensAt: pastTime,
        closesAt: pastTime,
        closedAt: pastTime,
        resolvedAt: pastTime,
        createdAt: pastTime,
        updatedAt: pastTime,
      };
      await repo.createInteraction(parentInteraction);

      // Result record from previous interaction
      await repo.saveResult({
        id: 'res_int_post_arc_ep1',
        interactionId: parentInteraction.id,
        postId: parentPost.id,
        totalParticipants: 50,
        winningOptionIndex: 0,
        winningOptionText: 'Seal Sector 4',
        winningPercentage: 72,
        voteDistribution: [
          { optionIndex: 0, optionText: 'Seal Sector 4', voteCount: 36, percentage: 72, isWinner: true },
          { optionIndex: 1, optionText: 'Vent Cargo Bay', voteCount: 14, percentage: 28, isWinner: false },
        ],
        payoff: { reveal: 'Auxiliary drones were lost but hull held firm.' },
        revealText: 'Auxiliary drones were lost but hull held firm.',
        status: 'published',
        publishedAt: pastTime,
        createdAt: pastTime,
      });

      // Run pipeline with continuation enabled
      const pipeline = new AutonomousPipelineService(baseEnv);
      const sequel = await pipeline.runPipeline('cron', {
        ignoreCooldown: true,
        forceContinuation: true,
        nowIso: now,
      });

      assert.equal(sequel.success, true);
      assert.equal(sequel.isContinuation, true);
      assert.equal(sequel.parentPostId, parentPost.id);
      assert.ok(sequel.title?.includes('Aftermath: Airlock Breach Protocol'));
      assert.notEqual(sequel.contentFormat, 'result_reveal');
      assert.equal(isFreshContentFormat(sequel.contentFormat!), true);
    });
  });
});

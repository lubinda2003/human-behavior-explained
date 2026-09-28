import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createMockD1Database } from './mock-d1';
import { SCHEMA_STATEMENTS } from '../src/store/schema';
import { AutonomousPipelineService, generatePostId } from '../src/pipeline/autonomous-pipeline';
import {
  CONTENT_TAXONOMY,
  mapContentTypeToFormat,
  mapWorkerCategoryToPipeline,
  resolveInteractionMechanism,
} from '../src/taxonomy';
import { D1InteractionRepository } from '../src/interactions/repository';
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

describe('Autonomous Production Pipeline & Taxonomy Integration', () => {
  let db: any;
  let kv: any;
  let baseEnv: Env;

  beforeEach(async () => {
    db = createMockD1Database();
    for (const sql of SCHEMA_STATEMENTS) {
      await db.prepare(sql).run();
    }
    kv = createMockKV();

    baseEnv = {
      DB: db,
      KV: kv,
      ARCHIVE: {} as any,
      TELEGRAM_BOT_TOKEN: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
      TELEGRAM_CHANNEL_ID: '@pickyourfate_test',
      TELEGRAM_WEBHOOK_SECRET: 'test_secret_abc123',
      GEMINI_API_KEY: 'test_key',
      GEMINI_MODEL: 'gemini-2.5-flash',
      PUBLISHING_ENABLED: 'false',
      DISCUSSION_GROUP_LINKED: 'true',
      DRY_RUN: 'true',
    };
  });

  // --------------------------------------------------------------------------
  // 1. Taxonomy & Mechanism Reconciliation Tests
  // --------------------------------------------------------------------------
  describe('Content Taxonomy & Interaction Mechanism Reconciliation', () => {
    it('defines distinct entertainment formats and interaction mechanisms', () => {
      assert.ok(CONTENT_TAXONOMY.impossible_dilemma);
      assert.equal(CONTENT_TAXONOMY.impossible_dilemma.defaultMechanism, 'poll');
      assert.equal(CONTENT_TAXONOMY.mini_mystery.defaultMechanism, 'open_discussion');
      assert.equal(CONTENT_TAXONOMY.prediction.defaultMechanism, 'prediction_vote');
      assert.equal(CONTENT_TAXONOMY.survival_scenario.defaultMechanism, 'poll');
      assert.equal(CONTENT_TAXONOMY.versus_battle.defaultMechanism, 'poll');
    });

    it('maps variety planner ContentTypeId to ContentFormat cleanly', () => {
      assert.equal(mapContentTypeToFormat('classic_poll'), 'impossible_dilemma');
      assert.equal(mapContentTypeToFormat('open_debate'), 'hot_take');
      assert.equal(mapContentTypeToFormat('trap_breakdown'), 'mini_mystery');
      assert.equal(mapContentTypeToFormat('rank_it'), 'interactive_minigame');
      assert.equal(mapContentTypeToFormat('results_reveal'), 'result_reveal');
    });

    it('reconciles allowed interaction mechanisms without forcing all into polls', () => {
      assert.equal(resolveInteractionMechanism('mini_mystery'), 'open_discussion');
      assert.equal(resolveInteractionMechanism('impossible_dilemma'), 'poll');
      assert.equal(resolveInteractionMechanism('strategy_challenge'), 'poll');
      assert.equal(resolveInteractionMechanism('prediction'), 'prediction_vote');
    });
  });

  // --------------------------------------------------------------------------
  // 2. Full Autonomous Pipeline Execution
  // --------------------------------------------------------------------------
  describe('Autonomous Pipeline Execution Loop', () => {
    it('runs end-to-end: lock -> variety -> generation -> D1 -> plan -> publish -> OPEN', async () => {
      const pipeline = new AutonomousPipelineService(baseEnv);
      const result = await pipeline.runPipeline('scheduled_cron');

      assert.equal(result.success, true);
      assert.equal(result.postGenerated, true);
      assert.ok(result.postId);
      assert.ok(result.interactionId);
      assert.ok(result.title);
      assert.equal(result.publishingEnabled, false);

      // Verify record exists in D1 posts table
      const repo = new D1InteractionRepository(db);
      const post = await repo.getPost(result.postId!);
      assert.ok(post);
      assert.equal(post.status, 'published');
      assert.ok(post.payload);

      // Verify interaction state is OPEN in D1
      const interaction = await repo.getInteraction(result.interactionId!);
      assert.ok(interaction);
      assert.equal(interaction.lifecycleState, 'OPEN');
      assert.equal(interaction.postId, result.postId);
    });

    it('prevents concurrent worker executions via distributed lock', async () => {
      const pipeline = new AutonomousPipelineService(baseEnv);

      // Pre-set active lock in KV
      await kv.put(
        'pipeline:autonomous_lock',
        JSON.stringify({
          token: 'existing_active_lock',
          lockedAt: Date.now(),
          expiresAt: Date.now() + 60000,
        }),
      );

      const result = await pipeline.runPipeline('concurrent_cron');
      assert.equal(result.success, true);
      assert.equal(result.skipped, true);
      assert.match(result.skipReason || '', /already held/);
      assert.equal(result.postGenerated, undefined);

      // Clean up lock
      await kv.delete('pipeline:autonomous_lock');
    });

    it('falls back to deterministic procedural generation when Gemini is unavailable', async () => {
      const offlineEnv: Env = {
        ...baseEnv,
        GEMINI_API_KEY: '', // Empty key forces procedural fallback
      };

      const pipeline = new AutonomousPipelineService(offlineEnv);
      const result = await pipeline.runPipeline('offline_run');

      assert.equal(result.success, true);
      assert.equal(result.postGenerated, true);
      assert.ok(result.postId);
      assert.ok(result.title);

      const repo = new D1InteractionRepository(db);
      const post = await repo.getPost(result.postId!);
      assert.ok(post);
      assert.equal(post.status, 'published');
    });

    it('respects PUBLISHING_ENABLED=false kill-switch during scheduled runs', async () => {
      const pipeline = new AutonomousPipelineService(baseEnv);
      const result = await pipeline.runPipeline('kill_switch_test');

      assert.equal(result.publishingEnabled, false);
      assert.equal(result.success, true);
      // In mock environment, message IDs are generated deterministically by MockTelegramClient
      assert.ok(result.telegramMessageId);
    });

    it('automatically closes due interactions during pipeline tick', async () => {
      const repo = new D1InteractionRepository(db);
      const nowIso = new Date().toISOString();

      // Create an expired interaction that should be closed
      await repo.createPost({
        id: 'post_due_1',
        contentType: 'impossible_dilemma',
        category: 'moral',
        tone: 'tense',
        stakes: 'personal',
        layout: 'stacked',
        hookStyle: 'statement',
        title: 'Expired Dilemma',
        status: 'published',
        payload: { title: 'Expired Dilemma' },
        createdAt: new Date(Date.now() - 100000).toISOString(),
      });

      const pastClosing = new Date(Date.now() - 5000).toISOString();
      await repo.createInteraction({
        id: 'int_due_1',
        postId: 'post_due_1',
        interactionType: 'poll',
        targetChatId: '@pickyourfate_test',
        lifecycleState: 'OPEN',
        closeStrategy: 'scheduled',
        durationSeconds: 3600,
        opensAt: new Date(Date.now() - 50000).toISOString(),
        closesAt: pastClosing,
        createdAt: new Date(Date.now() - 50000).toISOString(),
        updatedAt: new Date(Date.now() - 50000).toISOString(),
      });

      await repo.createPoll(
        {
          id: 'poll_due_1',
          interactionId: 'int_due_1',
          telegramPollId: 'tg_poll_due_1',
          telegramMessageId: 101,
          question: 'Which do you choose?',
          pollType: 'regular',
          isAnonymous: true,
          allowsMultipleAnswers: false,
          isClosed: false,
          totalVoterCount: 5,
          createdAt: nowIso,
        },
        [
          {
            id: 'opt_1',
            pollId: 'poll_due_1',
            optionIndex: 0,
            optionText: 'Option A: The Bold Move',
            voteCount: 3,
          },
          {
            id: 'opt_2',
            pollId: 'poll_due_1',
            optionIndex: 1,
            optionText: 'Option B: The Safe Harbor',
            voteCount: 2,
          },
        ],
      );

      const pipeline = new AutonomousPipelineService(baseEnv);
      const result = await pipeline.runPipeline('closure_cron');

      assert.equal(result.success, true);
      assert.equal(result.closedInteractionsCount, 1);

      // Verify interaction transitioned to COMPLETED
      const updatedInteraction = await repo.getInteraction('int_due_1');
      assert.ok(updatedInteraction);
      assert.equal(updatedInteraction.lifecycleState, 'COMPLETED');
    });

    it('generates collision-safe unique post IDs across consecutive runs with same dilemma', async () => {
      const offlineEnv: Env = {
        ...baseEnv,
        GEMINI_API_KEY: '', // Force procedural generator which might return recurring dilemmas
        PUBLISHING_COOLDOWN_MINUTES: '0',
      };

      const pipeline = new AutonomousPipelineService(offlineEnv);

      // Run pipeline multiple times
      const result1 = await pipeline.runPipeline('run_1');
      assert.equal(result1.success, true);
      assert.ok(result1.postId);

      // Release lock if any and run second time immediately
      await kv.delete('pipeline:autonomous_lock');

      const result2 = await pipeline.runPipeline('run_2');
      assert.equal(result2.success, true);
      assert.ok(result2.postId);

      // Ensure post IDs are strictly unique
      assert.notEqual(result1.postId, result2.postId);

      // Verify both posts exist in D1 database without UNIQUE constraint collisions
      const repo = new D1InteractionRepository(db);
      const post1 = await repo.getPost(result1.postId!);
      const post2 = await repo.getPost(result2.postId!);
      assert.ok(post1);
      assert.ok(post2);
      assert.notEqual(post1.id, post2.id);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Phase 4 Content Repetition & Publishing Safety Gate Regression Tests
  // --------------------------------------------------------------------------
  describe('Phase 4: Content Repetition & Publishing Safety Gate', () => {
    it('strictly halts pipeline and blocks Telegram publishing when content remains repetitive after repair', async () => {
      const repo = new D1InteractionRepository(db);
      const nowIso = new Date().toISOString();

      // Seed a recent post in D1
      await repo.createPost({
        id: 'post_recent_1',
        contentType: 'impossible_dilemma',
        category: 'moral',
        tone: 'tense',
        stakes: 'life_or_death',
        layout: 'standard',
        hookStyle: 'direct_question',
        title: 'The Whistleblower Crossroads',
        status: 'published',
        payload: {
          title: 'The Whistleblower Crossroads',
          hook: 'Would you sacrifice your career to save a stranger from wrongful imprisonment?',
          setup: 'Exposing the corporate fraud destroys your entire career but saves an innocent bystander.',
        },
        scheduledFor: nowIso,
        createdAt: nowIso,
        updatedAt: nowIso,
        publishedAt: nowIso,
      });

      const pipeline = new AutonomousPipelineService({
        ...baseEnv,
        PUBLISHING_COOLDOWN_MINUTES: '0',
      });

      // Mock generator to return a repetitive dilemma that cannot be fixed by repair
      let publishInteractionCalled = false;
      (pipeline as any).generator = {
        generateDilemma: async () => ({
          id: 'gen_rep_1',
          category: 'moral',
          format: 'impossible_dilemma',
          title: 'The Whistleblower Crossroads', // Exact title duplicate
          hook: 'Would you sacrifice your career to save a stranger from wrongful imprisonment?',
          setup: 'You have tenured credentials at a top firm. Exposing the fraud destroys your entire career.',
          scenario: 'You have tenured credentials at a top firm. Exposing the fraud destroys your entire career.',
          depth: 'standard',
          choices: [
            { id: 'a', label: 'Leak Files', description: 'Save stranger', tradeOff: 'Lose career' },
            { id: 'b', label: 'Stay Quiet', description: 'Keep career', tradeOff: 'Stranger suffers' },
          ],
          pollQuestion: 'Do you leak the files or stay silent?',
          payoff: { reveal: 'Truth has a personal price.' },
          formattedTelegramText: '<b>The Whistleblower Crossroads</b>\n\nWould you sacrifice...',
        }),
        repairDilemma: (d: any, opts: any) => {
          // Repair deliberately returns a dilemma with a stale/falsely-valid embedded qc object,
          // while retaining the actual conflicting title and hook.
          return {
            ...d,
            qc: {
              isValid: true, // Falsely claiming valid embedded QC
              dilemmaId: d.id,
              errors: [],
              warnings: [],
              checks: {
                choiceCountValid: true,
                tradeOffsExplicit: true,
                noAcademicJargon: true,
                plainLanguageVoiceValid: true,
                noSerializedStory: true,
                noGenericWYR: true,
                noFormulaicTradeoff: true,
                hasSituationalImmersion: true,
                depthRequirementsMet: true,
                telegramHtmlValid: true,
                visualAssetValid: true,
                noDominantChoice: true,
                noCostFreeChoices: true,
                noUngroundedHypothetical: true,
                telegramLengthValid: true,
                interactionConfigValid: true,
                schemaFieldsValid: true,
                formatRequirementsMet: true,
                noRepetitiveOpening: true,
                noRepetitiveTheme: true, // Falsely true
              },
            },
          };
        },
        generateProceduralDilemma: () => {
          return {
            id: 'proc_rep_1',
            category: 'moral',
            format: 'impossible_dilemma',
            title: 'The Whistleblower Crossroads',
            hook: 'Would you sacrifice your career to save a stranger from wrongful imprisonment?',
            setup: 'Exposing fraud destroys career.',
            scenario: 'Exposing fraud destroys career.',
            depth: 'standard',
            choices: [
              { id: 'a', label: 'Leak', description: 'Save stranger', tradeOff: 'Lose career' },
              { id: 'b', label: 'Quiet', description: 'Keep career', tradeOff: 'Stranger suffers' },
            ],
            pollQuestion: 'Leak or stay quiet?',
            payoff: { reveal: 'Truth has a cost.' },
            formattedTelegramText: '<b>The Whistleblower Crossroads</b>\n\nWould you sacrifice...',
            qc: {
              isValid: false,
              dilemmaId: 'proc_rep_1',
              errors: ['Repetition check failed: Exact title duplicate'],
              warnings: [],
              checks: { noRepetitiveTheme: false, noRepetitiveOpening: true },
            },
          };
        },
      };

      // Spy on publisher to verify it is NEVER invoked
      const originalPublish = (pipeline as any).publisher.publishInteraction.bind((pipeline as any).publisher);
      (pipeline as any).publisher.publishInteraction = async (...args: any[]) => {
        publishInteractionCalled = true;
        return originalPublish(...args);
      };

      const result = await pipeline.runPipeline('test_trigger', { ignoreCooldown: true });

      // Assert pipeline halted safely
      assert.equal(result.success, false);
      assert.equal(result.postGenerated, false);
      assert.equal(result.postId, undefined);
      assert.ok(result.skipReason?.includes('Final content quality/repetition gate failure'));
      assert.equal(publishInteractionCalled, false, 'TelegramInteractionPublisher must NEVER be called for repetitive content');

      // Assert that NO new post was persisted to D1 database
      const posts = await repo.getRecentPosts(10);
      assert.equal(posts.length, 1, 'Only the pre-seeded recent post should exist in D1');
      assert.equal(posts[0].id, 'post_recent_1');
    });

    it('successfully publishes valid repaired content when repair resolves quality/repetition checks', async () => {
      const pipeline = new AutonomousPipelineService({
        ...baseEnv,
        PUBLISHING_COOLDOWN_MINUTES: '0',
      });

      let publishInteractionCount = 0;
      (pipeline as any).generator = {
        generateDilemma: async () => ({
          id: 'gen_rep_fixed',
          category: 'survival',
          format: 'survival_scenario',
          title: 'The Submarine Oxygen Valve',
          hook: 'A high-pressure seal ruptures in the sub cabin as battery voltage drops to 8%.',
          setup: 'You are an engineer on a deep-sea research sub with failing oxygen and an emergency ballast clamp.',
          scenario: 'You are an engineer on a deep-sea research sub with failing oxygen and an emergency ballast clamp.',
          depth: 'standard',
          choices: [], // Missing choices triggers repair
          pollQuestion: 'Do you blow ballast or wait?',
          payoff: {
            reveal: 'Controlled ascent is essential.',
            surprisingOutcome: 'Ascending too fast risks decompression sickness and hull implosion.',
          },
          formattedTelegramText: '<b>The Submarine Oxygen Valve</b>\n\nA high-pressure seal ruptures...',
        }),
        repairDilemma: (d: any) => ({
          ...d,
          choices: [
            { id: 'a', label: 'Blow Ballast', description: 'Ascend fast', tradeOff: 'Risk bends' },
            { id: 'b', label: 'Wait Rescue', description: 'Conserve oxygen', tradeOff: 'Risk suffocation' },
          ],
          payoff: {
            reveal: 'Controlled ascent is essential.',
            surprisingOutcome: 'Ascending too fast risks decompression sickness and hull implosion.',
          },
          formattedTelegramText: '<b>The Submarine Oxygen Valve</b>\n\nA high-pressure seal ruptures...',
          qc: {
            isValid: true,
            dilemmaId: d.id,
            errors: [],
            warnings: [],
            checks: {
              choiceCountValid: true,
              tradeOffsExplicit: true,
              noAcademicJargon: true,
              plainLanguageVoiceValid: true,
              noSerializedStory: true,
              noGenericWYR: true,
              noFormulaicTradeoff: true,
              hasSituationalImmersion: true,
              depthRequirementsMet: true,
              telegramHtmlValid: true,
              visualAssetValid: true,
              noDominantChoice: true,
              noCostFreeChoices: true,
              noUngroundedHypothetical: true,
              telegramLengthValid: true,
              interactionConfigValid: true,
              schemaFieldsValid: true,
              formatRequirementsMet: true,
              noRepetitiveOpening: true,
              noRepetitiveTheme: true,
            },
          },
        }),
      };

      const originalPublish = (pipeline as any).publisher.publishInteraction.bind((pipeline as any).publisher);
      (pipeline as any).publisher.publishInteraction = async (...args: any[]) => {
        publishInteractionCount++;
        return originalPublish(...args);
      };

      const result = await pipeline.runPipeline('test_trigger', { ignoreCooldown: true });

      assert.equal(result.success, true);
      assert.equal(result.postGenerated, true);
      assert.equal(publishInteractionCount, 1, 'TelegramInteractionPublisher should be called exactly once for valid repaired content');
    });
  });
});


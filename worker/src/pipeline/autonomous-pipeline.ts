/**
 * Autonomous Production Pipeline for Pick Your Fate
 *
 * Connects:
 * Scheduled Cron / Manual Trigger
 *   ↓
 * Acquire safe generation/publishing lock (KV/D1 concurrency & idempotency)
 *   ↓
 * Process due interactions for closure & result/reveal posting
 *   ↓
 * Inspect recent content history from D1
 *   ↓
 * Run Variety Planner (anti-repetition, 10 categories, formats)
 *   ↓
 * Reconcile Taxonomy (Format vs Mechanism)
 *   ↓
 * Generate next content (Gemini API with quality gates, repair & procedural fallback)
 *   ↓
 * Format Telegram HTML markup
 *   ↓
 * Persist validated post to D1
 *   ↓
 * Plan Telegram interaction (Poll, Discussion, Prediction, Scenario)
 *   ↓
 * Publish main Telegram message & interaction (Respecting PUBLISHING_ENABLED kill-switch)
 *   ↓
 * Persist Telegram IDs & Transition interaction lifecycle to OPEN
 *   ↓
 * Release lock & Return execution report
 */

import type { Env } from '../env';
import {
  D1InteractionRepository,
  InteractionPlanner,
  TelegramInteractionPublisher,
  InteractionClosureService,
  ResultGenerator,
} from '../interactions';
import { getTelegramClient } from '../index';
import { planVariety } from '../variety/planner';
import type { HistoryEntry, ContentTypeId } from '../types';
import type { PostRecord } from '../interactions/types';
import {
  mapContentTypeToFormat,
  mapWorkerCategoryToPipeline,
  resolveInteractionMechanism,
  ContentFormat,
  InteractionMechanism,
} from '../taxonomy';
import { DilemmaGenerator } from '../../../src/pipeline/dilemmas/generator';
import { DilemmaTelegramFormatter } from '../../../src/pipeline/dilemmas/formatter';
import { DilemmaQualityChecker } from '../../../src/pipeline/dilemmas/quality';
import type { InteractiveDilemma } from '../../../src/pipeline/dilemmas/types';

export interface PipelineExecutionResult {
  success: boolean;
  skipped?: boolean;
  skipReason?: string;
  closedInteractionsCount: number;
  postGenerated?: boolean;
  postId?: string;
  title?: string;
  contentFormat?: ContentFormat;
  interactionMechanism?: InteractionMechanism;
  interactionId?: string;
  telegramMessageId?: number;
  telegramPollId?: string;
  publishingEnabled: boolean;
  durationMs: number;
  error?: string;
}

export class AutonomousPipelineService {
  private repo: D1InteractionRepository;
  private publisher: TelegramInteractionPublisher;
  private closureService: InteractionClosureService;
  private generator: DilemmaGenerator;
  private planner: InteractionPlanner;

  constructor(private readonly env: Env) {
    this.repo = new D1InteractionRepository(env.DB);
    const telegram = getTelegramClient(env);
    const resultGen = new ResultGenerator();
    this.closureService = new InteractionClosureService(this.repo, telegram, resultGen);
    this.publisher = new TelegramInteractionPublisher(this.repo, telegram);
    this.planner = new InteractionPlanner(env.TELEGRAM_CHANNEL_ID || '@pickyourfate');
    this.generator = new DilemmaGenerator(env.GEMINI_API_KEY, env.GEMINI_MODEL || 'gemini-2.5-flash');
  }

  /**
   * Acquire a distributed execution lock to prevent concurrent or duplicate cron executions.
   */
  private async acquireLock(lockKey: string, ttlSeconds = 300): Promise<{ acquired: boolean; lockToken: string }> {
    const lockToken = `lock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();

    try {
      if (this.env.KV) {
        const existing = await this.env.KV.get(lockKey);
        if (existing) {
          try {
            const data = JSON.parse(existing);
            if (data.expiresAt && now < data.expiresAt) {
              return { acquired: false, lockToken: '' };
            }
          } catch {
            // Invalid lock payload, proceed to acquire
          }
        }

        await this.env.KV.put(
          lockKey,
          JSON.stringify({ token: lockToken, lockedAt: now, expiresAt: now + ttlSeconds * 1000 }),
          { expirationTtl: ttlSeconds },
        );
        return { acquired: true, lockToken };
      }
    } catch {
      // If KV fails or is not available, proceed safely
    }

    return { acquired: true, lockToken };
  }

  /**
   * Release the distributed execution lock safely.
   */
  private async releaseLock(lockKey: string, lockToken: string): Promise<void> {
    try {
      if (this.env.KV && lockToken) {
        const existing = await this.env.KV.get(lockKey);
        if (existing) {
          const data = JSON.parse(existing);
          if (data.token === lockToken) {
            await this.env.KV.delete(lockKey);
          }
        }
      }
    } catch {
      // Ignore lock release failures
    }
  }

  /**
   * Executes the complete autonomous production pipeline.
   */
  async runPipeline(triggerSource = 'cron'): Promise<PipelineExecutionResult> {
    const startTime = Date.now();
    const lockKey = 'pipeline:autonomous_lock';
    const { acquired, lockToken } = await this.acquireLock(lockKey, 300);

    if (!acquired) {
      return {
        success: true,
        skipped: true,
        skipReason: 'Pipeline execution lock already held by another active run',
        closedInteractionsCount: 0,
        publishingEnabled: this.env.PUBLISHING_ENABLED === 'true',
        durationMs: Date.now() - startTime,
      };
    }

    try {
      // Step 1: Process due interactions for closure & results publishing
      const closedInteractions = await this.closureService.processDueInteractions();

      // Step 2: Inspect recent D1 history for anti-repetition planning
      const recentPosts = await this.repo.getRecentPosts(15);
      const recentHistory: HistoryEntry[] = recentPosts.map((p) => ({
        contentType: (mapContentTypeToFormat(p.contentType) || p.contentType) as ContentTypeId,
        category: p.category as any,
        tone: p.tone as any,
        stakes: p.stakes as any,
        layout: p.layout as any,
        hookStyle: p.hookStyle as any,
        publishedAt: p.publishedAt || p.createdAt,
      }));

      // Step 3: Run variety planner
      const hasDiscussionGroup = this.env.DISCUSSION_GROUP_LINKED === 'true';
      const varietyPlan = planVariety(recentHistory, { discussionGroup: hasDiscussionGroup });

      // Step 4: Content format is directly selected by the variety planner
      const contentFormat = varietyPlan.contentType;
      const pipelineCategory = mapWorkerCategoryToPipeline(varietyPlan.category);
      const mechanism = resolveInteractionMechanism(contentFormat);

      // Exclude recent titles to avoid repetitive themes
      const excludedTopics = recentPosts.map((p) => p.title).slice(0, 10);

      // Step 5: Generate content (Gemini with QC, repair, and procedural fallback)
      let dilemma: InteractiveDilemma;
      try {
        dilemma = await this.generator.generateDilemma({
          category: pipelineCategory,
          format: contentFormat,
          depth: 'standard',
          excludedTopics,
        });
      } catch (genErr) {
        console.warn('Gemini generation failed; invoking procedural generation:', genErr);
        dilemma = this.generator.generateProceduralDilemma({
          category: pipelineCategory,
          format: contentFormat,
          depth: 'standard',
        });
      }

      // Step 6: Validate and repair if needed
      const qc = DilemmaQualityChecker.validateDilemmaContent(dilemma);
      if (!qc.isValid) {
        dilemma = this.generator.repairDilemma(dilemma);
      }

      // Format clean Telegram HTML post text
      const formattedTelegramText =
        dilemma.formattedTelegramText || DilemmaTelegramFormatter.formatPost(dilemma);

      // Step 7: Persist post as DRAFT in D1 (idempotency anchor)
      const postId = `post_${dilemma.id || Date.now()}`;
      const nowIso = new Date().toISOString();

      const postRecord: PostRecord = {
        id: postId,
        contentType: contentFormat,
        category: varietyPlan.category,
        tone: varietyPlan.tone,
        stakes: varietyPlan.stakes,
        layout: varietyPlan.layout,
        hookStyle: varietyPlan.hookStyle,
        title: dilemma.title,
        status: 'draft',
        payload: dilemma as any,
        scheduledFor: nowIso,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      await this.repo.createPost(postRecord);

      // Step 8: Plan Telegram interaction
      const durationSeconds = 7200; // 2 hours interaction window
      const interactionPlan = this.planner.plan(
        {
          id: postId,
          title: dilemma.title,
          contentType: contentFormat,
          choices: dilemma.choices.map((c: any) => ({
            label: c.label,
            tradeOff: c.tradeOff,
            description: c.description,
          })),
          pollQuestion: dilemma.pollQuestion,
          discussionPrompt: dilemma.discussionPrompt,
          payoff: dilemma.payoff,
        },
        { customDurationSeconds: durationSeconds },
      );

      // Step 9: Publish via TelegramInteractionPublisher
      // (Respects PUBLISHING_ENABLED - automatically uses MockTelegramClient if false)
      const published = await this.publisher.publishInteraction({
        post: postRecord,
        plan: interactionPlan,
        formattedText: formattedTelegramText,
      });

      return {
        success: true,
        closedInteractionsCount: closedInteractions.length,
        postGenerated: true,
        postId,
        title: dilemma.title,
        contentFormat,
        interactionMechanism: mechanism,
        interactionId: published.interactionId,
        telegramMessageId: published.telegramMessageId,
        telegramPollId: published.telegramPollId,
        publishingEnabled: this.env.PUBLISHING_ENABLED === 'true',
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      console.error('Autonomous pipeline execution failure:', err);
      return {
        success: false,
        closedInteractionsCount: 0,
        publishingEnabled: this.env.PUBLISHING_ENABLED === 'true',
        durationMs: Date.now() - startTime,
        error: err?.message || String(err),
      };
    } finally {
      await this.releaseLock(lockKey, lockToken);
    }
  }
}

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
  isFreshContentFormat,
  ContentFormat,
  InteractionMechanism,
} from '../taxonomy';
import {
  DilemmaGenerator,
  type ContinuationContext,
} from '../../../src/pipeline/dilemmas/generator';
import { DilemmaTelegramFormatter } from '../../../src/pipeline/dilemmas/formatter';
import { DilemmaQualityChecker } from '../../../src/pipeline/dilemmas/quality';
import type { InteractiveDilemma } from '../../../src/pipeline/dilemmas/types';

/**
 * Generates a collision-safe, unique post ID with a timestamp component and random UUID.
 * Ensures two pipeline executions cannot collide even if given identical dilemma objects or IDs.
 */
export function generatePostId(_dilemmaId?: string): string {
  const timestamp = Date.now();
  const uuid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '')
      : Math.random().toString(36).slice(2, 14);

  return `post_${timestamp}_${uuid}`;
}

/** Default minimum publishing cooldown interval: 120 minutes (2 hours). */
export const DEFAULT_PUBLISHING_COOLDOWN_MINUTES = 120;

/**
 * Reads and parses the publishing cooldown interval in minutes from Worker environment variables.
 * Falls back to DEFAULT_PUBLISHING_COOLDOWN_MINUTES (120 minutes / 2 hours).
 */
export function getPublishingCooldownMinutes(env: Env): number {
  if (env.PUBLISHING_COOLDOWN_MINUTES !== undefined && env.PUBLISHING_COOLDOWN_MINUTES !== '') {
    const parsed = parseInt(env.PUBLISHING_COOLDOWN_MINUTES, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return DEFAULT_PUBLISHING_COOLDOWN_MINUTES;
}

export interface PipelineRunOptions {
  forceContinuation?: boolean;
  forceStandalone?: boolean;
  ignoreCooldown?: boolean;
  nowIso?: string;
}

export interface PipelineExecutionResult {
  success: boolean;
  skipped?: boolean;
  skipReason?: string;
  cooldownActive?: boolean;
  cooldownMinutes?: number;
  remainingCooldownMs?: number;
  closedInteractionsCount: number;
  postGenerated?: boolean;
  postId?: string;
  title?: string;
  contentFormat?: ContentFormat;
  interactionMechanism?: InteractionMechanism;
  interactionId?: string;
  telegramMessageId?: number;
  telegramPollId?: string;
  isContinuation?: boolean;
  parentPostId?: string;
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
  async runPipeline(
    triggerSource = 'cron',
    options?: PipelineRunOptions,
  ): Promise<PipelineExecutionResult> {
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
      const nowTime = options?.nowIso ? new Date(options.nowIso).getTime() : Date.now();
      const nowIso = options?.nowIso ?? new Date(nowTime).toISOString();

      // Step 1: Process due interactions for closure & results publishing
      // Note: Due interaction closure must ALWAYS run on every scheduled run regardless of fresh publishing cooldown!
      const closedInteractions = await this.closureService.processDueInteractions(nowIso);

      // Step 1b: Fresh Content Publishing Cooldown Check
      // Decouples pipeline execution (e.g. 30-min cron) from automatic content generation/publishing.
      const cooldownMinutes = getPublishingCooldownMinutes(this.env);
      if (!options?.ignoreCooldown && cooldownMinutes > 0) {
        const latestPost = await this.repo.getLatestPublishedPost();
        if (latestPost) {
          const publishedTimestamp = latestPost.publishedAt || latestPost.createdAt;
          const lastPublishedMs = new Date(publishedTimestamp).getTime();
          if (!isNaN(lastPublishedMs)) {
            const elapsedMs = nowTime - lastPublishedMs;
            const cooldownMs = cooldownMinutes * 60 * 1000;
            if (elapsedMs < cooldownMs) {
              const remainingMs = cooldownMs - elapsedMs;
              const remainingMin = Math.ceil(remainingMs / 60000);
              return {
                success: true,
                skipped: true,
                skipReason: `Publishing cooldown active (${remainingMin}m remaining of ${cooldownMinutes}m interval)`,
                cooldownActive: true,
                cooldownMinutes,
                remainingCooldownMs: remainingMs,
                closedInteractionsCount: closedInteractions.length,
                postGenerated: false,
                publishingEnabled: this.env.PUBLISHING_ENABLED === 'true',
                durationMs: Date.now() - startTime,
              };
            }
          }
        }
      }

      // Step 1c: Continuation Decision Point
      // Check for the most recently completed interaction result in D1
      const latestCompleted = await this.repo.getLatestCompletedContinuation();
      const hasExistingChild = latestCompleted ? await this.repo.hasChildPost(latestCompleted.postId) : false;

      // Decision rule: Continue if forced, or if enabled and not already continued
      const shouldContinue =
        Boolean(latestCompleted) &&
        !options?.forceStandalone &&
        (options?.forceContinuation === true || (this.env.ENABLE_EPISODE_CONTINUATION === 'true' && !hasExistingChild));

      let continuationContext: ContinuationContext | undefined;
      if (shouldContinue && latestCompleted) {
        continuationContext = {
          parentPostId: latestCompleted.postId,
          parentInteractionId: latestCompleted.interactionId,
          previousTitle: latestCompleted.postTitle,
          category: latestCompleted.category,
          winningOptionText: latestCompleted.winningOptionText,
          winningOptionIndex: latestCompleted.winningOptionIndex,
          winningPercentage: latestCompleted.winningPercentage,
          revealText: latestCompleted.revealText,
          payoff: latestCompleted.payoff,
          telegramMessageId: latestCompleted.telegramMessageId,
        };
      }

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
      // Safeguard: Ensure derived formats (like result_reveal) are never generated as fresh posts
      const contentFormat = isFreshContentFormat(varietyPlan.contentType)
        ? varietyPlan.contentType
        : 'impossible_dilemma';
      const pipelineCategory = continuationContext?.category
        ? (continuationContext.category as any)
        : mapWorkerCategoryToPipeline(varietyPlan.category);
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
          continuation: continuationContext,
        });
      } catch (genErr) {
        console.warn('Gemini generation failed; invoking procedural generation:', genErr);
        dilemma = this.generator.generateProceduralDilemma({
          category: pipelineCategory,
          format: contentFormat,
          depth: 'standard',
          continuation: continuationContext,
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
      const postId = generatePostId(dilemma.id);

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
        parentPostId: continuationContext?.parentPostId ?? null,
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
        replyToMessageId: continuationContext?.telegramMessageId ?? undefined,
        nowIso,
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
        isContinuation: Boolean(continuationContext),
        parentPostId: continuationContext?.parentPostId,
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

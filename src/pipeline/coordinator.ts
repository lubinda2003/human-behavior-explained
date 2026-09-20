/**
 * Pipeline Coordinator
 * Orchestrates topic selection, empirical research, editorial writing, strict quality gating,
 * visual generation, queue storage, and Telegram publishing.
 */

import { GeminiContentEngine } from './gemini.js';
import { ContentMemoryStore } from './memory.js';
import { QualityChecker } from './quality.js';
import { ContentQueueStore } from './queue.js';
import { TelegramPublisher, TelegramPublishResult } from './telegram.js';
import {
  ContentItem,
  ContentPillar,
  PostDraft,
  TopicCandidate,
  VisualDecision,
} from './types.js';
import { VisualGenerator } from './visuals/index.js';

export interface GenerateOptions {
  count?: number;
  pillar?: ContentPillar;
  topic?: string;
  dryRun?: boolean;
}

export interface PublishOptions {
  dryRun?: boolean;
  specificId?: string;
}

export class PipelineCoordinator {
  private memoryStore: ContentMemoryStore;
  private queueStore: ContentQueueStore;
  private geminiEngine: GeminiContentEngine;
  private visualGenerator: VisualGenerator;
  private telegramPublisher: TelegramPublisher;

  constructor(options?: {
    memoryStore?: ContentMemoryStore;
    queueStore?: ContentQueueStore;
    geminiEngine?: GeminiContentEngine;
    visualGenerator?: VisualGenerator;
    telegramPublisher?: TelegramPublisher;
  }) {
    this.memoryStore = options?.memoryStore || new ContentMemoryStore();
    this.queueStore = options?.queueStore || new ContentQueueStore();
    this.geminiEngine = options?.geminiEngine || new GeminiContentEngine();
    this.visualGenerator =
      options?.visualGenerator || new VisualGenerator();
    this.telegramPublisher =
      options?.telegramPublisher || new TelegramPublisher();
  }

  /**
   * Generates N evidence-based posts and stores them in the queue.
   * Strictly enforces duplicate prevention and editorial quality gates.
   */
  public async generatePosts(options?: GenerateOptions): Promise<ContentItem[]> {
    const count = options?.count && options.count > 0 ? options.count : 1;
    const generatedItems: ContentItem[] = [];

    console.log(`Starting content generation for ${count} post(s)...`);

    for (let i = 0; i < count; i++) {
      console.log(`\n--- Processing item ${i + 1} of ${count} ---`);

      // 1. Determine Target Pillar
      const memory = await this.memoryStore.loadMemory();
      const targetPillar: ContentPillar =
        options?.pillar || this.memoryStore.getNextTargetPillar(memory);
      console.log(`Target Pillar: [${targetPillar}]`);

      // 2. Select Topic with Duplication Prevention
      const recentSummary = this.memoryStore.getRecentTopicsSummary(memory, 25);
      let attempts = 0;
      const maxAttempts = 5;
      let selectedTopic: TopicCandidate | null = null;
      const excludedTopics: string[] = [];

      while (attempts < maxAttempts) {
        attempts++;
        try {
          const candidate = await this.geminiEngine.selectTopic({
            recentMemorySummary: recentSummary,
            targetPillar,
            forcedTopic: attempts === 1 ? options?.topic : undefined,
            excludedTopics,
          });

          const dupCheck = this.memoryStore.isDuplicate(candidate.topic, memory);
          if (!dupCheck.isDuplicate && !excludedTopics.includes(candidate.topic)) {
            selectedTopic = candidate;
            break;
          }

          console.warn(
            `Topic "${candidate.topic}" flagged as duplicate: ${dupCheck.reason || 'excluded'}. Retrying with exclusion (attempt ${attempts}/${maxAttempts})...`
          );
          excludedTopics.push(candidate.topic);
        } catch (err) {
          console.warn(`Topic selection attempt ${attempts} encountered error:`, err);
        }
      }

      if (!selectedTopic) {
        const errorMsg = `Unable to select a unique, non-duplicate topic for pillar "${targetPillar}" after ${maxAttempts} attempts. Halting generation to prevent duplicate publication.`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      console.log(`Topic selected: "${selectedTopic.topic}"`);
      console.log(`Core question: ${selectedTopic.coreQuestion}`);

      // 3. Research the Topic
      console.log('Conducting empirical research and identifying caveats...');
      const research = await this.geminiEngine.researchTopic(selectedTopic);
      console.log(
        `Research complete. Studies found: ${research.keyStudies.length}. Uncertainty level: ${research.uncertaintyLevel}`
      );

      // 4. Editorial Writing
      console.log('Drafting editorial post...');
      let draft: PostDraft = await this.geminiEngine.writeEditorialPost(
        selectedTopic,
        research
      );

      // 5. Quality & Editorial Linting Gate
      let quality = QualityChecker.validate(draft);
      if (!quality.isValid) {
        console.warn(
          `Quality gate flagged initial draft for "${selectedTopic.topic}":`,
          quality.errors
        );
        console.log('Retrying editorial generation with correction instructions...');
        draft = await this.geminiEngine.reviseEditorialPost(
          selectedTopic,
          research,
          draft,
          quality.errors
        );
        quality = QualityChecker.validate(draft);
      }

      if (!quality.isValid) {
        console.error(
          `Quality gate FAILED after revision attempt for "${selectedTopic.topic}". Item rejected. Errors:`,
          quality.errors
        );
        // Strict Gate: Do NOT enqueue or publish invalid draft
        continue;
      }

      if (quality.warnings.length > 0) {
        console.log('Quality warnings (non-blocking):', quality.warnings);
      }

      // 6. Visual Evaluation & Decision
      console.log('Evaluating visual requirement...');
      const visualDecision: VisualDecision =
        await this.geminiEngine.evaluateVisualDecision(draft, research);

      let graphicPath: string | undefined;
      if (visualDecision.needed && visualDecision.spec) {
        console.log(
          `Visual needed! Template selected: ${visualDecision.template}. Generating graphic locally via Satori + Sharp...`
        );
        try {
          const renderResult = await this.visualGenerator.renderGraphic(
            visualDecision.spec,
            `post-${Date.now()}`
          );
          graphicPath = renderResult.filePath;
          console.log(`Graphic generated: ${graphicPath}`);
        } catch (err) {
          console.error('Failed to generate visual graphic:', err);
          visualDecision.needed = false;
        }
      } else {
        console.log('No visual needed for this concept. Post will publish as text only.');
      }

      // 7. Format Telegram Text (Single message per post)
      let formattedText: string;
      if (visualDecision.needed && graphicPath) {
        // Adapt draft for concise visual-post caption (<= 1024 chars) and format as visual caption
        draft = await this.geminiEngine.adaptDraftForVisualPost(draft, research);
        formattedText = this.telegramPublisher.formatVisualPost(draft);
      } else {
        // Text-only post format
        formattedText = this.telegramPublisher.formatMessage(draft);
      }

      const contentItem: ContentItem = {
        id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        status: 'queued',
        createdAt: new Date().toISOString(),
        pillar: targetPillar,
        topic: selectedTopic.topic,
        draft,
        visualDecision,
        graphicPath,
        formattedText,
      };

      // Add to queue
      await this.queueStore.enqueue(contentItem);
      generatedItems.push(contentItem);
      console.log(`Post enqueued with ID: ${contentItem.id}`);
    }

    return generatedItems;
  }

  /**
   * Publishes the next scheduled post from the queue.
   * If queue is empty, generates 1 post automatically.
   * NEVER records dry-run or failed attempts to publication memory.
   */
  public async publishNext(
    options?: PublishOptions
  ): Promise<{ success: boolean; item?: ContentItem; result?: TelegramPublishResult }> {
    console.log('Checking queue for next pending post...');
    let item = await this.queueStore.dequeueNext();

    if (!item) {
      console.log('Queue is currently empty. Auto-generating fresh post for immediate publication...');
      const generated = await this.generatePosts({ count: 1 });
      if (generated.length === 0) {
        throw new Error('Failed to auto-generate post for publishing: quality gate rejected invalid content.');
      }
      item = await this.queueStore.dequeueNext();
      if (!item) {
        item = generated[0];
      }
    }

    console.log(`Publishing post: "${item.draft.title}" [${item.pillar}]`);
    const result = await this.telegramPublisher.publish(item, {
      dryRun: options?.dryRun,
    });

    if (result.success && !options?.dryRun && !result.dryRun) {
      item.status = 'published';
      item.publishedAt = new Date().toISOString();
      item.telegramMessageId = result.messageId;

      // Record to content memory ONLY upon confirmed publication
      await this.memoryStore.recordPublication(item);
      console.log(
        `Successfully published and recorded to memory! (Message ID: ${result.messageId})`
      );
    } else if (options?.dryRun || result.dryRun) {
      console.log('[DRY-RUN] Simulation complete. Item not recorded to publication memory.');
      // Restore item back to queue so real publication run can send it
      item.status = 'queued';
      await this.queueStore.enqueue(item);
    } else {
      item.status = 'failed';
      item.failureReason = result.error;
      // Put back into queue so it can be re-tried
      await this.queueStore.enqueue(item);
      console.error(`Failed to publish item: ${result.error}`);
    }

    return {
      success: result.success,
      item,
      result,
    };
  }

  /**
   * Convenience: Generates 1 post and immediately publishes it.
   */
  public async generateAndPublish(
    options?: GenerateOptions
  ): Promise<{ success: boolean; item?: ContentItem; result?: TelegramPublishResult }> {
    const items = await this.generatePosts({
      count: 1,
      pillar: options?.pillar,
      topic: options?.topic,
      dryRun: options?.dryRun,
    });

    if (items.length === 0) {
      return { success: false };
    }

    return await this.publishNext({ dryRun: options?.dryRun });
  }

  /**
   * System status summary.
   */
  public async getStatus(): Promise<{
    queueCount: number;
    memoryCount: number;
    recentMemory: Array<{ title: string; pillar: ContentPillar; date: string }>;
    nextTargetPillar: ContentPillar;
  }> {
    const queue = await this.queueStore.peek();
    const memory = await this.memoryStore.loadMemory();
    const nextTargetPillar = this.memoryStore.getNextTargetPillar(memory);

    return {
      queueCount: queue.length,
      memoryCount: memory.length,
      recentMemory: memory.slice(0, 5).map((m) => ({
        title: m.title,
        pillar: m.pillar,
        date: m.publicationDate,
      })),
      nextTargetPillar,
    };
  }
}

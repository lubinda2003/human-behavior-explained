/**
 * Pipeline Coordinator
 * Orchestrates topic selection, research, editorial writing, quality gating, visual generation,
 * queue storage, and Telegram publishing.
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
      const recentSummary = this.memoryStore.getRecentTopicsSummary(memory, 20);
      let attempts = 0;
      let selectedTopic = await this.geminiEngine.selectTopic({
        recentMemorySummary: recentSummary,
        targetPillar,
        forcedTopic: options?.topic,
      });

      // Check against memory for duplicate topics
      while (attempts < 3) {
        const dupCheck = this.memoryStore.isDuplicate(
          selectedTopic.topic,
          memory
        );
        if (!dupCheck.isDuplicate) {
          break;
        }
        console.warn(
          `Topic "${selectedTopic.topic}" flagged as duplicate: ${dupCheck.reason}. Retrying topic selection...`
        );
        attempts++;
        selectedTopic = await this.geminiEngine.selectTopic({
          recentMemorySummary:
            recentSummary + `\nAvoid specifically: "${selectedTopic.topic}"`,
          targetPillar,
        });
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

      // 5. Quality & Editorial Linting
      const quality = QualityChecker.validate(draft);
      if (!quality.isValid) {
        console.warn('Quality check identified issues:', quality.errors);
        // Attempt clean fix on caveat or sources if missing
        if (!draft.caveatNote && research.caveatsAndLimitations.length > 0) {
          draft.caveatNote = research.caveatsAndLimitations[0];
        }
        if (
          (!draft.sourcesCited || draft.sourcesCited.length === 0) &&
          research.keyStudies.length > 0
        ) {
          draft.sourcesCited = [
            `${research.keyStudies[0].authors} (${research.keyStudies[0].year})`,
          ];
        }
      }
      if (quality.warnings.length > 0) {
        console.log('Quality warnings:', quality.warnings);
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

      // 7. Format Telegram Text
      const formattedText = this.telegramPublisher.formatMessage(draft);

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
        throw new Error('Failed to auto-generate post for publishing.');
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

    if (result.success) {
      item.status = 'published';
      item.publishedAt = new Date().toISOString();
      item.telegramMessageId = result.messageId;

      // Record to content memory
      await this.memoryStore.recordPublication(item);
      console.log(
        `Successfully published and recorded to memory! (Message ID: ${result.messageId || 'simulated'})`
      );
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

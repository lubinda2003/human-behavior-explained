/**
 * Telegram Publisher Service
 * Publishes text-only posts and posts with graphics to Telegram channels via the Bot API.
 */

import fs from 'node:fs';
import { ContentItem, PostDraft } from './types.js';

export interface TelegramPublishResult {
  success: boolean;
  messageId?: number;
  photoMessageId?: number;
  dryRun?: boolean;
  error?: string;
}

export function escapeTelegramHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export class TelegramPublisher {
  private botToken: string;
  private channelId: string;

  constructor(customBotToken?: string, customChannelId?: string) {
    this.botToken = customBotToken || process.env.TELEGRAM_BOT_TOKEN || '';
    this.channelId = customChannelId || process.env.TELEGRAM_CHANNEL_ID || '';
  }

  /**
   * Format a PostDraft into clean, readable Telegram HTML.
   * Reads conversationally with natural whitespace, strategic emoji anchors, and lightweight citations,
   * without rigid visible template labels (like "Key Insight:", "Core Mechanism:", "Reflection:").
   */
  public formatMessage(draft: PostDraft): string {
    const lines: string[] = [];

    // Header: Title and Pillar hashtag
    lines.push(`<b>${escapeTelegramHtml(draft.title)}</b>`);

    const pillarTag = draft.pillar
      .replace(/[^a-zA-Z0-9]/g, '')
      .replace(/\s+/g, '');
    lines.push(`<i>#${pillarTag}</i>`);
    lines.push('');

    // Format-specific: Poll
    if (draft.format === 'poll' && draft.poll) {
      if (draft.hook) {
        lines.push(escapeTelegramHtml(draft.hook));
        lines.push('');
      }

      lines.push(`📊 <b>${escapeTelegramHtml(draft.poll.question)}</b>`);
      lines.push('');

      const optionMarkers = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];
      draft.poll.options.forEach((opt, idx) => {
        const marker = optionMarkers[idx] || '👉';
        lines.push(`${marker} ${escapeTelegramHtml(opt)}`);
      });
      lines.push('');

      if (draft.poll.explanation || draft.coreTakeaway) {
        lines.push(`💡 <i>${escapeTelegramHtml(draft.poll.explanation || draft.coreTakeaway)}</i>`);
        lines.push('');
      }

      if (draft.caveatNote) {
        lines.push(`⚠️ <i>${escapeTelegramHtml(draft.caveatNote)}</i>`);
        lines.push('');
      }

      if (draft.sourcesCited && draft.sourcesCited.length > 0) {
        lines.push(
          `🔬 <code>${escapeTelegramHtml(draft.sourcesCited.join(' • '))}</code>`
        );
      }

      if (draft.cta && draft.cta.type !== 'none' && draft.cta.text) {
        lines.push('');
        lines.push(escapeTelegramHtml(draft.cta.text));
      }

      return lines.join('\n').trim();
    }

    // Hook: Grounded in the relatable human experience
    lines.push(escapeTelegramHtml(draft.hook));
    lines.push('');

    // Body Paragraphs: Conversational prose with intentional whitespace
    for (const p of draft.bodyParagraphs) {
      lines.push(escapeTelegramHtml(p));
      lines.push('');
    }

    // Core Takeaway / Realization: Natural semantic anchor (🎯) without rigid visible labels
    if (draft.coreTakeaway) {
      lines.push(`🎯 <i>${escapeTelegramHtml(draft.coreTakeaway)}</i>`);
      lines.push('');
    }

    // Scientific Caveat Note: Restrained qualification anchor (⚠️)
    if (draft.caveatNote) {
      lines.push(`⚠️ <i>${escapeTelegramHtml(draft.caveatNote)}</i>`);
      lines.push('');
    }

    // Sources Cited: Lightweight evidence line with research anchor (🔬)
    if (draft.sourcesCited && draft.sourcesCited.length > 0) {
      lines.push(
        `🔬 <code>${escapeTelegramHtml(draft.sourcesCited.join(' • '))}</code>`
      );
    }

    // Natural Ending / CTA: Conversational thought without artificial "Reflection:" header
    if (draft.cta && draft.cta.type !== 'none' && draft.cta.text) {
      lines.push('');
      lines.push(escapeTelegramHtml(draft.cta.text));
    }

    return lines.join('\n').trim();
  }

  /**
   * Format a complete caption for photo posts that strictly fits Telegram's 1024-character caption limit,
   * while preserving the hook, complete explanation sentences, core takeaway, limitation/context, evidence, and CTA.
   * Uses conversational styling with semantic visual anchors rather than rigid section headers.
   */
  public formatVisualPost(draft: PostDraft): string {
    // 1. If full standard format already fits comfortably under Telegram's 1024 limit, use it directly
    const standard = this.formatMessage(draft);
    if (standard.length <= 1020) {
      return standard;
    }

    // 2. Otherwise, construct a visual-post caption that preserves all key editorial sections
    const headerLines: string[] = [];
    headerLines.push(`<b>${escapeTelegramHtml(draft.title)}</b>`);

    const pillarTag = draft.pillar
      .replace(/[^a-zA-Z0-9]/g, '')
      .replace(/\s+/g, '');
    headerLines.push(`<i>#${pillarTag}</i>`);
    headerLines.push('');
    headerLines.push(escapeTelegramHtml(draft.hook));

    // Structured conclusion sections (Preserved intact with semantic anchors, no rigid labels)
    const footerLines: string[] = [];
    footerLines.push('');
    if (draft.coreTakeaway) {
      footerLines.push(`🎯 <i>${escapeTelegramHtml(draft.coreTakeaway)}</i>`);
    }

    if (draft.caveatNote) {
      footerLines.push('');
      footerLines.push(`⚠️ <i>${escapeTelegramHtml(draft.caveatNote)}</i>`);
    }

    if (draft.sourcesCited && draft.sourcesCited.length > 0) {
      footerLines.push('');
      footerLines.push(
        `🔬 <code>${escapeTelegramHtml(draft.sourcesCited.join(' • '))}</code>`
      );
    }

    if (draft.cta && draft.cta.type !== 'none' && draft.cta.text) {
      footerLines.push('');
      footerLines.push(escapeTelegramHtml(draft.cta.text));
    }

    const headerText = headerLines.join('\n');
    const footerText = footerLines.join('\n');
    const reservedChars = headerText.length + footerText.length + 2; // account for newlines
    const maxBodyChars = Math.max(60, 1020 - reservedChars);

    // Extract complete grammatical sentences from body paragraphs
    const combinedBody = draft.bodyParagraphs.join(' ');
    // Match complete sentences ending in terminal punctuation
    const sentenceMatches = combinedBody.match(/[^.!?]+[.!?]+/g) || [combinedBody];
    const chosenSentences: string[] = [];
    let currentLength = 0;

    for (const rawSentence of sentenceMatches) {
      const sentence = rawSentence.trim();
      const escaped = escapeTelegramHtml(sentence);
      if (currentLength + escaped.length + 1 <= maxBodyChars) {
        chosenSentences.push(escaped);
        currentLength += escaped.length + 1;
      } else {
        break;
      }
    }

    // If at least one complete sentence fit within the budget, use it; otherwise use the first sentence
    const bodyExplanation = chosenSentences.length > 0
      ? chosenSentences.join(' ')
      : escapeTelegramHtml((sentenceMatches[0] || '').trim().slice(0, maxBodyChars));

    const result = `${headerText}\n\n${bodyExplanation}${footerText}`.trim();
    if (result.length > 1024) {
      return result.slice(0, 1020) + '…';
    }
    return result;
  }

  /**
   * Legacy alias: formats a complete visual post caption.
   * Kept for backward compatibility; does NOT produce a separately published summary.
   */
  public formatPhotoSummaryCaption(draft: PostDraft): string {
    return this.formatVisualPost(draft);
  }

  /**
   * Publish a ContentItem to the Telegram channel.
   * Produces exactly ONE message: sendPhoto with caption if visual, or sendMessage if text-only.
   */
  public async publish(
    item: ContentItem,
    options?: { dryRun?: boolean }
  ): Promise<TelegramPublishResult> {
    const isDryRun =
      options?.dryRun ||
      !this.botToken ||
      !this.channelId ||
      this.botToken.includes('MY_') ||
      this.channelId.includes('@your_');

    const isVisualPost = Boolean(
      item.visualDecision?.needed &&
      item.graphicPath &&
      (isDryRun || fs.existsSync(item.graphicPath))
    );

    // Single message content
    const messageContent = isVisualPost
      ? (item.formattedText || this.formatVisualPost(item.draft))
      : (item.formattedText || this.formatMessage(item.draft));

    if (isDryRun) {
      console.log('\n================ [TELEGRAM DRY-RUN] ================');
      console.log(`Channel Target: ${this.channelId || '(Not set - using simulation)'}`);
      console.log(`Pillar: ${item.pillar}`);
      console.log(`Visual Used: ${item.visualDecision?.needed ? 'YES (' + item.visualDecision.template + ')' : 'NO'}`);
      if (item.graphicPath) {
        console.log(`Graphic Path: ${item.graphicPath}`);
      }
      console.log('---------------- Single Message Preview ----------------');
      console.log(messageContent);
      console.log(`Caption/Message Length: ${messageContent.length} chars (Limit: ${isVisualPost ? '1024' : '4096'})`);
      console.log('====================================================\n');

      const simulatedId = Math.floor(Math.random() * 900000) + 100000;
      return {
        success: true,
        dryRun: true,
        messageId: simulatedId,
        photoMessageId: isVisualPost ? simulatedId : undefined,
      };
    }

    try {
      if (isVisualPost && item.graphicPath && fs.existsSync(item.graphicPath)) {
        // Send Photo + Caption as ONE single message
        return await this.sendPhotoWithText(item.graphicPath, messageContent);
      } else {
        // Send Text Only as ONE single message
        return await this.sendTextMessage(messageContent);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`Telegram publish error: ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  private async sendTextMessage(text: string): Promise<TelegramPublishResult> {
    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: this.channelId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const data = await response.json() as { ok: boolean; result?: { message_id: number }; description?: string };
    if (!data.ok) {
      throw new Error(`Telegram API Error: ${data.description || 'Unknown error'}`);
    }

    return {
      success: true,
      messageId: data.result?.message_id,
    };
  }

  private async sendPhotoWithText(
    photoPath: string,
    captionText: string
  ): Promise<TelegramPublishResult> {
    const url = `https://api.telegram.org/bot${this.botToken}/sendPhoto`;
    const fileBuffer = fs.readFileSync(photoPath);
    const blob = new Blob([fileBuffer], { type: 'image/png' });

    const formData = new FormData();
    formData.append('chat_id', this.channelId);
    formData.append('photo', blob, 'graphic.png');
    formData.append('parse_mode', 'HTML');
    formData.append('caption', captionText);

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json() as { ok: boolean; result?: { message_id: number }; description?: string };
    if (!data.ok) {
      throw new Error(`Telegram Photo API Error: ${data.description || 'Unknown error'}`);
    }

    const photoMsgId = data.result?.message_id;

    // Exactly one message is published: sendPhoto. Never send a second companion text message.
    return {
      success: true,
      photoMessageId: photoMsgId,
      messageId: photoMsgId,
    };
  }
}

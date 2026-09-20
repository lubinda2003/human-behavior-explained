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

    // Hook
    lines.push(escapeTelegramHtml(draft.hook));
    lines.push('');

    // Body Paragraphs
    for (const p of draft.bodyParagraphs) {
      lines.push(escapeTelegramHtml(p));
      lines.push('');
    }

    // Core Takeaway block
    lines.push(`<b>Key Insight:</b>`);
    lines.push(`<i>${escapeTelegramHtml(draft.coreTakeaway)}</i>`);
    lines.push('');

    // Scientific Caveat Note
    if (draft.caveatNote) {
      lines.push(`<b>Limitation &amp; Context:</b>`);
      lines.push(escapeTelegramHtml(draft.caveatNote));
      lines.push('');
    }

    // Sources Cited
    if (draft.sourcesCited && draft.sourcesCited.length > 0) {
      lines.push(
        `<code>Evidence: ${escapeTelegramHtml(draft.sourcesCited.join(' • '))}</code>`
      );
    }

    // Natural CTA
    if (draft.cta && draft.cta.type !== 'none' && draft.cta.text) {
      lines.push('');
      lines.push(`<b>Reflection:</b> ${escapeTelegramHtml(draft.cta.text)}`);
    }

    return lines.join('\n').trim();
  }

  /**
   * Format a concise caption for photo posts if full text exceeds Telegram's 1024 char caption limit.
   */
  public formatPhotoSummaryCaption(draft: PostDraft): string {
    const lines: string[] = [];
    lines.push(`<b>${escapeTelegramHtml(draft.title)}</b>`);
    const pillarTag = draft.pillar.replace(/[^a-zA-Z0-9]/g, '');
    lines.push(`<i>#${pillarTag}</i>`);
    lines.push('');
    lines.push(escapeTelegramHtml(draft.hook));
    lines.push('');
    lines.push(`<b>Core Mechanism:</b>`);
    lines.push(`<i>${escapeTelegramHtml(draft.coreTakeaway)}</i>`);
    if (draft.sourcesCited && draft.sourcesCited.length > 0) {
      lines.push('');
      lines.push(
        `<code>${escapeTelegramHtml(draft.sourcesCited[0])}</code>`
      );
    }
    return lines.join('\n').trim();
  }

  /**
   * Publish a ContentItem to the Telegram channel.
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

    const formattedText = this.formatMessage(item.draft);

    if (isDryRun) {
      console.log('\n================ [TELEGRAM DRY-RUN] ================');
      console.log(`Channel Target: ${this.channelId || '(Not set - using simulation)'}`);
      console.log(`Pillar: ${item.pillar}`);
      console.log(`Visual Used: ${item.visualDecision.needed ? 'YES (' + item.visualDecision.template + ')' : 'NO'}`);
      if (item.graphicPath) {
        console.log(`Graphic Path: ${item.graphicPath}`);
      }
      console.log('---------------- Content Preview ----------------');
      console.log(formattedText);
      console.log('====================================================\n');

      return {
        success: true,
        dryRun: true,
        messageId: Math.floor(Math.random() * 900000) + 100000,
      };
    }

    try {
      if (item.visualDecision.needed && item.graphicPath && fs.existsSync(item.graphicPath)) {
        // Send Photo
        return await this.sendPhotoWithText(item.graphicPath, formattedText, item.draft);
      } else {
        // Send Text Only
        return await this.sendTextMessage(formattedText);
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
    fullText: string,
    draft: PostDraft
  ): Promise<TelegramPublishResult> {
    const url = `https://api.telegram.org/bot${this.botToken}/sendPhoto`;
    const fileBuffer = fs.readFileSync(photoPath);
    const blob = new Blob([fileBuffer], { type: 'image/png' });

    // Telegram photo caption limit is 1024 characters
    const useDirectCaption = fullText.length <= 1020;

    const formData = new FormData();
    formData.append('chat_id', this.channelId);
    formData.append('photo', blob, 'graphic.png');
    formData.append('parse_mode', 'HTML');

    if (useDirectCaption) {
      formData.append('caption', fullText);
    } else {
      const summaryCaption = this.formatPhotoSummaryCaption(draft);
      formData.append('caption', summaryCaption);
    }

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json() as { ok: boolean; result?: { message_id: number }; description?: string };
    if (!data.ok) {
      throw new Error(`Telegram Photo API Error: ${data.description || 'Unknown error'}`);
    }

    const photoMsgId = data.result?.message_id;

    // If text was longer than 1020 chars, send full companion post right below photo
    let textMsgId: number | undefined;
    if (!useDirectCaption) {
      const textRes = await this.sendTextMessage(fullText);
      textMsgId = textRes.messageId;
    }

    return {
      success: true,
      photoMessageId: photoMsgId,
      messageId: textMsgId || photoMsgId,
    };
  }
}

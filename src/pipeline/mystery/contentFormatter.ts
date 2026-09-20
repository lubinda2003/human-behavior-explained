/**
 * Mystery Content Formatter
 * Formats MysteryPostDraft objects into clean, atmospheric Telegram HTML messages
 * across all 5 mystery formats (CASE_INTRO, EVIDENCE, INVESTIGATION_POLL, CLUE_REVEAL, FINAL_REVEAL).
 * Respects single-message visual caption limits (1024 chars).
 */

import { MysteryPostDraft, MysteryContentType } from './types.js';

export function escapeTelegramHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export class MysteryContentFormatter {
  /**
   * Format any mystery post draft into clean, formatted Telegram HTML.
   */
  public static formatPost(draft: MysteryPostDraft): string {
    switch (draft.format) {
      case 'CASE_INTRO':
        return this.formatCaseIntro(draft);
      case 'EVIDENCE':
        return this.formatEvidence(draft);
      case 'INVESTIGATION_POLL':
        return this.formatInvestigationPoll(draft);
      case 'CLUE_REVEAL':
        return this.formatClueReveal(draft);
      case 'FINAL_REVEAL':
        return this.formatFinalReveal(draft);
      default:
        return this.formatGeneric(draft);
    }
  }

  /**
   * Format CASE_INTRO: Title, case badge, narrative hook, setting, core enigma, and suspects.
   */
  public static formatCaseIntro(draft: MysteryPostDraft): string {
    const lines: string[] = [];

    lines.push(`📁 <b>${escapeTelegramHtml(draft.headline)}</b>`);
    lines.push(`<i>#ActiveInvestigation #${draft.caseId.replace(/[^a-zA-Z0-9]/g, '')}</i>`);
    lines.push('');

    // Narrative Hook
    lines.push(escapeTelegramHtml(draft.hook));
    lines.push('');

    // Body Paragraphs (Setting, Enigma, Persons of Interest)
    for (const p of draft.bodyParagraphs) {
      lines.push(p); // Paragraphs already contain safe HTML formatting from model
      lines.push('');
    }

    if (draft.callToAction) {
      lines.push(`🔎 <i>${escapeTelegramHtml(draft.callToAction)}</i>`);
    }

    return lines.join('\n').trim();
  }

  /**
   * Format EVIDENCE: Forensic item breakdown, location, significance, and analysis.
   */
  public static formatEvidence(draft: MysteryPostDraft): string {
    const lines: string[] = [];

    lines.push(`🧪 <b>${escapeTelegramHtml(draft.headline)}</b>`);
    lines.push(`<i>#EvidenceLog #${draft.caseId.replace(/[^a-zA-Z0-9]/g, '')}</i>`);
    lines.push('');

    lines.push(escapeTelegramHtml(draft.hook));
    lines.push('');

    for (const p of draft.bodyParagraphs) {
      lines.push(p);
      lines.push('');
    }

    if (draft.callToAction) {
      lines.push(`🔍 <i>${escapeTelegramHtml(draft.callToAction)}</i>`);
    }

    return lines.join('\n').trim();
  }

  /**
   * Format INVESTIGATION_POLL: Interactive Telegram voting post.
   */
  public static formatInvestigationPoll(draft: MysteryPostDraft): string {
    const lines: string[] = [];

    lines.push(`📊 <b>${escapeTelegramHtml(draft.headline)}</b>`);
    lines.push(`<i>#InvestigationDirective #${draft.caseId.replace(/[^a-zA-Z0-9]/g, '')}</i>`);
    lines.push('');

    lines.push(escapeTelegramHtml(draft.hook));
    lines.push('');

    if (draft.poll) {
      lines.push(`❓ <b>${escapeTelegramHtml(draft.poll.question)}</b>`);
      lines.push('');

      const markers = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];
      draft.poll.options.forEach((opt, idx) => {
        const marker = markers[idx] || '👉';
        lines.push(`${marker} ${escapeTelegramHtml(opt)}`);
      });
      lines.push('');

      if (draft.poll.explanation) {
        lines.push(`💡 <i>${escapeTelegramHtml(draft.poll.explanation)}</i>`);
        lines.push('');
      }
    }

    if (draft.callToAction) {
      lines.push(`🗳️ <i>${escapeTelegramHtml(draft.callToAction)}</i>`);
    }

    return lines.join('\n').trim();
  }

  /**
   * Format CLUE_REVEAL: Breakthrough discovery and forensic deduction.
   */
  public static formatClueReveal(draft: MysteryPostDraft): string {
    const lines: string[] = [];

    lines.push(`💡 <b>${escapeTelegramHtml(draft.headline)}</b>`);
    lines.push(`<i>#ForensicBreakthrough #${draft.caseId.replace(/[^a-zA-Z0-9]/g, '')}</i>`);
    lines.push('');

    lines.push(escapeTelegramHtml(draft.hook));
    lines.push('');

    for (const p of draft.bodyParagraphs) {
      lines.push(p);
      lines.push('');
    }

    if (draft.callToAction) {
      lines.push(`🧩 <i>${escapeTelegramHtml(draft.callToAction)}</i>`);
    }

    return lines.join('\n').trim();
  }

  /**
   * Format FINAL_REVEAL: Complete case solution, culprit/cause, deduction chain.
   */
  public static formatFinalReveal(draft: MysteryPostDraft): string {
    const lines: string[] = [];

    lines.push(`⚖️ <b>${escapeTelegramHtml(draft.headline)}</b>`);
    lines.push(`<i>#CaseClosed #${draft.caseId.replace(/[^a-zA-Z0-9]/g, '')}</i>`);
    lines.push('');

    lines.push(escapeTelegramHtml(draft.hook));
    lines.push('');

    for (const p of draft.bodyParagraphs) {
      lines.push(p);
      lines.push('');
    }

    if (draft.callToAction) {
      lines.push(`🎯 <i>${escapeTelegramHtml(draft.callToAction)}</i>`);
    }

    return lines.join('\n').trim();
  }

  private static formatGeneric(draft: MysteryPostDraft): string {
    const lines: string[] = [];
    lines.push(`🔍 <b>${escapeTelegramHtml(draft.headline)}</b>`);
    lines.push('');
    lines.push(escapeTelegramHtml(draft.hook));
    lines.push('');
    for (const p of draft.bodyParagraphs) {
      lines.push(p);
      lines.push('');
    }
    if (draft.callToAction) {
      lines.push(`<i>${escapeTelegramHtml(draft.callToAction)}</i>`);
    }
    return lines.join('\n').trim();
  }

  /**
   * Formats photo caption ensuring it remains strictly under Telegram's 1024-character caption limit.
   */
  public static formatVisualCaption(draft: MysteryPostDraft): string {
    const full = this.formatPost(draft);
    if (full.length <= 1020) {
      return full;
    }

    // Truncate cleanly while preserving headline, hook, and core clues
    const lines: string[] = [];
    lines.push(`📁 <b>${escapeTelegramHtml(draft.headline)}</b>`);
    lines.push(`<i>#CaseFile #${draft.caseId.replace(/[^a-zA-Z0-9]/g, '')}</i>`);
    lines.push('');
    lines.push(escapeTelegramHtml(draft.hook.slice(0, 300) + '...'));
    lines.push('');
    if (draft.callToAction) {
      lines.push(`🔎 <i>${escapeTelegramHtml(draft.callToAction)}</i>`);
    }

    const caption = lines.join('\n').trim();
    return caption.length <= 1024 ? caption : caption.slice(0, 1020) + '...';
  }
}

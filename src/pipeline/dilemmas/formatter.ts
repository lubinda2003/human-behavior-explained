/**
 * Telegram Post Formatter for Interactive Dilemmas & Impossible Choices (Phase 6)
 * Generates entertainment-first, mobile-optimized HTML posts with clean choice breakdowns,
 * poll prompts, and spoiler-tagged payoff reveals.
 */

import { InteractiveDilemma, DilemmaChoice } from './types.js';

export class DilemmaTelegramFormatter {
  private static readonly CHOICE_EMOJIS = ['🅰️', '🅱️', '🅲', '🅳'];

  /**
   * Escapes HTML special characters for Telegram HTML mode.
   */
  public static escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Converts category to a clean hashtag string.
   */
  public static categoryToHashtag(category: string): string {
    return '#' + category.replace(/[\/\s]/g, '').replace(/[^a-zA-Z0-9]/g, '');
  }

  /**
   * Formats a complete Interactive Dilemma post for Telegram.
   */
  public static formatPost(dilemma: Omit<InteractiveDilemma, 'formattedTelegramText'>): string {
    const lines: string[] = [];

    // 1. Header & Channel Hashtags
    const safeTitle = this.escapeHtml(dilemma.title);
    const catHashtag = this.categoryToHashtag(dilemma.category);
    lines.push(`<b>🔥 ${safeTitle}</b>`);
    lines.push(`<i>#InteractiveDilemmas ${catHashtag}</i>`);
    lines.push('');

    // 2. Hook
    const safeHook = this.escapeHtml(dilemma.hook);
    lines.push(`<b>${safeHook}</b>`);
    lines.push('');

    // 3. Scenario Description
    const safeScenario = this.escapeHtml(dilemma.scenario);
    lines.push(safeScenario);
    lines.push('');

    // 4. Choices Section
    lines.push('<b>⚖️ YOUR CHOICES:</b>');
    dilemma.choices.forEach((choice, idx) => {
      const emoji = this.CHOICE_EMOJIS[idx] || `[${idx + 1}]`;
      const safeLabel = this.escapeHtml(choice.label);
      const safeDesc = this.escapeHtml(choice.description);
      const safeTradeOff = this.escapeHtml(choice.tradeOff);

      lines.push(`${emoji} <b>${safeLabel}</b>: ${safeDesc}`);
      lines.push(`   ⚠️ <i>Cost: ${safeTradeOff}</i>`);
      lines.push('');
    });

    // 5. Poll Question Prompt
    const safePoll = this.escapeHtml(dilemma.pollQuestion || 'What is your choice?');
    lines.push(`📊 <b>POLL:</b> ${safePoll}`);
    lines.push('');

    // 6. Payoff / Twist (Wrapped in spoiler tag for audience reveal)
    const safeReveal = this.escapeHtml(dilemma.payoff.reveal || '');
    const safeOutcome = this.escapeHtml(dilemma.payoff.surprisingOutcome || '');
    lines.push('<tg-spoiler>');
    lines.push('💡 <b>THE HIDDEN TWIST & OUTCOME:</b>');
    lines.push(safeReveal);
    lines.push('');
    lines.push(`🎯 <b>Why it splits players:</b> ${safeOutcome}`);
    lines.push('</tg-spoiler>');
    lines.push('');

    // 7. Interactive Call to Action
    lines.push('👇 <i>Vote in the poll and explain your decision!</i>');

    return lines.join('\n');
  }
}

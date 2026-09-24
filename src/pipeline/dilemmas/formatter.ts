/**
 * Telegram Post Formatter for Pick Your Fate & Interactive Dilemmas
 * Enforces the upgraded narrative structure:
 * HOOK → SETUP → PRESSURE/TWIST → CHOICE → CONSEQUENCE/REVEAL
 * Adapts formatting across QUICK, STANDARD, and DEEP depth levels and 12 distinct content formats.
 */

import { InteractiveDilemma, ContentFormat } from './types.js';

export class DilemmaTelegramFormatter {
  private static readonly CHOICE_EMOJIS = ['🅰️', '🅱️', '🅲', '🅳'];

  private static readonly FORMAT_ICONS: Record<ContentFormat, string> = {
    impossible_dilemma: '⚡',
    survival_scenario: '🚨',
    mini_mystery: '🕵️',
    strategy_challenge: '⏳',
    prediction: '🔮',
    versus_battle: '⚔️',
    chaotic_funny: '🎭',
    future_tech: '🤖',
    brain_logic: '🧩',
    hot_take: '🔥',
    interactive_minigame: '🎮',
    result_reveal: '🏆',
  };

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
    const depth = dilemma.depth || 'standard';
    const format = dilemma.format || 'impossible_dilemma';
    const icon = this.FORMAT_ICONS[format] || '⚡';

    // 1. Header & Channel Hashtags
    const safeTitle = this.escapeHtml(dilemma.title);
    const catHashtag = this.categoryToHashtag(dilemma.category || 'general');
    const formatHashtag = '#' + format.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');

    lines.push(`<b>${icon} ${safeTitle}</b>`);
    lines.push(`<i>#PickYourFate #InteractiveDilemmas ${catHashtag} ${formatHashtag}</i>`);
    lines.push('');

    // 2. Hook (Stops scrolling and puts user in situation)
    const safeHook = this.escapeHtml(dilemma.hook);
    lines.push(`<b>${safeHook}</b>`);
    lines.push('');

    // 3. Scenario / Setup (Concrete experience)
    const scenarioText = dilemma.setup || dilemma.scenario;
    const safeScenario = this.escapeHtml(scenarioText);
    lines.push(safeScenario);
    lines.push('');

    // 4. Pressure / Complication / Twist (if present)
    if (dilemma.pressure && dilemma.pressure.trim().length > 0) {
      const safePressure = this.escapeHtml(dilemma.pressure);
      lines.push(`⚡ <b>THE PRESSURE:</b> ${safePressure}`);
      lines.push('');
    }

    if (dilemma.twist && dilemma.twist.trim().length > 0) {
      const safeTwist = this.escapeHtml(dilemma.twist);
      lines.push(`⚠️ <b>THE COMPLICATION:</b> ${safeTwist}`);
      lines.push('');
    }

    // 5. Choices Section (Varied by depth level)
    if (dilemma.choices && dilemma.choices.length > 0) {
      if (depth === 'quick') {
        lines.push('<b>⚖️ YOUR CHOICE:</b>');
        dilemma.choices.forEach((choice, idx) => {
          const emoji = this.CHOICE_EMOJIS[idx] || `[${idx + 1}]`;
          const safeLabel = this.escapeHtml(choice.label);
          const safeTradeOff = this.escapeHtml(choice.tradeOff);
          lines.push(`${emoji} <b>${safeLabel}</b> <i>(${safeTradeOff})</i>`);
        });
        lines.push('');
      } else {
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
      }
    }

    // 6. Interaction Mechanism (Poll, Prediction, or Open Discussion)
    if (dilemma.pollQuestion && dilemma.pollQuestion.trim().length > 0) {
      const safePoll = this.escapeHtml(dilemma.pollQuestion);
      lines.push(`📊 <b>POLL:</b> ${safePoll}`);
      lines.push('');
    } else if (dilemma.discussionPrompt && dilemma.discussionPrompt.trim().length > 0) {
      const safePrompt = this.escapeHtml(dilemma.discussionPrompt);
      lines.push(`💬 <b>INTERACTION:</b> ${safePrompt}`);
      lines.push('');
    }

    // 7. Interactive Call to Action
    if (format === 'prediction') {
      lines.push('👇 <i>Lock in your prediction below and see if your instincts hold up!</i>');
    } else if (format === 'versus_battle') {
      lines.push('👇 <i>Vote for the victor and explain who survives the fallout!</i>');
    } else if (format === 'mini_mystery' || format === 'brain_logic') {
      lines.push('👇 <i>What did everyone else overlook? Drop your solution below!</i>');
    } else {
      lines.push('👇 <i>Vote in the poll and defend your choice in the comments!</i>');
    }

    return lines.join('\n');
  }
}

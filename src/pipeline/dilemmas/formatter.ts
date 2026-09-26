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
    const isDiscussionFirst =
      format === 'mini_mystery' ||
      format === 'hot_take' ||
      format === 'brain_logic' ||
      format === 'future_tech';

    if (isDiscussionFirst && dilemma.discussionPrompt && dilemma.discussionPrompt.trim().length > 0) {
      const safePrompt = this.escapeHtml(dilemma.discussionPrompt);
      lines.push(`💬 <b>DISCUSSION:</b> ${safePrompt}`);
      lines.push('');
    } else if (dilemma.pollQuestion && dilemma.pollQuestion.trim().length > 0) {
      const safePoll = this.escapeHtml(dilemma.pollQuestion);
      lines.push(`📊 <b>POLL:</b> ${safePoll}`);
      lines.push('');
    } else if (dilemma.discussionPrompt && dilemma.discussionPrompt.trim().length > 0) {
      const safePrompt = this.escapeHtml(dilemma.discussionPrompt);
      lines.push(`💬 <b>DISCUSSION:</b> ${safePrompt}`);
      lines.push('');
    }

    // 7. Interactive Call to Action (Pick Your Fate Voice)
    if (format === 'prediction') {
      lines.push('👇 <i>Lock in your prediction below before the clock runs out!</i>');
    } else if (format === 'versus_battle') {
      lines.push('👇 <i>Vote for the winner. Who walks away and who falls?</i>');
    } else if (format === 'mini_mystery') {
      lines.push('👇 <i>Spot the clue everyone else missed? Drop your deduction in the comments!</i>');
    } else if (format === 'brain_logic') {
      lines.push('👇 <i>Think you found the flaw? Prove your logic in the comments!</i>');
    } else if (format === 'hot_take') {
      lines.push('👇 <i>Pick a side and defend it in the comments below!</i>');
    } else if (format === 'future_tech') {
      lines.push('👇 <i>Would you take this deal? Argue your case in the comments!</i>');
    } else if (format === 'strategy_challenge') {
      lines.push('👇 <i>Cast your vote and defend your strategy in the comments!</i>');
    } else if (format === 'survival_scenario') {
      lines.push('👇 <i>Make your call before time runs out. Vote below!</i>');
    } else if (format === 'chaotic_funny') {
      lines.push('👇 <i>Pick your poison below and see how chaotic the channel gets!</i>');
    } else {
      lines.push('👇 <i>Vote in the poll and defend your choice in the comments!</i>');
    }

    return lines.join('\n');
  }
}

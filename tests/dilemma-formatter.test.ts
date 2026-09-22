/**
 * Telegram Dilemma Formatter Test Suite
 * Tests Telegram HTML escaping, structure tags, and format icons.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DilemmaTelegramFormatter } from '../src/pipeline/dilemmas/formatter.js';
import { DilemmaGenerator } from '../src/pipeline/dilemmas/generator.js';

describe('Dilemma Telegram Formatter', () => {
  const generator = new DilemmaGenerator();

  it('correctly escapes HTML special characters', () => {
    const raw = 'Risk & Reward <50% vs >80%';
    const escaped = DilemmaTelegramFormatter.escapeHtml(raw);
    assert.equal(escaped, 'Risk &amp; Reward &lt;50% vs &gt;80%');
  });

  it('formats posts with appropriate emojis and choice tags', async () => {
    const dilemma = await generator.generateDilemma({
      category: 'survival',
      format: 'survival_scenario',
      depth: 'standard',
    });

    const formatted = DilemmaTelegramFormatter.formatPost(dilemma);
    assert.ok(formatted.includes('<b>'));
    assert.ok(formatted.includes('</b>'));
    assert.ok(formatted.includes('🅰️'));
    assert.ok(formatted.includes('🅱️'));
    assert.ok(formatted.includes('#survival'));
  });

  it('formats quick depth posts concisely', async () => {
    const dilemma = await generator.generateDilemma({
      category: 'funny/chaotic',
      depth: 'quick',
    });

    const formatted = DilemmaTelegramFormatter.formatPost(dilemma);
    assert.ok(formatted.length > 50);
    assert.ok(formatted.includes('🅰️'));
  });
});

/**
 * Telegram Publisher Tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeTelegramHtml,
  TelegramPublisher,
} from '../src/pipeline/telegram.js';
import { ContentItem, PostDraft } from '../src/pipeline/types.js';

describe('Telegram Publisher', () => {
  const sampleDraft: PostDraft = {
    title: 'The Spotlight Effect: Nobody Is Watching You',
    pillar: 'Strange Human Behavior',
    hook: 'Spill coffee on your shirt, and you assume everyone in the café is staring & judging.',
    bodyParagraphs: [
      'In a classic Cornell study by Thomas Gilovich (2000), students wore an embarrassing Barry Manilow t-shirt before entering a room of peers. The wearers predicted that at least 50% of the students noticed the shirt.',
      'In reality, less than 23% noticed. Gilovich termed this the Spotlight Effect. Because we are the center of our own psychological universe, we assume others focus an identical degree of cognitive attention onto us.',
    ],
    coreTakeaway:
      'Egocentric anchoring causes people to dramatically overestimate the salience of their flaws to observers.',
    sourcesCited: ['Gilovich et al. (2000), J Pers Soc Psychol'],
    caveatNote:
      'Extreme physical or social abnormalities do genuinely increase bystander scrutiny.',
    cta: {
      type: 'reflection',
      text: 'Consider an awkward moment from yesterday that kept you up: can you remember a single awkward thing anyone else did?',
    },
  };

  const sampleItem: ContentItem = {
    id: 'test-telegram-post',
    status: 'queued',
    createdAt: '2026-09-20T12:00:00.000Z',
    pillar: 'Strange Human Behavior',
    topic: 'Spotlight Effect',
    draft: sampleDraft,
    visualDecision: { needed: false, reason: 'Text only' },
    formattedText: '',
  };

  it('should correctly escape HTML special characters to prevent Telegram parse errors', () => {
    const raw = 'Is A < B & B > C? Check "quotes" & details.';
    const escaped = escapeTelegramHtml(raw);
    assert.equal(
      escaped,
      'Is A &lt; B &amp; B &gt; C? Check "quotes" &amp; details.'
    );
  });

  it('should format message with bold title, hashtag, body, takeaway, caveat, and source', () => {
    const publisher = new TelegramPublisher();
    const formatted = publisher.formatMessage(sampleDraft);

    assert.ok(formatted.includes('<b>The Spotlight Effect: Nobody Is Watching You</b>'));
    assert.ok(formatted.includes('<i>#StrangeHumanBehavior</i>'));
    assert.ok(formatted.includes('🎯 <i>Egocentric anchoring'));
    assert.ok(formatted.includes('⚠️ <i>Extreme physical'));
    assert.ok(formatted.includes('🔬 <code>Gilovich et al. (2000), J Pers Soc Psychol</code>'));
    // Ensures rigid template labels are absent
    assert.ok(!formatted.includes('<b>Key Insight:</b>'));
    assert.ok(!formatted.includes('<b>Limitation &amp; Context:</b>'));
    assert.ok(!formatted.includes('<b>Reflection:</b>'));
  });

  it('should format photo summary caption under 1024 character Telegram limit', () => {
    const publisher = new TelegramPublisher();
    const caption = publisher.formatPhotoSummaryCaption(sampleDraft);

    assert.ok(caption.length <= 1024, `Caption length ${caption.length} exceeds 1024`);
    assert.ok(caption.includes('<b>The Spotlight Effect: Nobody Is Watching You</b>'));
    assert.ok(caption.includes('🎯 <i>'));
    assert.ok(!caption.includes('<b>Core Mechanism:</b>'));
  });

  it('should execute dry-run publishing cleanly without real credentials', async () => {
    const publisher = new TelegramPublisher('MOCK_TOKEN', '@mock_channel');
    const res = await publisher.publish(sampleItem, { dryRun: true });

    assert.equal(res.success, true);
    assert.equal(res.dryRun, true);
    assert.ok(typeof res.messageId === 'number');
  });
});

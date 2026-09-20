/**
 * Editorial Formats & Natural Tone Test Suite
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_EDITORIAL_FORMAT_CONFIG,
  selectEditorialFormat,
} from '../src/pipeline/editorialConfig.js';
import { EditorialFormat, PostDraft } from '../src/pipeline/types.js';
import { QualityChecker } from '../src/pipeline/quality.js';
import { TelegramPublisher } from '../src/pipeline/telegram.js';

describe('Editorial Formats & Natural Tone', () => {
  it('should respect requested format when provided', () => {
    const selected = selectEditorialFormat({
      suggestedFormat: 'thought_experiment',
    });
    assert.equal(selected, 'thought_experiment');
  });

  it('should select diverse formats without immediately repeating the last format', () => {
    const recent: EditorialFormat[] = [
      'long_explanation',
      'long_explanation',
    ];
    const selected = selectEditorialFormat({ recentFormats: recent });
    assert.notEqual(selected, 'long_explanation');
  });

  it('should contain all 6 distinct editorial formats in config', () => {
    const expectedFormats: EditorialFormat[] = [
      'long_explanation',
      'short_curiosity',
      'experiment_story',
      'thought_experiment',
      'poll',
      'quick_observation',
    ];

    for (const fmt of expectedFormats) {
      assert.ok(
        DEFAULT_EDITORIAL_FORMAT_CONFIG.distribution[fmt] > 0,
        `Format ${fmt} should have non-zero weight`
      );
      assert.ok(
        DEFAULT_EDITORIAL_FORMAT_CONFIG.formatRules[fmt],
        `Format ${fmt} should have defined rules`
      );
    }
  });

  it('should format poll posts with question and options in Telegram publisher', () => {
    const publisher = new TelegramPublisher();
    const pollDraft: PostDraft = {
      title: 'The Trolley Footbridge Dilemma',
      pillar: 'Psychology Thought Experiments',
      format: 'poll',
      hook: 'A runaway trolley is speeding toward five unaware track workers.',
      bodyParagraphs: [
        'Joshua Greene (2001) used fMRI to discover that up-close physical harm engages distinct emotional circuitry in the brain.'
      ],
      poll: {
        question: 'Would you physically push the heavy stranger to save five lives?',
        options: [
          'Yes — the numbers dictate the outcome',
          'No — direct physical harm feels viscerally wrong',
          'Uncertain / Need more time',
        ],
        explanation: 'Most people comfortably flip a switch from a distance, but refuse direct physical contact.',
      },
      coreTakeaway: 'Visceral emotional engagement overrides abstract consequentialist logic in moral decisions.',
      sourcesCited: ['Greene et al. (2001), Science'],
      caveatNote: 'Hypothetical dilemmas do not always reflect real high-stakes behavior under acute adrenaline.',
      cta: {
        type: 'reflection',
        text: 'Vote above, then observe how your visceral reaction differed from mathematical logic.',
      },
    };

    const formatted = publisher.formatMessage(pollDraft);
    assert.ok(formatted.includes('📊 <b>Would you physically push the heavy stranger to save five lives?</b>'));
    assert.ok(formatted.includes('1️⃣ Yes — the numbers dictate the outcome'));
    assert.ok(formatted.includes('2️⃣ No — direct physical harm feels viscerally wrong'));
    assert.ok(formatted.includes('3️⃣ Uncertain / Need more time'));
    assert.ok(formatted.includes('💡 <i>Most people comfortably flip a switch'));
    assert.ok(!formatted.includes('<b>Key Insight:</b>'));
    assert.ok(!formatted.includes('<b>Reflection:</b>'));
  });

  it('should format quick observation posts with punchy flow', () => {
    const publisher = new TelegramPublisher();
    const observationDraft: PostDraft = {
      title: 'The Doorway Effect',
      pillar: 'Brain, Memory & Perception',
      format: 'quick_observation',
      hook: 'Walking through a doorway into another room empties your immediate working memory.',
      bodyParagraphs: [
        'Gabriel Radvansky (2011) showed that passing through an open threshold triples forgetting. Doorways act as cognitive event boundaries, flushing working memory to prepare for the new space.'
      ],
      coreTakeaway: 'Physical thresholds signal the brain to compartmentalize and archive current working memory.',
      sourcesCited: ['Radvansky et al. (2011), Q J Exp Psychol'],
      caveatNote: 'The effect weakens when you consciously rehearse the task in transit.',
      cta: {
        type: 'reflection',
        text: 'Notice this the next time you walk into a room and draw a blank.',
      },
    };

    const formatted = publisher.formatMessage(observationDraft);
    assert.ok(formatted.includes('<b>The Doorway Effect</b>'));
    assert.ok(formatted.includes('<i>#BrainMemoryPerception</i>'));
    assert.ok(formatted.includes('🎯 <i>Physical thresholds signal'));
    assert.ok(formatted.includes('⚠️ <i>The effect weakens'));
    assert.ok(formatted.includes('🔬 <code>Radvansky et al. (2011)'));
    assert.ok(!formatted.includes('<b>Key Insight:</b>'));
    assert.ok(!formatted.includes('<b>Reflection:</b>'));

    const quality = QualityChecker.validate(observationDraft);
    assert.equal(quality.isValid, true);
  });

  it('should format experiment_story posts naturally', () => {
    const publisher = new TelegramPublisher();
    const experimentDraft: PostDraft = {
      title: 'The Invisible Gorilla',
      pillar: 'Brain, Memory & Perception',
      format: 'experiment_story',
      hook: 'Count how many times the players in white pass the basketball, and you will miss a person in a gorilla suit walking across the screen.',
      bodyParagraphs: [
        'In 1999, Daniel Simons and Christopher Chabris asked Harvard students to watch a short video clip and tally passes made by a basketball team.',
        'Midway through, a student dressed in a full gorilla costume walked into the center, thumped its chest toward the camera, and walked away.',
        'Roughly half of the viewers never noticed the gorilla. When focused on an intense counting task, the brain actively filters out unexpected stimuli.'
      ],
      coreTakeaway: 'Inattentional blindness causes visual awareness to collapse around whatever object currently occupies conscious focus.',
      sourcesCited: ['Simons & Chabris (1999), Perception'],
      caveatNote: 'Salient or personally threatening stimuli breach attentional filters more readily than neutral unexpected objects.',
      cta: {
        type: 'reflection',
        text: 'Consider what else you might be missing right now because your attention is focused elsewhere.',
      },
    };

    const formatted = publisher.formatMessage(experimentDraft);
    assert.ok(formatted.includes('<b>The Invisible Gorilla</b>'));
    assert.ok(formatted.includes('Count how many times'));
    assert.ok(formatted.includes('In 1999, Daniel Simons'));
    assert.ok(formatted.includes('🎯 <i>Inattentional blindness'));
    assert.ok(formatted.includes('⚠️ <i>Salient or personally threatening'));
    assert.ok(formatted.includes('🔬 <code>Simons &amp; Chabris (1999)'));
    assert.ok(!formatted.includes('<b>Key Insight:</b>'));
    assert.ok(!formatted.includes('<b>Core Mechanism:</b>'));
    assert.ok(!formatted.includes('<b>Reflection:</b>'));

    const quality = QualityChecker.validate(experimentDraft);
    assert.equal(quality.isValid, true);
  });

  it('should format thought_experiment posts naturally', () => {
    const publisher = new TelegramPublisher();
    const thoughtDraft: PostDraft = {
      title: 'The Ship of Theseus Mind',
      pillar: 'Psychology Thought Experiments',
      format: 'thought_experiment',
      hook: 'Replace every wooden plank on a sailing ship one by one over thirty years. Is it still the same ship at the end?',
      bodyParagraphs: [
        'Now imagine your own body: virtually every single cell in your brain and tissues turns over, dies, and is replaced throughout your life.',
        'Cognitive neuroscientists point out that personal identity is not a static physical substance, but an ongoing narrative model computed continuously by your neural circuits.'
      ],
      coreTakeaway: 'The psychological self is an ongoing computational process of narrative continuity rather than a permanent entity.',
      sourcesCited: ['Metzinger (2003), Being No One', 'Hood (2012), The Self Illusion'],
      caveatNote: 'Structural neural patterns and synaptic weights maintain functional continuity despite cellular turnover.',
      cta: {
        type: 'reflection',
        text: 'Who you were ten years ago is physically and computationally distinct from who is reading this right now.',
      },
    };

    const formatted = publisher.formatMessage(thoughtDraft);
    assert.ok(formatted.includes('<b>The Ship of Theseus Mind</b>'));
    assert.ok(formatted.includes('🎯 <i>The psychological self'));
    assert.ok(formatted.includes('⚠️ <i>Structural neural patterns'));
    assert.ok(formatted.includes('🔬 <code>Metzinger (2003)'));
    assert.ok(!formatted.includes('<b>Key Insight:</b>'));
    assert.ok(!formatted.includes('<b>Reflection:</b>'));

    const quality = QualityChecker.validate(thoughtDraft);
    assert.equal(quality.isValid, true);
  });

  it('should format long_explanation posts with complete context and whitespace', () => {
    const publisher = new TelegramPublisher();
    const longDraft: PostDraft = {
      title: 'The Default Mode Network and Wandering Minds',
      pillar: 'Brain, Memory & Perception',
      format: 'long_explanation',
      hook: 'Let your mind drift while staring out a train window, and a specific set of brain regions immediately wakes up.',
      bodyParagraphs: [
        'Marcus Raichle (2001) discovered that when human participants stopped performing structured cognitive tasks, metabolic activity in the medial prefrontal cortex and posterior cingulate did not decrease—it surged.',
        'This network, termed the Default Mode Network (DMN), is responsible for daydreaming, self-reflection, autobiographical memory recall, and simulating possible future scenarios.',
        'Rather than resting when you do nothing, your brain actively shifts resources to narrative consolidation and social modeling.'
      ],
      coreTakeaway: 'Mind-wandering is not cognitive idling, but an active default state dedicated to social simulation and identity.',
      sourcesCited: ['Raichle et al. (2001), PNAS', 'Andrews-Hanna (2012), Neuroscientist'],
      caveatNote: 'Hyperactivity in the DMN is strongly associated with depressive rumination and chronic negative self-focus.',
      cta: {
        type: 'reflection',
        text: 'Next time you catch your thoughts drifting, notice whether you are ruminating on the past or planning the future.',
      },
    };

    const formatted = publisher.formatMessage(longDraft);
    assert.ok(formatted.includes('<b>The Default Mode Network and Wandering Minds</b>'));
    assert.ok(formatted.includes('🎯 <i>Mind-wandering is not cognitive idling'));
    assert.ok(formatted.includes('⚠️ <i>Hyperactivity in the DMN'));
    assert.ok(formatted.includes('🔬 <code>Raichle et al. (2001)'));
    assert.ok(!formatted.includes('<b>Key Insight:</b>'));
    assert.ok(!formatted.includes('<b>Reflection:</b>'));

    const quality = QualityChecker.validate(longDraft);
    assert.equal(quality.isValid, true);
  });

  it('should ensure visual posts always generate a valid single caption <= 1024 characters', () => {
    const publisher = new TelegramPublisher();
    const drafts: PostDraft[] = [
      {
        title: 'The Bystander Effect',
        pillar: 'Everyday Psychology',
        format: 'experiment_story',
        hook: 'Someone collapses in a crowded subway station. Fifty people are watching. And nobody moves.',
        bodyParagraphs: [
          'In 1968, John Darley and Bibb Latané staged simulated medical emergencies in university settings.',
          'When participants believed they were the sole witness, 85% intervened immediately.',
          'When they believed four other people were present, help rates plunged to 31%. Each person looked around, assumed someone else was handling the situation, and froze.'
        ],
        coreTakeaway: 'The presence of multiple witnesses diffuses individual psychological responsibility and suppresses action.',
        sourcesCited: ['Darley & Latané (1968), J Pers Soc Psychol'],
        caveatNote: 'In physically dangerous emergencies with unambiguous violence, bystander intervention rates remain substantially higher.',
        cta: {
          type: 'reflection',
          text: 'If you ever need help in a crowd, pick one specific person: "You in the blue coat, call 911."',
        },
      }
    ];

    for (const draft of drafts) {
      const caption = publisher.formatVisualPost(draft);
      assert.ok(caption.length <= 1024, `Visual post caption length ${caption.length} exceeded 1024 chars`);
      assert.ok(caption.includes('<b>The Bystander Effect</b>'));
      assert.ok(!caption.includes('<b>Core Mechanism:</b>'));
      assert.ok(!caption.includes('<b>Limitation &amp; Context:</b>'));
    }
  });
});

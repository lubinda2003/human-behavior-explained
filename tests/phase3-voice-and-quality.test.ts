/**
 * Phase 3 Test Suite: Pick Your Fate Persona, Voice & Quality Gate Adaptation
 *
 * Verifies:
 * 1. Pick Your Fate Voice Plain-Language Requirements
 * 2. Quality Gate rejection of banned corporate / academic buzzwords
 * 3. Proactive repair of banned phrases via repairDilemma()
 * 4. Format-specific, voice-aligned Telegram formatting and CTAs
 * 5. Clean handling of discussion-first vs poll-based content
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DilemmaQualityChecker } from '../src/pipeline/dilemmas/quality.js';
import { DilemmaGenerator } from '../src/pipeline/dilemmas/generator.js';
import { DilemmaTelegramFormatter } from '../src/pipeline/dilemmas/formatter.js';
import { BANNED_PHRASES } from '../worker/src/config.js';
import { ALL_CONTENT_FORMATS, InteractiveDilemma } from '../src/pipeline/dilemmas/types.js';

describe('Phase 3: Pick Your Fate Persona & Quality Gate Adaptation', () => {
  const generator = new DilemmaGenerator();

  const BANNED_VOICE_WORDS = [
    'paradigm',
    'synergy',
    'multifaceted',
    'consequentiality',
    'societal ramifications',
    'cognitive burden',
    'game-theoretic optimality',
    'optimize survivability',
    'strategic resource allocation',
    'epistemic uncertainty',
    'ethical imperative',
    'utilitarian calculus',
    'normative framework',
  ];

  describe('Quality Gate — Rejection of Banned Corporate & Academic Buzzwords', () => {
    for (const phrase of BANNED_VOICE_WORDS) {
      it(`rejects posts containing banned phrase: "${phrase}"`, async () => {
        const dilemma = await generator.generateDilemma({ category: 'moral' });
        dilemma.hook = `This high-stakes choice exposes ${phrase} across the whole room.`;
        dilemma.formattedTelegramText = DilemmaTelegramFormatter.formatPost(dilemma);

        const qc = DilemmaQualityChecker.validateDilemmaContent(dilemma);
        assert.equal(qc.isValid, false, `Expected post with "${phrase}" to fail quality check`);
        assert.equal(qc.checks.plainLanguageVoiceValid, false);
        assert.ok(
          qc.errors.some((e) => e.includes('banned corporate/academic jargon')),
          `Expected error message mentioning banned corporate/academic jargon, got: ${qc.errors.join('; ')}`
        );
      });
    }

    it('passes standard procedural dilemmas with plainLanguageVoiceValid = true', async () => {
      const dilemma = await generator.generateDilemma({ category: 'survival' });
      const qc = DilemmaQualityChecker.validateDilemmaContent(dilemma);

      assert.equal(qc.isValid, true);
      assert.equal(qc.checks.plainLanguageVoiceValid, true);
      assert.equal(qc.checks.noAcademicJargon, true);
    });

    it('ensures BANNED_PHRASES in config.ts contains all target voice phrases', () => {
      for (const phrase of BANNED_VOICE_WORDS) {
        assert.ok(
          BANNED_PHRASES.includes(phrase),
          `worker/src/config.ts BANNED_PHRASES must include "${phrase}"`
        );
      }
    });
  });

  describe('DilemmaGenerator — Proactive Repair of Voice Violations', () => {
    for (const phrase of BANNED_VOICE_WORDS) {
      it(`repairs dilemma containing "${phrase}" and restores QC validity`, async () => {
        const dilemma = await generator.generateDilemma({ category: 'strategy' });
        dilemma.hook = `You stand before the emergency terminal: notice the ${phrase} on the screen.`;
        dilemma.choices![0].tradeOff = `Creates a severe personal sacrifice and exposes the system to ${phrase}.`;
        dilemma.formattedTelegramText = DilemmaTelegramFormatter.formatPost(dilemma);

        const preQc = DilemmaQualityChecker.validateDilemmaContent(dilemma);
        assert.equal(preQc.isValid, false);

        const repaired = generator.repairDilemma(dilemma);
        const postQc = DilemmaQualityChecker.validateDilemmaContent(repaired);

        assert.equal(
          postQc.isValid,
          true,
          `Expected repaired dilemma to pass QC after fixing "${phrase}". Errors: ${postQc.errors.join('; ')}`
        );
        assert.equal(postQc.checks.plainLanguageVoiceValid, true);
        assert.equal(postQc.checks.noAcademicJargon, true);
      });
    }
  });

  describe('DilemmaTelegramFormatter — Voice-Aligned Format CTAs', () => {
    const formatCtas: Record<string, string> = {
      prediction: 'Lock in your prediction below before the clock runs out!',
      versus_battle: 'Vote for the winner. Who walks away and who falls?',
      mini_mystery: 'Spot the clue everyone else missed? Drop your deduction in the comments!',
      brain_logic: 'Think you found the flaw? Prove your logic in the comments!',
      hot_take: 'Pick a side and defend it in the comments below!',
      future_tech: 'Would you take this deal? Argue your case in the comments!',
      strategy_challenge: 'Cast your vote and defend your strategy in the comments!',
      survival_scenario: 'Make your call before time runs out. Vote below!',
      chaotic_funny: 'Pick your poison below and see how chaotic the channel gets!',
    };

    for (const [format, expectedCta] of Object.entries(formatCtas)) {
      it(`formats ${format} with sharp game master CTA`, async () => {
        const dilemma: InteractiveDilemma = {
          id: `test-${format}`,
          index: 1,
          category: 'survival',
          format: format as any,
          title: `Test ${format} Title`,
          hook: 'You have thirty seconds to make your decision at the vault door.',
          setup: 'You stand inside the vault room holding the override key while the clock ticks down.',
          scenario: 'You stand inside the vault room holding the override key while the clock ticks down.',
          depth: 'standard',
          choices: [
            { id: 'c1', label: 'Action Alpha', description: 'Take the left corridor.', tradeOff: 'Leaves equipment behind.' },
            { id: 'c2', label: 'Action Beta', description: 'Take the right corridor.', tradeOff: 'Forfeits safe extraction.' },
          ],
          pollQuestion: 'Which path do you take before the vault seals?',
          discussionPrompt: 'What would your strategy be once you cross the threshold?',
          payoff: { reveal: 'Immediate decisive action beats second-guessing.', surprisingOutcome: 'Most people freeze.' },
          formattedTelegramText: '',
          visualSpec: { template: 'thought_experiment', title: 'Test' },
        };

        const formatted = DilemmaTelegramFormatter.formatPost(dilemma);
        assert.ok(
          formatted.includes(expectedCta),
          `Expected formatted post for ${format} to include CTA "${expectedCta}". Post text:\n${formatted}`
        );
      });
    }

    it('formats discussion-first formats without poll questions cleanly as DISCUSSION', () => {
      const discussionDilemma: InteractiveDilemma = {
        id: 'test-discussion-format',
        index: 1,
        category: 'moral',
        format: 'hot_take',
        title: 'The Reputation Auction',
        hook: 'Would you accept $5,000,000 if your entire web search history was published publicly?',
        setup: 'A wealthy anonymous buyer places an irrevocable escrow contract on your kitchen table.',
        scenario: 'A wealthy anonymous buyer places an irrevocable escrow contract on your kitchen table.',
        depth: 'standard',
        choices: [],
        discussionPrompt: 'Where is your personal line between public embarrassment and lifelong financial freedom?',
        payoff: { reveal: 'Most people refuse until the amount hits generational wealth.', surprisingOutcome: 'Search history feels more intimate than bank accounts.' },
        formattedTelegramText: '',
        visualSpec: { template: 'thought_experiment', title: 'Test' },
      };

      const formatted = DilemmaTelegramFormatter.formatPost(discussionDilemma);
      assert.ok(formatted.includes('💬 <b>DISCUSSION:</b>'), 'Discussion format should output DISCUSSION header');
      assert.ok(!formatted.includes('📊 <b>POLL:</b>'), 'Discussion format without poll should NOT output POLL header');
      assert.ok(formatted.includes('Pick a side and defend it in the comments below!'));
    });
  });

  describe('Procedural Catalog Compliance with Plain-Language Voice', () => {
    it('verifies that all procedural dilemma templates pass QC with zero banned phrases', () => {
      for (const format of ALL_CONTENT_FORMATS) {
        if (format === 'result_reveal') continue;
        const dilemma = generator.generateProceduralDilemma({ format });
        const qc = DilemmaQualityChecker.validateDilemmaContent(dilemma);

        assert.equal(
          qc.isValid,
          true,
          `Procedural template for "${format}" failed QC: ${qc.errors.join('; ')}`
        );
        assert.equal(qc.checks.plainLanguageVoiceValid, true);
        assert.equal(qc.checks.noAcademicJargon, true);
      }
    });
  });
});

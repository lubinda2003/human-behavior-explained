import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DilemmaGenerator } from '../src/pipeline/dilemmas/generator.js';
import { DilemmaQualityChecker } from '../src/pipeline/dilemmas/quality.js';
import { InteractiveDilemma } from '../src/pipeline/dilemmas/types.js';

describe('Pick Your Fate Generation Loop Resilience (5 Failure Classes)', () => {
  const generator = new DilemmaGenerator();

  // Failure Class 1: Generic Trade-Off Formula ("You get X, but lose Y")
  describe('Failure Class 1: Generic Trade-Off Formula', () => {
    it('rejects thin, repetitive "You get X, but lose Y" constructions lacking scene immersion', () => {
      const dilemma: InteractiveDilemma = {
        id: 'test-generic-tradeoff',
        title: 'The Wealth Trade',
        hook: 'You receive $10M, but you lose the ability to speak.',
        setup: 'You get $10M, but you lose the ability to speak.',
        scenario: 'You get $10M, but you lose the ability to speak.',
        choices: [
          { id: 'c1', label: 'Take Money', description: 'Take the cash.', tradeOff: 'Lose voice.' },
          { id: 'c2', label: 'Walk Away', description: 'Walk away.', tradeOff: 'Stay poor.' },
        ],
        pollQuestion: 'Which do you choose?',
        payoff: {
          reveal: 'Silence is difficult to endure over decades of life.',
          surprisingOutcome: 'People regret giving up their voice quickly.',
        },
        formattedTelegramText: '<b>The Wealth Trade</b>\n\nYou get $10M, but you lose your voice.',
      };

      const qc = DilemmaQualityChecker.validateDilemmaContent(dilemma);
      assert.equal(qc.isValid, false);
      assert.equal(qc.checks.noFormulaicTradeoff, false);
      assert.ok(qc.errors.some((e) => e.includes('formulaic trade-off')));
    });

    it('permits trade-offs when genuinely embedded inside an immersive, detailed physical situation', () => {
      const dilemma: InteractiveDilemma = {
        id: 'test-embedded-tradeoff',
        title: 'The Vault Notary Deal',
        hook: 'You stand inside an underground vault with a briefcase of bearer bonds on the desk.',
        setup:
          'A corporate syndicate places an irrevocable contract before you in the steel vault: you receive $10,000,000 in bearer bonds today, but you lose access to the surface world for 365 days while operating their server console under 24/7 camera surveillance.',
        scenario:
          'A corporate syndicate places an irrevocable contract before you in the steel vault: you receive $10,000,000 in bearer bonds today, but you lose access to the surface world for 365 days while operating their server console under 24/7 camera surveillance.',
        pressure: 'The biometric seal timer on the vault door expires in 120 seconds.',
        choices: [
          {
            id: 'c1',
            label: 'Sign the Vault Contract',
            description: 'Accept the wire transfer and lock yourself in the bunker.',
            tradeOff: 'Forfeit one year of sunlight, relationships, and emergency surface exit.',
          },
          {
            id: 'c2',
            label: 'Walk Out the Airlock',
            description: 'Refuse the syndicate and return to ordinary freelance life.',
            tradeOff: 'Walk away with zero dollars and face immediate eviction back home.',
          },
        ],
        pollQuestion: 'Do you sign before the vault timer hits zero?',
        payoff: {
          reveal: 'Bunker confinement takes an immense cognitive toll after day 45.',
          surprisingOutcome: 'Most candidates who attempt underground stints breach contracts early.',
        },
        formattedTelegramText: '<b>The Vault Notary Deal</b>\n\nYou stand inside an underground vault.',
      };

      const qc = DilemmaQualityChecker.validateDilemmaContent(dilemma);
      assert.equal(qc.checks.noFormulaicTradeoff, true);
    });
  });

  // Failure Class 2: Ungrounded Hypotheticals
  describe('Failure Class 2: Ungrounded Hypotheticals', () => {
    it('rejects abstract philosophical questions lacking concrete environment, objects, and immediate tension', () => {
      const dilemma: InteractiveDilemma = {
        id: 'test-ungrounded-hypothetical',
        title: 'The Nature of Virtue',
        hook: 'Consider an abstract scenario where virtue and utilitarian morality conflict.',
        setup:
          'Philosophically speaking, if truth has no utilitarian value in an abstract world, should rational agents prefer deontology or maximize net utility?',
        scenario:
          'Philosophically speaking, if truth has no utilitarian value in an abstract world, should rational agents prefer deontology or maximize net utility?',
        choices: [
          { id: 'c1', label: 'Utilitarian Max', description: 'Maximize utility.', tradeOff: 'Compromise deontology.' },
          { id: 'c2', label: 'Virtue Ethics', description: 'Keep pure virtue.', tradeOff: 'Lower net welfare.' },
        ],
        pollQuestion: 'Which ethical framework is superior?',
        payoff: {
          reveal: 'Moral philosophy has debated this for centuries with no consensus.',
          surprisingOutcome: 'Utilitarian outcomes frequently conflict with human empathy.',
        },
        formattedTelegramText: '<b>The Nature of Virtue</b>\n\nConsider an abstract world.',
      };

      const qc = DilemmaQualityChecker.validateDilemmaContent(dilemma);
      assert.equal(qc.isValid, false);
      assert.equal(qc.checks.noUngroundedHypothetical, false);
      assert.ok(qc.errors.some((e) => e.includes('ungrounded abstract philosophical debate') || e.includes('situational immersion')));
    });
  });

  // Failure Class 3: Cost-Free Choices
  describe('Failure Class 3: Cost-Free Choices', () => {
    it('rejects choices carrying no meaningful downside or trivial trade-offs', () => {
      const dilemma: InteractiveDilemma = {
        id: 'test-cost-free-choice',
        title: 'The Trivial Tradeoff Room',
        hook: 'A mysterious benefactor offers you an unmarked duffel bag of cash in a hotel room.',
        setup: 'You are seated across from an executive holding a duffel bag containing $500,000 cash.',
        scenario: 'You are seated across from an executive holding a duffel bag containing $500,000 cash.',
        choices: [
          {
            id: 'c1',
            label: 'Take the Cash Duffel',
            description: 'Take the entire $500,000 with no strings attached.',
            tradeOff: 'no downside',
          },
          {
            id: 'c2',
            label: 'Refuse the Duffel',
            description: 'Walk out into the street empty handed.',
            tradeOff: 'Forfeit $500,000 in immediate financial liquidity.',
          },
        ],
        pollQuestion: 'Do you take the duffel or walk away?',
        payoff: {
          reveal: 'Unconditional corporate gifts frequently conceal illicit laundering schemes.',
          surprisingOutcome: 'Recipients face federal scrutiny once IRS declarations trigger.',
        },
        formattedTelegramText: '<b>The Trivial Tradeoff Room</b>\n\nYou are in a hotel room.',
      };

      const qc = DilemmaQualityChecker.validateDilemmaContent(dilemma);
      assert.equal(qc.isValid, false);
      assert.equal(qc.checks.tradeOffsExplicit, false);
      assert.equal(qc.checks.noCostFreeChoices, false);
      assert.ok(qc.errors.some((e) => e.includes('trivial trade-off') || e.includes('cost-free')));
    });
  });

  // Failure Class 4: Dominant Choices
  describe('Failure Class 4: Dominant Choices', () => {
    it('rejects scenarios where one option carries fatal/lethal ruin while the other has trivial or benign consequences', () => {
      const dilemma: InteractiveDilemma = {
        id: 'test-dominant-choice',
        title: 'The Acid Pit Trap',
        hook: 'A dungeon master presents two doors inside the stone dungeon room.',
        setup: 'You stand inside a dungeon chamber with two stone arches before you with a timer ticking down.',
        scenario: 'You stand inside a dungeon chamber with two stone arches before you with a timer ticking down.',
        choices: [
          {
            id: 'c1',
            label: 'Door of Agonizing Death',
            description: 'Step into the pit filled with boiling acid and vipers.',
            tradeOff: 'Instant agonizing death as you are dissolved into bone.',
          },
          {
            id: 'c2',
            label: 'Door of Gourmet Steak',
            description: 'Step into a luxury banquet hall.',
            tradeOff: 'Minor inconvenience of a 20-minute wait for your table.',
          },
        ],
        pollQuestion: 'Which door do you open?',
        payoff: {
          reveal: 'Nobody in their right mind chooses the boiling acid pit.',
          surprisingOutcome: 'One-sided choices destroy reader engagement instantly.',
        },
        formattedTelegramText: '<b>The Acid Pit Trap</b>\n\nYou stand in a dungeon chamber.',
      };

      const qc = DilemmaQualityChecker.validateDilemmaContent(dilemma);
      assert.equal(qc.isValid, false);
      assert.equal(qc.checks.noDominantChoice, false);
      assert.ok(qc.errors.some((e) => e.includes('dominant choice') || e.includes('catastrophic/lethal ruin')));
    });
  });

  // Failure Class 5: Academic/Lecture-Like Content
  describe('Failure Class 5: Academic / Lecture-Like Content', () => {
    it('rejects academic psychology lecturing, textbook research mentions, and cognitive theory explanations', () => {
      const dilemma: InteractiveDilemma = {
        id: 'test-academic-lecture',
        title: 'The Hedonic Treadmill Experiment',
        hook: 'In this psychological concept scenario, cognitive dissonance reveals how people choose.',
        setup:
          'According to a study published in behavioral economics journals, participants in laboratory experiments demonstrated acute hedonic adaptation when evaluating cash payouts.',
        scenario:
          'According to a study published in behavioral economics journals, participants in laboratory experiments demonstrated acute hedonic adaptation when evaluating cash payouts.',
        choices: [
          { id: 'c1', label: 'Option A', description: 'Choose Option A.', tradeOff: 'Forfeit baseline happiness.' },
          { id: 'c2', label: 'Option B', description: 'Choose Option B.', tradeOff: 'Trigger acute regret.' },
        ],
        pollQuestion: 'Which option would you choose?',
        payoff: {
          reveal: 'Psychologists study how dopamine pathways adapt to hedonic baselines.',
          surprisingOutcome: 'Cognitive dissonance forces subjects to rationalize poor decisions.',
        },
        formattedTelegramText: '<b>The Hedonic Treadmill</b>\n\nCognitive dissonance experiment.',
      };

      const qc = DilemmaQualityChecker.validateDilemmaContent(dilemma);
      assert.equal(qc.isValid, false);
      assert.equal(qc.checks.noAcademicJargon, false);
      assert.ok(qc.errors.some((e) => e.includes('banned academic/psychology jargon')));
    });
  });

  // Generator Loop Quality Compliance
  describe('Generator Loop Quality Compliance', () => {
    it('generates fully compliant, failure-resistant dilemmas across multiple categories', async () => {
      const categories = ['money/lifestyle', 'survival', 'strategy', 'fantasy'] as const;
      for (const cat of categories) {
        const dilemma = await generator.generateDilemma({ category: cat });
        const qc = DilemmaQualityChecker.validateDilemmaContent(dilemma);

        assert.equal(qc.isValid, true, `Dilemma for ${cat} failed QC: ${qc.errors.join('; ')}`);
        assert.equal(qc.checks.noFormulaicTradeoff, true);
        assert.equal(qc.checks.noAcademicJargon, true);
        assert.equal(qc.checks.noGenericWYR, true);
        assert.equal(qc.checks.tradeOffsExplicit, true);
        assert.equal(qc.checks.hasSituationalImmersion, true);
        assert.equal(qc.checks.noDominantChoice, true);
        assert.equal(qc.checks.noCostFreeChoices, true);
      }
    });
  });
});

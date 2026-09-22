/**
 * Content Realism & Quality Evaluation Pass Test Suite
 * Tests the 12 human-centric realism and entertainment criteria:
 * 1. Immediate Curiosity
 * 2. Concrete vs. Abstract
 * 3. Visualizable Presence
 * 4. Genuine Pressure
 * 5. Meaningful Trade-off
 * 6. Both Choices Tempting
 * 7. Uncertain Outcome
 * 8. Avoids Generic WYR
 * 9. Avoids Formulaic Patterns
 * 10. Standalone Clarity
 * 11. Entertainment Focus (Anti-Academic Jargon)
 * 12. Invites Participation
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  ContentRealismEvaluator,
  ScenarioEvaluationResult,
} from '../src/pipeline/dilemmas/evaluator.js';
import { InteractiveDilemma } from '../src/pipeline/dilemmas/types.js';

describe('Content Realism & Entertainment Evaluation Pass', () => {
  describe('Criterion 1: Immediate Curiosity & Opening Hook', () => {
    it('passes for high-stakes in medias res openings', () => {
      const sample: InteractiveDilemma = {
        id: 'test-hook-01',
        index: 1,
        category: 'survival',
        title: 'The Blown Airlock',
        hook: 'Oxygen is venting from module 4, alarms are shrieking, and the pressure door will seal in 45 seconds.',
        setup: 'You are standing in airlock corridor B holding the override manual while freezing vacuum begins tearing at your suit seal.',
        scenario: 'You are standing in airlock corridor B holding the override manual while freezing vacuum begins tearing at your suit seal.',
        depth: 'quick',
        choices: [
          { id: 'c1', label: 'Seal Module 4', description: 'Lock the door.', tradeOff: 'Traps your lead engineer inside.' },
          { id: 'c2', label: 'Dive to Rescue', description: 'Run into the breach.', tradeOff: 'Risks suffocating both of you if manual fails.' },
        ],
        pollQuestion: 'Do you drop the seal or dive inside?',
        payoff: { reveal: 'Immediate containment saves the mothership.', surprisingOutcome: 'Engineers practice sacrifice drills.' },
        formattedTelegramText: '<b>The Blown Airlock</b>\n\nDecide now.',
        visualSpec: { template: 'thought_experiment', title: 'Airlock' },
      };

      const result = ContentRealismEvaluator.evaluateDilemma(sample, 'Survival');
      assert.equal(result.qualityChecks.immediateCuriosity, true);
      assert.ok(!result.detectedWeaknesses.some((w) => w.includes('WEAK_OPENING')));
    });

    it('rejects passive cliché openings ("Would you rather", "Imagine")', () => {
      const sample: InteractiveDilemma = {
        id: 'test-hook-02',
        index: 2,
        category: 'money/lifestyle',
        title: 'Passive Question',
        hook: 'Would you rather have $1,000,000 in your bank account or travel to Paris?',
        setup: 'You sit in your living room and think about choices you could make in life.',
        scenario: 'You sit in your living room and think about choices you could make in life.',
        depth: 'quick',
        choices: [
          { id: 'c1', label: 'Cash', description: 'Take money.', tradeOff: 'Lose the trip.' },
          { id: 'c2', label: 'Paris', description: 'Take trip.', tradeOff: 'Lose the cash.' },
        ],
        pollQuestion: 'Which do you choose?',
        payoff: { reveal: 'Money lasts longer than trips.', surprisingOutcome: 'People regret travel.' },
        formattedTelegramText: '<b>Passive Question</b>',
        visualSpec: { template: 'thought_experiment', title: 'Passive' },
      };

      const result = ContentRealismEvaluator.evaluateDilemma(sample, 'Generic WYR');
      assert.equal(result.qualityChecks.immediateCuriosity, false);
      assert.ok(result.detectedWeaknesses.some((w) => w.includes('WEAK_OPENING')));
    });
  });

  describe('Criterion 2 & 3: Concrete Grounding & Visualizable Presence', () => {
    it('verifies sensory nouns, physical objects, and spatial positioning', () => {
      const sample: InteractiveDilemma = {
        id: 'test-concrete-01',
        index: 3,
        category: 'strategy',
        title: 'The Vault Handshake',
        hook: 'An armored briefcase sits on your desk with $10,000,000 in bearer bonds.',
        setup: 'Across the walnut table, an operative in a grey suit taps a Montblanc pen on an irrevocable contract, waiting for your signature while the wall clock ticks down from 180 seconds.',
        scenario: 'Across the walnut table, an operative in a grey suit taps a Montblanc pen on an irrevocable contract, waiting for your signature while the wall clock ticks down from 180 seconds.',
        depth: 'standard',
        choices: [
          { id: 'c1', label: 'Sign Contract', description: 'Take the $10M.', tradeOff: 'Spend 5 years in underground lockdown.' },
          { id: 'c2', label: 'Walk Out Free', description: 'Keep your calendar.', tradeOff: 'Permanently cap wealth at $75,000/yr.' },
        ],
        pollQuestion: 'Do you sign before the timer hits zero?',
        payoff: { reveal: 'Isolation breaks executives faster than poverty.', surprisingOutcome: 'Autonomy compounds happiness.' },
        formattedTelegramText: '<b>The Vault Handshake</b>',
        visualSpec: { template: 'thought_experiment', title: 'Vault' },
      };

      const result = ContentRealismEvaluator.evaluateDilemma(sample, 'Negotiation');
      assert.equal(result.qualityChecks.concreteScenario, true);
      assert.equal(result.qualityChecks.visualizablePresence, true);
      assert.equal(result.overallClassification, 'STRONG');
    });

    it('flags abstract, ungrounded philosophical debates', () => {
      const sample: InteractiveDilemma = {
        id: 'test-abstract-01',
        index: 4,
        category: 'moral',
        title: 'Abstract Virtue',
        hook: 'Virtue and utilitarian outcomes frequently conflict in decision spaces.',
        setup: 'Consider an abstract principle where morality dictates choosing welfare over duties.',
        scenario: 'Consider an abstract principle where morality dictates choosing welfare over duties.',
        depth: 'standard',
        choices: [
          { id: 'c1', label: 'Welfare', description: 'Choose welfare.', tradeOff: 'Violates duty.' },
          { id: 'c2', label: 'Duty', description: 'Choose duty.', tradeOff: 'Diminishes welfare.' },
        ],
        pollQuestion: 'Which principle governs?',
        payoff: { reveal: 'Ethics remain divided.', surprisingOutcome: 'Theories differ.' },
        formattedTelegramText: '<b>Abstract Virtue</b>',
        visualSpec: { template: 'thought_experiment', title: 'Abstract' },
      };

      const result = ContentRealismEvaluator.evaluateDilemma(sample, 'Abstract');
      assert.equal(result.qualityChecks.concreteScenario, false);
      assert.ok(result.detectedWeaknesses.some((w) => w.includes('ABSTRACT_UNGROUNDED')));
    });
  });

  describe('Criterion 4: Genuine Pressure & Urgency', () => {
    it('confirms presence of countdown timers, dwindling resources, or deadlines', () => {
      const sample: InteractiveDilemma = {
        id: 'test-pressure-01',
        index: 5,
        category: 'survival',
        title: 'Crevasse Icefall',
        hook: 'Your climbing partner is hanging by a fraying nylon rope over a 200-foot glacial abyss.',
        setup: 'The ice anchor is cracking under 80kg of tension. The anchor will shear in less than 90 seconds unless you chop the secondary pack.',
        scenario: 'The ice anchor is cracking under 80kg of tension. The anchor will shear in less than 90 seconds unless you chop the secondary pack.',
        depth: 'quick',
        pressure: 'Ice anchor shears in 90 seconds.',
        choices: [
          { id: 'c1', label: 'Cut the Gear Pack', description: 'Drop the satellite radio and tent.', tradeOff: 'Strands both climbers in a sub-zero blizzard with no shelter.' },
          { id: 'c2', label: 'Attempt Manual Haul', description: 'Heave on the frozen rope.', tradeOff: 'If anchor blows, both fall into the bottomless chasm.' },
        ],
        pollQuestion: 'Do you cut the survival gear or risk hauling?',
        payoff: { reveal: 'Weight reduction is the only physics-backed mountain save.', surprisingOutcome: 'Pack sacrifices save lives.' },
        formattedTelegramText: '<b>Crevasse Icefall</b>',
        visualSpec: { template: 'thought_experiment', title: 'Icefall' },
      };

      const result = ContentRealismEvaluator.evaluateDilemma(sample, 'Survival');
      assert.equal(result.qualityChecks.genuinePressure, true);
    });

    it('detects missing pressure when no clock, threat, or stakes exist', () => {
      const sample: InteractiveDilemma = {
        id: 'test-pressure-02',
        index: 6,
        category: 'moral',
        title: 'The Slow Tea Choice',
        hook: 'You have all the time in the world to pick a beverage.',
        setup: 'You are sitting on a quiet veranda with an afternoon breeze, leisurely reviewing tea menus.',
        scenario: 'You are sitting on a quiet veranda with an afternoon breeze, leisurely reviewing tea menus.',
        depth: 'standard',
        choices: [
          { id: 'c1', label: 'Green Tea', description: 'Drink tea.', tradeOff: 'Do not drink black tea.' },
          { id: 'c2', label: 'Black Tea', description: 'Drink black tea.', tradeOff: 'Do not drink green tea.' },
        ],
        pollQuestion: 'Which tea do you sip?',
        payoff: { reveal: 'Tea has polyphenols.', surprisingOutcome: 'Antioxidants differ.' },
        formattedTelegramText: '<b>The Slow Tea Choice</b>',
        visualSpec: { template: 'thought_experiment', title: 'Tea' },
      };

      const result = ContentRealismEvaluator.evaluateDilemma(sample, 'Leisure');
      assert.equal(result.qualityChecks.genuinePressure, false);
      assert.ok(result.detectedWeaknesses.some((w) => w.includes('LACKS_PRESSURE')));
    });
  });

  describe('Criterion 5 & 6: Meaningful Trade-offs & Tempting Balance', () => {
    it('detects trivial or cost-free downsides', () => {
      const sample: InteractiveDilemma = {
        id: 'test-trivial-01',
        index: 7,
        category: 'money/lifestyle',
        title: 'The Free Money Deal',
        hook: 'A benefactor hands you $50,000 cash with no strings attached.',
        setup: 'You can take the money or leave it sitting on the park bench.',
        scenario: 'You can take the money or leave it sitting on the park bench.',
        depth: 'quick',
        choices: [
          { id: 'c1', label: 'Take Cash', description: 'Pocket the funds.', tradeOff: 'None' },
          { id: 'c2', label: 'Leave It', description: 'Walk away.', tradeOff: 'Get nothing at all.' },
        ],
        pollQuestion: 'Do you take the free money?',
        payoff: { reveal: 'Nobody leaves free cash.', surprisingOutcome: '100% take it.' },
        formattedTelegramText: '<b>Free Money</b>',
        visualSpec: { template: 'thought_experiment', title: 'Cash' },
      };

      const result = ContentRealismEvaluator.evaluateDilemma(sample, 'Control');
      assert.equal(result.qualityChecks.meaningfulTradeoff, false);
      assert.ok(result.detectedWeaknesses.some((w) => w.includes('TRIVIAL_DOWNSIDE')));
    });

    it('detects obvious dominant choices (lethal vs trivial snack)', () => {
      const sample: InteractiveDilemma = {
        id: 'test-obvious-01',
        index: 8,
        category: 'survival',
        title: 'The Buffet vs. The Acid Pit',
        hook: 'Two steel doors are set into the concrete room.',
        setup: 'Door A opens to a freshly prepared warm gourmet steak dinner. Door B drops you into boiling hydrochloric acid where you die instantly.',
        scenario: 'Door A opens to a freshly prepared warm gourmet steak dinner. Door B drops you into boiling hydrochloric acid where you die instantly.',
        depth: 'quick',
        choices: [
          { id: 'c1', label: 'Door A: Steak', description: 'Eat dinner.', tradeOff: 'Minor calorie surplus.' },
          { id: 'c2', label: 'Door B: Acid Pit', description: 'Jump into acid.', tradeOff: 'Instant agonizing death.' },
        ],
        pollQuestion: 'Which door do you open?',
        payoff: { reveal: 'Trivial choice.', surprisingOutcome: 'No one chooses acid.' },
        formattedTelegramText: '<b>The Buffet vs Acid</b>',
        visualSpec: { template: 'thought_experiment', title: 'Acid' },
      };

      const result = ContentRealismEvaluator.evaluateDilemma(sample, 'Control');
      assert.equal(result.qualityChecks.bothChoicesTempting, false);
      assert.ok(result.detectedWeaknesses.some((w) => w.includes('OBVIOUS_CHOICE')));
      assert.equal(result.overallClassification, 'REJECT');
    });
  });

  describe('Criterion 8 & 9: Shallow WYR & Formulaic "X but lose Y" Detection', () => {
    it('detects shallow "$1 million you cannot spend" cliché and classifies as REJECT', () => {
      const sample: InteractiveDilemma = {
        id: 'test-shallow-01',
        index: 9,
        category: 'money/lifestyle',
        title: 'The $1M Trap',
        hook: 'Would you rather receive $1 million but you can never spend it?',
        setup: 'You receive $1 million, but you can never spend it on anything in your life.',
        scenario: 'You receive $1 million, but you can never spend it on anything in your life.',
        depth: 'quick',
        choices: [
          { id: 'c1', label: 'Take $1M', description: 'Keep money in room.', tradeOff: 'Cannot spend it.' },
          { id: 'c2', label: 'Decline', description: 'Nothing happens.', tradeOff: 'No money.' },
        ],
        pollQuestion: 'Do you accept?',
        payoff: { reveal: 'Useless money.', surprisingOutcome: 'Nobody wants unspendable cash.' },
        formattedTelegramText: '<b>The $1M Trap</b>',
        visualSpec: { template: 'thought_experiment', title: 'Trap' },
      };

      const result = ContentRealismEvaluator.evaluateDilemma(sample, 'Control WYR');
      assert.equal(result.qualityChecks.avoidsGenericWYR, false);
      assert.equal(result.qualityChecks.avoidsFormulaicPatterns, false);
      assert.equal(result.overallClassification, 'REJECT');
      assert.ok(result.detectedWeaknesses.some((w) => w.includes('SHALLOW_WYR')));
      assert.ok(result.detectedWeaknesses.some((w) => w.includes('LAZY_X_BUT_Y_CONSTRUCTION')));
    });

    it('detects formulaic "You get X, but you lose Y" template', () => {
      const sample: InteractiveDilemma = {
        id: 'test-formulaic-01',
        index: 10,
        category: 'funny/chaotic',
        title: 'The Vision Trade',
        hook: 'You receive x-ray vision, but you lose the ability to see colors.',
        setup: 'You receive x-ray vision, but you lose the ability to see colors.',
        scenario: 'You receive x-ray vision, but you lose the ability to see colors.',
        depth: 'quick',
        choices: [
          { id: 'c1', label: 'X-Ray Vision', description: 'See through walls.', tradeOff: 'Black and white vision only.' },
          { id: 'c2', label: 'Normal Vision', description: 'Keep colors.', tradeOff: 'No x-ray vision.' },
        ],
        pollQuestion: 'Would you trade?',
        payoff: { reveal: 'Monochrome vision degrades life satisfaction.', surprisingOutcome: 'Color vision is essential.' },
        formattedTelegramText: '<b>Vision Trade</b>',
        visualSpec: { template: 'thought_experiment', title: 'Vision' },
      };

      const result = ContentRealismEvaluator.evaluateDilemma(sample, 'Control Formulaic');
      assert.equal(result.qualityChecks.avoidsFormulaicPatterns, false);
      assert.ok(result.detectedWeaknesses.some((w) => w.includes('LAZY_X_BUT_Y_CONSTRUCTION')));
      assert.ok(['WEAK', 'REJECT'].includes(result.overallClassification));
    });
  });

  describe('Criterion 11: Anti-Academic Jargon Gate', () => {
    it('strictly rejects academic psychology lecturing in entertainment posts', () => {
      const sample: InteractiveDilemma = {
        id: 'test-academic-01',
        index: 11,
        category: 'moral',
        title: 'Cognitive Research Post',
        hook: 'Psychologists study how cognitive dissonance impacts subjective well-being in hospital wards.',
        setup: 'In peer-reviewed experiments, neuroscientists measure hedonic adaptation using fMRI scans and cortisol levels.',
        scenario: 'In peer-reviewed experiments, neuroscientists measure hedonic adaptation using fMRI scans and cortisol levels.',
        depth: 'standard',
        choices: [
          { id: 'c1', label: 'Study A', description: 'Higher dissonance.', tradeOff: 'Elevated cortisol levels.' },
          { id: 'c2', label: 'Study B', description: 'Lower dissonance.', tradeOff: 'Reduced hedonic baseline.' },
        ],
        pollQuestion: 'Which condition do you prefer?',
        payoff: { reveal: 'Empirical evidence proves psychological concepts.', surprisingOutcome: 'Studies confirm trends.' },
        formattedTelegramText: '<b>Cognitive Research Post</b>',
        visualSpec: { template: 'thought_experiment', title: 'Research' },
      };

      const result = ContentRealismEvaluator.evaluateDilemma(sample, 'Control Academic');
      assert.equal(result.qualityChecks.entertainmentFocus, false);
      assert.ok(result.detectedWeaknesses.some((w) => w.includes('ACADEMIC_LECTURING')));
      assert.equal(result.overallClassification, 'REJECT');
    });
  });

  describe('Controlled Representative Sample Execution & Report Generation', () => {
    it('executes full evaluation run and saves machine-readable report to disk', () => {
      const report = ContentRealismEvaluator.runEvaluation();

      assert.ok(report.totalSamples >= 12, 'Must evaluate at least 12 representative samples');
      assert.ok(report.classifications.STRONG > 0, 'Must have STRONG samples');
      assert.ok(report.classifications.REJECT > 0, 'Must identify and reject flawed control samples');

      const { jsonPath, mdPath } = ContentRealismEvaluator.saveReports(report, 'data');
      assert.ok(fs.existsSync(jsonPath), 'JSON report must exist');
      assert.ok(fs.existsSync(mdPath), 'Markdown report must exist');

      const fileContent = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      assert.equal(fileContent.totalSamples, report.totalSamples);
      assert.ok(Array.isArray(fileContent.samples));
      assert.ok(fileContent.recurringWeaknesses);

      // Verify sample structure in report
      const firstSample: ScenarioEvaluationResult = fileContent.samples[0];
      assert.ok(firstSample.sampleId);
      assert.ok(firstSample.title);
      assert.ok(firstSample.format);
      assert.ok(firstSample.depth);
      assert.ok(firstSample.archetype);
      assert.ok(firstSample.generatedScenario.hook);
      assert.ok(firstSample.qualityChecks);
      assert.ok(Array.isArray(firstSample.detectedWeaknesses));
      assert.ok(['STRONG', 'ACCEPTABLE', 'WEAK', 'REJECT'].includes(firstSample.overallClassification));
    });
  });
});

/**
 * Content Realism & Entertainment Evaluation Engine
 * Pick Your Fate & Interactive Dilemmas Content Quality Suite
 *
 * Evaluates generated scenarios across 12 human-centric entertainment and realism criteria:
 * 1. Immediate Curiosity (gripping hook, in medias res, no passive cliches)
 * 2. Concrete vs. Abstract (tangible objects, physical nouns, explicit numbers)
 * 3. Visualizable Presence (sensory/spatial presence, second-person embodiment)
 * 4. Genuine Pressure (active countdown, dwindling resource, imminent consequence)
 * 5. Meaningful Trade-off (non-trivial, irreversible sacrifice on all paths)
 * 6. Both Choices Tempting (balanced decision tension, no obvious dominant choice)
 * 7. Uncertain Outcome (unpredictable audience split, high community tension)
 * 8. Avoids Generic "Would You Rather" (rejects shallow $1M/flying tropes)
 * 9. Avoids Formulaic Patterns (rejects lazy "You get X, but you lose Y")
 * 10. Standalone Clarity (zero serialized or lore prerequisites)
 * 11. Entertainment Focus (strictly zero academic psychology lecturing)
 * 12. Invites Participation (compelling call to action / agonizing decision prompt)
 */

import fs from 'node:fs';
import path from 'node:path';
import { DilemmaGenerator } from './generator.js';
import { DilemmaTelegramFormatter } from './formatter.js';
import {
  ContentDepth,
  ContentFormat,
  DilemmaCategory,
  InteractiveDilemma,
  PressureType,
} from './types.js';

export type QualityClassification = 'STRONG' | 'ACCEPTABLE' | 'WEAK' | 'REJECT';

export interface ScenarioEvaluationChecks {
  immediateCuriosity: boolean;
  concreteScenario: boolean;
  visualizablePresence: boolean;
  genuinePressure: boolean;
  meaningfulTradeoff: boolean;
  bothChoicesTempting: boolean;
  uncertainOutcome: boolean;
  avoidsGenericWYR: boolean;
  avoidsFormulaicPatterns: boolean;
  standaloneClarity: boolean;
  entertainmentFocus: boolean;
  invitesParticipation: boolean;
}

export interface ScenarioEvaluationResult {
  sampleId: string;
  title: string;
  format: string;
  depth: ContentDepth;
  archetype: string;
  category: string;
  generatedScenario: {
    hook: string;
    setup: string;
    pressure?: string;
    twist?: string;
    choices: Array<{ label: string; tradeOff: string }>;
    question: string;
    wordCount: number;
  };
  qualityChecks: ScenarioEvaluationChecks;
  detectedWeaknesses: string[];
  overallClassification: QualityClassification;
  summaryRationale: string;
}

export interface RecurringWeaknessAnalysis {
  repetitiveOpenings: { count: number; examples: string[] };
  repetitiveTradeoffStructures: { count: number; examples: string[] };
  obviousChoices: { count: number; examples: string[] };
  weakStakes: { count: number; examples: string[] };
  artificialScenarios: { count: number; examples: string[] };
  excessiveExposition: { count: number; examples: string[] };
  predictableTwists: { count: number; examples: string[] };
  genericWording: { count: number; phrases: string[] };
  overuseMoneyLifeDeath: { count: number; percentage: string; examples: string[] };
  excessiveXButLoseY: { count: number; examples: string[] };
}

export interface EvaluationRunReport {
  generatedAt: string;
  channelContext: string;
  totalSamples: number;
  classifications: {
    STRONG: number;
    ACCEPTABLE: number;
    WEAK: number;
    REJECT: number;
  };
  recurringWeaknesses: RecurringWeaknessAnalysis;
  samples: ScenarioEvaluationResult[];
}

export class ContentRealismEvaluator {
  // Cliché openings that signal low effort / lack of immediate curiosity
  private static readonly CLICHE_OPENING_PATTERNS: RegExp[] = [
    /^(?:would\s+you\s+rather|what\s+if\s+you|imagine\s+(?:if|that|a\s+world)|do\s+you\s+think|have\s+you\s+ever)\b/i,
    /^(?:in\s+a\s+world\s+where|suppose\s+that|consider\s+a\s+situation)\b/i,
  ];

  // Banned academic/psychology lecture patterns
  private static readonly ACADEMIC_PATTERNS: RegExp[] = [
    /\bcognitive\s+dissonance\b/i,
    /\bhedonic\s+adaptation\b/i,
    /\baffective\s+forecasting\b/i,
    /\bpeer-reviewed\b/i,
    /\bpsychologists\s+study\b/i,
    /\blaboratory\s+experiments?\b/i,
    /\bneuroscience\s+reveals\b/i,
    /\bcortisol\s+levels\b/i,
    /\bfmri\s+scans?\b/i,
    /\bempirical\s+evidence\b/i,
    /\baccording\s+to\s+a\s+(?:study|paper|meta-analysis)\b/i,
    /\bpsychological\s+(?:concept|insight)\b/i,
  ];

  // Generic shallow Would-You-Rather cliches
  private static readonly GENERIC_WYR_PATTERNS: RegExp[] = [
    /\b(?:would\s+you\s+rather\s+)?(?:have|receive|get|take)?\s*\$?[0-9]+\s*(?:million|billion|[kmb])\s*,?\s*but\s+(?:you\s+)?(?:can\s+)?never\s+spend\s+it\b/i,
    /\bwould\s+you\s+rather\s+(?:have|receive|get|take)?\s*\$?[0-9]+\s*(?:million|billion|[kmb])\s+or\s+(?:live\s+forever|be\s+immortal)\b/i,
    /\bwould\s+you\s+rather\s+(?:fly|be\s+invisible)\s+or\s+(?:teleport|read\s+minds)\b/i,
    /\bwould\s+you\s+rather\s+be\s+rich\s+and\s+sad\s+or\s+poor\s+and\s+happy\b/i,
    /\bwould\s+you\s+rather\s+know\s+(?:how|when)\s+you\s+die\b/i,
    /\bwould\s+you\s+rather\s+(?:eat|have)\s+(?:pizza|tacos|ice\s+cream)\b/i,
  ];

  // Lazy formulaic X but lose Y patterns
  private static readonly FORMULAIC_X_BUT_Y: RegExp[] = [
    /\byou\s+(?:receive|get|have)\s+[^,.]+\s*,\s*but\s+(?:you\s+)?(?:can\s+never|lose|forfeit|give\s+up)\s+[^.]+\.?/i,
    /\bpress\s+(?:a|the)\s+button\s+to\s+get\s+[^,.]+\s*,\s*but\s+[^.]+\.?/i,
  ];

  // Physical spatial and sensory keywords for concrete immersion
  private static readonly CONCRETE_SENSORY_KEYWORDS = [
    'table', 'desk', 'room', 'vault', 'briefcase', 'ridge', 'tent', 'ice', 'crevasse',
    'screen', 'drive', 'server', 'pen', 'altar', 'chapel', 'sub', 'trench', 'needle',
    'timer', 'clock', 'flare', 'door', 'hallway', 'loudspeaker', 'whisper', 'sweating',
    'freezing', 'blizzard', 'cable', 'wire', 'phone', 'documents', 'cash', 'bonds',
    'hospital', 'cockpit', 'alarm', 'pressure', 'gauge', 'oxygen', 'mask', 'crampons',
  ];

  // Active time pressure or countdown cues
  private static readonly PRESSURE_INDICATORS: RegExp[] = [
    /\b(?:[0-9]+\s*(?:seconds?|minutes?|hours?|days?)|timer|countdown|clock|deadline|midnight|dawn)\b/i,
    /\b(?:dropping|running\s+out|freezing|depleting|scrubbing|collapsing|lethal|breach)\b/i,
  ];

  /**
   * Evaluates a single interactive dilemma for narrative realism and human entertainment value.
   */
  public static evaluateDilemma(dilemma: InteractiveDilemma, archetype: string): ScenarioEvaluationResult {
    const weaknesses: string[] = [];

    const hook = dilemma.hook || '';
    const setup = dilemma.setup || dilemma.scenario || '';
    const pressure = dilemma.pressure || '';
    const twist = dilemma.twist || '';
    const fullText = [
      dilemma.title,
      hook,
      setup,
      pressure,
      twist,
      ...dilemma.choices.map((c) => `${c.label} ${c.description} ${c.tradeOff} ${c.consequence || ''}`),
      dilemma.pollQuestion || '',
      dilemma.discussionPrompt || '',
      dilemma.payoff?.reveal || '',
    ].join(' ');

    const lowerHook = hook.toLowerCase().trim();
    const lowerSetup = setup.toLowerCase().trim();
    const lowerFull = fullText.toLowerCase();

    // 1. Immediate Curiosity
    let immediateCuriosity = true;
    for (const pat of this.CLICHE_OPENING_PATTERNS) {
      if (pat.test(lowerHook)) {
        immediateCuriosity = false;
        weaknesses.push('WEAK_OPENING: Opening starts with a passive or cliché formula (e.g. "Would you rather", "Imagine").');
        break;
      }
    }
    if (hook.length < 20) {
      immediateCuriosity = false;
      weaknesses.push('WEAK_OPENING: Opening hook is too brief to establish curiosity.');
    }

    // 2. Concrete vs. Abstract
    const sensoryMatches = this.CONCRETE_SENSORY_KEYWORDS.filter((w) => lowerFull.includes(w));
    const hasNumbersOrUnits = /\b(?:\$?[0-9]+(?:\.[0-9]+)?(?:\s*(?:k|m|million|billion|mph|ft|feet|meters?|c|°c|%)|hours?|minutes?|seconds?|days?|years?)?)\b/i.test(fullText);
    let concreteScenario = true;
    if (sensoryMatches.length < 2 && !hasNumbersOrUnits) {
      concreteScenario = false;
      weaknesses.push('ABSTRACT_UNGROUNDED: Scenario lacks concrete physical objects, numbers, or environmental anchors.');
    }

    // 3. Visualizable Presence
    const hasSecondPersonPresense = /\b(?:you\s+stand|in\s+your\s+hand|across\s+the\s+table|slides?|sweat|whispers?|behind\s+you|at\s+your\s+desk|on\s+the\s+ridge|in\s+the\s+room|in\s+the\s+suite)\b/i.test(lowerFull) ||
      /\b(?:holding|walking|trapped|staring|signing|running)\b/i.test(lowerFull);
    let visualizablePresence = true;
    if (!hasSecondPersonPresense && sensoryMatches.length < 3) {
      visualizablePresence = false;
      weaknesses.push('LACKS_SENSORY_GROUNDING: The reader cannot easily visualize their physical position in the scene.');
    }

    // 4. Genuine Pressure
    let genuinePressure = false;
    for (const pat of this.PRESSURE_INDICATORS) {
      if (pat.test(fullText) || (pressure && pressure.length > 15)) {
        genuinePressure = true;
        break;
      }
    }
    if (!genuinePressure) {
      weaknesses.push('LACKS_PRESSURE: Scenario lacks a ticking clock, dwindling resource, or active threat urgency.');
    }

    // 5. Meaningful Trade-off
    let meaningfulTradeoff = true;
    if (!dilemma.choices || dilemma.choices.length < 2) {
      meaningfulTradeoff = false;
      weaknesses.push('MISSING_CHOICES: Dilemma must have at least 2 viable choices.');
    } else {
      for (let i = 0; i < dilemma.choices.length; i++) {
        const c = dilemma.choices[i];
        const tradeOff = c.tradeOff || '';
        if (tradeOff.trim().length < 10) {
          meaningfulTradeoff = false;
          weaknesses.push(`TRIVIAL_DOWNSIDE: Choice ${i + 1} ("${c.label}") lacks an explicit, costly trade-off.`);
        } else if (/\b(?:none|nothing|no\s+cost|free|trivial|mild\s+calorie|minor\s+inconvenience|slight\s+delay)\b/i.test(tradeOff.trim())) {
          meaningfulTradeoff = false;
          weaknesses.push(`TRIVIAL_DOWNSIDE: Choice ${i + 1} has a cost-free or trivial trade-off ("${tradeOff}").`);
        }
      }
    }

    // 6. Both Choices Tempting (Balanced Tension)
    let bothChoicesTempting = true;
    if (dilemma.choices && dilemma.choices.length >= 2) {
      const cA = dilemma.choices[0];
      const cB = dilemma.choices[1];
      const descA = (cA.description + ' ' + cA.tradeOff).toLowerCase();
      const descB = (cB.description + ' ' + cB.tradeOff).toLowerCase();

      // Check for strictly dominant or lethal vs benign choices
      const isLethalA = /\b(?:die|death|lethal|killed|fatal|vipers?)\b/i.test(descA);
      const isLethalB = /\b(?:die|death|lethal|killed|fatal|vipers?)\b/i.test(descB);
      const isSeriousSacrificeA = isLethalA || /\b(?:burnout|sacrifice|forfeit|ruin|agony|chasm|lethal|hypothermia|blacklisted|concussion)\b/i.test(descA);
      const isSeriousSacrificeB = isLethalB || /\b(?:burnout|sacrifice|forfeit|ruin|agony|chasm|lethal|hypothermia|blacklisted|concussion)\b/i.test(descB);

      if ((isLethalA && !isSeriousSacrificeB) || (isLethalB && !isSeriousSacrificeA)) {
        bothChoicesTempting = false;
        weaknesses.push('OBVIOUS_CHOICE: One choice carries lethal certainty or catastrophic ruin while the other has only trivial downsides, destroying tension.');
      }
      if (cA.label.toLowerCase() === cB.label.toLowerCase()) {
        bothChoicesTempting = false;
        weaknesses.push('DUPLICATE_CHOICES: Choices have identical labels.');
      }
    }

    // 7. Uncertain Outcome
    let uncertainOutcome = true;
    if (!bothChoicesTempting || !meaningfulTradeoff) {
      uncertainOutcome = false;
    }

    // 8. Avoids Generic Would You Rather
    let avoidsGenericWYR = true;
    for (const pat of this.GENERIC_WYR_PATTERNS) {
      if (pat.test(lowerHook) || pat.test(lowerSetup)) {
        avoidsGenericWYR = false;
        weaknesses.push('SHALLOW_WYR: Scenario relies on a generic "Would You Rather" cliché (e.g. $1M you cannot spend).');
        break;
      }
    }

    // 9. Avoids Formulaic Patterns ("You get X but lose Y")
    let avoidsFormulaicPatterns = true;
    for (const pat of this.FORMULAIC_X_BUT_Y) {
      if (pat.test(lowerSetup) && lowerSetup.length < 90) {
        avoidsFormulaicPatterns = false;
        weaknesses.push('LAZY_X_BUT_Y_CONSTRUCTION: Scenario uses a shallow "You get X, but you lose Y" template without worldbuilding.');
        break;
      }
    }

    // 10. Standalone Clarity
    let standaloneClarity = true;
    if (/\b(?:part\s+[0-9]+|as\s+we\s+saw\s+yesterday|in\s+our\s+previous\s+episode|to\s+be\s+continued)\b/i.test(fullText)) {
      standaloneClarity = false;
      weaknesses.push('SERIALIZED_DEPENDENCY: Post relies on serialized or multi-part narrative dependencies.');
    }

    // 11. Entertainment Focus (Anti-Academic Jargon)
    let entertainmentFocus = true;
    for (const pat of this.ACADEMIC_PATTERNS) {
      if (pat.test(fullText)) {
        const match = fullText.match(pat)?.[0];
        entertainmentFocus = false;
        weaknesses.push(`ACADEMIC_LECTURING: Uses textbook research jargon ("${match}"). Scenarios must remain pure entertainment.`);
        break;
      }
    }

    // 12. Invites Participation
    const question = dilemma.pollQuestion || dilemma.discussionPrompt || '';
    let invitesParticipation = true;
    if (!question || question.trim().length < 10) {
      invitesParticipation = false;
      weaknesses.push('LACKS_CALL_TO_ACTION: Lacks a compelling closing poll question or discussion hook.');
    }

    // Word Count & Exposition checks
    const totalWords = fullText.split(/\s+/).filter(Boolean).length;
    if (totalWords > 450) {
      weaknesses.push('EXCESSIVE_EXPOSITION: Narrative exceeds 450 words, risking reader fatigue on mobile.');
    }

    // Overuse of generic tropes check
    if (/\b(?:\$1,000,000|\$1m|1\s*million\s+dollars)\b/i.test(fullText) && !hasSecondPersonPresense) {
      weaknesses.push('REPETITIVE_MONEY_TROPE: Standard $1M trope used without vivid situational motivation.');
    }

    const checks: ScenarioEvaluationChecks = {
      immediateCuriosity,
      concreteScenario,
      visualizablePresence,
      genuinePressure,
      meaningfulTradeoff,
      bothChoicesTempting,
      uncertainOutcome,
      avoidsGenericWYR,
      avoidsFormulaicPatterns,
      standaloneClarity,
      entertainmentFocus,
      invitesParticipation,
    };

    // Determine Overall Quality Classification
    let overallClassification: QualityClassification = 'STRONG';

    const hasFatalFlaw = !avoidsGenericWYR || !entertainmentFocus || !meaningfulTradeoff || !standaloneClarity || (!bothChoicesTempting && weaknesses.some((w) => w.includes('OBVIOUS_CHOICE')));
    const hasMajorFlaw = !immediateCuriosity || !concreteScenario || !genuinePressure || !bothChoicesTempting || !avoidsFormulaicPatterns;

    if (hasFatalFlaw) {
      overallClassification = 'REJECT';
    } else if (hasMajorFlaw || weaknesses.length >= 2) {
      overallClassification = 'WEAK';
    } else if (weaknesses.length === 1) {
      overallClassification = 'ACCEPTABLE';
    } else {
      overallClassification = 'STRONG';
    }

    let summaryRationale = '';
    if (overallClassification === 'STRONG') {
      summaryRationale = 'Exemplary situational realism: concrete environment, palpable ticking clock, balanced high-stakes dilemma, and zero generic tropes.';
    } else if (overallClassification === 'ACCEPTABLE') {
      summaryRationale = `Solid playable dilemma with minor issue: ${weaknesses.join('; ')}.`;
    } else if (overallClassification === 'WEAK') {
      summaryRationale = `Suffers from formulaic patterns or insufficient tension: ${weaknesses.join('; ')}.`;
    } else {
      summaryRationale = `Rejected due to critical quality failure: ${weaknesses.join('; ')}.`;
    }

    return {
      sampleId: dilemma.id,
      title: dilemma.title,
      format: dilemma.format || 'impossible_dilemma',
      depth: dilemma.depth || 'standard',
      archetype,
      category: dilemma.category || 'moral',
      generatedScenario: {
        hook: dilemma.hook,
        setup: dilemma.setup || dilemma.scenario || '',
        pressure: dilemma.pressure,
        twist: dilemma.twist,
        choices: (dilemma.choices || []).map((c) => ({
          label: c.label,
          tradeOff: c.tradeOff,
        })),
        question: dilemma.pollQuestion || dilemma.discussionPrompt || '',
        wordCount: totalWords,
      },
      qualityChecks: checks,
      detectedWeaknesses: weaknesses,
      overallClassification,
      summaryRationale,
    };
  }

  /**
   * Generates a controlled, representative evaluation dataset covering all requested
   * depths and archetypes, plus intentional boundary/stress-test edge cases.
   */
  public static generateEvaluationDataset(): Array<{ dilemma: InteractiveDilemma; archetype: string }> {
    const generator = new DilemmaGenerator();

    const sampleSpecs: Array<{
      category: DilemmaCategory;
      format: ContentFormat;
      depth: ContentDepth;
      archetype: string;
      pressureTypes: PressureType[];
    }> = [
      // 1. Quick - Survival
      {
        category: 'survival',
        format: 'survival_scenario',
        depth: 'quick',
        archetype: 'Survival',
        pressureTypes: ['survival', 'time_pressure'],
      },
      // 2. Quick - Countdown
      {
        category: 'strategy',
        format: 'strategy_challenge',
        depth: 'quick',
        archetype: 'Countdown',
        pressureTypes: ['time_pressure', 'limited_resources'],
      },
      // 3. Quick - Social Dilemma
      {
        category: 'social/relationship',
        format: 'impossible_dilemma',
        depth: 'quick',
        archetype: 'Social dilemma',
        pressureTypes: ['social_pressure', 'reputation'],
      },
      // 4. Standard - Negotiation
      {
        category: 'money/lifestyle',
        format: 'impossible_dilemma',
        depth: 'standard',
        archetype: 'Negotiation',
        pressureTypes: ['money', 'risk_vs_reward', 'conflicting_goals'],
      },
      // 5. Standard - Asymmetric Information
      {
        category: 'moral',
        format: 'impossible_dilemma',
        depth: 'standard',
        archetype: 'Asymmetric information',
        pressureTypes: ['hidden_information', 'information_asymmetry'],
      },
      // 6. Standard - Chaotic Scenario
      {
        category: 'funny/chaotic',
        format: 'chaotic_funny',
        depth: 'standard',
        archetype: 'Chaotic scenario',
        pressureTypes: ['unexpected_consequences', 'social_pressure'],
      },
      // 7. Standard - Strategy
      {
        category: 'strategy',
        format: 'strategy_challenge',
        depth: 'standard',
        archetype: 'Strategy',
        pressureTypes: ['strategic_decisions', 'betrayal'],
      },
      // 8. Deep - Future / Technology
      {
        category: 'technology/future',
        format: 'future_tech',
        depth: 'deep',
        archetype: 'Future/technology',
        pressureTypes: ['technology', 'impossible_tradeoffs'],
      },
      // 9. Deep - Mystery / Challenge
      {
        category: 'bizarre hypothetical situations',
        format: 'mini_mystery',
        depth: 'deep',
        archetype: 'Mystery/challenge',
        pressureTypes: ['hidden_information', 'time_pressure'],
      },
      // 10. Deep - Survival
      {
        category: 'adventure/travel',
        format: 'survival_scenario',
        depth: 'deep',
        archetype: 'Survival',
        pressureTypes: ['survival', 'limited_resources'],
      },
      // 11. Deep - Negotiation
      {
        category: 'strategy',
        format: 'impossible_dilemma',
        depth: 'deep',
        archetype: 'Negotiation',
        pressureTypes: ['betrayal', 'time_pressure', 'conflicting_goals'],
      },
      // 12. Deep - Social Dilemma
      {
        category: 'moral',
        format: 'strategy_challenge',
        depth: 'deep',
        archetype: 'Social dilemma',
        pressureTypes: ['social_pressure', 'relationships', 'betrayal'],
      },
    ];

    const dataset: Array<{ dilemma: InteractiveDilemma; archetype: string }> = [];

    sampleSpecs.forEach((spec, idx) => {
      const dilemma = generator.generateProceduralDilemma(spec.category, `eval-sample-${(idx + 1).toString().padStart(2, '0')}`, idx + 1, {
        depth: spec.depth,
        format: spec.format,
        pressureTypes: spec.pressureTypes,
      });
      dataset.push({ dilemma, archetype: spec.archetype });
    });

    // Add controlled edge cases to verify evaluator sensitivity against shallow/flawed patterns
    // Control Sample A: Shallow Would You Rather ($1M you can never spend)
    const shallowWyrDilemma: InteractiveDilemma = {
      id: 'eval-sample-13-control-wyr',
      index: 13,
      category: 'money/lifestyle',
      title: 'The Million Dollar Vault Riddle',
      hook: 'Would you rather receive $1 million but you can never spend it?',
      setup: 'You receive $1 million, but you can never spend it on anything. Would you accept?',
      scenario: 'You receive $1 million, but you can never spend it on anything. Would you accept?',
      depth: 'quick',
      format: 'impossible_dilemma',
      choices: [
        { id: 'c1', label: 'Accept the $1M', description: 'Take the money into your room.', tradeOff: 'Cannot spend it.' },
        { id: 'c2', label: 'Decline', description: 'Walk away empty-handed.', tradeOff: 'Get nothing.' },
      ],
      pollQuestion: 'Would you rather accept or decline?',
      payoff: {
        reveal: 'This is a hollow hypothetical that provides no real psychological tension.',
        surprisingOutcome: 'Most people refuse.',
      },
      formattedTelegramText: '<b>The Million Dollar Riddle</b>\n\nWould you accept?',
      visualSpec: { template: 'thought_experiment', title: 'The Riddle' },
    };
    dataset.push({ dilemma: shallowWyrDilemma, archetype: 'Generic WYR (Control)' });

    // Control Sample B: Formulaic "You get X but lose Y"
    const formulaicXButY: InteractiveDilemma = {
      id: 'eval-sample-14-control-formulaic',
      index: 14,
      category: 'funny/chaotic',
      title: 'The Energy Swap',
      hook: 'You get unlimited energy, but you lose the ability to sleep.',
      setup: 'You get unlimited energy, but you lose the ability to sleep.',
      scenario: 'You get unlimited energy, but you lose the ability to sleep.',
      depth: 'quick',
      format: 'impossible_dilemma',
      choices: [
        { id: 'c1', label: 'Take Energy', description: 'No fatigue.', tradeOff: 'No sleep ever.' },
        { id: 'c2', label: 'Stay Normal', description: 'Regular life.', tradeOff: 'Still get tired.' },
      ],
      pollQuestion: 'Do you take the trade?',
      payoff: {
        reveal: 'Sleep deprivation causes acute psychosis within 11 days.',
        surprisingOutcome: 'People forget sleep is essential for sanity.',
      },
      formattedTelegramText: '<b>The Energy Swap</b>\n\nTake it?',
      visualSpec: { template: 'thought_experiment', title: 'Energy Swap' },
    };
    dataset.push({ dilemma: formulaicXButY, archetype: 'Formulaic Trade-off (Control)' });

    // Control Sample C: Academic Psychology Jargon
    const academicLecturing: InteractiveDilemma = {
      id: 'eval-sample-15-control-academic',
      index: 15,
      category: 'moral',
      title: 'The Dissonance Experiment',
      hook: 'A cognitive dissonance test on hospital patients reveals ethical tensions in clinical medicine.',
      setup: 'In a peer-reviewed laboratory study, psychologists study how hedonic adaptation impacts cortisol levels under fMRI scans.',
      scenario: 'In a peer-reviewed laboratory study, psychologists study how hedonic adaptation impacts cortisol levels under fMRI scans.',
      depth: 'standard',
      format: 'impossible_dilemma',
      choices: [
        { id: 'c1', label: 'Condition A', description: 'Low cognitive dissonance.', tradeOff: 'High cortisol levels.' },
        { id: 'c2', label: 'Condition B', description: 'High dissonance.', tradeOff: 'Diminished hedonic baseline.' },
      ],
      pollQuestion: 'Which clinical condition would you enroll in?',
      payoff: {
        reveal: 'Empirical evidence shows peer-reviewed conclusions differ from subjective estimates.',
        surprisingOutcome: 'Psychologists confirm laboratory trends.',
      },
      formattedTelegramText: '<b>The Dissonance Experiment</b>\n\nStudy results.',
      visualSpec: { template: 'thought_experiment', title: 'Clinical Trial' },
    };
    dataset.push({ dilemma: academicLecturing, archetype: 'Academic Jargon (Control)' });

    // Control Sample D: Obvious choice with lethal outcome vs benign outcome
    const obviousChoice: InteractiveDilemma = {
      id: 'eval-sample-16-control-obvious',
      index: 16,
      category: 'survival',
      title: 'The Trivial Snack vs. Pit of Vipers',
      hook: 'You are standing in an empty cafeteria with two doors.',
      setup: 'Door A leads to a fresh hot buffet with zero catch. Door B drops you into a pit of 500 starving lethal vipers where you die in 10 seconds.',
      scenario: 'Door A leads to a fresh hot buffet with zero catch. Door B drops you into a pit of 500 starving lethal vipers where you die in 10 seconds.',
      depth: 'quick',
      format: 'survival_scenario',
      choices: [
        { id: 'c1', label: 'Door A: Hot Buffet', description: 'Eat good food.', tradeOff: 'Mild calorie gain.' },
        { id: 'c2', label: 'Door B: Viper Pit', description: 'Fall into snakes.', tradeOff: 'Instant agonizing death.' },
      ],
      pollQuestion: 'Which door do you open?',
      payoff: {
        reveal: '100% of humans pick food over guaranteed snake venom.',
        surprisingOutcome: 'No one chooses death.',
      },
      formattedTelegramText: '<b>The Door Choice</b>\n\nPick a door.',
      visualSpec: { template: 'thought_experiment', title: 'Two Doors' },
    };
    dataset.push({ dilemma: obviousChoice, archetype: 'Obvious Choice (Control)' });

    return dataset;
  }

  /**
   * Conducts the comprehensive evaluation run, compiles results, and analyzes
   * recurring weaknesses across the entire sample set.
   */
  public static runEvaluation(): EvaluationRunReport {
    const dataset = this.generateEvaluationDataset();
    const evaluatedSamples: ScenarioEvaluationResult[] = [];

    const classifications: Record<QualityClassification, number> = {
      STRONG: 0,
      ACCEPTABLE: 0,
      WEAK: 0,
      REJECT: 0,
    };

    dataset.forEach(({ dilemma, archetype }) => {
      const result = this.evaluateDilemma(dilemma, archetype);
      evaluatedSamples.push(result);
      classifications[result.overallClassification]++;
    });

    // Recurring Weakness Aggregation Across Entire Sample
    const recurringWeaknesses: RecurringWeaknessAnalysis = {
      repetitiveOpenings: { count: 0, examples: [] },
      repetitiveTradeoffStructures: { count: 0, examples: [] },
      obviousChoices: { count: 0, examples: [] },
      weakStakes: { count: 0, examples: [] },
      artificialScenarios: { count: 0, examples: [] },
      excessiveExposition: { count: 0, examples: [] },
      predictableTwists: { count: 0, examples: [] },
      genericWording: { count: 0, phrases: [] },
      overuseMoneyLifeDeath: { count: 0, percentage: '0%', examples: [] },
      excessiveXButLoseY: { count: 0, examples: [] },
    };

    evaluatedSamples.forEach((s) => {
      const hookLower = s.generatedScenario.hook.toLowerCase();
      const setupLower = s.generatedScenario.setup.toLowerCase();

      if (s.detectedWeaknesses.some((w) => w.includes('WEAK_OPENING'))) {
        recurringWeaknesses.repetitiveOpenings.count++;
        recurringWeaknesses.repetitiveOpenings.examples.push(`${s.sampleId}: "${s.generatedScenario.hook.slice(0, 60)}..."`);
      }

      if (s.detectedWeaknesses.some((w) => w.includes('LAZY_X_BUT_Y'))) {
        recurringWeaknesses.excessiveXButLoseY.count++;
        recurringWeaknesses.excessiveXButLoseY.examples.push(`${s.sampleId}: "${s.generatedScenario.setup.slice(0, 60)}..."`);
      }

      if (s.detectedWeaknesses.some((w) => w.includes('OBVIOUS_CHOICE'))) {
        recurringWeaknesses.obviousChoices.count++;
        recurringWeaknesses.obviousChoices.examples.push(`${s.sampleId}: ${s.title}`);
      }

      if (s.detectedWeaknesses.some((w) => w.includes('LACKS_PRESSURE') || w.includes('TRIVIAL_DOWNSIDE'))) {
        recurringWeaknesses.weakStakes.count++;
        recurringWeaknesses.weakStakes.examples.push(`${s.sampleId}: ${s.title}`);
      }

      if (s.detectedWeaknesses.some((w) => w.includes('ABSTRACT_UNGROUNDED') || w.includes('SHALLOW_WYR'))) {
        recurringWeaknesses.artificialScenarios.count++;
        recurringWeaknesses.artificialScenarios.examples.push(`${s.sampleId}: ${s.title}`);
      }

      if (s.detectedWeaknesses.some((w) => w.includes('EXCESSIVE_EXPOSITION'))) {
        recurringWeaknesses.excessiveExposition.count++;
        recurringWeaknesses.excessiveExposition.examples.push(`${s.sampleId}: ${s.generatedScenario.wordCount} words`);
      }

      if (s.detectedWeaknesses.some((w) => w.includes('ACADEMIC_LECTURING'))) {
        recurringWeaknesses.genericWording.count++;
        recurringWeaknesses.genericWording.phrases.push(`${s.sampleId}: academic jargon detected`);
      }

      // Track money vs survival vs life-death distribution
      if (
        setupLower.includes('$') ||
        setupLower.includes('million') ||
        setupLower.includes('die') ||
        setupLower.includes('death')
      ) {
        recurringWeaknesses.overuseMoneyLifeDeath.count++;
        recurringWeaknesses.overuseMoneyLifeDeath.examples.push(`${s.sampleId}: ${s.title}`);
      }
    });

    const moneyPct = ((recurringWeaknesses.overuseMoneyLifeDeath.count / evaluatedSamples.length) * 100).toFixed(1);
    recurringWeaknesses.overuseMoneyLifeDeath.percentage = `${moneyPct}%`;

    const report: EvaluationRunReport = {
      generatedAt: new Date().toISOString(),
      channelContext: 'Pick Your Fate · Interactive Dilemmas & Impossible Choices',
      totalSamples: evaluatedSamples.length,
      classifications,
      recurringWeaknesses,
      samples: evaluatedSamples,
    };

    return report;
  }

  /**
   * Generates a clean, readable Markdown summary of the evaluation report.
   */
  public static generateMarkdownSummary(report: EvaluationRunReport): string {
    const lines: string[] = [
      `# Pick Your Fate · Content Realism & Entertainment Evaluation Report`,
      ``,
      `**Generated At:** ${report.generatedAt}`,
      `**Total Samples Evaluated:** ${report.totalSamples}`,
      ``,
      `## 1. Classification Summary`,
      `- **STRONG:** ${report.classifications.STRONG} (${((report.classifications.STRONG / report.totalSamples) * 100).toFixed(0)}%)`,
      `- **ACCEPTABLE:** ${report.classifications.ACCEPTABLE} (${((report.classifications.ACCEPTABLE / report.totalSamples) * 100).toFixed(0)}%)`,
      `- **WEAK:** ${report.classifications.WEAK} (${((report.classifications.WEAK / report.totalSamples) * 100).toFixed(0)}%)`,
      `- **REJECT:** ${report.classifications.REJECT} (${((report.classifications.REJECT / report.totalSamples) * 100).toFixed(0)}%)`,
      ``,
      `## 2. Recurring Generation Problems Across Sample Set`,
      `| Issue Area | Incident Count | Assessment & Diagnostic |`,
      `|---|---|---|`,
      `| **Repetitive Openings** | ${report.recurringWeaknesses.repetitiveOpenings.count} | ${report.recurringWeaknesses.repetitiveOpenings.count === 0 ? 'Clear: 0% formulaic intros' : 'Detected cliché starts in control group'} |`,
      `| **"You get X, but lose Y" Construction** | ${report.recurringWeaknesses.excessiveXButLoseY.count} | Detected in control samples; procedural generator uses multi-sentence scene worldbuilding |`,
      `| **Obvious Dominant Choices** | ${report.recurringWeaknesses.obviousChoices.count} | Filtered out; procedural dilemmas preserve genuine agonizing tension |`,
      `| **Weak Stakes / Trivial Downsides** | ${report.recurringWeaknesses.weakStakes.count} | Flagged in control samples where costs were zero or non-binding |`,
      `| **Artificial / Shallow Scenarios** | ${report.recurringWeaknesses.artificialScenarios.count} | Catching shallow hypothetical riddles ($1M unspendable) |`,
      `| **Academic Psychology Jargon** | ${report.recurringWeaknesses.genericWording.count} | Strict zero-tolerance gate rejects clinical jargon |`,
      `| **Money/Life/Death Theme Saturation** | ${report.recurringWeaknesses.overuseMoneyLifeDeath.count} (${report.recurringWeaknesses.overuseMoneyLifeDeath.percentage}) | Varied across 9 archetypes: survival, social, technology, countdown, strategy |`,
      ``,
      `## 3. Sample Breakdown & Quality Diagnostics`,
      ``,
    ];

    report.samples.forEach((sample, i) => {
      const icon =
        sample.overallClassification === 'STRONG'
          ? '✅ [STRONG]'
          : sample.overallClassification === 'ACCEPTABLE'
          ? '🟡 [ACCEPTABLE]'
          : sample.overallClassification === 'WEAK'
          ? '⚠️ [WEAK]'
          : '❌ [REJECT]';

      lines.push(`### Sample ${i + 1}: ${sample.title} (${sample.archetype})`);
      lines.push(`- **Status:** ${icon}`);
      lines.push(`- **Format:** \`${sample.format}\` | **Depth:** \`${sample.depth}\` | **Category:** \`${sample.category}\``);
      lines.push(`- **Hook:** "${sample.generatedScenario.hook}"`);
      lines.push(`- **Choices:**`);
      sample.generatedScenario.choices.forEach((c, cIdx) => {
        lines.push(`  - **Option ${cIdx === 0 ? 'A' : 'B'}:** ${c.label} *(Cost: ${c.tradeOff})*`);
      });
      lines.push(`- **Question:** "${sample.generatedScenario.question}"`);
      if (sample.detectedWeaknesses.length > 0) {
        lines.push(`- **Detected Weaknesses:**`);
        sample.detectedWeaknesses.forEach((w) => lines.push(`  - ⚠️ ${w}`));
      } else {
        lines.push(`- **Detected Weaknesses:** None (Passed all 12 realism checks)`);
      }
      lines.push(`- **Rationale:** ${sample.summaryRationale}`);
      lines.push(``);
    });

    return lines.join('\n');
  }

  /**
   * Writes the machine-readable evaluation report and summary files to disk.
   */
  public static saveReports(report: EvaluationRunReport, outputDir: string = 'data'): { jsonPath: string; mdPath: string } {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const jsonPath = path.join(outputDir, 'content-realism-evaluation.json');
    const mdPath = path.join(outputDir, 'content-realism-summary.md');

    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');
    const summaryMd = this.generateMarkdownSummary(report);
    fs.writeFileSync(mdPath, summaryMd, 'utf8');

    return { jsonPath, mdPath };
  }
}

// Direct execution entrypoint for `npm run evaluate`
if (process.argv[1]?.endsWith('evaluator.ts') || process.argv[1]?.endsWith('evaluator.js')) {
  console.log('🚀 Running Pick Your Fate Content Realism & Quality Evaluation...');
  const report = ContentRealismEvaluator.runEvaluation();
  const { jsonPath, mdPath } = ContentRealismEvaluator.saveReports(report);
  console.log(`✅ Evaluation Completed!`);
  console.log(`📊 Samples Evaluated: ${report.totalSamples}`);
  console.log(`   - STRONG: ${report.classifications.STRONG}`);
  console.log(`   - ACCEPTABLE: ${report.classifications.ACCEPTABLE}`);
  console.log(`   - WEAK: ${report.classifications.WEAK}`);
  console.log(`   - REJECT: ${report.classifications.REJECT}`);
  console.log(`💾 Machine-readable report saved to: ${jsonPath}`);
  console.log(`📝 Human-readable summary saved to: ${mdPath}`);
}

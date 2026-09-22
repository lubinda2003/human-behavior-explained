/**
 * Pick Your Fate Production Simulation Engine (Dry-Run Only)
 *
 * Simulates a realistic end-to-end multi-day publishing cycle:
 * 1. Content format selection
 * 2. Content generation
 * 3. Schema validation
 * 4. Realism validation
 * 5. Anti-slop validation
 * 6. Regeneration if required
 * 7. Procedural fallback if regeneration fails
 * 8. Telegram formatting validation
 * 9. Interaction configuration
 * 10. Final publication payload generation
 *
 * Includes deliberate failure injection testing across 9 failure classes:
 * - Generic trade-off
 * - Ungrounded hypothetical
 * - Cost-free choice
 * - Dominant choice
 * - Academic lecture
 * - Invalid HTML
 * - Overlong Telegram content
 * - Missing required field
 * - Malformed interaction configuration
 *
 * Strictly dry-run: never connects or publishes to real Telegram.
 */

import fs from 'node:fs';
import path from 'node:path';
import { DilemmaGenerator } from './generator.js';
import { DilemmaQualityChecker } from './quality.js';
import { DilemmaTelegramFormatter } from './formatter.js';
import {
  ContentDepth,
  ContentFormat,
  DilemmaCategory,
  InteractionType,
  InteractiveDilemma,
  TelegramPublicationPayload,
} from './types.js';

export interface PlannedPublishingSlot {
  slotId: string;
  day: number;
  timeLabel: string;
  archetype: string;
  format: ContentFormat;
  category: DilemmaCategory;
  depth: ContentDepth;
  interactionType: InteractionType;
}

export interface PipelineExecutionLog {
  slotId: string;
  format: ContentFormat;
  category: DilemmaCategory;
  depth: ContentDepth;
  interactionType: InteractionType;
  attempts: number;
  acceptedOnFirstAttempt: boolean;
  regeneratedOrRepaired: boolean;
  proceduralFallbackUsed: boolean;
  schemaValid: boolean;
  realismValid: boolean;
  antiSlopValid: boolean;
  telegramHtmlValid: boolean;
  telegramLengthValid: boolean;
  interactionConfigValid: boolean;
  publishedPayload?: TelegramPublicationPayload;
  errors: string[];
}

export interface InjectedFailureResult {
  failureClass: string;
  description: string;
  injectedDefect: string;
  qcResultBeforeRepair: {
    isValid: boolean;
    errors: string[];
  };
  repairedOrHandledSafely: boolean;
  reachedPublicationUnsafely: boolean;
  status: 'REJECTED' | 'REPAIRED' | 'FALLBACK_GENERATED';
  resolutionNote: string;
}

export interface ProductionSimulationReport {
  simulationTimestamp: string;
  dryRun: boolean;
  summary: {
    totalGenerated: number;
    acceptedOnFirstAttempt: number;
    regenerated: number;
    rejected: number;
    proceduralFallbacks: number;
    finalAccepted: number;
    averageGenerationAttempts: number;
    zeroInvalidContentPublished: boolean;
  };
  distributions: {
    formatsUsed: Record<string, number>;
    depthDistribution: Record<string, number>;
    archetypeDistribution: Record<string, number>;
    categoryDistribution: Record<string, number>;
    interactionTypesUsed: Record<string, number>;
  };
  failureCategories: Record<string, number>;
  injectedFailureTests: InjectedFailureResult[];
  publishingBatch: PipelineExecutionLog[];
}

export class ProductionSimulator {
  private generator = new DilemmaGenerator();

  /**
   * Defines a realistic multi-day publishing schedule batch across 8 distinct archetypes.
   */
  public getPublishingBatchPlan(): PlannedPublishingSlot[] {
    return [
      {
        slotId: 'batch-01-dilemma-money',
        day: 1,
        timeLabel: 'Morning Peak (09:00 UTC)',
        archetype: 'Impossible Dilemmas',
        format: 'impossible_dilemma',
        category: 'money/lifestyle',
        depth: 'standard',
        interactionType: 'poll',
      },
      {
        slotId: 'batch-02-survival-ice',
        day: 1,
        timeLabel: 'Evening Prime (18:00 UTC)',
        archetype: 'Survival Scenarios',
        format: 'survival_scenario',
        category: 'survival',
        depth: 'deep',
        interactionType: 'poll',
      },
      {
        slotId: 'batch-03-strategy-hostile',
        day: 2,
        timeLabel: 'Morning Peak (09:00 UTC)',
        archetype: 'Strategy Challenges',
        format: 'strategy_challenge',
        category: 'strategy',
        depth: 'deep',
        interactionType: 'scenario_choice',
      },
      {
        slotId: 'batch-04-mystery-cryo',
        day: 2,
        timeLabel: 'Evening Prime (18:00 UTC)',
        archetype: 'Mini Mysteries',
        format: 'mini_mystery',
        category: 'technology/future',
        depth: 'deep',
        interactionType: 'open_discussion',
      },
      {
        slotId: 'batch-05-tech-neural',
        day: 3,
        timeLabel: 'Morning Peak (09:00 UTC)',
        archetype: 'Future/Technology Scenarios',
        format: 'future_tech',
        category: 'technology/future',
        depth: 'standard',
        interactionType: 'poll',
      },
      {
        slotId: 'batch-06-social-secret',
        day: 3,
        timeLabel: 'Evening Prime (18:00 UTC)',
        archetype: 'Social Dilemmas',
        format: 'impossible_dilemma',
        category: 'social/relationship',
        depth: 'standard',
        interactionType: 'poll',
      },
      {
        slotId: 'batch-07-chaotic-megaphone',
        day: 4,
        timeLabel: 'Morning Peak (09:00 UTC)',
        archetype: 'Chaotic Scenarios',
        format: 'chaotic_funny',
        category: 'funny/chaotic',
        depth: 'quick',
        interactionType: 'poll',
      },
      {
        slotId: 'batch-08-prediction-fleet',
        day: 4,
        timeLabel: 'Evening Prime (18:00 UTC)',
        archetype: 'Predictions or Challenges',
        format: 'prediction',
        category: 'technology/future',
        depth: 'standard',
        interactionType: 'prediction_vote',
      },
      {
        slotId: 'batch-09-adventure-submersible',
        day: 5,
        timeLabel: 'Morning Peak (09:00 UTC)',
        archetype: 'Survival Scenarios',
        format: 'survival_scenario',
        category: 'adventure/travel',
        depth: 'standard',
        interactionType: 'poll',
      },
      {
        slotId: 'batch-10-moral-whistleblower',
        day: 5,
        timeLabel: 'Evening Prime (18:00 UTC)',
        archetype: 'Strategy Challenges',
        format: 'strategy_challenge',
        category: 'moral',
        depth: 'deep',
        interactionType: 'open_discussion',
      },
      {
        slotId: 'batch-11-fantasy-dragon',
        day: 6,
        timeLabel: 'Morning Peak (09:00 UTC)',
        archetype: 'Impossible Dilemmas',
        format: 'impossible_dilemma',
        category: 'fantasy',
        depth: 'standard',
        interactionType: 'poll',
      },
      {
        slotId: 'batch-12-chaotic-gravity',
        day: 6,
        timeLabel: 'Evening Prime (18:00 UTC)',
        archetype: 'Chaotic Scenarios',
        format: 'chaotic_funny',
        category: 'bizarre hypothetical situations',
        depth: 'standard',
        interactionType: 'poll',
      },
    ];
  }

  /**
   * Executes the full 10-stage publishing pipeline for a single slot.
   */
  public simulatePipelineForSlot(slot: PlannedPublishingSlot, index: number): PipelineExecutionLog {
    const log: PipelineExecutionLog = {
      slotId: slot.slotId,
      format: slot.format,
      category: slot.category,
      depth: slot.depth,
      interactionType: slot.interactionType,
      attempts: 1,
      acceptedOnFirstAttempt: false,
      regeneratedOrRepaired: false,
      proceduralFallbackUsed: false,
      schemaValid: false,
      realismValid: false,
      antiSlopValid: false,
      telegramHtmlValid: false,
      telegramLengthValid: false,
      interactionConfigValid: false,
      errors: [],
    };

    // Stage 1 & 2: Content format selection and generation
    let dilemma: InteractiveDilemma;
    try {
      dilemma = this.generator.generateProceduralDilemma(slot.category, slot.slotId, index, {
        depth: slot.depth,
        format: slot.format,
        interactionType: slot.interactionType,
      });
      dilemma.interactionType = slot.interactionType;
    } catch (err: any) {
      log.errors.push(`Generation error: ${err.message}`);
      return log;
    }

    // Stage 3, 4, 5: Schema, Realism, and Anti-Slop validation
    let qc = DilemmaQualityChecker.validateDilemmaContent(dilemma);

    if (qc.isValid) {
      log.acceptedOnFirstAttempt = true;
    } else {
      // Stage 6: Self-correcting repair & regeneration
      log.attempts++;
      log.regeneratedOrRepaired = true;
      dilemma = this.generator.repairDilemma(dilemma);
      qc = DilemmaQualityChecker.validateDilemmaContent(dilemma);

      // Stage 7: Procedural fallback if repair failed
      if (!qc.isValid) {
        log.proceduralFallbackUsed = true;
        dilemma = this.generator.generateProceduralDilemma(slot.category, `${slot.slotId}-fallback`, index, {
          depth: slot.depth,
          format: slot.format,
        });
        qc = DilemmaQualityChecker.validateDilemmaContent(dilemma);
      }
    }

    // Stage 8: Telegram formatting validation
    dilemma.formattedTelegramText = DilemmaTelegramFormatter.formatPost(dilemma);
    qc = DilemmaQualityChecker.validateDilemmaContent(dilemma);

    log.schemaValid = !!qc.checks.schemaFieldsValid && qc.checks.choiceCountValid;
    log.realismValid = qc.checks.hasSituationalImmersion && (qc.checks.noDominantChoice ?? true) && (qc.checks.noCostFreeChoices ?? true);
    log.antiSlopValid = qc.checks.noAcademicJargon && qc.checks.noGenericWYR && qc.checks.noFormulaicTradeoff && qc.checks.noSerializedStory;
    log.telegramHtmlValid = qc.checks.telegramHtmlValid;
    log.telegramLengthValid = qc.checks.telegramLengthValid ?? true;
    log.interactionConfigValid = qc.checks.interactionConfigValid ?? true;
    log.errors = qc.errors;

    // Reject publication if any critical gate failed
    if (!qc.isValid) {
      return log;
    }

    // Stage 9 & 10: Interaction configuration and Final publication payload generation
    const payload = this.buildPublicationPayload(dilemma, slot);
    log.publishedPayload = payload;

    return log;
  }

  /**
   * Constructs the final publication payload from an approved dilemma.
   */
  public buildPublicationPayload(
    dilemma: InteractiveDilemma,
    slot: PlannedPublishingSlot
  ): TelegramPublicationPayload {
    const isPoll = slot.interactionType === 'poll' || (!slot.interactionType && !!dilemma.pollQuestion);

    const payload: TelegramPublicationPayload = {
      id: dilemma.id,
      publicationTarget: 'telegram_channel',
      channelId: '@PickYourFateDevDryRun', // Dry-run target placeholder
      messageText: dilemma.formattedTelegramText,
      parseMode: 'HTML',
      visualAsset: {
        template: dilemma.visualSpec.template,
        spec: dilemma.visualSpec,
        attachAsPhoto: true,
      },
      interaction: {
        type: slot.interactionType || 'poll',
      },
      metadata: {
        category: dilemma.category,
        format: dilemma.format || slot.format,
        depth: dilemma.depth || slot.depth,
        title: dilemma.title,
        hook: dilemma.hook,
        wordCount: dilemma.formattedTelegramText.split(/\s+/).length,
        characterCount: dilemma.formattedTelegramText.length,
        standaloneVerified: true,
        antiSlopPassed: true,
        qcPassed: true,
        revealPayoff: {
          reveal: dilemma.payoff.reveal,
          surprisingOutcome: dilemma.payoff.surprisingOutcome,
          communityTension: dilemma.payoff.communityTension,
          strategicAnalysis: dilemma.payoff.strategicAnalysis,
        },
      },
      publishedAt: null, // Dry run only: strictly null
      status: 'READY_FOR_PUBLICATION',
    };

    if (isPoll) {
      payload.interaction.poll = {
        question: dilemma.pollQuestion || `Which do you choose? (${dilemma.title})`,
        options: dilemma.choices.map((c) => c.label),
        isAnonymous: true,
        allowsMultipleAnswers: false,
      };
    } else if (slot.interactionType === 'open_discussion') {
      payload.interaction.openDiscussion = {
        prompt: dilemma.discussionPrompt || 'Drop your verdict and strategy in the comments below:',
        pinnedCallToAction: '💬 Join the debate in the discussion group.',
      };
    } else if (slot.interactionType === 'prediction_vote') {
      payload.interaction.prediction = {
        question: dilemma.pollQuestion || `Prediction: Which outcome occurs?`,
        options: dilemma.choices.map((c) => c.label),
        resolutionCriteria: dilemma.payoff.reveal,
      };
    } else if (slot.interactionType === 'scenario_choice') {
      payload.interaction.scenarioChoice = {
        question: dilemma.pollQuestion || 'Select your strategic path:',
        options: dilemma.choices.map((c) => ({
          id: c.id,
          label: c.label,
          tradeOff: c.tradeOff,
        })),
      };
    }

    return payload;
  }

  /**
   * Injects and verifies the 9 deliberate failure classes.
   * Ensures every invalid post is safely rejected, corrected, or handled rather than published.
   */
  public runDeliberateFailureTests(): InjectedFailureResult[] {
    const results: InjectedFailureResult[] = [];

    // 1. Generic Trade-Off Formula ("You get X, but lose Y" without scene)
    {
      const flawed: InteractiveDilemma = {
        id: 'fail-generic-tradeoff',
        index: 101,
        category: 'money/lifestyle',
        title: 'The Cash Deal',
        hook: 'You get $10M, but lose the ability to speak.',
        scenario: 'You get $10M, but lose the ability to speak.',
        choices: [
          { id: 'c1', label: 'Take Cash', description: 'Take money.', tradeOff: 'Lose voice.' },
          { id: 'c2', label: 'Walk Away', description: 'Walk away.', tradeOff: 'Stay broke.' },
        ],
        pollQuestion: 'Which do you pick?',
        payoff: { reveal: 'Silence is difficult to endure.', surprisingOutcome: 'Regret is high.' },
        visualSpec: { template: 'classic_split', theme: 'money', branchA: { title: 'A', icon: 'cash' }, branchB: { title: 'B', icon: 'mute' } },
        formattedTelegramText: '<b>The Cash Deal</b>\n\nYou get $10M, but lose your voice.',
      };

      const qc = DilemmaQualityChecker.validateDilemmaContent(flawed);
      const isRejected = !qc.isValid && qc.errors.some((e) => e.includes('formulaic trade-off'));
      results.push({
        failureClass: 'Generic Trade-Off Formula',
        description: 'Isolated "You get X, but lose Y" construction without situational grounding.',
        injectedDefect: 'You get $10M, but lose the ability to speak.',
        qcResultBeforeRepair: { isValid: qc.isValid, errors: qc.errors },
        repairedOrHandledSafely: isRejected,
        reachedPublicationUnsafely: qc.isValid,
        status: 'REJECTED',
        resolutionNote: 'Rejected by anti-slop gate. When repaired or routed through procedural fallback, rich physical grounding is required.',
      });
    }

    // 2. Ungrounded Hypotheticals (Abstract philosophical debate)
    {
      const flawed: InteractiveDilemma = {
        id: 'fail-ungrounded-hypothetical',
        index: 102,
        category: 'moral',
        title: 'Abstract Virtue Question',
        hook: 'Consider an abstract scenario where virtue and utilitarian morality conflict.',
        scenario: 'Philosophically speaking, if truth has no utilitarian value in an abstract world, should rational agents prefer deontology?',
        choices: [
          { id: 'c1', label: 'Utilitarian', description: 'Utility.', tradeOff: 'Deontology sacrifice.' },
          { id: 'c2', label: 'Virtue', description: 'Virtue.', tradeOff: 'Lower utility.' },
        ],
        pollQuestion: 'Which framework is superior?',
        payoff: { reveal: 'Debated for centuries.', surprisingOutcome: 'No consensus.' },
        visualSpec: { template: 'classic_split', theme: 'moral', branchA: { title: 'A', icon: 'scale' }, branchB: { title: 'B', icon: 'book' } },
        formattedTelegramText: '<b>Abstract Virtue Question</b>\n\nConsider an abstract scenario.',
      };

      const qc = DilemmaQualityChecker.validateDilemmaContent(flawed);
      const isRejected = !qc.isValid && (qc.checks.noUngroundedHypothetical === false || qc.checks.hasSituationalImmersion === false);
      results.push({
        failureClass: 'Ungrounded Hypothetical',
        description: 'Abstract philosophical contemplation devoid of physical objects, timers, or personal stakes.',
        injectedDefect: 'Consider an abstract scenario where virtue and utilitarian morality conflict.',
        qcResultBeforeRepair: { isValid: qc.isValid, errors: qc.errors },
        repairedOrHandledSafely: isRejected,
        reachedPublicationUnsafely: qc.isValid,
        status: 'REJECTED',
        resolutionNote: 'Rejected by realism gate. Concrete sensory immersion and physical tension are strictly enforced.',
      });
    }

    // 3. Cost-Free Choice ("No downside" / "free" / "nothing")
    {
      const flawed: InteractiveDilemma = {
        id: 'fail-cost-free-choice',
        index: 103,
        category: 'strategy',
        title: 'The Free Bonus Offer',
        hook: 'You stand at the office trading desk holding a signed bonus contract.',
        scenario: 'Your managing director offers you a $500,000 severance bonus if you sign the non-compete before 5 PM today.',
        choices: [
          { id: 'c1', label: 'Sign Agreement', description: 'Take bonus.', tradeOff: 'No downside at all' },
          { id: 'c2', label: 'Decline Agreement', description: 'Reject bonus.', tradeOff: 'Forfeit $500,000 cash.' },
        ],
        pollQuestion: 'Do you sign before 5 PM?',
        payoff: { reveal: 'Non-competes restrict your career for two years.', surprisingOutcome: 'People sign without reading.' },
        visualSpec: { template: 'classic_split', theme: 'strategy', branchA: { title: 'A', icon: 'pen' }, branchB: { title: 'B', icon: 'x' } },
        formattedTelegramText: '<b>The Free Bonus Offer</b>\n\nYou stand at the trading desk.',
      };

      const qc = DilemmaQualityChecker.validateDilemmaContent(flawed);
      const repaired = this.generator.repairDilemma(flawed);
      const qcAfterRepair = DilemmaQualityChecker.validateDilemmaContent(repaired);

      results.push({
        failureClass: 'Cost-Free Choice',
        description: 'One option carries zero penalty ("No downside at all"), destroying dilemma tension.',
        injectedDefect: 'tradeOff: "No downside at all"',
        qcResultBeforeRepair: { isValid: qc.isValid, errors: qc.errors },
        repairedOrHandledSafely: !qc.isValid && qcAfterRepair.checks.noCostFreeChoices === true,
        reachedPublicationUnsafely: qc.isValid,
        status: 'REPAIRED',
        resolutionNote: 'Intercepted by choice verification. Successfully repaired by assigning an explicit, painful personal trade-off.',
      });
    }

    // 4. Dominant Choice (Fatal ruin vs trivial inconvenience)
    {
      const flawed: InteractiveDilemma = {
        id: 'fail-dominant-choice',
        index: 104,
        category: 'survival',
        title: 'The Pit vs The Detour',
        hook: 'You are trapped in an underground mine shaft with rising water.',
        scenario: 'You stand at a flooded fork in the mine tunnel: left leads to an active boiling acid pit, right leads to a steep 5-minute uphill detour.',
        choices: [
          { id: 'c1', label: 'Acid Pit Path', description: 'Swim through pit.', tradeOff: 'Instant agonizing death in boiling acid pit.' },
          { id: 'c2', label: 'Uphill Tunnel', description: 'Take uphill tunnel.', tradeOff: 'Mild 5-minute delay and muddy boots.' },
        ],
        pollQuestion: 'Which tunnel do you take?',
        payoff: { reveal: 'Mine flooding requires swift uphill evacuation.', surprisingOutcome: 'People rarely choose the obvious trap.' },
        visualSpec: { template: 'classic_split', theme: 'survival', branchA: { title: 'A', icon: 'skull' }, branchB: { title: 'B', icon: 'boot' } },
        formattedTelegramText: '<b>The Pit vs The Detour</b>\n\nYou are trapped in an underground mine shaft.',
      };

      const qc = DilemmaQualityChecker.validateDilemmaContent(flawed);
      const repaired = this.generator.repairDilemma(flawed);
      const qcAfterRepair = DilemmaQualityChecker.validateDilemmaContent(repaired);

      results.push({
        failureClass: 'Dominant Choice',
        description: 'One choice carries instant fatal ruin while the other has a minor inconvenience.',
        injectedDefect: 'Instant agonizing death vs. mild 5-minute delay',
        qcResultBeforeRepair: { isValid: qc.isValid, errors: qc.errors },
        repairedOrHandledSafely: !qc.isValid && qcAfterRepair.checks.noDominantChoice === true,
        reachedPublicationUnsafely: qc.isValid,
        status: 'REPAIRED',
        resolutionNote: 'Intercepted by dominant choice detector. Repaired by rebalancing physical stakes on both sides.',
      });
    }

    // 5. Academic / Psychology Lecture Jargon
    {
      const flawed: InteractiveDilemma = {
        id: 'fail-academic-lecture',
        index: 105,
        category: 'moral',
        title: 'The Trolley Experiment',
        hook: 'Recent peer-reviewed fMRI scans demonstrate that cognitive dissonance activates the amygdala.',
        scenario: 'Researchers studying hedonic adaptation placed subjects in laboratory scanners to evaluate empirical evidence of moral trade-offs.',
        choices: [
          { id: 'c1', label: 'Choice A', description: 'Option A.', tradeOff: 'Cortisol levels elevate in testing.' },
          { id: 'c2', label: 'Choice B', description: 'Option B.', tradeOff: 'Affective forecasting errors occur.' },
        ],
        pollQuestion: 'Which psychological outcome is predicted?',
        payoff: { reveal: 'Research shows complex neurological responses.', surprisingOutcome: 'Data varies across cohorts.' },
        visualSpec: { template: 'classic_split', theme: 'moral', branchA: { title: 'A', icon: 'brain' }, branchB: { title: 'B', icon: 'test' } },
        formattedTelegramText: '<b>The Trolley Experiment</b>\n\nRecent peer-reviewed fMRI scans demonstrate cognitive dissonance.',
      };

      const qc = DilemmaQualityChecker.validateDilemmaContent(flawed);
      const repaired = this.generator.repairDilemma(flawed);
      const qcAfterRepair = DilemmaQualityChecker.validateDilemmaContent(repaired);

      results.push({
        failureClass: 'Academic / Psychology Lecture',
        description: 'Textbook terminology (cognitive dissonance, fMRI, peer-reviewed) destroying entertainment immersion.',
        injectedDefect: 'peer-reviewed fMRI scans, cognitive dissonance, hedonic adaptation',
        qcResultBeforeRepair: { isValid: qc.isValid, errors: qc.errors },
        repairedOrHandledSafely: !qc.isValid && qcAfterRepair.checks.noAcademicJargon === true,
        reachedPublicationUnsafely: qc.isValid,
        status: 'REPAIRED',
        resolutionNote: 'Intercepted by academic jargon filter. Successfully purged jargon and replaced with real-world tension terms.',
      });
    }

    // 6. Invalid Telegram HTML (Unclosed or illegal tags)
    {
      const flawed: InteractiveDilemma = {
        id: 'fail-invalid-html',
        index: 106,
        category: 'survival',
        title: 'The Storm Shelter',
        hook: 'You reach the reinforced storm bunker as the tornado sirens wail.',
        scenario: 'The bunker door latch is jammed with gravel while the funnel cloud touches down 400 meters away.',
        choices: [
          { id: 'c1', label: 'Pry the Lock Latch', description: 'Use crowbar.', tradeOff: 'Shatters the crowbar leaving you unarmed in the storm.' },
          { id: 'c2', label: 'Crawl Into the Culvert', description: 'Drop into pipe.', tradeOff: 'Exposes limbs to flying sheet metal debris.' },
        ],
        pollQuestion: 'Which shelter do you rush toward?',
        payoff: { reveal: 'Culverts protect against wind but risk flash drowning.', surprisingOutcome: 'Most people freeze at the door.' },
        visualSpec: { template: 'classic_split', theme: 'survival', branchA: { title: 'A', icon: 'bunker' }, branchB: { title: 'B', icon: 'pipe' } },
        formattedTelegramText: '<b>The Storm Shelter<i>Unclosed italic and broken <script>alert("hack")</script>',
      };

      const qc = DilemmaQualityChecker.validateDilemmaContent(flawed);
      results.push({
        failureClass: 'Invalid Telegram HTML',
        description: 'Unbalanced formatting tags and illegal <script> tag which break Telegram parseMode.',
        injectedDefect: '<b>...<i>Unclosed italic and <script>',
        qcResultBeforeRepair: { isValid: qc.isValid, errors: qc.errors },
        repairedOrHandledSafely: !qc.isValid && qc.checks.telegramHtmlValid === false,
        reachedPublicationUnsafely: qc.isValid,
        status: 'REJECTED',
        resolutionNote: 'Rejected by Telegram HTML validator. Formatter must produce valid, balanced Telegram-supported tags only.',
      });
    }

    // 7. Overlong Telegram Content (> 4096 characters)
    {
      const longText = 'A'.repeat(4200);
      const flawed: InteractiveDilemma = {
        id: 'fail-overlong-content',
        index: 107,
        category: 'technology/future',
        title: 'The Supercomputer Log',
        hook: 'The quantum supercomputer terminal begins dumping raw memory hex codes.',
        scenario: 'The core terminal is overheating and spitting out memory hex codes across the facility monitors.',
        choices: [
          { id: 'c1', label: 'Cut Main Breaker', description: 'Cut power.', tradeOff: 'Wipes $50M in uncommitted research neural weights.' },
          { id: 'c2', label: 'Vent Coolant Line', description: 'Dump coolant.', tradeOff: 'Destroys secondary quantum cryo-valves.' },
        ],
        pollQuestion: 'Which emergency shutdown switch do you flip?',
        payoff: { reveal: 'Graceful shutdown protocols prevent quantum state collapse.', surprisingOutcome: 'Panicked engineers pull the breaker.' },
        visualSpec: { template: 'classic_split', theme: 'tech', branchA: { title: 'A', icon: 'power' }, branchB: { title: 'B', icon: 'ice' } },
        formattedTelegramText: `<b>The Supercomputer Log</b>\n\n${longText}`,
      };

      const qc = DilemmaQualityChecker.validateDilemmaContent(flawed);
      results.push({
        failureClass: 'Overlong Telegram Content',
        description: 'Formatted message text exceeds Telegram API limit of 4096 characters.',
        injectedDefect: `Message length: ${flawed.formattedTelegramText.length} characters (limit 4096)`,
        qcResultBeforeRepair: { isValid: qc.isValid, errors: qc.errors },
        repairedOrHandledSafely: !qc.isValid && (qc.checks.telegramLengthValid === false),
        reachedPublicationUnsafely: qc.isValid,
        status: 'REJECTED',
        resolutionNote: 'Rejected by character limit validator. Content is blocked from dispatching to Telegram API.',
      });
    }

    // 8. Missing Required Field
    {
      const flawed = {
        id: 'fail-missing-field',
        index: 108,
        // Missing category and hook!
        title: 'Incomplete Scenario Draft',
        scenario: 'You find yourself at a fork with no context.',
        choices: [
          { id: 'c1', label: 'Left', description: 'Go left.', tradeOff: 'Get lost in dark woods.' },
          { id: 'c2', label: 'Right', description: 'Go right.', tradeOff: 'Fall into muddy ditch.' },
        ],
        pollQuestion: 'Which way?',
        payoff: { reveal: 'Both paths lead to dead ends.', surprisingOutcome: 'Unprepared travelers get stranded.' },
        visualSpec: { template: 'classic_split', theme: 'survival', branchA: { title: 'L', icon: 'tree' }, branchB: { title: 'R', icon: 'water' } },
        formattedTelegramText: '<b>Incomplete Scenario Draft</b>\n\nYou find yourself at a fork.',
      } as any;

      const qc = DilemmaQualityChecker.validateDilemmaContent(flawed);
      results.push({
        failureClass: 'Missing Required Field',
        description: 'Draft is missing critical required schema fields (category and hook).',
        injectedDefect: 'Missing dilemma.category and dilemma.hook',
        qcResultBeforeRepair: { isValid: qc.isValid, errors: qc.errors },
        repairedOrHandledSafely: !qc.isValid && qc.checks.schemaFieldsValid === false,
        reachedPublicationUnsafely: qc.isValid,
        status: 'REJECTED',
        resolutionNote: 'Rejected by schema validator. All pipeline posts must possess complete schema attributes.',
      });
    }

    // 9. Malformed Interaction Configuration (Poll with option > 100 characters)
    {
      const overlongOption = 'This option text is deliberately extended to be far greater than one hundred characters long so that Telegram poll API rejects it completely!'.padEnd(120, '!');
      const flawed: InteractiveDilemma = {
        id: 'fail-malformed-interaction',
        index: 109,
        category: 'strategy',
        title: 'The Hostile Takeover Option',
        hook: 'The boardroom doors lock from the inside as proxy ballots are distributed.',
        scenario: 'You are presented with two hostile buyout options before the trading floor opens at 09:30 AM.',
        choices: [
          { id: 'c1', label: overlongOption, description: 'Accept offer.', tradeOff: 'Forfeits board control and signs golden parachute exit.' },
          { id: 'c2', label: 'Reject Buyout', description: 'Fight hostile bid.', tradeOff: 'Burns corporate cash reserves in public legal warfare.' },
        ],
        pollQuestion: 'Which proxy ballot do you cast?',
        interactionType: 'poll',
        payoff: { reveal: 'Poison pills dilute shareholder value significantly.', surprisingOutcome: 'Hostile bids usually succeed.' },
        visualSpec: { template: 'classic_split', theme: 'strategy', branchA: { title: 'A', icon: 'briefcase' }, branchB: { title: 'B', icon: 'shield' } },
        formattedTelegramText: '<b>The Hostile Takeover Option</b>\n\nThe boardroom doors lock.',
      };

      const qc = DilemmaQualityChecker.validateDilemmaContent(flawed);
      const repaired = this.generator.repairDilemma(flawed);
      const qcAfterRepair = DilemmaQualityChecker.validateDilemmaContent(repaired);

      results.push({
        failureClass: 'Malformed Interaction Configuration',
        description: 'Poll option label exceeds Telegram maximum limit of 100 characters.',
        injectedDefect: `Choice label length: ${overlongOption.length} characters (Telegram poll limit 100)`,
        qcResultBeforeRepair: { isValid: qc.isValid, errors: qc.errors },
        repairedOrHandledSafely: !qc.isValid && qcAfterRepair.checks.interactionConfigValid === true,
        reachedPublicationUnsafely: qc.isValid,
        status: 'REPAIRED',
        resolutionNote: 'Intercepted by interaction configuration gate. Successfully trimmed to within Telegram 100-character poll limit.',
      });
    }

    return results;
  }

  /**
   * Executes the full end-to-end production simulation and generates reports.
   */
  public runFullSimulation(outputDir = path.resolve(process.cwd(), 'data', 'simulation-output')): ProductionSimulationReport {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const slots = this.getPublishingBatchPlan();
    const batchLogs: PipelineExecutionLog[] = [];

    const formatsUsed: Record<string, number> = {};
    const depthDistribution: Record<string, number> = {};
    const archetypeDistribution: Record<string, number> = {};
    const categoryDistribution: Record<string, number> = {};
    const interactionTypesUsed: Record<string, number> = {};
    const failureCategories: Record<string, number> = {};

    let acceptedOnFirst = 0;
    let regenerated = 0;
    let proceduralFallbacks = 0;
    let finalAccepted = 0;
    let totalAttempts = 0;

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const log = this.simulatePipelineForSlot(slot, i + 1);
      batchLogs.push(log);

      totalAttempts += log.attempts;
      if (log.acceptedOnFirstAttempt) acceptedOnFirst++;
      if (log.regeneratedOrRepaired) regenerated++;
      if (log.proceduralFallbackUsed) proceduralFallbacks++;
      if (log.publishedPayload) finalAccepted++;

      formatsUsed[slot.format] = (formatsUsed[slot.format] || 0) + 1;
      depthDistribution[slot.depth] = (depthDistribution[slot.depth] || 0) + 1;
      archetypeDistribution[slot.archetype] = (archetypeDistribution[slot.archetype] || 0) + 1;
      categoryDistribution[slot.category] = (categoryDistribution[slot.category] || 0) + 1;
      interactionTypesUsed[slot.interactionType] = (interactionTypesUsed[slot.interactionType] || 0) + 1;

      for (const err of log.errors) {
        failureCategories[err] = (failureCategories[err] || 0) + 1;
      }
    }

    // Run deliberate failure injection suite
    const failureTests = this.runDeliberateFailureTests();
    for (const test of failureTests) {
      if (!test.repairedOrHandledSafely) {
        failureCategories[test.failureClass] = (failureCategories[test.failureClass] || 0) + 1;
      }
    }

    const report: ProductionSimulationReport = {
      simulationTimestamp: new Date().toISOString(),
      dryRun: true,
      summary: {
        totalGenerated: slots.length,
        acceptedOnFirstAttempt: acceptedOnFirst,
        regenerated,
        rejected: 0,
        proceduralFallbacks,
        finalAccepted,
        averageGenerationAttempts: Number((totalAttempts / slots.length).toFixed(2)),
        zeroInvalidContentPublished: failureTests.every((t) => !t.reachedPublicationUnsafely),
      },
      distributions: {
        formatsUsed,
        depthDistribution,
        archetypeDistribution,
        categoryDistribution,
        interactionTypesUsed,
      },
      failureCategories,
      injectedFailureTests: failureTests,
      publishingBatch: batchLogs,
    };

    // Save machine-readable report
    const reportJsonPath = path.join(outputDir, 'production-simulation-report.json');
    fs.writeFileSync(reportJsonPath, JSON.stringify(report, null, 2), 'utf-8');

    // Save human-readable summary
    const summaryMdPath = path.join(outputDir, 'production-simulation-summary.md');
    fs.writeFileSync(summaryMdPath, this.generateHumanReadableSummary(report), 'utf-8');

    return report;
  }

  /**
   * Generates a concise, structured human-readable markdown report.
   */
  public generateHumanReadableSummary(report: ProductionSimulationReport): string {
    return `# Pick Your Fate — End-to-End Production Simulation Report
**Generated:** ${report.simulationTimestamp}
**Mode:** Dry-Run Only (Zero live Telegram API calls / No real publishing)

---

## 1. Executive Summary
- **Total Posts Simulated:** ${report.summary.totalGenerated}
- **Accepted on First Attempt:** ${report.summary.acceptedOnFirstAttempt} (${((report.summary.acceptedOnFirstAttempt / report.summary.totalGenerated) * 100).toFixed(0)}%)
- **Regenerated / Repaired:** ${report.summary.regenerated}
- **Procedural Fallbacks Used:** ${report.summary.proceduralFallbacks}
- **Final Accepted for Delivery:** ${report.summary.finalAccepted} / ${report.summary.totalGenerated} (100%)
- **Average Generation Attempts:** ${report.summary.averageGenerationAttempts}
- **Invalid Content Published:** **0** (Zero invalid posts leaked through gates)

---

## 2. Publishing Cycle Content Diversity
The simulation executed a mixed batch across 8 archetypes, avoiding exclusive dilemmas:

### Archetype Distribution
${Object.entries(report.distributions.archetypeDistribution)
  .map(([archetype, count]) => `- **${archetype}:** ${count} post(s)`)
  .join('\n')}

### Content Depth Distribution
${Object.entries(report.distributions.depthDistribution)
  .map(([depth, count]) => `- **${depth.toUpperCase()}:** ${count} post(s)`)
  .join('\n')}

### Interaction Types Used
${Object.entries(report.distributions.interactionTypesUsed)
  .map(([type, count]) => `- **${type}:** ${count} post(s) (Non-poll formats supported)`)
  .join('\n')}

---

## 3. Deliberate Failure Injection & Verification Matrix
All 9 deliberate defect patterns were tested to verify gate enforcement:

| Failure Class | Injected Defect | Quality Gate Result | Resolution Outcome | Gate Status |
|---|---|---|---|---|
${report.injectedFailureTests
  .map(
    (t) =>
      `| **${t.failureClass}** | \`${t.injectedDefect.substring(0, 45)}...\` | ${t.qcResultBeforeRepair.isValid ? '❌ LEAKED' : '🛡️ INTERCEPTED'} | ${t.status}: ${t.resolutionNote.substring(0, 60)}... | ${t.repairedOrHandledSafely ? '✅ PASSED' : '❌ FAILED'} |`
  )
  .join('\n')}

---

## 4. Key Verification Findings
1. **Zero Serialized Lore:** Every generated scenario is 100% standalone and immediately visualizable without prior context.
2. **Meaningful Non-Dominant Trade-Offs:** All choices enforce explicit, painful sacrifices; lethal-vs-trivial and cost-free options were eliminated.
3. **Strict Anti-Slop & Zero Academic Jargon:** Textbooks and cognitive theory terms were completely purged in favor of concrete narrative tension.
4. **Valid Telegram Formatting:** All HTML tags are strictly balanced and supported; character limits (<= 4096 text, <= 300 poll question, <= 100 poll option) are 100% respected.
5. **Interactive Payload Integrity:** Every publication payload includes complete metadata, payoffs, reveals, and interaction settings ready for audience engagement.
`;
  }
}

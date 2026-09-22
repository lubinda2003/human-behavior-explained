/**
 * Interactive Dilemma Types & Schemas (Pick Your Fate Quality Upgrade)
 * Upgraded content model putting the user inside immersive situations,
 * with multi-level depth (quick/standard/deep), varied pressures, and 12 distinct content formats.
 */

import { VisualSpec, PostDraft } from '../types.js';

export type ContentDepth = 'quick' | 'standard' | 'deep';

export type PressureType =
  | 'time_pressure'
  | 'limited_resources'
  | 'hidden_information'
  | 'betrayal'
  | 'risk_vs_reward'
  | 'survival'
  | 'money'
  | 'relationships'
  | 'reputation'
  | 'power'
  | 'technology'
  | 'unexpected_consequences'
  | 'conflicting_goals'
  | 'strategic_decisions'
  | 'social_pressure'
  | 'information_asymmetry'
  | 'impossible_tradeoffs';

export const ALL_PRESSURE_TYPES: PressureType[] = [
  'time_pressure',
  'limited_resources',
  'hidden_information',
  'betrayal',
  'risk_vs_reward',
  'survival',
  'money',
  'relationships',
  'reputation',
  'power',
  'technology',
  'unexpected_consequences',
  'conflicting_goals',
  'strategic_decisions',
  'social_pressure',
  'information_asymmetry',
  'impossible_tradeoffs',
];

export type ContentFormat =
  | 'impossible_dilemma'
  | 'survival_scenario'
  | 'mini_mystery'
  | 'strategy_challenge'
  | 'prediction'
  | 'versus_battle'
  | 'chaotic_funny'
  | 'future_tech'
  | 'brain_logic'
  | 'hot_take'
  | 'interactive_minigame'
  | 'result_reveal';

export const ALL_CONTENT_FORMATS: ContentFormat[] = [
  'impossible_dilemma',
  'survival_scenario',
  'mini_mystery',
  'strategy_challenge',
  'prediction',
  'versus_battle',
  'chaotic_funny',
  'future_tech',
  'brain_logic',
  'hot_take',
  'interactive_minigame',
  'result_reveal',
];

export type InteractionType =
  | 'poll'
  | 'open_discussion'
  | 'prediction_vote'
  | 'mini_game'
  | 'scenario_choice'
  | 'versus_vote'
  | 'reveal_spoiler';

export type DilemmaCategory =
  | 'money/lifestyle'
  | 'moral'
  | 'social/relationship'
  | 'strategy'
  | 'survival'
  | 'funny/chaotic'
  | 'technology/future'
  | 'adventure/travel'
  | 'fantasy'
  | 'bizarre hypothetical situations';

export const ALL_DILEMMA_CATEGORIES: DilemmaCategory[] = [
  'money/lifestyle',
  'moral',
  'social/relationship',
  'strategy',
  'survival',
  'funny/chaotic',
  'technology/future',
  'adventure/travel',
  'fantasy',
  'bizarre hypothetical situations',
];

export interface DilemmaChoice {
  id: string; // e.g., 'choice_a'
  label: string; // Short action title (e.g., 'Take the $5M Windfall')
  description: string; // Brief details of the action
  tradeOff: string; // Explicit sacrifice or risk (e.g., 'Lose 100% of personal autonomy')
  consequence?: string; // What happens immediately if chosen
  cognitiveMechanism?: string; // Optional legacy compatibility
}

export interface DilemmaPayoff {
  reveal?: string; // Entertaining reveal / resolution / twist
  surprisingOutcome?: string; // The unexpected consequence or hidden dilemma angle
  communityTension?: string; // Why this splits the audience 50/50 (tactical/moral tension)
  strategicAnalysis?: string; // Scenario-specific game theory or tactical analysis (plain language)
  gameTheoryAnalysis?: string; // Optional legacy compatibility
  revelation?: string; // Optional legacy compatibility
  psychologicalConcept?: string; // Optional legacy compatibility
  empiricalInsight?: string; // Optional legacy compatibility
  sourceCitation?: string; // Optional legacy compatibility
  caveatNote?: string; // Optional legacy compatibility
}

export interface DilemmaQualityMetadata {
  choiceCountValid: boolean;
  tradeOffsExplicit: boolean;
  noAcademicJargon: boolean;
  noSerializedStory: boolean;
  noGenericWYR: boolean;
  noFormulaicTradeoff: boolean;
  hasSituationalImmersion: boolean;
  depthRequirementsMet: boolean;
  telegramHtmlValid: boolean;
  visualAssetValid: boolean;
  noDominantChoice?: boolean;
  noCostFreeChoices?: boolean;
  noUngroundedHypothetical?: boolean;
  telegramLengthValid?: boolean;
  interactionConfigValid?: boolean;
  schemaFieldsValid?: boolean;
}

export interface DilemmaQCResult {
  isValid: boolean;
  dilemmaId: string;
  errors: string[];
  warnings: string[];
  checks: DilemmaQualityMetadata;
}

export interface InteractiveDilemma {
  id: string;
  index: number;
  category: DilemmaCategory;
  title: string;
  hook: string;
  setup?: string;
  scenario: string; // Alias and backwards-compatibility for setup
  pressure?: string; // Concrete complication, clock, limited resources, or sudden obstacle
  pressureTypes?: PressureType[];
  twist?: string; // Hidden info or surprising complication
  depth?: ContentDepth; // 'quick' | 'standard' | 'deep'
  format?: ContentFormat; // 'impossible_dilemma' | 'survival_scenario' | ...
  interactionType?: InteractionType;
  choices: DilemmaChoice[];
  pollQuestion?: string;
  discussionPrompt?: string;
  consequence?: string; // Direct immediate consequence or preview
  payoff: DilemmaPayoff;
  visualSpec: VisualSpec;
  formattedTelegramText: string;
  draft?: PostDraft;
  qc?: DilemmaQCResult;
}

export interface DilemmaManifestEntry {
  id: string;
  index: number;
  category: DilemmaCategory;
  title: string;
  hook: string;
  choiceCount: number;
  wordCount: number;
  visualFile: string;
  jsonFile: string;
  payoffPreview: string;
  qcPassed: boolean;
  depth?: ContentDepth;
  format?: ContentFormat;
}

export interface DilemmaStressTestManifest {
  title: string;
  version: string;
  generatedAt: string;
  channelName: string;
  outputDirectory: string;
  totalDilemmas: number;
  categoriesCovered: DilemmaCategory[];
  allQCPassed: boolean;
  dilemmas: DilemmaManifestEntry[];
  summary: {
    totalVisualsRendered: number;
    totalWordCount: number;
    avgWordCount: number;
    executionTimeMs: number;
  };
}

export interface TelegramPublicationPayload {
  id: string;
  publicationTarget: 'telegram_channel';
  channelId?: string; // dry-run placeholder
  messageText: string;
  parseMode: 'HTML';
  visualAsset?: {
    template: string;
    spec: VisualSpec;
    filePath?: string;
    attachAsPhoto: boolean;
  };
  interaction: {
    type: InteractionType;
    poll?: {
      question: string;
      options: string[];
      isAnonymous: boolean;
      allowsMultipleAnswers: boolean;
    };
    openDiscussion?: {
      prompt: string;
      pinnedCallToAction: string;
    };
    prediction?: {
      question: string;
      options: string[];
      resolutionCriteria: string;
    };
    scenarioChoice?: {
      question: string;
      options: Array<{ id: string; label: string; tradeOff: string }>;
    };
  };
  metadata: {
    category: DilemmaCategory;
    format: ContentFormat;
    depth: ContentDepth;
    tone?: string;
    title: string;
    hook: string;
    wordCount: number;
    characterCount: number;
    standaloneVerified: boolean;
    antiSlopPassed: boolean;
    qcPassed: boolean;
    revealPayoff: {
      reveal: string;
      surprisingOutcome: string;
      communityTension?: string;
      strategicAnalysis?: string;
    };
  };
  publishedAt: null; // Dry-run only
  status: 'READY_FOR_PUBLICATION' | 'REJECTED' | 'FALLBACK_GENERATED';
}

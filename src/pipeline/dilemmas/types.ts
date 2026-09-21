/**
 * Interactive Dilemma Types & Schemas (Phase 6 - Entertainment Model)
 * Pure entertainment channel model for "Interactive Dilemmas & Impossible Choices".
 * Completely removed legacy academic psychology and scientific citation requirements.
 */

import { VisualSpec, PostDraft } from '../types.js';

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
  telegramHtmlValid: boolean;
  visualAssetValid: boolean;
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
  scenario: string;
  choices: DilemmaChoice[];
  pollQuestion?: string;
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

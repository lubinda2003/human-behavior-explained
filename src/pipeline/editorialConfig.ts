/**
 * Editorial Format Configuration & Content Mix
 * Configures distribution, target lengths, and editorial guidelines across all supported formats:
 * - long_explanation
 * - short_curiosity
 * - experiment_story
 * - thought_experiment
 * - poll
 * - quick_observation
 */

import { EditorialFormat } from './types.js';

export interface FormatRule {
  targetWords: { min: number; max: number };
  targetParagraphs: { min: number; max: number };
  description: string;
}

export interface EditorialFormatConfig {
  distribution: Record<EditorialFormat, number>;
  formatRules: Record<EditorialFormat, FormatRule>;
}

/**
 * Default editorial mix for the Human Behavior Explained Telegram channel.
 * Configured in one centralized location for easy tuning.
 */
export const DEFAULT_EDITORIAL_FORMAT_CONFIG: EditorialFormatConfig = {
  distribution: {
    long_explanation: 0.30,   // Complex mechanisms, nuanced phenomena
    experiment_story: 0.25,   // Telling seminal study as a gripping narrative first
    short_curiosity: 0.20,    // Punchy, surprising human psychological quirks (60-150 words)
    quick_observation: 0.10,  // Fast "wait, your brain does that?" micro-moments
    thought_experiment: 0.10, // Dilemmas and hypothetical choices
    poll: 0.05,               // Interactive audience perception tests & votes
  },
  formatRules: {
    long_explanation: {
      targetWords: { min: 140, max: 400 },
      targetParagraphs: { min: 2, max: 4 },
      description: 'Deep dive into complex mechanisms, empirical experiments, or nuanced human behavior.',
    },
    experiment_story: {
      targetWords: { min: 110, max: 320 },
      targetParagraphs: { min: 2, max: 4 },
      description: 'Tell the empirical study as a short, vivid story before explaining what researchers learned.',
    },
    short_curiosity: {
      targetWords: { min: 50, max: 150 },
      targetParagraphs: { min: 1, max: 3 },
      description: 'Punchy, surprising human psychological observation (roughly 60–150 words).',
    },
    thought_experiment: {
      targetWords: { min: 90, max: 280 },
      targetParagraphs: { min: 2, max: 4 },
      description: 'Ask audience to imagine a dilemma or choice to reveal a psychological bias.',
    },
    poll: {
      targetWords: { min: 40, max: 160 },
      targetParagraphs: { min: 1, max: 3 },
      description: 'Concise question, 2-4 meaningful answer options, and brief scientific context.',
    },
    quick_observation: {
      targetWords: { min: 35, max: 110 },
      targetParagraphs: { min: 1, max: 2 },
      description: 'Very short "wait, your brain does that?" micro-moment.',
    },
  },
};

/**
 * Selects an editorial format based on the configured distribution weights.
 */
export function selectEditorialFormat(
  options?: {
    suggestedFormat?: EditorialFormat;
    randomSeed?: number;
    config?: EditorialFormatConfig;
    recentFormats?: EditorialFormat[];
  }
): EditorialFormat {
  if (options?.suggestedFormat) {
    return options.suggestedFormat;
  }

  const config = options?.config || DEFAULT_EDITORIAL_FORMAT_CONFIG;
  const distribution = config.distribution;

  // If recent formats are supplied, adjust weights slightly to avoid repeating the exact same format 3 times in a row
  const adjustedWeights: Record<EditorialFormat, number> = { ...distribution };
  if (options?.recentFormats && options.recentFormats.length >= 2) {
    const lastTwo = options.recentFormats.slice(-2);
    if (lastTwo[0] === lastTwo[1]) {
      const repeated = lastTwo[0];
      adjustedWeights[repeated] = Math.max(0.02, adjustedWeights[repeated] * 0.25);
    }
  }

  // Normalize weights
  const totalWeight = Object.values(adjustedWeights).reduce((sum, w) => sum + w, 0);
  const rand = options?.randomSeed !== undefined ? options.randomSeed : Math.random();
  let threshold = rand * totalWeight;

  for (const [format, weight] of Object.entries(adjustedWeights) as [EditorialFormat, number][]) {
    threshold -= weight;
    if (threshold <= 0) {
      return format;
    }
  }

  return 'long_explanation';
}

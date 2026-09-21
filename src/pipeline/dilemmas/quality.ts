/**
 * Entertainment-First Quality Control & Verification for Interactive Dilemmas (Phase 6)
 * Rejects academic psychology lecturing, ensures high-stakes entertainment trade-offs,
 * validates Telegram HTML markup, and verifies visual assets.
 */

import fs from 'node:fs';
import sharp from 'sharp';
import { InteractiveDilemma, DilemmaQCResult, DilemmaQualityMetadata } from './types.js';

export interface DilemmaVisualAssetQC {
  isValid: boolean;
  errors: string[];
  width?: number;
  height?: number;
  fileSizeBytes?: number;
  isNotBlank?: boolean;
}

export class DilemmaQualityChecker {
  // Banned academic / psychology lecture jargon
  private static readonly ACADEMIC_JARGON_PATTERNS: RegExp[] = [
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
    /\bjournal\s+of\s+personality\b/i,
    /\bpsychological\s+concept\b/i,
    /\bpsychological\s+insight\b/i,
  ];

  // Serialized story or cross-post dependency phrases
  private static readonly SERIALIZED_PATTERNS: RegExp[] = [
    /\bpart\s+[0-9IVX]+\b/i,
    /\bin\s+yesterday(?:'s)?\s+post\b/i,
    /\bas\s+we\s+saw\s+last\s+(?:week|post|time)\b/i,
    /\bto\s+be\s+continued\b/i,
    /\bstay\s+tuned\s+for\s+(?:tomorrow|the\s+next\s+post)\b/i,
    /\bcontinuing\s+our\s+story\b/i,
  ];

  // Low-effort / generic trivial questions
  private static readonly LOW_EFFORT_PATTERNS: RegExp[] = [
    /\bwould\s+you\s+rather\s+(?:eat|have)\s+(?:pizza|ice\s+cream|tacos)\b/i,
    /\bwhich\s+is\s+better:\s+(?:summer|winter|cats|dogs)\b/i,
    /\bdo\s+you\s+like\s+(?:tea|coffee)\b/i,
  ];

  /**
   * Validate an InteractiveDilemma's textual and structural content.
   */
  public static validateDilemmaContent(dilemma: InteractiveDilemma): DilemmaQCResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Combine all textual content for full-text inspection
    const fullText = [
      dilemma.title,
      dilemma.hook,
      dilemma.scenario,
      ...dilemma.choices.map((c) => `${c.label} ${c.description} ${c.tradeOff}`),
      dilemma.pollQuestion,
      dilemma.payoff.reveal,
      dilemma.payoff.surprisingOutcome,
      dilemma.payoff.communityTension,
      dilemma.formattedTelegramText,
    ].join(' ');

    // 1. Structural Checks
    if (!dilemma.id || dilemma.id.trim().length === 0) {
      errors.push('Dilemma missing id.');
    }
    if (!dilemma.title || dilemma.title.trim().length === 0) {
      errors.push('Dilemma missing title.');
    }
    if (!dilemma.hook || dilemma.hook.trim().length < 15) {
      errors.push('Dilemma hook is missing or too brief (minimum 15 characters).');
    }
    if (!dilemma.scenario || dilemma.scenario.trim().length < 35) {
      errors.push('Dilemma scenario is missing or too brief (minimum 35 characters).');
    }
    if (!dilemma.pollQuestion || dilemma.pollQuestion.trim().length < 10) {
      errors.push('Dilemma missing pollQuestion.');
    }

    // 2. Choice Verification (2-4 meaningful choices with explicit trade-offs)
    let choiceCountValid = true;
    let tradeOffsExplicit = true;

    if (!Array.isArray(dilemma.choices) || dilemma.choices.length < 2 || dilemma.choices.length > 4) {
      errors.push(`Dilemma must have between 2 and 4 choices (received ${dilemma.choices?.length || 0}).`);
      choiceCountValid = false;
    } else {
      const choiceIds = new Set<string>();
      const choiceLabels = new Set<string>();

      for (let i = 0; i < dilemma.choices.length; i++) {
        const choice = dilemma.choices[i];
        if (!choice.id || choice.id.trim().length === 0) {
          errors.push(`Choice at index ${i} is missing an id.`);
        } else {
          if (choiceIds.has(choice.id)) {
            errors.push(`Duplicate choice id "${choice.id}" at index ${i}.`);
          }
          choiceIds.add(choice.id);
        }

        if (!choice.label || choice.label.trim().length === 0) {
          errors.push(`Choice at index ${i} is missing a label.`);
        } else {
          const normLabel = choice.label.toLowerCase().trim();
          if (choiceLabels.has(normLabel)) {
            errors.push(`Duplicate choice label "${choice.label}" at index ${i}.`);
          }
          choiceLabels.add(normLabel);
        }

        if (!choice.tradeOff || choice.tradeOff.trim().length < 8) {
          errors.push(`Choice at index ${i} (${choice.label || 'unnamed'}) is missing an explicit trade-off.`);
          tradeOffsExplicit = false;
        }
      }
    }

    // 3. Payoff / Reveal Checks
    if (!dilemma.payoff) {
      errors.push('Dilemma missing payoff object.');
    } else {
      if (!dilemma.payoff.reveal || dilemma.payoff.reveal.trim().length < 25) {
        errors.push('Payoff reveal is missing or too short.');
      }
      if (!dilemma.payoff.surprisingOutcome || dilemma.payoff.surprisingOutcome.trim().length < 15) {
        errors.push('Payoff surprisingOutcome is missing or too short.');
      }
      if (!dilemma.payoff.communityTension || dilemma.payoff.communityTension.trim().length < 15) {
        errors.push('Payoff communityTension is missing or too short.');
      }
    }

    // 4. Reject Academic Psychology & Research Jargon (Entertainment Focus)
    let noAcademicJargon = true;
    for (const pattern of this.ACADEMIC_JARGON_PATTERNS) {
      if (pattern.test(fullText)) {
        const match = fullText.match(pattern)?.[0];
        errors.push(`Contains banned academic/psychology jargon: "${match}". Dilemmas must be framed purely as entertainment scenarios.`);
        noAcademicJargon = false;
        break;
      }
    }

    // 5. Reject Serialized / Continuing Story Dependencies
    let noSerializedStory = true;
    for (const pattern of this.SERIALIZED_PATTERNS) {
      if (pattern.test(fullText)) {
        const match = fullText.match(pattern)?.[0];
        errors.push(`Contains serialized post dependency: "${match}". Every post must be 100% standalone.`);
        noSerializedStory = false;
        break;
      }
    }

    // 6. Reject Low-Effort Generic Questions
    let noGenericWYR = true;
    for (const pattern of this.LOW_EFFORT_PATTERNS) {
      if (pattern.test(fullText)) {
        const match = fullText.match(pattern)?.[0];
        errors.push(`Contains low-effort generic question: "${match}".`);
        noGenericWYR = false;
        break;
      }
    }

    // 7. Telegram HTML Formatting Check
    let telegramHtmlValid = true;
    if (!dilemma.formattedTelegramText || dilemma.formattedTelegramText.trim().length === 0) {
      errors.push('Dilemma missing formattedTelegramText.');
      telegramHtmlValid = false;
    } else {
      const htmlText = dilemma.formattedTelegramText;
      const allowedTags = ['b', 'i', 'code', 'pre', 'a', 'tg-spoiler'];
      for (const tag of allowedTags) {
        const openMatches = (htmlText.match(new RegExp(`<${tag}(\\s+[^>]*)?>`, 'gi')) || []).length;
        const closeMatches = (htmlText.match(new RegExp(`</${tag}>`, 'gi')) || []).length;
        if (openMatches !== closeMatches) {
          errors.push(`Unbalanced Telegram HTML tag <${tag}>: ${openMatches} open vs ${closeMatches} close.`);
          telegramHtmlValid = false;
        }
      }
    }

    const checks: DilemmaQualityMetadata = {
      choiceCountValid,
      tradeOffsExplicit,
      noAcademicJargon,
      noSerializedStory,
      noGenericWYR,
      telegramHtmlValid,
      visualAssetValid: true,
    };

    return {
      isValid: errors.length === 0,
      dilemmaId: dilemma.id,
      errors,
      warnings,
      checks,
    };
  }

  /**
   * Validate a generated visual PNG asset using Sharp.
   */
  public static async validateVisualAsset(
    filePath: string,
    expectedWidth = 1200,
    expectedHeight = 675
  ): Promise<DilemmaVisualAssetQC> {
    const errors: string[] = [];

    if (!fs.existsSync(filePath)) {
      return {
        isValid: false,
        errors: [`Visual PNG file does not exist at path: ${filePath}`],
      };
    }

    const stat = fs.statSync(filePath);
    if (stat.size === 0) {
      return {
        isValid: false,
        errors: [`Visual PNG file at ${filePath} is empty (0 bytes).`],
        fileSizeBytes: 0,
      };
    }

    try {
      const image = sharp(filePath);
      const metadata = await image.metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;

      if (width !== expectedWidth || height !== expectedHeight) {
        errors.push(`Image dimensions ${width}x${height} do not match expected ${expectedWidth}x${expectedHeight}.`);
      }

      const stats = await image.stats();
      const channelStdevs = stats.channels.map((c) => c.stdev);
      const isNotBlank = channelStdevs.some((stdev) => stdev >= 2.0);

      if (!isNotBlank) {
        errors.push(
          `Image appears blank/uniform (channel std devs: [${channelStdevs.map((s) => s.toFixed(2)).join(', ')}]).`
        );
      }

      return {
        isValid: errors.length === 0,
        errors,
        width,
        height,
        fileSizeBytes: stat.size,
        isNotBlank,
      };
    } catch (err: any) {
      return {
        isValid: false,
        errors: [`Failed to decode image with Sharp: ${err.message}`],
        fileSizeBytes: stat.size,
      };
    }
  }
}

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

  // Low-effort / generic trivial "Would You Rather" and thin cliché questions
  private static readonly LOW_EFFORT_PATTERNS: RegExp[] = [
    /\bwould\s+you\s+rather\s+(?:eat|have)\s+(?:pizza|ice\s+cream|tacos)\b/i,
    /\bwhich\s+is\s+better:\s+(?:summer|winter|cats|dogs)\b/i,
    /\bdo\s+you\s+like\s+(?:tea|coffee)\b/i,
    /\bwould\s+you\s+rather\s+(?:have|take|get|receive)\s+\$?[0-9]+(?:\s*(?:million|billion|[kmb]))?\s+or\s+(?:live\s+forever|be\s+immortal)\b/i,
    /\bwould\s+you\s+rather\s+have\s+\$1m\s+or\s+live\s+forever\b/i,
    /\bwould\s+you\s+rather\s+(?:have\s+)?unlimited\s+money\s+or\b/i,
    /\bwould\s+you\s+rather\s+be\s+rich\s+and\s+sad\s+or\s+poor\s+and\s+happy\b/i,
    /\bwould\s+you\s+rather\s+(?:fly|be\s+invisible)\s+or\s+(?:teleport|read\s+minds)\b/i,
    /\bwould\s+you\s+rather\s+know\s+(?:how|when)\s+you\s+die\b/i,
    /\bwould\s+you\s+rather\s+be\s+the\s+smartest\s+person\s+or\s+the\s+richest\b/i,
  ];

  // Formulaic "You get X but lose Y" without substantive situational narrative
  private static readonly FORMULAIC_TRADEOFF_PATTERNS: RegExp[] = [
    /^you\s+(?:get|receive|have)\s+[^.]+but\s+(?:you\s+)?(?:lose|give\s+up)\s+[^.]+\.?$/i,
    /^press\s+the\s+button\s+to\s+get\s+[^.]+but\s+[^.]+\.?$/i,
  ];

  /**
   * Validate an InteractiveDilemma's textual and structural content.
   */
  public static validateDilemmaContent(dilemma: InteractiveDilemma): DilemmaQCResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const scenarioText = [dilemma.setup, dilemma.scenario].filter(Boolean).join(' ');

    // Combine all textual content for full-text inspection
    const fullText = [
      dilemma.title,
      dilemma.hook,
      dilemma.setup || '',
      dilemma.scenario || '',
      dilemma.pressure || '',
      dilemma.twist || '',
      ...dilemma.choices.map((c) => `${c.label} ${c.description} ${c.tradeOff} ${c.consequence || ''}`),
      dilemma.pollQuestion || '',
      dilemma.discussionPrompt || '',
      dilemma.payoff.reveal || '',
      dilemma.payoff.surprisingOutcome || '',
      dilemma.payoff.communityTension || '',
      dilemma.formattedTelegramText,
    ].join(' ');

    // 1. Structural Checks
    if (!dilemma.id || dilemma.id.trim().length === 0) {
      errors.push('Dilemma missing id.');
    }
    if (!dilemma.title || dilemma.title.trim().length === 0) {
      errors.push('Dilemma missing title.');
    }

    const depth = dilemma.depth || 'standard';
    const minHookLen = depth === 'quick' ? 12 : 15;
    const minScenarioLen = depth === 'quick' ? 20 : 35;

    if (!dilemma.hook || dilemma.hook.trim().length < minHookLen) {
      errors.push(`Dilemma hook is missing or too brief (minimum ${minHookLen} characters for ${depth} depth).`);
    }
    if (!scenarioText || scenarioText.trim().length < minScenarioLen) {
      errors.push(`Dilemma scenario/setup is missing or too brief (minimum ${minScenarioLen} characters for ${depth} depth).`);
    }

    // Interaction mechanism check: Must have pollQuestion, discussionPrompt, or clear choices
    const hasInteraction =
      (dilemma.pollQuestion && dilemma.pollQuestion.trim().length >= 5) ||
      (dilemma.discussionPrompt && dilemma.discussionPrompt.trim().length >= 5) ||
      (Array.isArray(dilemma.choices) && dilemma.choices.length >= 2);

    if (!hasInteraction) {
      errors.push('Dilemma must have an interaction mechanism (pollQuestion, discussionPrompt, or interactive choices).');
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
        } else {
          const lowerTradeOff = choice.tradeOff.toLowerCase().trim();
          if (['none', 'nothing', 'no downside', 'no cost', 'free'].includes(lowerTradeOff)) {
            errors.push(`Choice at index ${i} has a trivial trade-off ("${choice.tradeOff}"). All choices must have real stakes.`);
            tradeOffsExplicit = false;
          }
        }
      }
    }

    // 3. Payoff / Reveal Checks
    if (!dilemma.payoff) {
      errors.push('Dilemma missing payoff object.');
    } else {
      if (!dilemma.payoff.reveal || dilemma.payoff.reveal.trim().length < 20) {
        errors.push('Payoff reveal is missing or too short.');
      }
      if (!dilemma.payoff.surprisingOutcome || dilemma.payoff.surprisingOutcome.trim().length < 12) {
        errors.push('Payoff surprisingOutcome is missing or too short.');
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

    // 6. Reject Low-Effort Generic "Would You Rather" Questions
    let noGenericWYR = true;
    for (const pattern of this.LOW_EFFORT_PATTERNS) {
      if (pattern.test(fullText)) {
        const match = fullText.match(pattern)?.[0];
        errors.push(`Contains low-effort generic question: "${match}". Content must put the user inside a concrete situation with tangible stakes.`);
        noGenericWYR = false;
        break;
      }
    }

    // 7. Reject Formulaic "You get X but lose Y" without situational context
    let noFormulaicTradeoff = true;
    const trimmedScenario = scenarioText.trim();
    for (const pattern of this.FORMULAIC_TRADEOFF_PATTERNS) {
      if (pattern.test(trimmedScenario) && trimmedScenario.length < 80) {
        errors.push(`Scenario relies on lazy formulaic trade-off ("${trimmedScenario}"). Scenarios must build an immersive situation with scene details and genuine tension.`);
        noFormulaicTradeoff = false;
        break;
      }
    }

    // 8. Situational Immersion Verification
    // Scenarios must place the user inside an active situation rather than abstract philosophical theories
    let hasSituationalImmersion = true;
    const situationalWords = [
      'you', 'your', 'room', 'contract', 'timer', 'team', 'ship', 'device', 'partner',
      'call', 'find', 'face', 'stand', 'walk', 'alarm', 'clock', 'offer', 'crisis',
      'surrounded', 'threatened', 'investigator', 'colleague', 'money', 'code', 'door',
      'system', 'passenger', 'vault', 'island', 'station', 'crew', 'screen', 'cell',
      'trap', 'locked', 'stranger', 'hospital', 'court', 'cabin', 'emergency', 'bridge'
    ];
    const lowerScenarioAndHook = `${dilemma.hook} ${scenarioText} ${dilemma.pressure || ''}`.toLowerCase();
    const situationalMatchCount = situationalWords.filter((w) => lowerScenarioAndHook.includes(w)).length;

    if (situationalMatchCount < 2) {
      errors.push('Scenario lacks concrete situational immersion. The content must put the user inside an active scenario rather than presenting an abstract debate.');
      hasSituationalImmersion = false;
    }

    // 9. Content Depth Requirements
    let depthRequirementsMet = true;
    if (depth === 'deep') {
      const totalNarrativeLength = (dilemma.setup || dilemma.scenario || '').length +
        (dilemma.pressure ? dilemma.pressure.length : 0) +
        (dilemma.twist ? dilemma.twist.length : 0);

      if (totalNarrativeLength < 110) {
        errors.push(`Deep scenario is too brief (${totalNarrativeLength} chars). Deep posts require an immersive scenario, concrete details, and escalating pressure or twist.`);
        depthRequirementsMet = false;
      }
    }

    // 10. Telegram HTML Formatting Check
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
      noFormulaicTradeoff,
      hasSituationalImmersion,
      depthRequirementsMet,
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

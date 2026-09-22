/**
 * Entertainment-First Quality Control & Verification for Interactive Dilemmas (Phase 6)
 * Rejects academic psychology lecturing, ensures high-stakes entertainment trade-offs,
 * validates Telegram HTML markup, and verifies visual assets.
 */

import fs from 'node:fs';
import sharp from 'sharp';
import {
  InteractiveDilemma,
  DilemmaQCResult,
  DilemmaQualityMetadata,
  ALL_DILEMMA_CATEGORIES,
  ALL_CONTENT_FORMATS,
} from './types.js';

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
  public static readonly ACADEMIC_JARGON_PATTERNS: RegExp[] = [
    /\bcognitive\s+dissonance\b/i,
    /\bhedonic\s+adaptation\b/i,
    /\baffective\s+forecasting\b/i,
    /\bprospect\s+theory\b/i,
    /\bhyperbolic\s+discounting\b/i,
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
    /\bbehavioral\s+economics\b/i,
    /\bsubjects\s+in\s+the\s+experiment\b/i,
    /\bparticipants\s+were\s+instructed\b/i,
    /\bclinical\s+trials?\s+demonstrate\b/i,
    /\bneuroscientists?\s+(?:measure|found|study|explain)\b/i,
    /\bpsychologists?\s+(?:suggest|note|argue|hypothesize)\b/i,
    /\bhedonic\s+treadmill\b/i,
    /\bdopaminergic\s+pathways?\b/i,
    /\bevolutionary\s+psychology\b/i,
    /\b(?:utilitarianism|deontology|kantian|trolley\s+problem\s+philosophy)\b/i,
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
    /\b(?:would\s+you\s+rather\s+)?(?:have|receive|get|take)?\s*\$?[0-9]+\s*(?:million|billion|[kmb])\s*,?\s*but\s+(?:you\s+)?(?:can\s+)?never\s+spend\s+it\b/i,
    /\bwould\s+you\s+rather\s+(?:have|take|get|receive)\s+\$?[0-9]+(?:\s*(?:million|billion|[kmb]))?\s+or\s+(?:live\s+forever|be\s+immortal)\b/i,
    /\bwould\s+you\s+rather\s+have\s+\$1m\s+or\s+live\s+forever\b/i,
    /\bwould\s+you\s+rather\s+(?:have\s+)?unlimited\s+money\s+or\b/i,
    /\bwould\s+you\s+rather\s+be\s+rich\s+and\s+sad\s+or\s+poor\s+and\s+happy\b/i,
    /\bwould\s+you\s+rather\s+(?:fly|be\s+invisible)\s+or\s+(?:teleport|read\s+minds)\b/i,
    /\bwould\s+you\s+rather\s+know\s+(?:how|when)\s+you\s+die\b/i,
    /\bwould\s+you\s+rather\s+be\s+the\s+smartest\s+person\s+or\s+the\s+richest\b/i,
  ];

  // Formulaic "You get X but lose Y" without substantive situational narrative
  public static readonly FORMULAIC_TRADEOFF_PATTERNS: RegExp[] = [
    /\byou\s+(?:get|receive|gain|have|can)\b.+?\bbut\s+(?:you\s+)?(?:lose|give\s+up|sacrifice|can\s+never|at\s+the\s+cost\s+of)\b/i,
    /\bpress\s+(?:the|a)\s+button\s+to\s+(?:get|receive)\b.+?\bbut\b/i,
    /\bwould\s+you\s+(?:press\s+the\s+button|take\s+the\s+deal)\s+if\b/i,
  ];

  // Abstract ungrounded philosophical debate patterns lacking concrete environment or stakes
  private static readonly ABSTRACT_HYPOTHETICAL_PATTERNS: RegExp[] = [
    /\b(?:virtue\s+and\s+utilitarian|morality\s+dictates|ethical\s+frameworks|philosophical\s+(?:conundrum|debate|thought\s+experiment))\b/i,
    /\b(?:in\s+an\s+abstract\s+world|consider\s+an\s+abstract|hypothetically\s+speaking,\s+if\s+truth)\b/i,
    /\b(?:is\s+free\s+will\s+an\s+illusion|what\s+is\s+the\s+nature\s+of\s+justice|purely\s+hypothetical\s+dimension)\b/i,
    /\b(?:abstract\s+principle\s+where\s+morality|choosing\s+welfare\s+over\s+duties)\b/i,
    /\butilitarian\s+outcomes\s+frequently\s+conflict\b/i,
    /\bhow\s+should\s+society\s+balance\b/i,
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

    // 1. Structural & Schema Checks
    let schemaFieldsValid = true;
    if (!dilemma.id || dilemma.id.trim().length === 0) {
      errors.push('Dilemma missing id.');
      schemaFieldsValid = false;
    }
    if (!dilemma.title || dilemma.title.trim().length === 0) {
      errors.push('Dilemma missing title.');
      schemaFieldsValid = false;
    }
    if (!dilemma.category || !ALL_DILEMMA_CATEGORIES.includes(dilemma.category)) {
      errors.push(`Dilemma has missing or invalid category "${dilemma.category}".`);
      schemaFieldsValid = false;
    }

    const depth = dilemma.depth || 'standard';
    const minHookLen = depth === 'quick' ? 12 : 15;
    const minScenarioLen = depth === 'quick' ? 20 : 35;

    if (!dilemma.hook || dilemma.hook.trim().length < minHookLen) {
      errors.push(`Dilemma hook is missing or too brief (minimum ${minHookLen} characters for ${depth} depth).`);
      schemaFieldsValid = false;
    }
    if (!scenarioText || scenarioText.trim().length < minScenarioLen) {
      errors.push(`Dilemma scenario/setup is missing or too brief (minimum ${minScenarioLen} characters for ${depth} depth).`);
      schemaFieldsValid = false;
    }

    // Interaction mechanism & configuration check
    let interactionConfigValid = true;
    const hasInteraction =
      (dilemma.pollQuestion && dilemma.pollQuestion.trim().length >= 5) ||
      (dilemma.discussionPrompt && dilemma.discussionPrompt.trim().length >= 5) ||
      (Array.isArray(dilemma.choices) && dilemma.choices.length >= 2);

    if (!hasInteraction) {
      errors.push('Dilemma must have an interaction mechanism (pollQuestion, discussionPrompt, or interactive choices).');
      interactionConfigValid = false;
    }

    // Validate specific interaction types and Telegram poll constraints
    if (dilemma.interactionType) {
      const validInteractionTypes = [
        'poll',
        'open_discussion',
        'prediction_vote',
        'mini_game',
        'scenario_choice',
        'versus_vote',
        'reveal_spoiler',
      ];
      if (!validInteractionTypes.includes(dilemma.interactionType)) {
        errors.push(`Dilemma has unknown interaction type "${dilemma.interactionType}".`);
        interactionConfigValid = false;
      }
    }

    if (dilemma.interactionType === 'poll' || dilemma.pollQuestion) {
      if (dilemma.pollQuestion && dilemma.pollQuestion.length > 300) {
        errors.push(`Telegram poll question exceeds the 300 character limit (received ${dilemma.pollQuestion.length} chars).`);
        interactionConfigValid = false;
      }
      if (dilemma.interactionType === 'poll' && (!dilemma.pollQuestion || dilemma.pollQuestion.trim().length < 5)) {
        errors.push('Poll interaction type selected but pollQuestion is missing or too short.');
        interactionConfigValid = false;
      }
      if (Array.isArray(dilemma.choices)) {
        if (dilemma.choices.length < 2 || dilemma.choices.length > 10) {
          errors.push(`Telegram polls require between 2 and 10 choices (received ${dilemma.choices.length}).`);
          interactionConfigValid = false;
        }
        for (const choice of dilemma.choices) {
          if (choice.label && choice.label.length > 100) {
            errors.push(`Telegram poll option exceeds 100 character limit ("${choice.label.substring(0, 30)}..." is ${choice.label.length} chars).`);
            interactionConfigValid = false;
          }
        }
      }
    }

    if (dilemma.interactionType === 'open_discussion') {
      if (!dilemma.discussionPrompt || dilemma.discussionPrompt.trim().length < 5) {
        errors.push('Open discussion interaction type selected but discussionPrompt is missing or too short.');
        interactionConfigValid = false;
      }
    }

    // 2. Choice Verification (2-4 meaningful choices with explicit trade-offs)
    let choiceCountValid = true;
    let tradeOffsExplicit = true;
    let noCostFreeChoice = true;
    let noDominantChoice = true;

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
          noCostFreeChoice = false;
        } else {
          const lowerTradeOff = choice.tradeOff.toLowerCase().trim();
          if (
            ['none', 'nothing', 'no downside', 'no cost', 'free'].includes(lowerTradeOff) ||
            /\b(?:none|nothing|no\s+(?:downside|cost|risk|consequence|sacrifice|penalty|harm|drawback)|zero\s+(?:cost|downside|risk|penalty)|free|trivial|minor\s+(?:inconvenience|delay|calorie)|slight\s+delay|no\s+harm\s+done|all\s+upside|cost-?free)\b/i.test(lowerTradeOff)
          ) {
            errors.push(`Choice at index ${i} has a trivial trade-off ("${choice.tradeOff}"). All choices must have real stakes.`);
            tradeOffsExplicit = false;
            noCostFreeChoice = false;
          }
        }
      }

      // Dominant Choice Verification: Reject situations where a rational reader immediately knows which option is superior
      if (dilemma.choices.length >= 2) {
        const cA = dilemma.choices[0];
        const cB = dilemma.choices[1];
        const descA = `${cA.description || ''} ${cA.tradeOff || ''}`.toLowerCase();
        const descB = `${cB.description || ''} ${cB.tradeOff || ''}`.toLowerCase();

        const isLethalA = /\b(?:die|death|lethal|killed|fatal|vipers?|boiling\s+acid|acid\s+pit|instant\s+execution)\b/i.test(descA);
        const isLethalB = /\b(?:die|death|lethal|killed|fatal|vipers?|boiling\s+acid|acid\s+pit|instant\s+execution)\b/i.test(descB);
        const isSeriousA = isLethalA || /\b(?:burnout|sacrifice|forfeit|ruin|agony|chasm|hypothermia|blacklisted|concussion|prison|bankrupt|fatal)\b/i.test(descA);
        const isSeriousB = isLethalB || /\b(?:burnout|sacrifice|forfeit|ruin|agony|chasm|hypothermia|blacklisted|concussion|prison|bankrupt|fatal)\b/i.test(descB);

        if ((isLethalA && !isSeriousB) || (isLethalB && !isSeriousA)) {
          errors.push('One choice carries catastrophic/lethal ruin while the other has only trivial downsides, creating an obvious dominant choice.');
          noDominantChoice = false;
        }
        if (cA.label.toLowerCase().trim() === cB.label.toLowerCase().trim()) {
          errors.push('Choices have identical labels.');
          noDominantChoice = false;
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
    const hookAndScenario = `${dilemma.hook} ${scenarioText}`.trim();
    const hasFormulaicTradeoff = this.FORMULAIC_TRADEOFF_PATTERNS.some((pattern) =>
      pattern.test(dilemma.hook) || pattern.test(scenarioText)
    );

    if (hasFormulaicTradeoff) {
      // Allowed ONLY if embedded inside a genuinely interesting and detailed situation
      const concreteAnchors = [
        'room', 'desk', 'clock', 'timer', 'door', 'vault', 'briefcase', 'ship', 'console',
        'submersible', 'station', 'cabin', 'screen', 'laser', 'device', 'phone', 'radio',
        'office', 'ridge', 'rope', 'partner', 'colleague', 'boss', 'officer', 'hospital',
        'alchemist', 'contract', 'seconds', 'minutes', 'hours', 'ice', 'mountain', 'gear'
      ];
      const anchorCount = concreteAnchors.filter((a) => hookAndScenario.toLowerCase().includes(a)).length;
      const isRichSituation = trimmedScenario.length >= 100 && anchorCount >= 3;

      if (!isRichSituation) {
        errors.push(`Scenario relies on lazy formulaic trade-off ("You get X, but lose Y") without being embedded inside a genuinely interesting situation.`);
        noFormulaicTradeoff = false;
      }
    }

    // 8. Situational Immersion & Grounding Verification (Reject Ungrounded Hypotheticals)
    // Scenarios must place the user inside an active situation rather than abstract philosophical theories
    let hasSituationalImmersion = true;
    let noUngroundedHypothetical = true;

    for (const pattern of this.ABSTRACT_HYPOTHETICAL_PATTERNS) {
      if (pattern.test(fullText)) {
        const match = fullText.match(pattern)?.[0];
        errors.push(`Scenario contains ungrounded abstract philosophical debate: "${match}". Content must place the user inside a concrete situation with tangible stakes.`);
        noUngroundedHypothetical = false;
        hasSituationalImmersion = false;
        break;
      }
    }

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
      noUngroundedHypothetical = false;
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

    // 10. Telegram HTML Formatting and Character Limit Check
    let telegramHtmlValid = true;
    let telegramLengthValid = true;
    if (!dilemma.formattedTelegramText || dilemma.formattedTelegramText.trim().length === 0) {
      errors.push('Dilemma missing formattedTelegramText.');
      telegramHtmlValid = false;
      telegramLengthValid = false;
    } else {
      const htmlText = dilemma.formattedTelegramText;
      if (htmlText.length > 4096) {
        errors.push(`Telegram message text exceeds the 4096 character limit (received ${htmlText.length} characters).`);
        telegramLengthValid = false;
        telegramHtmlValid = false;
      }

      // Check for illegal / unsupported Telegram HTML tags
      const illegalTagMatches = htmlText.match(/<\/?([a-z0-9-]+)(?:\s+[^>]*)?>/gi) || [];
      const supportedTagNames = ['b', 'strong', 'i', 'em', 'u', 'ins', 's', 'strike', 'del', 'span', 'tg-spoiler', 'a', 'code', 'pre'];
      for (const rawTag of illegalTagMatches) {
        const tagName = rawTag.replace(/[</>]/g, '').split(/\s+/)[0].toLowerCase();
        if (!supportedTagNames.includes(tagName)) {
          errors.push(`Telegram HTML contains unsupported tag <${tagName}>. Allowed tags: ${supportedTagNames.join(', ')}.`);
          telegramHtmlValid = false;
          break;
        }
      }

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
      noDominantChoice,
      noCostFreeChoices: noCostFreeChoice,
      noUngroundedHypothetical,
      telegramLengthValid,
      interactionConfigValid,
      schemaFieldsValid,
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

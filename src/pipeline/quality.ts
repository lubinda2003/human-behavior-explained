/**
 * Editorial Quality Checker & Content Linter
 * Ensures evidence-based standards, bans AI clichés, and checks CTA & formatting rules.
 */

import { PostDraft } from './types.js';

export interface QualityValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const BANNED_AI_CLICHES = [
  'have you ever wondered',
  'in today’s fast-paced world',
  "in today's fast-paced world",
  'let’s dive in',
  "let's dive in",
  'dive right in',
  'unlock the secrets',
  'unlocking the secrets',
  'here are 5 mind-blowing',
  'mind-blowing',
  'it turns out that',
  'fast forward to today',
  'game changer',
  'at the end of the day',
  'delve into',
  'a testament to',
  'tapestry of',
  'in a nutshell',
  'buckle up',
  'read on to discover',
];

export const BANNED_PSEUDOSCIENCE_AND_POP_PHRASES = [
  'signs someone secretly likes you',
  'signs someone secretly hates you',
  'signs they are thinking about you',
  'alpha male',
  'sigma male',
  'manifesting',
  'law of attraction',
  'astrology',
  'zodiac',
  'diagnose yourself',
  'diagnose your friend',
  'dark psychology tricks',
  'manipulation trick to make anyone',
  'reprogram your subconscious in 5 minutes',
  'brain hack that doctors hate',
];

export const BANNED_GENERIC_CTAS = [
  'like this post',
  'react if you agree',
  'react with',
  'share this post',
  'share with a friend',
  'comment below',
  'drop a comment',
  'tell us in the comments',
  'don’t forget to follow',
  "don't forget to follow",
  'hit the bell',
  'subscribe for more',
];

export class QualityChecker {
  /**
   * Validate a post draft against editorial standards.
   */
  public static validate(draft: PostDraft): QualityValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const fullText = [
      draft.title,
      draft.hook,
      ...draft.bodyParagraphs,
      draft.coreTakeaway,
      draft.caveatNote,
      draft.cta.text || '',
    ]
      .join(' ')
      .toLowerCase();

    // 1. Check for banned AI clichés
    for (const phrase of BANNED_AI_CLICHES) {
      if (fullText.includes(phrase)) {
        errors.push(`Detected banned AI cliché: "${phrase}"`);
      }
    }

    // 2. Check for banned pseudoscience & pop psychology
    for (const phrase of BANNED_PSEUDOSCIENCE_AND_POP_PHRASES) {
      if (fullText.includes(phrase)) {
        errors.push(
          `Detected banned pop-psychology / pseudoscience phrase: "${phrase}"`
        );
      }
    }

    // 3. Check for generic begging CTAs
    if (draft.cta && draft.cta.text) {
      const ctaLower = draft.cta.text.toLowerCase();
      for (const phrase of BANNED_GENERIC_CTAS) {
        if (ctaLower.includes(phrase)) {
          errors.push(`Detected generic engagement begging in CTA: "${phrase}"`);
        }
      }
    }

    // 4. Emoji density check
    const emojiRegex =
      /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;
    const emojiMatches = fullText.match(emojiRegex) || [];
    if (emojiMatches.length > 6) {
      warnings.push(
        `Excessive emoji usage: found ${emojiMatches.length} emojis (recommend <= 4)`
      );
    }

    // 5. Length and paragraph structure check
    const wordCount = fullText.trim().split(/\s+/).length;
    if (wordCount < 120) {
      errors.push(
        `Post is too short (${wordCount} words). Evidence-based explanations require at least 120 words.`
      );
    } else if (wordCount > 450) {
      warnings.push(
        `Post is on the longer side (${wordCount} words). Telegram readers prefer concise delivery under 450 words.`
      );
    }

    if (!draft.bodyParagraphs || draft.bodyParagraphs.length < 2) {
      errors.push(
        'Post must contain at least 2 structured body paragraphs to explain mechanism and evidence.'
      );
    }

    // 6. Source and empirical grounding check
    if (!draft.sourcesCited || draft.sourcesCited.length === 0) {
      errors.push(
        'Post missing empirical sources. At least one researcher or peer-reviewed study citation is required.'
      );
    }

    // 7. Caveat / Limitation check
    if (!draft.caveatNote || draft.caveatNote.trim().length < 20) {
      errors.push(
        'Post must contain a clear caveat or scientific limitation note (e.g. boundary conditions or replication caveats).'
      );
    }

    // 8. Title clickbait check
    const clickbaitPatterns = [
      /shocking/i,
      /you won't believe/i,
      /you won’t believe/i,
      /secret doctors don't want you to know/i,
      /everyone is doing it wrong/i,
    ];
    for (const pat of clickbaitPatterns) {
      if (pat.test(draft.title)) {
        errors.push(`Clickbait title pattern detected: matches ${pat}`);
      }
    }

    // 9. CTA Type validation
    const validCtaTypes = ['reflection', 'continuation', 'conversation', 'connection', 'none'];
    if (!draft.cta || !validCtaTypes.includes(draft.cta.type)) {
      errors.push(
        `Invalid or missing CTA type: "${draft.cta?.type}". Must be one of: ${validCtaTypes.join(', ')}.`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

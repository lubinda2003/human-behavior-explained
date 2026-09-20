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
  'let’s dive into',
  "let's dive into",
  'dive right in',
  'unlock the secrets',
  'unlocking the secrets',
  'this fascinating phenomenon',
  'here are 5 mind-blowing',
  'here are 5 mind blowing',
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

    // 4. Emoji density and repetition check
    const emojiRegex =
      /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;
    const emojiMatches = fullText.match(emojiRegex) || [];
    if (emojiMatches.length > 6) {
      warnings.push(
        `Excessive emoji usage: found ${emojiMatches.length} emojis (recommend restrained 2-5 emojis)`
      );
    }

    // Check for repetitive emoji spam (e.g. 3+ identical emojis in a row)
    const emojiSpamPattern = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*\1\s*\1/gu;
    if (emojiSpamPattern.test(fullText)) {
      errors.push('Excessive emoji repetition detected: avoid repeating identical emojis back-to-back.');
    }

    // 5. Format-aware length and paragraph structure check
    const format = draft.format || 'long_explanation';
    const wordCount = fullText.trim().split(/\s+/).length;

    let minWords = 120;
    let maxWords = 450;
    let minParagraphs = 2;

    if (format === 'short_curiosity') {
      minWords = 45;
      maxWords = 175;
      minParagraphs = 1;
    } else if (format === 'quick_observation') {
      minWords = 30;
      maxWords = 135;
      minParagraphs = 1;
    } else if (format === 'poll') {
      minWords = 30;
      maxWords = 180;
      minParagraphs = 1;

      if (!draft.poll || !draft.poll.question || !draft.poll.options || draft.poll.options.length < 2) {
        errors.push('Poll format requires a valid question and at least 2 answer options.');
      }
    } else if (format === 'thought_experiment') {
      minWords = 80;
      maxWords = 340;
      minParagraphs = 2;
    } else if (format === 'experiment_story') {
      minWords = 90;
      maxWords = 360;
      minParagraphs = 2;
    } else {
      // long_explanation or default
      minWords = 120;
      maxWords = 450;
      minParagraphs = 2;
    }

    if (wordCount < minWords) {
      errors.push(
        `Post is too short for format "${format}" (${wordCount} words, minimum is ${minWords}).`
      );
    } else if (wordCount > maxWords) {
      warnings.push(
        `Post is on the longer side for format "${format}" (${wordCount} words, recommended under ${maxWords}).`
      );
    }

    if (!draft.bodyParagraphs || draft.bodyParagraphs.length < minParagraphs) {
      errors.push(
        `Post in format "${format}" must contain at least ${minParagraphs} body paragraph(s).`
      );
    }

    // 6. Naturalness check: prevent rigid template headers from leaking into draft text
    const rigidHeaders = [
      'core mechanism:',
      'key insight:',
      'limitation & context:',
      'limitation and context:',
      'reflection:',
    ];
    for (const header of rigidHeaders) {
      for (const p of draft.bodyParagraphs) {
        const cleanP = p.replace(/<[^>]*>/g, '').trim().toLowerCase();
        if (cleanP.startsWith(header)) {
          warnings.push(
            `Detected rigid section label "${header}" at start of paragraph. Prefer natural transitions.`
          );
        }
      }
    }

    // 7. Source and empirical grounding check
    if (!draft.sourcesCited || draft.sourcesCited.length === 0) {
      errors.push(
        'Post missing empirical sources. At least one researcher or peer-reviewed study citation is required.'
      );
    }

    // 8. Caveat / Limitation check
    if (!draft.caveatNote || draft.caveatNote.trim().length < 15) {
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

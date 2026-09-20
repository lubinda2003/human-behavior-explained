/**
 * Mystery Quality Control & Content Linter
 * Performs comprehensive deterministic validation on:
 * 1. Mystery Cases (logical integrity, evidence references, deduction chains)
 * 2. Telegram Copy (HTML tag balancing, disallowed tags, character limits, repetition)
 * 3. Visual Assets (dimensions, non-blank channel variance, Sharp decoding, fingerprinting)
 * 4. Investigation Polls & Clue Consistency
 */

import fs from 'node:fs';
import crypto from 'node:crypto';
import sharp from 'sharp';
import {
  MysteryCase,
  MysteryPostDraft,
  MysteryQCResult,
  MysteryVisualSpec,
} from './types.js';

export interface VisualValidationResult {
  isValid: boolean;
  errors: string[];
  width?: number;
  height?: number;
  fileSizeBytes?: number;
  isNotBlank?: boolean;
  channelStdevs?: number[];
}

export interface TextValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  charCount: number;
}

export class MysteryQualityChecker {
  /**
   * 1. Validate a MysteryCase for complete logical integrity, evidence links, and resolution consistency.
   */
  public static validateCase(mysteryCase: MysteryCase): MysteryQCResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Required Top-Level Fields
    if (!mysteryCase.caseId || mysteryCase.caseId.trim().length === 0) {
      errors.push('Case is missing a valid caseId.');
    }
    if (!mysteryCase.title || mysteryCase.title.trim().length === 0) {
      errors.push('Case is missing a title.');
    }
    if (!mysteryCase.premise || mysteryCase.premise.trim().length < 30) {
      errors.push('Case premise is missing or too brief (minimum 30 characters).');
    }
    if (!mysteryCase.mysteryQuestion || mysteryCase.mysteryQuestion.trim().length < 15) {
      errors.push('Case mysteryQuestion is missing or too brief (minimum 15 characters).');
    }
    if (!mysteryCase.setting || !mysteryCase.setting.location || mysteryCase.setting.location.trim().length === 0) {
      errors.push('Case setting.location is required.');
    }
    if (!['fictional', 'factual'].includes(mysteryCase.caseType)) {
      errors.push(`Invalid caseType: "${mysteryCase.caseType}". Must be "fictional" or "factual".`);
    }
    if (!['beginner', 'intermediate', 'expert'].includes(mysteryCase.difficulty)) {
      errors.push(`Invalid difficulty: "${mysteryCase.difficulty}". Must be "beginner", "intermediate", or "expert".`);
    }

    // 2. Characters / Suspects Integrity
    const characterIds = new Set<string>();
    const characterNames = new Set<string>();

    if (!Array.isArray(mysteryCase.characters) || mysteryCase.characters.length < 2) {
      errors.push('Case must contain at least 2 characters/persons of interest.');
    } else {
      mysteryCase.characters.forEach((char, idx) => {
        if (!char.id || !char.name || !char.role || !char.alibiOrMotive) {
          errors.push(`Character at index ${idx} is missing required fields (id, name, role, alibiOrMotive).`);
        }
        if (char.id) {
          if (characterIds.has(char.id)) {
            errors.push(`Duplicate character ID detected: "${char.id}".`);
          }
          characterIds.add(char.id);
        }
        if (char.name) {
          characterNames.add(char.name.toLowerCase().trim());
        }
      });
    }

    // 3. Evidence Integrity & ID Indexing
    const evidenceIds = new Set<string>();
    if (!Array.isArray(mysteryCase.evidence) || mysteryCase.evidence.length < 2) {
      errors.push('Case must contain at least 2 evidence items.');
    } else {
      mysteryCase.evidence.forEach((ev, idx) => {
        if (!ev.id || !ev.title || !ev.locationFound || !ev.significance) {
          errors.push(`Evidence at index ${idx} is missing required fields (id, title, locationFound, significance).`);
        }
        if (ev.id) {
          if (evidenceIds.has(ev.id)) {
            errors.push(`Duplicate evidence ID detected: "${ev.id}".`);
          }
          evidenceIds.add(ev.id);
        }
      });
    }

    // 4. Clue & Hypothesis Consistency
    if (!Array.isArray(mysteryCase.possibleExplanations) || mysteryCase.possibleExplanations.length < 2) {
      errors.push('Case must contain at least 2 possible explanations/hypotheses.');
    } else {
      mysteryCase.possibleExplanations.forEach((hyp) => {
        if (!hyp.hypothesis || hyp.hypothesis.trim().length < 10) {
          errors.push(`Hypothesis "${hyp.id}" text is missing or too brief.`);
        }
        // Verify referenced supporting evidence IDs exist
        if (Array.isArray(hyp.supportingEvidenceIds)) {
          hyp.supportingEvidenceIds.forEach((id) => {
            if (!evidenceIds.has(id)) {
              errors.push(`Hypothesis "${hyp.id}" references non-existent supporting evidence ID: "${id}".`);
            }
          });
        }
        // Verify referenced counter evidence IDs exist
        if (Array.isArray(hyp.counterEvidenceIds)) {
          hyp.counterEvidenceIds.forEach((id) => {
            if (!evidenceIds.has(id)) {
              errors.push(`Hypothesis "${hyp.id}" references non-existent counter evidence ID: "${id}".`);
            }
          });
        }
      });
    }

    // 5. Valid Correct Resolution
    const res = mysteryCase.correctResolution;
    if (!res) {
      errors.push('Case is missing correctResolution object.');
    } else {
      if (!res.answer || res.answer.trim().length < 15) {
        errors.push('Resolution answer is missing or too short.');
      }
      if (!res.culpritOrCause || res.culpritOrCause.trim().length === 0) {
        errors.push('Resolution culpritOrCause is required.');
      }
      if (!res.howDeductionWorks || res.howDeductionWorks.trim().length < 20) {
        errors.push('Resolution howDeductionWorks explanation is missing or incomplete (minimum 20 characters).');
      }
      if (!Array.isArray(res.keyClueIds) || res.keyClueIds.length === 0) {
        errors.push('Resolution must cite at least one key clue ID.');
      } else {
        res.keyClueIds.forEach((id) => {
          if (!evidenceIds.has(id)) {
            errors.push(`Resolution references non-existent key clue ID: "${id}".`);
          }
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      stats: {
        evidenceCount: mysteryCase.evidence?.length || 0,
        characterCount: mysteryCase.characters?.length || 0,
        explanationCount: mysteryCase.possibleExplanations?.length || 0,
        hasResolution: !!res && errors.length === 0,
      },
    };
  }

  /**
   * 2. Validate Telegram HTML Formatting and Tag Balancing.
   * Ensures no unallowed tags and no unclosed tags that cause Telegram 400 bad request errors.
   */
  public static validateTelegramHtml(html: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Disallowed HTML tags that Telegram Bot API rejects (use word boundaries to avoid matching pre as p)
    const disallowedTagsRegex = /<\/?\b(div|p|span|br|hr|h[1-6]|ul|ol|li|table|tr|td|th|script|style|iframe|img|button|input|form)\b[^>]*>/gi;
    const disallowedMatches = html.match(disallowedTagsRegex);
    if (disallowedMatches) {
      errors.push(`Text contains unsupported HTML tags for Telegram: ${Array.from(new Set(disallowedMatches)).join(', ')}`);
    }

    // Check balancing of allowed Telegram tags: b, i, code, s, u, pre, a, tg-spoiler
    const allowedTags = ['b', 'i', 'code', 's', 'u', 'pre', 'a', 'tg-spoiler'];
    for (const tag of allowedTags) {
      let openCount = 0;
      let closeCount = 0;

      if (tag === 'a') {
        const openA = html.match(/<a\b[^>]*>/gi);
        openCount = openA ? openA.length : 0;
      } else {
        const openTag = html.match(new RegExp(`<${tag}\\b[^>]*>`, 'gi'));
        openCount = openTag ? openTag.length : 0;
      }

      const closeTag = html.match(new RegExp(`</${tag}>`, 'gi'));
      closeCount = closeTag ? closeTag.length : 0;

      if (openCount !== closeCount) {
        errors.push(`Unbalanced <${tag}> tags: found ${openCount} opening and ${closeCount} closing tags.`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 3. Validate Telegram Text Copy (Length limits, repetition, empty checks).
   */
  public static validateTextCopy(
    text: string,
    isCaption = false,
    maxAllowedChars?: number
  ): TextValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const trimmed = text ? text.trim() : '';

    if (trimmed.length === 0) {
      errors.push('Text copy is empty.');
      return { isValid: false, errors, warnings, charCount: 0 };
    }

    const limit = maxAllowedChars ?? (isCaption ? 1024 : 4096);
    if (trimmed.length > limit) {
      errors.push(`Text length (${trimmed.length} chars) exceeds maximum allowed limit of ${limit} characters.`);
    }

    // HTML validation
    const htmlValidation = this.validateTelegramHtml(trimmed);
    if (!htmlValidation.isValid) {
      errors.push(...htmlValidation.errors);
    }

    // Repetition check: Detect identical consecutive or duplicate paragraphs
    const paragraphs = trimmed
      .split(/\n\s*\n/)
      .map((p) => p.trim().toLowerCase())
      .filter((p) => p.length > 20);

    const seenParagraphs = new Set<string>();
    for (const p of paragraphs) {
      if (seenParagraphs.has(p)) {
        errors.push(`Duplicate/repeated paragraph detected: "${p.slice(0, 40)}..."`);
      }
      seenParagraphs.add(p);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      charCount: trimmed.length,
    };
  }

  /**
   * 4. Validate an investigation post draft before sending to Telegram.
   */
  public static validateDraft(draft: MysteryPostDraft): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!draft.caseId || draft.caseId.trim().length === 0) {
      errors.push('Draft missing caseId.');
    }
    if (!draft.headline || draft.headline.trim().length === 0) {
      errors.push('Draft missing headline.');
    }
    if (!draft.hook || draft.hook.trim().length === 0) {
      errors.push('Draft missing hook.');
    }
    if (!draft.format) {
      errors.push('Draft missing format.');
    }

    // Validate draft paragraphs
    if (Array.isArray(draft.bodyParagraphs)) {
      const fullBody = draft.bodyParagraphs.join('\n\n');
      const bodyValidation = this.validateTextCopy(fullBody, false);
      if (!bodyValidation.isValid) {
        errors.push(...bodyValidation.errors);
      }
    }

    // Format-specific validations
    if (draft.format === 'INVESTIGATION_POLL') {
      if (!draft.poll) {
        errors.push('INVESTIGATION_POLL draft must contain a poll definition.');
      } else {
        if (!draft.poll.question || draft.poll.question.trim().length < 5) {
          errors.push('Poll question is missing or too short.');
        }
        if (!Array.isArray(draft.poll.options) || draft.poll.options.length < 2 || draft.poll.options.length > 4) {
          errors.push('Poll must have between 2 and 4 options.');
        } else {
          const uniqueOpts = new Set(draft.poll.options.map((o) => o.trim().toLowerCase()));
          if (uniqueOpts.size !== draft.poll.options.length) {
            errors.push('Poll options must be distinct and non-duplicate.');
          }
          draft.poll.options.forEach((opt, idx) => {
            if (!opt || opt.trim().length === 0) {
              errors.push(`Poll option at index ${idx} is empty.`);
            }
            if (opt.length > 100) {
              errors.push(`Poll option at index ${idx} exceeds 100 characters.`);
            }
          });
        }
      }
    }

    if (draft.format === 'FINAL_REVEAL') {
      if (!draft.revealDetail || !draft.revealDetail.culpritOrCause || !draft.revealDetail.trueExplanation) {
        errors.push('FINAL_REVEAL draft must include culpritOrCause and trueExplanation.');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 5. Validate a generated image file for existence, dimensions, Sharp decoding,
   * and verify that it is NOT effectively blank / single-color.
   */
  public static async validateVisualAsset(
    filePath: string,
    expectedWidth = 1200,
    expectedHeight = 675
  ): Promise<VisualValidationResult> {
    const errors: string[] = [];

    if (!fs.existsSync(filePath)) {
      return {
        isValid: false,
        errors: [`Image file does not exist at path: ${filePath}`],
      };
    }

    const stat = fs.statSync(filePath);
    if (stat.size === 0) {
      return {
        isValid: false,
        errors: [`Image file at ${filePath} is empty (0 bytes).`],
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

      // Check for blank / solid image using Sharp statistics
      const stats = await image.stats();
      const channelStdevs = stats.channels.map((c) => c.stdev);

      // If all channels have standard deviation < 2.0, the image is uniform/blank
      const isNotBlank = channelStdevs.some((stdev) => stdev >= 2.0);
      if (!isNotBlank) {
        errors.push(`Image is effectively blank or solid color (channel standard deviations: [${channelStdevs.map((s) => s.toFixed(2)).join(', ')}]).`);
      }

      return {
        isValid: errors.length === 0,
        errors,
        width,
        height,
        fileSizeBytes: stat.size,
        isNotBlank,
        channelStdevs,
      };
    } catch (err: any) {
      return {
        isValid: false,
        errors: [`Failed to parse image file with Sharp: ${err.message}`],
        fileSizeBytes: stat.size,
      };
    }
  }

  /**
   * 6. Validate Visual Spec completeness (ensures all required fields for rendering are present).
   */
  public static validateVisualSpec(spec: MysteryVisualSpec): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!spec.title || spec.title.trim().length === 0) {
      errors.push('VisualSpec is missing title.');
    }
    if (!spec.caseId || spec.caseId.trim().length === 0) {
      errors.push('VisualSpec is missing caseId.');
    }
    if (!spec.template) {
      errors.push('VisualSpec is missing template.');
    }
    if (!spec.payload || !spec.payload.data) {
      errors.push('VisualSpec is missing payload data.');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 7. Generate a unique cryptographic hash of a post draft or visual spec to detect duplicates.
   */
  public static computeDraftFingerprint(draft: MysteryPostDraft): string {
    const payload = {
      caseId: draft.caseId,
      format: draft.format,
      headline: draft.headline,
      body: draft.bodyParagraphs,
      poll: draft.poll,
    };
    return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }
}

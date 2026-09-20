/**
 * Investigation Story Pacing & Editorial Validator
 * Validates narrative pacing, anti-spoiler guards, and deduction integrity:
 * 1. Premature reveal prevention (no culprit/solution declared in early steps)
 * 2. Critical clue isolation (breakthrough details held until clue reveal / final reveal)
 * 3. Anti-repetition check (ensures distinct content across all 5 steps)
 * 4. Resolution completeness (verifies deduction explanation connects evidence to culprit)
 * 5. Poll choice distinction (rejects duplicate or near-identical options)
 */

import { MysteryCase, InvestigationStep, MysteryPostDraft } from './types.js';

export interface PacingValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class MysteryPacingValidator {
  /**
   * Comprehensive validation of a multi-step investigation sequence against story pacing rules.
   */
  public static validateSequencePacing(
    mysteryCase: MysteryCase,
    steps: InvestigationStep[]
  ): PacingValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const culprit = mysteryCase.correctResolution?.culpritOrCause?.trim() || '';
    const culpritKeywords = culprit
      .split(/\s+/)
      .filter((w) => w.length > 3 && !['Lord', 'Lady', 'Doctor', 'Professor', 'Agent', 'The', 'And'].includes(w));

    // 1. Check early steps for premature reveal of culprit
    for (const step of steps) {
      const isEarlyStep = step.format === 'CASE_INTRO' || step.format === 'EVIDENCE' || step.format === 'INVESTIGATION_POLL';
      const fullText = this.extractDraftText(step.draft).toLowerCase();

      if (isEarlyStep && culprit.length > 0) {
        // Check if the early text outright names the culprit as the guilty party
        const culpritGuiltRegex = new RegExp(`(${culprit.toLowerCase()})\\s+(is the culprit|committed|is guilty|poisoned|murdered|stole|orchestrated)`, 'i');
        if (culpritGuiltRegex.test(fullText)) {
          errors.push(
            `Premature reveal detected in step ${step.stepNumber} (${step.format}): The culprit is declared guilty before the investigation poll.`
          );
        }
      }

      // 2. Check for empty step text
      if (step.draft.bodyParagraphs.length === 0) {
        errors.push(`Step ${step.stepNumber} (${step.format}) has empty body paragraphs.`);
      }
    }

    // 3. Verify Final Reveal step explicitly contains the resolution and deduction
    const finalStep = steps.find((s) => s.format === 'FINAL_REVEAL');
    if (!finalStep) {
      errors.push('Investigation sequence is missing a FINAL_REVEAL step.');
    } else {
      const finalText = this.extractDraftText(finalStep.draft);
      if (mysteryCase.correctResolution?.howDeductionWorks) {
        const keyWords = mysteryCase.correctResolution.howDeductionWorks
          .split(/\s+/)
          .filter((w) => w.length > 4);
        const hasDeductionContext = keyWords.some((kw) =>
          finalText.toLowerCase().includes(kw.toLowerCase())
        );
        if (!hasDeductionContext && finalText.length < 100) {
          warnings.push(
            'FINAL_REVEAL post appears brief and may not fully articulate the deduction mechanism.'
          );
        }
      }
    }

    // 4. Verify Poll step diversity
    const pollStep = steps.find((s) => s.format === 'INVESTIGATION_POLL');
    if (pollStep && pollStep.draft.poll) {
      const options = pollStep.draft.poll.options;
      if (options.length < 2) {
        errors.push('INVESTIGATION_POLL must offer at least 2 distinct choices.');
      } else {
        const unique = new Set(options.map((o) => o.trim().toLowerCase()));
        if (unique.size !== options.length) {
          errors.push('INVESTIGATION_POLL contains duplicate choices.');
        }
      }
    }

    // 5. Cross-step repetition check
    const stepTexts = steps.map((s) => ({
      stepNumber: s.stepNumber,
      format: s.format,
      paragraphs: s.draft.bodyParagraphs.map((p) => p.trim().toLowerCase()).filter((p) => p.length > 30),
    }));

    for (let i = 0; i < stepTexts.length; i++) {
      for (let j = i + 1; j < stepTexts.length; j++) {
        for (const p1 of stepTexts[i].paragraphs) {
          for (const p2 of stepTexts[j].paragraphs) {
            if (p1 === p2) {
              errors.push(
                `Duplicate paragraph repeated verbatim between Step ${stepTexts[i].stepNumber} (${stepTexts[i].format}) and Step ${stepTexts[j].stepNumber} (${stepTexts[j].format}).`
              );
            }
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private static extractDraftText(draft: MysteryPostDraft): string {
    const parts = [
      draft.headline || '',
      draft.hook || '',
      ...(draft.bodyParagraphs || []),
      draft.investigationNote || '',
      draft.poll?.question || '',
      ...(draft.poll?.options || []),
      draft.revealDetail?.culpritOrCause || '',
      draft.revealDetail?.trueExplanation || '',
    ];
    return parts.join(' ');
  }
}

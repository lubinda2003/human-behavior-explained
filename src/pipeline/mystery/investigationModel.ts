/**
 * Investigation Model
 * Transforms a structured MysteryCase into an interactive sequential investigation.
 * Generates posts for:
 * 1. CASE_INTRO - The dossier, hook, premise, and primary mystery question.
 * 2. EVIDENCE - Deep dive forensic breakdown of key physical/documentary clues.
 * 3. INVESTIGATION_POLL - Interactive audience decision poll ("Which lead should we pursue?").
 * 4. CLUE_REVEAL - Breakthrough forensic deduction unlocking new details.
 * 5. FINAL_REVEAL - Complete resolution with culprit/cause and logical deduction.
 */

import {
  MysteryCase,
  InvestigationSequence,
  InvestigationStep,
  MysteryPostDraft,
  MysteryVisualSpec,
} from './types.js';

export class InvestigationModel {
  /**
   * Build the complete 5-step investigation sequence for a mystery case.
   */
  public static buildFiveStepSequence(mysteryCase: MysteryCase): InvestigationSequence {
    return this.buildInvestigationSequence(mysteryCase);
  }

  /**
   * Build the complete multi-step investigation sequence for a mystery case.
   */
  public static buildInvestigationSequence(mysteryCase: MysteryCase): InvestigationSequence {
    const steps: InvestigationStep[] = [];

    // Step 1: CASE_INTRO
    const introDraft = this.buildCaseIntroDraft(mysteryCase);
    steps.push({
      stepNumber: 1,
      format: 'CASE_INTRO',
      draft: introDraft,
      visualSpec: this.buildCaseCoverSpec(mysteryCase),
    });

    // Step 2: EVIDENCE (Primary physical clue spotlight)
    const primaryEvidence = mysteryCase.evidence[0] || {
      id: 'ev-default',
      title: 'Initial Crime Scene Anomalies',
      type: 'physical' as const,
      locationFound: mysteryCase.setting.location,
      significance: 'Key contradictory elements found at the scene.',
    };
    const evidenceDraft = this.buildEvidenceDraft(mysteryCase, primaryEvidence);
    steps.push({
      stepNumber: 2,
      format: 'EVIDENCE',
      draft: evidenceDraft,
      visualSpec: this.buildEvidenceCardSpec(mysteryCase, primaryEvidence),
    });

    // Step 3: INVESTIGATION_POLL
    const pollDraft = this.buildInvestigationPollDraft(mysteryCase);
    steps.push({
      stepNumber: 3,
      format: 'INVESTIGATION_POLL',
      draft: pollDraft,
    });

    // Step 4: CLUE_REVEAL (Breakthrough clue)
    const breakthroughEvidence = mysteryCase.evidence[1] || primaryEvidence;
    const clueDraft = this.buildClueRevealDraft(mysteryCase, breakthroughEvidence);
    steps.push({
      stepNumber: 4,
      format: 'CLUE_REVEAL',
      draft: clueDraft,
      visualSpec: this.buildClueCardSpec(mysteryCase, breakthroughEvidence),
    });

    // Step 5: FINAL_REVEAL
    const revealDraft = this.buildFinalRevealDraft(mysteryCase);
    steps.push({
      stepNumber: 5,
      format: 'FINAL_REVEAL',
      draft: revealDraft,
      visualSpec: this.buildFinalRevealCardSpec(mysteryCase),
    });

    return {
      caseId: mysteryCase.caseId,
      caseTitle: mysteryCase.title,
      difficulty: mysteryCase.difficulty,
      steps,
      createdAt: new Date().toISOString(),
    };
  }

  // --- Step Draft Builders ---

  public static buildCaseIntroDraft(mysteryCase: MysteryCase): MysteryPostDraft {
    const suspectList = mysteryCase.characters
      .map((c) => `• <b>${c.name}</b> (${c.role}): ${c.description}`)
      .join('\n');

    return {
      caseId: mysteryCase.caseId,
      caseTitle: mysteryCase.title,
      format: 'CASE_INTRO',
      headline: `CASE FILE ${mysteryCase.caseId}: ${mysteryCase.title}`,
      hook: mysteryCase.premise,
      bodyParagraphs: [
        `📍 <b>Setting:</b> ${mysteryCase.setting.location}${mysteryCase.setting.atmosphere ? ` — <i>${mysteryCase.setting.atmosphere}</i>` : ''}`,
        `❓ <b>The Core Enigma:</b>\n${mysteryCase.mysteryQuestion}`,
        `👥 <b>Persons of Interest:</b>\n${suspectList}`,
      ],
      callToAction: 'Examine the facts above. What detail immediately strikes you as impossible?',
      visualSpec: this.buildCaseCoverSpec(mysteryCase),
    };
  }

  public static buildEvidenceDraft(
    mysteryCase: MysteryCase,
    evidence: MysteryCase['evidence'][0]
  ): MysteryPostDraft {
    return {
      caseId: mysteryCase.caseId,
      caseTitle: mysteryCase.title,
      format: 'EVIDENCE',
      headline: `EVIDENCE LOG #${evidence.id.toUpperCase()}: ${evidence.title}`,
      hook: `Investigators cataloging ${mysteryCase.setting.location} uncovered a critical anomaly.`,
      bodyParagraphs: [
        `🧪 <b>Classification:</b> ${evidence.type.toUpperCase()} EVIDENCE`,
        `📍 <b>Location Discovered:</b> ${evidence.locationFound}`,
        `🔍 <b>Forensic Significance:</b>\n${evidence.significance}`,
        evidence.analysis ? `📋 <b>Technical Breakdown:</b>\n${evidence.analysis}` : '',
      ].filter(Boolean),
      evidenceSpotlight: evidence,
      callToAction: 'How does this physical artifact contradict the initial testimonies?',
      visualSpec: this.buildEvidenceCardSpec(mysteryCase, evidence),
    };
  }

  public static buildInvestigationPollDraft(mysteryCase: MysteryCase): MysteryPostDraft {
    const options: string[] = [];

    // Formulate poll choices from hypotheses or suspect interrogation paths
    if (mysteryCase.possibleExplanations.length >= 2) {
      mysteryCase.possibleExplanations.slice(0, 3).forEach((h) => {
        options.push(h.hypothesis.slice(0, 90));
      });
    } else if (mysteryCase.characters.length >= 2) {
      mysteryCase.characters.slice(0, 3).forEach((c) => {
        options.push(`Interrogate ${c.name} (${c.role})`);
      });
    } else {
      options.push('Analyze forensic timing logs');
      options.push('Re-examine physical entry points');
      options.push('Cross-reference chemical residues');
    }

    return {
      caseId: mysteryCase.caseId,
      caseTitle: mysteryCase.title,
      format: 'INVESTIGATION_POLL',
      headline: `INVESTIGATION DIRECTIVE: ${mysteryCase.title}`,
      hook: 'Detectives have gathered the initial forensic reports. The investigation now branches.',
      bodyParagraphs: [
        `The clock is ticking on ${mysteryCase.caseId}. Review the physical evidence and cast your vote on which lead the forensic unit must pursue first.`,
      ],
      poll: {
        question: `Which investigative angle holds the key to solving ${mysteryCase.title}?`,
        options: options.slice(0, 4),
        explanation: 'Vote above to direct the next phase of the investigation.',
      },
      callToAction: 'Cast your vote above. The breakthrough clue will be revealed next.',
    };
  }

  public static buildClueRevealDraft(
    mysteryCase: MysteryCase,
    clue: MysteryCase['evidence'][0]
  ): MysteryPostDraft {
    return {
      caseId: mysteryCase.caseId,
      caseTitle: mysteryCase.title,
      format: 'CLUE_REVEAL',
      headline: `CRITICAL BREAKTHROUGH: ${clue.title}`,
      hook: 'Following the investigative lead, forensic specialists ran advanced tests on the recovered evidence.',
      bodyParagraphs: [
        `💡 <b>The Key Discovery:</b>\n${clue.significance}`,
        clue.analysis ? `🔬 <b>Laboratory Verification:</b>\n${clue.analysis}` : '',
        `This finding directly exposes the flaw in the perpetrator’s alibi.`,
      ].filter(Boolean),
      clueDetail: {
        clueTitle: clue.title,
        breakthrough: clue.significance,
        significance: clue.analysis || clue.description || clue.significance,
        evidenceId: clue.id,
      },
      callToAction: 'With this piece of the puzzle locked in place, who is the true culprit?',
      visualSpec: this.buildClueCardSpec(mysteryCase, clue),
    };
  }

  public static buildFinalRevealDraft(mysteryCase: MysteryCase): MysteryPostDraft {
    const res = mysteryCase.correctResolution;
    return {
      caseId: mysteryCase.caseId,
      caseTitle: mysteryCase.title,
      format: 'FINAL_REVEAL',
      headline: `CASE CLOSED: The Resolution of ${mysteryCase.title}`,
      hook: `The forensic analysis is complete. Here is the undeniable truth behind ${mysteryCase.caseId}.`,
      bodyParagraphs: [
        `⚖️ <b>The Solution:</b>\n${res.answer}`,
        `👤 <b>Culprit / Root Cause:</b>\n${res.culpritOrCause}`,
        `🧩 <b>The Deduction Chain:</b>\n${res.howDeductionWorks}`,
        res.aftermathOrConclusion ? `📁 <b>Case Epilogue:</b>\n${res.aftermathOrConclusion}` : '',
      ].filter(Boolean),
      revealDetail: {
        culpritOrCause: res.culpritOrCause,
        trueExplanation: res.answer,
      },
      callToAction: 'Did your deduction match the forensic evidence? Look out for the next case file.',
      visualSpec: this.buildFinalRevealCardSpec(mysteryCase),
    };
  }

  // --- Visual Spec Builders ---

  public static buildCaseCoverSpec(mysteryCase: MysteryCase): MysteryVisualSpec {
    return {
      title: mysteryCase.title,
      subtitle: `Case File ${mysteryCase.caseId}`,
      tag: 'ACTIVE INVESTIGATION',
      caseId: mysteryCase.caseId,
      template: 'case_cover_card',
      payload: {
        template: 'case_cover_card',
        data: {
          caseNumber: mysteryCase.caseId,
          title: mysteryCase.title,
          premiseSummary: mysteryCase.premise.slice(0, 160) + (mysteryCase.premise.length > 160 ? '...' : ''),
          location: mysteryCase.setting.location,
          difficulty: mysteryCase.difficulty,
          suspectCount: mysteryCase.characters.length,
          evidenceCount: mysteryCase.evidence.length,
          mysteryQuestion: mysteryCase.mysteryQuestion,
        },
      },
    };
  }

  public static buildEvidenceCardSpec(
    mysteryCase: MysteryCase,
    evidence: MysteryCase['evidence'][0]
  ): MysteryVisualSpec {
    return {
      title: evidence.title,
      subtitle: `Evidence Item ${evidence.id.toUpperCase()}`,
      tag: `${evidence.type.toUpperCase()} SPECIMEN`,
      caseId: mysteryCase.caseId,
      template: 'evidence_card',
      payload: {
        template: 'evidence_card',
        data: {
          caseNumber: mysteryCase.caseId,
          evidenceId: evidence.id.toUpperCase(),
          title: evidence.title,
          type: evidence.type,
          locationFound: evidence.locationFound,
          forensicObservation: evidence.description || evidence.significance,
          significanceNote: evidence.analysis || evidence.significance,
        },
      },
    };
  }

  public static buildClueCardSpec(
    mysteryCase: MysteryCase,
    clue: MysteryCase['evidence'][0]
  ): MysteryVisualSpec {
    return {
      title: clue.title,
      subtitle: `Breakthrough Clue: ${clue.id.toUpperCase()}`,
      tag: 'FORENSIC CLUE',
      caseId: mysteryCase.caseId,
      template: 'clue_card',
      payload: {
        template: 'clue_card',
        data: {
          caseNumber: mysteryCase.caseId,
          clueTitle: clue.title,
          evidenceRef: clue.id.toUpperCase(),
          discoveryText: clue.significance,
          deductionHint: clue.analysis || 'Contradicts initial timeline statements.',
        },
      },
    };
  }

  public static buildFinalRevealSpec(mysteryCase: MysteryCase): MysteryVisualSpec {
    return this.buildFinalRevealCardSpec(mysteryCase);
  }

  public static buildFinalRevealCardSpec(mysteryCase: MysteryCase): MysteryVisualSpec {
    return {
      title: mysteryCase.title,
      subtitle: `Case Resolution: ${mysteryCase.caseId}`,
      tag: 'CASE SOLVED',
      caseId: mysteryCase.caseId,
      template: 'final_reveal_card',
      payload: {
        template: 'final_reveal_card',
        data: {
          caseNumber: mysteryCase.caseId,
          caseTitle: mysteryCase.title,
          culpritOrCause: mysteryCase.correctResolution.culpritOrCause,
          coreBreakthrough: mysteryCase.correctResolution.howDeductionWorks,
          keyEvidenceCited: mysteryCase.correctResolution.keyClueIds.map((id) => id.toUpperCase()),
          caseStatus: 'CASE SOLVED',
        },
      },
    };
  }
}

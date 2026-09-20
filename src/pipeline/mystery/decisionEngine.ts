/**
 * Poll Decision Engine & Branch Generator
 * Deterministically maps case hypotheses & evidence into controlled investigation branches (2-4 paths).
 * Resolves audience poll choices into contextual clue breakthroughs and state transitions.
 */

import {
  MysteryCase,
  InvestigationState,
  InvestigationChoice,
  InvestigationBranch,
  SelectedChoiceRecord,
  MysteryPostDraft,
  MysteryVisualSpec,
  InvestigationStep,
} from './types.js';

export interface BranchResolutionResult {
  branch: InvestigationBranch;
  step: InvestigationStep;
  unlockedEvidenceId: string;
  selectedChoice: SelectedChoiceRecord;
}

export class PollDecisionEngine {
  /**
   * Build controlled investigation branches (2 to 4) from a MysteryCase.
   */
  public static buildBranches(mysteryCase: MysteryCase): {
    branches: Record<string, InvestigationBranch>;
    choices: InvestigationChoice[];
  } {
    const branches: Record<string, InvestigationBranch> = {};
    const choices: InvestigationChoice[] = [];

    const evidenceList = mysteryCase.evidence || [];
    const explanations = mysteryCase.possibleExplanations || [];
    const characters = mysteryCase.characters || [];
    const primarySuspect = characters.find((c) => c.isSuspect) || characters[0];

    // Build between 2 and 4 controlled branches based on available explanations
    const branchCount = Math.min(Math.max(explanations.length, 2), 4);

    for (let i = 0; i < branchCount; i++) {
      const branchId = `branch-${i}`;
      const hyp = explanations[i];
      const assignedEvidence =
        evidenceList[i + 1] || evidenceList[i] || evidenceList[0] || {
          id: `ev-lead-${i}`,
          title: `Forensic Lead #${i + 1}`,
          significance: 'Critical anomaly uncovered during interrogation.',
        };

      let title = `Investigate Lead #${i + 1}`;
      let hypothesisOrLead = hyp ? hyp.hypothesis : `Pursue suspect ${primarySuspect?.name || 'anomaly'}`;
      let discoveryNote = '';
      let deductionHint = '';
      let focusAngle = '';

      if (i === 0) {
        // Branch 0: Primary Suspect / Alibi focus
        title = `Examine ${primarySuspect?.name || 'Primary Suspect'} Alibi & Records`;
        focusAngle = `Deep-dive interrogation and timeline cross-reference for ${primarySuspect?.name || 'suspect'}.`;
        discoveryNote = `Subpoenaed records and physical scrutiny reveal an unverified 30-minute window in the stated alibi. Item #${assignedEvidence.id.toUpperCase()} contradicts their presence.`;
        deductionHint = `Eliminates the claim of being in a different wing during the critical event window.`;
      } else if (i === 1) {
        // Branch 1: Mechanical / Chemical / Physical Forensic Angle
        title = `Forensic Lab Analysis of ${assignedEvidence.title}`;
        focusAngle = `Chemical residue and mechanical stress analysis of crime scene evidence.`;
        discoveryNote = `Spectrometric testing on #${assignedEvidence.id.toUpperCase()} confirms intentional chemical or mechanical tampering prior to the room sealing.`;
        deductionHint = `Proves the mechanism did not require direct human intervention at the moment of detonation or exposure.`;
      } else if (i === 2) {
        // Branch 2: Secondary Suspect / Keyholder Angle
        const secSuspect = characters.filter((c) => c.id !== primarySuspect?.id)[0] || characters[1];
        title = `Audit ${secSuspect?.name || 'Secondary Keyholder'} Access & Actions`;
        focusAngle = `Security logs and master keyholder verification.`;
        discoveryNote = `Keyholder audit clears ${secSuspect?.name || 'witness'} of direct tampering, but reveals unauthorized access to the maintenance vents.`;
        deductionHint = `Directs attention away from direct physical entry and points to the automated ventilation channels.`;
      } else {
        // Branch 3: Alternative Anomaly Angle
        title = `Reconstruct Crime Scene Timeline & Vectors`;
        focusAngle = `Spatial trajectory and entry/exit vector mapping.`;
        discoveryNote = `Acoustic and spatial mapping prove no external intruder entered after the master lock engaged.`;
        deductionHint = `Confirms the culprit acted entirely through an automated pre-set trigger.`;
      }

      const branch: InvestigationBranch = {
        branchId,
        title,
        hypothesisOrLead,
        unlockedEvidenceId: assignedEvidence.id,
        discoveryNote,
        deductionHint,
        isDirectResolutionLead: i === 0 || i === 1,
      };

      branches[branchId] = branch;

      // Create matching InvestigationChoice for audience poll
      choices.push({
        id: `choice-${i}`,
        optionIndex: i,
        label: hyp ? hyp.hypothesis.slice(0, 95) : title.slice(0, 95),
        targetBranchId: branchId,
        focusAngle,
        clueIdToReveal: assignedEvidence.id,
      });
    }

    return { branches, choices };
  }

  /**
   * Validate that a chosen option index or choice ID is valid and exists in state.
   */
  public static validateChoice(
    state: InvestigationState,
    choiceIdentifier: number | string
  ): { isValid: boolean; choice?: InvestigationChoice; error?: string } {
    if (!Array.isArray(state.availableChoices) || state.availableChoices.length === 0) {
      return { isValid: false, error: 'No available choices configured in investigation state.' };
    }

    let choice: InvestigationChoice | undefined;

    if (typeof choiceIdentifier === 'number') {
      if (choiceIdentifier < 0 || choiceIdentifier >= state.availableChoices.length) {
        return {
          isValid: false,
          error: `Choice index ${choiceIdentifier} is out of bounds (allowed: 0 to ${state.availableChoices.length - 1}).`,
        };
      }
      choice = state.availableChoices[choiceIdentifier];
    } else if (typeof choiceIdentifier === 'string') {
      choice = state.availableChoices.find(
        (c) => c.id === choiceIdentifier || c.targetBranchId === choiceIdentifier
      );
      if (!choice) {
        return {
          isValid: false,
          error: `Choice ID or branch "${choiceIdentifier}" not found in available choices.`,
        };
      }
    }

    if (!choice) {
      return { isValid: false, error: `Invalid choice identifier: ${choiceIdentifier}` };
    }

    const branch = state.branches[choice.targetBranchId];
    if (!branch) {
      return {
        isValid: false,
        error: `Choice references missing target branch "${choice.targetBranchId}".`,
      };
    }

    return { isValid: true, choice };
  }

  /**
   * Resolve an audience poll choice into the contextual CLUE_REVEAL step and update state.
   */
  public static resolveChoice(
    state: InvestigationState,
    choiceIdentifier: number | string,
    mysteryCase: MysteryCase,
    voteMetadata?: { votePercentage?: number; totalVotes?: number }
  ): BranchResolutionResult {
    const validation = this.validateChoice(state, choiceIdentifier);
    if (!validation.isValid || !validation.choice) {
      throw new Error(`Cannot resolve invalid investigation choice: ${validation.error}`);
    }

    const choice = validation.choice;
    const branch = state.branches[choice.targetBranchId];

    const selectedChoiceRecord: SelectedChoiceRecord = {
      choiceId: choice.id,
      optionIndex: choice.optionIndex,
      label: choice.label,
      targetBranchId: branch.branchId,
      votePercentage: voteMetadata?.votePercentage ?? 64,
      totalVotes: voteMetadata?.totalVotes ?? 128,
      selectedAt: new Date().toISOString(),
    };

    // Find the corresponding evidence item or build fallback
    const evidenceItem =
      mysteryCase.evidence.find((e) => e.id === branch.unlockedEvidenceId) ||
      mysteryCase.evidence[1] ||
      mysteryCase.evidence[0];

    // Build contextual Post Draft for CLUE_REVEAL based on chosen branch
    const clueDraft: MysteryPostDraft = {
      caseId: mysteryCase.caseId,
      caseTitle: mysteryCase.title,
      format: 'CLUE_REVEAL',
      headline: `INVESTIGATION BREAKTHROUGH: Lead Unveiled`,
      hook: `The audience voted (${selectedChoiceRecord.votePercentage}% majority) to pursue: "${choice.label}".`,
      bodyParagraphs: [
        `Investigators directed all resources toward: <i>${branch.title}</i>.`,
        `<b>Forensic Finding:</b> ${branch.discoveryNote}`,
        `<b>Deduction Consequence:</b> ${branch.deductionHint}`,
        `This new breakthrough directly challenges the initial alibis and sets the stage for the final resolution.`,
      ],
      investigationNote: `Unlocks Evidence Ref: #${evidenceItem.id.toUpperCase()} (${evidenceItem.title})`,
    };

    // Build Visual Spec for Clue Card
    const clueVisualSpec: MysteryVisualSpec = {
      title: branch.title,
      caseId: mysteryCase.caseId,
      tag: 'FORENSIC BREAKTHROUGH',
      template: 'clue_card',
      payload: {
        template: 'clue_card',
        data: {
          caseNumber: mysteryCase.caseId,
          clueTitle: branch.title,
          evidenceRef: evidenceItem.id,
          discoveryText: branch.discoveryNote,
          deductionHint: branch.deductionHint,
        },
      },
    };

    const step: InvestigationStep = {
      stepNumber: 4,
      format: 'CLUE_REVEAL',
      draft: clueDraft,
      visualSpec: clueVisualSpec,
    };

    return {
      branch,
      step,
      unlockedEvidenceId: evidenceItem.id,
      selectedChoice: selectedChoiceRecord,
    };
  }
}

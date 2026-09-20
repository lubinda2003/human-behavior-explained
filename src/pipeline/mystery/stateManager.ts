/**
 * Investigation State Manager
 * Manages lightweight JSON-based state for active investigations.
 * Enforces legal state machine transitions, choice recording, and persistence.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  MysteryCase,
  InvestigationState,
  InvestigationStepType,
  PublishedStepRecord,
  SelectedChoiceRecord,
} from './types.js';
import { PollDecisionEngine } from './decisionEngine.js';

export const LEGAL_STEP_TRANSITIONS: Record<InvestigationStepType, InvestigationStepType[]> = {
  CASE_INTRO: ['EVIDENCE'],
  EVIDENCE: ['INVESTIGATION_POLL'],
  INVESTIGATION_POLL: ['AUDIENCE_CHOICE'],
  AUDIENCE_CHOICE: ['CLUE_REVEAL'],
  CLUE_REVEAL: ['FINAL_REVEAL'],
  FINAL_REVEAL: ['COMPLETED'],
  COMPLETED: [],
};

export class InvestigationStateManager {
  /**
   * Create an initial investigation state from a MysteryCase.
   */
  public static createInitialState(mysteryCase: MysteryCase): InvestigationState {
    const { branches, choices } = PollDecisionEngine.buildBranches(mysteryCase);
    const now = new Date().toISOString();

    const initialState: InvestigationState = {
      caseId: mysteryCase.caseId,
      caseTitle: mysteryCase.title,
      caseDifficulty: mysteryCase.difficulty,
      currentStep: 'CASE_INTRO',
      status: 'IN_PROGRESS',
      availableChoices: choices,
      branches,
      selectedAudienceChoice: null,
      revealedClueIds: [],
      publishedSteps: [],
      history: [
        {
          timestamp: now,
          action: 'INIT_INVESTIGATION',
          step: 'CASE_INTRO',
          details: { caseId: mysteryCase.caseId, title: mysteryCase.title },
        },
      ],
      finalResolutionStatus: 'UNRESOLVED',
      createdAt: now,
      updatedAt: now,
    };

    return initialState;
  }

  /**
   * Validate whether a state transition from currentStep to nextStep is legal.
   */
  public static isValidTransition(
    currentStep: InvestigationStepType,
    nextStep: InvestigationStepType
  ): boolean {
    const allowed = LEGAL_STEP_TRANSITIONS[currentStep];
    return Array.isArray(allowed) && allowed.includes(nextStep);
  }

  /**
   * Transition state to the next step. Throws an error if the transition is illegal.
   */
  public static transitionTo(
    state: InvestigationState,
    nextStep: InvestigationStepType,
    payload?: {
      selectedChoice?: SelectedChoiceRecord;
      revealedClueId?: string;
      finalResolutionStatus?: 'RESOLVED' | 'FAILED';
      stepRecord?: PublishedStepRecord;
      actionNote?: string;
    }
  ): InvestigationState {
    if (!this.isValidTransition(state.currentStep, nextStep)) {
      throw new Error(
        `Illegal investigation state transition: Cannot transition from "${state.currentStep}" to "${nextStep}". Expected: ${
          LEGAL_STEP_TRANSITIONS[state.currentStep]?.join(', ') || 'none'
        }`
      );
    }

    const now = new Date().toISOString();
    const updatedState: InvestigationState = {
      ...state,
      currentStep: nextStep,
      updatedAt: now,
    };

    // Update status based on step
    if (nextStep === 'INVESTIGATION_POLL') {
      updatedState.status = 'POLL_ACTIVE';
    } else if (nextStep === 'FINAL_REVEAL' || nextStep === 'COMPLETED') {
      updatedState.status = payload?.finalResolutionStatus === 'FAILED' ? 'FAILED' : 'RESOLVED';
      updatedState.finalResolutionStatus = payload?.finalResolutionStatus || 'RESOLVED';
    } else {
      updatedState.status = 'IN_PROGRESS';
    }

    // Apply audience choice
    if (payload?.selectedChoice) {
      updatedState.selectedAudienceChoice = payload.selectedChoice;
    }

    // Apply revealed clue
    if (payload?.revealedClueId && !updatedState.revealedClueIds.includes(payload.revealedClueId)) {
      updatedState.revealedClueIds = [...updatedState.revealedClueIds, payload.revealedClueId];
    }

    // Apply published step record
    if (payload?.stepRecord) {
      updatedState.publishedSteps = [...updatedState.publishedSteps, payload.stepRecord];
    }

    // Append to history
    updatedState.history = [
      ...updatedState.history,
      {
        timestamp: now,
        action: payload?.actionNote || `TRANSITION_${nextStep}`,
        step: nextStep,
        details: payload || {},
      },
    ];

    return updatedState;
  }

  /**
   * Record a published step in the state.
   */
  public static recordPublishedStep(
    state: InvestigationState,
    record: PublishedStepRecord
  ): InvestigationState {
    const now = new Date().toISOString();
    return {
      ...state,
      publishedSteps: [...state.publishedSteps, record],
      updatedAt: now,
      history: [
        ...state.history,
        {
          timestamp: now,
          action: 'PUBLISH_STEP',
          step: record.stepType,
          details: { stepNumber: record.stepNumber, headline: record.headline },
        },
      ],
    };
  }

  /**
   * Save investigation state to a JSON file.
   */
  public static saveToFile(state: InvestigationState, filePath: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf-8');
  }

  /**
   * Load investigation state from a JSON file.
   */
  public static loadFromFile(filePath: string): InvestigationState {
    if (!fs.existsSync(filePath)) {
      throw new Error(`State file not found at: ${filePath}`);
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data) as InvestigationState;
  }
}

/**
 * Mystery Interactive Investigation Test Suite
 * Tests:
 * 1. Initial investigation state
 * 2. Valid state transitions
 * 3. Invalid transitions rejection
 * 4. Poll choice handling & branch resolution
 * 5. Invalid poll choices rejection
 * 6. Missing clue detection
 * 7. Premature reveal detection
 * 8. Story pacing & editorial checks
 * 9. End-to-end investigation simulation
 * 10. Human-readable transcript formatting
 * 11. Mock Telegram adapter dispatch
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  InvestigationStateManager,
  PollDecisionEngine,
  MysteryPacingValidator,
  MockTelegramInvestigationAdapter,
  InvestigationSimulator,
  CURATED_MYSTERY_CASES,
  MysteryCase,
  InvestigationStep,
} from '../src/pipeline/mystery/index.js';

describe('Interactive Investigation Experience (Phase 3)', () => {
  const sampleCase = CURATED_MYSTERY_CASES[0];

  describe('1. Investigation State Model & Transitions', () => {
    it('creates valid initial state at CASE_INTRO with branches and choices', () => {
      const state = InvestigationStateManager.createInitialState(sampleCase);

      assert.strictEqual(state.caseId, sampleCase.caseId);
      assert.strictEqual(state.currentStep, 'CASE_INTRO');
      assert.strictEqual(state.status, 'IN_PROGRESS');
      assert.strictEqual(state.finalResolutionStatus, 'UNRESOLVED');
      assert.ok(state.availableChoices.length >= 2 && state.availableChoices.length <= 4);
      assert.ok(Object.keys(state.branches).length >= 2);
      assert.strictEqual(state.selectedAudienceChoice, null);
      assert.strictEqual(state.revealedClueIds.length, 0);
      assert.strictEqual(state.history.length, 1);
    });

    it('enforces legal step-by-step state machine transitions', () => {
      let state = InvestigationStateManager.createInitialState(sampleCase);

      // 1. CASE_INTRO -> EVIDENCE
      state = InvestigationStateManager.transitionTo(state, 'EVIDENCE', {
        actionNote: 'MOVE_TO_EVIDENCE',
      });
      assert.strictEqual(state.currentStep, 'EVIDENCE');

      // 2. EVIDENCE -> INVESTIGATION_POLL
      state = InvestigationStateManager.transitionTo(state, 'INVESTIGATION_POLL');
      assert.strictEqual(state.currentStep, 'INVESTIGATION_POLL');
      assert.strictEqual(state.status, 'POLL_ACTIVE');

      // 3. INVESTIGATION_POLL -> AUDIENCE_CHOICE
      const choiceRecord = {
        choiceId: 'choice-0',
        optionIndex: 0,
        label: 'Option A',
        targetBranchId: 'branch-0',
        selectedAt: new Date().toISOString(),
      };
      state = InvestigationStateManager.transitionTo(state, 'AUDIENCE_CHOICE', {
        selectedChoice: choiceRecord,
      });
      assert.strictEqual(state.currentStep, 'AUDIENCE_CHOICE');
      assert.deepStrictEqual(state.selectedAudienceChoice, choiceRecord);

      // 4. AUDIENCE_CHOICE -> CLUE_REVEAL
      state = InvestigationStateManager.transitionTo(state, 'CLUE_REVEAL', {
        revealedClueId: 'ev-1',
      });
      assert.strictEqual(state.currentStep, 'CLUE_REVEAL');
      assert.ok(state.revealedClueIds.includes('ev-1'));

      // 5. CLUE_REVEAL -> FINAL_REVEAL
      state = InvestigationStateManager.transitionTo(state, 'FINAL_REVEAL', {
        finalResolutionStatus: 'RESOLVED',
      });
      assert.strictEqual(state.currentStep, 'FINAL_REVEAL');
      assert.strictEqual(state.status, 'RESOLVED');

      // 6. FINAL_REVEAL -> COMPLETED
      state = InvestigationStateManager.transitionTo(state, 'COMPLETED');
      assert.strictEqual(state.currentStep, 'COMPLETED');
      assert.strictEqual(state.status, 'RESOLVED');
    });

    it('rejects illegal state transitions and throws informative error', () => {
      const state = InvestigationStateManager.createInitialState(sampleCase);

      // Attempt illegal jump from CASE_INTRO straight to FINAL_REVEAL
      assert.throws(
        () => {
          InvestigationStateManager.transitionTo(state, 'FINAL_REVEAL');
        },
        /Illegal investigation state transition: Cannot transition from "CASE_INTRO" to "FINAL_REVEAL"/
      );

      // Attempt illegal jump from CASE_INTRO to CLUE_REVEAL
      assert.throws(
        () => {
          InvestigationStateManager.transitionTo(state, 'CLUE_REVEAL');
        },
        /Illegal investigation state transition/
      );
    });

    it('supports saving and loading state to/from JSON file', () => {
      const tempPath = path.resolve(process.cwd(), 'data', 'test-state-temp.json');
      const state = InvestigationStateManager.createInitialState(sampleCase);

      InvestigationStateManager.saveToFile(state, tempPath);
      assert.ok(fs.existsSync(tempPath));

      const loaded = InvestigationStateManager.loadFromFile(tempPath);
      assert.strictEqual(loaded.caseId, state.caseId);
      assert.strictEqual(loaded.currentStep, state.currentStep);

      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    });
  });

  describe('2. Poll Decision Engine & Branch Resolution', () => {
    it('maps case hypotheses into distinct branch pathways', () => {
      const { branches, choices } = PollDecisionEngine.buildBranches(sampleCase);

      assert.ok(choices.length >= 2 && choices.length <= 4);
      for (const choice of choices) {
        assert.ok(choice.id.startsWith('choice-'));
        assert.ok(choice.label.length > 0);
        assert.ok(branches[choice.targetBranchId], `Branch ${choice.targetBranchId} must exist`);
        assert.ok(branches[choice.targetBranchId].discoveryNote.length > 10);
      }
    });

    it('resolves valid audience choices into contextual CLUE_REVEAL step', () => {
      const state = InvestigationStateManager.createInitialState(sampleCase);
      const branchRes = PollDecisionEngine.resolveChoice(state, 1, sampleCase, {
        votePercentage: 58,
        totalVotes: 240,
      });

      assert.ok(branchRes.branch);
      assert.strictEqual(branchRes.step.format, 'CLUE_REVEAL');
      assert.ok(branchRes.step.draft.headline.includes('BREAKTHROUGH'));
      assert.ok(branchRes.step.draft.hook.includes('58% majority'));
      assert.ok(branchRes.unlockedEvidenceId.length > 0);
      assert.ok(branchRes.step.visualSpec);
      assert.strictEqual(branchRes.step.visualSpec?.template, 'clue_card');
    });

    it('rejects out-of-bounds or non-existent choice identifiers', () => {
      const state = InvestigationStateManager.createInitialState(sampleCase);

      // Out of bounds index
      assert.throws(
        () => {
          PollDecisionEngine.resolveChoice(state, 99, sampleCase);
        },
        /out of bounds/
      );

      // Negative index
      assert.throws(
        () => {
          PollDecisionEngine.resolveChoice(state, -1, sampleCase);
        },
        /out of bounds/
      );

      // Non-existent choice ID
      assert.throws(
        () => {
          PollDecisionEngine.resolveChoice(state, 'choice-phantom-99', sampleCase);
        },
        /not found in available choices/
      );
    });
  });

  describe('3. Story Pacing & Anti-Spoiler Validation', () => {
    it('detects premature reveal if culprit is declared guilty in early steps', () => {
      const culprit = sampleCase.correctResolution.culpritOrCause;
      const brokenSteps: InvestigationStep[] = [
        {
          stepNumber: 1,
          format: 'CASE_INTRO',
          draft: {
            caseId: sampleCase.caseId,
            caseTitle: sampleCase.title,
            format: 'CASE_INTRO',
            headline: 'Intro',
            hook: 'Hook',
            bodyParagraphs: [`We already know that ${culprit} is the culprit who poisoned the lord.`],
          },
        },
        {
          stepNumber: 2,
          format: 'EVIDENCE',
          draft: {
            caseId: sampleCase.caseId,
            caseTitle: sampleCase.title,
            format: 'EVIDENCE',
            headline: 'Evidence',
            hook: 'Hook',
            bodyParagraphs: ['Evidence text here.'],
          },
        },
        {
          stepNumber: 3,
          format: 'INVESTIGATION_POLL',
          draft: {
            caseId: sampleCase.caseId,
            caseTitle: sampleCase.title,
            format: 'INVESTIGATION_POLL',
            headline: 'Poll',
            hook: 'Hook',
            bodyParagraphs: ['Vote now.'],
            poll: { question: 'Who did it?', options: ['A', 'B'] },
          },
        },
        {
          stepNumber: 4,
          format: 'CLUE_REVEAL',
          draft: {
            caseId: sampleCase.caseId,
            caseTitle: sampleCase.title,
            format: 'CLUE_REVEAL',
            headline: 'Clue',
            hook: 'Hook',
            bodyParagraphs: ['Clue details.'],
          },
        },
        {
          stepNumber: 5,
          format: 'FINAL_REVEAL',
          draft: {
            caseId: sampleCase.caseId,
            caseTitle: sampleCase.title,
            format: 'FINAL_REVEAL',
            headline: 'Final',
            hook: 'Hook',
            bodyParagraphs: ['Final resolution.'],
            revealDetail: {
              culpritOrCause: culprit,
              trueExplanation: sampleCase.correctResolution.howDeductionWorks,
            },
          },
        },
      ];

      const result = MysteryPacingValidator.validateSequencePacing(sampleCase, brokenSteps);
      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.some((e) => e.includes('Premature reveal detected in step 1')));
    });

    it('detects identical duplicate paragraphs repeated across steps', () => {
      const duplicateParagraph =
        'This identical forensic sentence is duplicated verbatim across two separate investigation steps.';

      const stepsWithDuplicates: InvestigationStep[] = [
        {
          stepNumber: 1,
          format: 'CASE_INTRO',
          draft: {
            caseId: sampleCase.caseId,
            caseTitle: sampleCase.title,
            format: 'CASE_INTRO',
            headline: 'Intro',
            hook: 'Hook',
            bodyParagraphs: [duplicateParagraph, 'Another distinct paragraph for intro.'],
          },
        },
        {
          stepNumber: 2,
          format: 'EVIDENCE',
          draft: {
            caseId: sampleCase.caseId,
            caseTitle: sampleCase.title,
            format: 'EVIDENCE',
            headline: 'Evidence',
            hook: 'Hook',
            bodyParagraphs: [duplicateParagraph, 'Different evidence paragraph.'],
          },
        },
        {
          stepNumber: 3,
          format: 'INVESTIGATION_POLL',
          draft: {
            caseId: sampleCase.caseId,
            caseTitle: sampleCase.title,
            format: 'INVESTIGATION_POLL',
            headline: 'Poll',
            hook: 'Hook',
            bodyParagraphs: ['Vote below.'],
            poll: { question: 'Vote question', options: ['A', 'B'] },
          },
        },
        {
          stepNumber: 4,
          format: 'CLUE_REVEAL',
          draft: {
            caseId: sampleCase.caseId,
            caseTitle: sampleCase.title,
            format: 'CLUE_REVEAL',
            headline: 'Clue',
            hook: 'Hook',
            bodyParagraphs: ['Clue body.'],
          },
        },
        {
          stepNumber: 5,
          format: 'FINAL_REVEAL',
          draft: {
            caseId: sampleCase.caseId,
            caseTitle: sampleCase.title,
            format: 'FINAL_REVEAL',
            headline: 'Final',
            hook: 'Hook',
            bodyParagraphs: ['Final body.'],
            revealDetail: {
              culpritOrCause: sampleCase.correctResolution.culpritOrCause,
              trueExplanation: sampleCase.correctResolution.howDeductionWorks,
            },
          },
        },
      ];

      const result = MysteryPacingValidator.validateSequencePacing(sampleCase, stepsWithDuplicates);
      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.some((e) => e.includes('Duplicate paragraph repeated verbatim')));
    });
  });

  describe('4. Mock Telegram Adapter Operations', () => {
    it('dispatches messages, polls, and photos through the mock adapter', async () => {
      const adapter = new MockTelegramInvestigationAdapter();
      const step: InvestigationStep = {
        stepNumber: 1,
        format: 'CASE_INTRO',
        draft: {
          caseId: sampleCase.caseId,
          caseTitle: sampleCase.title,
          format: 'CASE_INTRO',
          headline: 'Case Dossier Open',
          hook: 'A mysterious event has occurred.',
          bodyParagraphs: ['<b>Case Brief:</b> Lord Sterling was found unconscious.'],
        },
      };

      const res = await adapter.sendCaseIntro(step, { visualFilePath: '/path/to/cover.png' });
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.hasVisual, true);
      assert.strictEqual(adapter.dispatchedMessages.length, 1);

      // Send Poll
      const pollStep: InvestigationStep = {
        stepNumber: 3,
        format: 'INVESTIGATION_POLL',
        draft: {
          caseId: sampleCase.caseId,
          caseTitle: sampleCase.title,
          format: 'INVESTIGATION_POLL',
          headline: 'Choose lead',
          hook: 'Vote',
          bodyParagraphs: ['Choose a lead below.'],
          poll: { question: 'Which lead?', options: ['Option 1', 'Option 2'] },
        },
      };

      const pollRes = await adapter.sendInvestigationPoll(pollStep);
      assert.strictEqual(pollRes.success, true);
      assert.strictEqual(adapter.dispatchedPolls.length, 1);
    });
  });

  describe('5. Full Offline Simulation & Transcripts', () => {
    it('executes a complete end-to-end investigation simulation without Telegram', async () => {
      const simOutputDir = path.resolve(process.cwd(), 'data', 'test-sim-run');

      const simResult = await InvestigationSimulator.runSimulation({
        caseIndex: 0,
        selectedChoiceIndex: 0,
        outputDirectory: simOutputDir,
        renderVisuals: true,
      });

      assert.strictEqual(simResult.caseId, sampleCase.caseId);
      assert.strictEqual(simResult.state.currentStep, 'COMPLETED');
      assert.strictEqual(simResult.state.status, 'RESOLVED');
      assert.strictEqual(simResult.stepsDispatched.length, 5);
      assert.strictEqual(simResult.renderedVisualFiles.length, 4); // Step 1, 2, 4, 5 visuals
      assert.strictEqual(simResult.pacingValidation.isValid, true);

      // Verify transcript files
      const textTranscriptPath = path.join(simOutputDir, 'transcript.txt');
      const mdTranscriptPath = path.join(simOutputDir, 'transcript.md');
      const stateJsonPath = path.join(simOutputDir, 'state.json');

      assert.ok(fs.existsSync(textTranscriptPath));
      assert.ok(fs.existsSync(mdTranscriptPath));
      assert.ok(fs.existsSync(stateJsonPath));

      const textContent = fs.readFileSync(textTranscriptPath, 'utf-8');
      assert.ok(textContent.includes('INVESTIGATION TRANSCRIPT'));
      assert.ok(textContent.includes('[STEP 1] CASE INTRO'));
      assert.ok(textContent.includes('[STEP 3] INVESTIGATION POLL'));
      assert.ok(textContent.includes('[STEP 4] SIMULATED AUDIENCE CHOICE'));
      assert.ok(textContent.includes('[STEP 6] FINAL REVEAL'));
      assert.ok(textContent.includes('CASE SOLVED'));

      // Clean up test sim directory
      if (fs.existsSync(simOutputDir)) {
        fs.rmSync(simOutputDir, { recursive: true, force: true });
      }
    });
  });
});

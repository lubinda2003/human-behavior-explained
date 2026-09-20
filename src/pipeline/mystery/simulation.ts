/**
 * Investigation Offline Simulation Engine & Transcript Generator
 * Simulates a full interactive investigation lifecycle from CASE_INTRO to FINAL_REVEAL.
 * Exports state, visuals, and human-readable transcripts to data/simulation-output/.
 */

import fs from 'node:fs';
import path from 'node:path';
import { CURATED_MYSTERY_CASES } from './seeds.js';
import { InvestigationModel } from './investigationModel.js';
import { MysteryContentFormatter } from './contentFormatter.js';
import { MysteryVisualGenerator } from './visuals/index.js';
import { MysteryQualityChecker } from './quality.js';
import { InvestigationStateManager } from './stateManager.js';
import { PollDecisionEngine } from './decisionEngine.js';
import { MysteryPacingValidator } from './pacingValidator.js';
import { MockTelegramInvestigationAdapter } from './telegramAdapter.js';
import {
  MysteryCase,
  InvestigationSimulationOptions,
  InvestigationSimulationResult,
  InvestigationStep,
  PublishedStepRecord,
} from './types.js';

export class InvestigationSimulator {
  /**
   * Run a full offline simulation of an investigation.
   */
  public static async runSimulation(
    options?: InvestigationSimulationOptions
  ): Promise<InvestigationSimulationResult> {
    const outputDir =
      options?.outputDirectory ||
      path.resolve(process.cwd(), 'data', 'simulation-output');

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const caseIndex = options?.caseIndex ?? 0;
    const mysteryCase: MysteryCase =
      options?.customCase ||
      CURATED_MYSTERY_CASES[caseIndex] ||
      CURATED_MYSTERY_CASES[0];

    console.log(`\n🕵️ Starting Mystery Simulation for: "${mysteryCase.title}" (${mysteryCase.caseId})`);

    // 1. Validate Case Integrity
    const caseQC = MysteryQualityChecker.validateCase(mysteryCase);
    if (!caseQC.isValid) {
      throw new Error(`Case failed integrity check: ${caseQC.errors.join(', ')}`);
    }

    // 2. Initialize State & Adapter
    let state = InvestigationStateManager.createInitialState(mysteryCase);
    const adapter = new MockTelegramInvestigationAdapter();
    const visualGen = new MysteryVisualGenerator(outputDir);
    const renderedVisualFiles: string[] = [];
    const publishedRecords: PublishedStepRecord[] = [];

    // Helper to render visuals if requested
    const renderStepVisual = async (step: InvestigationStep, prefix: string) => {
      if (!options || options.renderVisuals !== false) {
        if (step.visualSpec) {
          const res = await visualGen.renderGraphic(step.visualSpec, prefix);
          renderedVisualFiles.push(res.filePath);
          return res.filePath;
        }
      }
      return undefined;
    };

    // --- STEP 1: CASE_INTRO ---
    console.log('📌 [Step 1] CASE_INTRO');
    const introDraft = InvestigationModel.buildCaseIntroDraft(mysteryCase);
    const introVisualSpec = InvestigationModel.buildCaseCoverSpec(mysteryCase);
    const step1: InvestigationStep = {
      stepNumber: 1,
      format: 'CASE_INTRO',
      draft: introDraft,
      visualSpec: introVisualSpec,
    };
    const step1Visual = await renderStepVisual(step1, 'step-1-case-cover');
    const dispatch1 = await adapter.sendCaseIntro(step1, { visualFilePath: step1Visual });
    const record1: PublishedStepRecord = {
      stepNumber: 1,
      stepType: 'CASE_INTRO',
      headline: step1.draft.headline,
      messageId: dispatch1.messageId,
      visualAssetPath: step1Visual ? path.basename(step1Visual) : undefined,
      publishedAt: new Date().toISOString(),
    };
    publishedRecords.push(record1);

    // Transition State: CASE_INTRO -> EVIDENCE
    state = InvestigationStateManager.transitionTo(state, 'EVIDENCE', {
      stepRecord: record1,
      actionNote: 'DISPATCH_CASE_INTRO',
    });

    // --- STEP 2: EVIDENCE ---
    console.log('🔍 [Step 2] EVIDENCE');
    const primaryEvidence = mysteryCase.evidence[0];
    const evidenceDraft = InvestigationModel.buildEvidenceDraft(mysteryCase, primaryEvidence);
    const evidenceVisualSpec = InvestigationModel.buildEvidenceCardSpec(mysteryCase, primaryEvidence);
    const step2: InvestigationStep = {
      stepNumber: 2,
      format: 'EVIDENCE',
      draft: evidenceDraft,
      visualSpec: evidenceVisualSpec,
    };
    const step2Visual = await renderStepVisual(step2, 'step-2-evidence');
    const dispatch2 = await adapter.sendEvidence(step2, { visualFilePath: step2Visual });
    const record2: PublishedStepRecord = {
      stepNumber: 2,
      stepType: 'EVIDENCE',
      headline: step2.draft.headline,
      messageId: dispatch2.messageId,
      visualAssetPath: step2Visual ? path.basename(step2Visual) : undefined,
      publishedAt: new Date().toISOString(),
    };
    publishedRecords.push(record2);

    // Transition State: EVIDENCE -> INVESTIGATION_POLL
    state = InvestigationStateManager.transitionTo(state, 'INVESTIGATION_POLL', {
      stepRecord: record2,
      actionNote: 'DISPATCH_EVIDENCE',
    });

    // --- STEP 3: INVESTIGATION_POLL ---
    console.log('📊 [Step 3] INVESTIGATION_POLL');
    const pollDraft = InvestigationModel.buildInvestigationPollDraft(mysteryCase);
    const step3: InvestigationStep = {
      stepNumber: 3,
      format: 'INVESTIGATION_POLL',
      draft: pollDraft,
    };
    const dispatch3 = await adapter.sendInvestigationPoll(step3);
    const record3: PublishedStepRecord = {
      stepNumber: 3,
      stepType: 'INVESTIGATION_POLL',
      headline: step3.draft.headline,
      messageId: dispatch3.messageId,
      pollId: dispatch3.pollId,
      publishedAt: new Date().toISOString(),
    };
    publishedRecords.push(record3);

    // --- STEP 4: AUDIENCE_CHOICE (Simulated Vote Resolution) ---
    console.log('🗳️ [Step 4] AUDIENCE_CHOICE Resolution');
    const chosenIndex = options?.selectedChoiceIndex ?? 1; // Default to Option B / Index 1
    const pollResultMock = {
      pollId: String(dispatch3.pollId || 'mock-poll-1'),
      winningOptionIndex: chosenIndex,
      options: (step3.draft.poll?.options || []).map((text, idx) => ({
        text,
        voterCount: idx === chosenIndex ? 184 : 62,
      })),
      totalVoters: 308,
    };
    const audienceChoice = await adapter.processPollResult(
      String(dispatch3.pollId),
      pollResultMock,
      state.availableChoices
    );

    // Resolve Choice via Decision Engine
    const branchResult = PollDecisionEngine.resolveChoice(
      state,
      audienceChoice.optionIndex,
      mysteryCase,
      { votePercentage: audienceChoice.votePercentage, totalVotes: audienceChoice.totalVotes }
    );

    // Transition State: INVESTIGATION_POLL -> AUDIENCE_CHOICE
    state = InvestigationStateManager.transitionTo(state, 'AUDIENCE_CHOICE', {
      selectedChoice: branchResult.selectedChoice,
      actionNote: `APPLIED_CHOICE_${branchResult.selectedChoice.choiceId}`,
    });

    // --- STEP 5: CLUE_REVEAL (Branch-Specific) ---
    console.log(`💡 [Step 5] CLUE_REVEAL (${branchResult.branch.title})`);
    const step4: InvestigationStep = branchResult.step;
    const step4Visual = await renderStepVisual(step4, 'step-4-clue-reveal');
    const dispatch4 = await adapter.sendClueReveal(step4, { visualFilePath: step4Visual });
    const record4: PublishedStepRecord = {
      stepNumber: 4,
      stepType: 'CLUE_REVEAL',
      headline: step4.draft.headline,
      messageId: dispatch4.messageId,
      visualAssetPath: step4Visual ? path.basename(step4Visual) : undefined,
      publishedAt: new Date().toISOString(),
    };
    publishedRecords.push(record4);

    // Transition State: AUDIENCE_CHOICE -> CLUE_REVEAL
    state = InvestigationStateManager.transitionTo(state, 'CLUE_REVEAL', {
      stepRecord: record4,
      revealedClueId: branchResult.unlockedEvidenceId,
      actionNote: `REVEALED_CLUE_${branchResult.unlockedEvidenceId}`,
    });

    // --- STEP 6: FINAL_REVEAL ---
    console.log('🏆 [Step 6] FINAL_REVEAL');
    const revealDraft = InvestigationModel.buildFinalRevealDraft(mysteryCase);
    const revealVisualSpec = InvestigationModel.buildFinalRevealSpec(mysteryCase);
    const step5: InvestigationStep = {
      stepNumber: 5,
      format: 'FINAL_REVEAL',
      draft: revealDraft,
      visualSpec: revealVisualSpec,
    };
    const step5Visual = await renderStepVisual(step5, 'step-5-final-reveal');
    const dispatch5 = await adapter.sendFinalReveal(step5, { visualFilePath: step5Visual });
    const record5: PublishedStepRecord = {
      stepNumber: 5,
      stepType: 'FINAL_REVEAL',
      headline: step5.draft.headline,
      messageId: dispatch5.messageId,
      visualAssetPath: step5Visual ? path.basename(step5Visual) : undefined,
      publishedAt: new Date().toISOString(),
    };
    publishedRecords.push(record5);

    // Transition State: CLUE_REVEAL -> FINAL_REVEAL
    state = InvestigationStateManager.transitionTo(state, 'FINAL_REVEAL', {
      stepRecord: record5,
      finalResolutionStatus: 'RESOLVED',
      actionNote: 'DISPATCH_FINAL_REVEAL',
    });

    // Transition State: FINAL_REVEAL -> COMPLETED
    state = InvestigationStateManager.transitionTo(state, 'COMPLETED', {
      actionNote: 'CASE_COMPLETED',
    });

    // Validate Pacing across all generated steps
    const simulatedSteps: InvestigationStep[] = [step1, step2, step3, step4, step5];
    const pacingValidation = MysteryPacingValidator.validateSequencePacing(
      mysteryCase,
      simulatedSteps
    );

    // Save final state to file
    const stateFilePath = path.join(outputDir, 'state.json');
    InvestigationStateManager.saveToFile(state, stateFilePath);

    // Generate human-readable transcripts
    const transcriptText = this.buildTextTranscript(
      mysteryCase,
      simulatedSteps,
      branchResult.selectedChoice,
      publishedRecords
    );
    const transcriptMarkdown = this.buildMarkdownTranscript(
      mysteryCase,
      simulatedSteps,
      branchResult.selectedChoice,
      publishedRecords
    );

    fs.writeFileSync(path.join(outputDir, 'transcript.txt'), transcriptText, 'utf-8');
    fs.writeFileSync(path.join(outputDir, 'transcript.md'), transcriptMarkdown, 'utf-8');

    console.log(`\n✅ Investigation Simulation Finished Successfully!`);
    console.log(`📁 Artifacts written to: ${outputDir}`);

    return {
      caseId: mysteryCase.caseId,
      caseTitle: mysteryCase.title,
      state,
      stepsDispatched: publishedRecords,
      selectedChoice: branchResult.selectedChoice,
      renderedVisualFiles,
      transcriptText,
      transcriptMarkdown,
      pacingValidation,
      outputDirectory: outputDir,
    };
  }

  /**
   * Build plain text human-readable transcript.
   */
  private static buildTextTranscript(
    mysteryCase: MysteryCase,
    steps: InvestigationStep[],
    choice: any,
    records: PublishedStepRecord[]
  ): string {
    const divider = '='.repeat(80);
    const subDivider = '-'.repeat(80);
    const lines: string[] = [];

    lines.push(divider);
    lines.push(`INVESTIGATION TRANSCRIPT: ${mysteryCase.title.toUpperCase()}`);
    lines.push(`CASE ID: ${mysteryCase.caseId} | DIFFICULTY: ${mysteryCase.difficulty.toUpperCase()}`);
    lines.push(`LOCATION: ${mysteryCase.setting.location}`);
    lines.push(divider);
    lines.push('');

    // Step 1
    const s1 = steps[0];
    const r1 = records[0];
    lines.push(`[STEP 1] CASE INTRO`);
    lines.push(`Headline: ${s1.draft.headline}`);
    lines.push(`Message:\n${MysteryContentFormatter.formatPost(s1.draft)}`);
    lines.push(`Visual: ${r1?.visualAssetPath || 'None'}`);
    lines.push(subDivider);
    lines.push('');

    // Step 2
    const s2 = steps[1];
    const r2 = records[1];
    lines.push(`[STEP 2] EVIDENCE SPOTLIGHT`);
    lines.push(`Headline: ${s2.draft.headline}`);
    lines.push(`Message:\n${MysteryContentFormatter.formatPost(s2.draft)}`);
    lines.push(`Visual: ${r2?.visualAssetPath || 'None'}`);
    lines.push(subDivider);
    lines.push('');

    // Step 3
    const s3 = steps[2];
    lines.push(`[STEP 3] INVESTIGATION POLL`);
    lines.push(`Question: ${s3.draft.poll?.question}`);
    s3.draft.poll?.options.forEach((opt, idx) => {
      const letter = String.fromCharCode(65 + idx);
      lines.push(`  [${letter}] ${opt}`);
    });
    lines.push(subDivider);
    lines.push('');

    // Step 4
    lines.push(`[STEP 4] SIMULATED AUDIENCE CHOICE`);
    lines.push(`Selected Option: [${String.fromCharCode(65 + choice.optionIndex)}] ${choice.label}`);
    lines.push(`Target Branch: ${choice.targetBranchId}`);
    lines.push(`Vote Share: ${choice.votePercentage}% of ${choice.totalVotes} total votes`);
    lines.push(subDivider);
    lines.push('');

    // Step 5
    const s4 = steps[3];
    const r4 = records[3];
    lines.push(`[STEP 5] CLUE REVEAL (Branch Investigation)`);
    lines.push(`Headline: ${s4.draft.headline}`);
    lines.push(`Message:\n${MysteryContentFormatter.formatPost(s4.draft)}`);
    lines.push(`Visual: ${r4?.visualAssetPath || 'None'}`);
    lines.push(subDivider);
    lines.push('');

    // Step 6
    const s5 = steps[4];
    const r5 = records[4];
    lines.push(`[STEP 6] FINAL REVEAL (Resolution)`);
    lines.push(`Headline: ${s5.draft.headline}`);
    lines.push(`Message:\n${MysteryContentFormatter.formatPost(s5.draft)}`);
    lines.push(`Visual: ${r5?.visualAssetPath || 'None'}`);
    lines.push(`Status: CASE SOLVED (Culprit: ${mysteryCase.correctResolution.culpritOrCause})`);
    lines.push(divider);

    return lines.join('\n');
  }

  /**
   * Build Markdown human-readable transcript.
   */
  private static buildMarkdownTranscript(
    mysteryCase: MysteryCase,
    steps: InvestigationStep[],
    choice: any,
    records: PublishedStepRecord[]
  ): string {
    const lines: string[] = [];

    lines.push(`# Investigation Transcript: ${mysteryCase.title}`);
    lines.push(`**Case ID**: \`${mysteryCase.caseId}\` | **Difficulty**: \`${mysteryCase.difficulty}\` | **Location**: ${mysteryCase.setting.location}\n`);

    // Step 1
    const s1 = steps[0];
    const r1 = records[0];
    lines.push(`## 1. Case Intro`);
    lines.push(`> **${s1.draft.headline}**\n`);
    lines.push(`\`\`\`html\n${MysteryContentFormatter.formatPost(s1.draft)}\n\`\`\``);
    lines.push(`*Visual Asset*: \`${r1?.visualAssetPath || 'None'}\`\n`);

    // Step 2
    const s2 = steps[1];
    const r2 = records[1];
    lines.push(`## 2. Evidence Spotlight`);
    lines.push(`> **${s2.draft.headline}**\n`);
    lines.push(`\`\`\`html\n${MysteryContentFormatter.formatPost(s2.draft)}\n\`\`\``);
    lines.push(`*Visual Asset*: \`${r2?.visualAssetPath || 'None'}\`\n`);

    // Step 3
    const s3 = steps[2];
    lines.push(`## 3. Investigation Poll`);
    lines.push(`**Question**: ${s3.draft.poll?.question}\n`);
    s3.draft.poll?.options.forEach((opt, idx) => {
      const letter = String.fromCharCode(65 + idx);
      lines.push(`- **[${letter}]** ${opt}`);
    });
    lines.push('');

    // Choice
    lines.push(`## 4. Simulated Audience Choice`);
    lines.push(`- **Selected**: **[${String.fromCharCode(65 + choice.optionIndex)}]** ${choice.label}`);
    lines.push(`- **Target Branch**: \`${choice.targetBranchId}\``);
    lines.push(`- **Result**: ${choice.votePercentage}% majority (${choice.totalVotes} total votes)\n`);

    // Step 4
    const s4 = steps[3];
    const r4 = records[3];
    lines.push(`## 5. Clue Reveal (Branch Outcome)`);
    lines.push(`> **${s4.draft.headline}**\n`);
    lines.push(`\`\`\`html\n${MysteryContentFormatter.formatPost(s4.draft)}\n\`\`\``);
    lines.push(`*Visual Asset*: \`${r4?.visualAssetPath || 'None'}\`\n`);

    // Step 5
    const s5 = steps[4];
    const r5 = records[4];
    lines.push(`## 6. Final Reveal`);
    lines.push(`> **${s5.draft.headline}**\n`);
    lines.push(`\`\`\`html\n${MysteryContentFormatter.formatPost(s5.draft)}\n\`\`\``);
    lines.push(`*Visual Asset*: \`${r5?.visualAssetPath || 'None'}\``);
    lines.push(`*Verified Culprit*: **${mysteryCase.correctResolution.culpritOrCause}**\n`);

    return lines.join('\n');
  }
}

// Support direct script execution
if (process.argv[1] && (process.argv[1].endsWith('simulation.ts') || process.argv[1].includes('mystery:simulate'))) {
  InvestigationSimulator.runSimulation().catch((err) => {
    console.error('Fatal simulation error:', err);
    process.exit(1);
  });
}

/**
 * Live Telegram Mystery Investigation Test Runner
 * Generates and executes ONE complete real investigation sequence published to Telegram:
 * 1. CASE INTRO + Case Cover Graphic
 * 2. EVIDENCE + Specimen Spec Graphic
 * 3. INVESTIGATION POLL (2-4 choices)
 * 4. AUDIENCE CHOICE (Simulated resolution)
 * 5. CLUE REVEAL + Forensic Clue Graphic
 * 6. FINAL REVEAL + Resolution Graphic
 *
 * Saves live-test-report.json and validates complete channel publishing.
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
import { LiveTelegramInvestigationAdapter } from './telegramAdapter.js';
import {
  MysteryCase,
  InvestigationStep,
  PublishedStepRecord,
  InvestigationState,
} from './types.js';

export interface LiveMysteryTestOptions {
  botToken?: string;
  channelId?: string;
  caseIndex?: number;
  customCase?: MysteryCase;
  outputDirectory?: string;
  selectedChoiceIndex?: number;
  dryRun?: boolean;
}

export interface LiveMysteryTestReport {
  caseId: string;
  caseTitle: string;
  difficulty: string;
  publishedAt: string;
  channelTarget: string;
  status: 'RESOLVED' | 'FAILED';
  steps: PublishedStepRecord[];
  selectedChoice: {
    choiceId: string;
    optionIndex: number;
    label: string;
    targetBranchId: string;
    votePercentage?: number;
    totalVotes?: number;
  };
  qcResults: {
    caseValid: boolean;
    visualsValid: boolean;
    pacingValid: boolean;
    telegramHtmlValid: boolean;
  };
  outputFiles: string[];
  executionTimeMs: number;
}

export class LiveMysteryTestRunner {
  /**
   * Run a live mystery test against the real Telegram Channel API.
   */
  public static async runLiveTest(
    options?: LiveMysteryTestOptions
  ): Promise<LiveMysteryTestReport> {
    const startTime = Date.now();
    const outputDir =
      options?.outputDirectory ||
      path.resolve(process.cwd(), 'data', 'live-test');

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const botToken = options?.botToken || process.env.TELEGRAM_BOT_TOKEN || '';
    const channelId = options?.channelId || process.env.TELEGRAM_CHANNEL_ID || '';

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🕵️  TELEGRAM MYSTERY LIVE TEST RUNNER (PHASE 4)');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Channel Target: ${channelId || '(Not set / Mock)'}`);
    console.log(`Output Directory: ${outputDir}`);

    // 1. Select / Load Case
    const caseIndex = options?.caseIndex ?? 0;
    const mysteryCase: MysteryCase =
      options?.customCase ||
      CURATED_MYSTERY_CASES[caseIndex] ||
      CURATED_MYSTERY_CASES[0];

    console.log(`\n📋 Loaded Investigation Case: "${mysteryCase.title}" (${mysteryCase.caseId})`);

    // 2. Pre-Publishing Quality Validation
    console.log('\n🔍 [QC Phase 1] Validating Case Integrity & Structure...');
    const caseQC = MysteryQualityChecker.validateCase(mysteryCase);
    if (!caseQC.isValid) {
      throw new Error(`Case integrity validation failed: ${caseQC.errors.join('; ')}`);
    }
    console.log('  ✅ Case schema, suspects, evidence, and deduction rules verified.');

    // 3. Render Visual Assets (1200x675 PNGs)
    console.log('\n🎨 [QC Phase 2] Generating & Validating 1200x675 PNG Visuals...');
    const visualGen = new MysteryVisualGenerator(outputDir);
    const renderedVisuals: string[] = [];

    // Step 1 Cover Spec
    const step1Spec = InvestigationModel.buildCaseCoverSpec(mysteryCase);
    const step1VisualRes = await visualGen.renderGraphic(step1Spec, 'live-step-1-cover');
    renderedVisuals.push(step1VisualRes.filePath);

    // Step 2 Evidence Spec
    const primaryEvidence = mysteryCase.evidence[0];
    const step2Spec = InvestigationModel.buildEvidenceCardSpec(mysteryCase, primaryEvidence);
    const step2VisualRes = await visualGen.renderGraphic(step2Spec, 'live-step-2-evidence');
    renderedVisuals.push(step2VisualRes.filePath);

    // Initial State & Branches
    let state = InvestigationStateManager.createInitialState(mysteryCase);

    // Pre-resolve selected branch for Clue Reveal (Default choice index 1 / Option B)
    const selectedChoiceIndex = options?.selectedChoiceIndex ?? 1;
    const branchResult = PollDecisionEngine.resolveChoice(
      state,
      selectedChoiceIndex,
      mysteryCase,
      { votePercentage: 62, totalVotes: 284 }
    );

    // Step 4 Clue Reveal Spec
    const step4Spec = branchResult.step.visualSpec || {
      title: branchResult.branch.title,
      caseId: mysteryCase.caseId,
      tag: 'FORENSIC BREAKTHROUGH',
      template: 'clue_card',
      payload: {
        template: 'clue_card',
        data: {
          caseNumber: mysteryCase.caseId,
          clueTitle: branchResult.branch.title,
          evidenceRef: branchResult.unlockedEvidenceId,
          discoveryText: branchResult.branch.discoveryNote,
          deductionHint: branchResult.branch.deductionHint,
        },
      },
    };
    const step4VisualRes = await visualGen.renderGraphic(step4Spec, 'live-step-4-clue');
    renderedVisuals.push(step4VisualRes.filePath);

    // Step 5 Final Reveal Spec
    const step5Spec = InvestigationModel.buildFinalRevealCardSpec(mysteryCase);
    const step5VisualRes = await visualGen.renderGraphic(step5Spec, 'live-step-5-final');
    renderedVisuals.push(step5VisualRes.filePath);

    // Validate all rendered image files
    for (const visualPath of renderedVisuals) {
      const imgQC = await MysteryQualityChecker.validateVisualAsset(visualPath);
      if (!imgQC.isValid) {
        throw new Error(`Visual validation failed for ${path.basename(visualPath)}: ${imgQC.errors.join('; ')}`);
      }
    }
    console.log(`  ✅ All ${renderedVisuals.length} visual cards passed dimension (1200x675) & buffer integrity QC.`);

    // 4. Construct All Steps & Validate Story Pacing
    console.log('\n📖 [QC Phase 3] Validating Investigation Story Pacing & HTML Tags...');
    const step1: InvestigationStep = {
      stepNumber: 1,
      format: 'CASE_INTRO',
      draft: InvestigationModel.buildCaseIntroDraft(mysteryCase),
      visualSpec: step1Spec,
    };

    const step2: InvestigationStep = {
      stepNumber: 2,
      format: 'EVIDENCE',
      draft: InvestigationModel.buildEvidenceDraft(mysteryCase, primaryEvidence),
      visualSpec: step2Spec,
    };

    const step3: InvestigationStep = {
      stepNumber: 3,
      format: 'INVESTIGATION_POLL',
      draft: InvestigationModel.buildInvestigationPollDraft(mysteryCase),
    };

    const step4: InvestigationStep = {
      ...branchResult.step,
      visualSpec: step4Spec,
    };

    const step5: InvestigationStep = {
      stepNumber: 5,
      format: 'FINAL_REVEAL',
      draft: InvestigationModel.buildFinalRevealDraft(mysteryCase),
      visualSpec: step5Spec,
    };

    const allSteps: InvestigationStep[] = [step1, step2, step3, step4, step5];

    // Validate Telegram HTML for each step
    for (const step of allSteps) {
      const htmlText = MysteryContentFormatter.formatPost(step.draft);
      const htmlQC = MysteryQualityChecker.validateTelegramHtml(htmlText);
      if (!htmlQC.isValid) {
        throw new Error(`Telegram HTML validation failed in Step ${step.stepNumber} (${step.format}): ${htmlQC.errors.join('; ')}`);
      }
    }

    // Validate Story Pacing
    const pacingQC = MysteryPacingValidator.validateSequencePacing(mysteryCase, allSteps);
    if (!pacingQC.isValid) {
      throw new Error(`Story pacing validation failed: ${pacingQC.errors.join('; ')}`);
    }
    console.log('  ✅ Narrative pacing, anti-spoiler guards, and Telegram HTML tags fully validated.');

    // 5. Initialize Live Telegram Adapter
    console.log('\n🚀 [Publishing Phase] Dispatching Complete Investigation to Telegram...');
    const adapter = new LiveTelegramInvestigationAdapter(botToken, channelId);
    const publishedRecords: PublishedStepRecord[] = [];

    // --- STEP 1: CASE_INTRO ---
    console.log('\n📤 [1/5] Dispatching CASE_INTRO + Case Cover Graphic...');
    const res1 = await adapter.sendCaseIntro(step1, { visualFilePath: step1VisualRes.filePath });
    const record1: PublishedStepRecord = {
      stepNumber: 1,
      stepType: 'CASE_INTRO',
      headline: step1.draft.headline,
      messageId: res1.messageId,
      visualAssetPath: path.basename(step1VisualRes.filePath),
      publishedAt: res1.dispatchedAt,
    };
    publishedRecords.push(record1);
    state = InvestigationStateManager.transitionTo(state, 'EVIDENCE', {
      stepRecord: record1,
      actionNote: 'LIVE_DISPATCH_CASE_INTRO',
    });
    console.log(`  ✓ CASE_INTRO published (Telegram Message ID: ${res1.messageId})`);

    // --- STEP 2: EVIDENCE ---
    console.log('\n📤 [2/5] Dispatching EVIDENCE + Specimen Graphic...');
    const res2 = await adapter.sendEvidence(step2, { visualFilePath: step2VisualRes.filePath });
    const record2: PublishedStepRecord = {
      stepNumber: 2,
      stepType: 'EVIDENCE',
      headline: step2.draft.headline,
      messageId: res2.messageId,
      visualAssetPath: path.basename(step2VisualRes.filePath),
      publishedAt: res2.dispatchedAt,
    };
    publishedRecords.push(record2);
    state = InvestigationStateManager.transitionTo(state, 'INVESTIGATION_POLL', {
      stepRecord: record2,
      actionNote: 'LIVE_DISPATCH_EVIDENCE',
    });
    console.log(`  ✓ EVIDENCE published (Telegram Message ID: ${res2.messageId})`);

    // --- STEP 3: INVESTIGATION_POLL ---
    console.log('\n📤 [3/5] Dispatching INVESTIGATION_POLL...');
    const res3 = await adapter.sendInvestigationPoll(step3);
    const record3: PublishedStepRecord = {
      stepNumber: 3,
      stepType: 'INVESTIGATION_POLL',
      headline: step3.draft.headline,
      messageId: res3.messageId,
      pollId: res3.pollId,
      publishedAt: res3.dispatchedAt,
    };
    publishedRecords.push(record3);
    console.log(`  ✓ INVESTIGATION_POLL published (Telegram Message ID: ${res3.messageId}, Poll ID: ${res3.pollId})`);

    // --- STEP 4: AUDIENCE_CHOICE (Simulate Choice in Live Test Mode) ---
    console.log(`\n🗳️  [4/5] Applying Simulated Audience Choice (${branchResult.selectedChoice.label})...`);
    state = InvestigationStateManager.transitionTo(state, 'AUDIENCE_CHOICE', {
      selectedChoice: branchResult.selectedChoice,
      actionNote: `LIVE_APPLIED_CHOICE_${branchResult.selectedChoice.choiceId}`,
    });

    // --- STEP 5: CLUE_REVEAL ---
    console.log(`\n📤 [5/5] Dispatching CLUE_REVEAL (${branchResult.branch.title}) + Graphic...`);
    const res4 = await adapter.sendClueReveal(step4, { visualFilePath: step4VisualRes.filePath });
    const record4: PublishedStepRecord = {
      stepNumber: 4,
      stepType: 'CLUE_REVEAL',
      headline: step4.draft.headline,
      messageId: res4.messageId,
      visualAssetPath: path.basename(step4VisualRes.filePath),
      publishedAt: res4.dispatchedAt,
    };
    publishedRecords.push(record4);
    state = InvestigationStateManager.transitionTo(state, 'CLUE_REVEAL', {
      stepRecord: record4,
      revealedClueId: branchResult.unlockedEvidenceId,
      actionNote: `LIVE_REVEALED_CLUE_${branchResult.unlockedEvidenceId}`,
    });
    console.log(`  ✓ CLUE_REVEAL published (Telegram Message ID: ${res4.messageId})`);

    // --- STEP 6: FINAL_REVEAL ---
    console.log('\n📤 [6/5] Dispatching FINAL_REVEAL (Case Resolution) + Graphic...');
    const res5 = await adapter.sendFinalReveal(step5, { visualFilePath: step5VisualRes.filePath });
    const record5: PublishedStepRecord = {
      stepNumber: 5,
      stepType: 'FINAL_REVEAL',
      headline: step5.draft.headline,
      messageId: res5.messageId,
      visualAssetPath: path.basename(step5VisualRes.filePath),
      publishedAt: res5.dispatchedAt,
    };
    publishedRecords.push(record5);
    state = InvestigationStateManager.transitionTo(state, 'FINAL_REVEAL', {
      stepRecord: record5,
      finalResolutionStatus: 'RESOLVED',
      actionNote: 'LIVE_DISPATCH_FINAL_REVEAL',
    });
    state = InvestigationStateManager.transitionTo(state, 'COMPLETED', {
      actionNote: 'LIVE_CASE_COMPLETED',
    });
    console.log(`  ✓ FINAL_REVEAL published (Telegram Message ID: ${res5.messageId})`);

    // 6. Save State and Generate Report
    const stateFilePath = path.join(outputDir, 'live-state.json');
    InvestigationStateManager.saveToFile(state, stateFilePath);

    const report: LiveMysteryTestReport = {
      caseId: mysteryCase.caseId,
      caseTitle: mysteryCase.title,
      difficulty: mysteryCase.difficulty,
      publishedAt: new Date().toISOString(),
      channelTarget: channelId || 'MOCK_CHANNEL',
      status: 'RESOLVED',
      steps: publishedRecords,
      selectedChoice: branchResult.selectedChoice,
      qcResults: {
        caseValid: caseQC.isValid,
        visualsValid: true,
        pacingValid: pacingQC.isValid,
        telegramHtmlValid: true,
      },
      outputFiles: [...renderedVisuals, stateFilePath],
      executionTimeMs: Date.now() - startTime,
    };

    const reportPath = path.join(outputDir, 'live-test-report.json');
    const rootReportPath = path.resolve(process.cwd(), 'live-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    fs.writeFileSync(rootReportPath, JSON.stringify(report, null, 2), 'utf-8');

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🎉 TELEGRAM MYSTERY LIVE TEST COMPLETED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Case ID:              ${report.caseId}`);
    console.log(`Case Title:           ${report.caseTitle}`);
    console.log(`Status:               ${report.status}`);
    console.log(`Total Telegram Posts: ${publishedRecords.length}`);
    publishedRecords.forEach((rec) => {
      console.log(`  - [Step ${rec.stepNumber} ${rec.stepType}] Telegram Msg ID: ${rec.messageId}${rec.pollId ? ` | Poll ID: ${rec.pollId}` : ''}`);
    });
    console.log(`Report Saved To:      ${reportPath} and ./live-test-report.json`);
    console.log(`Execution Duration:   ${report.executionTimeMs}ms\n`);

    return report;
  }
}

// Support direct script execution via CLI
if (
  process.argv[1] &&
  (process.argv[1].endsWith('liveTest.ts') ||
    process.argv[1].includes('mystery:live-test'))
) {
  LiveMysteryTestRunner.runLiveTest().catch((err) => {
    console.error('\n❌ Fatal Live Mystery Test Error:', err);
    process.exit(1);
  });
}

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { E2ESimulationRunner } from '../src/pipeline/dilemmas/e2e-simulation-runner.js';

describe('Pick Your Fate — End-to-End Interaction Engine Simulation', () => {
  const runner = new E2ESimulationRunner();
  const outputDir = path.resolve(process.cwd(), 'data', 'e2e-simulation');

  it('runs the complete 6-scenario end-to-end dry run and writes verified artifacts', async () => {
    const report = await runner.runFullSimulation(outputDir);

    // Summary verifications
    assert.equal(report.dryRun, true);
    assert.equal(report.summary.scenariosExecuted, 6);
    assert.equal(report.summary.scenariosPassed, 6);
    assert.equal(report.summary.scenariosFailed, 0);
    assert.equal(report.summary.zeroRealTelegramCalls, true);
    assert.equal(report.summary.zeroOrphanRecords, true);
    assert.equal(report.summary.zeroDuplicatePublications, true);

    // Scenario 1 verifications (Native Poll)
    const s1 = report.scenarios.scenario1_nativePoll;
    assert.equal(s1.status, 'passed');
    assert.equal(s1.qualityPassed, true);
    assert.ok(s1.title.length > 5);
    assert.deepEqual(s1.lifecycleTransitions, [
      'DRAFT',
      'VALIDATED',
      'PUBLISHED',
      'OPEN',
      'CLOSED',
      'RESOLVING',
      'RESULT_POSTED',
      'COMPLETED',
    ]);
    assert.ok(s1.telegramMockIds.mainMessageId > 0);
    assert.ok(s1.telegramMockIds.pollMessageId > 0);
    assert.ok(s1.telegramMockIds.resultMessageId > 0);
    assert.equal(s1.voteChanges.initialVotesCount, 5);
    assert.equal(s1.voteChanges.afterChangeCount, 5);
    assert.equal(s1.voteChanges.afterWithdrawCount, 4);
    assert.equal(s1.voteChanges.duplicateUpdateHandled, true);
    assert.equal(s1.finalVoteDistribution.totalParticipants, 4);
    assert.ok(s1.finalVoteDistribution.winningPercentage! > 0);
    assert.ok(s1.revealText.length > 10);

    // Scenario 2 verifications (Non-Poll Content)
    const s2 = report.scenarios.scenario2_nonPollContent;
    assert.equal(s2.status, 'passed');
    assert.equal(s2.qualityPassed, true);
    assert.equal(s2.interactionType, 'open_discussion');
    assert.equal(s2.pollCreated, false);
    assert.equal(s2.resultPublished, true);

    // Scenario 3 verifications (Failure & Recovery)
    const s3 = report.scenarios.scenario3_failureRecovery;
    assert.equal(s3.status, 'passed');
    assert.equal(s3.duplicatePostsPrevented, true);
    assert.equal(s3.duplicateResultsPrevented, true);
    assert.equal(s3.lifecycleTransitionsGuarded, true);
    assert.ok(s3.tests.every((t) => t.passed));

    // Scenario 4 verifications (Concurrency)
    const s4 = report.scenarios.scenario4_concurrency;
    assert.equal(s4.status, 'passed');
    assert.equal(s4.totalPollStops, 1);
    assert.equal(s4.totalResultPosts, 1);
    assert.equal(s4.isConsistent, true);

    // Scenario 5 verifications (Webhook Security)
    const s5 = report.scenarios.scenario5_webhookSecurity;
    assert.equal(s5.status, 'passed');
    assert.equal(s5.secretsExposedInLogs, false);
    assert.ok(s5.checks.every((c) => c.passed));

    // Scenario 6 verifications (Data Integrity & Orphan Auditing)
    const s6 = report.scenarios.scenario6_dataIntegrity;
    assert.equal(s6.status, 'passed');
    assert.equal(s6.allChainsIntact, true);
    assert.equal(s6.orphanChecks.interactionsWithoutPost, 0);
    assert.equal(s6.orphanChecks.publishedMessagesWithoutPost, 0);
    assert.equal(s6.orphanChecks.pollsWithoutInteraction, 0);
    assert.equal(s6.orphanChecks.pollOptionsWithoutPoll, 0);
    assert.equal(s6.orphanChecks.votesWithoutPoll, 0);
    assert.equal(s6.orphanChecks.votesWithoutUser, 0);
    assert.equal(s6.orphanChecks.resultsWithoutInteraction, 0);

    // Verify written report files exist on disk
    const reportJsonPath = path.join(outputDir, 'e2e-simulation-report.json');
    const summaryMdPath = path.join(outputDir, 'e2e-simulation-summary.md');

    assert.ok(fs.existsSync(reportJsonPath), 'e2e-simulation-report.json must be written');
    assert.ok(fs.existsSync(summaryMdPath), 'e2e-simulation-summary.md must be written');

    const jsonContent = JSON.parse(fs.readFileSync(reportJsonPath, 'utf-8'));
    assert.equal(jsonContent.summary.scenariosPassed, 6);

    const mdContent = fs.readFileSync(summaryMdPath, 'utf-8');
    assert.ok(mdContent.includes('Pick Your Fate — End-to-End Interaction Engine Simulation Report'));
    assert.ok(mdContent.includes('6/6 SCENARIOS PASSED'));
  });
});

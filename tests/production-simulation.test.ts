import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ProductionSimulator } from '../src/pipeline/dilemmas/simulation.js';
import { DilemmaQualityChecker } from '../src/pipeline/dilemmas/quality.js';

describe('Pick Your Fate — Production Simulation Suite (Dry-Run)', () => {
  const simulator = new ProductionSimulator();
  const outputDir = path.resolve(process.cwd(), 'data', 'simulation-output');

  it('runs the end-to-end production simulation across a mixed publishing cycle', () => {
    const report = simulator.runFullSimulation(outputDir);

    assert.ok(report);
    assert.equal(report.dryRun, true);
    assert.ok(report.summary.totalGenerated >= 10);
    assert.equal(report.summary.finalAccepted, report.summary.totalGenerated);
    assert.equal(report.summary.rejected, 0);
    assert.equal(report.summary.zeroInvalidContentPublished, true);

    // Verify machine-readable report exists and is valid JSON
    const reportPath = path.join(outputDir, 'production-simulation-report.json');
    assert.ok(fs.existsSync(reportPath), 'production-simulation-report.json must exist');
    const savedReport = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
    assert.equal(savedReport.summary.totalGenerated, report.summary.totalGenerated);

    // Verify human-readable summary exists
    const summaryPath = path.join(outputDir, 'production-simulation-summary.md');
    assert.ok(fs.existsSync(summaryPath), 'production-simulation-summary.md must exist');
    const summaryContent = fs.readFileSync(summaryPath, 'utf-8');
    assert.ok(summaryContent.includes('Pick Your Fate — End-to-End Production Simulation Report'));
  });

  it('verifies mixed batch archetypes (not exclusively dilemmas)', () => {
    const plan = simulator.getPublishingBatchPlan();
    const archetypes = new Set(plan.map((p) => p.archetype));

    // Verify mixed batch archetypes
    assert.ok(archetypes.has('Impossible Dilemmas'), 'Must contain Impossible Dilemmas');
    assert.ok(archetypes.has('Survival Scenarios'), 'Must contain Survival Scenarios');
    assert.ok(archetypes.has('Strategy Challenges'), 'Must contain Strategy Challenges');
    assert.ok(archetypes.has('Mini Mysteries'), 'Must contain Mini Mysteries');
    assert.ok(archetypes.has('Future/Technology Scenarios'), 'Must contain Future/Technology Scenarios');
    assert.ok(archetypes.has('Social Dilemmas'), 'Must contain Social Dilemmas');
    assert.ok(archetypes.has('Chaotic Scenarios'), 'Must contain Chaotic Scenarios');
    assert.ok(archetypes.has('Predictions or Challenges'), 'Must contain Predictions or Challenges');

    assert.ok(archetypes.size >= 7, 'Must have at least 7 distinct scenario archetypes');
  });

  it('verifies content depth distribution (Quick, Standard, Deep)', () => {
    const plan = simulator.getPublishingBatchPlan();
    const depths = new Set(plan.map((p) => p.depth));

    assert.ok(depths.has('quick'), 'Must include quick depth');
    assert.ok(depths.has('standard'), 'Must include standard depth');
    assert.ok(depths.has('deep'), 'Must include deep depth');
  });

  it('verifies non-poll content formats and interaction configurations', () => {
    const plan = simulator.getPublishingBatchPlan();
    const interactionTypes = new Set(plan.map((p) => p.interactionType));

    assert.ok(interactionTypes.has('poll'), 'Must include poll');
    assert.ok(interactionTypes.has('open_discussion'), 'Must include open discussion');
    assert.ok(interactionTypes.has('prediction_vote'), 'Must include prediction vote');
    assert.ok(interactionTypes.has('scenario_choice'), 'Must include scenario choice');
  });

  it('validates publication payloads: HTML, character limits, payoff, and metadata', () => {
    const plan = simulator.getPublishingBatchPlan();

    for (let i = 0; i < plan.length; i++) {
      const slot = plan[i];
      const log = simulator.simulatePipelineForSlot(slot, i + 1);

      assert.ok(log.publishedPayload, `Slot ${slot.slotId} must generate a publication payload`);
      const payload = log.publishedPayload;

      // 1. Target and parse mode
      assert.equal(payload.publicationTarget, 'telegram_channel');
      assert.equal(payload.parseMode, 'HTML');
      assert.equal(payload.publishedAt, null, 'Must remain unpublished in dry run');
      assert.equal(payload.status, 'READY_FOR_PUBLICATION');

      // 2. Telegram message limits
      assert.ok(payload.messageText.length > 50, 'Message text must not be empty');
      assert.ok(payload.messageText.length <= 4096, 'Message text must be <= 4096 chars');

      // 3. Telegram HTML tags balanced
      const allowedTags = ['b', 'i', 'code', 'pre', 'a', 'tg-spoiler'];
      for (const tag of allowedTags) {
        const openMatches = (payload.messageText.match(new RegExp(`<${tag}(\\s+[^>]*)?>`, 'gi')) || []).length;
        const closeMatches = (payload.messageText.match(new RegExp(`</${tag}>`, 'gi')) || []).length;
        assert.equal(openMatches, closeMatches, `Tag <${tag}> must be balanced in ${slot.slotId}`);
      }

      // 4. Payoff / reveal metadata present
      assert.ok(payload.metadata.revealPayoff.reveal.length >= 20, 'Reveal payoff must be present');
      assert.ok(payload.metadata.revealPayoff.surprisingOutcome.length >= 10, 'Surprising outcome must be present');

      // 5. Interaction validation
      if (payload.interaction.poll) {
        assert.ok(payload.interaction.poll.question.length <= 300, 'Poll question <= 300 chars');
        assert.ok(payload.interaction.poll.options.length >= 2, 'Poll options >= 2');
        assert.ok(payload.interaction.poll.options.length <= 10, 'Poll options <= 10');
        for (const opt of payload.interaction.poll.options) {
          assert.ok(opt.length <= 100, 'Poll option label <= 100 chars');
        }
      }
    }
  });

  describe('Deliberate Failure Scenario Interception (9 Defect Classes)', () => {
    it('verifies that all 9 deliberate failure classes are safely intercepted and prevented from publishing', () => {
      const results = simulator.runDeliberateFailureTests();

      assert.equal(results.length, 9, 'Must test all 9 deliberate failure classes');

      for (const result of results) {
        assert.equal(
          result.reachedPublicationUnsafely,
          false,
          `Defect "${result.failureClass}" must NOT reach publication unsafely`
        );
        assert.equal(
          result.repairedOrHandledSafely,
          true,
          `Defect "${result.failureClass}" must be repaired or safely handled`
        );
      }

      const classes = results.map((r) => r.failureClass);
      assert.ok(classes.includes('Generic Trade-Off Formula'));
      assert.ok(classes.includes('Ungrounded Hypothetical'));
      assert.ok(classes.includes('Cost-Free Choice'));
      assert.ok(classes.includes('Dominant Choice'));
      assert.ok(classes.includes('Academic / Psychology Lecture'));
      assert.ok(classes.includes('Invalid Telegram HTML'));
      assert.ok(classes.includes('Overlong Telegram Content'));
      assert.ok(classes.includes('Missing Required Field'));
      assert.ok(classes.includes('Malformed Interaction Configuration'));
    });
  });
});

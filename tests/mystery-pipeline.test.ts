/**
 * Mystery & Interactive Investigations Pipeline Test Suite
 * Validates case generation, investigation model, content formatting,
 * deterministic visual asset generation, quality control gate, and clue consistency.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  MysteryCaseGenerator,
  CURATED_MYSTERY_CASES,
  InvestigationModel,
  MysteryContentFormatter,
  MysteryQualityChecker,
  MysteryVisualGenerator,
  MysteryCase,
  MysteryPostDraft,
} from '../src/pipeline/mystery/index.js';

describe('Mystery & Interactive Investigations Pipeline', () => {
  const generator = new MysteryCaseGenerator();

  it('should generate valid fictional mystery cases with required structure', async () => {
    const mysteryCase = await generator.generateCase({ seedIndex: 0 });

    assert.ok(mysteryCase.caseId.startsWith('CASE-'));
    assert.equal(mysteryCase.caseType, 'fictional');
    assert.ok(mysteryCase.title.length > 5);
    assert.ok(mysteryCase.premise.length > 20);
    assert.ok(mysteryCase.mysteryQuestion.length > 10);
    assert.ok(mysteryCase.characters.length >= 2);
    assert.ok(mysteryCase.evidence.length >= 2);
    assert.ok(mysteryCase.possibleExplanations.length >= 2);
    assert.ok(mysteryCase.correctResolution.answer.length > 10);
    assert.ok(mysteryCase.correctResolution.culpritOrCause.length > 0);

    const qc = MysteryQualityChecker.validateCase(mysteryCase);
    assert.equal(qc.isValid, true, `QC failed with errors: ${qc.errors.join(', ')}`);
    assert.equal(qc.errors.length, 0);
  });

  it('should validate all curated mystery cases for logical integrity and clue consistency', () => {
    for (const testCase of CURATED_MYSTERY_CASES) {
      const qc = MysteryQualityChecker.validateCase(testCase);
      assert.equal(
        qc.isValid,
        true,
        `Curated case "${testCase.title}" failed QC: ${qc.errors.join(', ')}`
      );
    }
  });

  it('should detect invalid and incomplete cases in quality control', () => {
    const invalidCase: MysteryCase = {
      caseId: '',
      title: '',
      caseType: 'fictional',
      difficulty: 'intermediate',
      tags: [],
      premise: 'Too short',
      setting: { location: '' },
      characters: [],
      mysteryQuestion: 'Why?',
      evidence: [],
      possibleExplanations: [],
      correctResolution: {
        answer: '',
        culpritOrCause: '',
        keyClueIds: [],
        howDeductionWorks: '',
      },
      createdAt: new Date().toISOString(),
    };

    const qc = MysteryQualityChecker.validateCase(invalidCase);
    assert.equal(qc.isValid, false);
    assert.ok(qc.errors.some((e) => e.includes('caseId')));
    assert.ok(qc.errors.some((e) => e.includes('title')));
    assert.ok(qc.errors.some((e) => e.includes('premise')));
    assert.ok(qc.errors.some((e) => e.includes('characters')));
    assert.ok(qc.errors.some((e) => e.includes('evidence')));
    assert.ok(qc.errors.some((e) => e.includes('explanations')));
  });

  it('should flag clue consistency errors when hypotheses cite non-existent evidence IDs', () => {
    const baseCase = CURATED_MYSTERY_CASES[0];
    const brokenCase: MysteryCase = {
      ...baseCase,
      possibleExplanations: [
        {
          id: 'hyp-broken',
          hypothesis: 'The suspect used a fictional teleportation device.',
          plausibility: 'low',
          supportingEvidenceIds: ['ev-nonexistent-999'],
          counterEvidenceIds: ['ev-fake-123'],
        },
        {
          id: 'hyp-valid',
          hypothesis: 'Valid explanation.',
          plausibility: 'high',
          supportingEvidenceIds: ['ev-1'],
          counterEvidenceIds: [],
        },
      ],
      correctResolution: {
        ...baseCase.correctResolution,
        keyClueIds: ['ev-phantom-ghost'],
      },
    };

    const qc = MysteryQualityChecker.validateCase(brokenCase);
    assert.equal(qc.isValid, false);
    assert.ok(qc.errors.some((e) => e.includes('ev-nonexistent-999')));
    assert.ok(qc.errors.some((e) => e.includes('ev-fake-123')));
    assert.ok(qc.errors.some((e) => e.includes('ev-phantom-ghost')));
  });

  it('should build a complete 5-step investigation sequence from a mystery case', () => {
    const mysteryCase = CURATED_MYSTERY_CASES[0];
    const sequence = InvestigationModel.buildInvestigationSequence(mysteryCase);

    assert.equal(sequence.caseId, mysteryCase.caseId);
    assert.equal(sequence.steps.length, 5);

    const formats = sequence.steps.map((s) => s.format);
    assert.deepEqual(formats, [
      'CASE_INTRO',
      'EVIDENCE',
      'INVESTIGATION_POLL',
      'CLUE_REVEAL',
      'FINAL_REVEAL',
    ]);

    // Check each step draft
    sequence.steps.forEach((step) => {
      const draftValidation = MysteryQualityChecker.validateDraft(step.draft);
      assert.equal(
        draftValidation.isValid,
        true,
        `Step ${step.stepNumber} (${step.format}) draft failed validation: ${draftValidation.errors.join(', ')}`
      );
    });
  });

  it('should format all 5 mystery Telegram formats with appropriate visual emoji anchors', () => {
    const mysteryCase = CURATED_MYSTERY_CASES[0];
    const sequence = InvestigationModel.buildInvestigationSequence(mysteryCase);

    // 1. CASE_INTRO
    const introHtml = MysteryContentFormatter.formatPost(sequence.steps[0].draft);
    assert.ok(introHtml.includes('📁 <b>CASE FILE'));
    assert.ok(introHtml.includes('📍 <b>Setting:</b>'));
    assert.ok(introHtml.includes('❓ <b>The Core Enigma:</b>'));
    assert.ok(introHtml.includes('👥 <b>Persons of Interest:</b>'));

    // 2. EVIDENCE
    const evidenceHtml = MysteryContentFormatter.formatPost(sequence.steps[1].draft);
    assert.ok(evidenceHtml.includes('🧪 <b>EVIDENCE LOG'));
    assert.ok(evidenceHtml.includes('📍 <b>Location Discovered:</b>'));
    assert.ok(evidenceHtml.includes('🔍 <b>Forensic Significance:</b>'));

    // 3. INVESTIGATION_POLL
    const pollHtml = MysteryContentFormatter.formatPost(sequence.steps[2].draft);
    assert.ok(pollHtml.includes('📊 <b>INVESTIGATION DIRECTIVE'));
    assert.ok(pollHtml.includes('1️⃣'));
    assert.ok(pollHtml.includes('2️⃣'));

    // 4. CLUE_REVEAL
    const clueHtml = MysteryContentFormatter.formatPost(sequence.steps[3].draft);
    assert.ok(clueHtml.includes('💡 <b>CRITICAL BREAKTHROUGH'));
    assert.ok(clueHtml.includes('💡 <b>The Key Discovery:</b>'));

    // 5. FINAL_REVEAL
    const revealHtml = MysteryContentFormatter.formatPost(sequence.steps[4].draft);
    assert.ok(revealHtml.includes('⚖️ <b>CASE CLOSED'));
    assert.ok(revealHtml.includes('⚖️ <b>The Solution:</b>'));
    assert.ok(revealHtml.includes('👤 <b>Culprit / Root Cause:</b>'));
    assert.ok(revealHtml.includes('🧩 <b>The Deduction Chain:</b>'));
  });

  it('should enforce single-message visual caption limit (<= 1024 characters)', () => {
    const mysteryCase = CURATED_MYSTERY_CASES[0];
    const sequence = InvestigationModel.buildInvestigationSequence(mysteryCase);

    sequence.steps.forEach((step) => {
      const caption = MysteryContentFormatter.formatVisualCaption(step.draft);
      assert.ok(
        caption.length <= 1024,
        `Step ${step.stepNumber} visual caption length ${caption.length} exceeded 1024 chars`
      );
    });
  });

  it('should validate poll options and reject invalid poll configurations', () => {
    const invalidPollDraft: MysteryPostDraft = {
      caseId: 'CASE-TEST',
      caseTitle: 'Test Case',
      format: 'INVESTIGATION_POLL',
      headline: 'Poll Test',
      hook: 'Investigate this.',
      bodyParagraphs: ['Test body'],
      poll: {
        question: 'Who?',
        options: ['Option 1'], // Invalid: only 1 option
      },
    };

    const res = MysteryQualityChecker.validateDraft(invalidPollDraft);
    assert.equal(res.isValid, false);
    assert.ok(res.errors.some((e) => e.includes('between 2 and 4 options')));

    const duplicatePollDraft: MysteryPostDraft = {
      ...invalidPollDraft,
      poll: {
        question: 'Who did it?',
        options: ['Suspect A', 'Suspect A'], // Invalid: duplicate options
      },
    };

    const dupRes = MysteryQualityChecker.validateDraft(duplicatePollDraft);
    assert.equal(dupRes.isValid, false);
    assert.ok(dupRes.errors.some((e) => e.includes('distinct and non-duplicate')));
  });

  it('should render all 6 deterministic visual cards with exact 1200x675 dimensions', async () => {
    const visualGen = new MysteryVisualGenerator();
    const mysteryCase = CURATED_MYSTERY_CASES[0];

    // 1. case_cover_card
    const coverSpec = InvestigationModel.buildCaseCoverSpec(mysteryCase);
    const coverRes = await visualGen.renderGraphic(coverSpec, 'test-cover');
    assert.equal(coverRes.width, 1200);
    assert.equal(coverRes.height, 675);
    assert.ok(fs.existsSync(coverRes.filePath));
    const coverQC = await MysteryQualityChecker.validateVisualAsset(coverRes.filePath);
    assert.equal(coverQC.isValid, true);
    assert.equal(coverQC.width, 1200);
    assert.equal(coverQC.height, 675);

    // 2. evidence_card
    const evSpec = InvestigationModel.buildEvidenceCardSpec(mysteryCase, mysteryCase.evidence[0]);
    const evRes = await visualGen.renderGraphic(evSpec, 'test-evidence');
    assert.equal(evRes.width, 1200);
    assert.equal(evRes.height, 675);
    const evQC = await MysteryQualityChecker.validateVisualAsset(evRes.filePath);
    assert.equal(evQC.isValid, true);

    // 3. clue_card
    const clueSpec = InvestigationModel.buildClueCardSpec(mysteryCase, mysteryCase.evidence[0]);
    const clueRes = await visualGen.renderGraphic(clueSpec, 'test-clue');
    assert.equal(clueRes.width, 1200);
    assert.equal(clueRes.height, 675);
    const clueQC = await MysteryQualityChecker.validateVisualAsset(clueRes.filePath);
    assert.equal(clueQC.isValid, true);

    // 4. suspect_card
    const suspectSpec = {
      title: mysteryCase.characters[0].name,
      tag: 'PERSON OF INTEREST',
      caseId: mysteryCase.caseId,
      template: 'suspect_card' as const,
      payload: {
        template: 'suspect_card' as const,
        data: {
          caseNumber: mysteryCase.caseId,
          suspectName: mysteryCase.characters[0].name,
          role: mysteryCase.characters[0].role,
          motive: mysteryCase.characters[0].alibiOrMotive,
          alibi: 'Claims to have been in the laboratory',
          suspiciousDetail: mysteryCase.characters[0].notes || 'Inconsistent timeline',
          isPrimarySuspect: true,
        },
      },
    };
    const suspectRes = await visualGen.renderGraphic(suspectSpec, 'test-suspect');
    assert.equal(suspectRes.width, 1200);
    assert.equal(suspectRes.height, 675);
    const suspectQC = await MysteryQualityChecker.validateVisualAsset(suspectRes.filePath);
    assert.equal(suspectQC.isValid, true);

    // 5. timeline_card
    const timelineSpec = {
      title: 'Incident Chronology',
      tag: 'CHRONOLOGY',
      caseId: mysteryCase.caseId,
      template: 'timeline_card' as const,
      payload: {
        template: 'timeline_card' as const,
        data: {
          caseNumber: mysteryCase.caseId,
          caseTitle: mysteryCase.title,
          events: mysteryCase.timeline || [
            { timestamp: '21:00', title: 'Arrival', description: 'Subject arrived at the estate.' },
            { timestamp: '22:15', title: 'Incident', description: 'Alarm sounded.' },
          ],
        },
      },
    };
    const timelineRes = await visualGen.renderGraphic(timelineSpec, 'test-timeline');
    assert.equal(timelineRes.width, 1200);
    assert.equal(timelineRes.height, 675);
    const timelineQC = await MysteryQualityChecker.validateVisualAsset(timelineRes.filePath);
    assert.equal(timelineQC.isValid, true);

    // 6. final_reveal_card
    const revealSpec = InvestigationModel.buildFinalRevealCardSpec(mysteryCase);
    const revealRes = await visualGen.renderGraphic(revealSpec, 'test-reveal');
    assert.equal(revealRes.width, 1200);
    assert.equal(revealRes.height, 675);
    const revealQC = await MysteryQualityChecker.validateVisualAsset(revealRes.filePath);
    assert.equal(revealQC.isValid, true);

    // Clean up temporary test generated visual files
    [coverRes, evRes, clueRes, suspectRes, timelineRes, revealRes].forEach((r) => {
      try {
        fs.unlinkSync(r.filePath);
      } catch {}
    });
  });

  it('should detect identical visual specifications via deterministic fingerprinting', () => {
    const mysteryCase = CURATED_MYSTERY_CASES[0];
    const spec1 = InvestigationModel.buildCaseCoverSpec(mysteryCase);
    const spec2 = InvestigationModel.buildCaseCoverSpec(mysteryCase);

    const hash1 = MysteryVisualGenerator.computeSpecFingerprint(spec1);
    const hash2 = MysteryVisualGenerator.computeSpecFingerprint(spec2);

    assert.equal(hash1, hash2);
    assert.equal(typeof hash1, 'string');
    assert.equal(hash1.length, 64);
  });
});

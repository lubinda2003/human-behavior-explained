/**
 * Mystery Quality Control & Content Linter Test Suite
 * Tests text QC (HTML tags, length, repetition), poll QC,
 * case integrity QC, and image QC.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { MysteryQualityChecker } from '../src/pipeline/mystery/quality.js';
import { MysteryCase, MysteryPostDraft } from '../src/pipeline/mystery/types.js';

describe('Mystery Quality Control Suite', () => {
  describe('Telegram HTML Validation', () => {
    it('accepts valid Telegram HTML tags (b, i, code, s, u, pre, a)', () => {
      const validHtml =
        '<b>Case Title</b>\n\n' +
        '<i>Key Observation:</i> <code>#EV-01</code>\n\n' +
        '<u>Investigator Note</u>: <s>Old suspect cleared</s>\n\n' +
        '<pre>Decrypted cipher text log</pre>\n' +
        '<a href="https://t.me/c/12345/678">Reference link</a>';

      const result = MysteryQualityChecker.validateTelegramHtml(validHtml);
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.errors.length, 0);
    });

    it('rejects unsupported HTML tags (div, p, span, br, script, iframe)', () => {
      const invalidHtml = '<div><p>Paragraph text</p><br><span>Inline</span></div>';
      const result = MysteryQualityChecker.validateTelegramHtml(invalidHtml);
      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.some((e) => e.includes('unsupported HTML tags')));
    });

    it('rejects unbalanced Telegram HTML tags', () => {
      const unclosedTag = '<b>Important Clue</i> with mismatched tags';
      const result = MysteryQualityChecker.validateTelegramHtml(unclosedTag);
      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.some((e) => e.includes('Unbalanced')));
    });
  });

  describe('Telegram Text & Repetition Validation', () => {
    it('rejects empty copy', () => {
      const result = MysteryQualityChecker.validateTextCopy('   ');
      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.some((e) => e.includes('empty')));
    });

    it('rejects caption exceeding 1024 characters', () => {
      const longText = 'A'.repeat(1050);
      const result = MysteryQualityChecker.validateTextCopy(longText, true);
      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.some((e) => e.includes('exceeds maximum allowed limit')));
    });

    it('rejects duplicate/repeated paragraphs', () => {
      const repetitiveText =
        'The quick brown fox jumped over the lazy sleeping hound.\n\n' +
        'Second distinct paragraph describing forensic details.\n\n' +
        'The quick brown fox jumped over the lazy sleeping hound.';

      const result = MysteryQualityChecker.validateTextCopy(repetitiveText, false);
      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.some((e) => e.includes('Duplicate/repeated paragraph')));
    });
  });

  describe('Investigation Poll Validation', () => {
    it('validates correct 2-4 poll options', () => {
      const draft: MysteryPostDraft = {
        caseId: 'CASE-01',
        caseTitle: 'Test Case',
        format: 'INVESTIGATION_POLL',
        headline: 'Who forged the clockwork mechanism?',
        hook: 'Cast your vote based on the timeline logs.',
        bodyParagraphs: ['Evaluate the alibis and vote below.'],
        poll: {
          question: 'Who tampered with the counterweight?',
          options: ['Karel Novak (Apprentice)', 'Master Vane (Guildmaster)', 'External intruder'],
        },
      };

      const result = MysteryQualityChecker.validateDraft(draft);
      assert.strictEqual(result.isValid, true);
    });

    it('rejects duplicate poll options', () => {
      const draft: MysteryPostDraft = {
        caseId: 'CASE-01',
        caseTitle: 'Test Case',
        format: 'INVESTIGATION_POLL',
        headline: 'Vote',
        hook: 'Vote',
        bodyParagraphs: ['Paragraph'],
        poll: {
          question: 'Who is the culprit?',
          options: ['Apprentice', 'Apprentice', 'Master'],
        },
      };

      const result = MysteryQualityChecker.validateDraft(draft);
      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.some((e) => e.includes('non-duplicate')));
    });

    it('rejects poll with fewer than 2 options', () => {
      const draft: MysteryPostDraft = {
        caseId: 'CASE-01',
        caseTitle: 'Test Case',
        format: 'INVESTIGATION_POLL',
        headline: 'Vote',
        hook: 'Vote',
        bodyParagraphs: ['Paragraph'],
        poll: {
          question: 'Who is the culprit?',
          options: ['Single Option'],
        },
      };

      const result = MysteryQualityChecker.validateDraft(draft);
      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.some((e) => e.includes('between 2 and 4 options')));
    });

    it('rejects poll option exceeding 100 characters', () => {
      const draft: MysteryPostDraft = {
        caseId: 'CASE-01',
        caseTitle: 'Test Case',
        format: 'INVESTIGATION_POLL',
        headline: 'Vote',
        hook: 'Vote',
        bodyParagraphs: ['Paragraph'],
        poll: {
          question: 'Who is the culprit?',
          options: ['Option A', 'B'.repeat(105)],
        },
      };

      const result = MysteryQualityChecker.validateDraft(draft);
      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.some((e) => e.includes('exceeds 100 characters')));
    });
  });

  describe('Mystery Case Integrity Validation', () => {
    it('detects missing required case fields', () => {
      const brokenCase: any = {
        caseId: '',
        title: '',
        premise: 'Too short',
      };
      const result = MysteryQualityChecker.validateCase(brokenCase);
      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.some((e) => e.includes('missing a valid caseId')));
      assert.ok(result.errors.some((e) => e.includes('missing a title')));
      assert.ok(result.errors.some((e) => e.includes('premise is missing or too brief')));
    });

    it('detects hypothesis referencing non-existent evidence ID', () => {
      const invalidRefCase: MysteryCase = {
        caseId: 'CASE-FAIL-01',
        title: 'Broken Evidence Link Case',
        caseType: 'fictional',
        difficulty: 'intermediate',
        tags: ['test'],
        premise: 'A complete and sufficiently long premise describing the incident in detail.',
        mysteryQuestion: 'How was the locked vault opened without the combination?',
        setting: { location: 'Central Vault' },
        characters: [
          { id: 'c1', name: 'Suspect 1', role: 'Role A', description: 'Desc', alibiOrMotive: 'Motive', isSuspect: true },
          { id: 'c2', name: 'Suspect 2', role: 'Role B', description: 'Desc', alibiOrMotive: 'Motive', isSuspect: false },
        ],
        evidence: [
          { id: 'ev-1', title: 'Bent Lockpick', type: 'physical', locationFound: 'Vault door', significance: 'Pivotal' },
          { id: 'ev-2', title: 'Thermal Torch', type: 'physical', locationFound: 'Alley', significance: 'Secondary' },
        ],
        possibleExplanations: [
          {
            id: 'hyp-1',
            hypothesis: 'The suspect used the ghost clue to bypass the lock.',
            plausibility: 'medium',
            supportingEvidenceIds: ['ev-nonexistent-99'],
            counterEvidenceIds: [],
          },
          {
            id: 'hyp-2',
            hypothesis: 'The lockpick was used directly.',
            plausibility: 'high',
            supportingEvidenceIds: ['ev-1'],
            counterEvidenceIds: [],
          },
        ],
        correctResolution: {
          answer: 'The lock was picked using the bent tool.',
          culpritOrCause: 'Suspect 1',
          keyClueIds: ['ev-1'],
          howDeductionWorks: 'The scratches on the tumbler match the width of tool ev-1 exactly.',
        },
        createdAt: new Date().toISOString(),
      };

      const result = MysteryQualityChecker.validateCase(invalidRefCase);
      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.some((e) => e.includes('references non-existent supporting evidence ID: "ev-nonexistent-99"')));
    });

    it('detects resolution referencing non-existent key clue ID', () => {
      const invalidResolutionCase: MysteryCase = {
        caseId: 'CASE-FAIL-02',
        title: 'Broken Key Clue Case',
        caseType: 'fictional',
        difficulty: 'intermediate',
        tags: ['test'],
        premise: 'A complete and sufficiently long premise describing the incident in detail.',
        mysteryQuestion: 'How was the locked vault opened without the combination?',
        setting: { location: 'Central Vault' },
        characters: [
          { id: 'c1', name: 'Suspect 1', role: 'Role A', description: 'Desc', alibiOrMotive: 'Motive', isSuspect: true },
          { id: 'c2', name: 'Suspect 2', role: 'Role B', description: 'Desc', alibiOrMotive: 'Motive', isSuspect: false },
        ],
        evidence: [
          { id: 'ev-1', title: 'Bent Lockpick', type: 'physical', locationFound: 'Vault door', significance: 'Pivotal' },
          { id: 'ev-2', title: 'Thermal Torch', type: 'physical', locationFound: 'Alley', significance: 'Secondary' },
        ],
        possibleExplanations: [
          { id: 'hyp-1', hypothesis: 'Hypothesis A explanation in full', plausibility: 'high', supportingEvidenceIds: ['ev-1'], counterEvidenceIds: [] },
          { id: 'hyp-2', hypothesis: 'Hypothesis B explanation in full', plausibility: 'low', supportingEvidenceIds: ['ev-2'], counterEvidenceIds: [] },
        ],
        correctResolution: {
          answer: 'The lock was picked using the bent tool.',
          culpritOrCause: 'Suspect 1',
          keyClueIds: ['ev-phantom-key'],
          howDeductionWorks: 'The tool matches scratches on the lock perfectly.',
        },
        createdAt: new Date().toISOString(),
      };

      const result = MysteryQualityChecker.validateCase(invalidResolutionCase);
      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.some((e) => e.includes('references non-existent key clue ID: "ev-phantom-key"')));
    });
  });

  describe('Visual File Validation', () => {
    it('returns error when file does not exist', async () => {
      const result = await MysteryQualityChecker.validateVisualAsset('/tmp/nonexistent-image-file.png');
      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.some((e) => e.includes('does not exist')));
    });

    it('returns error when file is 0 bytes', async () => {
      const emptyFilePath = path.resolve(process.cwd(), 'data', 'test-empty-image.png');
      fs.writeFileSync(emptyFilePath, Buffer.alloc(0));

      const result = await MysteryQualityChecker.validateVisualAsset(emptyFilePath);
      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.some((e) => e.includes('is empty (0 bytes)')));

      if (fs.existsSync(emptyFilePath)) fs.unlinkSync(emptyFilePath);
    });
  });
});

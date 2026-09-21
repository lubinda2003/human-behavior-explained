/**
 * Interactive Dilemma Stress Test Validation Tests (Phase 6 - Entertainment Model)
 * Verifies that the new dynamic generator, entertainment quality checker,
 * visual generator, and stress test runner satisfy all entertainment channel standards.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { DilemmaGenerator } from '../src/pipeline/dilemmas/generator.js';
import { DilemmaQualityChecker } from '../src/pipeline/dilemmas/quality.js';
import { DilemmaStressTestRunner } from '../src/pipeline/dilemmas/stressTest.js';
import { ALL_DILEMMA_CATEGORIES, DilemmaCategory } from '../src/pipeline/dilemmas/types.js';

describe('Interactive Dilemma Production Pipeline (Phase 6)', () => {
  const outputDir = path.resolve(process.cwd(), 'data', 'dilemma-stress-test');
  const generator = new DilemmaGenerator();

  it('should support all 10 entertainment categories', () => {
    assert.equal(ALL_DILEMMA_CATEGORIES.length, 10);
    const expectedCategories: DilemmaCategory[] = [
      'money/lifestyle',
      'moral',
      'social/relationship',
      'strategy',
      'survival',
      'funny/chaotic',
      'technology/future',
      'adventure/travel',
      'fantasy',
      'bizarre hypothetical situations',
    ];

    for (const cat of expectedCategories) {
      assert.ok(
        ALL_DILEMMA_CATEGORIES.includes(cat),
        `Category "${cat}" must be in ALL_DILEMMA_CATEGORIES`
      );
    }
  });

  it('should dynamically generate dilemmas with 2–4 meaningful choices and explicit trade-offs', async () => {
    for (let i = 0; i < 3; i++) {
      const category = ALL_DILEMMA_CATEGORIES[i];
      const dilemma = await generator.generateDilemma({ category, index: i + 1 });

      assert.ok(dilemma.id.length > 0, 'Dilemma must have an ID');
      assert.ok(dilemma.title.length > 0, 'Dilemma must have a title');
      assert.ok(dilemma.hook.length >= 15, 'Dilemma must have a hook');
      assert.ok(dilemma.scenario.length >= 35, 'Dilemma must have a scenario');
      assert.ok(
        dilemma.choices.length >= 2 && dilemma.choices.length <= 4,
        `Dilemma must have 2-4 choices (received ${dilemma.choices.length})`
      );

      for (const choice of dilemma.choices) {
        assert.ok(choice.id.length > 0, 'Choice must have an id');
        assert.ok(choice.label.length > 0, 'Choice must have a label');
        assert.ok(choice.tradeOff.length >= 8, 'Choice must have an explicit trade-off');
      }

      assert.ok((dilemma.payoff.reveal || '').length >= 25, 'Payoff must have a reveal');
      assert.ok((dilemma.payoff.surprisingOutcome || '').length >= 15, 'Payoff must have a surprising outcome');
    }
  });

  it('quality checker should reject academic psychology jargon', () => {
    const invalidDilemma = generator.generateProceduralDilemma('money/lifestyle', 'test-invalid', 1);
    invalidDilemma.scenario += ' This proves cognitive dissonance and hedonic adaptation in empirical experiments.';

    const result = DilemmaQualityChecker.validateDilemmaContent(invalidDilemma);
    assert.equal(result.isValid, false, 'Should fail QC if academic jargon is present');
    assert.ok(
      result.errors.some((e) => e.includes('banned academic/psychology jargon')),
      'Must specify academic jargon error'
    );
  });

  it('quality checker should reject serialized story references', () => {
    const invalidDilemma = generator.generateProceduralDilemma('strategy', 'test-invalid-2', 1);
    invalidDilemma.title = 'Part 2: In yesterday\'s post we saw the battle';

    const result = DilemmaQualityChecker.validateDilemmaContent(invalidDilemma);
    assert.equal(result.isValid, false, 'Should fail QC if post is serialized');
    assert.ok(
      result.errors.some((e) => e.includes('serialized post dependency')),
      'Must specify serialized post error'
    );
  });

  it('quality checker should validate correct Telegram HTML formatting', () => {
    const dilemma = generator.generateProceduralDilemma('moral', 'test-valid', 1);
    const result = DilemmaQualityChecker.validateDilemmaContent(dilemma);
    assert.equal(result.isValid, true, `Valid dilemma failed QC: ${result.errors.join(', ')}`);
    assert.ok(result.checks.telegramHtmlValid, 'Telegram HTML tags must be balanced');
  });

  it('should execute the stress test runner and generate the full 10-dilemma preview package', async () => {
    const runner = new DilemmaStressTestRunner({
      outputDir,
      silent: true,
    });

    const result = await runner.run();
    assert.ok(result.success, `Stress test run must succeed. Errors: ${result.errors.join(', ')}`);
    assert.equal(result.totalGenerated, 10);
    assert.ok(result.allQCPassed, 'All dilemmas must pass QC');

    // Verify manifest.json exists and is valid
    const manifestPath = path.join(outputDir, 'manifest.json');
    assert.ok(fs.existsSync(manifestPath), 'manifest.json must exist');
    const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    assert.equal(manifestContent.totalDilemmas, 10);
    assert.equal(manifestContent.dilemmas.length, 10);

    // Verify preview.md exists
    const previewPath = path.join(outputDir, 'preview.md');
    assert.ok(fs.existsSync(previewPath), 'preview.md must exist');
    const previewContent = fs.readFileSync(previewPath, 'utf-8');
    assert.ok(previewContent.includes('Interactive Dilemmas & Impossible Choices'));

    // Verify all 10 individual JSON and PNG files exist and are valid
    for (let i = 1; i <= 10; i++) {
      const padId = `dilemma-${i.toString().padStart(2, '0')}`;
      const jsonFile = path.join(outputDir, `${padId}.json`);
      const pngFile = path.join(outputDir, `${padId}.png`);

      assert.ok(fs.existsSync(jsonFile), `${padId}.json must exist`);
      assert.ok(fs.existsSync(pngFile), `${padId}.png must exist`);

      const jsonPayload = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
      assert.equal(jsonPayload.id, padId);
      assert.ok(jsonPayload.choices.length >= 2);
      assert.equal(jsonPayload.qc.contentPassed, true);
      assert.equal(jsonPayload.qc.visualPassed, true);

      // Verify PNG dimensions using sharp
      const imgMeta = await sharp(pngFile).metadata();
      assert.equal(imgMeta.width, 1200, `${pngFile} must have width 1200`);
      assert.equal(imgMeta.height, 675, `${pngFile} must have height 675`);
    }
  });
});

/**
 * Dilemma Quality Control Test Suite
 * Verifies anti-slop rules, academic jargon rejection, generic WYR rejection, and situational immersion.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DilemmaQualityChecker } from '../src/pipeline/dilemmas/quality.js';
import { DilemmaGenerator } from '../src/pipeline/dilemmas/generator.js';
import { InteractiveDilemma } from '../src/pipeline/dilemmas/types.js';

describe('Dilemma Quality Control & Anti-Slop Checker', () => {
  const generator = new DilemmaGenerator();

  it('passes standard procedural dilemmas through quality verification', async () => {
    const dilemma = await generator.generateDilemma({ category: 'survival' });
    const qc = DilemmaQualityChecker.validateDilemmaContent(dilemma);

    assert.equal(qc.isValid, true);
    assert.equal(qc.errors.length, 0);
    assert.equal(qc.checks.noAcademicJargon, true);
    assert.equal(qc.checks.noGenericWYR, true);
    assert.equal(qc.checks.tradeOffsExplicit, true);
  });

  it('rejects posts containing banned academic psychology lecture terms', async () => {
    const dilemma = await generator.generateDilemma({ category: 'moral' });
    // Inject academic jargon
    dilemma.hook = 'This scenario explores cognitive dissonance and hedonic adaptation in human subjects.';
    dilemma.formattedTelegramText = `<b>${dilemma.title}</b>\n\n${dilemma.hook}`;

    const qc = DilemmaQualityChecker.validateDilemmaContent(dilemma);
    assert.equal(qc.isValid, false);
    assert.equal(qc.checks.noAcademicJargon, false);
    assert.ok(qc.errors.some((e) => e.includes('academic/psychology jargon')));
  });

  it('rejects low-effort generic "Would You Rather" questions', async () => {
    const dilemma = await generator.generateDilemma({ category: 'money/lifestyle' });
    dilemma.hook = 'Would you rather have $1M or live forever?';
    dilemma.formattedTelegramText = `<b>${dilemma.title}</b>\n\n${dilemma.hook}`;

    const qc = DilemmaQualityChecker.validateDilemmaContent(dilemma);
    assert.equal(qc.isValid, false);
    assert.equal(qc.checks.noGenericWYR, false);
    assert.ok(qc.errors.some((e) => e.includes('low-effort generic question')));
  });

  it('rejects trivial or missing trade-offs in choices', async () => {
    const dilemma = await generator.generateDilemma({ category: 'strategy' });
    dilemma.choices[0].tradeOff = 'no downside';

    const qc = DilemmaQualityChecker.validateDilemmaContent(dilemma);
    assert.equal(qc.isValid, false);
    assert.equal(qc.checks.tradeOffsExplicit, false);
    assert.ok(qc.errors.some((e) => e.includes('trivial trade-off')));
  });

  it('rejects serialized dependencies and multi-part stories', async () => {
    const dilemma = await generator.generateDilemma({ category: 'adventure/travel' });
    dilemma.hook = 'Part 2: Continuing our story from yesterday, you enter the cave.';
    dilemma.formattedTelegramText = `<b>${dilemma.title}</b>\n\n${dilemma.hook}`;

    const qc = DilemmaQualityChecker.validateDilemmaContent(dilemma);
    assert.equal(qc.isValid, false);
    assert.equal(qc.checks.noSerializedStory, false);
    assert.ok(qc.errors.some((e) => e.includes('serialized post dependency')));
  });

  it('rejects formulaic "You get X, but lose Y" constructions lacking rich scene grounding', async () => {
    const dilemma = await generator.generateDilemma({ category: 'money/lifestyle' });
    dilemma.hook = 'You get $10,000,000, but you lose the ability to speak.';
    dilemma.setup = 'You get $10,000,000, but you lose the ability to speak.';
    dilemma.scenario = 'You get $10,000,000, but you lose the ability to speak.';
    dilemma.formattedTelegramText = `<b>${dilemma.title}</b>\n\n${dilemma.hook}`;

    const qc = DilemmaQualityChecker.validateDilemmaContent(dilemma);
    assert.equal(qc.isValid, false);
    assert.equal(qc.checks.noFormulaicTradeoff, false);
    assert.ok(qc.errors.some((e) => e.includes('formulaic trade-off')));
  });

  it('rejects ungrounded abstract philosophical debates lacking concrete environment', async () => {
    const dilemma = await generator.generateDilemma({ category: 'moral' });
    dilemma.hook = 'Virtue and utilitarian outcomes frequently conflict in ethical decision spaces.';
    dilemma.setup = 'Consider an abstract world where choosing welfare over duties creates moral tension.';
    dilemma.scenario = 'Consider an abstract world where choosing welfare over duties creates moral tension.';
    dilemma.formattedTelegramText = `<b>${dilemma.title}</b>\n\n${dilemma.hook}`;

    const qc = DilemmaQualityChecker.validateDilemmaContent(dilemma);
    assert.equal(qc.isValid, false);
    assert.equal(qc.checks.noUngroundedHypothetical, false);
    assert.ok(qc.errors.some((e) => e.includes('abstract philosophical debate')));
  });

  it('rejects dominant choices where one option is lethal while the other is trivial', async () => {
    const dilemma = await generator.generateDilemma({ category: 'survival' });
    dilemma.choices[0].description = 'Eat the hot steak dinner.';
    dilemma.choices[0].tradeOff = 'Minor calorie surplus.';
    dilemma.choices[1].description = 'Jump into the pit of vipers.';
    dilemma.choices[1].tradeOff = 'Instant lethal death from viper venom.';
    dilemma.formattedTelegramText = `<b>${dilemma.title}</b>\n\nChoose.`;

    const qc = DilemmaQualityChecker.validateDilemmaContent(dilemma);
    assert.equal(qc.isValid, false);
    assert.equal(qc.checks.noDominantChoice, false);
    assert.ok(qc.errors.some((e) => e.includes('dominant choice')));
  });

  it('proactively repairs flawed choices and restores quality compliance', async () => {
    const dilemma = await generator.generateDilemma({ category: 'strategy' });
    dilemma.choices[0].tradeOff = 'no cost';
    dilemma.choices[1].tradeOff = 'free';
    dilemma.hook = 'This scenario explores cognitive dissonance under pressure.';

    const initialQc = DilemmaQualityChecker.validateDilemmaContent(dilemma);
    assert.equal(initialQc.isValid, false);

    const repaired = generator.repairDilemma(dilemma);
    const repairedQc = DilemmaQualityChecker.validateDilemmaContent(repaired);
    assert.equal(repairedQc.isValid, true);
    assert.equal(repairedQc.checks.tradeOffsExplicit, true);
    assert.equal(repairedQc.checks.noAcademicJargon, true);
  });
});

/**
 * Dilemma Generator Test Suite
 * Tests procedural generation across depth levels, content formats, categories, and pressure types.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DilemmaGenerator } from '../src/pipeline/dilemmas/generator.js';
import {
  ALL_CONTENT_FORMATS,
  ALL_DILEMMA_CATEGORIES,
  ContentDepth,
} from '../src/pipeline/dilemmas/types.js';

describe('Dilemma Generator', () => {
  const generator = new DilemmaGenerator();

  it('generates a dilemma for every dilemma category', async () => {
    for (const category of ALL_DILEMMA_CATEGORIES) {
      const dilemma = await generator.generateDilemma({ category });
      assert.ok(dilemma.id);
      assert.equal(dilemma.category, category);
      assert.ok(dilemma.title.length > 0);
      assert.ok(dilemma.hook.length > 0);
      assert.ok(dilemma.choices.length >= 2);
      assert.ok(dilemma.payoff);
      assert.ok(dilemma.visualSpec);
      assert.ok(dilemma.formattedTelegramText);
    }
  });

  it('supports quick, standard, and deep content depth levels', async () => {
    const depths: ContentDepth[] = ['quick', 'standard', 'deep'];
    for (const depth of depths) {
      const dilemma = await generator.generateDilemma({
        category: 'strategy',
        depth,
      });
      assert.ok(dilemma.id);
      assert.equal(dilemma.depth, depth);
      assert.ok(dilemma.choices.length >= 2);
    }
  });

  it('populates choices with explicit non-empty trade-offs', async () => {
    const dilemma = await generator.generateDilemma({
      category: 'survival',
      depth: 'standard',
    });

    assert.ok(dilemma.choices.length >= 2);
    for (const choice of dilemma.choices) {
      assert.ok(choice.id);
      assert.ok(choice.label);
      assert.ok(choice.description);
      assert.ok(choice.tradeOff && choice.tradeOff.length > 5);
    }
  });

  it('attaches a complete VisualSpec specification', async () => {
    const dilemma = await generator.generateDilemma({
      category: 'money/lifestyle',
    });

    assert.ok(dilemma.visualSpec);
    assert.equal(dilemma.visualSpec.template, 'thought_experiment');
    assert.equal(dilemma.visualSpec.title, dilemma.title);
    assert.ok(dilemma.visualSpec.payload);
  });
});

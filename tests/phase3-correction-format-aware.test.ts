import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DilemmaGenerator } from '../src/pipeline/dilemmas/generator.js';
import { DilemmaQualityChecker } from '../src/pipeline/dilemmas/quality.js';
import { DilemmaTelegramFormatter } from '../src/pipeline/dilemmas/formatter.js';
import { InteractiveDilemma } from '../src/pipeline/dilemmas/types.js';

describe('Phase 3 Correction: Format-Aware Generation & Quality Gate', () => {
  const generator = new DilemmaGenerator();

  describe('1. Discussion-first formats generate valid content with NO choices', () => {
    const discussionFormats = ['mini_mystery', 'brain_logic', 'hot_take', 'future_tech'] as const;

    for (const format of discussionFormats) {
      it(`procedural fallback for "${format}" has no choices, has discussionPrompt, and passes QC`, () => {
        const dilemma = generator.generateProceduralDilemma({ format });

        assert.equal(dilemma.format, format);
        assert.ok(
          !dilemma.choices || dilemma.choices.length === 0,
          `Expected ${format} to have 0 choices or undefined choices, got ${dilemma.choices?.length}`
        );
        assert.ok(
          dilemma.discussionPrompt && dilemma.discussionPrompt.trim().length >= 10,
          `Expected ${format} to have a substantial discussionPrompt`
        );
        assert.equal(
          dilemma.pollQuestion,
          undefined,
          `Expected ${format} to have no pollQuestion`
        );

        const qc = DilemmaQualityChecker.validateDilemmaContent(dilemma);
        assert.equal(
          qc.isValid,
          true,
          `QC failed for discussion format "${format}": ${qc.errors.join('; ')}`
        );
        assert.equal(qc.checks.formatRequirementsMet, true);
        assert.equal(qc.checks.tradeOffsExplicit, true);
        assert.equal(qc.checks.choiceCountValid, true);
      });
    }

    it('mini_mystery provides clues in setup/scenario and hides the true culprit in payoff.reveal', () => {
      const mystery = generator.generateProceduralDilemma({ format: 'mini_mystery' });
      const fullPublic = `${mystery.hook} ${mystery.setup} ${mystery.scenario}`;
      
      // Payoff contains the true reveal
      assert.ok(mystery.payoff?.reveal && mystery.payoff.reveal.length > 20);
      // Public text should not explicitly spoil the exact payoff reveal
      assert.ok(!fullPublic.includes(mystery.payoff.reveal));
      // Must contain investigation clues
      const lower = fullPublic.toLowerCase();
      assert.ok(
        lower.includes('badge') || lower.includes('vault') || lower.includes('access') || lower.includes('grille'),
        'Expected physical clues in mystery setup'
      );
    });

    it('brain_logic provides a solvable puzzle with numbers/constraints and step-by-step logic in payoff.reveal', () => {
      const logic = generator.generateProceduralDilemma({ format: 'brain_logic' });
      assert.ok(logic.payoff?.reveal && logic.payoff.reveal.length > 20);
      assert.ok(logic.setup.includes('minute'), 'Setup contains concrete constraints');
    });

    it('hot_take presents a concrete debatable premise with discussionPrompt', () => {
      const take = generator.generateProceduralDilemma({ format: 'hot_take' });
      assert.ok(take.discussionPrompt && take.discussionPrompt.length > 15);
      assert.ok(take.setup.length >= 40);
    });

    it('future_tech focuses on emerging tech with human cost and personal choice', () => {
      const tech = generator.generateProceduralDilemma({ format: 'future_tech' });
      assert.ok(tech.discussionPrompt && tech.discussionPrompt.length > 15);
      assert.ok(tech.setup.length >= 40);
    });

    it('procedural hot_take and discussion fallbacks contain no fabricated percentage or statistical claims', () => {
      const take = generator.generateProceduralDilemma({ format: 'hot_take' });
      const mystery = generator.generateProceduralDilemma({ format: 'mini_mystery' });
      const tech = generator.generateProceduralDilemma({ format: 'future_tech' });
      const minigame = generator.generateProceduralDilemma({ format: 'interactive_minigame' });

      for (const item of [take, mystery, tech, minigame]) {
        const fullContent = `${item.hook} ${item.setup} ${item.pressure} ${item.twist} ${item.discussionPrompt || ''} ${item.payoff?.reveal || ''} ${item.payoff?.surprisingOutcome || ''}`;
        assert.ok(
          !/\b\d{1,3}%\s+(?:of\s+)?(?:creators|readers|people|users|workers|engineers)\b/i.test(fullContent),
          `Found fabricated percentage claim in ${item.format}: ${fullContent}`
        );
        assert.ok(
          !/\bsurveys\s+show\b/i.test(fullContent),
          `Found unsupported survey claim in ${item.format}: ${fullContent}`
        );
      }
    });
  });

  describe('2. Poll formats continue to require valid choices and poll questions', () => {
    const pollFormats = [
      'impossible_dilemma',
      'survival_scenario',
      'strategy_challenge',
      'prediction',
      'versus_battle',
      'chaotic_funny',
      'interactive_minigame',
    ] as const;

    for (const format of pollFormats) {
      it(`procedural fallback for "${format}" has valid choices, pollQuestion, and passes QC`, () => {
        const dilemma = generator.generateProceduralDilemma({ format });

        assert.equal(dilemma.format, format);
        assert.ok(
          Array.isArray(dilemma.choices) && dilemma.choices.length >= 2,
          `Expected ${format} to have at least 2 choices`
        );
        assert.ok(
          dilemma.pollQuestion && dilemma.pollQuestion.trim().length > 0,
          `Expected ${format} to have a pollQuestion`
        );

        const qc = DilemmaQualityChecker.validateDilemmaContent(dilemma);
        assert.equal(
          qc.isValid,
          true,
          `QC failed for poll format "${format}": ${qc.errors.join('; ')}`
        );
        assert.equal(qc.checks.formatRequirementsMet, true);
        assert.equal(qc.checks.choiceCountValid, true);
        assert.equal(qc.checks.tradeOffsExplicit, true);
      });
    }

    it('prediction fallback choices represent observable future outcomes rather than user actions', () => {
      const prediction = generator.generateProceduralDilemma({ format: 'prediction' });
      assert.equal(prediction.format, 'prediction');
      assert.ok(prediction.choices && prediction.choices.length >= 2);

      // Verify question is asking what happens / observable outcome
      assert.ok(
        prediction.pollQuestion?.toLowerCase().includes('what happened') ||
        prediction.pollQuestion?.toLowerCase().includes('what happens') ||
        prediction.pollQuestion?.toLowerCase().includes('prediction') ||
        prediction.pollQuestion?.toLowerCase().includes('outcome'),
        `Expected pollQuestion to ask for an outcome prediction, got "${prediction.pollQuestion}"`
      );

      // Verify choices represent outcomes (e.g. "Car traffic decreased", "Car traffic stayed roughly identical", etc.)
      for (const choice of prediction.choices!) {
        assert.ok(
          choice.label.toLowerCase().includes('traffic') ||
          choice.label.toLowerCase().includes('increased') ||
          choice.label.toLowerCase().includes('decreased') ||
          choice.label.toLowerCase().includes('stayed') ||
          choice.label.toLowerCase().includes('worse'),
          `Choice label "${choice.label}" should describe an outcome rather than a first-person command action`
        );
      }

      // Verify reveal explains what actually happens
      assert.ok(prediction.payoff?.reveal && prediction.payoff.reveal.length > 20);
    });

    it('rejects poll format if choices are missing', () => {
      const invalidPollDilemma: InteractiveDilemma = {
        id: 'invalid-poll',
        index: 1,
        category: 'moral',
        format: 'impossible_dilemma',
        title: 'Missing Choices Dilemma',
        hook: 'You have thirty seconds to choose.',
        setup: 'You stand at the console with red alarms blaring.',
        scenario: 'You stand at the console with red alarms blaring.',
        depth: 'standard',
        choices: [], // empty choices on a poll format
        pollQuestion: 'Which path do you take?',
        discussionPrompt: 'Why did you pick it?',
        payoff: { reveal: 'Both choices carry risks.' },
        formattedTelegramText: '',
        visualSpec: { template: 'thought_experiment', title: 'Test' },
      };

      const qc = DilemmaQualityChecker.validateDilemmaContent(invalidPollDilemma);
      assert.equal(qc.isValid, false);
      assert.ok(qc.errors.some((e) => e.includes('must have between 2 and 4 choices')));
      assert.equal(qc.checks.choiceCountValid, false);
    });
  });

  describe('3. Telegram Formatting adapts cleanly between Poll and Discussion formats', () => {
    it('formats discussion-first dilemma without poll markup or empty choices block', () => {
      const mystery = generator.generateProceduralDilemma({ format: 'mini_mystery' });
      const formatted = DilemmaTelegramFormatter.formatPost(mystery);

      assert.ok(formatted.includes('💬 <b>DISCUSSION:</b>'));
      assert.ok(!formatted.includes('📊 <b>POLL:</b>'));
      assert.ok(!formatted.includes('🅰️ <b>'));
      assert.ok(!formatted.includes('🅱️ <b>'));
      assert.ok(formatted.includes('Drop your deduction in the comments'));
    });

    it('formats poll dilemma with choices and poll prompt', () => {
      const survival = generator.generateProceduralDilemma({ format: 'survival_scenario' });
      const formatted = DilemmaTelegramFormatter.formatPost(survival);

      assert.ok(formatted.includes('📊 <b>POLL:</b>'));
      assert.ok(formatted.includes('🅰️ <b>'));
      assert.ok(formatted.includes('🅱️ <b>'));
      assert.ok(formatted.includes('Make your call before time runs out. Vote below!'));
    });
  });
});

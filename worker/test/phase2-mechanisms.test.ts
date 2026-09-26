import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { InteractionPlanner } from '../src/interactions/planner';

describe('Phase 2: Interaction & Mechanism Differentiation', () => {
  const planner = new InteractionPlanner('@pickyourfate');

  it('1. impossible_dilemma -> Poll, 3h (10800s), anonymous, max 3 options', () => {
    const plan = planner.plan({
      id: 'd1',
      title: 'Impossible Test',
      format: 'impossible_dilemma',
      choices: [
        { label: 'A', tradeOff: 'Cost A' },
        { label: 'B', tradeOff: 'Cost B' },
        { label: 'C', tradeOff: 'Cost C' },
        { label: 'D', tradeOff: 'Cost D' },
      ],
    });

    assert.equal(plan.interactionType, 'poll');
    assert.equal(plan.closeStrategy, 'scheduled');
    assert.equal(plan.durationSeconds, 10800);
    assert.ok(plan.pollConfig);
    assert.equal(plan.pollConfig!.isAnonymous, true);
    assert.equal(plan.pollConfig!.allowsMultipleAnswers, false);
    assert.equal(plan.pollConfig!.options.length, 3);
  });

  it('2. chaotic_funny -> Poll, 2h (7200s), anonymous', () => {
    const plan = planner.plan({
      id: 'd2',
      title: 'Funny Test',
      format: 'chaotic_funny',
      choices: [
        { label: 'A', tradeOff: 'Cost A' },
        { label: 'B', tradeOff: 'Cost B' },
      ],
    });

    assert.equal(plan.interactionType, 'poll');
    assert.equal(plan.durationSeconds, 7200);
    assert.equal(plan.pollConfig!.isAnonymous, true);
  });

  it('3. survival_scenario -> Poll, 3h (10800s), 2 choices (connected capable)', () => {
    const plan = planner.plan({
      id: 'd3',
      title: 'Survival Test',
      format: 'survival_scenario',
      choices: [
        { label: 'A', tradeOff: 'Cost A' },
        { label: 'B', tradeOff: 'Cost B' },
      ],
    });

    assert.equal(plan.interactionType, 'poll');
    assert.equal(plan.durationSeconds, 10800);
    assert.equal(plan.pollConfig!.options.length, 2);
    assert.equal(plan.pollConfig!.isAnonymous, true);
  });

  it('4. strategy_challenge -> Poll, 4h (14400s), up to 4 choices', () => {
    const plan = planner.plan({
      id: 'd4',
      title: 'Strategy Test',
      format: 'strategy_challenge',
      choices: [
        { label: 'A', tradeOff: 'Cost A' },
        { label: 'B', tradeOff: 'Cost B' },
        { label: 'C', tradeOff: 'Cost C' },
        { label: 'D', tradeOff: 'Cost D' },
        { label: 'E', tradeOff: 'Cost E' },
      ],
    });

    assert.equal(plan.interactionType, 'poll');
    assert.equal(plan.durationSeconds, 14400);
    assert.equal(plan.pollConfig!.options.length, 4);
    assert.equal(plan.pollConfig!.isAnonymous, true);
  });

  it('5. mini_mystery -> Discussion-first, 8h (28800s), NO poll', () => {
    const plan = planner.plan({
      id: 'd5',
      title: 'Mystery Test',
      format: 'mini_mystery',
    });

    assert.equal(plan.interactionType, 'open_discussion');
    assert.equal(plan.durationSeconds, 28800);
    assert.equal(plan.pollConfig, undefined);
    assert.ok(plan.discussionPrompt);
  });

  it('6. brain_logic -> Discussion-first, 8h (28800s), NO poll', () => {
    const plan = planner.plan({
      id: 'd6',
      title: 'Logic Test',
      format: 'brain_logic',
    });

    assert.equal(plan.interactionType, 'open_discussion');
    assert.equal(plan.durationSeconds, 28800);
    assert.equal(plan.pollConfig, undefined);
    assert.ok(plan.discussionPrompt);
  });

  it('7. hot_take -> Discussion only, 12h (43200s), NO poll', () => {
    const plan = planner.plan({
      id: 'd7',
      title: 'Take Test',
      format: 'hot_take',
    });

    assert.equal(plan.interactionType, 'open_discussion');
    assert.equal(plan.durationSeconds, 43200);
    assert.equal(plan.pollConfig, undefined);
    assert.ok(plan.discussionPrompt);
  });

  it('8. future_tech -> Discussion-first, 6h (21600s), NO poll', () => {
    const plan = planner.plan({
      id: 'd8',
      title: 'Tech Test',
      format: 'future_tech',
    });

    assert.equal(plan.interactionType, 'open_discussion');
    assert.equal(plan.durationSeconds, 21600);
    assert.equal(plan.pollConfig, undefined);
    assert.ok(plan.discussionPrompt);
  });

  it('9. versus_battle -> Poll, 4h (14400s), exactly 2 choices', () => {
    const plan = planner.plan({
      id: 'd9',
      title: 'Battle Test',
      format: 'versus_battle',
      choices: [
        { label: 'Side A', tradeOff: 'Cost A' },
        { label: 'Side B', tradeOff: 'Cost B' },
        { label: 'Side C', tradeOff: 'Cost C' },
      ],
    });

    assert.equal(plan.interactionType, 'poll');
    assert.equal(plan.durationSeconds, 14400);
    assert.equal(plan.pollConfig!.options.length, 2);
    assert.equal(plan.pollConfig!.isAnonymous, true);
  });

  it('10. interactive_minigame -> Poll, 6h (21600s), multi-answer allowed', () => {
    const plan = planner.plan({
      id: 'd10',
      title: 'Minigame Test',
      format: 'interactive_minigame',
      choices: [
        { label: '1', tradeOff: '1' },
        { label: '2', tradeOff: '2' },
      ],
    });

    assert.equal(plan.interactionType, 'poll');
    assert.equal(plan.durationSeconds, 21600);
    assert.equal(plan.pollConfig!.allowsMultipleAnswers, true);
    assert.equal(plan.pollConfig!.isAnonymous, true);
  });

  it('11. prediction -> Prediction vote, 4h (14400s), 2 choices', () => {
    const plan = planner.plan({
      id: 'd11',
      title: 'Prediction Test',
      format: 'prediction',
      choices: [
        { label: 'Yes', tradeOff: 'Yes' },
        { label: 'No', tradeOff: 'No' },
      ],
    });

    assert.equal(plan.interactionType, 'prediction_vote');
    assert.equal(plan.durationSeconds, 14400);
    assert.equal(plan.pollConfig!.options.length, 2);
    assert.equal(plan.pollConfig!.isAnonymous, true);
  });

  it('12. result_reveal -> Result reveal, closeStrategy never', () => {
    const plan = planner.plan({
      id: 'd12',
      title: 'Reveal Test',
      format: 'result_reveal',
    });

    assert.equal(plan.interactionType, 'result_reveal');
    assert.equal(plan.closeStrategy, 'never');
  });
});

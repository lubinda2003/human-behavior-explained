/**
 * Visual Generation Tests
 * Tests deterministic Satori + Sharp rendering across all 7 editorial templates.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { VisualGenerator } from '../src/pipeline/visuals/index.js';
import { VisualSpec } from '../src/pipeline/types.js';

describe('Deterministic Visual Generator (Satori + Sharp)', () => {
  const outputDir = '/tmp/test-generated-visuals';
  const generator = new VisualGenerator(outputDir);

  const isPng = (buf: Buffer): boolean => {
    // PNG file header starts with 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
    return (
      buf.length > 8 &&
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47
    );
  };

  it('Template 1: should render concept_diagram', async () => {
    const spec: VisualSpec = {
      title: 'Cognitive Dissonance Framework',
      subtitle: 'Internal tension mechanics',
      tag: 'COGNITIVE ARCHITECTURE',
      sourceCitation: 'Festinger (1957)',
      template: 'concept_diagram',
      payload: {
        template: 'concept_diagram',
        data: {
          centralConcept: 'Psychological Tension from Contradiction',
          centralDescription: 'When personal behavior contradicts internal convictions.',
          pillars: [
            { title: 'Change Belief', description: 'Rewriting convictions post-hoc', badge: 'PATH 1' },
            { title: 'Trivialize Action', description: 'Downplaying the behavioral impact', badge: 'PATH 2' },
            { title: 'Add Rationalization', description: 'Inventing justifying reasons', badge: 'PATH 3' },
          ],
        },
      },
    };

    const res = await generator.renderGraphic(spec, 'test-concept');
    assert.ok(fs.existsSync(res.filePath));
    assert.equal(res.width, 1200);
    assert.equal(res.height, 675);
    assert.ok(isPng(res.buffer));
    assert.ok(res.buffer.length > 5000);
  });

  it('Template 2: should render process_flow', async () => {
    const spec: VisualSpec = {
      title: 'The Ironic Process Loop',
      tag: 'COGNITIVE MONITORING',
      sourceCitation: 'Wegner (1987)',
      template: 'process_flow',
      payload: {
        template: 'process_flow',
        data: {
          steps: [
            { number: 1, title: 'Inhibition', description: 'Command: "Do not think about X."' },
            { number: 2, title: 'Operating', description: 'Effortful search for non-X distractors.' },
            { number: 3, title: 'Monitoring', description: 'Autonomous unconscious search for failures.' },
            { number: 4, title: 'Intrusion', description: 'Under fatigue, monitor injects X into awareness.' },
          ],
        },
      },
    };

    const res = await generator.renderGraphic(spec, 'test-process');
    assert.ok(isPng(res.buffer));
  });

  it('Template 3: should render comparison', async () => {
    const spec: VisualSpec = {
      title: 'Catharsis vs. Cognitive Rumination',
      tag: 'EMPIRICAL REALITY',
      sourceCitation: 'Bushman (2002), JPSP',
      template: 'comparison',
      payload: {
        template: 'comparison',
        data: {
          leftTitle: 'Venting Releases Anger',
          leftSubtitle: 'Pop Intuition',
          leftPoints: ['Screaming relieves pressure', 'Aggression prevents emotional buildup'],
          rightTitle: 'Venting Primes Aggression',
          rightSubtitle: 'Laboratory Findings',
          rightPoints: ['Maintains autonomic arousal', 'Strengthens hostile cognitive networks'],
        },
      },
    };

    const res = await generator.renderGraphic(spec, 'test-compare');
    assert.ok(isPng(res.buffer));
  });

  it('Template 4: should render timeline', async () => {
    const spec: VisualSpec = {
      title: 'Evolution of False Memory Science',
      tag: 'RESEARCH TIMELINE',
      sourceCitation: 'Loftus & Palmer (1974)',
      template: 'timeline',
      payload: {
        template: 'timeline',
        data: {
          events: [
            { yearOrPhase: '1974', title: 'Car Crash Study', description: 'Leading verbs alter speed estimation.' },
            { yearOrPhase: '1995', title: 'Lost in the Mall', description: '25% of subjects adopt rich false childhood memories.' },
            { yearOrPhase: '2005', title: 'Reconsolidation', description: 'Synaptic protein discovery reveals memory plasticity.' },
          ],
        },
      },
    };

    const res = await generator.renderGraphic(spec, 'test-timeline');
    assert.ok(isPng(res.buffer));
  });

  it('Template 5: should render simple_statistic', async () => {
    const spec: VisualSpec = {
      title: 'The Milgram Baseline Replication',
      tag: 'EXPERIMENTAL DATA',
      sourceCitation: 'Milgram (1963) / Burger (2009)',
      template: 'simple_statistic',
      payload: {
        template: 'simple_statistic',
        data: {
          highlightMetric: '65%',
          metricLabel: 'Administered Maximum 450V Shock',
          context: 'Subjects followed authority commands despite audible screams in an adjoining room.',
          detailPoints: [
            'Psychiatrists initially predicted less than 1% would comply',
            'Participants displayed extreme autonomic stress and shaking',
            'Modern 2009 replication found identical 65% obedience at 150V threshold',
          ],
        },
      },
    };

    const res = await generator.renderGraphic(spec, 'test-stat');
    assert.ok(isPng(res.buffer));
  });

  it('Template 6: should render thought_experiment', async () => {
    const spec: VisualSpec = {
      title: 'The Footbridge Dilemma',
      tag: 'MORAL COGNITION',
      sourceCitation: 'Greene et al. (2001), Science',
      template: 'thought_experiment',
      payload: {
        template: 'thought_experiment',
        data: {
          scenarioName: 'Footbridge vs Switch',
          dilemma: 'A runaway trolley will kill five workers unless you intervene.',
          branchA: { label: 'Lever Switch (85% agree)', explanation: 'Impersonal harm activates dorsolateral prefrontal calculation.' },
          branchB: { label: 'Physical Push (12% agree)', explanation: 'Personal physical harm triggers strong medial prefrontal amygdala alarm.' },
          psychologicalInsight: 'Moral judgments are dual-process battles between utilitarian calculation and evolutionary emotional aversion.',
        },
      },
    };

    const res = await generator.renderGraphic(spec, 'test-thought');
    assert.ok(isPng(res.buffer));
  });

  it('Template 7: should render concept_quote_card', async () => {
    const spec: VisualSpec = {
      title: 'Heuristics and Biases',
      tag: 'SEMINAL INSIGHT',
      sourceCitation: 'Kahneman (2011)',
      template: 'concept_quote_card',
      payload: {
        template: 'concept_quote_card',
        data: {
          quote: 'We can be blind to the obvious, and we are also blind to our blindness.',
          author: 'Daniel Kahneman',
          sourceContext: 'Thinking, Fast and Slow',
          keyTakeaway: 'Overconfidence stems from cognitive ease rather than evidence quality.',
        },
      },
    };

    const res = await generator.renderGraphic(spec, 'test-quote');
    assert.ok(isPng(res.buffer));
  });
});

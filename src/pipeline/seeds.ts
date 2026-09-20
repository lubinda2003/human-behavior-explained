/**
 * Seed Examples for Content Testing and Historical Reference.
 * Kept strictly isolated from production publication memory.
 */

import { ContentMemoryItem } from './types.js';

export const SEED_EXAMPLES: ContentMemoryItem[] = [
  {
    id: 'seed-1',
    topic: 'The Doorway Effect (Event Horizon Model)',
    title: 'Why You Forget Why You Entered a Room',
    pillar: 'Brain, Memory & Perception',
    coreConcept: 'Walking through doorways creates mental event boundaries in episodic memory.',
    publicationDate: '2026-09-15T09:00:00.000Z',
    sources: ['Radvansky et al. (2011), Q J Exp Psychol'],
    visualUsed: true,
    visualTemplate: 'process_flow',
    ctaType: 'reflection',
  },
  {
    id: 'seed-2',
    topic: 'Ben Franklin Effect',
    title: 'Doing Someone a Favor Makes You Like Them More',
    pillar: 'Everyday Psychology',
    coreConcept: 'Cognitive dissonance drives us to justify our kind actions by concluding we must like the recipient.',
    publicationDate: '2026-09-16T17:00:00.000Z',
    sources: ['Jecker & Landy (1969), Human Relations'],
    visualUsed: true,
    visualTemplate: 'concept_diagram',
    ctaType: 'conversation',
  },
  {
    id: 'seed-3',
    topic: 'L’esprit de l’escalier (Treppenwitz / Staircase Wit)',
    title: 'Why the Best Comebacks Only Arrive When It’s Too Late',
    pillar: 'Strange Human Behavior',
    coreConcept: 'Acute social stress floods prefrontal working memory; subsequent relaxation permits divergent associative recall.',
    publicationDate: '2026-09-17T09:00:00.000Z',
    sources: ['Arnsten (2009), Nat Rev Neurosci'],
    visualUsed: false,
    ctaType: 'reflection',
  },
];

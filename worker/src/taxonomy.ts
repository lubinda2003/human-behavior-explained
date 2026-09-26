/**
 * Unified Pick Your Fate Content & Interaction Taxonomy
 *
 * Reconciles the Content Generation system with the Worker Interaction Engine:
 * - Content Format: "What kind of entertainment content is this?"
 * - Interaction Mechanism: "How does the Telegram audience interact with it?"
 */

import type { ContentTypeId, DilemmaCategory as WorkerCategory } from './types';
import type {
  ContentFormat as PipelineFormat,
  DilemmaCategory as PipelineCategory,
  InteractionType as PipelineInteractionType,
} from '../../src/pipeline/dilemmas/types';

export type ContentFormat = PipelineFormat;

export type InteractionMechanism =
  | 'poll'
  | 'open_discussion'
  | 'prediction_vote'
  | 'scenario_choice'
  | 'reaction'
  | 'result_reveal';

export type ContentOrigin = 'fresh' | 'derived';

export interface ContentTaxonomyDefinition {
  format: ContentFormat;
  origin: ContentOrigin;
  defaultMechanism: InteractionMechanism;
  description: string;
  allowedMechanisms: InteractionMechanism[];
}

export const CONTENT_TAXONOMY: Record<ContentFormat, ContentTaxonomyDefinition> = {
  impossible_dilemma: {
    format: 'impossible_dilemma',
    origin: 'fresh',
    defaultMechanism: 'poll',
    description: 'High-stakes impossible choice between painful or agonizing alternatives.',
    allowedMechanisms: ['poll', 'reaction', 'scenario_choice'],
  },
  survival_scenario: {
    format: 'survival_scenario',
    origin: 'fresh',
    defaultMechanism: 'scenario_choice',
    description: 'Urgent physical or situational survival dilemma requiring quick tactical decision.',
    allowedMechanisms: ['scenario_choice', 'poll', 'open_discussion'],
  },
  mini_mystery: {
    format: 'mini_mystery',
    origin: 'fresh',
    defaultMechanism: 'open_discussion',
    description: 'Hidden information/deduction scenario where readers uncover the trap in comments.',
    allowedMechanisms: ['open_discussion', 'poll'],
  },
  strategy_challenge: {
    format: 'strategy_challenge',
    origin: 'fresh',
    defaultMechanism: 'scenario_choice',
    description: 'Resource allocation or high-stakes strategy dilemma under extreme constraints.',
    allowedMechanisms: ['scenario_choice', 'poll', 'open_discussion'],
  },
  prediction: {
    format: 'prediction',
    origin: 'fresh',
    defaultMechanism: 'prediction_vote',
    description: 'Forecasting future development or outcome with verifiable resolution criteria.',
    allowedMechanisms: ['prediction_vote', 'poll'],
  },
  versus_battle: {
    format: 'versus_battle',
    origin: 'fresh',
    defaultMechanism: 'poll',
    description: 'Two iconic or contrasting forces/philosophies in direct clash.',
    allowedMechanisms: ['poll', 'reaction'],
  },
  chaotic_funny: {
    format: 'chaotic_funny',
    origin: 'fresh',
    defaultMechanism: 'poll',
    description: 'Bizarre, absurd, comedic hypothetical choice with unexpected trade-offs.',
    allowedMechanisms: ['poll', 'open_discussion'],
  },
  future_tech: {
    format: 'future_tech',
    origin: 'fresh',
    defaultMechanism: 'prediction_vote',
    description: 'AI, biotechnology, or futuristic crisis with societal or moral implications.',
    allowedMechanisms: ['prediction_vote', 'poll', 'open_discussion'],
  },
  brain_logic: {
    format: 'brain_logic',
    origin: 'fresh',
    defaultMechanism: 'poll',
    description: 'Paradox or lateral thinking dilemma testing audience logic and wits.',
    allowedMechanisms: ['poll', 'open_discussion'],
  },
  hot_take: {
    format: 'hot_take',
    origin: 'fresh',
    defaultMechanism: 'open_discussion',
    description: 'Provocative question or divisive position driving debate in discussion group.',
    allowedMechanisms: ['open_discussion', 'poll', 'reaction'],
  },
  interactive_minigame: {
    format: 'interactive_minigame',
    origin: 'fresh',
    defaultMechanism: 'poll',
    description: 'Multi-option ranking or mini-game mechanic.',
    allowedMechanisms: ['poll', 'scenario_choice'],
  },
  result_reveal: {
    format: 'result_reveal',
    origin: 'derived',
    defaultMechanism: 'result_reveal',
    description: 'Outcome payoff and reveal of past interaction results.',
    allowedMechanisms: ['result_reveal'],
  },
};

/**
 * Checks whether a given format represents autonomous fresh content.
 */
export function isFreshContentFormat(format: ContentFormat | string): boolean {
  const def = CONTENT_TAXONOMY[format as ContentFormat];
  return def ? def.origin === 'fresh' : false;
}

/**
 * Checks whether a given format represents derived / event-driven outcome content.
 */
export function isDerivedContentFormat(format: ContentFormat | string): boolean {
  const def = CONTENT_TAXONOMY[format as ContentFormat];
  return def ? def.origin === 'derived' : false;
}

/**
 * Retrieves all registered fresh content formats eligible for autonomous selection.
 */
export function getFreshContentFormats(): ContentFormat[] {
  return (Object.keys(CONTENT_TAXONOMY) as ContentFormat[]).filter(
    (f) => CONTENT_TAXONOMY[f].origin === 'fresh',
  );
}

/**
 * Retrieves all registered derived / outcome content formats.
 */
export function getDerivedContentFormats(): ContentFormat[] {
  return (Object.keys(CONTENT_TAXONOMY) as ContentFormat[]).filter(
    (f) => CONTENT_TAXONOMY[f].origin === 'derived',
  );
}

/**
 * Maps a variety planner ContentTypeId to a concrete ContentFormat.
 * Supports the 12 Pick Your Fate formats directly, with legacy backward-compatibility.
 */
export function mapContentTypeToFormat(typeId: ContentTypeId | string): ContentFormat {
  switch (typeId) {
    case 'impossible_dilemma':
    case 'survival_scenario':
    case 'mini_mystery':
    case 'strategy_challenge':
    case 'prediction':
    case 'versus_battle':
    case 'chaotic_funny':
    case 'future_tech':
    case 'brain_logic':
    case 'hot_take':
    case 'interactive_minigame':
    case 'result_reveal':
      return typeId;
    // Legacy compatibility for historical D1 records and tests
    case 'classic_poll':
      return 'impossible_dilemma';
    case 'reaction_vote':
      return 'versus_battle';
    case 'open_debate':
      return 'hot_take';
    case 'story_fork':
      return 'strategy_challenge';
    case 'rank_it':
      return 'interactive_minigame';
    case 'trap_breakdown':
      return 'mini_mystery';
    case 'results_reveal':
    case 'weekly_recap':
      return 'result_reveal';
    default:
      return 'impossible_dilemma';
  }
}

/**
 * Maps Worker variety category to Pipeline category (identical 10-category taxonomy).
 */
export function mapWorkerCategoryToPipeline(category: WorkerCategory): PipelineCategory {
  return category as PipelineCategory;
}

/**
 * Determines the interaction mechanism for a given format and optional requested type.
 */
export function resolveInteractionMechanism(
  format: ContentFormat,
  requestedMechanism?: InteractionMechanism,
): InteractionMechanism {
  const def = CONTENT_TAXONOMY[format] || CONTENT_TAXONOMY.impossible_dilemma;
  if (requestedMechanism && def.allowedMechanisms.includes(requestedMechanism)) {
    return requestedMechanism;
  }
  return def.defaultMechanism;
}

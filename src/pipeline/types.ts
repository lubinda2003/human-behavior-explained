/**
 * Content Pipeline Types
 * Evidence-Based Psychology & Strange Human Behavior Telegram Channel
 */

export type ContentPillar =
  | 'Everyday Psychology'
  | 'Strange Human Behavior'
  | 'Brain, Memory & Perception'
  | 'Psychology Thought Experiments';

export const PILLAR_DISTRIBUTION: Record<ContentPillar, number> = {
  'Everyday Psychology': 0.35,
  'Strange Human Behavior': 0.30,
  'Brain, Memory & Perception': 0.20,
  'Psychology Thought Experiments': 0.15,
};

export type CTAType =
  | 'reflection'
  | 'continuation'
  | 'conversation'
  | 'connection'
  | 'none';

export type VisualTemplateType =
  | 'concept_diagram'
  | 'process_flow'
  | 'comparison'
  | 'timeline'
  | 'simple_statistic'
  | 'thought_experiment'
  | 'concept_quote_card';

export interface TopicCandidate {
  topic: string;
  pillar: ContentPillar;
  coreQuestion: string;
  rationale: string;
}

export interface ResearchStudy {
  authors: string;
  year: number | string;
  studyName?: string;
  findings: string;
  contextOrSample?: string;
}

export interface ResearchNotes {
  coreConcept: string;
  scientificClaims: string[];
  keyStudies: ResearchStudy[];
  cognitiveMechanisms: string[];
  caveatsAndLimitations: string[];
  uncertaintyLevel: 'low' | 'moderate' | 'high';
  everydayManifestation: string;
  groundingUrls?: string[];
}

export interface PostCTA {
  type: CTAType;
  text?: string;
}

export interface PostDraft {
  title: string;
  pillar: ContentPillar;
  hook: string;
  bodyParagraphs: string[];
  coreTakeaway: string;
  sourcesCited: string[];
  caveatNote: string;
  cta: PostCTA;
  sourceUrls?: string[];
}

export interface ConceptDiagramData {
  centralConcept: string;
  centralDescription: string;
  pillars: Array<{
    title: string;
    description: string;
    badge?: string;
  }>;
}

export interface ProcessFlowData {
  steps: Array<{
    number: number;
    title: string;
    description: string;
    highlight?: string;
  }>;
}

export interface ComparisonData {
  leftTitle: string;
  leftSubtitle: string;
  leftPoints: string[];
  rightTitle: string;
  rightSubtitle: string;
  rightPoints: string[];
}

export interface TimelineData {
  events: Array<{
    yearOrPhase: string;
    title: string;
    description: string;
  }>;
}

export interface SimpleStatisticData {
  highlightMetric: string;
  metricLabel: string;
  context: string;
  detailPoints: string[];
}

export interface ThoughtExperimentData {
  scenarioName: string;
  dilemma: string;
  branchA: { label: string; explanation: string };
  branchB: { label: string; explanation: string };
  psychologicalInsight: string;
}

export interface ConceptQuoteCardData {
  quote: string;
  author: string;
  sourceContext: string;
  keyTakeaway: string;
}

export type VisualTemplatePayload =
  | { template: 'concept_diagram'; data: ConceptDiagramData }
  | { template: 'process_flow'; data: ProcessFlowData }
  | { template: 'comparison'; data: ComparisonData }
  | { template: 'timeline'; data: TimelineData }
  | { template: 'simple_statistic'; data: SimpleStatisticData }
  | { template: 'thought_experiment'; data: ThoughtExperimentData }
  | { template: 'concept_quote_card'; data: ConceptQuoteCardData };

export interface VisualSpec {
  title: string;
  subtitle?: string;
  tag: string;
  sourceCitation?: string;
  template: VisualTemplateType;
  payload: VisualTemplatePayload;
}

export interface VisualDecision {
  needed: boolean;
  reason: string;
  template?: VisualTemplateType;
  spec?: VisualSpec;
}

export interface ContentItem {
  id: string;
  status: 'queued' | 'published' | 'failed';
  createdAt: string;
  scheduledFor?: string;
  publishedAt?: string;
  pillar: ContentPillar;
  topic: string;
  draft: PostDraft;
  visualDecision: VisualDecision;
  graphicPath?: string;
  formattedText: string;
  telegramMessageId?: number;
  failureReason?: string;
}

export interface ContentMemoryItem {
  id: string;
  topic: string;
  title: string;
  pillar: ContentPillar;
  coreConcept: string;
  publicationDate: string;
  sources: string[];
  sourceUrls?: string[];
  visualUsed: boolean;
  visualTemplate?: string;
  ctaType: CTAType;
}

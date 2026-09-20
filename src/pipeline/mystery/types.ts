/**
 * Mystery & Interactive Investigation Pipeline Types
 * Foundation for automated mystery content generation, investigation modeling,
 * visual card generation, quality control, and Telegram publishing.
 */

export type CaseType = 'fictional' | 'factual';

export type CaseDifficulty = 'beginner' | 'intermediate' | 'expert';

export type EvidenceType =
  | 'physical'
  | 'forensic'
  | 'document'
  | 'digital'
  | 'testimony'
  | 'acoustic';

export type MysteryContentType =
  | 'CASE_INTRO'
  | 'EVIDENCE'
  | 'INVESTIGATION_POLL'
  | 'CLUE_REVEAL'
  | 'FINAL_REVEAL';

export type MysteryVisualTemplateType =
  | 'case_cover_card'
  | 'evidence_card'
  | 'clue_card'
  | 'suspect_card'
  | 'timeline_card'
  | 'final_reveal_card'
  | 'location_diagram_card'
  | 'relationship_diagram_card'
  | 'evidence_connection_card';

export interface MysteryCharacter {
  id: string;
  name: string;
  role: string;
  description: string;
  alibiOrMotive: string;
  isSuspect: boolean;
  notes?: string;
}

export interface MysteryEvidence {
  id: string;
  title: string;
  type: EvidenceType;
  description?: string;
  locationFound: string;
  significance: string;
  analysis?: string;
}

export interface MysteryHypothesis {
  id: string;
  hypothesis: string;
  plausibility: 'low' | 'medium' | 'high';
  supportingEvidenceIds: string[];
  counterEvidenceIds: string[];
}

export interface MysteryResolution {
  answer: string;
  culpritOrCause: string;
  keyClueIds: string[];
  howDeductionWorks: string;
  aftermathOrConclusion?: string;
}

export interface TimelineEvent {
  timestamp: string;
  title: string;
  description: string;
  evidenceId?: string;
}

export interface MysteryCase {
  caseId: string;
  title: string;
  caseType: CaseType;
  difficulty: CaseDifficulty;
  tags: string[];
  premise: string;
  setting: {
    location: string;
    timePeriod?: string;
    atmosphere?: string;
  };
  characters: MysteryCharacter[];
  mysteryQuestion: string;
  evidence: MysteryEvidence[];
  timeline?: TimelineEvent[];
  possibleExplanations: MysteryHypothesis[];
  correctResolution: MysteryResolution;
  createdAt: string;
}

export interface MysteryPollOption {
  text: string;
  leadsToClueId?: string;
  isCorrectHypothesis?: boolean;
}

export interface MysteryPollData {
  question: string;
  options: string[];
  explanation?: string;
}

export interface MysteryPostDraft {
  caseId: string;
  caseTitle: string;
  format: MysteryContentType;
  headline: string;
  hook: string;
  bodyParagraphs: string[];
  evidenceSpotlight?: MysteryEvidence;
  characterSpotlight?: MysteryCharacter;
  poll?: MysteryPollData;
  clueDetail?: {
    clueTitle: string;
    breakthrough: string;
    significance: string;
    evidenceId?: string;
  };
  revealDetail?: {
    culpritOrCause: string;
    trueExplanation: string;
    debunkedHypotheses?: string[];
  };
  investigationNote?: string;
  callToAction?: string;
  visualSpec?: MysteryVisualSpec;
}

export interface CaseCoverCardData {
  caseNumber: string;
  title: string;
  premiseSummary: string;
  location: string;
  difficulty: CaseDifficulty;
  suspectCount: number;
  evidenceCount: number;
  mysteryQuestion: string;
}

export interface EvidenceCardData {
  caseNumber: string;
  evidenceId: string;
  title: string;
  type: EvidenceType;
  locationFound: string;
  forensicObservation: string;
  significanceNote: string;
  documentLines?: string[];
  chatMessages?: Array<{ sender: string; text: string; isAnomaly?: boolean }>;
  timestamp?: string;
  dateOrRef?: string;
}

export interface ClueCardData {
  caseNumber: string;
  clueTitle: string;
  evidenceRef: string;
  discoveryText: string;
  deductionHint: string;
}

export interface SuspectCardData {
  caseNumber: string;
  suspectName: string;
  role: string;
  motive: string;
  alibi: string;
  suspiciousDetail: string;
  isPrimarySuspect?: boolean;
}

export interface TimelineCardData {
  caseNumber: string;
  caseTitle: string;
  anomalyWindow?: string;
  events: Array<{
    timestamp: string;
    title: string;
    description: string;
    isKeyAnomaly?: boolean;
  }>;
}

export interface FinalRevealCardData {
  caseNumber: string;
  caseTitle: string;
  culpritOrCause: string;
  coreBreakthrough: string;
  keyEvidenceCited: string[];
  caseStatus: 'CASE SOLVED' | 'MYSTERY REVEALED';
}

export interface LocationDiagramCardData {
  caseNumber: string;
  locationName: string;
  zones: Array<{
    name: string;
    evidenceItems?: string[];
    suspectPresent?: string;
    isAccessRestricted?: boolean;
  }>;
  keyObservation: string;
}

export interface RelationshipDiagramCardData {
  caseNumber: string;
  caseTitle: string;
  suspects: Array<{ name: string; role: string; hasMotive: boolean }>;
  relationships: Array<{
    source: string;
    target: string;
    relationType: 'conflict' | 'alibi_partner' | 'subordinate' | 'secret_contact';
    note: string;
  }>;
}

export interface EvidenceConnectionCardData {
  caseNumber: string;
  caseTitle: string;
  clues: Array<{ id: string; label: string }>;
  deductionResult: string;
  culpritOrOutcome: string;
}

export type MysteryVisualPayload =
  | { template: 'case_cover_card'; data: CaseCoverCardData }
  | { template: 'evidence_card'; data: EvidenceCardData }
  | { template: 'clue_card'; data: ClueCardData }
  | { template: 'suspect_card'; data: SuspectCardData }
  | { template: 'timeline_card'; data: TimelineCardData }
  | { template: 'final_reveal_card'; data: FinalRevealCardData }
  | { template: 'location_diagram_card'; data: LocationDiagramCardData }
  | { template: 'relationship_diagram_card'; data: RelationshipDiagramCardData }
  | { template: 'evidence_connection_card'; data: EvidenceConnectionCardData };

export interface MysteryVisualSpec {
  title: string;
  subtitle?: string;
  tag: string;
  caseId: string;
  template: MysteryVisualTemplateType;
  payload: MysteryVisualPayload;
}

export interface InvestigationStep {
  stepNumber: number;
  format: MysteryContentType;
  draft: MysteryPostDraft;
  visualSpec?: MysteryVisualSpec;
}

export interface InvestigationSequence {
  caseId: string;
  caseTitle: string;
  difficulty: CaseDifficulty;
  steps: InvestigationStep[];
  createdAt: string;
}

export interface MysteryQCResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    evidenceCount: number;
    characterCount: number;
    explanationCount: number;
    hasResolution: boolean;
  };
}

// ==========================================
// Phase 3: Interactive Investigation Types
// ==========================================

export type InvestigationStepType =
  | 'CASE_INTRO'
  | 'EVIDENCE'
  | 'INVESTIGATION_POLL'
  | 'AUDIENCE_CHOICE'
  | 'CLUE_REVEAL'
  | 'FINAL_REVEAL'
  | 'COMPLETED';

export type InvestigationStateStatus =
  | 'IN_PROGRESS'
  | 'POLL_ACTIVE'
  | 'RESOLVED'
  | 'FAILED';

export interface InvestigationChoice {
  id: string;
  optionIndex: number;
  label: string;
  targetBranchId: string;
  focusAngle: string;
  clueIdToReveal: string;
}

export interface InvestigationBranch {
  branchId: string;
  title: string;
  hypothesisOrLead: string;
  unlockedEvidenceId: string;
  discoveryNote: string;
  deductionHint: string;
  isDirectResolutionLead: boolean;
}

export interface SelectedChoiceRecord {
  choiceId: string;
  optionIndex: number;
  label: string;
  targetBranchId: string;
  votePercentage?: number;
  totalVotes?: number;
  selectedAt: string;
}

export interface PublishedStepRecord {
  stepNumber: number;
  stepType: InvestigationStepType;
  headline: string;
  messageId?: string | number;
  pollId?: string | number;
  visualAssetPath?: string;
  publishedAt: string;
}

export interface InvestigationStateHistoryEntry {
  timestamp: string;
  action: string;
  step: InvestigationStepType;
  details?: Record<string, any>;
}

export interface InvestigationState {
  caseId: string;
  caseTitle: string;
  caseDifficulty: CaseDifficulty;
  currentStep: InvestigationStepType;
  status: InvestigationStateStatus;
  availableChoices: InvestigationChoice[];
  branches: Record<string, InvestigationBranch>;
  selectedAudienceChoice: SelectedChoiceRecord | null;
  revealedClueIds: string[];
  publishedSteps: PublishedStepRecord[];
  history: InvestigationStateHistoryEntry[];
  finalResolutionStatus: 'UNRESOLVED' | 'RESOLVED' | 'FAILED';
  createdAt: string;
  updatedAt: string;
}

export interface TelegramPollResult {
  pollId: string;
  winningOptionIndex: number;
  options: Array<{
    text: string;
    voterCount: number;
  }>;
  totalVoters: number;
}

export interface TelegramDispatchResult {
  success: boolean;
  messageId: string | number;
  pollId?: string | number;
  stepType: InvestigationStepType;
  formattedText: string;
  hasVisual: boolean;
  visualPath?: string;
  dispatchedAt: string;
}

export interface InvestigationSimulationOptions {
  caseIndex?: number;
  customCase?: MysteryCase;
  selectedChoiceIndex?: number;
  outputDirectory?: string;
  renderVisuals?: boolean;
}

export interface InvestigationSimulationResult {
  caseId: string;
  caseTitle: string;
  state: InvestigationState;
  stepsDispatched: PublishedStepRecord[];
  selectedChoice: SelectedChoiceRecord;
  renderedVisualFiles: string[];
  transcriptText: string;
  transcriptMarkdown: string;
  pacingValidation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  outputDirectory: string;
}


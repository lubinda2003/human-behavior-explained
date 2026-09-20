/**
 * Mystery Visual Templates for Satori Layout Generation
 * Renders structured SVG DOM elements for 6 core investigation templates + 3 diagram templates:
 * 1. case_cover_card - Case dossier cover with status, premise, and metadata
 * 2. evidence_card - Forensic specimen / document transcript / digital chat log card
 * 3. clue_card - Breakthrough discovery card with deduction hint
 * 4. suspect_card - Person of interest dossier with motive and alibi
 * 5. timeline_card - Chronological timeline of events leading to the incident
 * 6. final_reveal_card - Case Solved resolution card with core deduction
 * 7. location_diagram_card - Spatial zone mapping & access vectors
 * 8. relationship_diagram_card - Suspect tension & relationship matrix
 * 9. evidence_connection_card - Clue synthesis & deduction graph
 */

import React from 'react';
import {
  MysteryVisualSpec,
  CaseCoverCardData,
  EvidenceCardData,
  ClueCardData,
  SuspectCardData,
  TimelineCardData,
  FinalRevealCardData,
  LocationDiagramCardData,
  RelationshipDiagramCardData,
  EvidenceConnectionCardData,
} from '../types.js';
import {
  MYSTERY_THEME,
  renderCaseHeader,
  renderSpecimenBox,
  renderDocumentExcerpt,
  renderDigitalLogSnippet,
  renderStatusStamp,
} from './primitives.js';
import {
  renderTimelineDiagram,
  renderLocationDiagram,
  renderRelationshipDiagram,
  renderEvidenceConnectionDiagram,
} from './diagrams.js';

export { MYSTERY_THEME, renderCaseHeader };

/**
 * 1. Case Cover Card
 */
export function renderCaseCoverCard(data: CaseCoverCardData): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: MYSTERY_THEME.bg,
        padding: '36px 44px',
        boxSizing: 'border-box',
        justifyContent: 'space-between',
      }}
    >
      {renderCaseHeader(data.caseNumber, 'ACTIVE DOSSIER', data.title, MYSTERY_THEME.accentGold)}

      <div
        style={{
          display: 'flex',
          gap: '24px',
          width: '100%',
          flex: 1,
        }}
      >
        {/* Left main premise */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 2,
            backgroundColor: MYSTERY_THEME.cardBg,
            border: `1px solid ${MYSTERY_THEME.cardBorder}`,
            borderRadius: '14px',
            padding: '24px',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                fontSize: '12px',
                fontWeight: 700,
                color: MYSTERY_THEME.accentGold,
                letterSpacing: '1.5px',
                marginBottom: '10px',
                textTransform: 'uppercase',
              }}
            >
              INCIDENT PREMISE
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: '17px',
                color: MYSTERY_THEME.textPrimary,
                lineHeight: 1.5,
              }}
            >
              {data.premiseSummary}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginTop: '16px',
              paddingTop: '14px',
              borderTop: `1px solid ${MYSTERY_THEME.cardBorder}`,
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: '12px',
                fontWeight: 700,
                color: MYSTERY_THEME.accentSky,
                letterSpacing: '1px',
                marginBottom: '6px',
                textTransform: 'uppercase',
              }}
            >
              CORE MYSTERY QUESTION
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: '15px',
                color: MYSTERY_THEME.textSecondary,
                fontStyle: 'italic',
              }}
            >
              {data.mysteryQuestion}
            </div>
          </div>
        </div>

        {/* Right side stats metadata */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            gap: '12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: MYSTERY_THEME.cardBg,
              border: `1px solid ${MYSTERY_THEME.cardBorder}`,
              borderRadius: '12px',
              padding: '14px 18px',
            }}
          >
            <div style={{ display: 'flex', fontSize: '11px', color: MYSTERY_THEME.textMuted, textTransform: 'uppercase', letterSpacing: '1px' }}>
              PRIMARY LOCATION
            </div>
            <div style={{ display: 'flex', fontSize: '15px', fontWeight: 700, color: MYSTERY_THEME.textPrimary, marginTop: '2px' }}>
              📍 {data.location}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: MYSTERY_THEME.cardBg,
              border: `1px solid ${MYSTERY_THEME.cardBorder}`,
              borderRadius: '12px',
              padding: '14px 18px',
            }}
          >
            <div style={{ display: 'flex', fontSize: '11px', color: MYSTERY_THEME.textMuted, textTransform: 'uppercase', letterSpacing: '1px' }}>
              DIFFICULTY RATING
            </div>
            <div style={{ display: 'flex', fontSize: '15px', fontWeight: 700, color: MYSTERY_THEME.accentGold, marginTop: '2px', textTransform: 'uppercase' }}>
              ★ {data.difficulty}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              backgroundColor: MYSTERY_THEME.cardBg,
              border: `1px solid ${MYSTERY_THEME.cardBorder}`,
              borderRadius: '12px',
              padding: '14px 18px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', fontSize: '11px', color: MYSTERY_THEME.textMuted, textTransform: 'uppercase' }}>SUSPECTS</div>
              <div style={{ display: 'flex', fontSize: '20px', fontWeight: 700, color: MYSTERY_THEME.textPrimary, marginTop: '2px' }}>{data.suspectCount}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', fontSize: '11px', color: MYSTERY_THEME.textMuted, textTransform: 'uppercase' }}>CLUES LOGGED</div>
              <div style={{ display: 'flex', fontSize: '20px', fontWeight: 700, color: MYSTERY_THEME.accentSky, marginTop: '2px' }}>{data.evidenceCount}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 2. Evidence Card (Adaptable for Document, Digital Log, or Physical/Forensic Specimen)
 */
export function renderEvidenceCard(data: EvidenceCardData): React.ReactElement {
  // If evidence has document transcript lines
  if (data.type === 'document' && data.documentLines && data.documentLines.length > 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: MYSTERY_THEME.bg,
          padding: '36px 44px',
          boxSizing: 'border-box',
          justifyContent: 'space-between',
        }}
      >
        {renderCaseHeader(
          data.caseNumber,
          'DOCUMENTARY EVIDENCE',
          data.title,
          MYSTERY_THEME.accentGold,
          `RECOVERED AT: ${data.locationFound}`
        )}
        {renderDocumentExcerpt(
          data.title,
          data.dateOrRef || data.evidenceId,
          data.documentLines,
          data.significanceNote
        )}
      </div>
    );
  }

  // If evidence has digital chat/log messages
  if (data.type === 'digital' && data.chatMessages && data.chatMessages.length > 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: MYSTERY_THEME.bg,
          padding: '36px 44px',
          boxSizing: 'border-box',
          justifyContent: 'space-between',
        }}
      >
        {renderCaseHeader(
          data.caseNumber,
          'DIGITAL SURVEILLANCE LOG',
          data.title,
          MYSTERY_THEME.accentSky,
          `RECOVERED AT: ${data.locationFound}`
        )}
        {renderDigitalLogSnippet(
          data.title,
          data.timestamp || 'RECOVERED RECORD',
          data.chatMessages,
          data.significanceNote
        )}
      </div>
    );
  }

  // Standard Forensic / Physical Specimen Card
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: MYSTERY_THEME.bg,
        padding: '36px 44px',
        boxSizing: 'border-box',
        justifyContent: 'space-between',
      }}
    >
      {renderCaseHeader(
        data.caseNumber,
        `${data.type.toUpperCase()} EVIDENCE`,
        data.title,
        MYSTERY_THEME.accentSky
      )}

      <div
        style={{
          display: 'flex',
          gap: '24px',
          width: '100%',
          flex: 1,
        }}
      >
        {/* Specimen Box */}
        {renderSpecimenBox(
          data.evidenceId,
          data.type,
          data.forensicObservation,
          data.locationFound
        )}

        {/* Investigative Significance & Custody Panel */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            backgroundColor: '#111C30',
            border: `1px solid ${MYSTERY_THEME.cardBorderHighlight}`,
            borderRadius: '12px',
            padding: '22px',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: '11px', fontWeight: 700, color: MYSTERY_THEME.accentGold, letterSpacing: '1.5px', marginBottom: '8px', textTransform: 'uppercase' }}>
              INVESTIGATIVE SIGNIFICANCE
            </div>
            <div style={{ display: 'flex', fontSize: '16px', color: MYSTERY_THEME.textPrimary, lineHeight: 1.5 }}>
              {data.significanceNote}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: MYSTERY_THEME.tagBg,
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '12px',
              color: MYSTERY_THEME.textMuted,
            }}
          >
            ITEM ID: #{data.evidenceId.toUpperCase()} • LOGGED IN EVIDENCE VAULT
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 3. Clue Card (Breakthrough Clue Discovery)
 */
export function renderClueCard(data: ClueCardData): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: MYSTERY_THEME.bg,
        padding: '36px 44px',
        boxSizing: 'border-box',
        justifyContent: 'space-between',
      }}
    >
      {renderCaseHeader(
        data.caseNumber,
        'FORENSIC BREAKTHROUGH',
        data.clueTitle,
        MYSTERY_THEME.accentGold
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          flex: 1,
          backgroundColor: MYSTERY_THEME.cardBg,
          border: `1px solid ${MYSTERY_THEME.cardBorder}`,
          borderRadius: '14px',
          padding: '26px 32px',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: '12px', fontWeight: 700, color: MYSTERY_THEME.accentGold, letterSpacing: '1.5px', marginBottom: '10px', textTransform: 'uppercase' }}>
            UNLOCKED DETAIL (REF: #{data.evidenceRef.toUpperCase()})
          </div>
          <div style={{ display: 'flex', fontSize: '18px', color: MYSTERY_THEME.textPrimary, lineHeight: 1.5 }}>
            {data.discoveryText}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#1E293B',
            borderRadius: '10px',
            padding: '16px 20px',
            borderLeft: `4px solid ${MYSTERY_THEME.accentSky}`,
          }}
        >
          <div style={{ display: 'flex', fontSize: '11px', fontWeight: 700, color: MYSTERY_THEME.accentSky, textTransform: 'uppercase', marginBottom: '4px' }}>
            DEDUCTION INSIGHT
          </div>
          <div style={{ display: 'flex', fontSize: '15px', color: MYSTERY_THEME.textSecondary }}>
            {data.deductionHint}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 4. Suspect Card (Person of Interest Dossier)
 */
export function renderSuspectCard(data: SuspectCardData): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: MYSTERY_THEME.bg,
        padding: '36px 44px',
        boxSizing: 'border-box',
        justifyContent: 'space-between',
      }}
    >
      {renderCaseHeader(
        data.caseNumber,
        data.isPrimarySuspect ? 'PRIMARY SUSPECT' : 'PERSON OF INTEREST',
        data.suspectName,
        data.isPrimarySuspect ? MYSTERY_THEME.accentCrimson : MYSTERY_THEME.accentSky
      )}

      <div
        style={{
          display: 'flex',
          gap: '24px',
          width: '100%',
          flex: 1,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            backgroundColor: MYSTERY_THEME.cardBg,
            border: `1px solid ${MYSTERY_THEME.cardBorder}`,
            borderRadius: '14px',
            padding: '22px',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: '11px', fontWeight: 700, color: MYSTERY_THEME.textMuted, textTransform: 'uppercase', marginBottom: '4px' }}>ROLE / OCCUPATION</div>
            <div style={{ display: 'flex', fontSize: '16px', fontWeight: 700, color: MYSTERY_THEME.textPrimary }}>{data.role}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: '14px' }}>
            <div style={{ display: 'flex', fontSize: '11px', fontWeight: 700, color: MYSTERY_THEME.accentCrimson, textTransform: 'uppercase', marginBottom: '4px' }}>MOTIVE / SUSPICION</div>
            <div style={{ display: 'flex', fontSize: '15px', color: MYSTERY_THEME.textSecondary, lineHeight: 1.45 }}>{data.motive}</div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            backgroundColor: MYSTERY_THEME.cardBg,
            border: `1px solid ${MYSTERY_THEME.cardBorder}`,
            borderRadius: '14px',
            padding: '22px',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: '11px', fontWeight: 700, color: MYSTERY_THEME.accentSky, textTransform: 'uppercase', marginBottom: '4px' }}>STATED ALIBI</div>
            <div style={{ display: 'flex', fontSize: '15px', color: MYSTERY_THEME.textSecondary, lineHeight: 1.45 }}>{data.alibi}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: '14px' }}>
            <div style={{ display: 'flex', fontSize: '11px', fontWeight: 700, color: MYSTERY_THEME.accentGold, textTransform: 'uppercase', marginBottom: '4px' }}>CONTRADICTING ANOMALY</div>
            <div style={{ display: 'flex', fontSize: '15px', color: MYSTERY_THEME.textPrimary, lineHeight: 1.45 }}>{data.suspiciousDetail}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 5. Timeline Card
 */
export function renderTimelineCard(data: TimelineCardData): React.ReactElement {
  return renderTimelineDiagram(data);
}

/**
 * 6. Final Reveal Card
 */
export function renderFinalRevealCard(data: FinalRevealCardData): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: MYSTERY_THEME.bg,
        padding: '36px 44px',
        boxSizing: 'border-box',
        justifyContent: 'space-between',
      }}
    >
      {renderCaseHeader(
        data.caseNumber,
        data.caseStatus,
        data.caseTitle,
        MYSTERY_THEME.accentEmerald
      )}

      <div
        style={{
          display: 'flex',
          gap: '24px',
          width: '100%',
          flex: 1,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 2,
            backgroundColor: '#0B231C',
            border: `1px solid ${MYSTERY_THEME.accentEmerald}`,
            borderRadius: '14px',
            padding: '24px',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: '11px', fontWeight: 700, color: MYSTERY_THEME.accentEmerald, letterSpacing: '1.5px', marginBottom: '6px', textTransform: 'uppercase' }}>
              VERIFIED CULPRIT / CAUSE
            </div>
            <div style={{ display: 'flex', fontSize: '22px', fontWeight: 700, color: MYSTERY_THEME.textPrimary }}>
              {data.culpritOrCause}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', marginTop: '14px' }}>
            <div style={{ display: 'flex', fontSize: '11px', fontWeight: 700, color: MYSTERY_THEME.accentGold, letterSpacing: '1px', marginBottom: '6px', textTransform: 'uppercase' }}>
              LOGICAL DEDUCTION CHAIN
            </div>
            <div style={{ display: 'flex', fontSize: '15px', color: MYSTERY_THEME.textSecondary, lineHeight: 1.45 }}>
              {data.coreBreakthrough}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            backgroundColor: MYSTERY_THEME.cardBg,
            border: `1px solid ${MYSTERY_THEME.cardBorder}`,
            borderRadius: '14px',
            padding: '22px',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: '11px', fontWeight: 700, color: MYSTERY_THEME.accentSky, letterSpacing: '1px', marginBottom: '8px', textTransform: 'uppercase' }}>
              PIVOTAL EVIDENCE CITED
            </div>
            {data.keyEvidenceCited.map((ev, i) => (
              <div key={i} style={{ display: 'flex', fontSize: '14px', color: MYSTERY_THEME.textPrimary, marginBottom: '6px' }}>
                • #{ev.toUpperCase()}
              </div>
            ))}
          </div>

          {renderStatusStamp('CASE SOLVED', 'SOLVED')}
        </div>
      </div>
    </div>
  );
}

/**
 * Root Router for all mystery visual templates & diagrams.
 */
export function renderMysteryVisualRoot(spec: MysteryVisualSpec): React.ReactElement {
  switch (spec.payload.template) {
    case 'case_cover_card':
      return renderCaseCoverCard(spec.payload.data);
    case 'evidence_card':
      return renderEvidenceCard(spec.payload.data);
    case 'clue_card':
      return renderClueCard(spec.payload.data);
    case 'suspect_card':
      return renderSuspectCard(spec.payload.data);
    case 'timeline_card':
      return renderTimelineCard(spec.payload.data);
    case 'final_reveal_card':
      return renderFinalRevealCard(spec.payload.data);
    case 'location_diagram_card':
      return renderLocationDiagram(spec.payload.data);
    case 'relationship_diagram_card':
      return renderRelationshipDiagram(spec.payload.data);
    case 'evidence_connection_card':
      return renderEvidenceConnectionDiagram(spec.payload.data);
    default:
      throw new Error(`Unknown mystery visual template: ${(spec.payload as any).template}`);
  }
}

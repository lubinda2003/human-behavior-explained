/**
 * Data-Driven Investigation Diagrams
 * Lightweight deterministic SVG diagram renderers for:
 * 1. Timeline Chronology Diagram
 * 2. Location / Spatial Zone Diagram
 * 3. Relationship & Suspect Tension Diagram
 * 4. Evidence Deduction Connection Graph
 */

import React from 'react';
import { MYSTERY_THEME, renderCaseHeader } from './primitives.js';

export interface TimelineDiagramData {
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

export interface LocationZone {
  name: string;
  evidenceItems?: string[];
  suspectPresent?: string;
  isAccessRestricted?: boolean;
}

export interface LocationDiagramData {
  caseNumber: string;
  locationName: string;
  zones: LocationZone[];
  keyObservation: string;
}

export interface SuspectRelationship {
  source: string;
  target: string;
  relationType: 'conflict' | 'alibi_partner' | 'subordinate' | 'secret_contact';
  note: string;
}

export interface RelationshipDiagramData {
  caseNumber: string;
  caseTitle: string;
  suspects: Array<{ name: string; role: string; hasMotive: boolean }>;
  relationships: SuspectRelationship[];
}

export interface EvidenceConnectionData {
  caseNumber: string;
  caseTitle: string;
  clues: Array<{ id: string; label: string }>;
  deductionResult: string;
  culpritOrOutcome: string;
}

/**
 * 1. Timeline Chronology Diagram
 */
export function renderTimelineDiagram(data: TimelineDiagramData): React.ReactElement {
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
        'INCIDENT TIMELINE',
        data.caseTitle,
        MYSTERY_THEME.accentSky,
        data.anomalyWindow ? `CRITICAL WINDOW: ${data.anomalyWindow}` : undefined
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
          padding: '24px 32px',
          justifyContent: 'space-around',
        }}
      >
        {data.events.slice(0, 4).map((ev, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              gap: '20px',
              backgroundColor: ev.isKeyAnomaly ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
              padding: ev.isKeyAnomaly ? '10px 14px' : '6px 0',
              borderRadius: '8px',
              borderLeft: ev.isKeyAnomaly ? `4px solid ${MYSTERY_THEME.accentCrimson}` : 'none',
            }}
          >
            <div
              style={{
                display: 'flex',
                width: '90px',
                fontSize: '14px',
                fontWeight: 700,
                color: ev.isKeyAnomaly ? MYSTERY_THEME.accentCrimson : MYSTERY_THEME.accentGold,
              }}
            >
              {ev.timestamp}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '12px',
                height: '12px',
                borderRadius: '6px',
                backgroundColor: ev.isKeyAnomaly ? MYSTERY_THEME.accentCrimson : MYSTERY_THEME.accentSky,
              }}
            />

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    color: ev.isKeyAnomaly ? MYSTERY_THEME.textPrimary : MYSTERY_THEME.textPrimary,
                  }}
                >
                  {ev.title}
                </span>
                {ev.isKeyAnomaly && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: MYSTERY_THEME.accentCrimson,
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                    }}
                  >
                    ★ TIMELINE ANOMALY
                  </span>
                )}
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: '13px',
                  color: MYSTERY_THEME.textSecondary,
                  marginTop: '2px',
                }}
              >
                {ev.description}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 2. Location & Spatial Zone Diagram
 */
export function renderLocationDiagram(data: LocationDiagramData): React.ReactElement {
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
        'SPATIAL FORENSICS',
        data.locationName,
        MYSTERY_THEME.accentCyan,
        'CRIME SCENE ZONE MAPPING & ACCESS VECTORS'
      )}

      <div
        style={{
          display: 'flex',
          gap: '16px',
          width: '100%',
          flex: 1,
        }}
      >
        {data.zones.slice(0, 3).map((zone, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              backgroundColor: MYSTERY_THEME.cardBg,
              border: zone.isAccessRestricted
                ? `1px solid ${MYSTERY_THEME.accentCrimson}`
                : `1px solid ${MYSTERY_THEME.cardBorder}`,
              borderRadius: '12px',
              padding: '18px',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 700, color: MYSTERY_THEME.accentSky, letterSpacing: '1px' }}>
                  ZONE {idx + 1}
                </span>
                {zone.isAccessRestricted && (
                  <span
                    style={{
                      fontSize: '10px',
                      color: MYSTERY_THEME.accentCrimson,
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: 700,
                    }}
                  >
                    RESTRICTED
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', fontSize: '16px', fontWeight: 700, color: MYSTERY_THEME.textPrimary, marginBottom: '10px' }}>
                {zone.name}
              </div>

              {zone.evidenceItems && zone.evidenceItems.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                  <span style={{ fontSize: '11px', color: MYSTERY_THEME.textMuted, textTransform: 'uppercase' }}>
                    RECOVERED EVIDENCE
                  </span>
                  {zone.evidenceItems.map((item, i) => (
                    <span key={i} style={{ fontSize: '12px', color: MYSTERY_THEME.accentGold }}>
                      📍 {item}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {zone.suspectPresent && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: '#1E293B',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  marginTop: '12px',
                }}
              >
                <span style={{ fontSize: '10px', color: MYSTERY_THEME.textMuted }}>CLAIMED PRESENCE:</span>
                <span style={{ fontSize: '12px', color: MYSTERY_THEME.textPrimary, fontWeight: 700 }}>
                  👤 {zone.suspectPresent}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#0F1B30',
          border: `1px solid ${MYSTERY_THEME.cardBorder}`,
          borderRadius: '8px',
          padding: '10px 16px',
          marginTop: '14px',
          fontSize: '13px',
          color: MYSTERY_THEME.textSecondary,
        }}
      >
        <span style={{ color: MYSTERY_THEME.accentGold, fontWeight: 700, marginRight: '8px' }}>
          FORENSIC VECTOR:
        </span>
        {data.keyObservation}
      </div>
    </div>
  );
}

/**
 * 3. Relationship & Suspect Tension Diagram
 */
export function renderRelationshipDiagram(data: RelationshipDiagramData): React.ReactElement {
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
        'SUSPECT MATRIX',
        data.caseTitle,
        MYSTERY_THEME.accentCrimson,
        'INTER-SUSPECT TENSIONS & ALIBI CORRELATIONS'
      )}

      <div
        style={{
          display: 'flex',
          gap: '20px',
          width: '100%',
          flex: 1,
        }}
      >
        {/* Left: Suspect Roster */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            backgroundColor: MYSTERY_THEME.cardBg,
            border: `1px solid ${MYSTERY_THEME.cardBorder}`,
            borderRadius: '12px',
            padding: '18px',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', fontSize: '11px', fontWeight: 700, color: MYSTERY_THEME.accentSky, letterSpacing: '1px' }}>
            PERSONS UNDER INVESTIGATION
          </div>
          {data.suspects.slice(0, 3).map((s, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#172033',
                padding: '10px 14px',
                borderRadius: '8px',
                borderLeft: s.hasMotive ? `3px solid ${MYSTERY_THEME.accentCrimson}` : `3px solid ${MYSTERY_THEME.cardBorder}`,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: MYSTERY_THEME.textPrimary }}>
                  {s.name}
                </span>
                <span style={{ fontSize: '11px', color: MYSTERY_THEME.textMuted }}>{s.role}</span>
              </div>
              {s.hasMotive && (
                <span style={{ fontSize: '10px', fontWeight: 700, color: MYSTERY_THEME.accentCrimson, letterSpacing: '0.5px' }}>
                  [MOTIVE]
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Right: Key Friction / Link Matrix */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            backgroundColor: '#0D1527',
            border: `1px solid ${MYSTERY_THEME.cardBorder}`,
            borderRadius: '12px',
            padding: '18px',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', fontSize: '11px', fontWeight: 700, color: MYSTERY_THEME.accentGold, letterSpacing: '1px' }}>
              DETECTED CONFLICTS & INTERACTIONS
            </div>

            {data.relationships.slice(0, 3).map((rel, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: '#070C16',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  borderLeft: `3px solid ${MYSTERY_THEME.accentGold}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: MYSTERY_THEME.textPrimary }}>
                  <span>{rel.source} ↔ {rel.target}</span>
                  <span style={{ fontSize: '10px', color: MYSTERY_THEME.accentGold, textTransform: 'uppercase' }}>
                    {rel.relationType.replace('_', ' ')}
                  </span>
                </div>
                <div style={{ display: 'flex', fontSize: '12px', color: MYSTERY_THEME.textSecondary, marginTop: '2px' }}>
                  {rel.note}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              fontSize: '11px',
              color: MYSTERY_THEME.textMuted,
              paddingTop: '8px',
              borderTop: `1px solid ${MYSTERY_THEME.cardBorder}`,
            }}
          >
            Conflicting statements indicate at least one fabricated alibi.
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 4. Evidence Deduction Connection Graph
 */
export function renderEvidenceConnectionDiagram(data: EvidenceConnectionData): React.ReactElement {
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
        'DEDUCTION CHAIN',
        data.caseTitle,
        MYSTERY_THEME.accentEmerald,
        'FORENSIC CLUE SYNTHESIS'
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          flex: 1,
          backgroundColor: MYSTERY_THEME.cardBg,
          border: `1px solid ${MYSTERY_THEME.accentEmerald}`,
          borderRadius: '14px',
          padding: '24px 30px',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: '16px', width: '100%' }}>
          {data.clues.slice(0, 3).map((clue, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                backgroundColor: '#132238',
                border: `1px solid ${MYSTERY_THEME.cardBorder}`,
                borderRadius: '8px',
                padding: '12px 14px',
              }}
            >
              <span style={{ fontSize: '11px', fontWeight: 700, color: MYSTERY_THEME.accentSky, marginBottom: '4px' }}>
                CLUE #{clue.id.toUpperCase()}
              </span>
              <span style={{ fontSize: '13px', color: MYSTERY_THEME.textPrimary }}>
                {clue.label}
              </span>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            color: MYSTERY_THEME.accentEmerald,
            fontWeight: 700,
          }}
        >
          ⬇ SYNTHESIZED FORENSIC CONCLUSION ⬇
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#0A1C16',
            border: `1px solid ${MYSTERY_THEME.accentEmerald}`,
            borderRadius: '10px',
            padding: '16px 20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: MYSTERY_THEME.accentEmerald, letterSpacing: '1px' }}>
              PROVEN OUTCOME / ROOT CAUSE
            </span>
            <span style={{ fontSize: '14px', fontWeight: 700, color: MYSTERY_THEME.textPrimary }}>
              👤 {data.culpritOrOutcome}
            </span>
          </div>
          <div style={{ display: 'flex', fontSize: '14px', color: MYSTERY_THEME.textSecondary, lineHeight: 1.4 }}>
            {data.deductionResult}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Mystery Visual Design System Primitives
 * Reusable visual building blocks for Satori/SVG generation:
 * - Typography & Headers
 * - Forensic Grids & Specimen Panels
 * - Document & Digital Transcript Frames
 * - Evidence Badges & Status Stamps
 * - Metadata Tags & Chronology Pills
 */

import React from 'react';
import { EvidenceType } from '../types.js';

export const MYSTERY_THEME = {
  bg: '#080C14',
  cardBg: '#0F172A',
  cardBgSubtle: '#172033',
  cardBorder: '#1E2D4A',
  cardBorderHighlight: '#38BDF8',
  cardBorderGold: '#F59E0B',
  cardBorderCrimson: '#EF4444',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  accentGold: '#F59E0B',
  accentCyan: '#06B6D4',
  accentSky: '#38BDF8',
  accentCrimson: '#EF4444',
  accentEmerald: '#10B981',
  accentAmber: '#D97706',
  tagBg: '#131F37',
  redactedBg: '#334155',
  gridLine: 'rgba(56, 189, 248, 0.08)',
};

/**
 * Standard Header for all investigation visual cards.
 */
export function renderCaseHeader(
  caseNumber: string,
  tagText: string,
  title: string,
  tagColor = MYSTERY_THEME.accentGold,
  subtitle?: string
): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        marginBottom: '20px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          marginBottom: '8px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            letterSpacing: '2px',
            fontWeight: 700,
            color: MYSTERY_THEME.accentSky,
            textTransform: 'uppercase',
          }}
        >
          <span>DOSSIER #{caseNumber}</span>
          <span style={{ color: MYSTERY_THEME.textMuted }}>•</span>
          <span style={{ color: MYSTERY_THEME.textSecondary }}>FORENSIC LOG</span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: MYSTERY_THEME.tagBg,
            border: `1px solid ${MYSTERY_THEME.cardBorder}`,
            borderRadius: '16px',
            padding: '4px 14px',
            fontSize: '12px',
            fontWeight: 700,
            color: tagColor,
            letterSpacing: '1px',
            textTransform: 'uppercase',
          }}
        >
          {tagText}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          fontSize: '30px',
          fontWeight: 700,
          color: MYSTERY_THEME.textPrimary,
          lineHeight: 1.2,
          letterSpacing: '-0.5px',
        }}
      >
        {title}
      </div>

      {subtitle && (
        <div
          style={{
            display: 'flex',
            fontSize: '14px',
            color: MYSTERY_THEME.textSecondary,
            marginTop: '4px',
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}

/**
 * Forensic Specimen Box with crosshairs and measurement ticks.
 */
export function renderSpecimenBox(
  itemId: string,
  evidenceType: EvidenceType,
  description: string,
  location: string
): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        backgroundColor: MYSTERY_THEME.cardBg,
        border: `1px solid ${MYSTERY_THEME.cardBorder}`,
        borderRadius: '12px',
        padding: '20px',
        position: 'relative',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            fontWeight: 700,
            color: MYSTERY_THEME.accentSky,
            letterSpacing: '1px',
            textTransform: 'uppercase',
          }}
        >
          <span>[+] FORENSIC SPECIMEN #{itemId}</span>
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: '11px',
            color: MYSTERY_THEME.textMuted,
            backgroundColor: MYSTERY_THEME.tagBg,
            padding: '2px 8px',
            borderRadius: '4px',
          }}
        >
          TYPE: {evidenceType.toUpperCase()}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0B1220',
          border: `1px dashed ${MYSTERY_THEME.cardBorder}`,
          borderRadius: '8px',
          padding: '14px 16px',
          margin: '12px 0',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: '11px',
            color: MYSTERY_THEME.textMuted,
            marginBottom: '4px',
            letterSpacing: '1px',
          }}
        >
          PHYSICAL RECOVERY LOCATION
        </div>
        <div style={{ display: 'flex', fontSize: '14px', color: MYSTERY_THEME.textPrimary, fontWeight: 700 }}>
          📍 {location}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            display: 'flex',
            fontSize: '11px',
            fontWeight: 700,
            color: MYSTERY_THEME.accentGold,
            letterSpacing: '1px',
            marginBottom: '4px',
            textTransform: 'uppercase',
          }}
        >
          LABORATORY OBSERVATION
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: '14px',
            color: MYSTERY_THEME.textSecondary,
            lineHeight: 1.45,
          }}
        >
          {description}
        </div>
      </div>
    </div>
  );
}

/**
 * Document transcript frame with mono font accents and redacted styling.
 */
export function renderDocumentExcerpt(
  docTitle: string,
  dateOrRef: string,
  lines: string[],
  significance: string
): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        backgroundColor: '#0D1527',
        border: `1px solid ${MYSTERY_THEME.cardBorder}`,
        borderRadius: '12px',
        padding: '20px',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', fontSize: '11px', fontWeight: 700, color: MYSTERY_THEME.accentGold, letterSpacing: '1px' }}>
            DOCUMENTARY EVIDENCE EXCERPT
          </div>
          <div style={{ display: 'flex', fontSize: '11px', color: MYSTERY_THEME.textMuted }}>
            REF: {dateOrRef}
          </div>
        </div>

        <div style={{ display: 'flex', fontSize: '16px', fontWeight: 700, color: MYSTERY_THEME.textPrimary, marginBottom: '10px' }}>
          📄 {docTitle}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#060A12',
            border: `1px solid ${MYSTERY_THEME.cardBorder}`,
            borderRadius: '6px',
            padding: '12px 14px',
            gap: '6px',
          }}
        >
          {lines.map((line, idx) => (
            <div key={idx} style={{ display: 'flex', fontSize: '13px', color: '#E2E8F0', fontStyle: 'italic' }}>
              &quot;{line}&quot;
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          marginTop: '12px',
          paddingTop: '10px',
          borderTop: `1px solid ${MYSTERY_THEME.cardBorder}`,
        }}
      >
        <div style={{ display: 'flex', fontSize: '11px', color: MYSTERY_THEME.accentSky, fontWeight: 700, marginBottom: '4px' }}>
          INVESTIGATIVE SIGNIFICANCE
        </div>
        <div style={{ display: 'flex', fontSize: '13px', color: MYSTERY_THEME.textSecondary }}>
          {significance}
        </div>
      </div>
    </div>
  );
}

/**
 * Digital Log / Chat record frame.
 */
export function renderDigitalLogSnippet(
  channel: string,
  timestamp: string,
  messages: Array<{ sender: string; text: string; isAnomaly?: boolean }>,
  anomalyNote: string
): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        backgroundColor: '#0D1527',
        border: `1px solid ${MYSTERY_THEME.cardBorder}`,
        borderRadius: '12px',
        padding: '20px',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', fontSize: '11px', fontWeight: 700, color: MYSTERY_THEME.accentSky, letterSpacing: '1px' }}>
            DIGITAL TIMELINE LOG • {channel}
          </div>
          <div style={{ display: 'flex', fontSize: '11px', color: MYSTERY_THEME.textMuted }}>
            {timestamp}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#060A12',
            border: `1px solid ${MYSTERY_THEME.cardBorder}`,
            borderRadius: '8px',
            padding: '12px',
            gap: '8px',
          }}
        >
          {messages.map((m, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: m.isAnomaly ? 'rgba(239, 68, 68, 0.15)' : '#101B30',
                borderLeft: m.isAnomaly ? `3px solid ${MYSTERY_THEME.accentCrimson}` : `3px solid ${MYSTERY_THEME.cardBorder}`,
                borderRadius: '4px',
                padding: '6px 10px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: m.isAnomaly ? MYSTERY_THEME.accentCrimson : MYSTERY_THEME.accentSky }}>
                  {m.sender}
                </span>
                {m.isAnomaly && (
                  <span style={{ fontSize: '10px', color: MYSTERY_THEME.accentCrimson, fontWeight: 700 }}>
                    [TIMELINE CONTRADICTION]
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', fontSize: '13px', color: MYSTERY_THEME.textPrimary, marginTop: '2px' }}>
                {m.text}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          marginTop: '10px',
          paddingTop: '8px',
          borderTop: `1px solid ${MYSTERY_THEME.cardBorder}`,
        }}
      >
        <div style={{ display: 'flex', fontSize: '11px', color: MYSTERY_THEME.accentGold, fontWeight: 700, marginBottom: '2px' }}>
          FORENSIC VERIFICATION
        </div>
        <div style={{ display: 'flex', fontSize: '13px', color: MYSTERY_THEME.textSecondary }}>
          {anomalyNote}
        </div>
      </div>
    </div>
  );
}

/**
 * Stamp of authenticity / case resolution badge.
 */
export function renderStatusStamp(
  text: string,
  variant: 'SOLVED' | 'CONFIDENTIAL' | 'ANOMALY' | 'SECURED' = 'CONFIDENTIAL'
): React.ReactElement {
  let borderColor = MYSTERY_THEME.accentGold;
  let textColor = MYSTERY_THEME.accentGold;
  let bg = 'rgba(245, 158, 11, 0.1)';

  if (variant === 'SOLVED') {
    borderColor = MYSTERY_THEME.accentEmerald;
    textColor = MYSTERY_THEME.accentEmerald;
    bg = 'rgba(16, 185, 129, 0.12)';
  } else if (variant === 'ANOMALY') {
    borderColor = MYSTERY_THEME.accentCrimson;
    textColor = MYSTERY_THEME.accentCrimson;
    bg = 'rgba(239, 68, 68, 0.12)';
  } else if (variant === 'SECURED') {
    borderColor = MYSTERY_THEME.accentSky;
    textColor = MYSTERY_THEME.accentSky;
    bg = 'rgba(56, 189, 248, 0.12)';
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `2px solid ${borderColor}`,
        borderRadius: '6px',
        backgroundColor: bg,
        padding: '6px 14px',
        fontSize: '12px',
        fontWeight: 700,
        color: textColor,
        letterSpacing: '2px',
        textTransform: 'uppercase',
      }}
    >
      {text}
    </div>
  );
}

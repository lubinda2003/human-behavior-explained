/**
 * Visual Templates for Satori Layout Generation
 * Renders structured SVG DOM elements for 7 editorial psychology templates.
 */

import React from 'react';
import {
  VisualSpec,
  ConceptDiagramData,
  ProcessFlowData,
  ComparisonData,
  TimelineData,
  SimpleStatisticData,
  ThoughtExperimentData,
  ConceptQuoteCardData,
} from '../types.js';

// Clean editorial color palette
const THEME = {
  bg: '#090D16',
  cardBg: '#131D2F',
  cardBorder: '#23334D',
  cardBorderHighlight: '#38BDF8',
  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  accentCyan: '#38BDF8',
  accentAmber: '#FBBF24',
  accentEmerald: '#34D399',
  accentPurple: '#A78BFA',
};

export function renderHeader(
  spec: VisualSpec
): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        marginBottom: '28px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          marginBottom: '10px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: '12px',
            letterSpacing: '1.5px',
            fontWeight: 700,
            color: THEME.accentCyan,
            textTransform: 'uppercase',
          }}
        >
          PSYCHOLOGY & BEHAVIOR
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#1E293B',
            border: `1px solid ${THEME.cardBorder}`,
            borderRadius: '16px',
            padding: '4px 12px',
            fontSize: '11px',
            fontWeight: 700,
            color: THEME.accentAmber,
            letterSpacing: '1px',
            textTransform: 'uppercase',
          }}
        >
          {spec.tag || 'EMPIRICAL INSIGHT'}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          fontSize: '32px',
          fontWeight: 700,
          color: THEME.textPrimary,
          lineHeight: 1.25,
          letterSpacing: '-0.5px',
        }}
      >
        {spec.title}
      </div>

      {spec.subtitle && (
        <div
          style={{
            display: 'flex',
            fontSize: '16px',
            color: THEME.textMuted,
            marginTop: '6px',
            lineHeight: 1.4,
          }}
        >
          {spec.subtitle}
        </div>
      )}
    </div>
  );
}

export function renderFooter(
  sourceCitation?: string
): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginTop: '24px',
        paddingTop: '16px',
        borderTop: `1px solid ${THEME.cardBorder}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          fontSize: '12px',
          color: THEME.textMuted,
        }}
      >
        {sourceCitation ? `Source: ${sourceCitation}` : 'Peer-reviewed evidence'}
      </div>
      <div
        style={{
          display: 'flex',
          fontSize: '12px',
          fontWeight: 600,
          color: THEME.accentCyan,
        }}
      >
        EVIDENCE-BASED HUMAN BEHAVIOR
      </div>
    </div>
  );
}

// 1. Concept Diagram
export function renderConceptDiagram(
  data: ConceptDiagramData
): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        flex: 1,
        justifyContent: 'space-between',
      }}
    >
      {/* Central Concept */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: THEME.cardBg,
          border: `1px solid ${THEME.cardBorderHighlight}`,
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: THEME.accentCyan,
            marginBottom: '6px',
          }}
        >
          {data.centralConcept}
        </div>
        <div
          style={{
            fontSize: '15px',
            color: THEME.textSecondary,
            lineHeight: 1.4,
          }}
        >
          {data.centralDescription}
        </div>
      </div>

      {/* Supporting Pillars */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          marginBottom: '10px',
          color: THEME.accentCyan,
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
        }}
      >
        ↓ CAUSAL ARCHITECTURE &amp; MECHANISMS ↓
      </div>
      <div
        style={{
          display: 'flex',
          gap: '16px',
          width: '100%',
          flex: 1,
        }}
      >
        {data.pillars.slice(0, 3).map((pillar, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              backgroundColor: '#101726',
              border: `1px solid ${THEME.cardBorder}`,
              borderRadius: '10px',
              padding: '16px',
            }}
          >
            {pillar.badge && (
              <div
                style={{
                  display: 'flex',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: THEME.accentAmber,
                  letterSpacing: '0.8px',
                  marginBottom: '8px',
                }}
              >
                {pillar.badge}
              </div>
            )}
            <div
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: THEME.textPrimary,
                marginBottom: '6px',
              }}
            >
              {pillar.title}
            </div>
            <div
              style={{
                fontSize: '13px',
                color: THEME.textMuted,
                lineHeight: 1.4,
              }}
            >
              {pillar.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 2. Process Flow
export function renderProcessFlow(data: ProcessFlowData): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        flex: 1,
        gap: '12px',
      }}
    >
      {data.steps.slice(0, 4).map((step, idx, arr) => (
        <React.Fragment key={idx}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              backgroundColor: THEME.cardBg,
              border: `1px solid ${THEME.cardBorder}`,
              borderRadius: '12px',
              padding: '20px 16px',
              height: '100%',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  display: 'flex',
                  width: '32px',
                  height: '32px',
                  borderRadius: '16px',
                  backgroundColor: '#1E293B',
                  border: `1px solid ${THEME.accentCyan}`,
                  color: THEME.accentCyan,
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '14px',
                  marginBottom: '12px',
                }}
              >
                {step.number || idx + 1}
              </div>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: THEME.textPrimary,
                  marginBottom: '8px',
                }}
              >
                {step.title}
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: THEME.textMuted,
                  lineHeight: 1.4,
                }}
              >
                {step.description}
              </div>
            </div>

            {step.highlight && (
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: THEME.accentAmber,
                  marginTop: '12px',
                  backgroundColor: '#1B2434',
                  padding: '4px 8px',
                  borderRadius: '6px',
                }}
              >
                {step.highlight}
              </div>
            )}
          </div>

          {idx < arr.length - 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: THEME.accentCyan,
                fontSize: '24px',
                fontWeight: 800,
                padding: '0 4px',
              }}
            >
              ➔
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// 3. Comparison
export function renderComparison(data: ComparisonData): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        width: '100%',
        flex: 1,
      }}
    >
      {/* Left (Common Intuition) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          backgroundColor: '#101726',
          border: `1px solid ${THEME.cardBorder}`,
          borderRadius: '12px',
          padding: '24px',
        }}
      >
        <div
          style={{
            fontSize: '12px',
            fontWeight: 700,
            color: THEME.textMuted,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            marginBottom: '4px',
          }}
        >
          {data.leftSubtitle || 'COMMON ASSUMPTION'}
        </div>
        <div
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: THEME.textPrimary,
            marginBottom: '16px',
          }}
        >
          {data.leftTitle}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {data.leftPoints.map((pt, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                fontSize: '14px',
                color: THEME.textSecondary,
                lineHeight: 1.4,
              }}
            >
              <span style={{ color: '#F87171', marginRight: '8px' }}>✕</span>
              {pt}
            </div>
          ))}
        </div>
      </div>

      {/* Center Contrast Divider / Bridge */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '38px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '18px',
            backgroundColor: '#1E293B',
            border: `1px solid ${THEME.accentAmber}`,
            color: THEME.accentAmber,
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '1px',
          }}
        >
          VS
        </div>
      </div>

      {/* Right (Empirical Reality) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          backgroundColor: THEME.cardBg,
          border: `1px solid ${THEME.accentCyan}`,
          borderRadius: '12px',
          padding: '24px',
        }}
      >
        <div
          style={{
            fontSize: '12px',
            fontWeight: 700,
            color: THEME.accentCyan,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            marginBottom: '4px',
          }}
        >
          {data.rightSubtitle || 'EMPIRICAL REALITY'}
        </div>
        <div
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: THEME.textPrimary,
            marginBottom: '16px',
          }}
        >
          {data.rightTitle}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {data.rightPoints.map((pt, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                fontSize: '14px',
                color: THEME.textSecondary,
                lineHeight: 1.4,
              }}
            >
              <span style={{ color: THEME.accentCyan, marginRight: '8px' }}>
                ✓
              </span>
              {pt}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 4. Timeline
export function renderTimeline(data: TimelineData): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        flex: 1,
        justifyContent: 'space-around',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
        {data.events.slice(0, 4).map((item, idx, arr) => (
          <React.Fragment key={idx}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                backgroundColor: THEME.cardBg,
                border: `1px solid ${THEME.cardBorder}`,
                borderRadius: '12px',
                padding: '20px 16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: THEME.accentAmber,
                  marginBottom: '8px',
                }}
              >
                {item.yearOrPhase}
              </div>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: THEME.textPrimary,
                  marginBottom: '8px',
                }}
              >
                {item.title}
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: THEME.textMuted,
                  lineHeight: 1.4,
                }}
              >
                {item.description}
              </div>
            </div>

            {idx < arr.length - 1 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: THEME.accentAmber,
                  fontSize: '20px',
                  fontWeight: 800,
                  padding: '0 2px',
                }}
              >
                ➔
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// 5. Simple Statistic
export function renderSimpleStatistic(
  data: SimpleStatisticData
): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        gap: '32px',
        width: '100%',
        flex: 1,
        alignItems: 'center',
      }}
    >
      {/* Metric Focus Box */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '320px',
          backgroundColor: THEME.cardBg,
          border: `1px solid ${THEME.cardBorderHighlight}`,
          borderRadius: '16px',
          padding: '32px 24px',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: '76px',
            fontWeight: 800,
            color: THEME.accentCyan,
            lineHeight: 1,
            marginBottom: '10px',
            letterSpacing: '-2px',
          }}
        >
          {data.highlightMetric}
        </div>
        <div
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: THEME.textPrimary,
            lineHeight: 1.3,
          }}
        >
          {data.metricLabel}
        </div>
      </div>

      {/* Details & Context Box */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          backgroundColor: '#101726',
          border: `1px solid ${THEME.cardBorder}`,
          borderRadius: '16px',
          padding: '28px',
        }}
      >
        <div
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: THEME.accentAmber,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '8px',
          }}
        >
          EMPIRICAL CONTEXT
        </div>
        <div
          style={{
            fontSize: '17px',
            color: THEME.textPrimary,
            lineHeight: 1.4,
            marginBottom: '16px',
          }}
        >
          {data.context}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {data.detailPoints.map((pt, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                fontSize: '14px',
                color: THEME.textMuted,
                lineHeight: 1.4,
              }}
            >
              • {pt}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 6. Thought Experiment
export function renderThoughtExperiment(
  data: ThoughtExperimentData
): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        flex: 1,
        gap: '12px',
      }}
    >
      {/* Scenario Dilemma */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: THEME.cardBg,
          border: `1px solid ${THEME.cardBorder}`,
          borderRadius: '12px',
          padding: '16px 20px',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: THEME.accentPurple,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '4px',
          }}
        >
          SCENARIO / DILEMMA
        </div>
        <div
          style={{
            fontSize: '15px',
            color: THEME.textPrimary,
            lineHeight: 1.4,
          }}
        >
          {data.dilemma}
        </div>
      </div>

      {/* Decision Fork Indicator */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: '11px',
            fontWeight: 700,
            color: THEME.accentCyan,
            letterSpacing: '1px',
          }}
        >
          ▼ BRANCH A (COGNITIVE / IMPERSONAL)
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: '11px',
            fontWeight: 700,
            color: THEME.accentAmber,
            letterSpacing: '1px',
          }}
        >
          BRANCH B (EMOTIONAL / DIRECT) ▼
        </div>
      </div>

      {/* Two Branches */}
      <div style={{ display: 'flex', gap: '16px', width: '100%' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            backgroundColor: '#101726',
            border: `1px solid ${THEME.cardBorder}`,
            borderRadius: '10px',
            padding: '14px 16px',
          }}
        >
          <div
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: THEME.accentCyan,
              marginBottom: '4px',
            }}
          >
            {data.branchA.label}
          </div>
          <div
            style={{
              fontSize: '13px',
              color: THEME.textMuted,
              lineHeight: 1.35,
            }}
          >
            {data.branchA.explanation}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            backgroundColor: '#101726',
            border: `1px solid ${THEME.cardBorder}`,
            borderRadius: '10px',
            padding: '14px 16px',
          }}
        >
          <div
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: THEME.accentAmber,
              marginBottom: '4px',
            }}
          >
            {data.branchB.label}
          </div>
          <div
            style={{
              fontSize: '13px',
              color: THEME.textMuted,
              lineHeight: 1.35,
            }}
          >
            {data.branchB.explanation}
          </div>
        </div>
      </div>

      {/* Bottom Revelation */}
      <div
        style={{
          display: 'flex',
          backgroundColor: '#17253D',
          border: `1px solid ${THEME.accentCyan}`,
          borderRadius: '10px',
          padding: '12px 18px',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: THEME.accentCyan,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          PSYCHOLOGICAL INSIGHT
        </div>
        <div
          style={{
            fontSize: '13px',
            color: THEME.textPrimary,
            lineHeight: 1.35,
          }}
        >
          {data.psychologicalInsight}
        </div>
      </div>
    </div>
  );
}

// 7. Concept Quote Card
export function renderConceptQuoteCard(
  data: ConceptQuoteCardData
): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        flex: 1,
        backgroundColor: THEME.cardBg,
        border: `1px solid ${THEME.cardBorderHighlight}`,
        borderRadius: '16px',
        padding: '36px 40px',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            fontSize: '48px',
            color: THEME.accentCyan,
            lineHeight: 1,
            marginBottom: '8px',
          }}
        >
          “
        </div>
        <div
          style={{
            fontSize: '22px',
            fontWeight: 500,
            color: THEME.textPrimary,
            lineHeight: 1.45,
            fontStyle: 'italic',
            marginBottom: '16px',
          }}
        >
          {data.quote}
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: '15px',
            fontWeight: 700,
            color: THEME.accentAmber,
          }}
        >
          {`— ${data.author}${data.sourceContext ? `, ${data.sourceContext}` : ''}`}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          backgroundColor: '#101726',
          border: `1px solid ${THEME.cardBorder}`,
          borderRadius: '10px',
          padding: '14px 20px',
          marginTop: '20px',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: THEME.accentCyan,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            whiteSpace: 'nowrap',
          }}
        >
          CORE LESSON
        </div>
        <div
          style={{
            fontSize: '14px',
            color: THEME.textSecondary,
          }}
        >
          {data.keyTakeaway}
        </div>
      </div>
    </div>
  );
}

/**
 * Main dispatcher to render the full layout for a given VisualSpec.
 */
export function renderVisualRoot(spec: VisualSpec): React.ReactElement {
  let content: React.ReactElement;

  switch (spec.template) {
    case 'concept_diagram':
      content = renderConceptDiagram(
        spec.payload.data as ConceptDiagramData
      );
      break;
    case 'process_flow':
      content = renderProcessFlow(spec.payload.data as ProcessFlowData);
      break;
    case 'comparison':
      content = renderComparison(spec.payload.data as ComparisonData);
      break;
    case 'timeline':
      content = renderTimeline(spec.payload.data as TimelineData);
      break;
    case 'simple_statistic':
      content = renderSimpleStatistic(
        spec.payload.data as SimpleStatisticData
      );
      break;
    case 'thought_experiment':
      content = renderThoughtExperiment(
        spec.payload.data as ThoughtExperimentData
      );
      break;
    case 'concept_quote_card':
      content = renderConceptQuoteCard(
        spec.payload.data as ConceptQuoteCardData
      );
      break;
    default:
      content = renderConceptDiagram(
        spec.payload.data as ConceptDiagramData
      );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '1200px',
        height: '675px',
        backgroundColor: THEME.bg,
        padding: '48px 56px',
        boxSizing: 'border-box',
        justifyContent: 'space-between',
      }}
    >
      {renderHeader(spec)}
      <div
        style={{
          display: 'flex',
          flex: 1,
          width: '100%',
        }}
      >
        {content}
      </div>
      {renderFooter(spec.sourceCitation)}
    </div>
  );
}

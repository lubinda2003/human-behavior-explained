/**
 * Mystery Visual Production & Design System Test Suite
 * Tests rendering of all visual templates, diagram generators,
 * dimensions (1200x675), Sharp verification, and non-blank guarantees.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { MysteryVisualGenerator } from '../src/pipeline/mystery/visuals/index.js';
import { MysteryQualityChecker } from '../src/pipeline/mystery/quality.js';
import { MysteryVisualSpec } from '../src/pipeline/mystery/types.js';

const TEST_OUT_DIR = path.resolve(process.cwd(), 'data', 'test-visuals-output');

describe('Mystery Visual System & Diagrams', () => {
  const generator = new MysteryVisualGenerator(TEST_OUT_DIR);

  it('renders a Case Cover Card with exact 1200x675 dimensions and non-blank stats', async () => {
    const spec: MysteryVisualSpec = {
      title: 'The Clockwork Alchemist',
      caseId: 'CASE-TEST-001',
      tag: 'ACTIVE DOSSIER',
      template: 'case_cover_card',
      payload: {
        template: 'case_cover_card',
        data: {
          caseNumber: 'CASE-TEST-001',
          title: 'The Clockwork Alchemist',
          premiseSummary: 'A master horologist vanishes from inside a locked pendulum vault.',
          location: 'Prague Old Town Square',
          difficulty: 'intermediate',
          suspectCount: 3,
          evidenceCount: 4,
          mysteryQuestion: 'How did the clockwork mechanism activate without external power?',
        },
      },
    };

    const result = await generator.renderGraphic(spec, 'test-cover');
    assert.strictEqual(result.width, 1200);
    assert.strictEqual(result.height, 675);
    assert.ok(fs.existsSync(result.filePath));
    assert.ok(result.buffer.length > 1000);

    const qc = await MysteryQualityChecker.validateVisualAsset(result.filePath);
    assert.strictEqual(qc.isValid, true);
    assert.strictEqual(qc.isNotBlank, true);
  });

  it('renders a Forensic Specimen Evidence Card', async () => {
    const spec: MysteryVisualSpec = {
      title: 'Shattered Chronometer Gear',
      caseId: 'CASE-TEST-001',
      tag: 'FORENSIC EVIDENCE',
      template: 'evidence_card',
      payload: {
        template: 'evidence_card',
        data: {
          caseNumber: 'CASE-TEST-001',
          evidenceId: 'EV-01',
          title: 'Shattered Chronometer Gear',
          type: 'physical',
          locationFound: 'Inside the primary gear train',
          forensicObservation: 'Teeth on the escapement wheel are bent backwards against normal rotation.',
          significanceNote: 'Proves the clock was forcefully reversed before the mechanism jammed.',
        },
      },
    };

    const result = await generator.renderGraphic(spec, 'test-evidence-physical');
    const qc = await MysteryQualityChecker.validateVisualAsset(result.filePath);
    assert.strictEqual(qc.isValid, true);
    assert.strictEqual(qc.width, 1200);
  });

  it('renders a Document Transcript Evidence Card with excerpt styling', async () => {
    const spec: MysteryVisualSpec = {
      title: 'Guildmaster Logbook Entry',
      caseId: 'CASE-TEST-001',
      tag: 'DOCUMENTARY EVIDENCE',
      template: 'evidence_card',
      payload: {
        template: 'evidence_card',
        data: {
          caseNumber: 'CASE-TEST-001',
          evidenceId: 'EV-DOC-02',
          title: 'Guildmaster Logbook Entry',
          type: 'document',
          locationFound: 'Hidden drawer behind astronomical dial',
          forensicObservation: 'Handwritten ledger in iron gall ink.',
          significanceNote: 'Explicitly records the secret gear ratio modification.',
          dateOrRef: 'October 14, 1888',
          documentLines: [
            'The celestial gear must be aligned at midnight.',
            'Do not let the apprentice touch the counterweight lever.',
            'The escapement will trigger once the weights drop past the third notch.',
          ],
        },
      },
    };

    const result = await generator.renderGraphic(spec, 'test-evidence-doc');
    const qc = await MysteryQualityChecker.validateVisualAsset(result.filePath);
    assert.strictEqual(qc.isValid, true);
    assert.strictEqual(qc.isNotBlank, true);
  });

  it('renders a Digital Surveillance / Chat Log Evidence Card', async () => {
    const spec: MysteryVisualSpec = {
      title: 'Encrypted Vault Intercom Log',
      caseId: 'CASE-TEST-001',
      tag: 'DIGITAL SURVEILLANCE',
      template: 'evidence_card',
      payload: {
        template: 'evidence_card',
        data: {
          caseNumber: 'CASE-TEST-001',
          evidenceId: 'EV-DIG-03',
          title: 'Encrypted Vault Intercom Log',
          type: 'digital',
          locationFound: 'Central security relay server',
          forensicObservation: 'Acoustic sensor buffer capture.',
          significanceNote: 'Contradicts the suspect statement regarding time of entry.',
          timestamp: '23:42:15 CET',
          chatMessages: [
            { sender: 'Operator A', text: 'Perimeter lock engaged. Vault seal confirmed.' },
            { sender: 'Unknown Voice', text: 'The bypass is active on sub-channel 4.', isAnomaly: true },
            { sender: 'Operator A', text: 'Standby, acoustic sensor spike detected in vault.' },
          ],
        },
      },
    };

    const result = await generator.renderGraphic(spec, 'test-evidence-digital');
    const qc = await MysteryQualityChecker.validateVisualAsset(result.filePath);
    assert.strictEqual(qc.isValid, true);
    assert.strictEqual(qc.isNotBlank, true);
  });

  it('renders a Clue Breakthrough Card', async () => {
    const spec: MysteryVisualSpec = {
      title: 'Counterweight Inversion',
      caseId: 'CASE-TEST-001',
      tag: 'CLUE BREAKTHROUGH',
      template: 'clue_card',
      payload: {
        template: 'clue_card',
        data: {
          caseNumber: 'CASE-TEST-001',
          clueTitle: 'Counterweight Inversion Mechanism',
          evidenceRef: 'ev-01',
          discoveryText: 'The lead weights were filled with mercury, shifting center of gravity automatically.',
          deductionHint: 'The clock did not need human presence to release the catch at midnight.',
        },
      },
    };

    const result = await generator.renderGraphic(spec, 'test-clue');
    const qc = await MysteryQualityChecker.validateVisualAsset(result.filePath);
    assert.strictEqual(qc.isValid, true);
  });

  it('renders a Suspect Dossier Card', async () => {
    const spec: MysteryVisualSpec = {
      title: 'Karel Novak',
      caseId: 'CASE-TEST-001',
      tag: 'PRIMARY SUSPECT',
      template: 'suspect_card',
      payload: {
        template: 'suspect_card',
        data: {
          caseNumber: 'CASE-TEST-001',
          suspectName: 'Karel Novak',
          role: 'Apprentice Horologist',
          motive: 'Stands to gain the guildmaster title and patented escapement bluepints.',
          alibi: 'Claims he was asleep in the dormitory above the workshop.',
          suspiciousDetail: 'Brass metal shavings and mercury residue found on his leather apron.',
          isPrimarySuspect: true,
        },
      },
    };

    const result = await generator.renderGraphic(spec, 'test-suspect');
    const qc = await MysteryQualityChecker.validateVisualAsset(result.filePath);
    assert.strictEqual(qc.isValid, true);
  });

  it('renders a Timeline Diagram Card', async () => {
    const spec: MysteryVisualSpec = {
      title: 'Incident Chronology',
      caseId: 'CASE-TEST-001',
      tag: 'TIMELINE',
      template: 'timeline_card',
      payload: {
        template: 'timeline_card',
        data: {
          caseNumber: 'CASE-TEST-001',
          caseTitle: 'The Clockwork Alchemist',
          anomalyWindow: '23:30 - 00:15',
          events: [
            { timestamp: '21:00', title: 'Vault Inspection', description: 'Guildmaster logs initial chime calibration.' },
            { timestamp: '23:15', title: 'Apprentice Departure', description: 'Karel seen leaving the workshop.' },
            { timestamp: '23:45', title: 'Acoustic Anomaly', description: 'Counterweight shifts without chime strike.', isKeyAnomaly: true },
            { timestamp: '00:00', title: 'Vault Lock Engagement', description: 'Mechanism seals from inside automatically.' },
          ],
        },
      },
    };

    const result = await generator.renderGraphic(spec, 'test-timeline');
    const qc = await MysteryQualityChecker.validateVisualAsset(result.filePath);
    assert.strictEqual(qc.isValid, true);
  });

  it('renders a Location Spatial Zone Diagram', async () => {
    const spec: MysteryVisualSpec = {
      title: 'Workshop Spatial Mapping',
      caseId: 'CASE-TEST-001',
      tag: 'SPATIAL MAP',
      template: 'location_diagram_card',
      payload: {
        template: 'location_diagram_card',
        data: {
          caseNumber: 'CASE-TEST-001',
          locationName: 'Prague Clockwork Workshop',
          zones: [
            { name: 'Inner Pendulum Vault', evidenceItems: ['EV-1 Escapement Gear'], isAccessRestricted: true },
            { name: 'Apprentice Bench', evidenceItems: ['Mercury Flask'], suspectPresent: 'Karel Novak' },
            { name: 'Guild Office', evidenceItems: ['Ledger Books'], suspectPresent: 'Master Vane' },
          ],
          keyObservation: 'Direct access shaft between apprentice bench and vault ceiling.',
        },
      },
    };

    const result = await generator.renderGraphic(spec, 'test-diagram-location');
    const qc = await MysteryQualityChecker.validateVisualAsset(result.filePath);
    assert.strictEqual(qc.isValid, true);
  });

  it('renders a Suspect Relationship Matrix Diagram', async () => {
    const spec: MysteryVisualSpec = {
      title: 'Suspect Network',
      caseId: 'CASE-TEST-001',
      tag: 'SUSPECT MATRIX',
      template: 'relationship_diagram_card',
      payload: {
        template: 'relationship_diagram_card',
        data: {
          caseNumber: 'CASE-TEST-001',
          caseTitle: 'The Clockwork Alchemist',
          suspects: [
            { name: 'Karel Novak', role: 'Apprentice', hasMotive: true },
            { name: 'Master Vane', role: 'Guildmaster', hasMotive: false },
            { name: 'Marek Horn', role: 'Patron', hasMotive: true },
          ],
          relationships: [
            { source: 'Karel Novak', target: 'Master Vane', relationType: 'subordinate', note: 'Denied master status.' },
            { source: 'Marek Horn', target: 'Karel Novak', relationType: 'secret_contact', note: 'Offered 500 florins for the patent.' },
          ],
        },
      },
    };

    const result = await generator.renderGraphic(spec, 'test-diagram-relations');
    const qc = await MysteryQualityChecker.validateVisualAsset(result.filePath);
    assert.strictEqual(qc.isValid, true);
  });

  it('renders a Deduction Graph Card and Final Reveal Card', async () => {
    const deductionSpec: MysteryVisualSpec = {
      title: 'Synthesis',
      caseId: 'CASE-TEST-001',
      tag: 'DEDUCTION',
      template: 'evidence_connection_card',
      payload: {
        template: 'evidence_connection_card',
        data: {
          caseNumber: 'CASE-TEST-001',
          caseTitle: 'The Clockwork Alchemist',
          clues: [
            { id: 'ev-1', label: 'Mercury filled weights shifted gravity at midnight' },
            { id: 'ev-2', label: 'Shaft opened from apprentice workshop' },
          ],
          deductionResult: 'The apprentice engineered a delayed release mechanism.',
          culpritOrOutcome: 'Karel Novak',
        },
      },
    };

    const revealSpec: MysteryVisualSpec = {
      title: 'The Clockwork Alchemist',
      caseId: 'CASE-TEST-001',
      tag: 'CASE SOLVED',
      template: 'final_reveal_card',
      payload: {
        template: 'final_reveal_card',
        data: {
          caseNumber: 'CASE-TEST-001',
          caseTitle: 'The Clockwork Alchemist',
          culpritOrCause: 'Karel Novak (Apprentice)',
          coreBreakthrough: 'The mercury counterweight operated on a thermal delay, triggering the lock after Karel left.',
          keyEvidenceCited: ['ev-1', 'ev-2', 'ev-3'],
          caseStatus: 'CASE SOLVED',
        },
      },
    };

    const res1 = await generator.renderGraphic(deductionSpec, 'test-deduction');
    const res2 = await generator.renderGraphic(revealSpec, 'test-reveal');

    const qc1 = await MysteryQualityChecker.validateVisualAsset(res1.filePath);
    const qc2 = await MysteryQualityChecker.validateVisualAsset(res2.filePath);

    assert.strictEqual(qc1.isValid, true);
    assert.strictEqual(qc2.isValid, true);
  });

  it('computes deterministic spec fingerprints', () => {
    const specA: MysteryVisualSpec = {
      title: 'Same Title',
      caseId: 'CASE-1',
      tag: 'TAG',
      template: 'case_cover_card',
      payload: {
        template: 'case_cover_card',
        data: {
          caseNumber: 'CASE-1',
          title: 'Title',
          premiseSummary: 'Premise',
          location: 'Location',
          difficulty: 'beginner',
          suspectCount: 2,
          evidenceCount: 2,
          mysteryQuestion: 'Question',
        },
      },
    };

    const specB = { ...specA };
    const hashA = MysteryVisualGenerator.computeSpecFingerprint(specA);
    const hashB = MysteryVisualGenerator.computeSpecFingerprint(specB);
    assert.strictEqual(hashA, hashB);
  });
});

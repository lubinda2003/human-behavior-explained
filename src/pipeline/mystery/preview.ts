/**
 * Mystery Investigation Output Preview Generator
 * Generates and validates a complete 5-step investigation package locally:
 * Step 1: Case Dossier & Cover Visual
 * Step 2: Key Evidence Log & Specimen Visual
 * Step 3: Interactive Audience Deduction Poll
 * Step 4: Breakthrough Clue & Clue Card Visual
 * Step 5: Final Resolution & Case Solved Card Visual
 * Plus diagnostic diagrams (Timeline, Location, Suspect Matrix, Deduction Chain).
 */

import fs from 'node:fs';
import path from 'node:path';
import { CURATED_MYSTERY_CASES } from './seeds.js';
import { InvestigationModel } from './investigationModel.js';
import { MysteryContentFormatter } from './contentFormatter.js';
import { MysteryVisualGenerator } from './visuals/index.js';
import { MysteryQualityChecker } from './quality.js';
import { MysteryVisualSpec } from './types.js';

export async function generateInvestigationPreview(
  caseIndex = 0,
  outputDir = path.resolve(process.cwd(), 'data', 'sample-investigation-package')
) {
  console.log('🔍 Generating Sample Mystery Investigation Package...');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const mysteryCase = CURATED_MYSTERY_CASES[caseIndex] || CURATED_MYSTERY_CASES[0];
  console.log(`📂 Case: ${mysteryCase.title} (${mysteryCase.caseId})`);

  // 1. Validate Case Integrity
  const caseQC = MysteryQualityChecker.validateCase(mysteryCase);
  if (!caseQC.isValid) {
    console.error('❌ Case failed QC validation:', caseQC.errors);
    throw new Error('Case validation failed');
  }
  console.log('✅ Case Integrity QC Passed');

  // 2. Build 5-step sequence
  const sequence = InvestigationModel.buildFiveStepSequence(mysteryCase);
  const visualGen = new MysteryVisualGenerator(outputDir);

  const manifest: any = {
    caseId: mysteryCase.caseId,
    title: mysteryCase.title,
    difficulty: mysteryCase.difficulty,
    generatedAt: new Date().toISOString(),
    steps: [],
    diagrams: [],
  };

  // 3. Process each step
  for (const step of sequence.steps) {
    console.log(`\n--- Step ${step.stepNumber}: ${step.format} ---`);

    const draftQC = MysteryQualityChecker.validateDraft(step.draft);
    if (!draftQC.isValid) {
      console.warn(`⚠️ Draft QC warnings on step ${step.stepNumber}:`, draftQC.errors);
    }

    const formattedHtml = MysteryContentFormatter.formatPost(step.draft);
    const htmlQC = MysteryQualityChecker.validateTelegramHtml(formattedHtml);
    if (!htmlQC.isValid) {
      console.error(`❌ HTML QC failed on step ${step.stepNumber}:`, htmlQC.errors);
    } else {
      console.log(`✅ Telegram HTML Validated (${formattedHtml.length} chars)`);
    }

    let renderedVisualPath: string | undefined;
    let visualQCResult: any = undefined;

    if (step.visualSpec) {
      const renderResult = await visualGen.renderGraphic(
        step.visualSpec,
        `step-${step.stepNumber}`
      );
      renderedVisualPath = renderResult.filePath;

      // Validate visual asset
      visualQCResult = await MysteryQualityChecker.validateVisualAsset(
        renderedVisualPath
      );
      if (visualQCResult.isValid) {
        console.log(`✅ Visual Asset Verified (${visualQCResult.width}x${visualQCResult.height}, Non-blank: ${visualQCResult.isNotBlank})`);
      } else {
        console.error(`❌ Visual QC failed:`, visualQCResult.errors);
      }
    }

    // Save formatted HTML to file
    const htmlFilePath = path.join(
      outputDir,
      `step-${step.stepNumber}-${step.format.toLowerCase()}.html`
    );
    fs.writeFileSync(htmlFilePath, formattedHtml, 'utf-8');

    // Save poll JSON if applicable
    if (step.draft.poll) {
      const pollFilePath = path.join(outputDir, `step-${step.stepNumber}-poll.json`);
      fs.writeFileSync(
        pollFilePath,
        JSON.stringify(step.draft.poll, null, 2),
        'utf-8'
      );
    }

    manifest.steps.push({
      stepNumber: step.stepNumber,
      format: step.format,
      headline: step.draft.headline,
      htmlFile: path.basename(htmlFilePath),
      visualFile: renderedVisualPath ? path.basename(renderedVisualPath) : null,
      poll: step.draft.poll || null,
      qc: {
        draftValid: draftQC.isValid,
        htmlValid: htmlQC.isValid,
        visualValid: visualQCResult ? visualQCResult.isValid : null,
      },
    });
  }

  // 4. Generate Diagnostic Diagrams
  console.log('\n--- Generating Diagnostic Investigation Diagrams ---');

  // A. Location Diagram
  const locationSpec: MysteryVisualSpec = {
    title: mysteryCase.setting.location,
    caseId: mysteryCase.caseId,
    tag: 'SPATIAL MAP',
    template: 'location_diagram_card',
    payload: {
      template: 'location_diagram_card',
      data: {
        caseNumber: mysteryCase.caseId,
        locationName: mysteryCase.setting.location,
        zones: [
          {
            name: 'Victorian Conservatory',
            evidenceItems: ['EV-1 Shattered Coil', 'EV-2 Prunus Seed Residue'],
            suspectPresent: 'Lord Sterling (Found Unconscious)',
            isAccessRestricted: true,
          },
          {
            name: 'Botanical Herbarium',
            evidenceItems: ['Herbarium Catalog Logs'],
            suspectPresent: 'Dr. Helena Vance',
            isAccessRestricted: false,
          },
          {
            name: 'Billiards Wing',
            evidenceItems: ['Cigar Ash'],
            suspectPresent: 'Arthur Sterling & Thomas Finch',
            isAccessRestricted: false,
          },
        ],
        keyObservation:
          'Thermostatic heating vent connects directly from the botanical furnace to the conservatory floor duct.',
      },
    },
  };
  const locationRender = await visualGen.renderGraphic(locationSpec, 'diagram-location');
  manifest.diagrams.push({ name: 'Location Map', file: path.basename(locationRender.filePath) });

  // B. Suspect Relationship Matrix
  const relationshipSpec: MysteryVisualSpec = {
    title: mysteryCase.title,
    caseId: mysteryCase.caseId,
    tag: 'SUSPECT MATRIX',
    template: 'relationship_diagram_card',
    payload: {
      template: 'relationship_diagram_card',
      data: {
        caseNumber: mysteryCase.caseId,
        caseTitle: mysteryCase.title,
        suspects: mysteryCase.characters.map((c) => ({
          name: c.name,
          role: c.role,
          hasMotive: c.isSuspect,
        })),
        relationships: [
          {
            source: 'Dr. Helena Vance',
            target: 'Lord Sterling',
            relationType: 'conflict',
            note: 'Dispute over botanical hybridization patent funding cut.',
          },
          {
            source: 'Arthur Sterling',
            target: 'Lord Sterling',
            relationType: 'subordinate',
            note: 'Urgent debt default pressure prior to estate settlement.',
          },
          {
            source: 'Thomas Finch',
            target: 'Arthur Sterling',
            relationType: 'alibi_partner',
            note: 'Confirmed billiards alibi between 9:45 PM and 10:30 PM.',
          },
        ],
      },
    },
  };
  const relRender = await visualGen.renderGraphic(relationshipSpec, 'diagram-relationships');
  manifest.diagrams.push({ name: 'Relationship Matrix', file: path.basename(relRender.filePath) });

  // C. Evidence Connection / Deduction Graph
  const deductionSpec: MysteryVisualSpec = {
    title: mysteryCase.title,
    caseId: mysteryCase.caseId,
    tag: 'DEDUCTION GRAPH',
    template: 'evidence_connection_card',
    payload: {
      template: 'evidence_connection_card',
      data: {
        caseNumber: mysteryCase.caseId,
        caseTitle: mysteryCase.title,
        clues: [
          { id: 'ev-1', label: 'Overheated heating coil timer set for 10:00 PM' },
          { id: 'ev-2', label: 'Crushed Prunus amygdalus botanical extract on radiator fins' },
          { id: 'ev-3', label: 'Internal thermostat valve jammed at maximum heat' },
        ],
        deductionResult:
          'Cyanide gas was sublimated by the automated heating pipe cycle while the room was bolted from the inside.',
        culpritOrOutcome: mysteryCase.correctResolution.culpritOrCause,
      },
    },
  };
  const deductionRender = await visualGen.renderGraphic(deductionSpec, 'diagram-deduction');
  manifest.diagrams.push({ name: 'Deduction Graph', file: path.basename(deductionRender.filePath) });

  // Write manifest.json
  const manifestPath = path.join(outputDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

  console.log(`\n🎉 Investigation Package Preview Complete!`);
  console.log(`📁 Artifacts written to: ${outputDir}`);
  console.log(`📄 Manifest: ${manifestPath}`);

  return manifest;
}

// Allow CLI direct execution
if (process.argv[1] && process.argv[1].endsWith('preview.ts')) {
  generateInvestigationPreview().catch((err) => {
    console.error('Fatal error generating preview:', err);
    process.exit(1);
  });
}

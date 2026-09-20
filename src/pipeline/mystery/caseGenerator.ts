/**
 * Mystery Case Generator
 * Generates original mystery/investigation concepts with complete characters,
 * evidence networks, plausible hypotheses, and logical resolutions.
 * Supports Gemini API with fallback to deterministic procedural curation.
 */

import { GoogleGenAI, Type, Schema } from '@google/genai';
import { MysteryCase, CaseType, CaseDifficulty } from './types.js';
import { CURATED_MYSTERY_CASES } from './seeds.js';

export interface GenerateCaseOptions {
  caseType?: CaseType;
  difficulty?: CaseDifficulty;
  theme?: string;
  seedIndex?: number;
}

const CASE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    difficulty: {
      type: Type.STRING,
      enum: ['beginner', 'intermediate', 'expert'],
    },
    tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    premise: { type: Type.STRING },
    setting: {
      type: Type.OBJECT,
      properties: {
        location: { type: Type.STRING },
        timePeriod: { type: Type.STRING },
        atmosphere: { type: Type.STRING },
      },
      required: ['location'],
    },
    characters: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          role: { type: Type.STRING },
          description: { type: Type.STRING },
          alibiOrMotive: { type: Type.STRING },
          isSuspect: { type: Type.BOOLEAN },
          notes: { type: Type.STRING },
        },
        required: ['id', 'name', 'role', 'description', 'alibiOrMotive', 'isSuspect'],
      },
    },
    mysteryQuestion: { type: Type.STRING },
    evidence: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          type: {
            type: Type.STRING,
            enum: ['physical', 'forensic', 'document', 'digital', 'testimony', 'acoustic'],
          },
          description: { type: Type.STRING },
          locationFound: { type: Type.STRING },
          significance: { type: Type.STRING },
          analysis: { type: Type.STRING },
        },
        required: ['id', 'title', 'type', 'description', 'locationFound', 'significance'],
      },
    },
    timeline: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          timestamp: { type: Type.STRING },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          evidenceId: { type: Type.STRING },
        },
        required: ['timestamp', 'title', 'description'],
      },
    },
    possibleExplanations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          hypothesis: { type: Type.STRING },
          plausibility: {
            type: Type.STRING,
            enum: ['low', 'medium', 'high'],
          },
          supportingEvidenceIds: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          counterEvidenceIds: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ['id', 'hypothesis', 'plausibility', 'supportingEvidenceIds', 'counterEvidenceIds'],
      },
    },
    correctResolution: {
      type: Type.OBJECT,
      properties: {
        answer: { type: Type.STRING },
        culpritOrCause: { type: Type.STRING },
        keyClueIds: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        howDeductionWorks: { type: Type.STRING },
        aftermathOrConclusion: { type: Type.STRING },
      },
      required: ['answer', 'culpritOrCause', 'keyClueIds', 'howDeductionWorks'],
    },
  },
  required: [
    'title',
    'difficulty',
    'tags',
    'premise',
    'setting',
    'characters',
    'mysteryQuestion',
    'evidence',
    'possibleExplanations',
    'correctResolution',
  ],
};

export class MysteryCaseGenerator {
  private ai: GoogleGenAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  /**
   * Generate a complete, internally consistent MysteryCase.
   * Prioritizes fictional original investigations for total logical control.
   */
  public async generateCase(options: GenerateCaseOptions = {}): Promise<MysteryCase> {
    const caseType = options.caseType || 'fictional';
    const difficulty = options.difficulty || 'intermediate';

    // If Gemini API is available and not in test-fallback mode, attempt LLM generation
    if (this.ai && !process.env.USE_MOCK_GEMINI) {
      try {
        return await this.generateViaGemini(caseType, difficulty, options.theme);
      } catch (err) {
        console.warn('Gemini mystery case generation failed, falling back to curated seed:', err);
      }
    }

    return this.getCuratedOrProceduralCase(options);
  }

  private async generateViaGemini(
    caseType: CaseType,
    difficulty: CaseDifficulty,
    theme?: string
  ): Promise<MysteryCase> {
    if (!this.ai) {
      throw new Error('Gemini client not initialized');
    }

    const prompt = `You are a master mystery author and forensic puzzle designer.
Create an original, compelling ${difficulty} ${caseType} mystery investigation.

Requirements:
1. Genre/Theme: ${theme || 'locked room, forensic anomaly, historical cipher, or scientific puzzle'}
2. The mystery must have a 100% airtight logical resolution that can be deduced from the evidence.
3. Include 2-4 distinct characters with motives and alibis.
4. Include 3-5 concrete evidence items (physical, forensic, document, digital, acoustic).
5. Include 2-3 plausible hypotheses with supporting and counter evidence IDs.
6. The correct resolution must reference specific clue IDs and explain the logical deduction clearly.
7. Tone: Gripping, sophisticated, immersive, and grounded in forensic reality without supernatural elements.`;

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: CASE_SCHEMA,
        temperature: 0.7,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const caseId = `CASE-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    return {
      caseId,
      title: parsed.title || 'The Unsolved Enigma',
      caseType,
      difficulty: parsed.difficulty || difficulty,
      tags: parsed.tags || ['mystery', 'investigation'],
      premise: parsed.premise || '',
      setting: parsed.setting || { location: 'Unknown' },
      characters: parsed.characters || [],
      mysteryQuestion: parsed.mysteryQuestion || 'What truly occurred?',
      evidence: parsed.evidence || [],
      timeline: parsed.timeline || [],
      possibleExplanations: parsed.possibleExplanations || [],
      correctResolution: parsed.correctResolution || {
        answer: 'Unknown',
        culpritOrCause: 'Unknown',
        keyClueIds: [],
        howDeductionWorks: '',
      },
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Deterministically returns a curated case or procedurally generates a unique variation.
   */
  public getCuratedOrProceduralCase(options: GenerateCaseOptions = {}): MysteryCase {
    const idx = options.seedIndex !== undefined
      ? options.seedIndex % CURATED_MYSTERY_CASES.length
      : Math.floor(Math.random() * CURATED_MYSTERY_CASES.length);

    const baseCase = CURATED_MYSTERY_CASES[idx] || CURATED_MYSTERY_CASES[0];
    const timestamp = Date.now();
    const caseId = `${baseCase.caseId}-${timestamp.toString(36).slice(-4).toUpperCase()}`;

    return {
      ...baseCase,
      caseId,
      caseType: options.caseType || baseCase.caseType,
      difficulty: options.difficulty || baseCase.difficulty,
      createdAt: new Date().toISOString(),
    };
  }
}

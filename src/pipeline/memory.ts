/**
 * Content Memory Store
 * Tracks published posts to avoid duplication and balance content pillars.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  ContentItem,
  ContentMemoryItem,
  ContentPillar,
  PILLAR_DISTRIBUTION,
} from './types.js';

export class ContentMemoryStore {
  private memoryPath: string;

  constructor(customPath?: string) {
    this.memoryPath =
      customPath || path.resolve(process.cwd(), 'data', 'content-memory.json');
    this.ensureFileExists();
  }

  private ensureFileExists(): void {
    const dir = path.dirname(this.memoryPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.memoryPath)) {
      // Initialize with clean empty array for production
      fs.writeFileSync(
        this.memoryPath,
        JSON.stringify([], null, 2),
        'utf-8'
      );
    }
  }

  public async loadMemory(): Promise<ContentMemoryItem[]> {
    try {
      const data = fs.readFileSync(this.memoryPath, 'utf-8');
      return JSON.parse(data) as ContentMemoryItem[];
    } catch {
      return [];
    }
  }

  public async saveMemory(items: ContentMemoryItem[]): Promise<void> {
    fs.writeFileSync(this.memoryPath, JSON.stringify(items, null, 2), 'utf-8');
  }

  public async recordPublication(item: ContentItem): Promise<void> {
    const memory = await this.loadMemory();
    const memoryItem: ContentMemoryItem = {
      id: item.id,
      topic: item.topic,
      title: item.draft.title,
      pillar: item.pillar,
      coreConcept: item.draft.coreTakeaway,
      publicationDate: item.publishedAt || new Date().toISOString(),
      sources: item.draft.sourcesCited,
      sourceUrls: item.draft.sourceUrls,
      visualUsed: item.visualDecision.needed,
      visualTemplate: item.visualDecision.template,
      ctaType: item.draft.cta.type,
    };

    // Avoid duplicate id in memory
    const existingIndex = memory.findIndex((m) => m.id === item.id);
    if (existingIndex >= 0) {
      memory[existingIndex] = memoryItem;
    } else {
      memory.unshift(memoryItem);
    }

    await this.saveMemory(memory);
  }

  /**
   * Deterministic duplicate detector.
   * Compares normalized text, keywords, and token overlap.
   */
  public isDuplicate(
    candidateTopic: string,
    memory: ContentMemoryItem[]
  ): { isDuplicate: boolean; reason?: string; match?: ContentMemoryItem } {
    const normalize = (text: string): string[] => {
      const stopWords = new Set([
        'the',
        'a',
        'an',
        'and',
        'or',
        'in',
        'on',
        'of',
        'for',
        'with',
        'why',
        'how',
        'what',
        'when',
        'you',
        'your',
        'we',
        'our',
        'people',
        'person',
        'human',
        'brain',
        'psychology',
        'effect',
        'phenomenon',
      ]);
      return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((word) => word.length > 2 && !stopWords.has(word));
    };

    const candidateTokens = new Set(normalize(candidateTopic));
    if (candidateTokens.size === 0) {
      return { isDuplicate: false };
    }

    for (const item of memory) {
      // 1. Direct topic/title string match
      const normCand = candidateTopic.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normTopic = item.topic.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normTitle = item.title.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (normCand === normTopic || normCand === normTitle) {
        return {
          isDuplicate: true,
          reason: `Exact match with previously published topic "${item.title}"`,
          match: item,
        };
      }

      // 2. Token overlap (Jaccard similarity)
      const itemTokens = new Set([
        ...normalize(item.topic),
        ...normalize(item.title),
        ...normalize(item.coreConcept),
      ]);

      let intersectionCount = 0;
      for (const token of candidateTokens) {
        if (itemTokens.has(token)) {
          intersectionCount++;
        }
      }

      const unionCount = new Set([...candidateTokens, ...itemTokens]).size;
      const jaccard = unionCount > 0 ? intersectionCount / unionCount : 0;
      const candidateCoverage = intersectionCount / candidateTokens.size;

      // If more than 60% of candidate's distinct keywords already covered in item
      if (candidateCoverage >= 0.6 || jaccard >= 0.4) {
        return {
          isDuplicate: true,
          reason: `High semantic overlap (${Math.round(candidateCoverage * 100)}% keyword match) with "${item.title}"`,
          match: item,
        };
      }
    }

    return { isDuplicate: false };
  }

  /**
   * Determine which pillar is currently most under-represented compared to target weights.
   */
  public getNextTargetPillar(memory: ContentMemoryItem[]): ContentPillar {
    if (memory.length === 0) {
      return 'Everyday Psychology';
    }

    const counts: Record<ContentPillar, number> = {
      'Everyday Psychology': 0,
      'Strange Human Behavior': 0,
      'Brain, Memory & Perception': 0,
      'Psychology Thought Experiments': 0,
    };

    for (const item of memory) {
      if (counts[item.pillar] !== undefined) {
        counts[item.pillar]++;
      }
    }

    const total = memory.length;
    let mostDeficitPillar: ContentPillar = 'Everyday Psychology';
    let maxDeficit = -Infinity;

    for (const pillar of Object.keys(PILLAR_DISTRIBUTION) as ContentPillar[]) {
      const targetRatio = PILLAR_DISTRIBUTION[pillar];
      const actualRatio = counts[pillar] / total;
      const deficit = targetRatio - actualRatio;

      if (deficit > maxDeficit) {
        maxDeficit = deficit;
        mostDeficitPillar = pillar;
      }
    }

    return mostDeficitPillar;
  }

  /**
   * Formats recent memory for prompting Gemini to prevent repetition.
   */
  public getRecentTopicsSummary(memory: ContentMemoryItem[], limit = 25): string {
    const recent = memory.slice(0, limit);
    if (recent.length === 0) {
      return 'No prior topics recorded yet.';
    }

    return recent
      .map(
        (m, idx) =>
          `${idx + 1}. [${m.pillar}] "${m.title}" (Concept: ${m.coreConcept}, Topic: ${m.topic})`
      )
      .join('\n');
  }
}

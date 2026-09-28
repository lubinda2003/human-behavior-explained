/**
 * Content Variety & Repetition Detector for Pick Your Fate.
 * Lightweight, deterministic similarity checker that detects:
 * 1. Exact and normalized title collisions
 * 2. High word-overlap in titles/hooks
 * 3. Semantic concept-signature overlap (e.g., "sacrifice career for stranger" vs "give up future for someone you don't know")
 * 4. Repetitive opening formula clichés in hooks
 */

export interface RecentPostSummary {
  id?: string;
  title: string;
  hook?: string;
  setup?: string;
  category?: string;
  format?: string;
  contentType?: string;
}

export interface RepetitionCheckResult {
  isRepetitive: boolean;
  score: number; // 0.0 (completely distinct) to 1.0 (identical)
  matchedTitle?: string;
  reasons: string[];
}

/** Stop words filtered out during tokenization */
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'or', 'that',
  'the', 'to', 'was', 'were', 'will', 'with', 'you', 'your', 'my',
  'me', 'we', 'our', 'what', 'how', 'if', 'this', 'do', 'does',
  'would', 'could', 'should', 'all', 'one', 'two', 'before', 'after',
]);

/** Canonical concept clusters for semantic premise overlap detection */
const CONCEPT_CLUSTERS: Record<string, string[]> = {
  sacrifice: ['sacrifice', 'sacrificing', 'give up', 'giving up', 'forfeit', 'forfeiting', 'surrender', 'surrendering', 'abandon', 'abandoning', 'trade away', 'throw away'],
  career_future: ['career', 'job', 'future', 'profession', 'credentials', 'livelihood', 'reputation', 'life work', 'entire future', 'tenure', 'promotion'],
  wealth_money: ['money', 'cash', 'dollars', 'fortune', 'wealth', 'millions', 'bonds', 'stipend', 'rich', 'billionaire', 'salary', 'windfall'],
  stranger: ['stranger', 'strangers', 'someone you do not know', 'someone you dont know', 'unknown person', 'bystander', 'pedestrian', 'anonymous person'],
  family_partner: ['family', 'partner', 'spouse', 'wife', 'husband', 'child', 'children', 'mother', 'father', 'friend', 'friends', 'best friend', 'sibling'],
  rescue_save: ['save', 'saving', 'rescue', 'rescuing', 'protect', 'protecting', 'spare', 'sparing', 'pull from danger', 'prevent death'],
  isolation_prison: ['isolation', 'underground', 'prison', 'vault', 'bunker', 'solitary', 'cell', 'cage', 'deserted island', 'locked room'],
  memory_mind: ['memory', 'memories', 'trauma', 'erase', 'erasing', 'forget', 'forgetting', 'mind', 'neural', 'brain', 'wipe memory', 'amnesia'],
  immortality_youth: ['immortal', 'immortality', 'eternal', 'eternity', 'youth', 'live forever', 'elixir', 'ageless', 'stop aging'],
  danger_death: ['lethal', 'deadly', 'casualty', 'death', 'kill', 'implosion', 'blizzard', 'freezing', 'suffocate', 'fatal', 'perish'],
  whistleblower_fraud: ['whistleblower', 'whistleblowing', 'cover up', 'coverup', 'leak', 'leaking', 'expose', 'exposing', 'corporate fraud', 'embezzle', 'secret wrongdoing'],
  technology_ai: ['ai', 'artificial intelligence', 'algorithm', 'robot', 'automation', 'neural interface', 'synthetic', 'autonomous', 'deepfake', 'cyborg'],
  time_travel_aging: ['time machine', 'time travel', 'past self', 'future self', 'aging', 'years of life', 'rewind', 'fast forward', 'chronological', 'timeline'],
  law_crime_justice: ['crime', 'illegal', 'police', 'arrest', 'prison', 'jail', 'steal', 'theft', 'guilty', 'innocent', 'verdict', 'judge', 'smuggle'],
  loyalty_betrayal: ['betray', 'betrayal', 'double cross', 'informant', 'confess', 'confession', 'snitch', 'rat out', 'turn in', 'treason'],
  health_medical: ['disease', 'cure', 'infection', 'hospital', 'surgeon', 'organ', 'transplant', 'quarantine', 'vaccine', 'virus', 'clinical trial', 'fatal diagnosis'],
  reputation_secrets: ['blackmail', 'secret', 'scandal', 'reputation', 'humiliation', 'exposed', 'public shame', 'hidden truth'],
  competition_game: ['game show', 'tournament', 'prize pool', 'elimination', 'contestant', 'opponent', 'gladiator', 'arena'],
  social_influence: ['fame', 'followers', 'cancel culture', 'status', 'viral', 'influencer', 'social credit', 'public opinion'],
  absurd_bizarre: ['absurd', 'bizarre', 'switch bodies', 'freaky friday', 'curse', 'genie', 'wishes', 'weird power', 'body swap'],
};

/** Repetitive opening formula regexes */
const REPETITIVE_OPENING_PATTERNS = [
  /^(?:imagine\b|in a world\b|what if\b|picture this\b|suppose\b)/i,
  /^(?:you wake up\b|you find yourself\b)/i,
  /^(?:would you rather\b)/i,
];

export class RepetitionDetector {
  /**
   * Normalizes text into a clean alphanumeric string.
   */
  public static normalize(text: string): string {
    return text
      .toLowerCase()
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Tokenizes text into meaningful content keywords (stop words removed).
   */
  public static tokenize(text: string): Set<string> {
    const normalized = this.normalize(text);
    const tokens = normalized
      .split(' ')
      .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
    return new Set(tokens);
  }

  /**
   * Calculates Jaccard similarity coefficient between two token sets.
   */
  public static jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0 || setB.size === 0) return 0;
    let intersection = 0;
    for (const item of setA) {
      if (setB.has(item)) intersection++;
    }
    const union = new Set([...setA, ...setB]).size;
    return union > 0 ? intersection / union : 0;
  }

  /**
   * Extracts canonical concept tags present in a text.
   * Uses word-boundary-safe matching to ensure substrings (e.g. 'ai' in 'claim' or 'train')
   * do not trigger false positive concept cluster tags.
   */
  public static extractConceptTags(text: string): Set<string> {
    const normalized = ` ${this.normalize(text)} `;
    const tags = new Set<string>();

    for (const [tag, keywords] of Object.entries(CONCEPT_CLUSTERS)) {
      for (const kw of keywords) {
        const normKw = this.normalize(kw);
        if (!normKw) continue;
        if (normalized.includes(` ${normKw} `)) {
          tags.add(tag);
          break;
        }
      }
    }

    return tags;
  }

  /**
   * Checks if candidate content begins with a generic cliché opening pattern.
   */
  public static hasRepetitiveOpening(text: string): boolean {
    const trimmed = text.trim();
    return REPETITIVE_OPENING_PATTERNS.some((pat) => pat.test(trimmed));
  }

  /**
   * Evaluates candidate dilemma content against recent post history.
   * Returns a comprehensive RepetitionCheckResult.
   */
  public static checkSimilarity(
    candidate: { title: string; hook?: string; setup?: string },
    recentHistory: RecentPostSummary[],
    options: { titleThreshold?: number; conceptOverlapThreshold?: number } = {},
  ): RepetitionCheckResult {
    const titleThreshold = options.titleThreshold ?? 0.5;
    const candidateNormalizedTitle = this.normalize(candidate.title);
    const candidateTokens = this.tokenize(`${candidate.title} ${candidate.hook || ''}`);
    const candidateConcepts = this.extractConceptTags(`${candidate.title} ${candidate.hook || ''} ${candidate.setup || ''}`);

    const reasons: string[] = [];
    let maxScore = 0;
    let matchedTitle: string | undefined;

    // Check for repetitive opening cliché on candidate
    if (candidate.hook && this.hasRepetitiveOpening(candidate.hook)) {
      reasons.push(`Opening hook begins with formulaic cliché ("${candidate.hook.slice(0, 30)}...")`);
      maxScore = Math.max(maxScore, 0.6);
    }

    for (const recent of recentHistory) {
      if (!recent.title) continue;

      const recentNormalizedTitle = this.normalize(recent.title);

      // 1. Exact or near-exact title match
      if (candidateNormalizedTitle === recentNormalizedTitle) {
        return {
          isRepetitive: true,
          score: 1.0,
          matchedTitle: recent.title,
          reasons: [`Exact title duplicate with recent post: "${recent.title}"`],
        };
      }

      // 2. Token overlap / Jaccard similarity on title + hook
      const recentTokens = this.tokenize(`${recent.title} ${recent.hook || ''}`);
      const tokenScore = this.jaccardSimilarity(candidateTokens, recentTokens);

      if (tokenScore > maxScore) {
        maxScore = tokenScore;
        matchedTitle = recent.title;
      }

      if (tokenScore >= titleThreshold) {
        reasons.push(`High lexical overlap (${Math.round(tokenScore * 100)}%) with recent post: "${recent.title}"`);
      }

      // 3. Semantic Concept Cluster Overlap (detecting same premise with different wording)
      const recentConcepts = this.extractConceptTags(`${recent.title} ${recent.hook || ''} ${recent.setup || ''}`);
      if (candidateConcepts.size >= 2 && recentConcepts.size >= 2) {
        let sharedConceptCount = 0;
        const sharedConcepts: string[] = [];
        for (const concept of candidateConcepts) {
          if (recentConcepts.has(concept)) {
            sharedConceptCount++;
            sharedConcepts.push(concept);
          }
        }

        // If candidate shares 3+ major concept clusters, or 2 key high-salience clusters
        const isCoreThematicClash =
          sharedConceptCount >= 3 ||
          (sharedConceptCount >= 2 && (
            (candidateConcepts.has('sacrifice') && candidateConcepts.has('stranger')) ||
            (candidateConcepts.has('career_future') && candidateConcepts.has('sacrifice')) ||
            (candidateConcepts.has('career_future') && candidateConcepts.has('stranger')) ||
            (candidateConcepts.has('rescue_save') && candidateConcepts.has('stranger')) ||
            (candidateConcepts.has('memory_mind') && candidateConcepts.has('danger_death')) ||
            (candidateConcepts.has('immortality_youth') && candidateConcepts.has('family_partner')) ||
            (candidateConcepts.has('whistleblower_fraud') && candidateConcepts.has('career_future')) ||
            (candidateConcepts.has('technology_ai') && candidateConcepts.has('law_crime_justice')) ||
            (candidateConcepts.has('loyalty_betrayal') && candidateConcepts.has('family_partner')) ||
            (candidateConcepts.has('health_medical') && candidateConcepts.has('sacrifice')) ||
            (candidateConcepts.has('time_travel_aging') && candidateConcepts.has('wealth_money')) ||
            (candidateConcepts.has('reputation_secrets') && candidateConcepts.has('wealth_money')) ||
            (candidateConcepts.has('social_influence') && candidateConcepts.has('reputation_secrets'))
          ));

        if (isCoreThematicClash) {
          const semanticScore = 0.75 + (sharedConceptCount * 0.05);
          if (semanticScore > maxScore) {
            maxScore = Math.min(1.0, semanticScore);
            matchedTitle = recent.title;
          }
          reasons.push(
            `Core dilemma premise and thematic trade-off closely mirrors recent post "${recent.title}" (shared themes: ${sharedConcepts.join(', ')})`
          );
        }
      }

      // 4. Repeated Hook Opening Comparison (consecutive posts using identical opening phrases)
      if (candidate.hook && recent.hook) {
        const candidateStart = this.normalize(candidate.hook).split(' ').slice(0, 3).join(' ');
        const recentStart = this.normalize(recent.hook).split(' ').slice(0, 3).join(' ');
        if (candidateStart.length > 8 && candidateStart === recentStart) {
          maxScore = Math.max(maxScore, 0.55);
          matchedTitle = recent.title;
          reasons.push(`Repeated opening hook phrase pattern ("${candidateStart}...") matching recent post "${recent.title}"`);
        }
      }
    }

    const isRepetitive = reasons.length > 0 && maxScore >= 0.5;

    return {
      isRepetitive,
      score: maxScore,
      matchedTitle,
      reasons,
    };
  }
}

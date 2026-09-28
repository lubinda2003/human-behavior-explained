import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RepetitionDetector, RecentPostSummary } from '../src/pipeline/dilemmas/repetitionDetector.js';
import { DilemmaGenerator } from '../src/pipeline/dilemmas/generator.js';
import { DilemmaQualityChecker } from '../src/pipeline/dilemmas/quality.js';
import { InteractiveDilemma } from '../src/pipeline/dilemmas/types.js';

describe('Phase 4: Content Variety & Repetition Control Test Suite', () => {
  const generator = new DilemmaGenerator();

  describe('1. Semantic Repetition & Premise Overlap Detection', () => {
    it('detects two semantically identical premises even when titles and wording differ', () => {
      const recentHistory: RecentPostSummary[] = [
        {
          id: 'post_101',
          title: 'The Whistleblower Crossroads',
          hook: 'Would you sacrifice your career to save a stranger from wrongful imprisonment?',
          setup: 'You have tenured credentials at a top firm. Exposing the fraud destroys your entire career but saves an innocent bystander.',
          category: 'moral',
        },
      ];

      // Candidate with completely different title and synonyms
      const candidate = {
        title: 'The Silent Sacrifice Protocol',
        hook: 'Would you give up your entire future to rescue someone you dont know from a lethal sentence?',
        setup: 'A high-ranking scientist must forfeit their livelihood and reputation to protect an unknown person.',
      };

      const result = RepetitionDetector.checkSimilarity(candidate, recentHistory);

      assert.equal(result.isRepetitive, true);
      assert.ok(result.score >= 0.7);
      assert.equal(result.matchedTitle, 'The Whistleblower Crossroads');
      assert.ok(
        result.reasons.some((r) => r.toLowerCase().includes('thematic') || r.toLowerCase().includes('mirrors')),
        `Expected thematic clash reason, got: ${result.reasons.join('; ')}`
      );
    });

    it('allows genuinely distinct premises and themes to pass similarity check', () => {
      const recentHistory: RecentPostSummary[] = [
        {
          id: 'post_101',
          title: 'The Whistleblower Crossroads',
          hook: 'Would you sacrifice your career to save a stranger from wrongful imprisonment?',
          setup: 'You have tenured credentials at a top firm.',
          category: 'moral',
        },
      ];

      const candidate = {
        title: 'The Abyssal Trench Ballast Dilemma',
        hook: 'Your deep-sea sub loses propulsion at 4,000 meters while icy water drips onto the battery terminal.',
        setup: 'Blow the explosive ascent bolts or await naval salvage 90 minutes away.',
      };

      const result = RepetitionDetector.checkSimilarity(candidate, recentHistory);

      assert.equal(result.isRepetitive, false);
      assert.ok(result.score < 0.4);
    });

    it('strictly catches exact and normalized duplicate titles', () => {
      const recentHistory: RecentPostSummary[] = [
        {
          id: 'post_102',
          title: 'The AI Diagnostic Veto',
          hook: 'An algorithm orders immediate surgery, but human surgeons disagree.',
        },
      ];

      const duplicateCandidate = {
        title: 'The AI Diagnostic Veto',
        hook: 'Different hook wording but exact duplicate title.',
      };

      const result = RepetitionDetector.checkSimilarity(duplicateCandidate, recentHistory);
      assert.equal(result.isRepetitive, true);
      assert.equal(result.score, 1.0);
      assert.ok(result.reasons.some((r) => r.includes('Exact title duplicate')));
    });

    it('detects formulaic cliché openings in hooks', () => {
      const clicheHooks = [
        'Imagine you are trapped inside a sealed room with a ticking clock.',
        'In a world where memories can be bought and sold...',
        'What if you were given one billion dollars with one catch?',
        'You wake up in a pitch-black submarine with alarms sounding.',
        'Would you rather have unlimited money or live forever?',
      ];

      for (const hook of clicheHooks) {
        assert.equal(
          RepetitionDetector.hasRepetitiveOpening(hook),
          true,
          `Expected "${hook}" to be flagged as formulaic cliché opening`
        );
      }

      const punchyDirectHooks = [
        'A high-pressure seal ruptures in the sub cabin as battery voltage drops to 8%.',
        'The alarm blares at 03:40 AM: the bio-vault freezer is unlocked and Sample 9 is gone.',
        'A rogue hacker demands $50M to stop releasing private hospital records.',
      ];

      for (const hook of punchyDirectHooks) {
        assert.equal(
          RepetitionDetector.hasRepetitiveOpening(hook),
          false,
          `Expected "${hook}" to pass direct active hook check`
        );
      }
    });

    it('detects repeated consecutive opening patterns across posts', () => {
      const recentHistory: RecentPostSummary[] = [
        {
          id: 'post_1',
          title: 'The Cryo Chamber Protocol',
          hook: 'The emergency alarm sounds as the containment seals fail.',
        },
      ];

      const candidate = {
        title: 'The Reactor Breach',
        hook: 'The emergency alarm sounds as the cooling valves lock up.',
      };

      const result = RepetitionDetector.checkSimilarity(candidate, recentHistory);
      assert.equal(result.isRepetitive, true);
      assert.ok(result.reasons.some((r) => r.includes('Repeated opening hook phrase pattern')));
    });

    it('enforces word-boundary matching so substrings (e.g. "ai" in "train", "brain", "claim", "airplane", "contain", "paint", "daily") do not falsely trigger concept clusters', () => {
      const benignWords = ['train', 'brain', 'claim', 'airplane', 'contain', 'paint', 'daily'];
      for (const word of benignWords) {
        const text = `The conductor noted that a ${word} was inspected during the routine operation.`;
        const tags = RepetitionDetector.extractConceptTags(text);
        assert.equal(
          tags.has('technology_ai'),
          false,
          `Word "${word}" containing substring "ai" must NOT trigger the technology_ai concept cluster`
        );
      }

      const validAiPhrases = [
        'An advanced AI diagnostic system scans the patient records.',
        'An artificial intelligence model optimizes the power grid.',
        'The autonomous AI system handles reactor emergency protocols.',
        'An AI-powered assistant flags the data discrepancy.',
      ];

      for (const phrase of validAiPhrases) {
        const tags = RepetitionDetector.extractConceptTags(phrase);
        assert.equal(
          tags.has('technology_ai'),
          true,
          `Phrase "${phrase}" must legitimately trigger the technology_ai concept cluster`
        );
      }
    });
  });

  describe('2. Quality Gate & Anti-Repetition Integration', () => {
    it('flags repetitive content in Quality Gate when recent history is provided', () => {
      const recentPosts: RecentPostSummary[] = [
        {
          id: 'post_201',
          title: 'The Dragon Blood Vial',
          hook: 'Drink the elixir to gain immortality—but every person who loved you forgets your name.',
          setup: 'An alchemist gives you eternal youth at the cost of your family forgetting you exist.',
        },
      ];

      const repetitiveDilemma: InteractiveDilemma = {
        id: 'candidate_rep',
        category: 'fantasy',
        format: 'impossible_dilemma',
        title: 'The Immortal Loneliness Draught',
        hook: 'Drink the glowing potion to stop aging forever while everyone in your family forgets you.',
        setup: 'A magical elixir grants ageless immortality and eternal life, but your partner and children become strangers.',
        scenario: 'A magical elixir grants ageless immortality and eternal life, but your partner and children become strangers.',
        depth: 'standard',
        choices: [
          { id: 'a', label: 'Drink', description: 'Live forever', tradeOff: 'Family forgets you' },
          { id: 'b', label: 'Refuse', description: 'Stay mortal', tradeOff: 'Age and die' },
        ],
        pollQuestion: 'Do you drink or refuse?',
        discussionPrompt: 'Why choose immortality over love?',
        payoff: { reveal: 'Eternal life without bonds is a prison.' },
        formattedTelegramText: '<b>The Immortal Loneliness Draught</b>\n\nDrink the glowing potion...',
      };

      const qc = DilemmaQualityChecker.validateDilemmaContent(repetitiveDilemma, { recentPosts });

      assert.equal(qc.isValid, false);
      assert.equal(qc.checks.noRepetitiveTheme, false);
      assert.ok(qc.errors.some((e) => e.includes('Repetition check failed')));
    });

    it('proves repairDilemma preserves recent-post context and re-validates against it', () => {
      const recentPosts: RecentPostSummary[] = [
        {
          id: 'post_201',
          title: 'The Whistleblower Crossroads',
          hook: 'Would you sacrifice your career to save a stranger from wrongful imprisonment?',
          setup: 'You have tenured credentials at a top firm. Exposing the fraud destroys your entire career.',
        },
      ];

      // Repetitive dilemma with invalid choices to trigger repair
      const ungroundedRepetitiveDilemma: InteractiveDilemma = {
        id: 'candidate_repair_test',
        category: 'moral',
        format: 'impossible_dilemma',
        title: 'The Silent Sacrifice Protocol',
        hook: 'Would you give up your entire future to rescue someone you dont know from a lethal sentence?',
        setup: 'A tenured scientist must forfeit their livelihood and reputation to protect an unknown person.',
        scenario: 'A tenured scientist must forfeit their livelihood and reputation to protect an unknown person.',
        depth: 'standard',
        choices: [], // Missing choices triggers repair
        pollQuestion: 'Which path do you take?',
        discussionPrompt: 'Defend your choice in the comments.',
        payoff: { reveal: 'Reputation is fragile.' },
        formattedTelegramText: '',
      };

      const repaired = generator.repairDilemma(ungroundedRepetitiveDilemma, { recentPosts });

      assert.ok(repaired.qc);
      assert.equal(repaired.qc.isValid, false, 'Repaired dilemma must fail QC when it retains a conflicting theme with recentPosts');
      assert.equal(repaired.qc.checks.noRepetitiveTheme, false);
      assert.ok(repaired.qc.errors.some((e) => e.includes('Repetition check failed')));
    });

    it('proves valid non-repetitive content successfully passes repair and re-validation', () => {
      const recentPosts: RecentPostSummary[] = [
        {
          id: 'post_201',
          title: 'The Whistleblower Crossroads',
          hook: 'Would you sacrifice your career to save a stranger from wrongful imprisonment?',
        },
      ];

      // Non-repetitive dilemma with missing choices that can be cleanly repaired
      const distinctDilemma: InteractiveDilemma = {
        id: 'candidate_clean_repair',
        category: 'survival',
        format: 'survival_scenario',
        title: 'The High Arctic Trench Whiteout',
        hook: 'The thermal generators stall in a -40°C blizzard with 18 minutes of auxiliary power left.',
        setup: 'You are an engineer stationed at an arctic seismic sensor outpost during a Category 5 blizzard.',
        scenario: 'You are an engineer stationed at an arctic seismic sensor outpost during a Category 5 blizzard.',
        depth: 'standard',
        choices: [], // Missing choices will be populated by repair
        pollQuestion: 'Do you reroute battery power or venture out to clear the intake?',
        discussionPrompt: 'What is your tactical protocol?',
        payoff: { reveal: 'Direct intake clearing restores generator airflow and prevents thermal shutdown.' },
        formattedTelegramText: '',
      };

      const repaired = generator.repairDilemma(distinctDilemma, { recentPosts });

      assert.ok(repaired.qc);
      assert.equal(repaired.qc.isValid, true, `Clean distinct dilemma should pass QC after repair. Errors: ${repaired.qc.errors.join('; ')}`);
      assert.equal(repaired.qc.checks.noRepetitiveTheme, true);
      assert.equal(repaired.qc.checks.choiceCountValid, true);
    });

    it('rejects candidate posts with cliché formula openings in Quality Gate', () => {
      const clicheDilemma: InteractiveDilemma = {
        id: 'candidate_cliche',
        category: 'moral',
        format: 'impossible_dilemma',
        title: 'The Vault Choice',
        hook: 'Imagine you find yourself inside a bank vault with 60 seconds left.',
        setup: 'You are an investigator inside a locked bank vault with security alarms sounding.',
        scenario: 'You are an investigator inside a locked bank vault with security alarms sounding.',
        depth: 'standard',
        choices: [
          { id: 'a', label: 'Take Key', description: 'Escape alone', tradeOff: 'Leave evidence' },
          { id: 'b', label: 'Call Backup', description: 'Wait for team', tradeOff: 'Risk arrest' },
        ],
        pollQuestion: 'Which move do you make?',
        discussionPrompt: 'What is the tactical priority?',
        payoff: { reveal: 'Vault seals trigger lockouts instantly.' },
        formattedTelegramText: '<b>The Vault Choice</b>\n\nImagine you find yourself...',
      };

      const qc = DilemmaQualityChecker.validateDilemmaContent(clicheDilemma);

      assert.equal(qc.isValid, false);
      assert.equal(qc.checks.noRepetitiveOpening, false);
      assert.ok(qc.errors.some((e) => e.includes('formulaic cliché')));
    });
  });

  describe('3. Procedural Fallback Anti-Collision & Theme Rotation', () => {
    it('automatically picks an alternative catalog entry when the default collides with recent history', () => {
      // Recent history has the exact money/lifestyle default
      const recentPosts: RecentPostSummary[] = [
        {
          id: 'post_money_0',
          title: 'The $5,000,000 Silent Decade',
          hook: 'Receive $5,000,000 cash right now—with one rule: you must live in an underground bunker with zero internet for 10 years.',
          setup: 'A private hedge fund transfers $5,000,000 directly to your account with extreme isolation rules.',
          category: 'money/lifestyle',
        },
      ];

      // Requesting procedural dilemma with money/lifestyle
      const dilemma = generator.generateProceduralDilemma({
        category: 'money/lifestyle',
        recentPosts,
      });

      assert.ok(dilemma.title);
      assert.notEqual(dilemma.title, 'The $5,000,000 Silent Decade');
      assert.equal(dilemma.qc?.checks.noRepetitiveTheme, true);
    });

    it('does not get stuck in an infinite regeneration loop', () => {
      // Even if recent posts match several catalog entries, generator returns a valid object
      const recentPosts: RecentPostSummary[] = [
        { title: 'The $5,000,000 Silent Decade' },
        { title: 'The Whistleblower Crossroads' },
        { title: 'The Midnight Bio-Vault Mystery' },
      ];

      const dilemma = generator.generateProceduralDilemma({
        format: 'survival_scenario',
        recentPosts,
      });

      assert.ok(dilemma);
      assert.equal(dilemma.format, 'survival_scenario');
      assert.ok(dilemma.title.length > 0);
    });
  });

  describe('4. Format-Specific Identities Preserved', () => {
    it('preserves discussion-first mechanics across variety rotation', () => {
      const discussionFormats = ['mini_mystery', 'brain_logic', 'hot_take', 'future_tech'] as const;

      for (const format of discussionFormats) {
        const post = generator.generateProceduralDilemma({ format });
        assert.equal(post.format, format);
        assert.equal(post.choices, undefined, `${format} should have no choices`);
        assert.equal(post.pollQuestion, undefined, `${format} should have no pollQuestion`);
        assert.ok(post.discussionPrompt && post.discussionPrompt.length > 10, `${format} requires substantive discussionPrompt`);
        assert.ok(post.payoff?.reveal && post.payoff.reveal.length > 10, `${format} requires payoff reveal`);
      }
    });

    it('preserves poll-based mechanics across variety rotation', () => {
      const pollFormats = ['impossible_dilemma', 'survival_scenario', 'strategy_challenge', 'chaotic_funny', 'prediction'] as const;

      for (const format of pollFormats) {
        const post = generator.generateProceduralDilemma({ format });
        assert.equal(post.format, format);
        assert.ok(Array.isArray(post.choices) && post.choices.length >= 2, `${format} requires 2+ choices`);
        assert.ok(post.pollQuestion && post.pollQuestion.length > 5, `${format} requires pollQuestion`);
      }
    });
  });
});

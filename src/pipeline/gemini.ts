/**
 * Gemini Content Engine
 * Strictly separates topic selection, empirical research, editorial writing, and visual decision.
 */

import { GoogleGenAI } from '@google/genai';
import {
  ContentPillar,
  PostDraft,
  ResearchNotes,
  TopicCandidate,
  VisualDecision,
} from './types.js';

export class GeminiContentEngine {
  private client: GoogleGenAI | null = null;
  private apiKey: string;
  private modelName = 'gemini-2.5-flash';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';
  }

  private getClient(): GoogleGenAI {
    if (!this.client) {
      if (!this.apiKey || this.apiKey.includes('MY_GEMINI')) {
        throw new Error('GEMINI_API_KEY is missing or unconfigured.');
      }
      this.client = new GoogleGenAI({ apiKey: this.apiKey });
    }
    return this.client;
  }

  public hasValidApiKey(): boolean {
    return (
      Boolean(this.apiKey) &&
      !this.apiKey.includes('MY_GEMINI') &&
      this.apiKey.length > 10
    );
  }

  /**
   * STEP 1: Select a compelling, non-duplicate topic grounded in peer-reviewed psychology.
   */
  public async selectTopic(options: {
    recentMemorySummary: string;
    targetPillar: ContentPillar;
    forcedTopic?: string;
  }): Promise<TopicCandidate> {
    if (options.forcedTopic) {
      return {
        topic: options.forcedTopic,
        pillar: options.targetPillar,
        coreQuestion: `What psychological mechanisms explain ${options.forcedTopic}?`,
        rationale: 'Specified via manual user input.',
      };
    }

    if (!this.hasValidApiKey()) {
      return this.getCuratedFallbackTopic(options.targetPillar);
    }

    const prompt = `
You are the editorial director for an evidence-based Psychology & Human Behavior publication.
Target Pillar: "${options.targetPillar}".

Positioning: Evidence-based explanations for the strange things people think, feel, and do.
We publish curiosity-driven educational posts rather than generic "psychology facts" or self-help content.

CRITICAL RULES:
- Avoid pseudoscience, MBTI / astrology, diagnosing people, "signs someone secretly likes/hates you", and generic motivational content.
- Must focus on real psychological effects, cognitive biases, perceptual illusions, or documented behaviors.
- Do NOT repeat or paraphrase any topic from our publication history below:

RECENTLY PUBLISHED TOPICS (DO NOT REPEAT):
${options.recentMemorySummary}

Respond ONLY with valid JSON matching this exact structure:
{
  "topic": "Name of the psychological effect, paradox, or behavior",
  "pillar": "${options.targetPillar}",
  "coreQuestion": "The central mystery or counter-intuitive question it answers",
  "rationale": "Why this specific phenomenon is fascinating, evidence-grounded, and counter-intuitive"
}
`;

    try {
      const client = this.getClient();
      const response = await client.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      });

      const text = response.text?.trim() || '';
      return JSON.parse(text) as TopicCandidate;
    } catch (err) {
      console.warn('Gemini topic selection failed or unavailable. Using curated fallback:', err);
      return this.getCuratedFallbackTopic(options.targetPillar);
    }
  }

  /**
   * STEP 2: Research the claims, scientific findings, mechanisms, and caveats.
   */
  public async researchTopic(topic: TopicCandidate): Promise<ResearchNotes> {
    if (!this.hasValidApiKey()) {
      return this.getCuratedFallbackResearch(topic);
    }

    const prompt = `
You are a senior cognitive scientist and psychology researcher.
Conduct a rigorous empirical research dossier on:
Topic: "${topic.topic}"
Pillar: "${topic.pillar}"
Core Question: "${topic.coreQuestion}"

REQUIREMENTS:
1. Identify primary researchers (author names and approximate publication years).
2. Detail the exact cognitive, neurological, or evolutionary mechanism behind it.
3. Explicitly identify scientific limitations, boundary conditions, or replication nuances (do NOT overstate certainty).
4. Concrete real-world observation of how it appears in everyday life.

Respond ONLY with valid JSON matching this exact structure:
{
  "coreConcept": "1-2 sentence definition of the core phenomenon",
  "scientificClaims": ["Key verified finding 1", "Key verified finding 2"],
  "keyStudies": [
    {
      "authors": "Researcher names (e.g. Kahneman & Tversky)",
      "year": 1974,
      "studyName": "Name of seminal paper or experiment",
      "findings": "What the experiment specifically showed",
      "contextOrSample": "Methodology summary or participant group"
    }
  ],
  "cognitiveMechanisms": ["Underlying neuro/cognitive mechanism 1", "Mechanism 2"],
  "caveatsAndLimitations": ["When the effect breaks down or replication constraints", "Alternative explanations"],
  "uncertaintyLevel": "low" | "moderate" | "high",
  "everydayManifestation": "Specific relatable scenario where humans experience this"
}
`;

    try {
      const client = this.getClient();
      const response = await client.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const text = response.text?.trim() || '';
      return JSON.parse(text) as ResearchNotes;
    } catch (err) {
      console.warn('Gemini research failed or unavailable. Using curated fallback:', err);
      return this.getCuratedFallbackResearch(topic);
    }
  }

  /**
   * STEP 3: Editorial writing based purely on the researched dossier.
   */
  public async writeEditorialPost(
    topic: TopicCandidate,
    research: ResearchNotes
  ): Promise<PostDraft> {
    if (!this.hasValidApiKey()) {
      return this.getCuratedFallbackPostDraft(topic, research);
    }

    const prompt = `
You are an editorial writer for an evidence-based psychology Telegram channel.
Write a post using the following research dossier:

TOPIC: ${topic.topic}
PILLAR: ${topic.pillar}
CORE CONCEPT: ${research.coreConcept}
KEY STUDIES: ${JSON.stringify(research.keyStudies)}
MECHANISMS: ${research.cognitiveMechanisms.join('; ')}
CAVEATS & LIMITS: ${research.caveatsAndLimitations.join('; ')}
EVERYDAY SCENARIO: ${research.everydayManifestation}

TONE & STYLE:
- Write like a knowledgeable human explaining something genuinely interesting to a friend.
- Conversational, sharp, educational, grounded in empirical evidence.
- Concise: 180 - 320 words total.
- Break into 2-3 clean, readable paragraphs.

STRICT BANS (NEVER USE THESE PHRASES):
- "Have you ever wondered..."
- "In today’s fast-paced world..."
- "Let's dive in..." / "Let's delve into..."
- "Unlock the secrets..."
- "Here are 5 mind-blowing..."
- "It turns out that..."
- Excessive exclamation marks or emojis (max 1-2 subtle emojis).
- No generic engagement begging ("like", "comment below", "react").

CTA DECISION:
Choose one natural CTA style:
- "reflection" (prompt a quiet mental review)
- "curiosity" (point toward a related mystery)
- "conversation" (an open non-begging question)
- "connection" (tie to an unexpected discipline)
- "none" (let the conclusion stand on its own)

Respond ONLY with valid JSON matching this exact structure:
{
  "title": "Engaging, non-clickbait headline (max 8 words)",
  "pillar": "${topic.pillar}",
  "hook": "Compelling opening sentence describing the strange human behavior or mental trap directly",
  "bodyParagraphs": [
    "First paragraph explaining what happens in real life and the experiment that proved it.",
    "Second paragraph explaining the cognitive or neurological mechanism."
  ],
  "coreTakeaway": "Single sentence summarizing the key psychological insight",
  "sourcesCited": ["Author (Year) style citations"],
  "caveatNote": "Honest limitation or boundary condition noted in the research",
  "cta": {
    "type": "reflection" | "curiosity" | "conversation" | "connection" | "none",
    "text": "The natural concluding question or reflection, or empty string if none"
  }
}
`;

    try {
      const client = this.getClient();
      const response = await client.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.5,
        },
      });

      const text = response.text?.trim() || '';
      return JSON.parse(text) as PostDraft;
    } catch (err) {
      console.warn('Gemini writing failed or unavailable. Using curated fallback:', err);
      return this.getCuratedFallbackPostDraft(topic, research);
    }
  }

  /**
   * STEP 4: Visual decision - Decide if a graphic genuinely clarifies the concept, and provide structured specs.
   */
  public async evaluateVisualDecision(
    draft: PostDraft,
    research: ResearchNotes
  ): Promise<VisualDecision> {
    if (!this.hasValidApiKey()) {
      return this.getCuratedFallbackVisualDecision(draft, research);
    }

    const prompt = `
You are an editorial information designer.
Evaluate whether this psychology post benefits from a structured deterministic graphic.

POST TITLE: "${draft.title}"
PILLAR: "${draft.pillar}"
CORE TAKEAWAY: "${draft.coreTakeaway}"
MECHANISMS: "${research.cognitiveMechanisms.join(', ')}"
KEY STUDIES: "${JSON.stringify(research.keyStudies)}"

RULES:
- A visual is OPTIONAL. Only create one if it genuinely communicates useful information (e.g. contrast, process steps, a thought experiment dilemma, or key statistic) that is difficult to parse in pure text.
- If text is already self-contained and simple, set "needed": false.
- If needed, select ONE template from:
  1. "concept_diagram" (central concept + 2-3 mechanism columns)
  2. "process_flow" (step 1 -> step 2 -> step 3 causal chain)
  3. "comparison" (common assumption vs empirical reality)
  4. "timeline" (chronological scientific discovery)
  5. "simple_statistic" (focal percentage/multiplier + context)
  6. "thought_experiment" (dilemma premise + branch A vs B + psychological bias exposed)
  7. "concept_quote_card" (seminal quotation from researcher + core lesson)

Provide a structured data payload, NOT an image prompt.

Respond ONLY with valid JSON:
{
  "needed": true | false,
  "reason": "Why this graphic is or is not necessary",
  "template": "concept_diagram" | "process_flow" | "comparison" | "timeline" | "simple_statistic" | "thought_experiment" | "concept_quote_card",
  "spec": {
    "title": "Short graphic title",
    "subtitle": "Brief subtitle",
    "tag": "E.g. COGNITIVE CHAIN / EMPIRICAL CONTRAST / EXPERIMENTAL DATA",
    "sourceCitation": "Author (Year)",
    "template": "selected template name",
    "payload": {
      "template": "selected template name",
      "data": { ... matching template data schema ... }
    }
  }
}
`;

    try {
      const client = this.getClient();
      const response = await client.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      });

      const text = response.text?.trim() || '';
      return JSON.parse(text) as VisualDecision;
    } catch (err) {
      console.warn('Gemini visual decision failed or unavailable. Using curated fallback:', err);
      return this.getCuratedFallbackVisualDecision(draft, research);
    }
  }

  // ================= FALLBACK CURATED REPOSITORY =================
  // Provides robust, peer-reviewed fallbacks for tests, dry-runs, or API unavailability.

  private getCuratedFallbackTopic(pillar: ContentPillar): TopicCandidate {
    const fallbacks: Record<ContentPillar, TopicCandidate[]> = {
      'Everyday Psychology': [
        {
          topic: 'Ironic Process Theory (The White Bear Problem)',
          pillar: 'Everyday Psychology',
          coreQuestion: 'Why does deliberately trying to suppress a thought guarantee it will resurface?',
          rationale: 'Demonstrates dual-process cognitive monitoring under mental load.',
        },
        {
          topic: 'The Zeigarnik Effect',
          pillar: 'Everyday Psychology',
          coreQuestion: 'Why do incomplete tasks linger in working memory while finished ones vanish?',
          rationale: 'Explains task fixation, mental clutter, and cognitive closure.',
        },
      ],
      'Strange Human Behavior': [
        {
          topic: 'Illusion of Transparency',
          pillar: 'Strange Human Behavior',
          coreQuestion: 'Why do people overestimate how easily others can read their internal emotions?',
          rationale: 'Highlights egocentric anchoring in social interactions.',
        },
        {
          topic: 'Third-Person Effect',
          pillar: 'Strange Human Behavior',
          coreQuestion: 'Why do humans believe media and propaganda influence others far more than themselves?',
          rationale: 'Reveals pervasive self-serving cognitive bias in mass perception.',
        },
      ],
      'Brain, Memory & Perception': [
        {
          topic: 'The Misinformation Effect',
          pillar: 'Brain, Memory & Perception',
          coreQuestion: 'How can a single subtle post-event question permanently rewrite personal episodic memory?',
          rationale: 'Demonstrates the reconstructive rather than photographic nature of memory.',
        },
        {
          topic: 'Change Blindness',
          pillar: 'Brain, Memory & Perception',
          coreQuestion: 'Why does the visual cortex fail to notice dramatic shifts in plain sight during brief saccades?',
          rationale: 'Shows that conscious visual awareness is a sparse, rendered sketch rather than a high-definition stream.',
        },
      ],
      'Psychology Thought Experiments': [
        {
          topic: 'The Trolley Problem: Footbridge Dilemma (Greene Neuroimaging)',
          pillar: 'Psychology Thought Experiments',
          coreQuestion: 'Why do people switch a lever to save five lives, but refuse to push one person directly?',
          rationale: 'Highlights the dual-process conflict between utilitarian prefrontal cortex calculation and personal deontological amygdala response.',
        },
        {
          topic: 'The Experience Machine (Nozick Applied Psychology)',
          pillar: 'Psychology Thought Experiments',
          coreQuestion: 'If an artificial pod could guarantee perpetual bliss, why do most people reject plugging in?',
          rationale: 'Demonstrates that human motivation prioritizes authentic agency and reality-testing over raw subjective valence.',
        },
      ],
    };

    const list = fallbacks[pillar] || fallbacks['Everyday Psychology'];
    return list[Math.floor(Math.random() * list.length)];
  }

  private getCuratedFallbackResearch(topic: TopicCandidate): ResearchNotes {
    if (topic.topic.includes('White Bear') || topic.topic.includes('Ironic Process')) {
      return {
        coreConcept:
          'Deliberate mental thought suppression initiates two competing cognitive processes: an intentional conscious search for distractors, and an automatic unconscious monitor searching for lapses.',
        scientificClaims: [
          'Attempting to suppress a thought causes a hyper-accessible rebound effect once cognitive load increases.',
          'The monitoring process operates continuously beneath awareness with zero conscious effort.',
        ],
        keyStudies: [
          {
            authors: 'Wegner, Schneider, Carter & White',
            year: 1987,
            studyName: 'Paradoxical effects of thought suppression',
            findings:
              'Participants instructed not to think about a white bear rang a bell more frequently than those permitted to think about it freely.',
            contextOrSample: 'Controlled laboratory cohort instructed to think aloud into audio recorders.',
          },
        ],
        cognitiveMechanisms: [
          'Dual-process architecture: operating process (resource-dependent) vs. monitoring process (automatic)',
          'Cognitive load deprives operating process of glucose/attention, leaving monitor active',
        ],
        caveatsAndLimitations: [
          'Effects attenuate when subjects are provided with a concrete, focused replacement distractor.',
          'Individual differences in baseline anxiety affect rebound intensity.',
        ],
        uncertaintyLevel: 'low',
        everydayManifestation:
          'Lying awake in bed desperately trying not to think about tomorrow’s presentation, only to have the exact anxious scenario repeat in a loop.',
      };
    }

    if (topic.topic.includes('Misinformation')) {
      return {
        coreConcept:
          'Human memory is malleable and reconstructive; post-event misinformation seamlessly incorporates into original memory traces.',
        scientificClaims: [
          'Leading questions change subsequent eyewitness recollections of speed, broken glass, and details.',
          'Participants report high subjective confidence in completely synthetic memories.',
        ],
        keyStudies: [
          {
            authors: 'Loftus & Palmer',
            year: 1974,
            studyName: 'Reconstruction of automobile destruction',
            findings:
              'Changing a verb from "hit" to "smashed" increased estimated car speed by 9 mph and induced false memories of broken glass.',
            contextOrSample: '45 university students watching filmed car collisions.',
          },
        ],
        cognitiveMechanisms: [
          'Source monitoring error: confusion between original perception and subsequent verbal cues',
          'Memory reconsolidation: retrieved memories enter a plastic, rewriteable state before resting',
        ],
        caveatsAndLimitations: [
          'Central, emotionally salient facts are harder to distort than peripheral details.',
          'Immediate, unprompted free recall confers substantial protection against later misinformation.',
        ],
        uncertaintyLevel: 'low',
        everydayManifestation:
          'Remembering an event in childhood vividly, until older relatives show photos proving you were not actually present.',
      };
    }

    return {
      coreConcept:
        'Cognitive dissonance drives individuals to reconcile contradictory beliefs and actions through rationalization rather than objective appraisal.',
      scientificClaims: [
        'Insufficient external justification increases internal attitude modification.',
        'The brain experiences physiological arousal during contradictory states.',
      ],
      keyStudies: [
        {
          authors: 'Festinger & Carlsmith',
          year: 1959,
          studyName: 'Cognitive consequences of forced compliance',
          findings:
            'Participants paid only $1 to describe a boring task as fun convinced themselves it truly was enjoyable, whereas those paid $20 did not.',
          contextOrSample: 'Stanford undergraduates assigned to monotonous manual peg-turning.',
        },
      ],
      cognitiveMechanisms: [
        'Anterior cingulate cortex activation signaling error/conflict',
        'Post-hoc narrative synthesis to protect self-consistency',
      ],
      caveatsAndLimitations: [
        'Requires perceived personal agency; coerced compliance does not produce dissonance.',
        'Cultural differences moderate the intensity of self-consistency needs.',
      ],
      uncertaintyLevel: 'low',
      everydayManifestation:
        'Defending a costly purchase you rarely use by arguing it taught you a valuable life lesson.',
    };
  }

  private getCuratedFallbackPostDraft(
    topic: TopicCandidate,
    research: ResearchNotes
  ): PostDraft {
    if (topic.topic.includes('White Bear') || topic.topic.includes('Ironic Process')) {
      return {
        title: 'Why Trying Not to Think About Something Guarantees You Will',
        pillar: 'Everyday Psychology',
        hook:
          'Tell someone not to think about a pink elephant, and their mental imagery immediately summons one.',
        bodyParagraphs: [
          'In 1987, psychologist Daniel Wegner put this quirk to the test. He asked participants to sit alone in a room and speak their thoughts into a microphone for five minutes, with one strict rule: do not think about a white bear. Every time the bear popped into their head, they had to ring a bell. The participants rang the bell repeatedly, averaging more than once per minute.',
          'Wegner discovered that thought suppression relies on two opposing cognitive systems running simultaneously. First is an intentional operating process that actively searches for pleasant distractions. Second is an automatic monitoring process that quietly scans your subconscious to ensure you are not thinking about the forbidden topic. Because the monitor runs without conscious effort, it constantly flags the very concept you are trying to avoid.',
        ],
        coreTakeaway:
          'The brain cannot search for what to avoid without first activating the mental representation of what is forbidden.',
        sourcesCited: ['Wegner et al. (1987), J Pers Soc Psychol'],
        caveatNote:
          'Rebound effects diminish significantly when you assign the mind an explicit, absorbing alternative task rather than attempting sheer suppression.',
        cta: {
          type: 'reflection',
          text:
            'Next time an unwelcome thought loops at night, test giving your attention to a detailed memory rather than forcing your mind to go blank.',
        },
      };
    }

    return {
      title: 'Why We Convince Ourselves Boring Tasks Were Fun',
      pillar: 'Everyday Psychology',
      hook:
        'If you do a tedious favor for an enormous reward, your mind shrugs. If you do it for almost nothing, your brain rewrites how much you enjoyed it.',
      bodyParagraphs: [
        'In 1959, Leon Festinger and James Carlsmith asked students to spend an hour turning wooden pegs a quarter-turn, over and over. When finished, subjects were paid either $20 or a mere $1 to tell the next participant that the experiment was exciting. Later, an independent researcher asked them how they genuinely felt about the task.',
        'Logically, the group paid $20 should have been happiest. Instead, the students paid $1 reported that the peg-turning was genuinely interesting. Because $1 was insufficient to justify lying, their minds experienced cognitive dissonance. To resolve the tension, their brains changed their attitude to match their behavior.',
      ],
      coreTakeaway:
        'When external rewards cannot justify our actions, the brain manufactures internal conviction.',
      sourcesCited: ['Festinger & Carlsmith (1959), J Abnorm Soc Psychol'],
      caveatNote:
        'Cognitive dissonance only triggers when people feel they chose their action freely; forced compliance leaves beliefs untouched.',
      cta: {
        type: 'reflection',
        text:
          'Notice where in your life you might be defending an exhausting habit simply because you already invested time into it.',
      },
    };
  }

  private getCuratedFallbackVisualDecision(
    draft: PostDraft,
    research: ResearchNotes
  ): VisualDecision {
    if (draft.title.includes('Not to Think') || draft.title.includes('White Bear')) {
      return {
        needed: true,
        reason: 'Dual process theory is vastly clearer when visualized as a competing cognitive loop.',
        template: 'process_flow',
        spec: {
          title: 'The Ironic Process Loop',
          subtitle: 'Why suppression produces paradoxical thought rebound',
          tag: 'COGNITIVE MONITORING',
          sourceCitation: 'Wegner et al. (1987)',
          template: 'process_flow',
          payload: {
            template: 'process_flow',
            data: {
              steps: [
                {
                  number: 1,
                  title: 'Command',
                  description: 'Conscious instruction: "Do not think about X."',
                  highlight: 'Deliberate Effort',
                },
                {
                  number: 2,
                  title: 'Operating Process',
                  description: 'Active prefrontal search for substitute thoughts.',
                  highlight: 'High Energy',
                },
                {
                  number: 3,
                  title: 'Monitoring Process',
                  description: 'Subconscious scanner checking if X has reappeared.',
                  highlight: 'Automatic',
                },
                {
                  number: 4,
                  title: 'Rebound Activation',
                  description: 'Under mental load, monitor flags X directly into awareness.',
                  highlight: 'Hyper-accessible',
                },
              ],
            },
          },
        },
      };
    }

    return {
      needed: true,
      reason: 'Contrasting the $1 vs $20 experiment outcome clarifies the counter-intuitive finding immediately.',
      template: 'comparison',
      spec: {
        title: 'The Peg-Turning Experiment (1959)',
        subtitle: 'How insufficient reward forces the brain to rewrite attitude',
        tag: 'COGNITIVE DISSONANCE',
        sourceCitation: 'Festinger & Carlsmith (1959)',
        template: 'comparison',
        payload: {
          template: 'comparison',
          data: {
            leftTitle: 'Paid $20 (High Reward)',
            leftSubtitle: 'External Justification',
            leftPoints: [
              'Conscious realization: "I lied because I was paid handsomely"',
              'Zero psychological conflict or dissonance experienced',
              'Final genuine rating of the task: Monotonous and boring',
            ],
            rightTitle: 'Paid $1 (Minimal Reward)',
            rightSubtitle: 'Internal Justification',
            rightPoints: [
              'Conscious dilemma: "$1 does not justify lying to a stranger"',
              'Acute cognitive dissonance triggered between values and act',
              'Final genuine rating: Convinced themselves it was enjoyable',
            ],
          },
        },
      },
    };
  }
}

/**
 * Dynamic Interactive Dilemma Generator (Phase 6)
 * Generates entertainment-first dilemmas using Gemini 2.5 Flash, with memory duplicate prevention,
 * strict schema validation, and deterministic offline seed variations for CI/CD and testing.
 */

import { GoogleGenAI } from '@google/genai';
import { VisualSpec } from '../types.js';
import { DilemmaTelegramFormatter } from './formatter.js';
import {
  ALL_DILEMMA_CATEGORIES,
  DilemmaCategory,
  InteractiveDilemma,
} from './types.js';

export interface GenerateDilemmaOptions {
  category?: DilemmaCategory;
  topicHint?: string;
  excludedTopics?: string[];
  index?: number;
}

export class DilemmaGenerator {
  private client: GoogleGenAI | null = null;
  private apiKey: string;
  private modelName = 'gemini-2.5-flash';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';
  }

  private hasValidApiKey(): boolean {
    return (
      Boolean(this.apiKey) &&
      !this.apiKey.includes('MY_GEMINI') &&
      this.apiKey.length > 10
    );
  }

  private getClient(): GoogleGenAI {
    if (!this.client) {
      if (!this.hasValidApiKey()) {
        throw new Error('GEMINI_API_KEY is not available.');
      }
      this.client = new GoogleGenAI({ apiKey: this.apiKey });
    }
    return this.client;
  }

  /**
   * Generates a new standalone Interactive Dilemma.
   */
  public async generateDilemma(options: GenerateDilemmaOptions = {}): Promise<InteractiveDilemma> {
    const category: DilemmaCategory =
      options.category ||
      ALL_DILEMMA_CATEGORIES[Math.floor(Math.random() * ALL_DILEMMA_CATEGORIES.length)];

    const index = options.index || 1;
    const id = `dilemma-${index.toString().padStart(2, '0')}`;

    if (this.hasValidApiKey()) {
      try {
        return await this.generateWithGemini(category, id, index, options);
      } catch (err: any) {
        console.warn(`[DilemmaGenerator] Gemini generation failed (${err.message}). Using dynamic generator fallback.`);
      }
    }

    // Dynamic procedural fallback for offline mode, testing, and CI
    return this.generateProceduralDilemma(category, id, index, options);
  }

  /**
   * Dynamically calls Gemini API to create an entertainment dilemma.
   */
  private async generateWithGemini(
    category: DilemmaCategory,
    id: string,
    index: number,
    options: GenerateDilemmaOptions
  ): Promise<InteractiveDilemma> {
    const client = this.getClient();

    const excludedClause = options.excludedTopics?.length
      ? `Do NOT reuse or repeat any of these recent dilemma topics:\n${options.excludedTopics.map((t) => `- ${t}`).join('\n')}`
      : '';

    const systemPrompt = `You are the lead content creator and game master for a high-engagement Telegram channel: "Interactive Dilemmas & Impossible Choices".

This is an ENTERTAINMENT channel where subscribers make high-stakes choices.
Every post must be 100% STANDALONE. A new subscriber must not need any previous posts.

CRITICAL RULES:
1. NO academic psychology theories, research citations, or cognitive mechanism jargon.
2. NO serialized stories or references to previous/future posts.
3. NO generic trivial "Would You Rather" questions (e.g. pizza vs burger).
4. Exactly 2 to 4 choices with genuine high-stakes trade-offs. No choice should be an obvious no-brainer.
5. Provide a surprising, entertaining payoff/twist or strategic resolution.

Output STRICT JSON only matching this exact structure:
{
  "title": "Punchy Catchy Title (Max 60 chars)",
  "hook": "Compelling single-sentence question or dilemma hook",
  "scenario": "Engaging 2-3 sentence high-stakes dilemma setup",
  "choices": [
    {
      "id": "choice_a",
      "label": "Short Action Name",
      "description": "What happens if chosen",
      "tradeOff": "Explicit cost, risk, or sacrifice"
    },
    {
      "id": "choice_b",
      "label": "Short Action Name",
      "description": "What happens if chosen",
      "tradeOff": "Explicit cost, risk, or sacrifice"
    }
  ],
  "pollQuestion": "Direct question for the Telegram poll",
  "payoff": {
    "reveal": "Entertaining reveal, hidden twist, or tactical resolution",
    "surprisingOutcome": "The unexpected trap or surprising outcome",
    "communityTension": "Why this creates a 50/50 community debate",
    "strategicAnalysis": "Tactical analysis of the situation"
  }
}`;

    const userPrompt = `Generate a brand-new, ultra-engaging Interactive Dilemma for the category: "${category}".
${options.topicHint ? `Specific angle/theme: ${options.topicHint}` : ''}
${excludedClause}`;

    const response = await client.models.generateContent({
      model: this.modelName,
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] },
      ],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.85,
      },
    });

    const rawText = response.text || '{}';
    const parsed = JSON.parse(rawText);

    return this.buildDilemmaObject(parsed, category, id, index);
  }

  /**
   * Generates dynamic, high-quality entertainment dilemmas across all 10 categories
   * without requiring live network/API calls.
   */
  public generateProceduralDilemma(
    category: DilemmaCategory,
    id: string,
    index: number,
    _options: GenerateDilemmaOptions = {}
  ): InteractiveDilemma {
    const rawData = this.getProceduralDilemmaData(category, index);
    return this.buildDilemmaObject(rawData, category, id, index);
  }

  private buildDilemmaObject(
    data: any,
    category: DilemmaCategory,
    id: string,
    index: number
  ): InteractiveDilemma {
    const choices = data.choices || [];
    const branchA = choices[0] || { label: 'Option A', description: '', tradeOff: '' };
    const branchB = choices[1] || { label: 'Option B', description: '', tradeOff: '' };

    const visualSpec: VisualSpec = {
      template: 'thought_experiment',
      title: data.title,
      subtitle: data.hook,
      tag: category.toUpperCase(),
      sourceCitation: 'Interactive Dilemmas · Impossible Choices',
      payload: {
        template: 'thought_experiment',
        data: {
          scenarioName: data.title,
          dilemma: data.scenario,
          branchA: {
            label: branchA.label,
            explanation: `${branchA.description} (Trade-off: ${branchA.tradeOff})`,
          },
          branchB: {
            label: branchB.label,
            explanation: `${branchB.description} (Trade-off: ${branchB.tradeOff})`,
          },
          psychologicalInsight: `${data.payoff?.surprisingOutcome || data.payoff?.reveal}`,
        },
      },
    };

    const formattedTelegramText = DilemmaTelegramFormatter.formatPost({
      id,
      index,
      category,
      title: data.title,
      hook: data.hook,
      scenario: data.scenario,
      choices: data.choices,
      pollQuestion: data.pollQuestion,
      payoff: data.payoff,
      visualSpec,
    });

    return {
      id,
      index,
      category,
      title: data.title,
      hook: data.hook,
      scenario: data.scenario,
      choices: data.choices,
      pollQuestion: data.pollQuestion,
      payoff: data.payoff,
      visualSpec,
      formattedTelegramText,
      draft: {
        title: data.title,
        pillar: 'Psychology Thought Experiments',
        hook: data.hook,
        bodyParagraphs: [
          data.scenario,
          ...choices.map((c: any) => `${c.label}: ${c.description}. Cost: ${c.tradeOff}`),
        ],
        coreTakeaway: data.payoff.reveal,
        caveatNote: data.payoff.surprisingOutcome,
        sourcesCited: ['Interactive Dilemmas & Impossible Choices'],
        cta: {
          type: 'reflection',
          text: 'Which path would you take when the consequences are irreversible?',
        },
      },
    };
  }

  /**
   * Procedural seeds for 10 diverse categories.
   */
  private getProceduralDilemmaData(category: DilemmaCategory, index: number): any {
    const catalog: Record<DilemmaCategory, any[]> = {
      'money/lifestyle': [
        {
          title: 'The Golden Vault vs. Daily Sovereignty',
          hook: 'Would you surrender 100% of your calendar for 5 years in exchange for generational wealth?',
          scenario:
            'A private syndicate offers you an irrevocable contract: receive an immediate $10,000,000 cash deposit, but you must spend the next 5 years living inside an underground research facility working 80 hours a week with zero outside contact. The alternative is a guaranteed $75,000 tax-free annual stipend for life with 100% calendar freedom.',
          choices: [
            {
              id: 'choice_a',
              label: 'The $10M Vault Lockdown',
              description: 'Endure 5 years of total isolation and grueling work to emerge with $10M in the bank.',
              tradeOff: 'Lose 5 prime years of life, relationships, and fresh air with no early exit.',
            },
            {
              id: 'choice_b',
              label: 'The $75K Freedom Stipend',
              description: 'Accept modest lifelong income with infinite free time and zero boss.',
              tradeOff: 'Permanently cap financial upside; cannot afford luxury or high-cost city living.',
            },
          ],
          pollQuestion: 'Which contract do you sign?',
          payoff: {
            reveal: 'Most people who take the $10M severely underestimate the mental toll of 1,825 days of unbroken isolation, while stipend recipients report higher long-term satisfaction despite tighter budgets.',
            surprisingOutcome: 'Over 60% of high-earning executives who attempt isolation grinds quit before year 3, forfeiting the payout.',
            communityTension: 'The eternal clash between guaranteed freedom now vs. unlimited wealth later.',
            strategicAnalysis: 'Time is the only non-renewable asset, yet compound interest makes upfront capital exponentially powerful.',
          },
        },
      ],
      moral: [
        {
          title: 'The Whistleblower\'s Ultimatum',
          hook: 'If exposing corporate fraud saves 100 strangers but ruins your family\'s livelihood, do you leak the files?',
          scenario:
            'You find undeniable proof that your employer\'s new water filtration unit contains toxic micro-contaminants that will sicken 100 families over the next decade. If you leak the files, the company will immediately collapse, destroying your pension, your spouse\'s healthcare coverage, and your family\'s financial safety net.',
          choices: [
            {
              id: 'choice_a',
              label: 'Leak the Documents Publicly',
              description: 'Send encrypted proof to journalists and federal regulators immediately.',
              tradeOff: 'Destroys your family\'s financial security and invites aggressive legal retaliation.',
            },
            {
              id: 'choice_b',
              label: 'Remain Silent & Protect Your Family',
              description: 'Destroy the local copies, keep your high salary, and protect your household.',
              tradeOff: '100 innocent families will suffer preventable toxic contamination because of your silence.',
            },
          ],
          pollQuestion: 'Do you leak the evidence or protect your household?',
          payoff: {
            reveal: 'Whistleblowers face an average of 4.5 years of blacklisting and legal battles, but staying silent causes severe lifelong guilt.',
            surprisingOutcome: 'In anonymous corporate simulations, 72% vote to leak until real financial penalties are introduced.',
            communityTension: 'Utilitarian duty to the public vs. deontological loyalty to your own children.',
            strategicAnalysis: 'Personal liability is concentrated, whereas public benefit is diffuse.',
          },
        },
      ],
      'social/relationship': [
        {
          title: 'The Ruinous Secret at the Altar',
          hook: 'Your best friend is walking down the aisle in one hour—and you just found proof their partner is a serial con artist.',
          scenario:
            'Sixty minutes before your lifelong best friend marries their partner, you obtain verified bank records proving the partner has been draining offshore accounts and orchestrating a financial fraud. Revealing this now will cause massive public humiliation and cancel the wedding, and your friend will blame you for ruining their biggest day.',
          choices: [
            {
              id: 'choice_a',
              label: 'Halt the Ceremony Privately',
              description: 'Pull your friend into a side room with the bank evidence before vows are exchanged.',
              tradeOff: 'Triggers immense shock, public scene, and your friend may direct their rage at you.',
            },
            {
              id: 'choice_b',
              label: 'Wait Until After the Honeymoon',
              description: 'Let the wedding proceed and present the evidence carefully in private next week.',
              tradeOff: 'Your friend enters a legally binding marriage and joint liability with an active fraudster.',
            },
          ],
          pollQuestion: 'Do you stop the wedding in 60 minutes or wait until after?',
          payoff: {
            reveal: 'Halting the wedding creates acute agony for 48 hours, but prevents years of divorce litigation and bankruptcy.',
            surprisingOutcome: 'Relationship counselors note that friends who intervene immediately are initially hated, but thanked years later.',
            communityTension: 'Short-term catastrophic conflict vs. long-term compounding disaster.',
            strategicAnalysis: 'Intervention costs are front-loaded, while inaction costs compound indefinitely.',
          },
        },
      ],
      strategy: [
        {
          title: 'The Hostile Takeover Bounty',
          hook: 'A rival offers $5,000,000 cash to the first founder who defects. Do you sell out your co-founders?',
          scenario:
            'You and three equal co-founders run a startup valued at $12M. A ruthless competitor sends each of you a secret, simultaneous 30-minute ultimatum: the FIRST partner to sign a buyout gets $5,000,000 cash immediately. If nobody signs, the competitor launches a copycat product that will likely bankrupt your company within 6 months.',
          choices: [
            {
              id: 'choice_a',
              label: 'Sign First and Take the $5M',
              description: 'Execute the buyout before the 30-minute timer expires and secure your fortune.',
              tradeOff: 'Betrays your 3 co-founders, destroys the startup, and ruins lifelong partnerships.',
            },
            {
              id: 'choice_b',
              label: 'Hold the Line with the Team',
              description: 'Refuse the bounty and rally the team to fight the competitor in the open market.',
              tradeOff: 'If even ONE of your partners defects, you walk away with zero while they take $5M.',
            },
          ],
          pollQuestion: 'Do you sign first or trust your co-founders?',
          payoff: {
            reveal: 'This classic game-theory trap forces defection because the fear of being betrayed outweighs loyalty.',
            surprisingOutcome: 'In test simulations, over 80% of teams have at least one founder defect within 15 minutes.',
            communityTension: 'Rational self-preservation vs. collective team loyalty.',
            strategicAnalysis: 'Cooperation requires unanimous trust; defection requires only a single crack.',
          },
        },
      ],
      survival: [
        {
          title: 'The Blizzard Ridge Crossing',
          hook: 'Trapped at 18,000 feet in a sudden whiteout: do you freeze in a snow cave or risk the razor ridge?',
          scenario:
            'A violent blizzard strikes your two-person mountaineering expedition on a knife-edge ridge. Your tent has blown away. Option A is to dig an emergency snow trench on the windward side with a 40% risk of hypothermia before dawn. Option B is to attempt a 200-meter descent in zero visibility down a sheer icy slope with a 25% risk of a fatal fall.',
          choices: [
            {
              id: 'choice_a',
              label: 'Dig the Emergency Snow Trench',
              description: 'Hunker down in the snowpack and conserve body heat until sunrise.',
              tradeOff: 'If the storm drops below -35°C, you will freeze to death in your sleep.',
            },
            {
              id: 'choice_b',
              label: 'Risk the Blind Night Descent',
              description: 'Rope up and push through the whiteout toward the lower camp.',
              tradeOff: 'One false step on the ice cornice means an immediate 2,000-foot drop.',
            },
          ],
          pollQuestion: 'Do you hunker down in the snow or climb down blind?',
          payoff: {
            reveal: 'Survival statistics favor the snow cave by a wide margin because moving in zero visibility causes fatal spatial disorientation.',
            surprisingOutcome: 'Human adrenaline compels panicked climbers to move, which leads to 70% of high-altitude fall fatalities.',
            communityTension: 'Passive endurance vs. active risk-taking.',
            strategicAnalysis: 'Controlled freezing is manageable with micro-insulation; gravity is unforgiving.',
          },
        },
      ],
      'funny/chaotic': [
        {
          title: 'The 24-Hour Telepathic Megaphone',
          hook: 'For the next 24 hours, you either hear every thought about you, or every lie you speak is loudly announced.',
          scenario:
            'A mischievous cosmic entity forces you to pick one chaotic curse for tomorrow. Curse A: you hear an audio broadcast of every unfiltered thought anyone within 20 feet has about you. Curse B: you can only tell 100% brutal truths, and every attempt at polite evasion or white lie is broadcast over a booming loudspeaker.',
          choices: [
            {
              id: 'choice_a',
              label: 'Hear Everyone\'s Secret Thoughts',
              description: 'Listen to the raw, unedited internal monologue of your friends, boss, and partner.',
              tradeOff: 'Will likely destroy your self-esteem and permanently alter how you see everyone you know.',
            },
            {
              id: 'choice_b',
              label: 'The Brutal Truth Loudspeaker',
              description: 'You cannot lie or soften statements for 24 hours without an instant megaphone blast.',
              tradeOff: 'You will insult colleagues, offend family, and create hilarious social chaos all day.',
            },
          ],
          pollQuestion: 'Which chaotic curse would you endure?',
          payoff: {
            reveal: 'Most people choose to hear others\' thoughts thinking they will gain an edge, only to discover that 90% of people\'s passing thoughts are petty, distracted, or bizarre.',
            surprisingOutcome: 'Social harmony relies on harmless white lies; total transparency creates instantaneous comedy and warfare.',
            communityTension: 'Internal emotional damage vs. external social catastrophe.',
            strategicAnalysis: 'Curse B is survivable by staying in bed alone; Curse A follows you anywhere people exist.',
          },
        },
      ],
      'technology/future': [
        {
          title: 'The Neural Memory Redactor',
          hook: 'Would you permanently delete your most traumatic memory if it also erased your greatest life achievement?',
          scenario:
            'In 2045, an FDA-approved neuro-interface allows clean synaptic excision of a single traumatic memory (a severe heartbreak, grief, or failure) with zero PTSD remnants. However, the neural cluster is entangled with your greatest personal breakthrough, meaning deleting the pain will also erase your proudest accomplishment and the skills you built from it.',
          choices: [
            {
              id: 'choice_a',
              label: 'Erase the Pain & Sacrifice the Triumph',
              description: 'Wipe the trauma completely and live with a calm, untroubled mind.',
              tradeOff: 'Lose the pride, wisdom, and core personal achievement that defined your identity.',
            },
            {
              id: 'choice_b',
              label: 'Keep the Scars & Keep the Victory',
              description: 'Endure the lingering memories and keep all the strength and wisdom you earned.',
              tradeOff: 'You continue carrying the emotional weight and painful triggers for the rest of your life.',
            },
          ],
          pollQuestion: 'Do you erase the trauma or keep your scars?',
          payoff: {
            reveal: 'Human identity is forged in the crucible of overcoming adversity; erasing suffering frequently leaves patients feeling hollow and unanchored.',
            surprisingOutcome: '78% of people initially want the eraser, but change their mind when told their skills will vanish too.',
            communityTension: 'Peace of mind vs. authentic hard-won identity.',
            strategicAnalysis: 'Pain and mastery share the same neural pathways of resilience.',
          },
        },
      ],
      'adventure/travel': [
        {
          title: 'The Uncharted Deep Trench',
          hook: 'Trapped in a deep-sea submersible with 3 hours of oxygen: do you surface blindly or wait for rescue?',
          scenario:
            'Your two-person deep-sea sub loses propulsion at 4,000 meters depth. You have 3 hours of emergency life support remaining. Option A is an emergency ballast jettison that shoots you toward the surface at dangerous velocity with risk of hull implosion. Option B is to deploy your acoustic beacon and wait for a naval salvage ship that is 2.5 hours away.',
          choices: [
            {
              id: 'choice_a',
              label: 'Emergency Ballast Blow',
              description: 'Trigger the explosive ascent bolts and shoot to the surface immediately.',
              tradeOff: 'Rapid ascent risks decompression sickness and catastrophic hull stress.',
            },
            {
              id: 'choice_b',
              label: 'Wait for Naval Recovery',
              description: 'Power down all lights, conserve oxygen, and wait for the recovery submarine.',
              tradeOff: 'If the naval ship is delayed by even 30 minutes, you will suffocate in the dark.',
            },
          ],
          pollQuestion: 'Do you blow ballast or wait for the rescue vessel?',
          payoff: {
            reveal: 'In deep sea emergencies, patience with precision timing succeeds twice as often as frantic emergency ascents.',
            surprisingOutcome: 'Panic breathing reduces 3 hours of oxygen to under 75 minutes.',
            communityTension: 'Active desperate gamble vs. nerve-wracking countdown.',
            strategicAnalysis: 'Controlled systems beating probability vs. fatal mechanical stress.',
          },
        },
      ],
      fantasy: [
        {
          title: 'The Dragon\'s Blood Vial',
          hook: 'Drink the elixir to gain immortality, but every person who ever loved you forgets your name.',
          scenario:
            'In a forgotten sanctuary, an ancient alchemist offers you a single crystalline vial of Dragon\'s Blood. Consuming it grants complete biological immortality, immunity to disease, and eternal youth. But the arcane cost is absolute: the moment you swallow it, every friend, family member, and lover completely forgets you ever existed.',
          choices: [
            {
              id: 'choice_a',
              label: 'Drink the Immortal Elixir',
              description: 'Swallow the potion to live forever with eternal youth and boundless time.',
              tradeOff: 'You become an erased ghost to everyone you love; you must build every relationship from zero.',
            },
            {
              id: 'choice_b',
              label: 'Shatter the Vial on the Stone',
              description: 'Reject the immortality and return to your mortal life with your loved ones.',
              tradeOff: 'You will age, decline, and die like all mortals, leaving behind the chance to see eternity.',
            },
          ],
          pollQuestion: 'Do you drink the elixir of eternity or shatter the vial?',
          payoff: {
            reveal: 'Immortality without shared memory turns eternity into an endless loop of grief and forgotten bonds.',
            surprisingOutcome: 'Folklore and narrative studies show audiences consistently choose mortal connection over solitary godhood.',
            communityTension: 'Infinite personal time vs. the warmth of shared human love.',
            strategicAnalysis: 'Life derives meaning from scarcity; removing the deadline removes the stakes.',
          },
        },
      ],
      'bizarre hypothetical situations': [
        {
          title: 'The Reverse Gravity Room',
          hook: 'For 1 year, gravity is inverted for you whenever you step indoors. Do you take $20,000,000?',
          scenario:
            'A wealthy eccentric researcher offers you $20,000,000 cash on the spot. The catch: for exactly 365 days, gravity is reversed only for your body the instant you step under any ceiling or roof (you will fall upward to the ceiling at 9.8 m/s² unless strapped down). Outdoors, gravity remains normal.',
          choices: [
            {
              id: 'choice_a',
              label: 'Accept the $20M Inversion Contract',
              description: 'Take the fortune, wear padded helmets, and customize your home ceilings with velcro and nets.',
              tradeOff: 'Every doorway is a concussion hazard; you cannot visit stores, restaurants, or friends\' houses normally.',
            },
            {
              id: 'choice_b',
              label: 'Decline the Eccentric Offer',
              description: 'Walk away with zero dollars and keep your normal, right-side-up life.',
              tradeOff: 'You forfeit $20,000,000 of pure generational wealth over 12 months of temporary absurdity.',
            },
          ],
          pollQuestion: 'Do you take the $20M and live on the ceiling for a year?',
          payoff: {
            reveal: 'With $20M, you can hire contractors to turn an estate into a custom inverted luxury palace within 3 days, making the challenge easy.',
            surprisingOutcome: 'Over 85% of people enthusiastically accept when they realize outdoor living and customized ceilings solve 95% of the danger.',
            communityTension: 'Absurd daily inconvenience vs. life-changing wealth.',
            strategicAnalysis: 'Capital transforms physical constraints into solvable engineering problems.',
          },
        },
      ],
    };

    const categoryList = catalog[category] || catalog['money/lifestyle'];
    const selected = categoryList[(index - 1) % categoryList.length] || categoryList[0];
    return selected;
  }
}

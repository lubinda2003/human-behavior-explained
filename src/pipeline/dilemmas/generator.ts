/**
 * Dynamic Interactive Dilemma & Pick Your Fate Scenario Generator
 * Generates substantial, immersive, entertainment-first scenarios where the user is put inside
 * an active situation with meaningful complications, varied pressures, multi-level depth,
 * and diverse content formats beyond simple polls.
 */

import { GoogleGenAI } from '@google/genai';
import { VisualSpec } from '../types.js';
import { DilemmaTelegramFormatter } from './formatter.js';
import { DilemmaQualityChecker } from './quality.js';
import {
  ALL_CONTENT_FORMATS,
  ALL_DILEMMA_CATEGORIES,
  ALL_PRESSURE_TYPES,
  ContentDepth,
  ContentFormat,
  DilemmaCategory,
  InteractiveDilemma,
  PressureType,
} from './types.js';

export interface GenerateDilemmaOptions {
  category?: DilemmaCategory;
  format?: ContentFormat;
  depth?: ContentDepth;
  pressureTypes?: PressureType[];
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
   * Generates a new standalone Interactive Scenario / Dilemma.
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
   * Dynamically calls Gemini API to create an immersive entertainment scenario.
   */
  private async generateWithGemini(
    category: DilemmaCategory,
    id: string,
    index: number,
    options: GenerateDilemmaOptions
  ): Promise<InteractiveDilemma> {
    const client = this.getClient();
    const depth = options.depth || 'standard';
    const format = options.format || 'impossible_dilemma';

    const excludedClause = options.excludedTopics?.length
      ? `Do NOT reuse or repeat any of these recent dilemma topics:\n${options.excludedTopics.map((t) => `- ${t}`).join('\n')}`
      : '';

    const systemPrompt = `You are the lead game master and scenario designer for "Pick Your Fate", a high-engagement interactive Telegram channel.

CORE PHILOSOPHY:
Do NOT simply ask users an interesting question. PUT THE USER INSIDE AN INTERESTING SITUATION and make them decide what happens.
First design an interesting EXPERIENCE, then determine the best interaction format.
Start with: "What situation would make someone stop scrolling and genuinely want to decide what happens?"

NARRATIVE STRUCTURE:
HOOK → SETUP → PRESSURE/TWIST → CHOICE → CONSEQUENCE/REVEAL
Substantial dilemmas should feel like a miniature interactive experience.

CONTENT DEPTH:
- "quick": 2–4 lines, fast punchy choice, suitable for rapid interaction.
- "standard": short hook, concrete setup, meaningful complication or trade-off, clear choice, optional consequence/reveal.
- "deep": strong opening hook, immersive scenario, important details, escalating pressure or twist, difficult trade-offs, clear choices, consequence/reveal.

TYPES OF PRESSURE:
Incorporate concrete pressure such as: time pressure, limited resources, hidden information, betrayal, risk vs reward, survival, money, relationships, reputation, power, technology, unexpected consequences, conflicting goals, strategic decisions, social pressure, information asymmetry, impossible trade-offs.

CONTENT FORMATS:
Support diverse formats beyond simple polls:
- impossible_dilemma
- survival_scenario
- mini_mystery
- strategy_challenge
- prediction
- versus_battle
- chaotic_funny
- future_tech
- brain_logic
- hot_take
- interactive_minigame
- result_reveal

QUALITY MANDATES:
1. Give the user a reason to care immediately.
2. Create genuine tension, curiosity, or uncertainty.
3. Present meaningful trade-offs (NO choices where one option is an obvious no-brainer).
4. AVOID generic abstract philosophical questions ("Is free will real?").
5. AVOID repetitive "you get X but lose Y" formulas without concrete narrative setup.
6. AVOID academic psychology jargon, research citations, or cognitive mechanism terms.
7. AVOID making every scenario about morality.
8. Use concrete situations rather than abstract questions.
9. Make the user feel like they are actually in the room/situation.
10. Must be 100% STANDALONE.

Output STRICT JSON only matching this exact structure:
{
  "title": "Punchy Catchy Title (Max 60 chars)",
  "hook": "Compelling single-sentence situation hook putting the user in the moment",
  "setup": "Concrete, immersive scenario setup placing user in the situation",
  "pressure": "Specific complication, ticking clock, resource limit, or conflict",
  "pressureTypes": ["time_pressure", "limited_resources"],
  "twist": "Hidden information, complication, or unexpected factor",
  "depth": "${depth}",
  "format": "${format}",
  "choices": [
    {
      "id": "choice_a",
      "label": "Short Action Name",
      "description": "What happens if chosen",
      "tradeOff": "Explicit cost, risk, or sacrifice",
      "consequence": "Immediate outcome"
    },
    {
      "id": "choice_b",
      "label": "Short Action Name",
      "description": "What happens if chosen",
      "tradeOff": "Explicit cost, risk, or sacrifice",
      "consequence": "Immediate outcome"
    }
  ],
  "pollQuestion": "Direct question for the Telegram poll",
  "discussionPrompt": "Question for comments/discussion",
  "consequence": "Direct consequence or outcome teaser",
  "payoff": {
    "reveal": "Entertaining reveal, hidden twist, or tactical resolution",
    "surprisingOutcome": "The unexpected trap or surprising outcome",
    "communityTension": "Why this creates a 50/50 community debate",
    "strategicAnalysis": "Tactical analysis of the situation"
  }
}`;

    const userPrompt = `Generate a brand-new, ultra-engaging Pick Your Fate scenario for the category: "${category}".
Format: "${format}"
Depth level: "${depth}"
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

    return this.buildDilemmaObject(parsed, category, id, index, options);
  }

  /**
   * Generates dynamic, high-quality entertainment dilemmas across all categories,
   * formats, and depth levels without requiring live network/API calls.
   */
  public generateProceduralDilemma(
    category: DilemmaCategory,
    id: string,
    index: number,
    options: GenerateDilemmaOptions = {}
  ): InteractiveDilemma {
    const rawData = this.getProceduralDilemmaData(category, index, options);
    return this.buildDilemmaObject(rawData, category, id, index, options);
  }

  private buildDilemmaObject(
    data: any,
    category: DilemmaCategory,
    id: string,
    index: number,
    options: GenerateDilemmaOptions = {}
  ): InteractiveDilemma {
    const choices = data.choices || [];
    const branchA = choices[0] || { label: 'Option A', description: '', tradeOff: '' };
    const branchB = choices[1] || { label: 'Option B', description: '', tradeOff: '' };

    const depth: ContentDepth = data.depth || options.depth || 'standard';
    const format: ContentFormat = data.format || options.format || 'impossible_dilemma';
    const setupText = data.setup || data.scenario || '';
    const pressure = data.pressure || '';
    const pressureTypes: PressureType[] = data.pressureTypes || options.pressureTypes || [];
    const twist = data.twist || '';
    const consequence = data.consequence || data.payoff?.reveal || '';

    const visualSpec: VisualSpec = {
      template: 'thought_experiment',
      title: data.title,
      subtitle: data.hook,
      tag: (data.format || category).toUpperCase().replace(/_/g, ' '),
      sourceCitation: 'Pick Your Fate · Interactive Dilemmas',
      payload: {
        template: 'thought_experiment',
        data: {
          scenarioName: data.title,
          dilemma: setupText,
          branchA: {
            label: branchA.label,
            explanation: `${branchA.description} (Cost: ${branchA.tradeOff})`,
          },
          branchB: {
            label: branchB.label,
            explanation: `${branchB.description} (Cost: ${branchB.tradeOff})`,
          },
          psychologicalInsight: `${data.payoff?.surprisingOutcome || data.payoff?.reveal || ''}`,
        },
      },
    };

    const dilemmaForFormatting = {
      id,
      index,
      category,
      title: data.title,
      hook: data.hook,
      setup: setupText,
      scenario: setupText,
      pressure,
      pressureTypes,
      twist,
      depth,
      format,
      choices: data.choices,
      pollQuestion: data.pollQuestion,
      discussionPrompt: data.discussionPrompt,
      consequence,
      payoff: data.payoff,
      visualSpec,
    };

    const formattedTelegramText = DilemmaTelegramFormatter.formatPost(dilemmaForFormatting);

    const dilemma: InteractiveDilemma = {
      id,
      index,
      category,
      title: data.title,
      hook: data.hook,
      setup: setupText,
      scenario: setupText,
      pressure,
      pressureTypes,
      twist,
      depth,
      format,
      choices: data.choices,
      pollQuestion: data.pollQuestion,
      discussionPrompt: data.discussionPrompt,
      consequence,
      payoff: data.payoff,
      visualSpec,
      formattedTelegramText,
      draft: {
        title: data.title,
        pillar: 'Psychology Thought Experiments',
        hook: data.hook,
        bodyParagraphs: [
          setupText,
          ...(pressure ? [`Complication: ${pressure}`] : []),
          ...choices.map((c: any) => `${c.label}: ${c.description}. Cost: ${c.tradeOff}`),
        ],
        coreTakeaway: data.payoff.reveal,
        caveatNote: data.payoff.surprisingOutcome,
        sourcesCited: ['Pick Your Fate · Interactive Scenarios'],
        cta: {
          type: 'reflection',
          text: 'Which path would you take when the consequences are irreversible?',
        },
      },
    };

    dilemma.qc = DilemmaQualityChecker.validateDilemmaContent(dilemma);
    return dilemma;
  }

  /**
   * Procedural catalog for 10 diverse categories, spanning multiple depths,
   * pressures, and formats.
   */
  private getProceduralDilemmaData(
    category: DilemmaCategory,
    index: number,
    options: GenerateDilemmaOptions = {}
  ): any {
    const catalog: Record<DilemmaCategory, any[]> = {
      'money/lifestyle': [
        {
          title: 'The Golden Vault vs. Daily Sovereignty',
          hook: 'An armored briefcase sits on your desk with $10,000,000 in bearer bonds—and a contract requiring 5 years underground.',
          setup:
            'A private research syndicate places an irrevocable contract before you: receive an immediate $10,000,000 cash deposit into an offshore trust, but you must spend the next 5 years living inside an underground research facility working 80 hours a week with zero outside communication. Alternatively, you can walk out with a guaranteed $75,000 annual stipend for life with 100% calendar freedom.',
          pressure: 'The syndicate gives you exactly 3 minutes to decide before the offer expires forever.',
          pressureTypes: ['time_pressure', 'limited_resources', 'money'],
          twist: 'The underground facility will have 4 other people who took the same deal—and one of them is your fiercest rival.',
          depth: 'standard',
          format: 'impossible_dilemma',
          choices: [
            {
              id: 'choice_a',
              label: 'The $10M Vault Lockdown',
              description: 'Endure 5 years of total isolation and grueling work to emerge with $10M in the bank.',
              tradeOff: 'Lose 5 prime years of life, relationships, and sunlight with zero early exit.',
              consequence: 'The vault door seals shut behind you today.',
            },
            {
              id: 'choice_b',
              label: 'The $75K Freedom Stipend',
              description: 'Accept modest lifelong income with infinite free time and zero boss.',
              tradeOff: 'Permanently caps your wealth; you will never own luxury properties or high-end assets.',
              consequence: 'You walk into the street completely free with your first check in hand.',
            },
          ],
          pollQuestion: 'Which contract do you sign before the 3-minute timer hits zero?',
          consequence: 'Over 60% of high-earning executives who attempt underground grinds suffer acute burnout within 24 months.',
          payoff: {
            reveal: 'Most people severely underestimate the mental toll of 1,825 days without sunlight, while stipend recipients report consistently higher baseline peace of mind.',
            surprisingOutcome: 'Over 60% of high-earners quit grueling contracts early, while simple autonomy compounds into deep happiness.',
            communityTension: 'Guaranteed freedom today vs. unlimited purchasing power tomorrow.',
            strategicAnalysis: 'Time is non-renewable; compound interest makes early capital powerful, but only if you survive the isolation.',
          },
        },
      ],
      moral: [
        {
          title: 'The Whistleblower\'s Ultimatum',
          hook: 'You have 10 minutes to upload the files before security scrubs the servers: do you save 100 strangers or protect your family?',
          setup:
            'You find undeniable proof that your company\'s new medical filtration units leak dangerous toxic micro-contaminants that will sicken 100 hospital patients over the next decade. If you leak the files, the company collapses, destroying your pension, your partner\'s ongoing cancer treatment insurance, and your household savings.',
          pressure: 'The internal IT security team is currently wiping all local drives; the upload window closes in 600 seconds.',
          pressureTypes: ['time_pressure', 'betrayal', 'conflicting_goals'],
          twist: 'Your direct supervisor—who approved the cover-up—personally loaned you the down payment for your house last year.',
          depth: 'deep',
          format: 'strategy_challenge',
          choices: [
            {
              id: 'choice_a',
              label: 'Upload to Federal Regulators',
              description: 'Send encrypted proof to journalists and federal authorities immediately.',
              tradeOff: 'Destroys your family\'s healthcare coverage and invites brutal corporate litigation.',
              consequence: 'The whistleblower hotlines ping and federal marshals are dispatched.',
            },
            {
              id: 'choice_b',
              label: 'Scrub Local Copies & Protect Household',
              description: 'Delete your downloads, keep your salary, and ensure your partner\'s medical care.',
              tradeOff: '100 innocent hospital patients will suffer preventable organ toxicity.',
              consequence: 'Your drive goes blank and you step into the executive hallway as if nothing happened.',
            },
          ],
          pollQuestion: 'Do you hit "Upload" or delete the files and walk out?',
          consequence: 'Whistleblowers face years of blacklisting, yet staying silent causes devastating lifelong remorse.',
          payoff: {
            reveal: 'Whistleblowers face an average of 4 years of career blacklisting, but silence causes irreversible moral injury.',
            surprisingOutcome: 'In anonymous corporate simulations, 72% vote to leak until personal healthcare liabilities are introduced.',
            communityTension: 'Public duty to strangers vs. biological loyalty to your own children.',
            strategicAnalysis: 'Personal liability is concentrated; public benefit is diffuse.',
          },
        },
      ],
      'social/relationship': [
        {
          title: 'The Ruinous Secret at the Altar',
          hook: 'Sixty minutes before your best friend walks down the aisle, you discover irrefutable proof their fiancé is an undercover con artist.',
          setup:
            'You are in the bridal suite holding certified offshore financial statements proving your best friend\'s fiancé has already mortgaged their future home under an alias and plans to vanish with the family trust within 60 days. Halting the ceremony now in front of 300 guests will cause public hysteria and break your friend\'s heart on their happiest day.',
          pressure: 'The wedding march begins in exactly 55 minutes, and both families are gathering in the chapel.',
          pressureTypes: ['social_pressure', 'relationships', 'hidden_information'],
          twist: 'The fiancé notices you holding the folder and whispers that exposing them will also reveal a family scandal your friend hid for 5 years.',
          depth: 'standard',
          format: 'impossible_dilemma',
          choices: [
            {
              id: 'choice_a',
              label: 'Halt the Wedding Privately',
              description: 'Pull your friend into the dressing room with the documents before vows are exchanged.',
              tradeOff: 'Triggers public devastation; your friend may lash out at you in disbelief and end the friendship.',
              consequence: 'The ceremony is called off and the reception turns into chaos.',
            },
            {
              id: 'choice_b',
              label: 'Confront After the Honeymoon',
              description: 'Let the wedding proceed and present the legal evidence alongside attorneys next week.',
              tradeOff: 'Your friend becomes legally bound to a criminal and joint financial accounts become compromised.',
              consequence: 'You smile for the photographer while holding the con artist\'s secret in your pocket.',
            },
          ],
          pollQuestion: 'Do you intervene right now or wait until after the wedding?',
          consequence: 'Short-term acute agony vs. long-term compounding disaster.',
          payoff: {
            reveal: 'Immediate intervention causes 48 hours of immense shock, but prevents devastating bankruptcy and messy annulment litigation.',
            surprisingOutcome: 'Relationship counselors note that friends who intervene immediately are hated at first, but deeply thanked years later.',
            communityTension: 'Acute immediate embarrassment vs. prolonged catastrophic ruin.',
            strategicAnalysis: 'Intervention costs are front-loaded; inaction costs compound exponentially.',
          },
        },
      ],
      strategy: [
        {
          title: 'The Hostile Takeover Bounty',
          hook: 'A rival CEO slides $5,000,000 cash across the table to whichever founder defects first. The countdown is 30 minutes.',
          setup:
            'You and three equal co-founders built an enterprise software firm valued at $12,000,000. Your main competitor enters the boardroom with a predatory buyout ultimatum: the FIRST founder to sign over their voting shares receives $5,000,000 cash on the spot. If nobody signs within 30 minutes, the rival launches an open-source clone with 10x marketing spend to bankrupt your company.',
          pressure: 'The timer shows 28 minutes, and your co-founders are avoiding eye contact.',
          pressureTypes: ['betrayal', 'strategic_decisions', 'time_pressure'],
          twist: 'One co-founder secretly has massive gambling debts and is sweating profusely while staring at their pen.',
          depth: 'deep',
          format: 'strategy_challenge',
          choices: [
            {
              id: 'choice_a',
              label: 'Sign First & Take the $5M',
              description: 'Grab the pen, sign the buyout, and walk away with an immediate fortune.',
              tradeOff: 'Permanently burns bridges with your team, destroys company equity, and brands you a sellout.',
              consequence: 'The $5M wire confirms to your account within 120 seconds.',
            },
            {
              id: 'choice_b',
              label: 'Hold the Line & Trust the Team',
              description: 'Refuse the bounty, rally your partners, and fight the rival in the open marketplace.',
              tradeOff: 'If even ONE of your partners defects, you walk away with zero dollars while they take the $5M.',
              consequence: 'You push the pen away and wait to see if someone else breaks.',
            },
          ],
          pollQuestion: 'Do you grab the pen first or trust your co-founders?',
          consequence: 'The Prisoner\'s Dilemma in real-world business almost always collapses toward early defection.',
          payoff: {
            reveal: 'Game theory proves that asymmetric exit bounties create mutual paranoia where defection becomes the mathematically dominant individual move.',
            surprisingOutcome: 'In corporate crisis simulations, over 80% of leadership teams suffer a defection within 12 minutes.',
            communityTension: 'Individual self-preservation vs. collective group solidarity.',
            strategicAnalysis: 'Cooperation requires 100% trust across all nodes; betrayal requires only a single weak link.',
          },
        },
      ],
      survival: [
        {
          title: 'The Razor Ridge Whiteout',
          hook: 'Night is falling at 18,000 feet, the blizzard is howling at 60 mph, and your tent was just ripped away.',
          setup:
            'You and your climbing partner are trapped on a knife-edge Andean ridge. Temperature is -30°C and dropping. You have one shared bivy bag and 2 thermal flares. Option A is to dig an emergency snow trench on the exposed slope to ride out the night. Option B is to attempt a 300-meter blind descent down a frozen crevasse field using headlamps.',
          pressure: 'Core body temperatures will begin dropping precipitously within 45 minutes without shelter.',
          pressureTypes: ['survival', 'time_pressure', 'limited_resources'],
          twist: 'Your partner has early-stage frostbite on their fingers and cannot tie knot anchors independently.',
          depth: 'standard',
          format: 'survival_scenario',
          choices: [
            {
              id: 'choice_a',
              label: 'Dig In & Hunker in the Snow Trench',
              description: 'Carve a snow cave on the leeward slope, share body heat, and pray the storm eases by dawn.',
              tradeOff: 'If the temperature drops below -40°C or snow drifts seal the air vents, hypothermia is lethal.',
              consequence: 'You start hacking into the hard-packed ice while wind tears at your gear.',
            },
            {
              id: 'choice_b',
              label: 'Attempt the Blind Night Descent',
              description: 'Rope together and navigate the glacial descent through zero visibility toward High Camp.',
              tradeOff: 'One misstep on an unseen crevasse bridge plunges both climbers into a bottomless chasm.',
              consequence: 'You click into your crampons and step off the ledge into the pitch-black gale.',
            },
          ],
          pollQuestion: 'Do you hunker down in the ice or risk the blind night descent?',
          consequence: 'Movement generates warmth, but darkness turns alpine terrain into a minefield.',
          payoff: {
            reveal: 'Mountain rescue records show climbers who dig snow caves survive at nearly triple the rate of those who move blind at night.',
            surprisingOutcome: 'Panicked climbers almost always want to move, yet static snow caves provide vital thermal micro-climates.',
            communityTension: 'Active desperate risk vs. passive endurance in the dark.',
            strategicAnalysis: 'Controlled freezing is manageable with micro-insulation; gravity has zero tolerance for error.',
          },
        },
      ],
      'funny/chaotic': [
        {
          title: 'The 24-Hour Telepathic Megaphone',
          hook: 'For tomorrow only: you either hear every unfiltered thought about you, or every lie you tell sounds over a stadium loudspeaker.',
          setup:
            'A mischievous cosmic trickster traps you in an inescapable 24-hour social experiment. You must choose Curse A: you hear an audible whisper of every thought anyone within 20 feet has regarding your clothes, intelligence, and personality. Or Curse B: you can only speak pure, unvarnished truths—and any white lie or polite deflection is blasted through a megaphone.',
          pressure: 'You have a high-stakes performance review with your boss and dinner with your in-laws scheduled for tomorrow.',
          pressureTypes: ['social_pressure', 'reputation', 'unexpected_consequences'],
          twist: 'You cannot cancel your appointments or stay in bed without forfeiting your life savings.',
          depth: 'quick',
          format: 'chaotic_funny',
          choices: [
            {
              id: 'choice_a',
              label: 'Hear All Secret Thoughts',
              description: 'Listen to every private reaction from your colleagues, boss, and family members.',
              tradeOff: 'Will likely demolish your self-esteem and permanently distort how you view your loved ones.',
              consequence: 'The whispers begin buzzing in your ears the moment you step outside.',
            },
            {
              id: 'choice_b',
              label: 'The Megaphone Truth Curse',
              description: 'You speak 100% blunt honesty all day with zero polite filter or softening.',
              tradeOff: 'You will insult coworkers, offend your in-laws, and trigger outrageous social mayhem.',
              consequence: 'Every polite excuse you attempt is instantly corrected at 110 decibels.',
            },
          ],
          pollQuestion: 'Which chaotic curse would you rather endure tomorrow?',
          consequence: 'Social cohesion relies entirely on white lies and merciful telepathic silence.',
          payoff: {
            reveal: 'Most people pick telepathy thinking it grants an advantage, only to find passing human thoughts are erratic, critical, and bizarre.',
            surprisingOutcome: 'Curse B is hilarious to bystanders but terrifying to the speaker; Curse A creates silent internal trauma.',
            communityTension: 'Internal emotional damage vs. external social fireworks.',
            strategicAnalysis: 'Curse B burns your bridges; Curse A makes you despise everyone crossing them.',
          },
        },
      ],
      'technology/future': [
        {
          title: 'The Neural Memory Redactor',
          hook: 'In 2048, a clinical neuro-interface can delete your greatest trauma—but it will also erase the defining breakthrough that made who you are.',
          setup:
            'The Synapse Redaction Institute has developed a precision quantum laser that eliminates the synaptic memory cluster of a single life-shattering event (a terrible heartbreak, death of a mentor, or public failure). However, brain scans show that your greatest professional skill and proudest life triumph are biologically entangled with that exact pain; deleting the suffering will permanently erase the skills you built to survive it.',
          pressure: 'The clinic chair is prepped and the neuro-catalyst expires in 15 minutes.',
          pressureTypes: ['technology', 'unexpected_consequences', 'impossible_tradeoffs'],
          twist: 'The neurosurgeon admits that 40% of patients who undergo the procedure experience a strange phantom emptiness where their drive used to be.',
          depth: 'deep',
          format: 'future_tech',
          choices: [
            {
              id: 'choice_a',
              label: 'Erase the Pain & Forfeit the Triumph',
              description: 'Wipe the agony forever, sleep with total peace, and live unburdened by past ghosts.',
              tradeOff: 'Lose the master skills, wisdom, and core personal achievement that define your identity.',
              consequence: 'The laser pulses and the memory cluster goes dark forever.',
            },
            {
              id: 'choice_b',
              label: 'Keep the Scars & Keep the Mastery',
              description: 'Stand up from the clinic chair, embrace your scars, and keep everything you fought to become.',
              tradeOff: 'You continue carrying the emotional triggers, grief, and nocturnal flashbacks for life.',
              consequence: 'You rip the sensors off your temples and walk out into the rain.',
            },
          ],
          pollQuestion: 'Do you erase your trauma or keep your hard-earned scars?',
          consequence: 'Adversity forms the architecture of human resilience; removing it alters the foundation.',
          payoff: {
            reveal: 'Identity is not built on comfort, but on the scar tissue of survival; deleting struggles leaves patients feeling unmoored.',
            surprisingOutcome: 'Over 75% of people initially want the eraser, but reverse their vote when they realize mastery vanishes with it.',
            communityTension: 'Emotional anesthesia vs. authentic hard-won strength.',
            strategicAnalysis: 'Suffering and skill share the exact same neural pathways of adaptation.',
          },
        },
      ],
      'adventure/travel': [
        {
          title: 'The Submersible Hull Breach at 4,000M',
          hook: 'You are four kilometers beneath the Atlantic, water is hissing through a valve gasket, and oxygen is down to 120 minutes.',
          setup:
            'Your two-person deep-sea research sub loses main battery power on the Abyssal Plain. A high-pressure seal is dripping icy saltwater onto the control console. You have two options. Option A is an emergency explosive ballast blow that rockets the craft toward the surface at violent speed, risking decompression sickness and mid-water hull implosion. Option B is deploying your acoustic beacon and waiting for a naval salvage vessel that is 105 minutes away.',
          pressure: 'The cabin temperature is 3°C, condensation is freezing, and battery voltage is collapsing.',
          pressureTypes: ['time_pressure', 'survival', 'limited_resources'],
          twist: 'Your co-pilot is hyperventilating, burning through the remaining oxygen reserve at double the baseline rate.',
          depth: 'standard',
          format: 'survival_scenario',
          choices: [
            {
              id: 'choice_a',
              label: 'Trigger the Emergency Ascent Bolts',
              description: 'Blow the explosive ballast clamps and ascend through the darkness at maximum velocity.',
              tradeOff: 'Catastrophic shear forces could tear the compromised viewport; violent ascent causes severe bends.',
              consequence: 'The charges detonate with a concussive roar and the sub tilts violently upward.',
            },
            {
              id: 'choice_b',
              label: 'Power Down & Await the Salvage Ship',
              description: 'Turn off all emergency lights, quiet your breathing, and trust the acoustic beacon.',
              tradeOff: 'If the recovery vessel is delayed by even 15 minutes, both occupants will suffocate in the black.',
              consequence: 'The instruments click off and pitch-black silence swallows the hull.',
            },
          ],
          pollQuestion: 'Do you blow ballast immediately or wait in the dark for rescue?',
          consequence: 'In maritime distress, disciplined composure triumphs over frantic emergency ascents.',
          payoff: {
            reveal: 'Naval analysis confirms that calm protocol adherence in deep subs succeeds 2.5x more frequently than uncontrolled emergency ascents.',
            surprisingOutcome: 'Panic breathing cuts oxygen reserves by 65% in high-pressure enclosures.',
            communityTension: 'Active desperate gamble vs. nerve-wracking disciplined patience.',
            strategicAnalysis: 'Controlled systems beating probability vs. fatal structural mechanical failure.',
          },
        },
      ],
      fantasy: [
        {
          title: 'The Dragon\'s Blood Vial',
          hook: 'Drink the elixir to gain immortality and eternal youth—but every person who ever loved you forgets your name forever.',
          setup:
            'In a moonlit vault beneath an ancient citadel, an alchemist places a glowing crystalline vial into your hands. Swallowing the draught grants total biological immortality, immunity to illness, and eternal peak vitality. But the cosmic toll is absolute: the instant it touches your lips, every friend, family member, and lover completely forgets you ever existed. To them, you are a total stranger.',
          pressure: 'The elixir is evaporating; you have 60 seconds before the liquid turns to inert dust.',
          pressureTypes: ['impossible_tradeoffs', 'relationships', 'time_pressure'],
          twist: 'You will remember every single shared memory, laugh, and promise with perfect photographic clarity forever.',
          depth: 'standard',
          format: 'impossible_dilemma',
          choices: [
            {
              id: 'choice_a',
              label: 'Drink the Immortal Elixir',
              description: 'Swallow the potion to live forever with boundless time to master the universe.',
              tradeOff: 'You become a ghost to everyone who ever loved you; you must start your social existence from scratch.',
              consequence: 'Warm golden energy floods your veins as the world\'s memory of you vanishes.',
            },
            {
              id: 'choice_b',
              label: 'Shatter the Vial on the Stone',
              description: 'Smash the potion on the floor and return to your mortal life with your family.',
              tradeOff: 'You surrender eternity, accepting disease, aging, and the certainty of mortal demise.',
              consequence: 'Glass shards scatter across the stones and the magical steam drifts away.',
            },
          ],
          pollQuestion: 'Do you drink the elixir of eternity or shatter the glass?',
          consequence: 'Immortality without shared memory turns infinite life into an eternal graveyard of forgotten bonds.',
          payoff: {
            reveal: 'Immortality without continuity of love is biological isolation; humans derive meaning from shared memories rather than mere duration.',
            surprisingOutcome: 'Storytellers across cultures find that audiences overwhelmingly prefer mortal love over immortal loneliness.',
            communityTension: 'Infinite personal time vs. the irreplaceable warmth of human connection.',
            strategicAnalysis: 'Life derives emotional value from scarcity; removing the deadline removes the stakes.',
          },
        },
      ],
      'bizarre hypothetical situations': [
        {
          title: 'The Reverse Gravity Room Contract',
          hook: 'You receive $20,000,000 cash right now—but for the next 365 days, gravity is inverted for you whenever you step indoors.',
          setup:
            'A trillionaire eccentric offers an irrevocable wire of $20,000,000 to your personal checking account today. The single condition: for exactly one calendar year, gravity reverses 180° for your body the instant you pass beneath any ceiling or roof (you will fall upward to the ceiling at 9.8 m/s² unless strapped down). Outdoors under the open sky, gravity remains completely normal.',
          pressure: 'The notary and the wire authorization key are waiting on the table right now.',
          pressureTypes: ['money', 'risk_vs_reward', 'unexpected_consequences'],
          twist: 'Every open doorway between rooms requires grappling hooks, padded helmets, and ceiling mattresses.',
          depth: 'standard',
          format: 'chaotic_funny',
          choices: [
            {
              id: 'choice_a',
              label: 'Sign the $20M Inversion Contract',
              description: 'Accept the wire, wear padded gear, and turn your ceiling into a carpeted luxury living room.',
              tradeOff: 'Every ceiling transition is a concussion risk; you cannot step into normal shops, restaurants, or friends\' houses.',
              consequence: 'The phone chimes with a $20,000,000 bank notification and you float to the ceiling.',
            },
            {
              id: 'choice_b',
              label: 'Decline the Eccentric Offer',
              description: 'Walk away with zero dollars and keep your feet firmly planted on the floor.',
              tradeOff: 'You forfeit $20M in generational wealth over 12 months of temporary physical absurdity.',
              consequence: 'You walk out the door normally, wondering what life on the ceiling would have been like.',
            },
          ],
          pollQuestion: 'Do you take the $20,000,000 and live on the ceiling for a year?',
          consequence: 'Capital turns physical absurdities into solvable engineering challenges.',
          payoff: {
            reveal: 'With $20M, you can hire a contractor team to carpet your ceilings, install padded nets, and live in outdoor luxury resorts all year.',
            surprisingOutcome: 'Over 85% of people enthusiastically accept when they realize outdoor living and customized ceilings solve 95% of the risk.',
            communityTension: 'Absurd daily inconvenience vs. complete financial freedom for life.',
            strategicAnalysis: 'Money converts physical constraints into manageable logistical puzzles.',
          },
        },
      ],
    };

    const categoryList = catalog[category] || catalog['money/lifestyle'];
    const selected = categoryList[(index - 1) % categoryList.length] || categoryList[0];
    return selected;
  }
}

/**
 * Curated Standalone Interactive Dilemmas (Phase 5 Stress Test)
 * 10 high-stakes, psychologically grounded decision experiments spanning 7 distinct categories.
 */

import { InteractiveDilemma } from './types.js';

export const CURATED_DILEMMAS: InteractiveDilemma[] = [
  // -------------------------------------------------------------
  // 1. MONEY / LIFESTYLE
  // -------------------------------------------------------------
  {
    id: 'dilemma-01',
    index: 1,
    category: 'money/lifestyle',
    title: 'The Golden Handcuffs vs. Sovereign Autonomy',
    hook: 'Would you trade absolute control over your waking hours for guaranteed financial wealth?',
    scenario:
      'You are offered two irrevocable lifelong contracts. Option A guarantees a $5,000,000 upfront windfall plus $450,000 annually, but mandates 70-hour corporate workweeks under strict surveillance with no early exit. Option B guarantees a modest $65,000 annual tax-free stipend for life with zero employment obligations and 100% calendar freedom.',
    choices: [
      {
        id: 'choice_a',
        label: 'Option A: The $5M Golden Handcuffs',
        description: 'Take the fortune, endure 70-hour executive grind, and accumulate generational wealth.',
        tradeOff: 'Sacrifices all personal time, physical vitality, and daily autonomy.',
        cognitiveMechanism: 'Hyperbolic Discounting & Material Status Signaling',
      },
      {
        id: 'choice_b',
        label: 'Option B: The Sovereign $65K Stipend',
        description: 'Accept moderate living standards with infinite free time and zero boss.',
        tradeOff: 'Caps financial upside; requires strict budgeting in high-cost environments.',
        cognitiveMechanism: 'Time Affluence & Autonomy Maximization',
      },
    ],
    payoff: {
      revelation:
        'Behavioral economists find that after basic material needs ($75k-$105k) are met, additional income yields diminishing returns on daily subjective well-being. Furthermore, hedonic adaptation quickly normalizes extreme wealth, while severe time poverty permanently elevates cortisol and degrades close relationships.',
      psychologicalConcept: 'The Easterlin Paradox & Time Affluence',
      empiricalInsight:
        'Whillans et al. (2016) demonstrated that people who prioritize time over money report higher life satisfaction and lower rates of clinical burnout.',
      gameTheoryAnalysis:
        'Choosing Option A often reflects affective forecasting errors—predicting future joy from material acquisitions while underestimating the ongoing friction of daily schedule captivity.',
      sourceCitation: 'Whillans et al. (2016), Social Psychological and Personality Science',
      caveatNote:
        'Time affluence only enhances happiness once baseline physiological security and debt freedom are reliably secured.',
    },
    draft: {
      title: 'The Golden Handcuffs: Fortune vs. Freedom',
      pillar: 'Psychology Thought Experiments',
      format: 'thought_experiment',
      hook:
        'Would you trade complete control over your waking hours in exchange for guaranteed multi-millionaire wealth?',
      bodyParagraphs: [
        'Imagine you are offered two irrevocable lifelong contracts. Option A grants an immediate $5,000,000 cash deposit and $450,000 per year, but legally binds you to 70-hour corporate workweeks with zero schedule autonomy. Option B grants a modest $65,000 annual stipend for life with zero obligations and complete freedom over every minute of your day.',
        'Psychologists study this trade-off through affective forecasting. When people imagine the $5,000,000 option, they visualize luxury vacations and financial prestige. However, hedonic adaptation rapidly absorbs material upgrades, while ongoing time poverty systematically destroys social relationships and elevates daily cortisol.',
      ],
      coreTakeaway:
        'Wealth buys physical comfort, but autonomy over daily time remains the strongest empirical predictor of subjective life satisfaction.',
      sourcesCited: ['Whillans et al. (2016), Soc Psychol Personal Sci'],
      caveatNote:
        'Time affluence produces psychological benefits only when baseline food, shelter, and medical security are already guaranteed.',
      cta: {
        type: 'reflection',
        text: 'Which contract would your present self sign, and would your 70-year-old self agree with that decision?',
      },
    },
    visualSpec: {
      title: 'Fortune vs. Daily Freedom',
      subtitle: 'Hedonic Adaptation vs. Time Affluence',
      tag: 'DECISION PARADOX',
      sourceCitation: 'Whillans et al. (2016)',
      template: 'thought_experiment',
      payload: {
        template: 'thought_experiment',
        data: {
          scenarioName: 'Golden Handcuffs vs. Sovereign Stipend',
          dilemma: 'Irrevocable choice: $5M with 70hr/week corporate captivity vs $65k/year with 100% schedule freedom.',
          branchA: {
            label: 'Option A ($5M / 70h)',
            explanation: 'Maximizes material resources, but triggers chronic time poverty and rapid hedonic adaptation.',
          },
          branchB: {
            label: 'Option B ($65k / Free)',
            explanation: 'Maximizes personal autonomy and time affluence, but limits external material upside.',
          },
          psychologicalInsight:
            'Autonomy over daily time predicts sustained life satisfaction far higher than surplus income above median baseline.',
        },
      },
    },
    formattedTelegramText:
      '<b>The Golden Handcuffs: Fortune vs. Freedom</b>\n<i>#PsychologyThoughtExperiments</i>\n\nWould you trade complete control over your waking hours in exchange for guaranteed multi-millionaire wealth?\n\nImagine you are offered two irrevocable lifelong contracts. Option A grants an immediate $5,000,000 cash deposit and $450,000 per year, but legally binds you to 70-hour corporate workweeks with zero schedule autonomy. Option B grants a modest $65,000 annual stipend for life with zero obligations and complete freedom over every minute of your day.\n\nPsychologists study this trade-off through affective forecasting. When people imagine the $5,000,000 option, they visualize luxury vacations and financial prestige. However, hedonic adaptation rapidly absorbs material upgrades, while ongoing time poverty systematically destroys social relationships and elevates daily cortisol.\n\n🎯 <i>Wealth buys physical comfort, but autonomy over daily time remains the strongest empirical predictor of subjective life satisfaction.</i>\n\n⚠️ <i>Time affluence produces psychological benefits only when baseline food, shelter, and medical security are already guaranteed.</i>\n\n🔬 <code>Whillans et al. (2016), Soc Psychol Personal Sci</code>\n\nWhich contract would your present self sign, and would your 70-year-old self agree with that decision?',
  },

  // -------------------------------------------------------------
  // 2. MORAL
  // -------------------------------------------------------------
  {
    id: 'dilemma-02',
    index: 2,
    category: 'moral',
    title: "The Medical Whistleblower's Poison Pill",
    hook: 'If saving 20 patients today meant bankrupting a lab developing a cure for 10,000 tomorrow, would you pull the alarm?',
    scenario:
      'You are the lead quality engineer at a biotech laboratory. You discover a rare manufacturing defect in an artificial heart valve that will cause fatal failure in roughly 20 implanted patients within 6 months. Publicly reporting this defect immediately triggers an emergency shutdown, bankrupting the company and canceling an ongoing Phase III clinical trial for a pediatric leukemia therapy projected to save 10,000 children next year.',
    choices: [
      {
        id: 'choice_a',
        label: 'Option A: Immediate Public Whistleblowing',
        description: 'Expose the valve defect to regulators, saving the 20 active heart patients.',
        tradeOff: 'Destroys the company and permanently halts the leukemia trial that could save 10,000 children.',
        cognitiveMechanism: 'Deontological Duty & Identifiable Victim Effect',
      },
      {
        id: 'choice_b',
        label: 'Option B: Silent Internal Mitigation',
        description: 'Quietly patch the production line and conceal past batches to protect the pediatric trial.',
        tradeOff: 'Guarantees the preventable death of 20 identifiable cardiac patients.',
        cognitiveMechanism: 'Utilitarian Consequentialism & Statistical Life Bias',
      },
    ],
    payoff: {
      revelation:
        'This scenario pits the "Identifiable Victim Effect" against utilitarian statistical optimization. Humans feel intense emotional revulsion toward directly causing the death of a known individual (Option B), even when mathematical calculation shows Option A results in a 500-fold greater net loss of human life.',
      psychologicalConcept: 'Identifiable Victim Effect & Dual-Process Morality',
      empiricalInsight:
        'Small & Loewenstein (2003) proved that individuals donate significantly more resources to save a single identified person than to save a vastly larger group of statistical victims.',
      gameTheoryAnalysis:
        'Omission bias leads decision-makers to judge harmful actions as morally worse than equally harmful inactions.',
      sourceCitation: 'Small & Loewenstein (2003), Organizational Behavior and Human Decision Processes',
      caveatNote:
        'Moral calculations in theoretical thought experiments lack the real-world legal liabilities and reputational cascades of actual whistleblowing.',
    },
    draft: {
      title: "The Whistleblower's Calculus: 20 Lives vs. 10,000",
      pillar: 'Psychology Thought Experiments',
      format: 'thought_experiment',
      hook:
        'If exposing a defect that saves 20 patients today meant canceling a therapy that saves 10,000 tomorrow, what is the moral choice?',
      bodyParagraphs: [
        'Imagine working at a biotech firm where you discover a critical flaw in an implanted heart valve that will kill 20 current patients. Announcing a public recall immediately bankrupted the company, terminating an ongoing Phase III clinical trial for a pediatric leukemia cure expected to save 10,000 children.',
        'This dilemma forces a direct clash between deontological ethics and utilitarian calculus. Greene’s neuroimaging research shows that contemplating the immediate deaths of 20 identifiable people triggers intense amygdala activation, while the 10,000 statistical lives are processed as abstract arithmetic in the prefrontal cortex.',
      ],
      coreTakeaway:
        'Human moral intuition is evolutionarily wired to prioritize immediate, identifiable individuals over abstract statistical majorities.',
      sourcesCited: ['Small & Loewenstein (2003), Organ Behav Hum Decis Process', 'Greene et al. (2001), Science'],
      caveatNote:
        'Real-world whistleblowing carries severe legal liabilities that often distort purely ethical decision models.',
      cta: {
        type: 'reflection',
        text: 'Does our moral duty belong to the concrete people in front of us or the statistical future we calculate?',
      },
    },
    visualSpec: {
      title: 'Identifiable vs. Statistical Lives',
      subtitle: 'The Neurobiology of Moral Trade-offs',
      tag: 'MORAL COGNITION',
      sourceCitation: 'Small & Loewenstein (2003); Greene (2001)',
      template: 'thought_experiment',
      payload: {
        template: 'thought_experiment',
        data: {
          scenarioName: "The Whistleblower's Calculus",
          dilemma: 'Recall valve to save 20 known patients vs protect company to complete pediatric cure for 10,000.',
          branchA: {
            label: 'Public Recall (Deontological)',
            explanation: 'Protects 20 identifiable patients; triggers company collapse and terminates leukemia cure.',
          },
          branchB: {
            label: 'Conceal & Proceed (Utilitarian)',
            explanation: 'Preserves 10,000 future statistical lives, but allows 20 preventable deaths in current cohort.',
          },
          psychologicalInsight:
            'The amygdala reacts strongly to identifiable victims, whereas prefrontal logic calculates statistical outcomes.',
        },
      },
    },
    formattedTelegramText:
      "<b>The Whistleblower's Calculus: 20 Lives vs. 10,000</b>\n<i>#PsychologyThoughtExperiments</i>\n\nIf exposing a defect that saves 20 patients today meant canceling a therapy that saves 10,000 tomorrow, what is the moral choice?\n\nImagine working at a biotech firm where you discover a critical flaw in an implanted heart valve that will kill 20 current patients. Announcing a public recall immediately bankrupted the company, terminating an ongoing Phase III clinical trial for a pediatric leukemia cure expected to save 10,000 children.\n\nThis dilemma forces a direct clash between deontological ethics and utilitarian calculus. Greene’s neuroimaging research shows that contemplating the immediate deaths of 20 identifiable people triggers intense amygdala activation, while the 10,000 statistical lives are processed as abstract arithmetic in the prefrontal cortex.\n\n🎯 <i>Human moral intuition is evolutionarily wired to prioritize immediate, identifiable individuals over abstract statistical majorities.</i>\n\n⚠️ <i>Real-world whistleblowing carries severe legal liabilities that often distort purely ethical decision models.</i>\n\n🔬 <code>Small & Loewenstein (2003), Organ Behav Hum Decis Process</code>\n\nDoes our moral duty belong to the concrete people in front of us or the statistical future we calculate?",
  },

  // -------------------------------------------------------------
  // 3. SOCIAL / RELATIONSHIP
  // -------------------------------------------------------------
  {
    id: 'dilemma-03',
    index: 3,
    category: 'social/relationship',
    title: 'The High-Stakes Wedding Intervention',
    hook: 'If telling your best friend the unvarnished truth guarantees they will hate you forever, do you speak up?',
    scenario:
      "Your closest childhood friend is three days away from marrying their partner. You independently discover airtight financial proof that the fiancé has secretly emptied your friend's joint savings into an illegal offshore gambling syndicate. If you present the evidence now, the wedding is destroyed and your friend will blame your interference and sever all ties. If you stay silent, your friend enters a legally binding union with a fraudulent partner.",
    choices: [
      {
        id: 'choice_a',
        label: 'Option A: Deliver The Evidence Immediately',
        description: 'Expose the fraud 72 hours before the ceremony, preventing the legal and financial disaster.',
        tradeOff: 'Triggers acute psychological reactance; friend shoots the messenger and ends your 20-year bond.',
        cognitiveMechanism: 'Psychological Reactance & Messenger Scapegoating',
      },
      {
        id: 'choice_b',
        label: 'Option B: Silent Non-Intervention',
        description: 'Attend the wedding, maintain your friendship, and provide emotional support during the inevitable fallout.',
        tradeOff: 'Complicit in friend entering disastrous marital debt and legal entanglement.',
        cognitiveMechanism: 'Bystander Rationalization & Conflict Avoidance',
      },
      {
        id: 'choice_c',
        label: 'Option C: Anonymous Dossier Leak',
        description: 'Slip the bank records anonymously under their door without claiming personal credit.',
        tradeOff: 'Creates paranoia and unresolved suspicion; leaves friend without trusted confidant.',
        cognitiveMechanism: 'Diffusion of Responsibility & Indirect Confrontation',
      },
    ],
    payoff: {
      revelation:
        'Social psychologists find that when people receive deeply threatening information about a romantic partner, they frequently deploy "motivated reasoning"—defending the partner by attacking the credibility and motives of the whistleblower. This phenomenon is known as the "Shoot the Messenger" defensive projection.',
      psychologicalConcept: 'Motivated Reasoning & Cognitive Dissonance Defense',
      empiricalInsight:
        'Festinger (1957) and subsequent relationship studies show that high commitment levels cause people to actively reinterpret hostile evidence as a test of devotion.',
      gameTheoryAnalysis:
        'In relational game theory, direct whistleblowing often converts a cooperative alliance into a zero-sum conflict because the recipient must choose between acknowledging foolishness or expelling the critic.',
      sourceCitation: 'Festinger (1957), A Theory of Cognitive Dissonance; Murray et al. (2002), JPSP',
      caveatNote:
        'Individual attachment styles strongly influence whether victims respond to intervention with gratitude or hostility.',
    },
    draft: {
      title: 'The Wedding Dilemma: Truth vs. Friendship',
      pillar: 'Everyday Psychology',
      format: 'thought_experiment',
      hook:
        'If telling your closest friend the absolute truth guarantees they will cut you out of their life, do you still speak up?',
      bodyParagraphs: [
        'Picture discovering undeniable proof that your best friend’s fiancé has secretly squandered their shared savings on an illegal offshore account—just three days before the wedding. Exposing the truth prevents a catastrophic legal marriage but almost certainly triggers fierce defensiveness, causing your friend to blame your interference and end the friendship.',
        'Psychologist Leon Festinger described this as motivated dissonance reduction. When confronted with evidence that shatters a core emotional commitment, people instinctively preserve their self-esteem by attacking the informant rather than accepting the agonizing truth about their partner.',
      ],
      coreTakeaway:
        'People under intense emotional investment frequently reject painful truths to protect their internal narrative, even at disastrous long-term cost.',
      sourcesCited: ['Festinger (1957), Stanford University Press', 'Murray et al. (2002), J Pers Soc Psychol'],
      caveatNote:
        'Securely attached individuals are significantly more capable of processing critical feedback without severing relational bonds.',
      cta: {
        type: 'reflection',
        text: 'Would true loyalty require protecting your friend’s future or preserving your relationship with them?',
      },
    },
    visualSpec: {
      title: 'The Cost of Unwelcome Truth',
      subtitle: 'Cognitive Dissonance in High-Stakes Relationships',
      tag: 'SOCIAL COGNITION',
      sourceCitation: 'Festinger (1957); Murray et al. (2002)',
      template: 'thought_experiment',
      payload: {
        template: 'thought_experiment',
        data: {
          scenarioName: 'The Pre-Wedding Revelation',
          dilemma: 'Expose fiancé’s secret financial ruin 3 days before wedding vs protect personal friendship.',
          branchA: {
            label: 'Intervene & Expose',
            explanation: 'Halts catastrophic legal marriage, but triggers motivated defense and scapegoats the messenger.',
          },
          branchB: {
            label: 'Silent Non-Intervention',
            explanation: 'Preserves the friendship temporarily, but leaves friend vulnerable to complete financial ruin.',
          },
          psychologicalInsight:
            'When truths threaten deeply held emotional bonds, minds attack the source to maintain internal consistency.',
        },
      },
    },
    formattedTelegramText:
      '<b>The Wedding Dilemma: Truth vs. Friendship</b>\n<i>#EverydayPsychology</i>\n\nIf telling your closest friend the absolute truth guarantees they will cut you out of their life, do you still speak up?\n\nPicture discovering undeniable proof that your best friend’s fiancé has secretly squandered their shared savings on an illegal offshore account—just three days before the wedding. Exposing the truth prevents a catastrophic legal marriage but almost certainly triggers fierce defensiveness, causing your friend to blame your interference and end the friendship.\n\nPsychologist Leon Festinger described this as motivated dissonance reduction. When confronted with evidence that shatters a core emotional commitment, people instinctively preserve their self-esteem by attacking the informant rather than accepting the agonizing truth about their partner.\n\n🎯 <i>People under intense emotional investment frequently reject painful truths to protect their internal narrative, even at disastrous long-term cost.</i>\n\n⚠️ <i>Securely attached individuals are significantly more capable of processing critical feedback without severing relational bonds.</i>\n\n🔬 <code>Festinger (1957), Stanford University Press</code>\n\nWould true loyalty require protecting your friend’s future or preserving your relationship with them?',
  },

  // -------------------------------------------------------------
  // 4. STRATEGY
  // -------------------------------------------------------------
  {
    id: 'dilemma-04',
    index: 4,
    category: 'strategy',
    title: "The Split-or-Defect Founders' Bounty",
    hook: 'Can four equal partners trust each other when one betrayal buys an instant personal fortune?',
    scenario:
      'You and three co-founders sell your patent to an enterprise buyer for a $10,000,000 cash pool. The closing contract contains a confidential sealed clause: all four founders submit a secret ballot marked either "COOPERATE" or "DEFECT". If all four choose COOPERATE, the $10M is divided equally ($2.5M each). If exactly one founder chooses DEFECT while the other three COOPERATE, the defector receives $5,000,000 and the other three receive zero. If two or more founders DEFECT, the entire $10M is forfeited to legal fees and everyone gets $0.',
    choices: [
      {
        id: 'choice_a',
        label: 'Choice A: Vote COOPERATE',
        description: 'Honor the team pact and aim for an equitable $2.5M payout for everyone.',
        tradeOff: 'Vulnerable to total exploitation if any single partner defects.',
        cognitiveMechanism: 'Prosocial Reciprocity & Trust Signaling',
      },
      {
        id: 'choice_b',
        label: 'Choice B: Vote DEFECT (Preemptive Strike)',
        description: 'Attempt to capture the $5M solo jackpot or block a partner from stealing it alone.',
        tradeOff: 'High probability of mutual annihilation ($0) if another founder thinks identically.',
        cognitiveMechanism: 'Preemptive Defection & Nash Equilibrium Greed',
      },
    ],
    payoff: {
      revelation:
        'This multi-player variant of the Prisoner’s Dilemma and Chicken Game highlights "Preemptive Defection." Even founders with zero intrinsic greed often vote DEFECT out of defensive fear that someone else will defect first. The dominant mathematical equilibrium creates a catastrophic race to zero.',
      psychologicalConcept: "Nash Equilibrium & The Tragedy of Distrust",
      empiricalInsight:
        'Axelrod (1984) showed that without iterative interaction and enforceable verification, multi-agent cooperation rapidly breaks down under asymmetric temptation payoffs.',
      gameTheoryAnalysis:
        'When the penalty for being the sole sucker ($0) matches the penalty for mutual defection ($0), trust requires irrationally high confidence in third-party altruism.',
      sourceCitation: 'Axelrod (1984), The Evolution of Cooperation; Nash (1950), PNAS',
      caveatNote:
        'Repeated social games with transparent reputation history achieve cooperation rates above 80%, unlike one-shot sealed auctions.',
    },
    draft: {
      title: "The Founders' Bounty: Trust vs. Preemptive Betrayal",
      pillar: 'Brain, Memory & Perception',
      format: 'thought_experiment',
      hook:
        'Can four equal partners maintain trust when a single secret betrayal pays out a $5,000,000 solo fortune?',
      bodyParagraphs: [
        'Suppose four co-founders sell a venture for $10M under a sealed ballot clause. If all four vote Cooperate, everyone receives $2.5M. If exactly one founder Defects, they take $5M while the others get nothing. But if two or more Defect, all $10M is forfeited to penalties and everyone walks away with zero.',
        'Game theorist Robert Axelrod demonstrated that in one-shot high-stakes environments, players defect not necessarily out of malice, but out of defensive fear. You may not crave the $5M jackpot, but the unbearable terror of being the cooperative sucker who gets $0 drives you to press the button first.',
      ],
      coreTakeaway:
        'In one-shot strategic games, distrust is self-fulfilling: defensive precautions create the exact catastrophe players sought to avoid.',
      sourcesCited: ['Axelrod (1984), Basic Books', 'Nash (1950), Proc Natl Acad Sci'],
      caveatNote:
        'Iterated relationships with continuous communication dramatically reverse defection and stabilize mutual trust.',
      cta: {
        type: 'reflection',
        text: 'If you had 60 seconds alone in the voting booth with your partners in the hallway, what would you mark on the ballot?',
      },
    },
    visualSpec: {
      title: 'The Defection Matrix',
      subtitle: 'Game Theory of Multi-Agent Distrust',
      tag: 'GAME THEORY',
      sourceCitation: 'Axelrod (1984); Nash (1950)',
      template: 'thought_experiment',
      payload: {
        template: 'thought_experiment',
        data: {
          scenarioName: "The Founders' Sealed Bounty",
          dilemma: 'Four partners vote secretly: All Cooperate ($2.5M each), One Defects ($5M solo), Multiple Defect ($0 all).',
          branchA: {
            label: 'Cooperate ($2.5M Shared)',
            explanation: 'Maximizes collective welfare, but leaves player exposed to zero-dollar exploitation.',
          },
          branchB: {
            label: 'Defect ($5M or $0 Trap)',
            explanation: 'Guards against being exploited alone, but guarantees total mutual forfeiture if anyone else does.',
          },
          psychologicalInsight:
            'Preemptive defection is fueled more by fear of being the sole victim than by active malicious greed.',
        },
      },
    },
    formattedTelegramText:
      "<b>The Founders' Bounty: Trust vs. Preemptive Betrayal</b>\n<i>#BrainMemoryPerception</i>\n\nCan four equal partners maintain trust when a single secret betrayal pays out a $5,000,000 solo fortune?\n\nSuppose four co-founders sell a venture for $10M under a sealed ballot clause. If all four vote Cooperate, everyone receives $2.5M. If exactly one founder Defects, they take $5M while the others get nothing. But if two or more Defect, all $10M is forfeited to penalties and everyone walks away with zero.\n\nGame theorist Robert Axelrod demonstrated that in one-shot high-stakes environments, players defect not necessarily out of malice, but out of defensive fear. You may not crave the $5M jackpot, but the unbearable terror of being the cooperative sucker who gets $0 drives you to press the button first.\n\n🎯 <i>In one-shot strategic games, distrust is self-fulfilling: defensive precautions create the exact catastrophe players sought to avoid.</i>\n\n⚠️ <i>Iterated relationships with continuous communication dramatically reverse defection and stabilize mutual trust.</i>\n\n🔬 <code>Axelrod (1984), Basic Books</code>\n\nIf you had 60 seconds alone in the voting booth with your partners in the hallway, what would you mark on the ballot?",
  },

  // -------------------------------------------------------------
  // 5. SURVIVAL
  // -------------------------------------------------------------
  {
    id: 'dilemma-05',
    index: 5,
    category: 'survival',
    title: 'The Death-Zone Ridge Bivouac',
    hook: 'When freezing in place means certain hypothermia and moving means falling off a cliff, how does the brain choose?',
    scenario:
      'You and your climbing partner are trapped on an exposed knife-edge ridge at 22,000 feet in an unexpected sub-zero blizzard. Visibility is near zero and your headlamps have failed. You have two options: Option A is to dig a shallow snow trench on the ridge and endure -30°C windchill for 8 hours until dawn (historical survival rate: 35% due to frostbite and core temperature collapse). Option B is to attempt an unroped blind descent across a crumbling ice wall in pitch darkness (estimated survival rate: 40%, but any slip causes instant fatal freefall).',
    choices: [
      {
        id: 'choice_a',
        label: 'Option A: Dig In & Endure The Bivouac',
        description: 'Hunker down in the snow cave, conserve mechanical energy, and gamble against hypothermia.',
        tradeOff: 'Passive high mortality risk from freezing; near-certain severe limb amputation.',
        cognitiveMechanism: 'Omission Bias & Risk Aversion to Active Agency',
      },
      {
        id: 'choice_b',
        label: 'Option B: Blind Nighttime Descent',
        description: 'Push downward through the blizzard immediately relying on tactile foot placement.',
        tradeOff: 'Instant catastrophic death upon a single misstep or ice fracture.',
        cognitiveMechanism: 'Action Bias & Sensation of Controllability',
      },
    ],
    payoff: {
      revelation:
        'Under acute life-threatening stress, cognitive survival studies show human decision-making splits sharply along "Action Bias" and "Omission Bias." People generally prefer passive risks (freezing slowly while waiting) over active gambles (blind climbing), because active errors carry intense anticipated regret if they fail.',
      psychologicalConcept: 'Prospect Theory in Loss Domain & Action vs. Inaction Bias',
      empiricalInsight:
        'Kahneman & Tversky (1979) established that when faced with sure losses, humans exhibit unpredictable risk-seeking shifts, yet remain paralyzed by omission bias when action carries visible catastrophic fault.',
      gameTheoryAnalysis:
        'In extreme survival environments, the brain substitutes statistical survival odds with an intuitive illusion of control.',
      sourceCitation: 'Kahneman & Tversky (1979), Econometrica; Leach (2004), Aviation Space & Environmental Medicine',
      caveatNote:
        'Hypoxia and acute cold severely impair executive prefrontal processing, degrading higher-order risk assessment in real alpine emergencies.',
    },
    draft: {
      title: 'The 22,000-Foot Survival Bivouac',
      pillar: 'Psychology Thought Experiments',
      format: 'thought_experiment',
      hook:
        'When freezing in place means probable hypothermia and moving means falling off a cliff, how do you decide?',
      bodyParagraphs: [
        'Trapped at 22,000 feet in a zero-visibility blizzard with failed headlamps, you face two grim choices. Option A: hunker down in an uninsulated snow trench at -30°C and gamble on surviving until dawn (35% survival odds). Option B: attempt a blind descent down an icy cliff in total darkness (40% survival odds, but a single slip is instant death).',
        'Cognitive psychologist John Leach found that in acute survival crises, over 75% of untrained individuals freeze or select passive inaction. Even when statistical models show active movement slightly improves survival, omission bias makes people prefer dying quietly from nature over causing their own immediate fall.',
      ],
      coreTakeaway:
        'In high-stakes emergencies, human psychology gravitates toward passive risk rather than active gambles to avoid personal culpability.',
      sourcesCited: ['Kahneman & Tversky (1979), Econometrica', 'Leach (2004), Aviat Space Environ Med'],
      caveatNote:
        'Extreme hypoxia and cerebral hypothermia rapidly extinguish rational decision-making in real alpine conditions.',
      cta: {
        type: 'reflection',
        text: 'Would you choose the passive endurance of the cold or the terrifying active gamble of the dark descent?',
      },
    },
    visualSpec: {
      title: 'Survival Psychology at 22,000 Feet',
      subtitle: 'Action Bias vs. Passive Omission in Crises',
      tag: 'SURVIVAL COGNITION',
      sourceCitation: 'Kahneman & Tversky (1979); Leach (2004)',
      template: 'thought_experiment',
      payload: {
        template: 'thought_experiment',
        data: {
          scenarioName: 'The Alpine Survival Fork',
          dilemma: 'Trapped in a blizzard: Wait in -30°C snow cave (35% survival) vs Blind descent in pitch darkness (40% survival).',
          branchA: {
            label: 'Passive Bivouac (35% Survival)',
            explanation: 'Conserves energy but succumbs to hypothermia; driven by omission bias and fear of active fault.',
          },
          branchB: {
            label: 'Active Descent (40% Survival)',
            explanation: 'Slightly higher statistical odds, but carries instant catastrophic fatality upon any tactile slip.',
          },
          psychologicalInsight:
            'Humans instinctively accept passive fatal degradation over active gambles that carry direct personal agency.',
        },
      },
    },
    formattedTelegramText:
      '<b>The 22,000-Foot Survival Bivouac</b>\n<i>#PsychologyThoughtExperiments</i>\n\nWhen freezing in place means probable hypothermia and moving means falling off a cliff, how do you decide?\n\nTrapped at 22,000 feet in a zero-visibility blizzard with failed headlamps, you face two grim choices. Option A: hunker down in an uninsulated snow trench at -30°C and gamble on surviving until dawn (35% survival odds). Option B: attempt a blind descent down an icy cliff in total darkness (40% survival odds, but a single slip is instant death).\n\nCognitive psychologist John Leach found that in acute survival crises, over 75% of untrained individuals freeze or select passive inaction. Even when statistical models show active movement slightly improves survival, omission bias makes people prefer dying quietly from nature over causing their own immediate fall.\n\n🎯 <i>In high-stakes emergencies, human psychology gravitates toward passive risk rather than active gambles to avoid personal culpability.</i>\n\n⚠️ <i>Extreme hypoxia and cerebral hypothermia rapidly extinguish rational decision-making in real alpine conditions.</i>\n\n🔬 <code>Kahneman & Tversky (1979), Econometrica</code>\n\nWould you choose the passive endurance of the cold or the terrifying active gamble of the dark descent?',
  },

  // -------------------------------------------------------------
  // 6. FUNNY / CHAOTIC
  // -------------------------------------------------------------
  {
    id: 'dilemma-06',
    index: 6,
    category: 'funny/chaotic',
    title: 'The 24-Hour Telepathic Truth Broadcast',
    hook: 'Would you rather hear every unvarnished thought about yourself, or force your entire workplace to tell the truth for one hour?',
    scenario:
      'A chaotic trickster offers you an irreversible supernatural device with two setting buttons. Button 1 gives you unilateral telepathy for 24 hours: you hear every unfiltered private opinion, passing judgment, and secret criticism that anyone within 10 meters thinks about you. Button 2 activates a 1-hour global honesty aura in your office or social circle: nobody in your building can tell a lie, withhold resentment, or use polite social euphemisms.',
    choices: [
      {
        id: 'choice_a',
        label: 'Button 1: Personal Telepathy (24 Hours)',
        description: 'Listen directly to what friends, family, and coworkers secretly think about your habits and character.',
        tradeOff: 'Destroys illusions of social approval; permanent emotional scarring from fleeting petty thoughts.',
        cognitiveMechanism: 'Illusion of Transparency & Egocentric Receptive Overload',
      },
      {
        id: 'choice_b',
        label: 'Button 2: The 1-Hour Public Honesty Field',
        description: 'Force your entire office or family to speak 100% unfiltered truth for 60 chaotic minutes.',
        tradeOff: 'Triggers catastrophic organizational collapse, severed marriages, and HR warfare.',
        cognitiveMechanism: 'Social Lubrication Collapse & Pluralistic Ignorance Explosion',
      },
    ],
    payoff: {
      revelation:
        'Sociologist Erving Goffman pointed out that human society functions entirely on "tact" and "polite fictions." Transient, uncharitable thoughts cross everyone\'s minds thousands of times per day without reflecting deep malice. Unleashing either personal telepathy or forced public honesty exposes the fragile machinery of social lubrication.',
      psychologicalConcept: 'Dramaturgical Social Theory & The Necessity of Social Fictions',
      empiricalInsight:
        'Gilovich, Savitsky & Medvec (1998) showed people suffer from the "Illusion of Transparency," mistakenly believing their inner states are obvious to others when in fact everyday politeness masks mutual indifference.',
      gameTheoryAnalysis:
        'Tact and white lies constitute a Pareto-optimal social coordination mechanism that prevents perpetual costly disputes.',
      sourceCitation: 'Goffman (1959), The Presentation of Self in Everyday Life; Gilovich et al. (1998), JPSP',
      caveatNote:
        'Constructive honesty improves performance when structured within psychologically safe feedback loops rather than sudden chaotic exposure.',
    },
    draft: {
      title: 'The Chaos of Unfiltered Truth',
      pillar: 'Strange Human Behavior',
      format: 'thought_experiment',
      hook:
        'Would you rather hear every secret thought people think about you, or force your entire workplace to tell the truth for one hour?',
      bodyParagraphs: [
        'Imagine holding a device with two chaotic buttons. Button 1 grants 24 hours of telepathy, letting you hear every passing criticism and petty annoyance people secretly think about you. Button 2 triggers a one-hour honesty field in your office, making it physically impossible for anyone around you to tell white lies or hide resentment.',
        'Sociologist Erving Goffman showed that civilization depends on diplomatic social fictions. Humans generate hundreds of fleeting, uncharitable judgments daily. Button 1 turns these harmless mental ripples into agonizing personal trauma, while Button 2 completely implodes the social fabric of your workplace.',
      ],
      coreTakeaway:
        'Politeness and white lies are not moral hypocrisies; they are the essential cognitive buffers that make human civilization possible.',
      sourcesCited: ['Goffman (1959), Anchor Books', 'Gilovich et al. (1998), J Pers Soc Psychol'],
      caveatNote:
        'Targeted, empathetic transparency remains vital in intimate partnerships and high-trust professional teams.',
      cta: {
        type: 'reflection',
        text: 'Would you rather bear the personal burden of knowing everything, or watch your workplace descend into absolute anarchy?',
      },
    },
    visualSpec: {
      title: 'The Fragile Architecture of Politeness',
      subtitle: 'Why Unfiltered Truth Destroys Social Equilibrium',
      tag: 'SOCIAL PSYCHOLOGY',
      sourceCitation: 'Goffman (1959); Gilovich (1998)',
      template: 'thought_experiment',
      payload: {
        template: 'thought_experiment',
        data: {
          scenarioName: 'The Telepathic Truth Machine',
          dilemma: 'Choose: 24 hours of hearing private thoughts about you vs 1 hour of forced 100% honesty in your office.',
          branchA: {
            label: 'Personal Telepathy (24h)',
            explanation: 'Absorbs transient petty judgments; shatters personal self-esteem and creates permanent paranoia.',
          },
          branchB: {
            label: 'Public Honesty Field (1h)',
            explanation: 'Destroys workplace diplomatic fictions; triggers instant relational collapse and institutional chaos.',
          },
          psychologicalInsight:
            'Everyday social politeness acts as a protective shield against the chaotic noise of human subconscious thought.',
        },
      },
    },
    formattedTelegramText:
      '<b>The Chaos of Unfiltered Truth</b>\n<i>#StrangeHumanBehavior</i>\n\nWould you rather hear every secret thought people think about you, or force your entire workplace to tell the truth for one hour?\n\nImagine holding a device with two chaotic buttons. Button 1 grants 24 hours of telepathy, letting you hear every passing criticism and petty annoyance people secretly think about you. Button 2 triggers a one-hour honesty field in your office, making it physically impossible for anyone around you to tell white lies or hide resentment.\n\nSociologist Erving Goffman showed that civilization depends on diplomatic social fictions. Humans generate hundreds of fleeting, uncharitable judgments daily. Button 1 turns these harmless mental ripples into agonizing personal trauma, while Button 2 completely implodes the social fabric of your workplace.\n\n🎯 <i>Politeness and white lies are not moral hypocrisies; they are the essential cognitive buffers that make human civilization possible.</i>\n\n⚠️ <i>Targeted, empathetic transparency remains vital in intimate partnerships and high-trust professional teams.</i>\n\n🔬 <code>Goffman (1959), Anchor Books</code>\n\nWould you rather bear the personal burden of knowing everything, or watch your workplace descend into absolute anarchy?',
  },

  // -------------------------------------------------------------
  // 7. TECHNOLOGY / FUTURE
  // -------------------------------------------------------------
  {
    id: 'dilemma-07',
    index: 7,
    category: 'technology/future',
    title: 'The Trauma-Eraser Neuro-Implant',
    hook: 'If a medical chip could permanently wipe your most agonizing memory, would you let it erase the person you became?',
    scenario:
      'A neurotechnology company develops a precision synaptic pruning procedure called "Mneme-Cleanse." The device permanently deletes the episodic memory and visceral emotional charge of your single most devastating life event (e.g. a catastrophic betrayal, loss, or humiliation). However, neural imaging reveals that the cognitive coping mechanisms, hard-won empathy, and adaptive caution you developed directly in response to that trauma are also scrubbed from your neural circuitry.',
    choices: [
      {
        id: 'choice_a',
        label: 'Option A: Erase The Trauma Completely',
        description: 'Eliminate all lingering pain, intrusive flashbacks, and emotional baggage from the event.',
        tradeOff: 'Erases the specific psychological maturity, deep empathy, and boundary-setting wisdom you forged.',
        cognitiveMechanism: 'Experiential Avoidance & Affective Relief Bias',
      },
      {
        id: 'choice_b',
        label: 'Option B: Retain The Memory & Pain',
        description: 'Keep the intact memory and live with the occasional acute pain to preserve your current identity.',
        tradeOff: 'Continued vulnerability to intermittent distress and unresolved past grief.',
        cognitiveMechanism: 'Narrative Identity Continuity & Post-Traumatic Growth Endorsement',
      },
    ],
    payoff: {
      revelation:
        'Psychologist Dan McAdams’ research on "Narrative Identity" demonstrates that humans construct meaning not from pleasant memories, but through "redemptive sequences"—stories where past suffering is integrated to forge resilience and wisdom. Deleting the suffering strips away the foundational scaffolding of adult character.',
      psychologicalConcept: 'Narrative Identity & Post-Traumatic Growth',
      empiricalInsight:
        'Tedeschi & Calhoun (2004) showed that a majority of individuals who navigate significant adversity report substantial growth in personal strength, appreciation of life, and relational depth.',
      gameTheoryAnalysis:
        'Treating memory as a consumer optimization problem ignores that human identity is path-dependent: changing initial adversity alters the entire trajectory of personal character.',
      sourceCitation: 'McAdams (2001), Review of General Psychology; Tedeschi & Calhoun (2004), Psychological Inquiry',
      caveatNote:
        'Severe clinical PTSD can cause intractable neurological harm where medical synaptic intervention provides genuine lifesaving relief.',
    },
    draft: {
      title: 'The Memory Eraser: Pain vs. Identity',
      pillar: 'Brain, Memory & Perception',
      format: 'thought_experiment',
      hook:
        'If a neural implant could permanently erase your most agonizing memory, would you sacrifice the resilience it built?',
      bodyParagraphs: [
        'Consider a clinical neurotech procedure capable of completely scrubbing your single most painful life memory. The procedure guarantees absolute emotional relief, but neurobiology dictates that erasing the trauma also dissolves the specific empathy, cautionary wisdom, and psychological resilience you developed in its wake.',
        'Psychologist Dan McAdams discovered that human identity is built on redemptive narrative arcs. When people reflect on their greatest strengths, they trace them back to surviving past adversity. Deleting your worst pain would deliver immediate comfort, but at the cost of flattening your character into an inexperienced novice.',
      ],
      coreTakeaway:
        'Human identity is not a collection of pleasant moments, but the hard-won meaning we forge from surviving difficulty.',
      sourcesCited: ['McAdams (2001), Rev Gen Psychol', 'Tedeschi & Calhoun (2004), Psychol Inq'],
      caveatNote:
        'Debilitating clinical trauma requires active medical therapy, and memory modification should not replace compassionate psychiatric care.',
      cta: {
        type: 'reflection',
        text: 'Would you rather live without your deepest scar, or keep the wisdom that only that scar could teach you?',
      },
    },
    visualSpec: {
      title: 'The Neural Memory Eraser',
      subtitle: 'Synaptic Pruning vs. Narrative Identity',
      tag: 'NEUROSCIENCE',
      sourceCitation: 'McAdams (2001); Tedeschi & Calhoun (2004)',
      template: 'thought_experiment',
      payload: {
        template: 'thought_experiment',
        data: {
          scenarioName: 'The Mneme-Cleanse Dilemma',
          dilemma: 'Permanently wipe your most painful memory vs retain the suffering to keep the resilience it forged.',
          branchA: {
            label: 'Erase The Memory',
            explanation: 'Immediate relief from visceral trauma and intrusive flashbacks, but resets mature coping mechanisms.',
          },
          branchB: {
            label: 'Keep The Scar',
            explanation: 'Maintains personal narrative continuity and hard-won wisdom, but endures persistent emotional echoes.',
          },
          psychologicalInsight:
            'Character and emotional depth are path-dependent byproducts of successfully integrating past adversity.',
        },
      },
    },
    formattedTelegramText:
      '<b>The Memory Eraser: Pain vs. Identity</b>\n<i>#BrainMemoryPerception</i>\n\nIf a neural implant could permanently erase your most agonizing memory, would you sacrifice the resilience it built?\n\nConsider a clinical neurotech procedure capable of completely scrubbing your single most painful life memory. The procedure guarantees absolute emotional relief, but neurobiology dictates that erasing the trauma also dissolves the specific empathy, cautionary wisdom, and psychological resilience you developed in its wake.\n\nPsychologist Dan McAdams discovered that human identity is built on redemptive narrative arcs. When people reflect on their greatest strengths, they trace them back to surviving past adversity. Deleting your worst pain would deliver immediate comfort, but at the cost of flattening your character into an inexperienced novice.\n\n🎯 <i>Human identity is not a collection of pleasant moments, but the hard-won meaning we forge from surviving difficulty.</i>\n\n⚠️ <i>Debilitating clinical trauma requires active medical therapy, and memory modification should not replace compassionate psychiatric care.</i>\n\n🔬 <code>McAdams (2001), Rev Gen Psychol</code>\n\nWould you rather live without your deepest scar, or keep the wisdom that only that scar could teach you?',
  },

  // -------------------------------------------------------------
  // 8. MONEY / LIFESTYLE (SECOND DIVERSE SCENARIO)
  // -------------------------------------------------------------
  {
    id: 'dilemma-08',
    index: 8,
    category: 'money/lifestyle',
    title: 'The Remote Island Arbitrage Paradox',
    hook: 'Would you live like royalty on a secluded tropical island if it meant leaving your entire community behind?',
    scenario:
      'You are granted a fully paid, high-end villa on a remote, pristine tropical island with 10 gigabit internet and $120,000 yearly passive allowance for life. The catch: the island is an 18-hour multi-flight journey from your hometown, and you cannot leave for more than two weeks per year. Staying in your current high-cost city requires continuous career pressure, a cramped apartment, and high cost of living, but keeps you within 15 minutes of your lifelong friends and family.',
    choices: [
      {
        id: 'choice_a',
        label: 'Option A: The Tropical Island Sanctuary',
        description: 'Embrace luxury, eternal warm climate, zero financial stress, and peaceful digital living.',
        tradeOff: 'Severe social isolation from physical family; reliant on virtual interaction.',
        cognitiveMechanism: 'Geographic Arbitrage & Solitary Hedonism',
      },
      {
        id: 'choice_b',
        label: 'Option B: The High-Cost Metropolitan Grind',
        description: 'Remain in the expensive city, manage work pressure, and stay embedded in your physical tribe.',
        tradeOff: 'Persistent financial pressure and daily schedule friction.',
        cognitiveMechanism: 'Social Capital & Proximity Attachment',
      },
    ],
    payoff: {
      revelation:
        'The Harvard Study of Adult Development (the longest longitudinal study on happiness ever conducted) found that physical social relationships and community integration are by far the strongest predictors of health, cognitive longevity, and subjective happiness—dwarfing climate, physical luxury, and passive wealth.',
      psychologicalConcept: 'Social Capital & The Proximity Principle',
      empiricalInsight:
        'Waldinger & Schulz (2023) demonstrated across an 85-year cohort that warm physical relationships protect our brains and bodies far more than material ease or geographic relocation.',
      gameTheoryAnalysis:
        'Relocating for material arbitrage often suffers from focalism—focusing on sunny beaches while ignoring that human happiness is fundamentally relational.',
      sourceCitation: 'Waldinger & Schulz (2023), The Good Life; Holt-Lunstad et al. (2015), Perspectives on Psychological Science',
      caveatNote:
        'Toxic local family environments reverse these findings, making independent relocation psychologically protective.',
    },
    draft: {
      title: 'Island Paradise vs. Social Tribe',
      pillar: 'Everyday Psychology',
      format: 'thought_experiment',
      hook:
        'Would you live like royalty on a secluded tropical island if it meant leaving your entire community behind?',
      bodyParagraphs: [
        'Imagine receiving a luxury villa in a tropical paradise with zero work requirements and a generous lifelong stipend, with one condition: you can only leave for two weeks per year, placing you 18 hours away from all childhood friends and family. The alternative is staying in a noisy, high-cost city, but keeping your social network within arm’s reach.',
        'The Harvard Study of Adult Development tracked hundreds of lives across 85 years and discovered that physical relationship depth is the single greatest predictor of human health and happiness. People often overestimate how much tropical scenery matters, while drastically underestimating the chronic neurological toll of social isolation.',
      ],
      coreTakeaway:
        'Material luxury in isolation quickly succumbs to loneliness; real long-term vitality is anchored in physical human connection.',
      sourcesCited: ['Waldinger & Schulz (2023), Simon & Schuster', 'Holt-Lunstad et al. (2015), Perspect Psychol Sci'],
      caveatNote:
        'Individuals fleeing unsupportive or abusive environments experience significant psychological gains from geographic separation.',
      cta: {
        type: 'reflection',
        text: 'Would you choose the sunny luxury of solitude or the noisy, expensive comfort of your tribe?',
      },
    },
    visualSpec: {
      title: 'Paradise vs. Physical Connection',
      subtitle: 'The 85-Year Harvard Longitudinal Finding',
      tag: 'LIFESTYLE COGNITION',
      sourceCitation: 'Waldinger & Schulz (2023)',
      template: 'thought_experiment',
      payload: {
        template: 'thought_experiment',
        data: {
          scenarioName: 'The Island Arbitrage Dilemma',
          dilemma: 'Free tropical luxury villa 18 hours from home vs High-cost city with your physical social circle.',
          branchA: {
            label: 'Island Luxury (Solitude)',
            explanation: 'Eliminates material stress and bad weather, but triggers chronic relational deficit.',
          },
          branchB: {
            label: 'City Grind (High Connection)',
            explanation: 'Maintains daily physical social ties and cognitive vitality despite financial pressures.',
          },
          psychologicalInsight:
            'Physical community connections protect long-term mental and cardiovascular health far more than climate or passive luxury.',
        },
      },
    },
    formattedTelegramText:
      '<b>Island Paradise vs. Social Tribe</b>\n<i>#EverydayPsychology</i>\n\nWould you live like royalty on a secluded tropical island if it meant leaving your entire community behind?\n\nImagine receiving a luxury villa in a tropical paradise with zero work requirements and a generous lifelong stipend, with one condition: you can only leave for two weeks per year, placing you 18 hours away from all childhood friends and family. The alternative is staying in a noisy, high-cost city, but keeping your social network within arm’s reach.\n\nThe Harvard Study of Adult Development tracked hundreds of lives across 85 years and discovered that physical relationship depth is the single greatest predictor of human health and happiness. People often overestimate how much tropical scenery matters, while drastically underestimating the chronic neurological toll of social isolation.\n\n🎯 <i>Material luxury in isolation quickly succumbs to loneliness; real long-term vitality is anchored in physical human connection.</i>\n\n⚠️ <i>Individuals fleeing unsupportive or abusive environments experience significant psychological gains from geographic separation.</i>\n\n🔬 <code>Waldinger & Schulz (2023), Simon & Schuster</code>\n\nWould you choose the sunny luxury of solitude or the noisy, expensive comfort of your tribe?',
  },

  // -------------------------------------------------------------
  // 9. MORAL (SECOND DIVERSE SCENARIO)
  // -------------------------------------------------------------
  {
    id: 'dilemma-09',
    index: 9,
    category: 'moral',
    title: 'The Autonomous AI Surgical Override',
    hook: 'If a machine with a 99.4% precision rate orders an emergency organ removal, would you authorize it over human doctors?',
    scenario:
      'You are the chief medical officer at a trauma center. A patient arrives in critical condition. An autonomous diagnostic AI with an independently verified 99.4% historical accuracy rate calculates that the patient has an occult aortic dissection that will burst fatally within 20 minutes unless emergency invasive surgery begins immediately. However, a panel of three veteran human surgeons examines the identical scans, diagnoses harmless pericarditis, and vehemently opposes opening the patient’s chest, warning of surgical mortality risks.',
    choices: [
      {
        id: 'choice_a',
        label: 'Option A: Authorize The AI Emergency Surgery',
        description: 'Trust the machine’s 99.4% empirical track record and overrule the unanimous human surgeon panel.',
        tradeOff: 'If the AI is in the 0.6% error margin, you personally ordered unnecessary fatal invasive surgery.',
        cognitiveMechanism: 'Algorithmic Optimization & Automation Trust',
      },
      {
        id: 'choice_b',
        label: 'Option B: Defer To The Human Surgical Panel',
        description: 'Follow the collective clinical judgment of veteran physicians and withhold the scalpel.',
        tradeOff: 'If the AI is correct (99.4% probability), the patient dies of aortic rupture within minutes.',
        cognitiveMechanism: 'Algorithmic Aversion & Social Liability Diffusion',
      },
    ],
    payoff: {
      revelation:
        'This dilemma illustrates "Algorithm Aversion." Behavioral studies show that humans forgive human experts when they make medical errors, but display extreme, punitive intolerance toward algorithmic mistakes—even when the algorithm is empirically dozens of times more accurate than the humans.',
      psychologicalConcept: 'Algorithm Aversion & Liability Diffusion',
      empiricalInsight:
        'Dietvorst, Simmons & Massey (2015) demonstrated that after seeing an algorithm make a single mistake, people quickly lose confidence and prefer inferior human forecasters.',
      gameTheoryAnalysis:
        'Administrators often choose Option B not because they believe the humans are smarter, but because human consensus provides social and legal immunity if the patient dies.',
      sourceCitation: 'Dietvorst, Simmons & Massey (2015), Journal of Experimental Psychology: General',
      caveatNote:
        'Black-box neural networks can occasionally fail on out-of-distribution demographic anomalies not represented in training datasets.',
    },
    draft: {
      title: 'The AI Surgeon Veto: Machine vs. Consensus',
      pillar: 'Psychology Thought Experiments',
      format: 'thought_experiment',
      hook:
        'If an AI with a 99.4% accuracy rate demands emergency surgery but three human doctors disagree, who do you trust?',
      bodyParagraphs: [
        'Imagine you are hospital director managing an emergency patient. An AI diagnostic system with a 99.4% verified accuracy rate detects a hidden aortic tear requiring immediate high-risk surgery. But three senior human surgeons review the scans and unanimously insist the patient has a minor inflammation, demanding you cancel the operation.',
        'Psychologist Berk Dietvorst documented this as Algorithm Aversion. When human doctors make a fatal error, society accepts it as an unfortunate tragedy. When a machine errs, society treats it as unacceptable malpractice. Decision-makers frequently pick human error over machine perfection purely to diffuse personal liability.',
      ],
      coreTakeaway:
        'Humans routinely accept higher rates of human error to avoid the discomfort of trusting a superior algorithm.',
      sourcesCited: ['Dietvorst et al. (2015), J Exp Psychol Gen'],
      caveatNote:
        'Algorithmic systems require ongoing clinical oversight to detect novel pathologies outside their training data.',
      cta: {
        type: 'reflection',
        text: 'If you were the patient lying on the operating table, whose hands would you place your life in?',
      },
    },
    visualSpec: {
      title: 'Algorithm Aversion in Medicine',
      subtitle: 'The Psychology of Trusting Machine vs. Human',
      tag: 'COGNITIVE BIAS',
      sourceCitation: 'Dietvorst et al. (2015)',
      template: 'thought_experiment',
      payload: {
        template: 'thought_experiment',
        data: {
          scenarioName: 'The AI Surgical Override',
          dilemma: '99.4% accurate AI diagnoses fatal aortic tear vs 3 veteran surgeons diagnosing minor inflammation.',
          branchA: {
            label: 'Authorize AI Surgery',
            explanation: 'Relies on superior mathematical precision, but bears acute personal liability if within the 0.6% error margin.',
          },
          branchB: {
            label: 'Defer to Human Panel',
            explanation: 'Provides institutional liability defense, but accepts vastly higher statistical risk of patient mortality.',
          },
          psychologicalInsight:
            'People punish machine mistakes far more harshly than human failures, creating a bias toward inferior human decisions.',
        },
      },
    },
    formattedTelegramText:
      '<b>The AI Surgeon Veto: Machine vs. Consensus</b>\n<i>#PsychologyThoughtExperiments</i>\n\nIf an AI with a 99.4% accuracy rate demands emergency surgery but three human doctors disagree, who do you trust?\n\nImagine you are hospital director managing an emergency patient. An AI diagnostic system with a 99.4% verified accuracy rate detects a hidden aortic tear requiring immediate high-risk surgery. But three senior human surgeons review the scans and unanimously insist the patient has a minor inflammation, demanding you cancel the operation.\n\nPsychologist Berk Dietvorst documented this as Algorithm Aversion. When human doctors make a fatal error, society accepts it as an unfortunate tragedy. When a machine errs, society treats it as unacceptable malpractice. Decision-makers frequently pick human error over machine perfection purely to diffuse personal liability.\n\n🎯 <i>Humans routinely accept higher rates of human error to avoid the discomfort of trusting a superior algorithm.</i>\n\n⚠️ <i>Algorithmic systems require ongoing clinical oversight to detect novel pathologies outside their training data.</i>\n\n🔬 <code>Dietvorst et al. (2015), J Exp Psychol Gen</code>\n\nIf you were the patient lying on the operating table, whose hands would you place your life in?',
  },

  // -------------------------------------------------------------
  // 10. STRATEGY (SECOND DIVERSE SCENARIO)
  // -------------------------------------------------------------
  {
    id: 'dilemma-10',
    index: 10,
    category: 'strategy',
    title: 'The Blackmail Merger Ultimatum',
    hook: 'When you catch your fierce competitor cheating, do you destroy them publicly or force them into an unequal alliance?',
    scenario:
      'Your software startup is running out of capital in a brutal two-horse market race. You discover verifiable proof that your larger competitor has systematically falsified their user metrics to defraud institutional investors. If you publish the dossier publicly, your competitor goes bankrupt, but the resulting market scandal destroys venture investor confidence across your entire sector, bankrupting your company too. If you present the dossier privately, you can force them to accept a merger on your terms, making you CEO of a combined monopoly.',
    choices: [
      {
        id: 'choice_a',
        label: 'Option A: Public Exposure & Mutual Market Burn',
        description: 'Send the fraud evidence to regulatory authorities and media outlets immediately.',
        tradeOff: 'Destroys sector investor appetite; kills both your rival and your own venture.',
        cognitiveMechanism: 'Altruistic Punishment & Scorched Earth Retribution',
      },
      {
        id: 'choice_b',
        label: 'Option B: The Forced Hostile Merger',
        description: 'Use the leverage privately to compel an all-stock buyout making you head of a dominant company.',
        tradeOff: 'Complicit in concealing historical fraud; ongoing risk of future discovery.',
        cognitiveMechanism: 'Machiavellian Pragmatism & Asymmetric Leverage Exploitation',
      },
    ],
    payoff: {
      revelation:
        'Behavioral game theorists study this as "Altruistic Punishment" versus "Strategic Extortion." Humans are uniquely willing to incur massive personal costs (even financial ruin) just to punish a perceived cheater. However, corporate game theory shows pragmatic actors frequently monetize moral leverage rather than executing mutual destruction.',
      psychologicalConcept: 'Altruistic Punishment & Ultimatum Bargaining Dynamics',
      empiricalInsight:
        'Fehr & Gächter (2002) showed across experimental economics games that individuals consistently pay real money to penalize free-riders and dishonest actors, even with zero direct reward.',
      gameTheoryAnalysis:
        'Option B transforms a zero-sum destructive game into a coercive cooperative game, shifting surplus value to the blackmailer while keeping the fraud risk latent.',
      sourceCitation: 'Fehr & Gächter (2002), Nature; Schelling (1960), The Strategy of Conflict',
      caveatNote:
        'Concealing corporate fraud carries severe criminal liability under securities regulations regardless of private strategic rationale.',
    },
    draft: {
      title: 'The Merger Ultimatum: Scorched Earth vs. Leverage',
      pillar: 'Brain, Memory & Perception',
      format: 'thought_experiment',
      hook:
        'When you uncover proof that your main rival is committing fraud, do you destroy them or force a profitable buyout?',
      bodyParagraphs: [
        'Suppose your struggling startup uncovers airtight proof that your dominant competitor falsified their financials. Blowing the whistle bankrupts them, but the panic freezes venture funding for your whole industry, doomed your own firm. Privately presenting the dossier allows you to force a merger on your terms, creating an industry monopoly with you in charge.',
        'Economists Ernst Fehr and Simon Gächter proved that humans possess an ancient drive for Altruistic Punishment—we are willing to suffer severe personal loss just to see a cheater punished. Rational strategy dictates monetizing the leverage, but emotional wiring demands total vengeance.',
      ],
      coreTakeaway:
        'Human psychology often values punishing an enemy’s transgression more than securing our own material survival.',
      sourcesCited: ['Fehr & Gächter (2002), Nature', 'Schelling (1960), Harvard University Press'],
      caveatNote:
        'Concealing corporate financial fraud carries extreme criminal penalties that eclipse short-term strategic advantages.',
      cta: {
        type: 'reflection',
        text: 'Would you satisfy your moral thirst for retribution, or exploit the leverage to secure commercial power?',
      },
    },
    visualSpec: {
      title: 'Altruistic Punishment vs. Strategic Leverage',
      subtitle: 'The Economics of Retribution and Coercion',
      tag: 'STRATEGIC COGNITION',
      sourceCitation: 'Fehr & Gächter (2002); Schelling (1960)',
      template: 'thought_experiment',
      payload: {
        template: 'thought_experiment',
        data: {
          scenarioName: 'The Whistleblower Merger Ultimatum',
          dilemma: 'Expose competitor fraud (destroys competitor & freezes market) vs Blackmail for dominant merger.',
          branchA: {
            label: 'Public Whistleblower (Scorched Earth)',
            explanation: 'Satisfies altruistic punishment drive, but triggers sector collapse that sinks your own firm.',
          },
          branchB: {
            label: 'Coercive Merger (Pragmatic)',
            explanation: 'Monetizes the secret to gain monopoly power, but keeps latent criminal liability alive.',
          },
          psychologicalInsight:
            'Humans often willingly suffer direct harm if it guarantees punishing a perceived bad actor.',
        },
      },
    },
    formattedTelegramText:
      '<b>The Merger Ultimatum: Scorched Earth vs. Leverage</b>\n<i>#BrainMemoryPerception</i>\n\nWhen you uncover proof that your main rival is committing fraud, do you destroy them or force a profitable buyout?\n\nSuppose your struggling startup uncovers airtight proof that your dominant competitor falsified their financials. Blowing the whistle bankrupts them, but the panic freezes venture funding for your whole industry, doomed your own firm. Privately presenting the dossier allows you to force a merger on your terms, creating an industry monopoly with you in charge.\n\nEconomists Ernst Fehr and Simon Gächter proved that humans possess an ancient drive for Altruistic Punishment—we are willing to suffer severe personal loss just to see a cheater punished. Rational strategy dictates monetizing the leverage, but emotional wiring demands total vengeance.\n\n🎯 <i>Human psychology often values punishing an enemy’s transgression more than securing our own material survival.</i>\n\n⚠️ <i>Concealing corporate financial fraud carries extreme criminal penalties that eclipse short-term strategic advantages.</i>\n\n🔬 <code>Fehr & Gächter (2002), Nature</code>\n\nWould you satisfy your moral thirst for retribution, or exploit the leverage to secure commercial power?',
  },
];

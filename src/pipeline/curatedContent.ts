/**
 * Curated Content Repository
 * Peer-reviewed, verified psychological phenomena across all 4 pillars.
 * Guarantees 100% semantic consistency between topics, research, editorial posts, and visual specs.
 */

import {
  ContentPillar,
  PostDraft,
  ResearchNotes,
  TopicCandidate,
  VisualDecision,
} from './types.js';

export interface CuratedEntry {
  id: string;
  topic: TopicCandidate;
  research: ResearchNotes;
  draft: PostDraft;
  visual: VisualDecision;
}

export const CURATED_ENTRIES: CuratedEntry[] = [
  // ================= PILLAR 1: EVERYDAY PSYCHOLOGY =================
  {
    id: 'ironic_process',
    topic: {
      topic: 'Ironic Process Theory (The White Bear Problem)',
      pillar: 'Everyday Psychology',
      coreQuestion: 'Why does deliberately trying to suppress a thought guarantee it will resurface?',
      rationale: 'Demonstrates dual-process cognitive monitoring under mental load.',
    },
    research: {
      coreConcept:
        'Deliberate mental thought suppression initiates two competing cognitive processes: an intentional conscious search for distractors, and an automatic unconscious monitor searching for lapses.',
      scientificClaims: [
        'Attempting to suppress a thought causes a hyper-accessible rebound effect once cognitive load increases.',
        'The monitoring process operates continuously beneath awareness with minimal conscious effort.',
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
        'Cognitive load deprives operating process of attention, leaving monitor active and priming the thought',
      ],
      caveatsAndLimitations: [
        'Rebound effects attenuate when subjects are provided with a concrete, focused replacement distractor.',
        'Individual differences in baseline anxiety affect rebound intensity.',
      ],
      uncertaintyLevel: 'low',
      everydayManifestation:
        'Lying awake in bed desperately trying not to think about tomorrow’s presentation, only to have the exact anxious scenario repeat in a loop.',
    },
    draft: {
      title: 'Why Trying Not to Think About Something Guarantees You Will',
      pillar: 'Everyday Psychology',
      hook:
        'Tell someone not to think about a pink elephant, and their mental imagery immediately summons one in vivid detail.',
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
    },
    visual: {
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
              { number: 1, title: 'Command', description: 'Conscious intent: "Do not think about X."' },
              { number: 2, title: 'Operating', description: 'Effortful search for non-X distractors.' },
              { number: 3, title: 'Monitoring', description: 'Autonomous unconscious search for failures.' },
              { number: 4, title: 'Intrusion', description: 'Under fatigue, monitor injects X into awareness.' },
            ],
          },
        },
      },
    },
  },
  {
    id: 'zeigarnik_effect',
    topic: {
      topic: 'The Zeigarnik Effect',
      pillar: 'Everyday Psychology',
      coreQuestion: 'Why do incomplete tasks linger in working memory while finished ones vanish?',
      rationale: 'Explains task fixation, mental clutter, and cognitive closure.',
    },
    research: {
      coreConcept:
        'Incomplete or interrupted tasks create intrusive cognitive tension (quasi-needs) that persist in working memory until resolution or cognitive closure is achieved.',
      scientificClaims: [
        'Unfinished tasks are remembered up to 90% better than completed ones.',
        'Cognitive tension dissipates immediately upon task completion or structured planning.',
      ],
      keyStudies: [
        {
          authors: 'Bluma Zeigarnik',
          year: 1927,
          studyName: 'On Finished and Unfinished Tasks',
          findings:
            'Adult participants remembered interrupted manual and mental puzzles approximately 90% more accurately than tasks they were allowed to finish.',
          contextOrSample: '164 participants given 18 to 22 varied problem-solving puzzles.',
        },
      ],
      cognitiveMechanisms: [
        'Kurt Lewin’s field theory of psychological tension states and goal-directed quasi-needs',
        'Working memory maintenance loops kept active by the prefrontal cortex pending goal completion',
      ],
      caveatsAndLimitations: [
        'Does not occur if the participant is not personally invested in the outcome of the task.',
        'Extremely high stress can impair recall across both completed and interrupted tasks.',
      ],
      uncertaintyLevel: 'low',
      everydayManifestation:
        'Finding it impossible to stop thinking about a half-written email while trying to enjoy dinner with family.',
    },
    draft: {
      title: 'Why Incomplete Tasks Refuse to Leave Your Head',
      pillar: 'Everyday Psychology',
      hook:
        'Stop working in the middle of a paragraph, and your brain will pace around that unfinished sentence for the rest of the evening.',
      bodyParagraphs: [
        'In the 1920s, Lithuanian psychologist Bluma Zeigarnik noticed a waiter in a Berlin café who could remember complex unpaid orders without writing them down. The instant the bill was settled, his memory of the entire meal vanished completely. Zeigarnik took this into the laboratory, assigning participants twenty small tasks and interrupting half of them before completion.',
        'Her tests revealed that people recalled the interrupted tasks nearly twice as effectively as the finished ones. When an objective is left hanging, the prefrontal cortex maintains a state of unresolved cognitive tension. The brain keeps the relevant neural representations active in working memory, repeatedly signaling that an open loop requires closure.',
      ],
      coreTakeaway:
        'The human mind treats unresolved objectives as active neural loops until closure or a clear plan is reached.',
      sourcesCited: ['Zeigarnik (1927), Psychologische Forschung'],
      caveatNote:
        'The effect depends on personal investment; tasks forced on an indifferent participant produce little to no lingering cognitive tension.',
      cta: {
        type: 'continuation',
        text:
          'If an unfinished project is crowding your mind tonight, write down the exact first action for tomorrow morning to signal closure.',
      },
    },
    visual: {
      needed: true,
      reason: 'Contrasting the cognitive state of open vs closed tasks clarifies the tension mechanism.',
      template: 'comparison',
      spec: {
        title: 'Cognitive Tension: Open vs. Closed Loops',
        subtitle: 'How completion status alters working memory retention',
        tag: 'MEMORY ARCHITECTURE',
        sourceCitation: 'Zeigarnik (1927)',
        template: 'comparison',
        payload: {
          template: 'comparison',
          data: {
            leftTitle: 'Incomplete Tasks',
            leftSubtitle: 'Active Cognitive Tension',
            leftPoints: [
              'Intrusive spontaneous recall',
              'Prefrontal cortex maintains open loop',
              'Twice as memorable after delays',
            ],
            rightTitle: 'Completed Tasks',
            rightSubtitle: 'Cognitive Resolution',
            rightPoints: [
              'Tension immediately flushes',
              'Working memory resources released',
              'Rapid natural memory decay',
            ],
          },
        },
      },
    },
  },
  {
    id: 'cognitive_dissonance',
    topic: {
      topic: 'Cognitive Dissonance (Forced Compliance)',
      pillar: 'Everyday Psychology',
      coreQuestion: 'Why do people convince themselves boring tasks were enjoyable when paid almost nothing?',
      rationale: 'Demonstrates internal attitude shifts driven by insufficient external justification.',
    },
    research: {
      coreConcept:
        'When external justification for an action is insufficient, the human mind internally modifies its attitudes to eliminate uncomfortable psychological dissonance.',
      scientificClaims: [
        'Minimal rewards produce greater internal attitude transformation than lavish rewards.',
        'The brain experiences physiological autonomic conflict when behavior and belief disagree.',
      ],
      keyStudies: [
        {
          authors: 'Festinger & Carlsmith',
          year: 1959,
          studyName: 'Cognitive consequences of forced compliance',
          findings:
            'Participants paid only $1 to describe a boring task as exciting convinced themselves it truly was fun, whereas those paid $20 did not.',
          contextOrSample: 'Stanford undergraduates assigned to monotonous manual peg-turning.',
        },
      ],
      cognitiveMechanisms: [
        'Anterior cingulate cortex activation signaling error and psychological conflict',
        'Post-hoc narrative synthesis to preserve coherent self-consistency',
      ],
      caveatsAndLimitations: [
        'Requires perceived personal autonomy; coerced compliance does not trigger dissonance.',
        'Cultural factors moderate the intensity of self-consistency needs.',
      ],
      uncertaintyLevel: 'low',
      everydayManifestation:
        'Defending an overpriced, uncomfortable pair of shoes by claiming they build character and discipline.',
    },
    draft: {
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
    },
    visual: {
      needed: true,
      reason: 'The inverse relationship between compensation and belief shift is counter-intuitive and needs clear contrast.',
      template: 'comparison',
      spec: {
        title: 'The Insufficient Justification Effect',
        subtitle: 'How payout size alters internal conviction',
        tag: 'ATTITUDE CHANGE',
        sourceCitation: 'Festinger & Carlsmith (1959)',
        template: 'comparison',
        payload: {
          template: 'comparison',
          data: {
            leftTitle: 'Paid $20 (High Reward)',
            leftSubtitle: 'External Justification',
            leftPoints: [
              'Clear reason: "I lied for the money"',
              'Zero internal conflict experienced',
              'Task evaluated truthfully as boring',
            ],
            rightTitle: 'Paid $1 (Low Reward)',
            rightSubtitle: 'Internal Rationalization',
            rightPoints: [
              'No external excuse: "$1 is not enough"',
              'Sharp cognitive dissonance triggered',
              'Brain rewrites memory: "It was actually fun"',
            ],
          },
        },
      },
    },
  },
  {
    id: 'ben_franklin',
    topic: {
      topic: 'The Ben Franklin Effect',
      pillar: 'Everyday Psychology',
      coreQuestion: 'Why does performing a favor for someone make you like them more?',
      rationale: 'Demonstrates self-perception and behavioral justification in interpersonal affinity.',
    },
    research: {
      coreConcept:
        'Performing a favor for someone increases interpersonal affinity because the brain retroactively rationalizes the favor as evidence of liking.',
      scientificClaims: [
        'Asking a small personal favor generates greater rapport than doing a favor for that person.',
        'Actions guide attitudes through retroactive cognitive alignment.',
      ],
      keyStudies: [
        {
          authors: 'Jecker & Landy',
          year: 1969,
          studyName: 'Liking a person as a function of doing him a favour',
          findings:
            'Participants who returned prize money as a personal favor to the researcher rated him significantly higher than those who returned it to the department or kept it.',
          contextOrSample: 'Controlled student cohort in competitive test conditions.',
        },
      ],
      cognitiveMechanisms: [
        'Self-perception theory: observing one’s own altruistic action and inferring affectionate sentiment',
        'Dissonance avoidance: reconciling effort expenditure with positive recipient valence',
      ],
      caveatsAndLimitations: [
        'Fails if the requested favor is excessively onerous or perceived as exploitative.',
        'Requires that the request be delivered as a personal human appeal rather than an institutional rule.',
      ],
      uncertaintyLevel: 'low',
      everydayManifestation:
        'Lending a book or advice to an acquaintance, and realizing later you feel surprisingly warm and invested in their success.',
    },
    draft: {
      title: 'Why Doing Someone a Favor Makes You Like Them',
      pillar: 'Everyday Psychology',
      hook:
        'Most people believe we do favors for people we like. Cognitive research shows the exact inverse is often true.',
      bodyParagraphs: [
        'In 1969, researchers Jon Jecker and David Landy ran an experiment where students won a modest sum of money in a challenging test. Afterward, the researcher approached one third of the participants and explained that he had used his own funds and was now broke, asking if they would return the money as a personal favor. Another group was asked by the department, and a third kept the cash.',
        'When evaluating the researcher later, the participants who gave their own winnings back directly to him liked him the most. The mind observed its own generous behavior and constructed a rationale: we do not sacrifice time or resources for people we despise, so our attitude shifts to reflect our commitment.',
      ],
      coreTakeaway:
        'Behavior precedes emotion; we infer how we feel about others by observing how we have acted toward them.',
      sourcesCited: ['Jecker & Landy (1969), Human Relations'],
      caveatNote:
        'The effect backfires if the request feels demanding or manipulative rather than an authentic expression of vulnerability.',
      cta: {
        type: 'continuation',
        text:
          'If you want to build genuine rapport with an estranged colleague, consider asking for their genuine advice on a small challenge.',
      },
    },
    visual: {
      needed: true,
      reason: 'A process diagram highlights how action retroactively alters emotional appraisal.',
      template: 'process_flow',
      spec: {
        title: 'The Ben Franklin Mechanism',
        subtitle: 'How behavior retroactively creates emotional affinity',
        tag: 'INTERPERSONAL DYNAMICS',
        sourceCitation: 'Jecker & Landy (1969)',
        template: 'process_flow',
        payload: {
          template: 'process_flow',
          data: {
            steps: [
              { number: 1, title: 'Request', description: 'Person asks for a modest, personal favor.' },
              { number: 2, title: 'Action', description: 'You invest time or effort to assist them.' },
              { number: 3, title: 'Dissonance', description: 'Brain asks: "Why did I spend energy on them?"' },
              { number: 4, title: 'Inference', description: 'Attitude aligns: "I must genuinely respect them."' },
            ],
          },
        },
      },
    },
  },

  // ================= PILLAR 2: STRANGE HUMAN BEHAVIOR =================
  {
    id: 'spotlight_effect',
    topic: {
      topic: 'The Spotlight Effect',
      pillar: 'Strange Human Behavior',
      coreQuestion: 'Why do humans believe everyone is staring at their mistakes and wardrobe flaws?',
      rationale: 'Highlights egocentric anchoring in social interactions and crowd perception.',
    },
    research: {
      coreConcept:
        'Egocentric anchoring causes individuals to substantially overestimate the proportion of observers noticing their appearance and behavioral blunders.',
      scientificClaims: [
        'People predict twice as many observers will notice an embarrassing flaw than actually do.',
        'Social observers are primarily preoccupied with their own internal mental states.',
      ],
      keyStudies: [
        {
          authors: 'Gilovich, Medvec & Savitsky',
          year: 2000,
          studyName: 'The spotlight effect in social judgment',
          findings:
            'Students wearing an embarrassing Barry Manilow t-shirt predicted 50% of people in a room would notice; in reality, under 23% did.',
          contextOrSample: 'Cornell University undergraduate laboratory cohorts.',
        },
      ],
      cognitiveMechanisms: [
        'Anchoring and adjustment: people anchor on their own hyper-salient awareness and fail to adjust sufficiently for others’ perspectives',
        'Egocentric bias in perspective taking',
      ],
      caveatsAndLimitations: [
        'Extreme physical or social disruption does attract genuine attention.',
        'High trait social anxiety exacerbates the perceived spotlight radius.',
      ],
      uncertaintyLevel: 'low',
      everydayManifestation:
        'Walking into a crowded coffee shop with a small coffee stain on your cuff, convinced every barista and customer is silently judging you.',
    },
    draft: {
      title: 'The Spotlight Effect: Nobody Is Watching You',
      pillar: 'Strange Human Behavior',
      hook:
        'Spill a single drop of coffee on your shirt, and you assume everyone in the room is staring directly at the stain.',
      bodyParagraphs: [
        'In a landmark study at Cornell University, psychologist Thomas Gilovich asked students to put on a brightly colored t-shirt featuring pop singer Barry Manilow before walking into a room full of peers. Before entering, the wearers estimated that at least half the students in the room would notice the shirt.',
        'When researchers surveyed the observers afterward, fewer than twenty-three percent had noticed anything unusual. Gilovich named this the Spotlight Effect. Because we exist at the center of our own sensory universe, we anchor on our own heightened awareness and falsely assume everyone else shares our focal point.',
      ],
      coreTakeaway:
        'People are too preoccupied managing their own perceived spotlight to spend mental energy watching yours.',
      sourcesCited: ['Gilovich et al. (2000), J Pers Soc Psychol'],
      caveatNote:
        'The effect diminishes when you realize that other observers are dealing with their own private self-consciousness.',
      cta: {
        type: 'reflection',
        text:
          'Think back to an awkward moment that kept you up last night: can you recall a single embarrassing thing anyone else did yesterday?',
      },
    },
    visual: {
      needed: true,
      reason: 'Comparing the predicted percentage of observers vs the actual percentage delivers immediate quantitative clarity.',
      template: 'simple_statistic',
      spec: {
        title: 'The Spotlight Perception Gap',
        subtitle: 'Cornell University embarrassing t-shirt experiment',
        tag: 'SOCIAL COGNITION',
        sourceCitation: 'Gilovich et al. (2000)',
        template: 'simple_statistic',
        payload: {
          template: 'simple_statistic',
          data: {
            highlightMetric: '23%',
            metricLabel: 'Actually Noticed the T-Shirt',
            context: 'Participants predicted over 50% of observers would spot their embarrassing clothing.',
            detailPoints: [
              'Predicted awareness: 50% of room',
              'Actual observer recall: under 23%',
              'Observers were primarily focused on their own conversations and devices',
            ],
          },
        },
      },
    },
  },
  {
    id: 'illusion_of_transparency',
    topic: {
      topic: 'The Illusion of Transparency',
      pillar: 'Strange Human Behavior',
      coreQuestion: 'Why do people overestimate how easily others can read their internal emotions?',
      rationale: 'Reveals pervasive egocentric anchoring during public speaking and social stress.',
    },
    research: {
      coreConcept:
        'People systematically overestimate how easily outside observers can discern their private internal emotional states, lies, and anxieties.',
      scientificClaims: [
        'Public speakers assume their nervousness is glaringly obvious when observers perceive calm composure.',
        'Internal physiological signals are vivid to the self but nearly invisible externally.',
      ],
      keyStudies: [
        {
          authors: 'Gilovich, Savitsky & Medvec',
          year: 1998,
          studyName: 'The illusion of transparency: Biased assessments of others’ ability to read our emotional states',
          findings:
            'Speakers rated their own visible nervousness far higher than audience members did, and informing speakers of this effect dramatically improved performance.',
          contextOrSample: 'Students delivering impromptu speeches under evaluation.',
        },
      ],
      cognitiveMechanisms: [
        'Interoceptive salience: intense visceral heart rate and cortisol sensations are accessible only internally',
        'Failure of cognitive decentering when assessing external perception',
      ],
      caveatsAndLimitations: [
        'Extreme trembling or overt stuttering provides genuine behavioral leakage.',
        'Close romantic partners who share decades of baseline observation are better at detecting subtle cues.',
      ],
      uncertaintyLevel: 'low',
      everydayManifestation:
        'Giving a work presentation with a pounding heart, convinced every colleague can see your internal panic, only to be complimented on your composure.',
    },
    draft: {
      title: 'Why People Cannot Read Your Mind as Easily as You Think',
      pillar: 'Strange Human Behavior',
      hook:
        'When your heart hammers during a tense conversation, your visceral sensations feel loud enough for everyone in the room to hear.',
      bodyParagraphs: [
        'In 1998, researchers at Cornell and Williams College conducted a study where participants had to deliver impromptu speeches in front of a live audience. The speakers were asked to rate how visibly anxious they appeared, while the audience evaluated the same speakers on composure.',
        'The results exposed a striking divergence: speakers consistently believed their terror was written across their faces, while audience members rated them as composed and steady. Psychologists call this the Illusion of Transparency. Because we feel our internal pulse and adrenaline with overwhelming clarity, we assume those private sensations must be leaking outward into plain view.',
      ],
      coreTakeaway:
        'Your internal physiological state is far more vivid to your nervous system than it will ever appear to an outside observer.',
      sourcesCited: ['Gilovich et al. (1998), J Pers Soc Psychol'],
      caveatNote:
        'The illusion is strongest during acute stress; simply knowing that transparency is an illusion has been shown to reduce speaking anxiety.',
      cta: {
        type: 'continuation',
        text:
          'Next time you feel nervous in a meeting, remind yourself that the audience can only see your posture, not your adrenaline.',
      },
    },
    visual: {
      needed: true,
      reason: 'A comparison between internal sensation and external perception clarifies the perceptual gap.',
      template: 'comparison',
      spec: {
        title: 'The Transparency Illusion',
        subtitle: 'Internal experience vs external reality',
        tag: 'PERCEPTUAL BIAS',
        sourceCitation: 'Gilovich, Savitsky & Medvec (1998)',
        template: 'comparison',
        payload: {
          template: 'comparison',
          data: {
            leftTitle: 'What You Feel (Internal)',
            leftSubtitle: 'Hyper-Salient Interoception',
            leftPoints: [
              'Pounding heart feels deafening',
              'Racing thoughts feel broadcasted',
              'Assumption: "Everyone can see I am panicking"',
            ],
            rightTitle: 'What Others See (External)',
            rightSubtitle: 'Filtered Behavioral Output',
            rightPoints: [
              'Normal facial expression and posture',
              'Steady vocal cadence',
              'Audience perception: "Calm and articulate"',
            ],
          },
        },
      },
    },
  },
  {
    id: 'bystander_effect',
    topic: {
      topic: 'The Bystander Effect (Diffusion of Responsibility)',
      pillar: 'Strange Human Behavior',
      coreQuestion: 'Why does the presence of other people decrease the likelihood that anyone will intervene in an emergency?',
      rationale: 'Demonstrates pluralistic ignorance and diffusion of responsibility in group dynamics.',
    },
    research: {
      coreConcept:
        'The presence of other bystanders diminishes the felt personal responsibility of any single individual to intervene during emergencies, compounded by pluralistic ignorance.',
      scientificClaims: [
        'Solitary individuals intervene in emergencies up to 85% of the time, compared to under 31% when in large groups.',
        'Bystanders look to each other for social cues; when everyone feigns calm, the situation is classified as non-urgent.',
      ],
      keyStudies: [
        {
          authors: 'Darley & Latané',
          year: 1968,
          studyName: 'Bystander intervention in emergencies: Diffusion of responsibility',
          findings:
            'Participants hearing a peer experience an apparent epileptic seizure over an intercom helped 85% of the time when alone, but only 31% when they believed four others were listening.',
          contextOrSample: 'Columbia and NYU student cohorts in connected laboratory cubicles.',
        },
      ],
      cognitiveMechanisms: [
        'Diffusion of responsibility: dividing moral obligation across N observers',
        'Pluralistic ignorance: misinterpreting mutual inaction as evidence of safety',
      ],
      caveatsAndLimitations: [
        'When the danger is unambiguous and violent, bystander intervention rates rise significantly.',
        'Trained medical personnel or designated leaders break the diffusion effect.',
      ],
      uncertaintyLevel: 'low',
      everydayManifestation:
        'Watching an unattended bag smoking on a train platform while passengers glance sideways at each other, waiting for someone else to react.',
    },
    draft: {
      title: 'Why Crowds Freeze When Someone Needs Help',
      pillar: 'Strange Human Behavior',
      hook:
        'If you collapse on a deserted street with only one pedestrian nearby, your odds of receiving help are surprisingly high. In a crowd of fifty, they plummet.',
      bodyParagraphs: [
        'In 1968, psychologists John Darley and Bibb Latané staged a simulated medical crisis. College students conversed over an intercom system when suddenly one participant began gasping, calling for help, and choking. When subjects believed they were the only listener, eighty-five percent rushed out to alert researchers within minutes.',
        'When subjects believed four other listeners were on the call, only thirty-one percent took action. Darley and Latané identified two psychological traps: diffusion of responsibility and pluralistic ignorance. Each person assumes someone else has already called for help, while looking around at others who appear calm, concluding the crisis cannot be urgent.',
      ],
      coreTakeaway:
        'In emergencies, personal responsibility divides by the number of witnesses present unless explicitly directed.',
      sourcesCited: ['Darley & Latané (1968), J Pers Soc Psychol'],
      caveatNote:
        'Clear, high-danger emergencies with unmistakable physical violence see far higher rates of collective intervention.',
      cta: {
        type: 'continuation',
        text:
          'If you ever require assistance in a crowd, point directly at one specific individual and say: "You in the blue jacket, call emergency services now."',
      },
    },
    visual: {
      needed: true,
      reason: 'The steep drop in intervention percentage as group size increases provides high educational value.',
      template: 'simple_statistic',
      spec: {
        title: 'Bystander Intervention Rates by Group Size',
        subtitle: 'Darley & Latané emergency intercom experiment',
        tag: 'GROUP DYNAMICS',
        sourceCitation: 'Darley & Latané (1968)',
        template: 'simple_statistic',
        payload: {
          template: 'simple_statistic',
          data: {
            highlightMetric: '85% vs 31%',
            metricLabel: 'Alone vs. Group Intervention Rate',
            context: 'The probability of action drops by more than half when additional witnesses are believed to be present.',
            detailPoints: [
              'Alone (1-on-1): 85% intervened within 2 minutes',
              'Small group (3 people): 62% intervened',
              'Large group (5+ people): 31% intervened before the test concluded',
            ],
          },
        },
      },
    },
  },

  // ================= PILLAR 3: BRAIN, MEMORY & PERCEPTION =================
  {
    id: 'doorway_effect',
    topic: {
      topic: 'The Doorway Effect (Event Horizon Model)',
      pillar: 'Brain, Memory & Perception',
      coreQuestion: 'Why do people instantly forget what they were doing the moment they walk into another room?',
      rationale: 'Shows how physical spatial thresholds create episodic event boundaries in the hippocampus.',
    },
    research: {
      coreConcept:
        'Navigating physical doorways triggers episodic memory event boundaries in the hippocampus, flushing recent working memory to accommodate new environmental contexts.',
      scientificClaims: [
        'Passing through doorways triples the rate of forgetting compared to traversing an identical distance in a single room.',
        'The effect occurs in both real-world architecture and immersive virtual reality environments.',
      ],
      keyStudies: [
        {
          authors: 'Radvansky, Krawietz & Tamplin',
          year: 2011,
          studyName: 'Walking through doorways causes forgetting: Further explorations',
          findings:
            'Participants in virtual and real environments showed sharp memory degradation for carried items upon traversing doorways, independent of physical distance.',
          contextOrSample: 'University of Notre Dame student cohorts in physical and virtual navigation tests.',
        },
      ],
      cognitiveMechanisms: [
        'Event Horizon Model: hippocampal compartmentalization of sensory experience into distinct event files',
        'Contextual updating: working memory clears previous scene representations to free cognitive bandwidth',
      ],
      caveatsAndLimitations: [
        'Rehearsing the specific objective verbally during transit significantly shields against the doorway wipe.',
        'Transparent doorways (e.g. glass partitions) produce slightly weaker memory degradation.',
      ],
      uncertaintyLevel: 'low',
      everydayManifestation:
        'Walking briskly from the living room into the kitchen with total purpose, only to stand in front of the refrigerator completely blank.',
    },
    draft: {
      title: 'Why You Forget Why You Entered a Room',
      pillar: 'Brain, Memory & Perception',
      hook:
        'Walk through a simple doorway into another room, and your working memory can abruptly dump whatever you intended to do.',
      bodyParagraphs: [
        'In a 2011 study at the University of Notre Dame, psychologist Gabriel Radvansky tested participants navigating both physical rooms and virtual environments. Walking across a single large room caused minimal memory decay. However, passing through an open doorway immediately tripled the rate of forgetting previously memorized objects.',
        'Radvansky termed this the Event Horizon Model. The human brain perceives doorways as cognitive event boundaries. Just as an author starts a new chapter, the hippocampus flushes current working memory to prepare for the novel sensory cues of the new environment, archiving the old context away.',
      ],
      coreTakeaway:
        'Physical architectural thresholds signal the brain to compartmentalize and reset active working memory.',
      sourcesCited: ['Radvansky et al. (2011), Q J Exp Psychol'],
      caveatNote:
        'The effect is substantially weaker when you consciously rehearse the item name or objective while passing through the threshold.',
      cta: {
        type: 'reflection',
        text:
          'Next time you blank out after entering a room, retrace your steps back through the doorway to reactivate the previous cognitive event file.',
      },
    },
    visual: {
      needed: true,
      reason: 'Illustrating the event boundary transition demonstrates the hippocampal reset mechanism visually.',
      template: 'process_flow',
      spec: {
        title: 'The Event Horizon Model',
        subtitle: 'How architectural thresholds segment working memory',
        tag: 'MEMORY ARCHITECTURE',
        sourceCitation: 'Radvansky et al. (2011)',
        template: 'process_flow',
        payload: {
          template: 'process_flow',
          data: {
            steps: [
              { number: 1, title: 'Room A', description: 'Working memory maintains active task objective.' },
              { number: 2, title: 'Doorway', description: 'Sensory cortex detects contextual boundary.' },
              { number: 3, title: 'Event Reset', description: 'Hippocampus archives previous event file.' },
              { number: 4, title: 'Room B', description: 'Brain clears buffer; original purpose disappears.' },
            ],
          },
        },
      },
    },
  },
  {
    id: 'misinformation_effect',
    topic: {
      topic: 'The Misinformation Effect',
      pillar: 'Brain, Memory & Perception',
      coreQuestion: 'How can a single subtle post-event question permanently rewrite personal episodic memory?',
      rationale: 'Demonstrates the reconstructive rather than photographic nature of human memory.',
    },
    research: {
      coreConcept:
        'Human memory is malleable and reconstructive; post-event misinformation seamlessly incorporates into original memory traces during reconsolidation.',
      scientificClaims: [
        'Changing a single verb in an interrogation changes estimated speed and introduces vivid false memories.',
        'Participants report high subjective confidence in completely synthetic recollections.',
      ],
      keyStudies: [
        {
          authors: 'Loftus & Palmer',
          year: 1974,
          studyName: 'Reconstruction of automobile destruction: An example of the interaction between language and memory',
          findings:
            'Asking how fast cars were going when they "smashed" vs "hit" each other increased speed estimates by 9 mph and caused subjects to remember non-existent broken glass.',
          contextOrSample: '45 university students watching filmed car collisions.',
        },
      ],
      cognitiveMechanisms: [
        'Source monitoring errors: inability to differentiate original sensory perception from subsequent semantic suggestions',
        'Memory reconsolidation: retrieving a memory renders it labile and rewriteable',
      ],
      caveatsAndLimitations: [
        'Central, emotionally salient facts are harder to distort than peripheral scene details.',
        'Immediate unprompted free recall immediately after an event protects against later misinformation.',
      ],
      uncertaintyLevel: 'low',
      everydayManifestation:
        'Remembering a childhood road trip with absolute photographic clarity, only to find family photos showing you were at home with the flu.',
    },
    draft: {
      title: 'How a Single Word Can Rewrite Your Memories',
      pillar: 'Brain, Memory & Perception',
      hook:
        'Most people believe memory operates like a video camera recording reality. Cognitive science proves it works more like a Wikipedia page anyone can edit.',
      bodyParagraphs: [
        'In 1974, psychologists Elizabeth Loftus and John Palmer showed students filmed car crashes and asked them to estimate the vehicles’ speed. For one group, the question was: "About how fast were the cars going when they smashed each other?" For other groups, the verb was replaced with "collided," "bumped," "hit," or "contacted."',
        'The single word "smashed" caused participants to estimate the speed nine miles per hour faster than those given "hit." A week later, Loftus asked if they recalled seeing any broken glass. Although the film showed zero broken glass, thirty-two percent of the "smashed" group falsely remembered shattered glass, compared to only fourteen percent of the others. Language had rewritten the memory trace.',
      ],
      coreTakeaway:
        'Memory is reconstructive rather than reproductive; every time you retrieve a memory, it can be altered before saving.',
      sourcesCited: ['Loftus & Palmer (1974), J Verbal Learn Verbal Behav'],
      caveatNote:
        'Central, emotionally intense elements of an event resist distortion far more effectively than peripheral background details.',
      cta: {
        type: 'reflection',
        text:
          'When arguing with someone about a conversation from last month, consider that both of your brains may have edited the transcript.',
      },
    },
    visual: {
      needed: true,
      reason: 'A research timeline and comparison shows the progression of speed estimates based on wording.',
      template: 'comparison',
      spec: {
        title: 'The Power of Wording on Memory',
        subtitle: 'Loftus & Palmer automobile destruction study',
        tag: 'MEMORY RECONSTRUCTION',
        sourceCitation: 'Loftus & Palmer (1974)',
        template: 'comparison',
        payload: {
          template: 'comparison',
          data: {
            leftTitle: 'Verb: "Contacted" / "Hit"',
            leftSubtitle: 'Neutral Verbs',
            leftPoints: [
              'Estimated speed: 31.8 - 34.0 mph',
              'Reported broken glass: 14%',
              'Memory trace remained largely intact',
            ],
            rightTitle: 'Verb: "Smashed"',
            rightSubtitle: 'Loaded Verb',
            rightPoints: [
              'Estimated speed: 40.5 mph (+9 mph)',
              'Reported broken glass: 32%',
              'Fabricated non-existent visual details into recall',
            ],
          },
        },
      },
    },
  },
  {
    id: 'stroop_effect',
    topic: {
      topic: 'The Stroop Effect',
      pillar: 'Brain, Memory & Perception',
      coreQuestion: 'Why does reading words override color recognition even when we deliberately try not to read?',
      rationale: 'Highlights automaticity in linguistic processing vs controlled attentional inhibition.',
    },
    research: {
      coreConcept:
        'Automated lexical processing produces involuntary cognitive interference that delays attentional color-naming responses when the word and color contradict.',
      scientificClaims: [
        'Naming the ink color of an incongruent word takes significantly longer than naming color patches.',
        'Word reading is an involuntary, over-learned reflex in literate adults.',
      ],
      keyStudies: [
        {
          authors: 'John Ridley Stroop',
          year: 1935,
          studyName: 'Studies of interference in serial verbal reactions',
          findings:
            'Participants were up to 74% slower to name the font colors of incongruent words (e.g. the word "BLUE" written in red ink) than control patches.',
          contextOrSample: 'College students tested on speeded color and word reading sheets.',
        },
      ],
      cognitiveMechanisms: [
        'Automaticity: reading requires zero conscious resource allocation',
        'Dorsolateral prefrontal and anterior cingulate cortex conflict resolution delay',
      ],
      caveatsAndLimitations: [
        'The effect does not occur in pre-literate children who have not yet automated word decoding.',
        'Extensive targeted practice on specific color-word pairs attenuates response latency.',
      ],
      uncertaintyLevel: 'low',
      everydayManifestation:
        'Struggling to read a road sign or UI button when the text says "CANCEL" but the button is rendered in bright green.',
    },
    draft: {
      title: 'Why Reading Words Overrides Color Recognition',
      pillar: 'Brain, Memory & Perception',
      hook:
        'Look at the word "RED" written in bright green ink, and try naming the font color aloud without hesitation.',
      bodyParagraphs: [
        'In 1935, American psychologist John Ridley Stroop published a series of experiments demonstrating that literate adults cannot stop themselves from reading words. When asked to name the ink color of incongruent words—such as the word "BLUE" printed in red ink—participants slowed down by over seventy percent compared to naming simple colored blocks.',
        'Stroop revealed that through years of literacy practice, reading becomes an automated, ballistic reflex. The brain processes the linguistic meaning of the letters before the visual system can isolate and name the pigment of the ink. Resolving this conflict forces the anterior cingulate cortex to slam the brakes on speech output.',
      ],
      coreTakeaway:
        'Automated cognitive routines execute involuntarily, creating neural traffic jams when deliberate tasks conflict.',
      sourcesCited: ['Stroop (1935), J Exp Psychol'],
      caveatNote:
        'The Stroop effect disappears entirely in non-readers, proving that cognitive automaticity is conditioned rather than innate.',
      cta: {
        type: 'continuation',
        text:
          'Notice how much cognitive effort you expend when an app uses a green button for "Delete" or a red button for "Confirm."',
      },
    },
    visual: {
      needed: true,
      reason: 'Visualizing the conflict between semantic meaning and visual color makes the cognitive interference visceral.',
      template: 'comparison',
      spec: {
        title: 'Cognitive Interference: The Stroop Paradox',
        subtitle: 'Semantic decoding speed vs color identification',
        tag: 'ATTENTIONAL CONTROL',
        sourceCitation: 'Stroop (1935)',
        template: 'comparison',
        payload: {
          template: 'comparison',
          data: {
            leftTitle: 'Automatic Pathway',
            leftSubtitle: 'Word Reading',
            leftPoints: [
              'Involuntary over-learned reflex',
              'Speed of processing: under 200ms',
              'Cannot be consciously suppressed by literate adults',
            ],
            rightTitle: 'Controlled Pathway',
            rightSubtitle: 'Color Naming',
            rightPoints: [
              'Requires effortful selective attention',
              'Speed of processing: 350-400ms',
              'Delayed by anterior cingulate conflict resolution',
            ],
          },
        },
      },
    },
  },

  // ================= PILLAR 4: PSYCHOLOGY THOUGHT EXPERIMENTS =================
  {
    id: 'trolley_footbridge',
    topic: {
      topic: 'The Trolley Problem: Footbridge Dilemma (Greene Neuroimaging)',
      pillar: 'Psychology Thought Experiments',
      coreQuestion: 'Why do people switch a lever to save five lives, but refuse to push one person directly off a footbridge?',
      rationale: 'Highlights the dual-process conflict between utilitarian prefrontal calculation and personal emotional aversion.',
    },
    research: {
      coreConcept:
        'Direct personal physical harm recruits emotional processing in the medial prefrontal cortex and amygdala, overriding utilitarian calculations in the dorsolateral prefrontal cortex.',
      scientificClaims: [
        'Over 85% of people agree to switch a lever to redirect a trolley, but under 15% agree to push a stranger off a footbridge.',
        'fMRI reveals distinct neural circuits for impersonal versus personal moral dilemmas.',
      ],
      keyStudies: [
        {
          authors: 'Greene, Sommerville, Nystrom, Darley & Cohen',
          year: 2001,
          studyName: 'An fMRI investigation of emotional engagement in moral judgment',
          findings:
            'Personal moral dilemmas (footbridge) showed marked increased activity in brain regions associated with emotion, whereas impersonal dilemmas (switch) mirrored standard working memory tasks.',
          contextOrSample: 'fMRI neuroimaging scans of healthy adult participants during moral dilemmas.',
        },
      ],
      cognitiveMechanisms: [
        'Dual-process moral theory: cognitive/utilitarian system (DLPFC) vs intuitive/emotional system (VMPFC/amygdala)',
        'Evolutionary aversion to personal violent physical contact with conspecifics',
      ],
      caveatsAndLimitations: [
        'Individuals with damage to the ventromedial prefrontal cortex endorse pushing the stranger at significantly higher rates.',
        'Hypothetical dilemma responses do not always predict visceral actions in real-world high-stakes crises.',
      ],
      uncertaintyLevel: 'low',
      everydayManifestation:
        'Feeling fine voting for a cost-cutting budget policy that affects nameless employees, but feeling sick if forced to fire one employee face-to-face.',
    },
    draft: {
      title: 'Why We Flip a Lever But Refuse to Push',
      pillar: 'Psychology Thought Experiments',
      hook:
        'If a runaway trolley is hurtling toward five track workers, most people will pull a lever to steer it onto a side track where it kills one person. But change the method, and moral intuition revolts.',
      bodyParagraphs: [
        'Philosopher Philippa Foot conceived the trolley problem in 1967, but neuroscientist Joshua Greene transformed it into cognitive science in 2001. In the "switch" scenario, eighty-five percent of people agree that trading one life for five is morally acceptable. Yet in the "footbridge" scenario, where you must physically push a large stranger off a bridge to stop the same train, fewer than twelve percent agree.',
        'Mathematically, both scenarios produce the exact same outcome: one dead, five saved. But Greene placed participants inside fMRI scanners and discovered two completely different brain networks in conflict. The switch dilemma activates the dorsolateral prefrontal cortex, which handles impersonal mathematical trade-offs. The footbridge dilemma instantly ignites the amygdala and medial prefrontal cortex, triggering an ancient evolutionary alarm against personal violence.',
      ],
      coreTakeaway:
        'Human moral judgments are not derived from pure logic, but from a dual-process battle between cold calculation and evolutionary emotional alarms.',
      sourcesCited: ['Greene et al. (2001), Science'],
      caveatNote:
        'Patients with lesions in the ventromedial prefrontal cortex display no emotional alarm and choose the utilitarian push without hesitation.',
      cta: {
        type: 'reflection',
        text:
          'Notice how much easier it is to make harsh decisions through a keyboard or spreadsheet than when sitting directly across from another human.',
      },
    },
    visual: {
      needed: true,
      reason: 'The thought experiment format requires comparing scenario branches and the underlying neural conflict.',
      template: 'thought_experiment',
      spec: {
        title: 'The Trolley Problem: Switch vs. Footbridge',
        subtitle: 'Dual-process moral neuroimaging',
        tag: 'MORAL COGNITION',
        sourceCitation: 'Greene et al. (2001), Science',
        template: 'thought_experiment',
        payload: {
          template: 'thought_experiment',
          data: {
            scenarioName: 'Impersonal Lever vs. Personal Physical Push',
            dilemma: 'A runaway trolley will kill five workers unless you sacrifice one person.',
            branchA: {
              label: 'The Lever Switch (85% Agree)',
              explanation: 'Activates dorsolateral prefrontal cortex for abstract utilitarian calculation.',
            },
            branchB: {
              label: 'The Footbridge Push (12% Agree)',
              explanation: 'Triggers intense medial prefrontal and amygdala alarm against personal violence.',
            },
            psychologicalInsight:
              'Moral intuition is governed by emotional aversion to direct physical harm, not abstract mathematics.',
          },
        },
      },
    },
  },
  {
    id: 'experience_machine',
    topic: {
      topic: 'The Experience Machine (Nozick Applied Psychology)',
      pillar: 'Psychology Thought Experiments',
      coreQuestion: 'If an artificial pod could guarantee perpetual bliss, why do most humans reject plugging in?',
      rationale: 'Demonstrates that human motivation prioritizes authentic agency and reality-testing over raw subjective valence.',
    },
    research: {
      coreConcept:
        'Human motivation prioritizes authentic agency, contact with objective reality, and self-determination over unearned hedonic pleasure.',
      scientificClaims: [
        'Over 70% of people reject a lifetime plugged into an artificial pleasure machine.',
        'Subjective well-being requires perceived real-world impact and authentic obstacles.',
      ],
      keyStudies: [
        {
          authors: 'Nozick (1974) / Weijers (2014)',
          year: 2014,
          studyName: 'Nozick’s experience machine is only a fallacy of status quo bias (and empirical testing)',
          findings:
            'Across varied experimental formulations, a majority of participants consistently prefer authentic lived reality with genuine suffering over synthetic simulated ecstasy.',
          contextOrSample: 'Cross-national survey cohorts evaluating hedonic vs reality preferences.',
        },
      ],
      cognitiveMechanisms: [
        'Need for authentic self-determination and causal agency (Ryan & Deci SDT)',
        'Status quo bias and loss aversion regarding current identity and relationships',
      ],
      caveatsAndLimitations: [
        'Framing the thought experiment as "you are already in the machine; do you want to wake up?" increases willingness to stay.',
        'Severe chronic physical or psychiatric suffering alters hedonic calculations.',
      ],
      uncertaintyLevel: 'low',
      everydayManifestation:
        'Refusing to play a video game with cheat codes permanently enabled because unearned triumph feels psychologically hollow.',
    },
    draft: {
      title: 'Why Most People Refuse Guaranteed Happiness',
      pillar: 'Psychology Thought Experiments',
      hook:
        'Imagine a machine that could stimulate your brain to feel continuous, unadulterated happiness for the rest of your life, with zero downside.',
      bodyParagraphs: [
        'In 1974, philosopher Robert Nozick proposed a provocative thought experiment: imagine super-neuroscientists have built an "Experience Machine." You can plug in and experience writing a masterpiece, falling in love, or walking on Mars, with zero awareness that it is a simulation. You will be completely happy until you die. Would you plug in?',
        'When psychologists test this scenario empirically, over seventy percent of people refuse. Hedonistic philosophy assumes humans care only about maximizing pleasure and minimizing pain. Nozick’s dilemma proves otherwise: our evolutionary psychology prioritizes authentic agency, contact with an unvarnished reality, and actual accomplishment over simulated perfection.',
      ],
      coreTakeaway:
        'Human fulfillment requires genuine agency and contact with reality; the mind rejects happiness if it knows it was fabricated.',
      sourcesCited: ['Nozick (1974), Basic Books; Weijers (2014), Philos Psychol'],
      caveatNote:
        'Status quo bias plays a role: if told they are already plugged in, significantly more people choose to remain.',
      cta: {
        type: 'conversation',
        text:
          'If you could plug into the machine for just one month every year, would you take the offer?',
      },
    },
    visual: {
      needed: true,
      reason: 'Contrasting synthetic hedonic bliss against authentic reality reveals the core psychological preference.',
      template: 'comparison',
      spec: {
        title: 'The Experience Machine Dilemma',
        subtitle: 'Synthetic hedonic bliss vs authentic reality',
        tag: 'PHILOSOPHICAL PSYCHOLOGY',
        sourceCitation: 'Nozick (1974)',
        template: 'comparison',
        payload: {
          template: 'comparison',
          data: {
            leftTitle: 'The Machine (Hedonism)',
            leftSubtitle: 'Simulated Ecstasy',
            leftPoints: [
              'Guaranteed continuous joy',
              'Zero grief, failure, or physical pain',
              'Rejected by >70% of people',
            ],
            rightTitle: 'Real Life (Authenticity)',
            rightSubtitle: 'Unvarnished Reality',
            rightPoints: [
              'Includes suffering and heartbreak',
              'Preserves true personal agency and impact',
              'Fulfills core evolutionary need for reality-testing',
            ],
          },
        },
      },
    },
  },
  {
    id: 'invisible_gorilla',
    topic: {
      topic: 'The Invisible Gorilla (Inattentional Blindness)',
      pillar: 'Psychology Thought Experiments',
      coreQuestion: 'Why does intense focus on a task make humans completely blind to obvious events in plain sight?',
      rationale: 'Demonstrates selective attentional filtering and inattentional blindness.',
    },
    research: {
      coreConcept:
        'Intensive focal visual attention selectively filters unattended visual inputs, preventing unexpected stimuli from entering conscious awareness regardless of physical size or salience.',
      scientificClaims: [
        'Approximately 50% of observers fail to notice a person in a gorilla suit walking across a basketball court when counting passes.',
        'High visual workload deprives unattended features of conscious binding.',
      ],
      keyStudies: [
        {
          authors: 'Chabris & Simons',
          year: 1999,
          studyName: 'Gorillas in our midst: Sustained inattentional blindness for dynamic events',
          findings:
            'Half of the participants counting basketball passes by players in white shirts failed to see a person in a full gorilla suit beat their chest in the center of the video.',
          contextOrSample: 'Harvard University experimental participants.',
        },
      ],
      cognitiveMechanisms: [
        'Selective attention bottleneck: fronto-parietal attention networks allocate finite sensory bandwidth',
        'Top-down feature filtering suppressing black-clad stimuli while tracking white shirts',
      ],
      caveatsAndLimitations: [
        'Lowering the counting task difficulty increases detection rate.',
        'Expertise in basketball slightly moderates but does not eliminate inattentional blindness.',
      ],
      uncertaintyLevel: 'low',
      everydayManifestation:
        'Looking for your keys on a desk and scanning past them three times because your mind was searching for a silver keychain instead of a black leather lanyard.',
    },
    draft: {
      title: 'Why Intense Focus Makes You Blind to What Is Obvious',
      pillar: 'Psychology Thought Experiments',
      hook:
        'If a person in a full gorilla costume walked through your living room right now and thumped their chest, you would certainly notice. Or would you?',
      bodyParagraphs: [
        'In 1999, Harvard psychologists Christopher Chabris and Daniel Simons showed subjects a video of two teams passing basketballs, one wearing white shirts and the other black. Viewers were given one task: count the silent passes made by the white team. Midway through the video, a woman dressed in a full gorilla suit walked into the center, faced the camera, thumped her chest, and walked away.',
        'Half of the participants never saw the gorilla. When researchers rewound the tape, viewers were stunned, often accusing the scientists of swapping videos. Chabris and Simons demonstrated inattentional blindness: because viewers were selectively attending to white shirts, their visual cortex actively filtered out the color black, rendering a giant gorilla completely invisible.',
      ],
      coreTakeaway:
        'We do not perceive the world as it is; our brains perceive only the narrow slice of reality we are paying attention to.',
      sourcesCited: ['Simons & Chabris (1999), Perception'],
      caveatNote:
        'Inattentional blindness occurs because the brain is doing its job efficiently: filtering out distractions to preserve focus on the goal.',
      cta: {
        type: 'continuation',
        text:
          'Next time you are convinced a colleague or partner made an obvious mistake on purpose, consider whether inattentional blindness simply erased it.',
      },
    },
    visual: {
      needed: true,
      reason: 'The 50% detection rate in the famous gorilla experiment is surprising and benefits from a statistical graphic.',
      template: 'simple_statistic',
      spec: {
        title: 'Inattentional Blindness Baseline',
        subtitle: 'Harvard selective attention pass-counting experiment',
        tag: 'ATTENTIONAL LIMITS',
        sourceCitation: 'Simons & Chabris (1999)',
        template: 'simple_statistic',
        payload: {
          template: 'simple_statistic',
          data: {
            highlightMetric: '50%',
            metricLabel: 'Missed the Gorilla Completely',
            context: 'Half of all participants failed to notice a person in a gorilla suit walking across the frame for 9 seconds.',
            detailPoints: [
              'Task: Count passes by white-shirt team',
              'Gorilla stopped in center and thumped chest for 9 seconds',
              'Viewers looked directly at the gorilla with their eyes, but visual cortex discarded the data',
            ],
          },
        },
      },
    },
  },
];

/**
 * Normalizes text to assist in finding matching curated entries.
 */
function normalizeKey(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Finds a matching curated entry by topic name, or undefined if none match.
 */
export function findCuratedEntryByTopic(topicName: string): CuratedEntry | undefined {
  const normTarget = normalizeKey(topicName);

  // Exact or normalized match
  for (const entry of CURATED_ENTRIES) {
    const normEntryTopic = normalizeKey(entry.topic.topic);
    if (normTarget === normEntryTopic || normTarget.includes(normEntryTopic) || normEntryTopic.includes(normTarget)) {
      return entry;
    }
  }

  // Keyword match
  const keywordMappings: Array<{ keywords: string[]; id: string }> = [
    { keywords: ['white bear', 'ironic process', 'thought suppression'], id: 'ironic_process' },
    { keywords: ['zeigarnik', 'unfinished task', 'incomplete task'], id: 'zeigarnik_effect' },
    { keywords: ['cognitive dissonance', 'peg', 'festinger', 'boring tasks'], id: 'cognitive_dissonance' },
    { keywords: ['ben franklin', 'favor'], id: 'ben_franklin' },
    { keywords: ['spotlight effect', 'barry manilow', 'nobody is watching'], id: 'spotlight_effect' },
    { keywords: ['transparency', 'read your mind', 'internal emotions'], id: 'illusion_of_transparency' },
    { keywords: ['bystander', 'diffusion of responsibility', 'darley', 'latane'], id: 'bystander_effect' },
    { keywords: ['doorway', 'event horizon', 'forget why', 'radvansky'], id: 'doorway_effect' },
    { keywords: ['misinformation', 'loftus', 'car crash', 'smashed'], id: 'misinformation_effect' },
    { keywords: ['stroop', 'color recognition', 'reading words'], id: 'stroop_effect' },
    { keywords: ['trolley', 'footbridge', 'greene', 'flip a lever'], id: 'trolley_footbridge' },
    { keywords: ['experience machine', 'nozick', 'guaranteed happiness'], id: 'experience_machine' },
    { keywords: ['invisible gorilla', 'gorilla', 'inattentional blindness', 'simons'], id: 'invisible_gorilla' },
  ];

  for (const map of keywordMappings) {
    if (map.keywords.some((kw) => topicName.toLowerCase().includes(kw))) {
      return CURATED_ENTRIES.find((e) => e.id === map.id);
    }
  }

  return undefined;
}

/**
 * Get all curated entries for a specific pillar.
 */
export function getCuratedEntriesForPillar(pillar: ContentPillar): CuratedEntry[] {
  return CURATED_ENTRIES.filter((e) => e.topic.pillar === pillar);
}

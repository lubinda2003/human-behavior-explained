/**
 * Curated Mystery & Investigation Seeds
 * Production-ready fictional mystery cases designed for logical consistency,
 * multi-step clue distribution, and interactive audience polls.
 */

import { MysteryCase } from './types.js';

export const CURATED_MYSTERY_CASES: MysteryCase[] = [
  {
    caseId: 'CASE-2026-001',
    title: 'The Locked Conservatory at Ravenscroft Manor',
    caseType: 'fictional',
    difficulty: 'intermediate',
    tags: ['locked_room', 'botanical_puzzle', 'manor_mystery'],
    premise:
      'Lord Sterling was found unconscious inside his sealed Victorian glass conservatory. Every window was bolted from within, the heavy brass door was deadbolted from the inside with the key still in the lock, and the air smelled faintly of bitter crushed almonds.',
    setting: {
      location: 'Ravenscroft Estate, Blackwood Valley',
      timePeriod: 'Autumn 1924 / Contemporary Estate',
      atmosphere: 'Heavy rain pounding against foggy greenhouse glass with dense tropical foliage.',
    },
    characters: [
      {
        id: 'char-1',
        name: 'Dr. Helena Vance',
        role: 'Resident Botanist & Curator',
        description: 'Meticulous researcher managing Sterling’s rare orchid hybridization project.',
        alibiOrMotive:
          'Sterling threatened to defund her research; claims she was in the library categorizing herbarium specimens until 11:00 PM.',
        isSuspect: true,
        notes: 'Has intimate knowledge of rapid cyanide synthesis from rare Prunus seed extracts.',
      },
      {
        id: 'char-2',
        name: 'Arthur Sterling',
        role: 'Estranged Nephew & Sole Heir',
        description: 'Deeply in debt to overseas trading syndicates; arrived unexpectedly that morning.',
        alibiOrMotive:
          'Stands to inherit the estate; claims he was in the billiards wing with the estate butler.',
        isSuspect: true,
        notes: 'Smelled faintly of cigar smoke and damp wool.',
      },
      {
        id: 'char-3',
        name: 'Thomas Finch',
        role: 'Master Butler & Keyholder',
        description: 'Served the manor for forty-two years; carries the master keys.',
        alibiOrMotive:
          'Loyal to Sterling; claims he delivered evening chamomile tea to the conservatory table at 9:30 PM.',
        isSuspect: false,
        notes: 'Noticed the conservatory heating pipes were unusually hot.',
      },
    ],
    mysteryQuestion:
      'How was the toxic compound delivered into a room bolted securely from the inside without the culprit being present?',
    evidence: [
      {
        id: 'ev-1',
        title: 'Shattered Terrarium Heating Coil',
        type: 'physical',
        locationFound: 'Directly beneath the central humidifying intake fan',
        significance:
          'A modified copper heating element was wired to an automated timer scheduled for 10:15 PM.',
        analysis:
          'Forensics found crushed high-potency apricot pit extract residue baked directly onto the hot copper coil.',
      },
      {
        id: 'ev-2',
        title: 'Sealed Chamomile Teacup',
        type: 'forensic',
        locationFound: 'Mahogany reading desk inside the conservatory',
        significance:
          'The tea was tested for poisons and returned completely clean.',
        analysis: 'Proves the poison was not ingested orally through food or drink.',
      },
      {
        id: 'ev-3',
        title: 'Internal Door Deadbolt Alignment',
        type: 'physical',
        locationFound: 'Main conservatory double door',
        significance:
          'The brass key was turned from inside; no strings, magnets, or tool marks on the keyhole.',
        analysis:
          'Sterling locked himself inside as was his strict routine before nocturnal orchid pollination.',
      },
      {
        id: 'ev-4',
        title: 'Botanical Laboratory Logbook',
        type: 'document',
        locationFound: 'Dr. Vance’s locked workbench in the garden shed',
        significance:
          'A missing requisition entry for 500g of raw amygdalin precursor extract from two days prior.',
        analysis: 'Matches the chemical residue found on the heating coil.',
      },
    ],
    timeline: [
      {
        timestamp: '09:30 PM',
        title: 'Tea Delivered',
        description: 'Finch brings fresh chamomile tea to Lord Sterling.',
        evidenceId: 'ev-2',
      },
      {
        timestamp: '09:45 PM',
        title: 'Conservatory Sealed',
        description: 'Lord Sterling bolts the heavy doors from inside for night pollination.',
        evidenceId: 'ev-3',
      },
      {
        timestamp: '10:15 PM',
        title: 'Timer Activation',
        description: 'The automated copper heating coil vaporizes amygdalin powder into the airflow.',
        evidenceId: 'ev-1',
      },
      {
        timestamp: '10:45 PM',
        title: 'Discovery',
        description: 'Finch sees Sterling collapsed through the glass and sounds the alarm.',
      },
    ],
    possibleExplanations: [
      {
        id: 'hyp-1',
        hypothesis: 'Arthur slipped poison into the chamomile tea before Finch delivered it.',
        plausibility: 'low',
        supportingEvidenceIds: [],
        counterEvidenceIds: ['ev-2'],
      },
      {
        id: 'hyp-2',
        hypothesis:
          'Dr. Vance rigged an airborne vaporization trap using the heating coil and ventilation timer before Sterling locked the doors.',
        plausibility: 'high',
        supportingEvidenceIds: ['ev-1', 'ev-4', 'ev-3'],
        counterEvidenceIds: [],
      },
      {
        id: 'hyp-3',
        hypothesis:
          'An intruder entered through a secret glass panel, poisoned Sterling, and escaped.',
        plausibility: 'low',
        supportingEvidenceIds: [],
        counterEvidenceIds: ['ev-3'],
      },
    ],
    correctResolution: {
      answer:
        'Dr. Vance used her botanical access to coat the automated humidity heating coil with volatile amygdalin extract. Sterling locked himself in, and at 10:15 PM the timer vaporized the compound directly into the closed ventilation loop.',
      culpritOrCause: 'Dr. Helena Vance',
      keyClueIds: ['ev-1', 'ev-2', 'ev-4'],
      howDeductionWorks:
        'Because the tea was clean and the doors were truly deadbolted from the inside, the delivery mechanism had to be atmospheric. The timed heating coil and missing lab amygdalin isolate Vance as the only entity with both means and technical execution.',
      aftermathOrConclusion:
        'Sterling was revived in time by emergency responders due to the dilution of the airborne dose, and the missing lab logbook sealed Vance’s indictment.',
    },
    createdAt: '2026-09-20T12:00:00.000Z',
  },
  {
    caseId: 'CASE-2026-002',
    title: 'The Blackwood Gallery Blackout',
    caseType: 'fictional',
    difficulty: 'intermediate',
    tags: ['museum_heist', 'timing_cipher', 'security_puzzle'],
    premise:
      'During a four-minute storm-triggered power outage at the prestigious Blackwood Gallery, the multimillion-dollar Aurelius Sapphire vanished from its laser-monitored pedestal. The security lasers never triggered, the backup generators kicked in on schedule, but the glass casing was empty.',
    setting: {
      location: 'The Blackwood Metropolitan Gallery, High Vault Room',
      timePeriod: 'Present Day',
      atmosphere: 'Rainstorm outside, dim amber emergency lighting, polished marble floors reflecting flashing alarms.',
    },
    characters: [
      {
        id: 'char-1',
        name: 'Julian Croft',
        role: 'Chief Security Officer',
        description: 'Former military signals officer who designed the gallery’s multi-spectrum laser perimeter.',
        alibiOrMotive:
          'Was in the central monitoring booth trying to manually reboot the main circuit switchboard.',
        isSuspect: true,
        notes: 'Has encrypted root access to the security firmware timing logs.',
      },
      {
        id: 'char-2',
        name: 'Nadia Laurent',
        role: 'Lead Restoration Conservator',
        description: 'World expert on historical mineral refraction and ancient jewelry display mounts.',
        alibiOrMotive:
          'Claims she was inspecting Flemish paintings in the adjoining wing when lights died.',
        isSuspect: true,
        notes: 'Carried a laser-cut synthetic cubic zirconia duplicate in her field kit for optical calibration.',
      },
      {
        id: 'char-3',
        name: 'Victor Vance',
        role: 'Evening Curator & Gala Host',
        description: 'Facing personal bankruptcy following heavy speculative art investments.',
        alibiOrMotive:
          'Was greeting guests in the main banquet hall; witnessed by dozens of patrons.',
        isSuspect: false,
        notes: 'Held the only physical emergency override key to the pedestal glass.',
      },
    ],
    mysteryQuestion:
      'How was the gem removed without triggering the fail-safe laser tripwire even for a single millisecond during the blackout?',
    evidence: [
      {
        id: 'ev-1',
        title: 'Laser Photodiode Reflection Mirror',
        type: 'forensic',
        locationFound: 'Tucked inside the velvet base of the display pedestal',
        significance:
          'A miniature 45-degree beam splitter was secretly affixed over the receiver diode.',
        analysis:
          'Redirected the laser back into its own receiver, maintaining a closed loop even when the gemstone was physically lifted.',
      },
      {
        id: 'ev-2',
        title: 'Digital Firmware Log: Timestamp Skew',
        type: 'digital',
        locationFound: 'Central security mainframe server',
        significance:
          'Shows the main power wasn’t cut by lightning, but by a timed command script executed 3 hours earlier.',
        analysis: 'Script was signed using an internal conservator workstation certificate.',
      },
      {
        id: 'ev-3',
        title: 'Restoration Glove Fibers',
        type: 'physical',
        locationFound: 'On the rim of the laser beam splitter',
        significance:
          'Micro-fibers of lint-free nitrile polymer treated with specific anti-static conservation oil.',
        analysis: 'Identical to the proprietary supplies used exclusively by Nadia Laurent.',
      },
    ],
    timeline: [
      {
        timestamp: '07:30 PM',
        title: 'Workstation Script Loaded',
        description: 'A 240-second simulated power surge script is scheduled on the sub-circuit.',
        evidenceId: 'ev-2',
      },
      {
        timestamp: '09:00 PM',
        title: 'The Blackout',
        description: 'Main gallery lights extinguish abruptly. Emergency generators spin up with a 12-second lag.',
      },
      {
        timestamp: '09:02 PM',
        title: 'Beam Splitter Deployed',
        description: 'The laser loop is closed locally; sapphire is lifted cleanly from the mount.',
        evidenceId: 'ev-1',
      },
      {
        timestamp: '09:04 PM',
        title: 'Power Restores',
        description: 'Pedestal glass remains unscratched, but the sapphire is missing.',
      },
    ],
    possibleExplanations: [
      {
        id: 'hyp-1',
        hypothesis: 'Julian Croft bypassed the security grid from the server room using master codes.',
        plausibility: 'medium',
        supportingEvidenceIds: [],
        counterEvidenceIds: ['ev-3', 'ev-2'],
      },
      {
        id: 'hyp-2',
        hypothesis:
          'Nadia Laurent installed a optical beam splitter during afternoon maintenance and triggered the timed circuit trip to steal the gem.',
        plausibility: 'high',
        supportingEvidenceIds: ['ev-1', 'ev-2', 'ev-3'],
        counterEvidenceIds: [],
      },
      {
        id: 'hyp-3',
        hypothesis: 'An outside thief cut the external power line and smashed the glass.',
        plausibility: 'low',
        supportingEvidenceIds: [],
        counterEvidenceIds: ['ev-1', 'ev-2'],
      },
    ],
    correctResolution: {
      answer:
        'Nadia Laurent used her afternoon optical calibration session to install a miniature beam splitter over the receiver diode. When her timed workstation script cut the lights, she lifted the sapphire in total darkness without ever breaking the laser circuit.',
      culpritOrCause: 'Nadia Laurent',
      keyClueIds: ['ev-1', 'ev-2', 'ev-3'],
      howDeductionWorks:
        'The beam splitter proves the theft required optical physical tampering rather than remote hacking. The workstation signature and proprietary glove micro-fibers conclusively pinpoint the conservator.',
      aftermathOrConclusion:
        'The sapphire was recovered from inside Nadia’s optical calibration case, concealed beneath a double-bottom lens tray.',
    },
    createdAt: '2026-09-20T12:00:00.000Z',
  },
  {
    caseId: 'CASE-2026-003',
    title: 'The Ghost Signal of Sub-Zero Outpost 9',
    caseType: 'fictional',
    difficulty: 'expert',
    tags: ['arctic_anomaly', 'acoustic_puzzle', 'scientific_puzzle'],
    premise:
      'At an isolated Arctic climatology station cut off by a blizzard, an automated distress signal broadcasted morse code for six hours straight. When rescue arrived, all four scientists were safe asleep in their bunks, and the transmitter room was locked from the outside. None of the crew claimed to have touched the radio.',
    setting: {
      location: 'Outpost Echo-9, Ellesmere Ice Shelf',
      timePeriod: 'Winter Expedition',
      atmosphere: 'Howling minus-40-degree blizzard winds, metallic hum of backup turbine generators.',
    },
    characters: [
      {
        id: 'char-1',
        name: 'Dr. Soren Lind',
        role: 'Chief Acoustic Physicist',
        description: 'Specialist in glacial seismic resonance and sub-surface acoustic monitoring.',
        alibiOrMotive: 'Was monitoring ice fracture sensors in the deep trench annex.',
        isSuspect: true,
        notes: 'Had repeatedly argued the expedition should be evacuated due to ice shelf instability.',
      },
      {
        id: 'char-2',
        name: 'Karin Meyer',
        role: 'Communications Engineer',
        description: 'Maintains satellite uplinks and emergency broadcast transceivers.',
        alibiOrMotive: 'Took sedative medication and went to sleep at 22:00.',
        isSuspect: true,
        notes: 'Noticed erratic frequency modulation on antenna array #3 earlier that morning.',
      },
    ],
    mysteryQuestion:
      'What triggered the mechanical morse transmitter key in a locked room when no human was present?',
    evidence: [
      {
        id: 'ev-1',
        title: 'Ice Core Expansion on Antenna Guy-Wire',
        type: 'physical',
        locationFound: 'Roof mast directly above the transmitter ceiling duct',
        significance:
          'A heavy accumulation of rime ice had formed an asymmetric pendulum on the guy-wire.',
        analysis:
          'Wind gusts at exactly 68 knots caused the wire to oscillate at 2.4 Hz, vibrating a loose ceiling conduit.',
      },
      {
        id: 'ev-2',
        title: 'Mechanical Telegraph Key Spring Tension',
        type: 'forensic',
        locationFound: 'Transmitter desk inside locked comms room',
        significance:
          'The return spring was weakened by metal fatigue; contact gap was under 0.8mm.',
        analysis:
          'The vibrating ceiling conduit directly bumped the copper lever arm in rhythm with wind harmonic pulses.',
      },
    ],
    timeline: [
      {
        timestamp: '22:00',
        title: 'Comms Locked',
        description: 'Meyer locks the radio room and turns in for the night.',
      },
      {
        timestamp: '01:15',
        title: 'Blizzard Peak',
        description: 'Sustained 68-knot winds induce resonant vibration on ice-laden roof cables.',
        evidenceId: 'ev-1',
      },
      {
        timestamp: '01:20',
        title: 'Morse Signal Begins',
        description: 'Vibrating conduit taps the sensitive telegraph key at steady rhythmic intervals.',
        evidenceId: 'ev-2',
      },
    ],
    possibleExplanations: [
      {
        id: 'hyp-1',
        hypothesis: 'Dr. Lind faked the distress call to force an early evacuation.',
        plausibility: 'medium',
        supportingEvidenceIds: [],
        counterEvidenceIds: ['ev-1', 'ev-2'],
      },
      {
        id: 'hyp-2',
        hypothesis:
          'Harmonic wind resonance on an ice-weighted guy-wire vibrated the ceiling conduit against a hair-trigger telegraph key.',
        plausibility: 'high',
        supportingEvidenceIds: ['ev-1', 'ev-2'],
        counterEvidenceIds: [],
      },
    ],
    correctResolution: {
      answer:
        'There was no human saboteur or ghost. Severe 68-knot winds caused an ice-weighted cable on the roof to oscillate at a harmonic frequency. The vibration traveled down an aluminum conduit and repeatedly tapped the hair-trigger telegraph key in the locked room.',
      culpritOrCause: 'Wind-induced harmonic resonance and mechanical conduit contact',
      keyClueIds: ['ev-1', 'ev-2'],
      howDeductionWorks:
        'The exact cadence of the signal matched the resonant frequency of the iced cable, and physical inspection revealed fresh impact scuffs on the telegraph lever beneath the conduit.',
      aftermathOrConclusion:
        'The crew insulated the ceiling conduits and recalibrated the telegraph tension springs, preventing false distress alarms during future polar storms.',
    },
    createdAt: '2026-09-20T12:00:00.000Z',
  },
];

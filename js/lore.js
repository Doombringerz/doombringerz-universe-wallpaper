/* In-world content. Public entries only, word for word: realm text comes from the live Lore Map
   (tools/sync_realms.py), Codex lines from the open Codex entries, and folded titles stay folded. */

window.RIFT_LORE = {
  // Descent order: top of the cosmic plate to the bottom, then the loop closes.
  realms: [
    {
      id: 'mythic-closure', name: 'The Cosmic Ceiling', tier: 'Structural Limit', category: 'primordial',
      map: [50, 6, 30, 8], palette: ['#f6e7b4', '#140f06'], pan: 'down', dim: 0.32,
      desc: 'Not a metaphorical ceiling. A literal structural limit in Aetheria\'s dimensional architecture - the point beyond which the layers of reality were never built to be accessed.',
      features: ['The sky that carries the weight of everything beneath it', 'Above it, nothing carries you']
    },
    {
      id: 'the-above', name: 'The Above', tier: 'Divine Realm', category: 'divine',
      map: [22, 22, 28, 14], palette: ['#fff2cf', '#5fa8cf'], pan: 'up', dim: 0.28,
      desc: 'The celestial domain - a divine hierarchy governed by order and bureaucracy. The Above is not the peaceful afterlife of human mythology.',
      features: ['Strict divine law maintained by enforcers', 'Something ancient is buried deep in its foundations', 'Relations with other realms are... complicated']
    },
    {
      id: 'riftspace', name: 'Riftspace', tier: 'Cosmic / Structural', category: 'liminal',
      map: [72, 22, 28, 14], palette: ['#c05cff', '#26072f'], pan: 'down',
      desc: 'The spaces between dimensions - the interdimensional transit layer where portals form and timelines press against each other. Riftspace is not empty.',
      features: ['Timeline stress creates unpredictable tears', 'Anomalies manifest as stuttering and spatial folding', 'Something fractured it severely - the damage is still spreading']
    },
    {
      id: 'the-between', name: 'The Between', tier: 'Divine Realm', category: 'divine',
      map: [20, 40, 24, 13], palette: ['#a9d8ff', '#0a1726'], pan: 'down', dim: 0.12,
      desc: 'The Ethereal plane, the third of the three divine realms that stand alongside The Above and The Below.',
      features: ['Where the Ethereal Trials are held - the standard death pipeline of the cosmology', 'Hooded boatmen keep its deeper passages, and keep their own counsel about them', 'Most souls are weighed here before they are permitted to move onward']
    },
    {
      id: 'aetheria', name: 'Aetheria', tier: 'Prime World', category: 'prime',
      map: [50, 42, 32, 16], palette: ['#4fe39a', '#f0c060'], pan: 'right', dim: 0.08,
      desc: 'The cosmological center of mortal civilization. Aetheria is where elemental forces are governed, where the portal network converges, and where most of the known story unfolds.',
      features: ['Home to the elemental gods and their dominions', 'Some of its gods have gone silent', 'A place called Sanctuary exists here - or existed']
    },
    {
      id: 'other-realms', name: 'Other Realms', tier: 'Outer Territories', category: 'liminal',
      map: [85, 40, 18, 28], palette: ['#a27bff', '#ff6a3a'], pan: 'left',
      desc: 'Beyond the known cosmic domains lie countless other territories - pocket dimensions, minor divine holdings, and half-formed realities at the edges of the map. Most require specific knowledge to reach.',
      features: ['Home to entities that prefer not to be named', 'Others absorb the overflow when greater realms destabilize', 'Some have never woken at all']
    },
    {
      id: 'the-below', name: 'The Below', tier: 'Divine Realm', category: 'divine',
      map: [22, 58, 28, 14], palette: ['#ff5d1f', '#2e0602'], pan: 'down',
      desc: 'The infernal counterpart to The Above. The Below is not merely punishment - it is an engine of transformation.',
      features: ['Governed by a hierarchy older than memory', 'Critical battleground in a coming conflict', 'The paperwork is brief; the consequences are immediate']
    },
    {
      id: 'mindscape', name: 'Mindscape', tier: 'Psychological Realm', category: 'liminal',
      map: [72, 58, 28, 14], palette: ['#cdb0ff', '#221b30'], pan: 'right', dim: 0.22,
      desc: 'The internal psyche rendered as navigable landscape. The Mindscape is not a metaphor.',
      features: ['Architecture maps the occupant\'s mental state', 'Crystallized identity fragments found scattered here', 'Limbo is its outermost boundary - where self dissolves']
    },
    {
      id: 'portal-zones', name: 'Portal Zones', tier: 'Liminal', category: 'liminal',
      map: [50, 72, 30, 12], palette: ['#44ff8e', '#d9a83a'], pan: 'left',
      desc: 'Regions where the portal network concentrates and reality becomes dangerously thin. Portal Zones shift, overlap, and occasionally collapse.',
      features: ['Ancient geometric constructs mark stable portals', 'Strange symbols appear on the borders of active portals', 'Stability here is... not what it once was']
    },
    {
      id: 'temple-origins', name: 'The Origin Depths', tier: 'Primordial', category: 'primordial',
      map: [50, 90, 30, 10], palette: ['#ecc96e', '#080604'], pan: 'down',
      desc: 'The deepest accessible point in the cosmology - existing between timelines at the very foundation of reality. This is where something laughed first.',
      features: ['The first fracture originated here', 'An echo of something ancient repeats without end', 'Exists between timelines - no single one claims it']
    }
  ],

  notes: [
    { text: 'The Stillpoint is silence remembering itself. The universe is what happened when silence forgot to stay quiet.', source: 'The Stillpoint' },
    { text: 'In the beginning was not the word. In the beginning was the note. And the note was disobedience.', source: 'Universe Born From Song' },
    { text: 'They did not choose each other. They were chosen by the same error that chose everything else.', source: 'The Duality Bond' },
    { text: 'You want to know about Rascal? Fine. But do not pretend you are ready.', source: 'Rascal - Chaos Incarnate' },
    { text: 'She will criticize you for reading this entry out of order. She is already judging your posture.', source: 'Halcyon - Celestial Discipline' },
    { text: 'They watch all realities simultaneously. They cannot touch, move, strike, shield, or choose sides.', source: 'The Observer - Before the Binding' }
  ],

  // Wiki web. sealed = the public title exists, the entry is still folded.
  wiki: [
    { id: 'rascal', name: 'Rascal', kind: 'Character', line: 'Chaos Incarnate. Beneath the chaos, Rascal genuinely cares.' },
    { id: 'halcyon', name: 'Halcyon', kind: 'Character', line: 'Celestial Discipline. If Rascal is the jazz, Halcyon is the hymn.' },
    { id: 'observer', name: 'The Observer', kind: 'Character', line: 'They chant, and those chants structurally hold timelines together.' },
    { id: 'unknown', name: 'The Unknown Entity', kind: 'Character', line: 'Every correction it makes is an attempt to return the river to the stone.' },
    { id: 'doomjr', name: 'Doom Jr.', kind: 'Character', sealed: true, line: 'The Boy This Chronicle Fears.' },
    { id: 'luna', name: 'Luna Jr.', kind: 'Character', sealed: true, line: 'The Emotional Anchor.' },
    { id: 'aethera', name: 'Aethera', kind: 'Character', sealed: true, line: 'The Fractured Fairy.' },
    { id: 'stillpoint', name: 'The Stillpoint', kind: 'Concept', line: 'Before you read further, understand this: the Stillpoint is not a place.' },
    { id: 'duality', name: 'The Duality Bond', kind: 'Concept', line: 'Order and chaos, hymn and jazz - structurally incapable of existing without each other.' },
    { id: 'song', name: 'Universe Born From Song', kind: 'Concept', line: 'The origin of the Doombringerz Universe was not visual.' },
    { id: 'blink', name: 'The First Blink', kind: 'Event', line: 'The universe began with an act of attention.' },
    { id: 'fracture', name: 'The First Fracture', kind: 'Event', sealed: true, line: 'Entry folded.' },
    { id: 'enochian', name: 'Enochian', kind: 'Script', sealed: true, line: 'Entry folded.' },
    { id: 'laws', name: 'The Immutable Laws', kind: 'Concept', sealed: true, line: 'Entry folded.' },
    { id: 'r-aetheria', realm: 'aetheria', name: 'Aetheria', kind: 'Realm', line: 'Prime World. The cosmological center of mortal civilization.' },
    { id: 'r-above', realm: 'the-above', name: 'The Above', kind: 'Realm', line: 'Divine Realm. The celestial domain - a divine hierarchy governed by order and bureaucracy.' },
    { id: 'r-below', realm: 'the-below', name: 'The Below', kind: 'Realm', line: 'Divine Realm. The infernal counterpart to The Above.' },
    { id: 'r-between', realm: 'the-between', name: 'The Between', kind: 'Realm', line: 'Divine Realm. The Ethereal plane, the third of the three divine realms that stand alongside The Above and The Below.' },
    { id: 'r-rift', realm: 'riftspace', name: 'Riftspace', kind: 'Realm', line: 'Cosmic / Structural. The spaces between dimensions - the interdimensional transit layer where portals form and timelines press against each other.' },
    { id: 'r-origin', realm: 'temple-origins', name: 'The Origin Depths', kind: 'Realm', line: 'Primordial. The deepest accessible point in the cosmology - existing between timelines at the very foundation of reality.' }
  ],
  links: [
    ['rascal', 'halcyon'], ['rascal', 'duality'], ['halcyon', 'duality'], ['rascal', 'enochian'], ['halcyon', 'enochian'],
    ['observer', 'stillpoint'], ['observer', 'song'], ['observer', 'blink'], ['stillpoint', 'song'], ['stillpoint', 'unknown'],
    ['song', 'enochian'], ['blink', 'r-origin'], ['fracture', 'r-origin'], ['doomjr', 'fracture'], ['doomjr', 'luna'],
    ['doomjr', 'aethera'], ['doomjr', 'observer'], ['duality', 'laws'], ['r-above', 'r-between'], ['r-between', 'r-below'],
    ['r-rift', 'r-aetheria'], ['r-aetheria', 'r-above'], ['r-aetheria', 'r-below'], ['fracture', 'r-rift'], ['halcyon', 'r-above']
  ],

  sagas: {
    pre: { name: 'Prelude', color: '#e8c870' },
    jr: { name: 'Jr. Saga', color: '#6aa34e' },
    doom: { name: 'Doombringerz Saga', color: '#d8362e' },
    identity: { name: 'Identity Saga', color: '#3a9ab0' },
    cosmic: { name: 'Cosmic Saga', color: '#a070ff' },
    mythic: { name: 'Mythic Saga', color: '#f0e4c0' },
    postmythic: { name: 'Post-Mythic', color: '#c8692a' }
  },
  // Release-gated: P1, P2 and T00 are open on the public timeline today. P = Prelude game, S = side game.
  timeline: [
    ['P1', 'Before the First Blink', 'pre', 'The hum repeats, almost. Outlast the stillness.'],
    ['P2', 'The Hum Repeats', 'pre', 'The grid loops, and every square that repeats perfectly goes still.'],
    ['T00', 'The First Blink', 'pre', 'The universe began with an act of attention.'],
    ['T01', 'Zombies Ate My Sister', 'jr'], ['S1', 'The Described Town', 'jr'],
    ['T02', 'Super Zombification', 'jr'], ['T03', 'Portals of Chaos', 'jr'],
    ['T04', 'Realm of Duality', 'jr'], ['T05', 'Super Doom Jr.', 'jr'], ['T06', 'Retros Dash', 'jr'],
    ['T07', 'Guardians of Balance', 'jr'], ['T08', 'Multiverse Chaos', 'doom'], ['T09', 'The Reckoning', 'doom'],
    ['T10', 'Kingdoms of Chaos', 'doom'], ['T11', 'The Bastion', 'identity'], ['T12', 'Fatebinder\'s Curse', 'identity'],
    ['T13', 'Roomcrafters', 'identity'], ['T14', 'Reckoning II', 'cosmic'], ['T15', 'Flesh and Blood Chronicles', 'cosmic'],
    ['T16', 'Heavenly Sins', 'cosmic'], ['T17', 'Codex of the Riftborn', 'mythic'], ['T18', 'Numinous Vagary', 'postmythic'],
    ['T18a', 'Ascendants', 'postmythic'], ['T18b', 'Battle for Aetheria', 'postmythic'], ['T18c', 'Doomsday', 'postmythic'],
    ['T19', 'Unleash the Numen', 'postmythic']
  ],
  folded: 'The record keeps this chapter folded until its title opens.'
};

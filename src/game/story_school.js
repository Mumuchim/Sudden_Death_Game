import { api } from './registry.js';

/* Sudden Death — Season 1: First Week
 * A choice-driven school survival mystery.
 * The outbreak is the pressure cooker; the relationships and murder mystery
 * are the story that grows inside it.
 */

var G = api, S = G.SCENES, I = G.ITEMS;

/* ------------------------------------------------------------------ */
/* Helpers                                                            */

function init(st) {
  if (st.flags.schoolReady) {
    st.resources = st.resources || { food: st.food || 0, water: st.water || 0 };
    st.resourceDebt = st.resourceDebt || { food: 0, water: 0 };
    st.resources.food = st.food;
    st.resources.water = st.water;
    return;
  }
  st.flags.schoolReady = true;
  st.day = 1;
  st.food = 6;
  st.water = 6;
  st.resources = { food: 6, water: 6 };
  st.resourceDebt = { food: 0, water: 0 };
  st.suspicion = 0;
  st.mira = 0;
  st.romance = '';
  st.investigation = 0;
  st.clues = [];
  st.infected = '';
  st.flags.accused = '';
  st.flags.killerId = 'mira';
  st.flags.searches = {};
  ['mira', 'aya', 'eli', 'noah', 'reyes'].forEach(function (id) {
    st.bonds[id] = st.bonds[id] || 0;
  });
}

function step(st, n) {
  st.day = n;
  st.flags.schoolDay = n;
}

function food(st, n) {
  st.food = Math.max(0, (st.food || 0) + n);
  st.resources.food = st.food;
}

function water(st, n) {
  st.water = Math.max(0, (st.water || 0) + n);
  st.resources.water = st.water;
}

function ration(st) {
  st.food = Math.max(0, st.food - 1);
  st.water = Math.max(0, st.water - 1);
  st.resources.food = st.food;
  st.resources.water = st.water;
  if (st.food === 0) { st.suspicion += 1; st.flags.hungry = true; st.resourceDebt.food = (st.resourceDebt.food || 0) + 1; }
  if (st.water === 0) { st.flags.dehydrated = true; st.resourceDebt.water = (st.resourceDebt.water || 0) + 1; st.ember = Math.max(1, st.ember - 1); }
  if (st.food === 0 && st.water === 0) st.flags.resourceCollapse = true;
}

function stock(st) {
  return 'Food: ' + st.food + ' meal' + (st.food === 1 ? '' : 's') + '. Water: ' + st.water + ' bottle' + (st.water === 1 ? '' : 's') + '.';
}

function bond(id, n) { G.bond(id, n); }

function clue(st, id) {
  if (st.clues.indexOf(id) >= 0) return false;
  st.clues.push(id);
  st.investigation += 1;
  G.doubt(1, 'school_' + id);
  return true;
}

function hasClue(st, id) { return st.clues.indexOf(id) >= 0; }

function spendItem(st, id, amount) {
  var entry = st.inv.find(function (x) { return x.id === id; });
  if (!entry) return false;
  entry.uses = Math.max(0, entry.uses - (amount || 1));
  if (entry.uses <= 0) st.inv = st.inv.filter(function (x) { return x.uses > 0; });
  return true;
}

function alive(st, id) {
  return !(st.flags['dead_' + id] || (id === 'mira' && st.flags.miraDead));
}

function livingPeople(st) {
  return ['mira', 'aya', 'eli', 'noah', 'reyes'].filter(function (id) { return alive(st, id); });
}

function victimLabel(st) {
  var id = st.flags.firstVictimId;
  if (!id || id === 'june') return 'June';
  return nameOf(st, id);
}

function nameOf(st, id) {
  return ({
    mira: 'Mira', aya: 'Aya', eli: 'Eli', noah: 'Noah', reyes: 'Ms. Reyes'
  }[id]) || id;
}

function romanceName(st) { return nameOf(st, st.romance); }

function roll(st, salt) {
  var x = (st.seed || 1) ^ ((st.day || 1) * 2654435761) ^ (salt * 2246822519);
  x = Math.abs(x % 2147483647);
  return x / 2147483647;
}

function enoughEvidence(st) {
  var anchors = 0;
  if (hasClue(st, 'medicine')) anchors++;
  if (hasClue(st, 'timeline')) anchors++;
  if (hasClue(st, 'visitor')) anchors++;
  if (hasClue(st, 'prediction')) anchors++;
  if (hasClue(st, 'missingFolder') || hasClue(st, 'infectionWarning')) anchors++;
  if (hasClue(st, 'secondVictim')) anchors++;
  var miraLink = hasClue(st, 'miraPattern') || hasClue(st, 'miraAlibi');
  return st.investigation >= 6 && miraLink && anchors >= 3;
}

function markSearch(st, id) { st.flags.searches[id] = true; }
function searchDone(st, id) { return !!st.flags.searches[id]; }
function hasEvacPreparation(st) {
  return !!(st.flags.evacPrepared || st.flags.evacPlan || st.flags.reyesPrepared);
}

function setInfected(st) {
  if (st.flags.infectionRolled) return;
  st.flags.infectionRolled = true;
  var candidates = ['aya', 'eli', 'noah', 'reyes', 'mira'].filter(function (id) {
    return alive(st, id) && id !== st.romance;
  });
  if (!candidates.length) { st.infected = ''; return; }
  // The infection remains a risk, but it cannot silently pick the same person
  // the murder system is already using as the romance victim.
  var chance = 0.72;
  if (st.flags.healthOpen) chance += 0.08;
  if (st.flags.healthPrivate) chance -= 0.05;
  st.infected = roll(st, 91) < chance ? candidates[Math.floor(roll(st, 92) * candidates.length) % candidates.length] : '';
}

function infectedName(st) { return st.infected ? nameOf(st, st.infected) : ''; }

function resolveSecondDeath(st) {
  if (st.flags.secondVictimResolved) return;
  st.flags.secondVictimResolved = true;

  // June is the ordinary first victim. If she already died, the second death
  // belongs to a named minor survivor who had been sheltering in maintenance.
  var id = st.flags.firstVictimId === 'june' ? 'custodian' : 'june';
  st.flags.secondVictimId = id;
  st.flags.secondVictimDead = true;
  if (id === 'june') st.flags.dead_june = true;
  st.flags.shelterCompromised = true;
  clue(st, 'secondVictim');
}

function secondVictimName(st) {
  return st.flags.secondVictimId === 'custodian' ? 'Mr. Dela Cruz, the night custodian' : 'June';
}

function resolveRomanceDeath(st) {
  if (st.flags.romanceResolved) return;
  st.flags.romanceResolved = true;
  st.flags.firstVictimId = 'june';

  if (st.romance && st.romance !== 'mira' && ['aya', 'eli', 'noah'].indexOf(st.romance) >= 0) {
    // A high bond can change the scene: you notice the warning signs early
    // and get your partner out, forcing the killer to choose another victim.
    if (G.bondLevel(st.romance) >= 7 || st.flags.partnerProtection) {
      st.flags.partnerSaved = true;
      st.flags.partnerProtection = true;
      st.flags.firstVictimId = 'june';
    } else {
      st.flags.partnerDead = true;
      st.flags.partnerDeathUnknown = true;
      st.flags['dead_' + st.romance] = true;
      st.flags.firstVictimId = st.romance;
      if (st.infected === st.romance) st.infected = '';
    }
  }
}

function rollMiraFate(st) {
  if (st.flags.miraFateRolled) return;
  st.flags.miraFateRolled = true;
  if (!alive(st, 'mira')) return;

  var pressure = 0;
  if (!st.flags.miraWatched) pressure += 2;
  if (st.flags.ignoredMiraHealth) pressure += 2;
  if (st.mira < 4) pressure += 1;
  if (!hasClue(st, 'prediction') && !st.flags.miraPredictionShared) pressure += 1;
  if (st.suspicion >= 6) pressure += 1;
  if (st.flags.accused === 'mira') pressure += 1;
  if (st.flags.doubleCheck) pressure -= 1;
  if (st.flags.healthOpen) pressure -= 1;
  if (st.mira >= 8) pressure -= 2;
  if (st.infected === 'mira') pressure += 1;

  if (pressure >= 4) {
    st.flags.miraDead = true;
    st.flags.miraDeathUnknown = true;
    if (st.infected === 'mira') st.infected = '';
  }
}

function accuse(st, id) {
  st.flags.accused = id;
  if (id !== 'mira') st.suspicion += 2;
  if (id === 'mira') st.flags.miraAccusedEarly = true;
  if (id === st.flags.killerId) st.flags.accusationCorrect = true;
}

/* ------------------------------------------------------------------ */
/* Items                                                              */

I.canned = {
  name: 'Canned food', label: 'canned food', tag: 'food', uses: 1,
  desc: 'A can of beans. Cold is fine. Safe is better.',
  use: function (st) { food(st, 1); return { toast: 'You add one meal to the count.' }; }
};
I.waterbottle = {
  name: 'Bottled water', label: 'bottled water', tag: 'water', uses: 1,
  desc: 'Sealed water from the emergency cabinet.',
  use: function (st) { water(st, 1); return { toast: 'You add one bottle to the count.' }; }
};
I.firstaid = {
  name: 'First-aid kit', label: 'first-aid kit', tag: 'heals 2', uses: 1,
  desc: 'Gauze, antiseptic and tape.',
  use: function (st) {
    if (st.ember >= st.emberCap) return { refuse: 'You are not hurt enough to justify opening it.' };
    G.heal(2); G.sfx.heal(); return { toast: 'You clean and wrap the wound.' };
  }
};
I.knife = {
  name: 'Kitchen knife', label: 'kitchen knife', tag: 'dangerous', uses: 1, combatOnly: true,
  desc: 'Small enough to hide. Sharp enough that everybody notices it.',
  use: function (st, ctx) {
    if (!ctx.combat) return { refuse: 'Not here.' };
    return { refuse: 'Keep the knife ready. Use Slash during its opening.' };
  }
};
I.extinguisher = {
  name: 'Fire extinguisher', label: 'fire extinguisher', tag: 'heavy', uses: 1, combatOnly: true,
  desc: 'Heavy, awkward and useful.',
  use: function (st, ctx) {
    if (!ctx.combat) return { refuse: 'Not here.' };
    return { refuse: 'Keep the extinguisher ready. Use Smash during its opening.' };
  }
};
I.bat = {
  name: 'Baseball bat', label: 'baseball bat', tag: 'weapon · zombie combat', uses: 1, combatOnly: true,
  desc: 'A school bat. Heavy enough to create distance.',
  use: function (st, ctx) {
    if (!ctx.combat) return { refuse: 'You keep the bat in your hands.' };
    return { refuse: 'The bat is already in your hands.' };
  },
  suggest: function (st, where) { return where === 'combat' && st.flags && st.flags.zombieCombat; }
};
I.flashlight = {
  name: 'Emergency flashlight', label: 'flashlight', tag: 'light', uses: 3,
  desc: 'A weak beam with fresh batteries.',
  use: function () { return { toast: 'The beam cuts through the dark. For now.' }; }
};

/* ------------------------------------------------------------------ */
/* Character balance                                                  */

G.BONDNAMES = G.BONDNAMES || {};
G.BONDNAMES.mira = { name: 'Mira', note: function (l) {
  return l >= 7 ? 'Mira trusts you with the parts of herself she never shows the group.' :
    l >= 4 ? 'Mira looks for you first whenever something frightening happens.' :
    l >= 2 ? 'Mira remembers details you forgot you told her.' : 'The girl from the bus.';
} };
G.BONDNAMES.aya = { name: 'Aya', note: function (l) {
  return l >= 7 ? 'Aya trusts you with the ration book and with the truth she hides from everyone else.' :
    l >= 4 ? 'Aya asks what you think before making difficult decisions.' :
    l >= 2 ? 'Aya has stopped treating you like a variable in the room.' : 'The class officer with the notebook.';
} };
G.BONDNAMES.eli = { name: 'Eli', note: function (l) {
  return l >= 7 ? 'Eli admits you are the person he trusts when he cannot be brave.' :
    l >= 4 ? 'Eli gives you the stronger weapon without explaining why.' :
    l >= 2 ? 'Eli keeps pace with you in the corridor.' : 'The student who knows the gym.';
} };
G.BONDNAMES.noah = { name: 'Noah', note: function (l) {
  return l >= 7 ? 'Noah is the person you look for before you look at the door.' :
    l >= 4 ? 'Noah stops keeping his best ideas to himself around you.' :
    l >= 2 ? 'Noah makes room beside him without asking.' : 'The quiet one with the map.';
} };
G.BONDNAMES.reyes = { name: 'Ms. Reyes', note: function (l) {
  return l >= 7 ? 'Ms. Reyes trusts you like another adult in a room, and both of you know the difference matters.' :
    l >= 4 ? 'She has started giving you keys and difficult decisions.' :
    l >= 2 ? 'She trusts you to help keep people calm.' : 'Your teacher is still here.';
} };

api.buildPools = function () { return {}; };
api.applyPools = function (st) { init(st); };
G.campaignVersion = 'season1-polished';

/* ------------------------------------------------------------------ */
/* Zombie encounters                                                  */

var hallwayZombie = {
  mode: 'zombie', art: 'hallway', escapeGoal: 5, weaponDamage: 2, speed: 5200,
  name: 'An infected student', poise: 5,
  intro: 'It still wears a school badge. You have no weapon. That means you do not kill it. You survive it.',
  outro: 'You slip around the infected. Your lungs burn. You are alive.',
  tells: [
    { a: 'dodge', side: 'left', t: 'Its left shoulder snaps toward you. Dodge right.', ok: 'You move right. It tears through empty air.', bad: 'You move the wrong way. Its shoulder catches you.' },
    { a: 'dodge', side: 'right', t: 'Its right arm swings wide. Dodge left.', ok: 'You cut left.', bad: 'The arm catches you across the chest.' },
    { a: 'dodge', side: 'right', t: 'Both hands snap toward you from the right. Move left.', ok: 'You cut left.', bad: 'You step into its reach.' },
    { a: 'dodge', side: 'left', open: true, t: 'It overcommits to the left. Dodge right.', ok: 'You slip right.', bad: 'You step the wrong way.' }
  ]
};

var stairZombie = {
  mode: 'zombie', art: 'stair', escapeGoal: 7, weaponDamage: 2, speed: 4800,
  name: 'Three infected in the stairwell', poise: 7,
  intro: 'Three infected. A narrow stairwell. Dodge if you have nothing. Fight if you have a weapon.',
  outro: 'The stairwell falls quiet except for the alarm and your breathing.',
  tells: [
    { a: 'dodge', side: 'left', t: 'The first infected lunges from your left. Dodge right.', ok: 'You move right.', bad: 'You hit the railing.' },
    { a: 'dodge', side: 'left', t: 'The second infected reaches through the rail from your left. Move right.', ok: 'You clear the rail.', bad: 'Its fingers close around your wrist.' },
    { a: 'dodge', side: 'right', t: 'The third infected attacks from your right. Dodge left.', ok: 'You slip past.', bad: 'The attack knocks your breath out.' },
    { a: 'dodge', side: 'left', open: true, t: 'All three bunch together. Dodge right.', ok: 'They collide.', bad: 'You get pinned.' }
  ]
};

var cafeteriaHordeZombie = {
  mode: 'zombie', art: 'cafeteria', escapeGoal: 9, weaponDamage: 2, speed: 4700,
  name: 'Cafeteria crowd — a dozen infected', poise: 9,
  intro: 'The cafeteria doors give way and you finally see the scale of the outbreak: infected students spill between tables, more than you can count. You do not fight the crowd. You survive the one body that reaches you while the others close in.',
  outro: 'You break through the service door. Behind you, the cafeteria is still filling. The problem was never one infected — it was how many were waiting behind it.',
  tells: [
    { a: 'dodge', side: 'left', t: 'A student vaults the table from your left. Dodge right.', ok: 'You slide past the table.', bad: 'You catch the corner.' },
    { a: 'dodge', side: 'right', t: 'Two shapes cut you off from the right. Dodge left.', ok: 'You slip between them.', bad: 'You are almost boxed in.' },
    { a: 'dodge', side: 'left', t: 'A whole row of bodies surges forward. Dodge right.', ok: 'The front one misses.', bad: 'The crowd compresses around you.' },
    { a: 'dodge', side: 'right', t: 'The kitchen doors slam behind you. Dodge left.', ok: 'You keep moving.', bad: 'You lose the gap.' },
    { a: 'dodge', side: 'left', open: true, t: 'The crowd bunches at the serving line. Dodge right.', ok: 'They jam against each other.', bad: 'You stumble into the bottleneck.' }
  ]
};

var labHordeZombie = {
  mode: 'zombie', art: 'lab', escapeGoal: 10, weaponDamage: 3, speed: 4550,
  name: 'Science-wing surge — too many to count', poise: 10,
  intro: 'Glass breaks all the way down the science wing. At least a dozen infected move between the lab benches. Only one reaches you at a time, but there are always more behind it.',
  outro: 'You slam the fire door and hear hands hit the other side almost immediately. The school is no longer occupied by a few infected. Entire rooms are moving.',
  tells: [
    { a: 'dodge', side: 'right', t: 'An infected comes around the lab bench from your right. Dodge left.', ok: 'You clear the bench.', bad: 'Your shoulder clips the counter.' },
    { a: 'dodge', side: 'left', t: 'A second rushes through the broken glass from your left. Dodge right.', ok: 'You find a clean lane.', bad: 'The glass forces you inward.' },
    { a: 'dodge', side: 'right', t: 'The hallway fills behind it. Dodge left before the gap closes.', ok: 'You get through the door.', bad: 'The gap narrows around you.' },
    { a: 'dodge', side: 'left', t: 'Two infected lunge almost together. Dodge right.', ok: 'They collide behind you.', bad: 'You are nearly pinned.' },
    { a: 'dodge', side: 'right', open: true, t: 'The fire door starts to shut. Dodge left.', ok: 'You reach the threshold.', bad: 'You miss the timing.' }
  ]
};

var facultyHordeZombie = {
  mode: 'zombie', art: 'teacher', escapeGoal: 8, weaponDamage: 2, speed: 4650,
  name: 'Faculty corridor surge', poise: 8,
  intro: 'The faculty corridor is packed. Infected staff and students are pressing through the stairwell, far too many to clear. You do not stop to identify them. You only need one opening.',
  outro: 'You reach the upper corridor and pull the door shut. There are still infected moving downstairs — enough that nobody in the group can pretend the school is only dealing with isolated cases anymore.',
  tells: [
    { a: 'dodge', side: 'left', t: 'A uniformed figure lunges from your left. Dodge right.', ok: 'You clear the doorway.', bad: 'The doorway catches you.' },
    { a: 'dodge', side: 'right', t: 'Another infected cuts from the right. Dodge left.', ok: 'You slip through.', bad: 'You are forced back.' },
    { a: 'dodge', side: 'left', t: 'The stairwell behind it is full. Dodge right.', ok: 'You keep the gap.', bad: 'You are almost surrounded.' },
    { a: 'dodge', side: 'right', open: true, t: 'The corridor bunches at the landing. Dodge left.', ok: 'The crowd jams itself.', bad: 'You lose the opening.' }
  ]
};

var blackoutZombie = {
  mode: 'zombie', art: 'utility', escapeGoal: 6, weaponDamage: 2, speed: 5000,
  name: 'Two infected in the dark corridor', poise: 6,
  intro: 'No internet. No signal. No help. Only the light from your phone and two shapes at the far end.',
  outro: 'You reach the stairwell. The building behind you is full of hands hitting glass.',
  tells: [
    { a: 'dodge', side: 'right', t: 'A shape rushes from your right. Dodge left.', ok: 'You slip left.', bad: 'The shoulder catches you.' },
    { a: 'dodge', side: 'right', t: 'One infected lunges from your right. Move left.', ok: 'You tear past the reaching hands.', bad: 'The grip catches your sleeve.' },
    { a: 'dodge', side: 'left', t: 'The second infected attacks from your left. Dodge right.', ok: 'You move right.', bad: 'You meet it head-on.' },
    { a: 'dodge', side: 'left', t: 'Both infected reach from your left at once. Move right.', ok: 'You rip free and run.', bad: 'The corridor closes around you.' }
  ]
};

/* ------------------------------------------------------------------ */
/* Monday — first day                                                 */

S.school_d0 = {
  chapter: 'Monday — 7:18 a.m.', art: 'mira',
  onEnter: function (st) { init(st); },
  quote: 'The first day of school is supposed to give you a year. Instead, it gives you a week.',
  text: `The bus is late. You know because the red numbers on your phone have changed three times since you left home.

At 7:18 it finally groans around the corner.

You climb aboard. Most seats are taken.

One is empty beside a girl at the window.

She is beautiful in the quiet way that makes you look twice after you have already looked once. She keeps checking a school map, then the road, then the map again.

Worried, you think. Definitely worried.`,
  choices: [
    { t: 'Sit beside her.', do: function (st) { bond('mira', 1); st.mira += 1; }, to: 'school_bus' },
    { t: 'Sit somewhere else.', do: function (st) { st.flags.distantBus = true; }, to: 'school_bus' }
  ]
};

S.school_bus = {
  chapter: 'Monday — on the bus', art: 'mira',
  text: `She moves the map out of the way when you sit down.

“Sorry.”

“It is fine.”

“You know where Building C is?”

“You are assuming I know where Building C is.”

That gets a small laugh.

“First day?” she asks.

“Yeah.”

“Mine too.”

She finally looks at you properly.

“I am Mira.”

There is a softness to the way she says it, as if she has been waiting all morning to say her own name.`,
  choices: [
    { t: 'Make a joke about both of you being lost.', do: function (st) { bond('mira', 1); }, to: 'school_wallet' },
    { t: 'Ask why she is so nervous.', do: function (st) { st.flags.miraNervousAsked = true; bond('mira', 1); }, to: 'school_wallet' }
  ]
};

S.school_wallet = {
  chapter: 'Monday — 7:41 a.m.', art: 'mira',
  text: `The bus stops. Students pile out.

Mira stands, takes two steps, then checks her bag.

Her face changes.

“My wallet.”

She searches under the seat.

Nothing.

You look down.

A black wallet is tucked underneath the seat rail.

Her student ID is inside.

Mira has already reached the stairs.`,
  choices: [
    { t: 'Chase after her with the wallet.', do: function (st) { st.flags.chasedWallet = true; bond('mira', 2); st.mira += 2; }, to: 'school_wallet_chase' },
    { t: 'Go to class. You can return it later.', do: function (st) { st.flags.keptWallet = true; }, to: 'school_wallet_later' }
  ]
};

S.school_wallet_chase = {
  chapter: 'Monday — 7:44 a.m.', art: 'mira',
  text: `“Mira!”

She turns near the school gate.

You hold out the wallet.

Her relief is immediate.

“You came after me?”

“You would have lost your ID.”

She looks at the wallet, then at you.

“Thank you.”

The warning bell rings.

She smiles.

“I owe you lunch.”

“You do.”

Her laugh is the first thing about her that feels completely unafraid.`,
  choices: [
    { t: '“Then do not forget.”', do: function (st) { bond('mira', 2); st.mira += 1; }, to: 'school_first_lesson' },
    { t: '“It was nothing.”', do: function (st) { bond('mira', 2); st.mira += 2; }, to: 'school_first_lesson' }
  ]
};

S.school_wallet_later = {
  chapter: 'Monday — 8:03 a.m.',
  text: `You keep the wallet in your bag.

You tell yourself you will give it back after attendance.

Before first period ends, a girl you have never met appears beside your desk.

“Mira lost something.”

You know what she means.

You return the wallet.

Mira takes it with both hands.

“I thought you threw it away.”

“Why would I do that?”

She says nothing.`,
  choices: [
    { t: 'Ask who told her you had it.', do: function (st) { clue(st, 'miraEarly'); }, to: 'school_first_lesson' },
    { t: 'Tell her to sit down before the teacher notices.', do: function (st) { bond('mira', 1); }, to: 'school_first_lesson' }
  ]
};

S.school_first_lesson = {
  chapter: 'Monday — first period', art: 'mira',
  text: `Mira is put in the empty seat beside you for orientation.

When the teacher asks a question, she knows the answer but looks down at her desk.

You slide the textbook across so she can see the example.

She whispers, “You keep doing that.”

“Doing what?”

“Helping me before I ask.”

She smiles.

For the first time that morning, the school feels less unfamiliar to her.`,
  choices: [
    { t: 'Ask her to eat lunch with you.', do: function (st) { bond('mira', 2); st.mira += 2; }, to: 'school_lunch' },
    { t: 'Promise to show her the cafeteria.', do: function (st) { bond('mira', 1); }, to: 'school_lunch' },
    { t: 'Let her figure it out.', to: 'school_lunch' }
  ]
};

S.school_lunch = {
  chapter: 'Monday — lunch', art: 'mira',
  text: `Mira finds you anyway. She has two drinks.

“I promised lunch.”

You talk about classes, the terrible cafeteria food and the wrong staircase she has already taken twice.

Then she tells you something small: she transferred because her old school stopped feeling safe.

She will not say why.

Not yet.

Then she asks what kind of person you think she is.`,
  choices: [
    { t: '“You are nervous, not broken.”', do: function (st) { bond('mira', 2); st.mira += 2; st.flags.seenMiraFear = true; }, to: 'school_after' },
    { t: '“I think you will be fine.”', do: function (st) { bond('mira', 1); }, to: 'school_after' },
    { t: '“You are hard to read.”', do: function (st) { st.mira = Math.max(0, st.mira - 1); }, to: 'school_after' }
  ]
};

S.school_after = {
  chapter: 'Monday — 1:17 p.m.',
  text: `The afternoon is ordinary until someone screams at the front gate.

You see a guard on the ground.

A student stands over him.

The student bends down.

Teeth hit the guard’s neck.

For one second nobody moves.

Then the school explodes into panic.

Mira grabs your sleeve.

“Please. Do not leave me.”`,
  choices: [
    { t: 'Grab Mira and run.', do: function (st) { bond('mira', 1); st.flags.protectMira = true; }, to: 'outbreak_classroom' },
    { t: 'Help the nearest students first.', do: function (st) { st.flags.helpedCrowd = true; }, to: 'outbreak_classroom' }
  ]
};

/* ------------------------------------------------------------------ */
/* Outbreak                                                          */

S.outbreak_classroom = {
  chapter: 'Monday — 1:21 p.m.', art: 'reyes', cast: ['mira', 'aya', 'eli', 'noah'],
  text: `Ms. Reyes locks the classroom door.

Something hits the other side.

Once.

Twice.

Three times.

She looks at the windows and then at the students.

“We leave before the door comes down.”

She does not sound heroic. She sounds like a teacher who is terrified and has decided to be useful anyway.

From the corridor comes a sound you have not heard before: dozens of feet moving at once.`,
  choices: [
    { t: 'Take the corridor and head for the library.', do: function (st) { st.flags.routeLibrary = true; }, to: 'outbreak_library' },
    { t: 'Take the science wing.', do: function (st) { st.flags.routeScience = true; }, to: 'outbreak_science' },
    { t: 'Cross the courtyard.', do: function (st) { st.flags.routeCourtyard = true; }, to: 'outbreak_courtyard' }
  ]
};

S.outbreak_library = {
  chapter: 'Monday — 1:24 p.m.',
  onEnter: function (st) { st.flags.zombieCombat = true; },
  combat: function () { return hallwayZombie; }, win: 'outbreak_library_after', lose: 'ending_zombie'
};
S.outbreak_library_after = {
  chapter: 'Monday — 1:28 p.m.',
  text: `The library becomes the first shelter.

Aya is counting bottles.

Eli is dragging a table against the stairwell.

Noah has a map on the floor.

Mira is helping a younger student with a scraped knee.

Ms. Reyes closes the doors again.`,
  choices: [
    { t: 'Help Aya secure water.', do: function (st) { water(st, 1); G.addItem('waterbottle', 2); bond('aya', 2); }, to: 'group_intro' },
    { t: 'Help Mira with the injured student.', do: function (st) { bond('mira', 2); st.mira += 1; G.addItem('firstaid'); }, to: 'group_intro' },
    { t: 'Check the old library terminal.', do: function (st) { G.shard('echo_library_terminal'); clue(st, 'map'); st.flags.echoLibrary = true; }, to: 'group_intro' }
  ]
};

S.outbreak_science = {
  chapter: 'Monday — 1:25 p.m.', art: 'eli',
  onEnter: function (st) { st.flags.zombieCombat = true; },
  combat: function () { return stairZombie; }, win: 'outbreak_science_after', lose: 'ending_zombie'
};
S.outbreak_science_after = {
  chapter: 'Monday — 1:29 p.m.',
  text: `The science wing contains an open stockroom.

You find water, a first-aid kit and a kitchen knife.

Across the hall, a locked gym cage contains a baseball bat.

Eli looks at it.

“We could use that.”`,
  choices: [
    { t: 'Take the bat and the medicine.', do: function (st) { G.addItem('bat'); G.addItem('firstaid'); water(st, 2); bond('eli', 2); }, to: 'group_intro' },
    { t: 'Take the medicine and leave the bat.', do: function (st) { G.addItem('firstaid'); G.addItem('knife'); water(st, 2); bond('reyes', 1); }, to: 'group_intro' }
  ]
};

S.outbreak_courtyard = {
  chapter: 'Monday — 1:24 p.m.', art: 'aya',
  text: `The courtyard is a mistake immediately.

Two infected students are between you and the library.

Aya points toward a maintenance door.

“There.”

Eli grabs a doorstop.

You have seconds.`,
  choices: [
    { t: 'Follow Aya through maintenance.', do: function (st) { bond('aya', 2); water(st, 2); }, to: 'outbreak_courtyard_after' },
    { t: 'Take the open stairwell.', do: function (st) { st.flags.zombieCombat = true; }, to: 'outbreak_courtyard_fight' }
  ]
};
S.outbreak_courtyard_fight = {
  chapter: 'Monday — 1:26 p.m.',
  combat: function () { return Object.assign({}, hallwayZombie, { art: 'outdoor', name: 'Two infected students' }); }, win: 'outbreak_courtyard_after', lose: 'ending_zombie'
};
S.outbreak_courtyard_after = {
  chapter: 'Monday — 1:31 p.m.', art: 'aya',
  text: `You reach the library through a maintenance corridor.

Aya unlocks the door from inside.

She looks at you, checks that you are not bleeding, and exhales.

“You keep doing that.”

“Doing what?”

“Making me think you might not come back.”`,
  choices: [
    { t: '“I came back.”', do: function (st) { bond('aya', 2); }, to: 'group_intro' },
    { t: '“You were worried?”', do: function (st) { bond('aya', 2); st.flags.ayaNoticed = true; }, to: 'group_intro' }
  ]
};

S.group_intro = {
  chapter: 'Monday — 2:02 p.m.',
  text: `There are seven of you now.

Ms. Reyes insists introductions still matter.

Aya is the class officer. She turns panic into lists.

Eli knows the gym and almost every shortcut. He jokes when he is frightened.

Noah is the quiet student with the map. He notices doors and routes nobody else remembers.

Mira is the girl from the bus. She remembers small medical details and what makes frightened people feel safe.

Ms. Reyes is the teacher. She keeps her voice calm even when her hands shake.

June is the youngest of the group. She is trying not to cry.

Nobody says zombie.

They say infected.

From behind the library doors, you can hear movement in more than one corridor. The school is not losing one infected at a time. It is filling.

They say this will pass.

They are wrong.`,
  choices: [
    { t: 'Help Aya count supplies.', do: function (st) { bond('aya', 2); }, to: 'day1_night' },
    { t: 'Help Eli reinforce the doors.', do: function (st) { bond('eli', 2); }, to: 'day1_night' },
    { t: 'Study the map with Noah.', do: function (st) { bond('noah', 2); }, to: 'day1_night' },
    { t: 'Stay with Mira and June.', do: function (st) { bond('mira', 2); st.mira += 1; }, to: 'day1_night' },
    { t: 'Help Ms. Reyes calm the room.', do: function (st) { bond('reyes', 2); }, to: 'day1_night' }
  ]
};

S.day1_night = {
  chapter: 'Monday — 7:40 p.m.',
  onEnter: function (st) { step(st, 1); ration(st); G.checkpoint('first night'); },
  text: function (st) {
    return `The lights go out for eleven seconds.

When they return, everyone is quieter.

Mira sits beside you.

“Are you scared?”

There is no correct answer.

${stock(st)}`;
  },
  choices: [
    { t: '“Yes.”', do: function (st) { bond('mira', 2); }, to: 'day2_morning' },
    { t: '“Not while we are together.”', do: function (st) { bond('mira', 3); st.mira += 2; st.flags.promise = true; }, to: 'day2_morning' },
    { t: '“I am scared for everyone.”', do: function (st) { bond('aya', 1); bond('reyes', 1); }, to: 'day2_morning' }
  ]
};

/* ------------------------------------------------------------------ */
/* Day 2 — supplies + character routes                                */

S.day2_morning = {
  chapter: 'Tuesday — 6:30 a.m.',
  onEnter: function (st) { step(st, 2); },
  redirect: function (st) { return (st.food <= 0 && st.water <= 0) ? 'ending_starved_scene' : null; },
  text: function (st) {
    return `Morning brings practical problems.

Food. Water. Medicine. Weapons. Information.

The school has all five somewhere inside it. Every useful room is attached to a risk.

Ms. Reyes says the group cannot solve everything in one morning.

${stock(st)}

Outside the shelter, the sounds keep multiplying. A few infected have become groups, and groups have started becoming crowds.`;
  },
  choices: [
    { t: 'Raid the cafeteria.', do: function (st) { food(st, 2); markSearch(st, 'cafeteria'); G.addItem('canned', 1); }, to: 'day2_cafeteria' },
    { t: 'Search the gym.', do: function (st) { markSearch(st, 'gym'); }, to: 'day2_gym' },
    { t: 'Search the infirmary.', do: function (st) { markSearch(st, 'infirmary'); }, to: 'day2_infirmary' },
    { t: 'Search administration for the radio.', do: function (st) { markSearch(st, 'admin'); }, to: 'day2_admin' }
  ]
};

S.day2_cafeteria = {
  chapter: 'Tuesday — 7:12 a.m.', art: 'aya',
  text: `The cafeteria has sealed food, but most of the fresh food has spoiled.

Aya finds a stock sheet.

Two days of missing inventory are circled.

The notes are in her handwriting.

“I was feeding students who could not afford lunch.”

She looks embarrassed.

“I knew people would call it wasteful.”`,
  choices: [
    { t: 'Tell Aya you understand and take the sealed food.', do: function (st) { bond('aya', 3); food(st, 1); G.addItem('canned'); }, to: 'day2_second_choice' },
    { t: 'Tell her the group needs honesty now.', do: function (st) { bond('aya', 1); st.flags.ayaLedgerHonest = true; food(st, 2); }, to: 'day2_second_choice' },
    { t: 'Push through the kitchen for more supplies.', do: function (st) { st.flags.cafeteriaHorde = true; st.flags.zombieCombat = true; }, to: 'day2_cafeteria_horde' }
  ]
};

S.day2_cafeteria_horde = {
  chapter: 'Tuesday — 7:18 a.m.',
  combat: function () { return cafeteriaHordeZombie; }, win: 'day2_cafeteria_horde_after', lose: 'ending_zombie'
};
S.day2_cafeteria_horde_after = {
  chapter: 'Tuesday — 7:24 a.m.',
  text: `You get through the kitchen.

The noise continues behind you.

It is not three infected. It is not five. The cafeteria was full before the doors broke, and now the whole room is moving.

Aya looks back once.

“That many were inside?”

Nobody answers.`,
  choices: [
    { t: 'Return to the library with what you have.', do: function (st) { food(st, 1); G.addItem('canned'); }, to: 'day2_second_choice' }
  ]
};

S.day2_gym = {
  chapter: 'Tuesday — 7:20 a.m.', art: 'eli',
  text: `The gym is quiet.

There is a baseball bat in the storage cage.

There is also blood on the gym floor that does not belong to anyone in your group.

Eli looks at it and goes quiet.

He tells you he saw an infected person get through the first barricade because a guard opened it for someone who looked injured.`,
  choices: [
    { t: 'Ask what Eli is not telling you.', do: function (st) { bond('eli', 3); st.flags.eliGateTruth = true; G.addItem('bat'); G.addItem('flashlight', 2); water(st, 1); }, to: 'day2_second_choice' },
    { t: 'Take the bat and do not press him.', do: function (st) { bond('eli', 1); G.addItem('bat'); water(st, 2); }, to: 'day2_second_choice' }
  ]
};

S.day2_infirmary = {
  chapter: 'Tuesday — 7:28 a.m.', art: 'reyes',
  text: `The infirmary is almost untouched.

Ms. Reyes has the key.

Inside are bandages, antiseptic, a first-aid kit and a medicine log.

One dose was signed out before the outbreak.

No patient name.

Ms. Reyes stares at the line.

“I should have noticed this yesterday.”`,
  choices: [
    { t: 'Ask what happened yesterday.', do: function (st) { bond('reyes', 2); st.flags.reyesGuilt = true; clue(st, 'medicine'); G.addItem('firstaid'); }, to: 'day2_second_choice' },
    { t: 'Tell her today is what matters.', do: function (st) { bond('reyes', 3); G.addItem('firstaid'); }, to: 'day2_second_choice' }
  ]
};

S.day2_admin = {
  chapter: 'Tuesday — 7:34 a.m.', art: 'noah',
  text: `The administration office has a dead emergency radio and a visitor log.

Noah finds an entry dated Sunday night.

Someone was in the school before the first morning bus.

The signature is hard to read.

Noah folds the page instead of tearing it out.`,
  choices: [
    { t: 'Study the log with Noah.', do: function (st) { bond('noah', 3); clue(st, 'visitor'); }, to: 'day2_second_choice' },
    { t: 'Look for a way to power the radio.', do: function (st) { bond('noah', 2); st.flags.radioBattery = true; }, to: 'day2_second_choice' }
  ]
};

S.day2_second_choice = {
  chapter: 'Tuesday — late morning',
  text: function (st) {
    return `You return to the library with one useful thing and one uncomfortable thing.

You have one more free hour before the group settles for the night.

${stock(st)}`;
  },
  choices: [
    { t: 'Stay with Mira.', do: function (st) { bond('mira', 2); st.mira += 2; }, to: 'day2_mira' },
    { t: 'Stay with Aya.', do: function (st) { bond('aya', 2); }, to: 'day2_aya' },
    { t: 'Stay with Eli.', do: function (st) { bond('eli', 2); }, to: 'day2_eli' },
    { t: 'Study the map with Noah.', do: function (st) { bond('noah', 2); }, to: 'day2_noah' },
    { t: 'Help Ms. Reyes with the medicine.', do: function (st) { bond('reyes', 2); }, to: 'day2_reyes' }
  ]
};

S.day2_mira = {
  chapter: 'Tuesday — 11:40 a.m.', art: 'mira',
  text: `Mira sits beside the window with a strip of gauze around her finger.

“You remember everything,” she says.

“Not everything.”

“The little things.”

She tells you her father disappeared years ago and that she became obsessed with remembering details because she hated the feeling of somebody vanishing from her life without explanation.

“That is why you remember my wallet?” you ask.

She smiles.

“That is why I remember you.”`,
  choices: [
    { t: 'Tell her you like being around her too.', do: function (st) { bond('mira', 3); st.mira += 3; st.flags.miraRomanceHint = true; }, to: 'day2_evening' },
    { t: 'Tell her she does not have to earn being cared about.', do: function (st) { bond('mira', 2); }, to: 'day2_evening' }
  ]
};

S.day2_aya = {
  chapter: 'Tuesday — 11:40 a.m.', art: 'aya',
  text: `Aya shows you the ration ledger.

Three meals are marked with a tiny dot instead of a name.

She admits she has been feeding June in secret because June keeps pretending she is not hungry.

Aya is harsh because she is terrified of running out.

“You can hate me later,” she says. “Right now I need you to help me keep everyone alive.”`,
  choices: [
    { t: 'Help her build a fair ration rule.', do: function (st) { bond('aya', 3); st.flags.ayaPartner = true; }, to: 'day2_evening' },
    { t: 'Tell her she cannot carry everyone alone.', do: function (st) { bond('aya', 3); st.flags.ayaSoftSpot = true; }, to: 'day2_evening' }
  ]
};

S.day2_eli = {
  chapter: 'Tuesday — 11:40 a.m.', art: 'eli',
  text: `Eli sits on the gym floor with the bat across his knees.

He admits he lied about the gate because he thought the group would panic.

“I was trying to keep everyone alive.”

He looks at you.

“I do not know if that made things better.”`,
  choices: [
    { t: 'Tell him you understand why he lied.', do: function (st) { bond('eli', 3); st.flags.eliTrust = true; }, to: 'day2_evening' },
    { t: 'Tell him lies become dangerous fast.', do: function (st) { bond('eli', 1); st.flags.eliWarning = true; }, to: 'day2_evening' }
  ]
};

S.day2_noah = {
  chapter: 'Tuesday — 11:40 a.m.', art: 'noah',
  text: `Noah spreads the school map across the floor.

He has marked three routes out.

Loading dock.

Roof.

Old infirmary basement.

He does not explain how he knows about the basement.

When you ask, he only says, “I notice things.”`,
  choices: [
    { t: 'Trust him with something personal.', do: function (st) { bond('noah', 3); st.flags.noahTrust = true; }, to: 'day2_evening' },
    { t: 'Ask what he is hiding.', do: function (st) { bond('noah', 1); st.flags.noahSecret = true; }, to: 'day2_evening' }
  ]
};

S.day2_reyes = {
  chapter: 'Tuesday — 11:40 a.m.', art: 'reyes',
  text: `Ms. Reyes sorts medicine into small stacks.

“You are doing too much,” you tell her.

“So are you.”

She laughs, then admits she froze for three seconds when she saw the first infected on the security feed.

“Three seconds was long enough for the wrong door to stay open.”

She has been carrying that mistake ever since.`,
  choices: [
    { t: 'Tell her surviving is not the same as being perfect.', do: function (st) { bond('reyes', 3); st.flags.reyesComfort = true; }, to: 'day2_evening' },
    { t: 'Promise to help her make the next decision.', do: function (st) { bond('reyes', 2); st.flags.reyesPromise = true; }, to: 'day2_evening' }
  ]
};

S.day2_evening = {
  chapter: 'Tuesday — 8:10 p.m.',
  onEnter: function (st) { ration(st); G.checkpoint('second night'); },
  text: function (st) {
    return `The library has become a home in the smallest possible sense.

There are sleeping spots, a ration notebook and a lookout schedule.

Mira sits near you.

Aya is still writing.

Eli is still checking the doors.

Noah has folded the map into quarters.

Ms. Reyes finally sits down.

Nobody says this is sustainable.

${stock(st)}`;
  },
  choices: [
    { t: 'Sleep near Mira.', do: function (st) { bond('mira', 2); }, to: 'day3_morning' },
    { t: 'Help Aya with the ration ledger.', do: function (st) { bond('aya', 2); }, to: 'day3_morning' },
    { t: 'Take the first watch with Eli.', do: function (st) { bond('eli', 2); }, to: 'day3_morning' },
    { t: 'Stay awake with Noah and the map.', do: function (st) { bond('noah', 2); }, to: 'day3_morning' },
    { t: 'Help Ms. Reyes with the night checklist.', do: function (st) { bond('reyes', 2); }, to: 'day3_morning' }
  ]
};

/* ------------------------------------------------------------------ */
/* Day 3 — blackout and relationship branches                         */

S.day3_morning = {
  chapter: 'Wednesday — 7:05 a.m.',
  onEnter: function (st) { step(st, 3); },
  redirect: function (st) { return (st.food <= 0 && st.water <= 0) ? 'ending_starved_scene' : null; },
  text: `By Wednesday the school no longer feels like a school.

It is a building full of locked doors, mapped corridors and rooms that may or may not still be safe.

Today you can choose what kind of survivor you want to be.`,
  choices: [
    { t: 'Build a stronger shelter with Aya and Eli.', do: function (st) { bond('aya', 1); bond('eli', 1); }, to: 'day3_shelter' },
    { t: 'Repair the radio with Noah.', do: function (st) { bond('noah', 2); }, to: 'day3_radio' },
    { t: 'Search the infirmary basement with Ms. Reyes.', do: function (st) { bond('reyes', 2); }, to: 'day3_basement' },
    { t: 'Watch the courtyard with Mira.', do: function (st) { bond('mira', 2); st.mira += 1; st.flags.miraWatched = true; }, to: 'day3_courtyard' }
  ]
};

S.day3_shelter = {
  chapter: 'Wednesday — 9:10 a.m.', art: 'aya', cast: ['eli'],
  text: `Aya turns panic into lists.

Eli turns lists into barricades.

They disagree constantly.

They also work surprisingly well together.

Aya eventually admits that she hates being the person who makes cruel choices.

Eli admits he is afraid someone will die while everybody is looking at him for an answer.`,
  choices: [
    { t: 'Stay with Aya after Eli leaves.', do: function (st) { bond('aya', 3); st.flags.ayaPrivate = true; }, to: 'day3_bond_hub' },
    { t: 'Tell Eli he can stop pretending not to be scared.', do: function (st) { bond('eli', 3); st.flags.eliPrivate = true; }, to: 'day3_bond_hub' }
  ]
};

S.day3_radio = {
  chapter: 'Wednesday — 9:15 a.m.', art: 'noah',
  text: `Noah opens the emergency radio.

It is dead.

But there is a note under the battery tray.

EAST RIVER BASE.

A place, not a broadcast.

Someone expected the radio to be found.`,
  choices: [
    { t: 'Write down the location.', do: function (st) { clue(st, 'safeZone'); clue(st, 'map'); st.flags.safeZoneClue = true; }, to: 'day3_bond_hub' },
    { t: 'Ask Noah whether he trusts it.', do: function (st) { bond('noah', 2); st.flags.noahSafeZoneDoubt = true; }, to: 'day3_bond_hub' }
  ]
};

S.day3_basement = {
  chapter: 'Wednesday — 9:20 a.m.', art: 'reyes',
  text: `The basement door is locked.

Ms. Reyes has the key.

She opens it.

The corridor smells like bleach and wet concrete.

An emergency poster has been torn down recently.

Something was here before you.`,
  choices: [
    { t: 'Go deeper.', do: function (st) { clue(st, 'basement'); G.shard('echo_basement_door'); st.flags.basementEcho = true; }, to: 'day3_bond_hub' },
    { t: 'Leave it alone.', do: function (st) { bond('reyes', 2); }, to: 'day3_bond_hub' }
  ]
};

S.day3_courtyard = {
  chapter: 'Wednesday — 9:20 a.m.', art: 'mira',
  text: `Mira watches the courtyard.

She notices a curtain move on the second floor.

Nobody should be in that room.

You ask how she spotted it.

“I notice patterns,” she says.

She sounds certain.

Too certain?`,
  choices: [
    { t: 'Trust Mira’s eyes.', do: function (st) { bond('mira', 2); clue(st, 'window'); }, to: 'day3_bond_hub' },
    { t: 'Tell her you need proof.', do: function (st) { bond('mira', 1); st.flags.miraProof = true; }, to: 'day3_bond_hub' }
  ]
};

S.day3_bond_hub = {
  chapter: 'Wednesday — afternoon',
  text: `The school gives you one quiet hour.

No alarms.

No screams.

Just the hum of the emergency lights.

You can spend the hour with one person.

Later, you will remember exactly who you chose.`,
  choices: [
    { t: 'Mira.', do: function (st) { bond('mira', 3); st.mira += 2; }, to: 'day3_mira' },
    { t: 'Aya.', do: function (st) { bond('aya', 3); }, to: 'day3_aya' },
    { t: 'Eli.', do: function (st) { bond('eli', 3); }, to: 'day3_eli' },
    { t: 'Noah.', do: function (st) { bond('noah', 3); }, to: 'day3_noah' },
    { t: 'Ms. Reyes.', do: function (st) { bond('reyes', 3); }, to: 'day3_reyes' }
  ]
};

S.day3_mira = {
  chapter: 'Wednesday — afternoon', art: 'mira',
  text: `Mira sits beside you in a dark classroom.

“You are the first person here who makes me feel like I can breathe.”

She asks what you will do if this ever ends.

You realize she has never once asked what happens if it does not.`,
  choices: [
    { t: 'Tell her you want her there when it ends.', do: function (st) { bond('mira', 3); st.mira += 3; st.flags.miraPromise = true; }, to: 'day3_blackout' },
    { t: 'Tell her you will survive one day at a time.', do: function (st) { bond('mira', 2); }, to: 'day3_blackout' }
  ]
};

S.day3_aya = {
  chapter: 'Wednesday — afternoon', art: 'aya',
  text: `Aya shows you the ration board.

She has started counting who eats first because she is terrified someone will disappear before she can help them.

“You are allowed to be scared,” you tell her.

“I know,” she says.

“I just do not know how to be scared and still be useful.”`,
  choices: [
    { t: 'Tell her she does not have to be useful all the time.', do: function (st) { bond('aya', 3); st.flags.ayaSoftSpot = true; }, to: 'day3_blackout' },
    { t: 'Tell her she is doing enough.', do: function (st) { bond('aya', 2); }, to: 'day3_blackout' }
  ]
};

S.day3_eli = {
  chapter: 'Wednesday — afternoon', art: 'eli',
  text: `Eli sits on the gym floor with the bat across his knees.

He admits he is afraid of being the person everyone expects to save them.

“If I freeze once,” he says, “someone else might die because I was supposed to know what to do.”`,
  choices: [
    { t: 'Tell him he does not have to carry everyone.', do: function (st) { bond('eli', 3); st.flags.eliSoft = true; }, to: 'day3_blackout' },
    { t: 'Tell him you will help him.', do: function (st) { bond('eli', 2); }, to: 'day3_blackout' }
  ]
};

S.day3_noah = {
  chapter: 'Wednesday — afternoon', art: 'noah',
  text: `Noah shows you the route through the auditorium loading dock.

He has been planning it since Monday.

He admits he has not told the others because he is afraid they will all leave at once.

“I do not want to survive this alone.”`,
  choices: [
    { t: 'Keep the map safe.', do: function (st) { bond('noah', 3); st.flags.noahMapTrust = true; }, to: 'day3_blackout' },
    { t: 'Tell him the group deserves the route.', do: function (st) { bond('noah', 2); }, to: 'day3_blackout' }
  ]
};

S.day3_reyes = {
  chapter: 'Wednesday — afternoon', art: 'reyes',
  text: `Ms. Reyes finally sits down.

She tells you she has not slept properly since Monday.

Then she says something she would never say during class:

“Sometimes I think the only reason I am still standing is because everyone keeps looking at me like I know what to do.”

You tell her nobody actually knows.

She laughs.

“That may be the first useful thing anyone has said to me all week.”`,
  choices: [
    { t: 'Tell her you trust her anyway.', do: function (st) { bond('reyes', 3); st.flags.reyesClose = true; }, to: 'day3_blackout' },
    { t: 'Tell her she is allowed to lean on you too.', do: function (st) { bond('reyes', 3); st.flags.reyesLean = true; }, to: 'day3_blackout' }
  ]
};

S.day3_blackout = {
  chapter: 'Wednesday — 9:18 p.m.',
  onEnter: function (st) { st.flags.internetCut = true; ration(st); },
  text: function (st) {
    return `Every phone loses connection within the same minute.

No internet.

No calls.

No messages.

No Wi-Fi.

The radio becomes static.

For the first time, there is no outside world to ask what is happening.

Then the corridor lights die.

${stock(st)}`;
  },
  choices: [
    { t: 'Stay inside and barricade.', do: function (st) { st.flags.barricadedBlackout = true; }, to: 'day3_blackout_after' },
    { t: 'Check the corridor with the flashlight.', if: function (st) { return G.hasItem('flashlight'); }, do: function (st) { spendItem(st, 'flashlight', 1); st.flags.zombieCombat = true; st.flags.usedFlashlight = true; }, to: 'day3_blackout_run' },
    { t: 'Search the dark corridor without a light.', do: function (st) { st.flags.zombieCombat = true; st.flags.darkRun = true; }, to: 'day3_blackout_run' }
  ]
};

S.day3_blackout_run = {
  chapter: 'Wednesday — 9:23 p.m.',
  combat: function () { return blackoutZombie; }, win: 'day3_blackout_after', lose: 'ending_zombie'
};
S.day3_blackout_after = {
  chapter: 'Wednesday — 9:30 p.m.',
  text: `You make it back.

Eli boards the corridor door.

Aya hides the remaining batteries in the ration box.

Noah marks every dark section on the map.

Ms. Reyes says nobody leaves the shelter alone.

Mira watches you for a moment.

“Tomorrow, someone is going to get hurt.”

She says it too confidently.

You are not sure whether that scares you because she is right or because she sounds like she already knows.`,
  choices: [
    { t: 'Ask Mira what she means.', do: function (st) { clue(st, 'prediction'); bond('mira', 1); }, to: 'day4_morning' },
    { t: 'Tell the others what Mira said.', do: function (st) { st.flags.miraPredictionShared = true; st.suspicion += 1; }, to: 'day4_morning' },
    { t: 'Say nothing.', to: 'day4_morning' }
  ]
};

/* ------------------------------------------------------------------ */
/* Day 4 — infection + romance                                       */

S.day4_morning = {
  chapter: 'Thursday — 6:50 a.m.',
  onEnter: function (st) { step(st, 4); setInfected(st); },
  redirect: function (st) { return (st.food <= 0 && st.water <= 0) ? 'ending_starved_scene' : null; },
  text: function (st) {
    return `Thursday starts with an argument over food.

Then Ms. Reyes checks everyone for obvious bites.

${st.infected ? infectedName(st) + ' looks unwell: fever, shaking hands and a headache. There is no bite.' : 'Nobody shows obvious symptoms. That should be reassuring. It is not.'}`;
  },
  choices: [
    { t: 'Tell everyone if you notice something wrong.', do: function (st) { st.flags.healthOpen = true; }, to: 'day4_infection' },
    { t: 'Protect a sick person from panic if there is one.', do: function (st) { st.flags.healthPrivate = true; }, to: 'day4_infection' }
  ]
};

S.day4_infection = {
  chapter: 'Thursday — 7:15 a.m.',
  text: function (st) {
    if (st.infected && !alive(st, st.infected)) st.infected = '';
    if (!st.infected) return `The check reveals nothing obvious.

You are all tired, hungry and frightened.

That is enough to make anyone look sick.`;
    return `${infectedName(st)} has a fever.

There is still no bite.

Aya wants quarantine.

Eli wants everyone to keep moving.

Noah says there may be another explanation.

Ms. Reyes waits for you to speak first.`;
  },
  choices: [
    { t: function (st) { return 'Quarantine ' + infectedName(st) + '.'; }, if: function (st) { return !!st.infected; }, do: function (st) { st.flags.quarantined = true; st.flags.quarantinePublic = !!st.flags.healthOpen; bond(st.infected, 1); }, to: 'day4_relationship_hub' },
    { t: function (st) { return 'Keep ' + infectedName(st) + ' with everyone.'; }, if: function (st) { return !!st.infected; }, do: function (st) { st.flags.notQuarantined = true; st.flags.infectionRiskAccepted = true; st.suspicion += 1; }, to: 'day4_relationship_hub' },
    { t: 'Check everybody twice.', do: function (st) { st.flags.doubleCheck = true; }, to: 'day4_relationship_hub' }
  ]
};

S.day4_relationship_hub = {
  chapter: 'Thursday — late morning',
  text: `The group splits into smaller jobs.

You get one more chance to spend time with someone.

This time the choice changes what kind of relationship you are building.`,
  choices: [
    { t: 'Mira.', do: function (st) { bond('mira', 3); st.mira += 2; }, to: 'day4_mira' },
    { t: 'Aya.', do: function (st) { bond('aya', 3); }, to: 'day4_aya' },
    { t: 'Eli.', do: function (st) { bond('eli', 3); }, to: 'day4_eli' },
    { t: 'Noah.', do: function (st) { bond('noah', 3); }, to: 'day4_noah' },
    { t: 'Ms. Reyes.', do: function (st) { bond('reyes', 3); }, to: 'day4_reyes' }
  ]
};

S.day4_mira = {
  chapter: 'Thursday — late morning', art: 'mira',
  text: `Mira asks whether you still remember the bus.

You do.

“If you had to choose between someone you loved and everyone else, what would you do?” she asks.

The question lands strangely.`,
  choices: [
    { t: '“I would try to save everyone.”', do: function (st) { bond('mira', 2); st.flags.miraTestsYou = true; }, to: 'day4_after_relationship' },
    { t: '“I would save the person I love.”', do: function (st) { bond('mira', 3); st.mira += 3; st.romance = 'mira'; }, to: 'day4_after_relationship' }
  ]
};

S.day4_aya = {
  chapter: 'Thursday — late morning', art: 'aya',
  text: `Aya is alone in the ration room.

She looks exhausted.

She tells you she hates making decisions that feel cruel.

Then she asks whether you trust her.

You can answer as a friend.

Or as something more.`,
  choices: [
    { t: '“I trust you.”', do: function (st) { bond('aya', 2); }, to: 'day4_after_relationship' },
    { t: '“More than I trust most people here.”', do: function (st) { bond('aya', 3); st.romance = 'aya'; st.flags.ayaRomance = true; }, to: 'day4_after_relationship' }
  ]
};

S.day4_eli = {
  chapter: 'Thursday — late morning', art: 'eli',
  text: `Eli takes you to the gym.

He admits he has been imagining the road outside.

He asks whether you would leave with him if there were a safe road out.

The answer changes the way he looks at you.`,
  choices: [
    { t: '“Of course.”', do: function (st) { bond('eli', 2); }, to: 'day4_after_relationship' },
    { t: '“I would choose you.”', do: function (st) { bond('eli', 3); st.romance = 'eli'; st.flags.eliRomance = true; }, to: 'day4_after_relationship' }
  ]
};

S.day4_noah = {
  chapter: 'Thursday — late morning', art: 'noah',
  text: `Noah has a notebook full of routes.

“I do not want to survive this by myself,” he says.

For the first time, he looks directly at you when he says it.`,
  choices: [
    { t: '“You will not.”', do: function (st) { bond('noah', 2); }, to: 'day4_after_relationship' },
    { t: '“Then stay with me.”', do: function (st) { bond('noah', 3); st.romance = 'noah'; st.flags.noahRomance = true; }, to: 'day4_after_relationship' }
  ]
};

S.day4_reyes = {
  chapter: 'Thursday — late morning', art: 'reyes',
  text: `Ms. Reyes finds you alone near the stairs.

She thanks you for being honest with her all week.

Then she draws a boundary.

“Whatever this trust becomes, it has to wait until I am not your teacher anymore.”

She looks embarrassed by how direct that sounds.

“But I hope that if we both survive, you will still want to know me when the school is behind us.”`,
  choices: [
    { t: 'Promise you will find her after the crisis.', do: function (st) { bond('reyes', 3); st.flags.reyesFuture = true; }, to: 'day4_after_relationship' },
    { t: 'Tell her you only need her to be there now.', do: function (st) { bond('reyes', 3); }, to: 'day4_after_relationship' }
  ]
};

S.day4_after_relationship = {
  chapter: 'Thursday — 3:40 p.m.',
  text: function (st) {
    var r = st.romance ? '\n\nYou have chosen someone. You do not know yet what that means.' : st.flags.reyesFuture ? '\n\nThere is a quiet promise between you and Ms. Reyes that belongs to a future neither of you can see yet.' : '';
    return `The group reunites.

Someone has moved the medicine box.

The radio is still dead.

The infected are active in the lower floors.
${r}`;
  },
  choices: [
    { t: 'Search for the missing medicine.', do: function (st) { clue(st, 'medicine'); G.addItem('firstaid'); }, to: 'day4_night' },
    { t: 'Secure the doors instead.', do: function (st) { st.flags.doorsSecured = true; }, to: 'day4_night' },
    { t: 'Follow whoever moved the medicine.', do: function (st) { clue(st, 'medicineMove'); clue(st, 'visitor'); st.flags.followedMedicine = true; G.addItem('flashlight'); }, to: 'day4_night' },
    { t: 'Check the science wing before dark.', do: function (st) { st.flags.zombieCombat = true; st.flags.labHordeSeen = true; }, to: 'day4_lab_horde' }
  ]
};

S.day4_lab_horde = {
  chapter: 'Thursday — 4:05 p.m.',
  combat: function () { return labHordeZombie; }, win: 'day4_lab_horde_after', lose: 'ending_zombie'
};
S.day4_lab_horde_after = {
  chapter: 'Thursday — 4:15 p.m.',
  text: `The science wing is lost.

You counted at least a dozen infected between the lab and the stairwell, and that was only what you could see.

The group had been talking about isolated cases. The building is telling you otherwise.`,
  choices: [
    { t: 'Return to the library before dark.', to: 'day4_night' }
  ]
};

S.day4_night = {
  chapter: 'Thursday — 9:10 p.m.',
  onEnter: function (st) { ration(st); resolveRomanceDeath(st); },
  text: function (st) {
    var victim = victimLabel(st);
    return `The first death comes quietly.

A door is open.

${victim} is missing.

The body is found in the infirmary.

No bite.

No obvious wound.

Only a small puncture beneath the collar.

The room goes silent.

Then Aya says what everybody was trying not to say:

“Someone here did this.”`;
  },
  choices: [
    { t: 'Secure the body and build a timeline.', do: function (st) { clue(st, 'timeline'); bond('reyes', 1); }, to: 'day5_morning' },
    { t: 'Lock everyone into the library.', do: function (st) { st.flags.lockdown = true; st.suspicion += 1; }, to: 'day5_morning' }
  ]
};

/* ------------------------------------------------------------------ */
/* Day 5 — murder mystery hub                                         */

S.day5_morning = {
  chapter: 'Friday — 6:12 a.m.',
  onEnter: function (st) { step(st, 5); resolveRomanceDeath(st); if (st.infected && !alive(st, st.infected)) st.infected = ''; },
  redirect: function (st) { return (st.food <= 0 && st.water <= 0) ? 'ending_starved_scene' : null; },
  text: function (st) {
    var victim = victimLabel(st);
    return `Nobody slept.

${victim} is dead.

If you loved that person, the grief is private.

If you did not, the fear is public.

The body shows no bite.

Someone knew where the medicine was.

Someone knew when the group would be asleep.

You need to investigate, but you also need food, water and a shelter strong enough to survive another attack.

${stock(st)}`;
  },
  choices: [
    { t: 'Take Aya to the ration room.', if: function (st) { return alive(st, 'aya'); }, do: function (st) { bond('aya', 1); }, to: 'day5_hub' },
    { t: 'Take Eli to the equipment room.', if: function (st) { return alive(st, 'eli'); }, do: function (st) { bond('eli', 1); }, to: 'day5_hub' },
    { t: 'Take Noah to administration.', if: function (st) { return alive(st, 'noah'); }, do: function (st) { bond('noah', 1); }, to: 'day5_hub' },
    { t: 'Take Ms. Reyes to the infirmary.', if: function (st) { return alive(st, 'reyes'); }, do: function (st) { bond('reyes', 1); }, to: 'day5_hub' },
    { t: 'Search alone and keep everyone else together.', to: 'day5_hub' }
  ]
};

S.day5_hub = {
  chapter: 'Friday — 7:05 a.m.',
  text: `The search has to happen in stages.

Four places may contain useful evidence.

You can search the ration room, equipment room, administration office or infirmary.

Pick one now. You will get another search later.`,
  choices: [
    { t: 'Search the ration room.', if: function (st) { return !searchDone(st, 'ration'); }, do: function (st) { markSearch(st, 'ration'); clue(st, 'ledger'); G.addItem('canned'); }, to: 'day5_hub_two' },
    { t: 'Search the equipment room.', if: function (st) { return !searchDone(st, 'equipment'); }, do: function (st) { markSearch(st, 'equipment'); clue(st, 'sheath'); if (!G.hasItem('bat') && !G.hasItem('knife')) G.addItem('extinguisher'); }, to: 'day5_hub_two' },
    { t: 'Search administration.', if: function (st) { return !searchDone(st, 'admin'); }, do: function (st) { markSearch(st, 'admin'); clue(st, 'timeline'); G.addItem('flashlight'); }, to: 'day5_hub_two' },
    { t: 'Search the infirmary.', if: function (st) { return !searchDone(st, 'infirmary'); }, do: function (st) { markSearch(st, 'infirmary'); clue(st, 'medicine'); G.addItem('waterbottle'); }, to: 'day5_hub_two' }
  ]
};

S.day5_hub_two = {
  chapter: 'Friday — 8:20 a.m.',
  text: `One room is searched.

You have enough to make somebody nervous, not enough to accuse them.

Pick one more room.`,
  choices: [
    { t: 'Search the ration room.', if: function (st) { return !searchDone(st, 'ration'); }, do: function (st) { markSearch(st, 'ration'); clue(st, 'ledger'); }, to: 'day5_hub_three' },
    { t: 'Search the equipment room.', if: function (st) { return !searchDone(st, 'equipment'); }, do: function (st) { markSearch(st, 'equipment'); clue(st, 'sheath'); }, to: 'day5_hub_three' },
    { t: 'Search administration.', if: function (st) { return !searchDone(st, 'admin'); }, do: function (st) { markSearch(st, 'admin'); clue(st, 'visitor'); clue(st, 'map'); }, to: 'day5_hub_three' },
    { t: 'Search the infirmary.', if: function (st) { return !searchDone(st, 'infirmary'); }, do: function (st) { markSearch(st, 'infirmary'); clue(st, 'medicine'); clue(st, 'infectionWarning'); G.addItem('firstaid'); }, to: 'day5_hub_three' }
  ]
};

S.day5_hub_three = {
  chapter: 'Friday — 9:10 a.m.',
  text: function (st) {
    var notes = [];
    if (hasClue(st, 'ledger')) notes.push('Aya’s ledger shows late-night food movement. It could be theft or secret feeding.');
    if (hasClue(st, 'sheath')) notes.push('Eli’s knife sheath is missing. The knife has been cleaned recently.');
    if (hasClue(st, 'visitor')) notes.push('Someone was in the school before classes started.');
    if (hasClue(st, 'medicine')) notes.push('Medicine was signed out before the outbreak.');
    if (hasClue(st, 'timeline')) notes.push('The first death overlaps with a suspicious gap in somebody’s story.');
    return (notes.length ? notes.join('\n\n') : 'You have fragments, but no shape.') + '\n\nThe school is quiet for the moment. You can either protect someone or keep pulling at the thread.';
  },
  choices: [
    { t: 'Protect Aya and the ration book.', do: function (st) { bond('aya', 2); st.flags.ayaProtection = true; }, to: 'day5_second_death' },
    { t: 'Patrol with Eli.', do: function (st) { bond('eli', 2); st.flags.eliPatrol = true; }, to: 'day5_second_death' },
    { t: 'Reconstruct the timeline with Noah.', do: function (st) { bond('noah', 2); clue(st, 'noahTimeline'); }, to: 'day5_second_death' },
    { t: 'Ask Ms. Reyes about the medicine.', do: function (st) { bond('reyes', 2); clue(st, 'reyesMedicine'); }, to: 'day5_second_death' },
    { t: 'Compare Mira’s warning with the timeline.', do: function (st) { clue(st, 'miraPattern'); st.flags.evidenceEcho = true; }, to: 'day5_second_death' },
    { t: 'Inspect the evidence board alone.', do: function (st) { G.shard('echo_evidence_board'); st.flags.evidenceEcho = true; }, to: 'day5_second_death' }
  ]
};

S.day5_second_death = {
  chapter: 'Friday — 11:03 a.m.',
  onEnter: function (st) { resolveSecondDeath(st); },
  text: function (st) {
    var illness = '';
    if (st.infected && !alive(st, st.infected)) st.infected = '';
    if (st.infected && !st.flags.quarantined) illness = `\n\nThen ${infectedName(st)} collapses. Fever. Confusion. No bite anyone can see. For a moment, the murder is not the only thing the group fears.`;
    return `The second death happens before lunch.

A chair falls.

A door slams.

Then silence.

${secondVictimName(st)} is dead.

They had seen the first body and were helping track who entered the infirmary. There is still no bite.

Three words are written on the wall:

STOP LOOKING.

The school has lost another person, and the killer has now shown you that the deaths are connected. The group turns toward you because you are the person who has been asking questions.${illness}`;
  },
  choices: [
    { t: 'Keep investigating.', do: function (st) { st.investigation += 2; }, to: 'day5_accusation' },
    { t: 'Stop investigating and reinforce the shelter.', do: function (st) { st.flags.stoppedInvestigating = true; st.suspicion += 1; }, to: 'day5_accusation' },
    { t: 'Confront the person you trust most.', do: function (st) { st.flags.trustTest = true; }, to: 'day5_accusation' }
  ]
};

S.day5_accusation = {
  chapter: 'Friday — 11:30 a.m.',
  text: `Hysteria spreads faster than the infection.

Aya stops sharing the ration book.

Eli keeps the knife visible.

Noah refuses to tell anyone what he saw in the hallway.

Ms. Reyes locks the medicine cabinet.

Mira looks frightened.

You have a choice that can ruin the group even if you are correct.`,
  choices: [
    { t: 'Accuse Aya.', if: function (st) { return alive(st, 'aya'); }, do: function (st) { accuse(st, 'aya'); }, to: 'day5_accuse_result' },
    { t: 'Accuse Eli.', if: function (st) { return alive(st, 'eli'); }, do: function (st) { accuse(st, 'eli'); }, to: 'day5_accuse_result' },
    { t: 'Accuse Noah.', if: function (st) { return alive(st, 'noah'); }, do: function (st) { accuse(st, 'noah'); }, to: 'day5_accuse_result' },
    { t: 'Accuse Mira.', if: function (st) { return !st.flags.miraDead; }, do: function (st) { accuse(st, 'mira'); }, to: 'day5_accuse_result' },
    { t: 'Accuse nobody yet.', do: function (st) { st.flags.noPublicAccuse = true; }, to: 'day6_morning' }
  ]
};

S.day5_accuse_result = {
  chapter: 'Friday — 11:38 a.m.',
  text: function (st) {
    if (st.flags.accused === 'mira') return `You say Mira’s name.

The room freezes.

Mira looks at you without speaking.

Aya asks for evidence.

Eli asks whether you are sure.

Being right too early can look exactly like being wrong.`;
    return `You accuse ${nameOf(st, st.flags.accused)}.

They deny it.

You cannot prove it.

Mira is the first person to defend them.

It is exactly the kind of reasonable thing an innocent person would do.

It is also exactly what a careful killer would do.`;
  },
  choices: [
    { t: 'Admit you may be wrong.', do: function (st) { st.suspicion += 1; }, to: 'day6_morning' },
    { t: 'Double down.', do: function (st) { st.suspicion += 3; }, to: 'day6_morning' }
  ]
};

/* ------------------------------------------------------------------ */
/* Day 6 — Mira fate + infection surge                                */

S.day6_morning = {
  chapter: 'Saturday — 6:10 a.m.',
  onEnter: function (st) { step(st, 6); ration(st); rollMiraFate(st); },
  redirect: function (st) { if (st.food <= 0 && st.water <= 0) return 'ending_starved_scene'; return st.flags.miraDead ? 'mira_dead_scene' : null; },
  text: function (st) {
    return `Rain hits the windows.

No internet.

No radio.

The school is running on batteries and habit.

${st.flags.miraDead ? 'Mira is dead. The killer is still somewhere in the building.' : 'Mira is still alive. The frightening thing is not that you suspect her. It is that part of you still wants her to be innocent.'}`;
  },
  choices: [
    { t: 'Ask Mira where she was during the first death.', if: function (st) { return alive(st, 'mira'); }, do: function (st) { clue(st, 'miraAlibi'); bond('mira', 1); }, to: 'day6_deep_search' },
    { t: 'Stay quiet and search the basement.', to: 'day6_deep_search' },
    { t: 'Trust Mira and stay with her.', if: function (st) { return alive(st, 'mira'); }, do: function (st) { bond('mira', 2); st.mira += 2; }, to: 'day6_deep_search' }
  ]
};

S.mira_dead_scene = {
  chapter: 'Saturday — 6:16 a.m.', art: 'mira',
  text: `Mira is dead.

No bite.

No obvious wound.

A small puncture sits beneath her collar.

The group erupts.

Aya demands to know who was with her.

Eli reaches for the knife.

Noah checks the doors.

Ms. Reyes tells everyone to stop shouting.

Mira is now a victim, not an answer.

The killer has not been revealed.`,
  choices: [
    { t: 'Search Mira’s things.', do: function (st) { clue(st, 'miraVictim'); }, to: 'day6_deep_search' },
    { t: 'Stay with the group and protect the survivors.', do: function (st) { bond('reyes', 2); }, to: 'day6_deep_search' }
  ]
};

S.day6_deep_search = {
  chapter: 'Saturday — 8:10 a.m.',
  text: function (st) {
    var bits = [];
    if (hasClue(st, 'visitor')) bits.push('The visitor log places someone in the building before the school opened.');
    if (hasClue(st, 'medicine')) bits.push('The medicine trail begins before the outbreak.');
    if (hasClue(st, 'timeline')) bits.push('The death times overlap with a suspicious gap in someone’s story.');
    if (hasClue(st, 'prediction')) bits.push('Mira predicted someone would get hurt before the first death.');
    if (hasClue(st, 'miraVictim')) bits.push('Mira’s death matches the unexplained puncture pattern.');
    return (bits.length ? bits.join('\n\n') : 'You have fragments, but no shape.') + '\n\nOne place may connect everything: the infirmary basement.';
  },
  choices: [
    { t: 'Go into the infirmary basement.', do: function (st) { st.flags.zombieCombat = true; }, to: 'day6_basement' },
    { t: 'Stay upstairs and compare stories.', do: function (st) { clue(st, 'stories'); }, to: 'day6_infection_surge' },
    { t: 'Ask Aya to compare the records.', do: function (st) { bond('aya', 2); clue(st, 'ayaRecord'); }, to: 'day6_infection_surge' },
    { t: 'Ask Noah to reconstruct the timeline.', do: function (st) { bond('noah', 2); clue(st, 'noahTimeline'); }, to: 'day6_infection_surge' }
  ]
};

S.day6_basement = {
  chapter: 'Saturday — 8:18 a.m.',
  combat: function () { return Object.assign({}, hallwayZombie, { art: 'utility', name: 'An infected in the infirmary basement' }); }, win: 'day6_basement_after', lose: 'ending_zombie'
};
S.day6_basement_after = {
  chapter: 'Saturday — 8:24 a.m.',
  text: `The basement contains old emergency records.

A page remains on the floor.

“Report fever, confusion, aggression. Do not assume every death is infection.”

That sentence changes everything.

The school expected people to confuse illness with murder.

Someone understood that before you did.`,
  choices: [
    { t: 'Take the page.', do: function (st) { clue(st, 'infectionWarning'); G.addItem('waterbottle'); }, to: 'day6_infection_surge' },
    { t: 'Search for the missing folder.', do: function (st) { clue(st, 'missingFolder'); G.addItem('extinguisher'); G.shard('echo_missing_folder'); }, to: 'day6_infection_surge' }
  ]
};

S.day6_infection_surge = {
  chapter: 'Saturday — 10:40 a.m.',
  text: function (st) {
    if (st.infected && !alive(st, st.infected)) st.infected = '';
    if (!st.infected) return `The infected surge below the auditorium.

Nobody in your group is sick.

Not yet.

That almost makes the silence worse.`;
    if (st.flags.quarantined) return `${infectedName(st)} is still quarantined.

The fever has not gone away, but there has been no turn.

For the first time, you have something resembling hope.`;
    return `${infectedName(st)} is getting worse.

The fever spikes.

Their speech becomes confused.

For one second they do not recognize you.

Then something hits the barricade outside.

The murder mystery now has a survival problem inside it.`;
  },
  choices: [
    { t: 'Keep the infected person isolated.', if: function (st) { return !!st.infected && !st.flags.quarantined; }, do: function (st) { st.flags.quarantined = true; }, to: 'day6_evening' },
    { t: 'Move together and risk it.', if: function (st) { return !!st.infected && !st.flags.quarantined; }, do: function (st) { st.flags.zombieCombat = true; }, to: 'day6_infection_breakout' },
    { t: 'Stay with the quarantine.', if: function (st) { return !!st.infected && st.flags.quarantined; }, to: 'day6_evening' },
    { t: 'Prepare for another breach.', if: function (st) { return !st.infected; }, to: 'day6_evening' }
  ]
};
S.day6_infection_breakout = {
  chapter: 'Saturday — 10:46 a.m.',
  combat: function () { return facultyHordeZombie; }, win: 'day6_evening', lose: 'ending_zombie'
};

S.day6_evening = {
  chapter: 'Saturday — 7:20 p.m.',
  onEnter: function (st) { ration(st); G.checkpoint('last night'); },
  text: function (st) {
    return `Saturday night.

The school is nearly out of power.

You have evidence, but evidence is not safety.

Outside, something large passes over the roof.

A helicopter.

It does not land.

Not yet.

${stock(st)}`;
  },
  choices: [
    { t: 'Prepare an evacuation route with Aya and Eli.', do: function (st) { bond('aya', 1); bond('eli', 1); st.flags.evacPlan = true; st.flags.evacPrepared = true; }, to: 'day7_morning' },
    { t: 'Prepare the loading dock with Noah.', do: function (st) { bond('noah', 2); st.flags.loadingPlan = true; st.flags.loadingPrepared = true; }, to: 'day7_morning' },
    { t: 'Prepare the group with Ms. Reyes.', do: function (st) { bond('reyes', 2); st.flags.reyesPlan = true; st.flags.reyesPrepared = true; }, to: 'day7_morning' },
    { t: 'Stay near Mira.', if: function (st) { return !st.flags.miraDead; }, do: function (st) { bond('mira', 2); st.mira += 1; }, to: 'day7_morning' }
  ]
};

/* ------------------------------------------------------------------ */
/* Day 7 — helicopter notice, confrontation and escape                 */

S.day7_morning = {
  chapter: 'Sunday — 6:42 a.m.',
  onEnter: function (st) { step(st, 7); resolveSecondDeath(st); },
  redirect: function (st) { return (st.food <= 0 && st.water <= 0) ? 'ending_starved_scene' : null; },
  text: function (st) { return `The helicopter returns after sunrise.

It does not land.

Instead it circles the school and releases a cloud of white paper.

Pages slap against fences, windows and wet pavement.

No one moves at first.

Noah catches one.

EMERGENCY EVACUATION NOTICE

MILITARY SAFE ZONE ESTABLISHED — EAST RIVER BASE

FOLLOW THE MARKED ROUTE TO THE RECEPTION CHECKPOINT.

REPORT FEVER, CONFUSION OR AGGRESSION.

DO NOT APPROACH IF BITTEN.

For the first time, the outside world has given you a destination.

It has not given you a guarantee.

${st.flags.shelterCompromised ? 'After the second death, nobody believes the library is safe anymore. The evacuation notice did not come too soon.' : ''}`; },
  choices: [
    { t: 'Follow the marked route.', do: function (st) { st.flags.markedExit = true; }, to: 'day7_marked_route' },
    { t: 'Use Noah’s loading-dock route.', do: function (st) { st.flags.loadingExit = true; }, to: 'day7_loading_route' },
    { t: 'Stay long enough to solve the murders.', do: function (st) { st.flags.solveBeforeLeave = true; }, to: 'day7_investigate_final' }
  ]
};

S.day7_investigate_final = {
  chapter: 'Sunday — 7:10 a.m.',
  text: function (st) {
    if (st.flags.miraDead) return `Mira is dead.

The papers say to leave.

The murders are still unsolved.

You can keep searching, but you have to decide when certainty stops being worth another body.`;
    return `You put the evidence together one last time.

The medicine.

The timing.

The visitor log.

${hasClue(st, 'miraPattern') ? 'Mira’s warning and her strange knowledge of the infirmary layout.' : 'The map and Mira’s prediction.'}

The bodies: ${victimLabel(st)} and ${secondVictimName(st)}.

One final confrontation can happen before you leave.`;
  },
  choices: [
    { t: 'Name Mira.', if: function (st) { return !st.flags.miraDead && enoughEvidence(st); }, do: function (st) { accuse(st, 'mira'); }, to: 'final_mira' },
    { t: 'Name Aya.', if: function (st) { return alive(st, 'aya'); }, do: function (st) { accuse(st, 'aya'); }, to: 'final_vote' },
    { t: 'Name Eli.', if: function (st) { return alive(st, 'eli'); }, do: function (st) { accuse(st, 'eli'); }, to: 'final_vote' },
    { t: 'Name Noah.', if: function (st) { return alive(st, 'noah'); }, do: function (st) { accuse(st, 'noah'); }, to: 'final_vote' },
    { t: 'Admit you do not know.', do: function (st) { st.flags.unknownKiller = true; }, to: 'day7_final_choice' },
    { t: 'Leave now and keep the mystery unsolved.', if: function (st) { return !!st.flags.miraDead; }, do: function (st) { st.flags.unknownKiller = true; }, to: 'ending_unsolved_scene' }
  ]
};

S.day7_marked_route = {
  chapter: 'Sunday — 7:02 a.m.',
  text: function (st) {
    var ready = hasEvacPreparation(st);
    var routeNote = st.flags.evacPrepared || st.flags.evacPlan ? 'Aya and Eli recognize the choke points because you prepared the marked route.' : st.flags.reyesPrepared ? 'Ms. Reyes has already briefed the group on the choke points and fallback positions.' : 'The route is exposed and unfamiliar. Every corner becomes a decision.';
    return `You follow the painted arrows from the evacuation notice.

${routeNote}

A metal shutter is half open ahead.`;
  },
  choices: [
    { t: 'Go through together.', do: function (st) { st.flags.routeTogether = true; }, to: function (st) { return hasEvacPreparation(st) ? 'helicopter_event' : 'final_escape'; } },
    { t: 'Take the service corridor around it.', do: function (st) { st.flags.serviceDetour = true; }, to: 'final_escape' }
  ]
};

S.day7_loading_route = {
  chapter: 'Sunday — 7:05 a.m.',
  text: function (st) {
    return `Noah’s loading-dock route is narrower than the marked path, but he knows every blind corner.

${st.flags.loadingPrepared ? 'Because you prepared it the night before, the doors are already chained and the alarm is disabled.' : 'The route works, but the door has not been prepared. Something is moving on the other side.'}`;
  },
  choices: [
    { t: 'Use the prepared loading dock.', if: function (st) { return !!st.flags.loadingPrepared; }, to: 'helicopter_event' },
    { t: 'Push through the loading dock.', do: function (st) { st.flags.loadingForced = true; st.flags.zombieCombat = true; }, to: 'final_escape' },
    { t: 'Abandon the route and use the marked path.', to: 'day7_marked_route' }
  ]
};

S.day7_final_choice = {
  chapter: 'Sunday — 7:30 a.m.',
  text: function (st) {
    var living = ['aya', 'eli', 'noah', 'reyes', 'mira'].filter(function (id) {
      return alive(st, id);
    }).map(function (id) { return nameOf(st, id); });
    return `The survivors gather at the service corridor.

The school gate is no longer safe.

The marked route leads east.

The loading dock leads south.

${living.length ? living.join(', ') : 'Almost nobody'} can make it this far.

There is one last question: do you leave now, or risk the building for somebody you cannot abandon?`;
  },
  choices: [
    { t: 'Leave immediately.', to: 'final_escape' },
    { t: 'Go back for Mira.', if: function (st) { return !st.flags.miraDead && st.mira >= 6; }, to: 'final_search_mira' },
    { t: 'Let Ms. Reyes decide for the group.', do: function (st) { bond('reyes', 2); }, to: function (st) { return st.flags.reyesPrepared ? 'helicopter_event' : 'final_escape'; } }
  ]
};

S.final_search_mira = {
  chapter: 'Sunday — 7:48 a.m.', art: 'mira',
  text: `You find Mira in the old classroom.

She is standing by the window.

“You came back.”

She looks relieved.

That is almost worse.

She asks whether you trust her.`,
  choices: [
    { t: '“Yes.”', do: function (st) { st.flags.miraChosen = true; }, to: 'final_escape_mira' },
    { t: '“Not enough.”', do: function (st) { st.flags.miraRejected = true; }, to: 'final_mira' },
    { t: '“Tell me the truth first.”', do: function (st) { st.flags.miraQuestion = true; }, to: 'final_mira' }
  ]
};

S.final_escape = {
  chapter: 'Sunday — 7:55 a.m.',
  onEnter: function (st) { st.flags.zombieCombat = true; },
  combat: function () { return Object.assign({}, stairZombie, { art: 'outdoor', name: 'Infected crowd blocking the service road', escapeGoal: 9, intro: 'The service road is not blocked by one infected. A crowd is spilling through the gate, enough that stopping to fight would mean being surrounded. Find the gaps and keep the group moving.' }); }, win: 'final_escape_after', lose: 'ending_zombie'
};

S.final_escape_after = {
  chapter: 'Sunday — 8:10 a.m.',
  text: function (st) {
    return `You reach the service road.

The helicopter circles again.

A military convoy waits far beyond the intersection.

${st.flags.loadingForced ? 'Noah’s route cost you time, and the gate behind you is no longer usable.' : st.flags.serviceDetour ? 'The service detour kept the group together, but it cost precious minutes.' : 'The marked route got everyone out before the lower halls filled.'}

The school burns behind you in places.

The safe zone is real.

${stock(st)}`;
  },
  choices: [
    { t: 'Follow the military route.', to: 'helicopter_event' },
    { t: 'Leave the road and keep moving.', to: 'ending_dawn_scene' }
  ]
};

S.helicopter_event = {
  chapter: 'Sunday — 8:22 a.m.',
  text: function (st) {
    var health = st.infected ? `\n\nThe soldiers ask about ${infectedName(st)}. The notice warned about fever, confusion and aggression.` : '';
    return `Floodlights hit the road.

Soldiers check hands, faces and clothing before letting anyone through.

This is not freedom.

It is a checkpoint at the end of a week nobody should have survived.${health}`;
  },
  choices: [
    { t: 'Tell the soldiers everything you know.', do: function (st) { st.flags.toldMilitary = true; st.flags.miraExposed = !!st.flags.exposeMira; }, to: function (st) { return st.flags.miraExposed ? 'ending_truth_scene' : 'ending_evacuation_scene'; } },
    { t: 'Protect the group’s secrets.', do: function (st) { st.flags.keptSecrets = true; }, to: 'ending_evacuation_scene' },
    { t: 'Promise Ms. Reyes you will find her after this is over.', if: function (st) { return !!st.flags.reyesFuture && G.bondLevel('reyes') >= 8; }, do: function (st) { st.flags.reyesFutureConfirmed = true; }, to: 'ending_reyes_scene' }
  ]
};

S.final_mira = {
  chapter: 'Sunday — 8:30 a.m.', art: 'mira',
  text: function (st) {
    if (st.flags.miraDead) return `Mira is dead.

There is no confession left to hear.

The murder mystery ends as a question instead of an answer.`;
    var first = victimLabel(st);
    return `Mira looks at you.

For once, she does not deny anything.

${first} was the first person she chose to remove from your world. ${secondVictimName(st)} was the second. The medicine trail was the line she tried to erase.

After that, fear did the rest.

“I kept telling myself I would stop.”

She looks down at her hands.

“I kept finding reasons not to.”

The terrible part is that she still loves you.

And part of you still loves her.`;
  },
  choices: [
    { t: 'Tell the others the truth.', do: function (st) { st.flags.exposeMira = true; }, to: 'final_expose_mira' },
    { t: 'Take Mira and leave.', if: function (st) { return st.mira >= 7; }, do: function (st) { st.flags.miraChosen = true; }, to: 'final_escape_mira' },
    { t: 'Ask why she chose you.', do: function (st) { st.flags.miraQuestion = true; }, to: 'final_mira_question' }
  ]
};

S.final_mira_question = {
  chapter: 'Sunday — 8:34 a.m.', art: 'mira',
  text: `Mira answers quietly.

“Because you stayed.”

She looks toward the road.

“You kept making me believe I could keep you.”

That sentence scares you more than the confession.`,
  choices: [
    { t: 'Tell her she cannot own you.', do: function (st) { st.flags.miraRejected = true; }, to: 'final_expose_mira' },
    { t: 'Tell her you still care about her.', do: function (st) { st.flags.miraChosen = true; }, to: 'final_escape_mira' }
  ]
};

S.final_expose_mira = {
  chapter: 'Sunday — 8:40 a.m.',
  text: `Aya looks from you to Mira.

Eli lowers the knife.

Noah closes the door.

Ms. Reyes says nothing for a long time.

Then Mira asks one question:

“Are you afraid of me now?”

The honest answer is yes.

You leave the school with the truth between you.`,
  choices: [
    { t: 'Keep everyone together and evacuate.', do: function (st) { st.flags.miraExposed = true; }, to: 'final_escape' },
    { t: 'Stay behind until the route is clear.', do: function (st) { st.flags.miraExposed = true; }, to: 'helicopter_event' }
  ]
};

S.final_escape_mira = {
  chapter: 'Sunday — 8:43 a.m.', art: 'mira',
  text: `You leave with Mira.

She does not let go of your hand.

Neither of you says the word murder.

The school burns behind you.

The road ahead is full of people who do not know what happened inside.

Mira looks at you.

“Still here,” she whispers.

You do not know whether that is a promise or a warning.`,
  choices: [
    { t: 'Go toward the military safe zone.', to: 'helicopter_event' },
    { t: 'Leave the road entirely.', to: 'ending_together_scene' }
  ]
};

S.final_vote = {
  chapter: 'Sunday — 8:45 a.m.',
  text: function (st) {
    if (st.flags.accused === 'mira') {
      return `You accuse Mira again.

Nobody speaks.

She looks hurt before she looks frightened.

Aya asks whether you have enough evidence.

Eli raises the knife.

Ms. Reyes tells everyone to stop moving.`;
    }
    return `The accusation has become its own disaster.

The group is no longer deciding who killed whom.

They are deciding whether they can trust you.

The infected are moving in the lower halls.

Fear is turning into a timer.`;
  },
  choices: [
    { t: 'Stand by the accusation against Mira.', if: function (st) { return st.flags.accused === 'mira'; }, do: function (st) { st.flags.standAccusation = true; }, to: 'final_mira' },
    { t: 'Stand by the accusation.', if: function (st) { return !!st.flags.accused && st.flags.accused !== 'mira' && st.suspicion >= 5; }, to: 'ending_suspected_scene' },
    { t: 'Stand by the accusation.', if: function (st) { return !!st.flags.accused && st.flags.accused !== 'mira' && st.suspicion < 5; }, to: 'ending_false_accusation_scene' },
    { t: 'Withdraw the accusation.', do: function (st) { st.flags.withdrawn = true; st.suspicion += 1; }, to: 'day7_final_choice' }
  ]
};

/* ------------------------------------------------------------------ */
/* Ending wrappers                                                    */

S.ending_starved_scene = { ending: 'starved' };
S.ending_false_accusation = { ending: 'false_accusation' };
S.ending_false_accusation_scene = S.ending_false_accusation;
S.ending_suspected = { ending: 'suspected' };
S.ending_suspected_scene = S.ending_suspected;
S.ending_zombie = { ending: 'zombie' };
S.ending_zombie_scene = S.ending_zombie;
S.ending_dawn_scene = { ending: 'dawn' };
S.ending_together_scene = { ending: 'together' };
S.ending_unsolved_scene = { ending: 'unsolved' };
S.ending_evacuation_scene = { ending: 'evacuation' };
S.ending_truth_scene = { ending: 'truth' };
S.ending_reyes_scene = { ending: 'reyes_future' };

S.school_resource_check = {
  redirect: function (st) {
    return (st.food <= 0 && st.water <= 0) ? 'ending_starved_scene' : 'day2_morning';
  }
};

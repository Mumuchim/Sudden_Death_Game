import { api } from './registry.js';

/* Sudden Death — arc one: school.

   Three things are tracked and none of them are shown.
   Devotion: how much of her is pointed at you.
   Jealousy: how much of her is pointed at somebody else.
   And three quiet facts that decide whether you are alive on Saturday. */

var G = api, S = G.SCENES, I = G.ITEMS;

/* ---------- seeded pools ---------- */

var PROOF = [
  { id: 'p_voicemail', item: 'A voicemail, 3:41am',
    plant: 'Your phone has a voicemail on it from 3:41 in the morning. Fifty-one seconds. It is [[Mira]], and it is not the voice she uses at lunch.\n\nShe is listing things. Where you park. Which side of the bed you sleep on, which you have never told anyone alive. She says it the way you would read a shopping list, and at the end she laughs and says {sorry, sorry, $NAME, I was half asleep} and hangs up.',
    keep: 'Keep it. Don\'t delete it.', drop: 'Delete it. People say strange things at four in the morning.',
    desc: 'Fifty-one seconds of her being someone else.',
    reread: 'You listen to it again with the lights off, all fifty-one seconds, and this time you hear the part you missed: there is no pause anywhere in it. She is not remembering any of this. She is reading.' },
  { id: 'p_note', item: 'A folded note',
    plant: 'A note lands on your desk in chemistry, folded into that tight little triangle [[Mira]] does. The front says $NAME with a heart, which is normal for her now.\n\nThe inside is a floor plan of your house. Your actual house. The back door is circled. Under it, in her neat handwriting: {so you\'ll never have to be scared. I\'ll always know where you are.}',
    keep: 'Fold it back up and put it in your bag.', drop: 'Bin it on the way out. It has to be a joke.',
    desc: 'A floor plan of your house with the back door circled.',
    reread: 'You flatten it out on your bed and look at it properly for the first time, and find the thing you did not want to find: the measurements are right. Not sketched. Measured. Somebody has been in there with their hands on the walls.' },
  { id: 'p_key', item: 'Your spare key',
    plant: 'You lost your spare house key three weeks ago and never told a soul, because it was embarrassing and because you assumed it went down a drain.\n\n[[Mira]] hands it back at the lockers without breaking stride. {You dropped this, $NAME,} she says, warm as anything, and is gone before you can ask where.\n\nIt is on a new keyring. Somebody has had a second one cut.',
    keep: 'Take both keys. Say nothing.', drop: 'Take yours. Leave the copy on the bench.',
    desc: 'Your spare key, and the copy somebody had cut.',
    reread: 'You sit on the floor of your room with both keys in your hand and notice the thing you skipped past: the new one is worn. Not new-cut shiny. Worn at the edges, the way a key goes when it has been used a great many times.' },
  { id: 'p_photo', item: 'A photo with a date stamp',
    plant: 'Somebody airdrops you a photo by accident in free period and the name on it is [[Mira]]\'s.\n\nIt is a picture of you asleep. You are in your own bed. The date stamp is last Tuesday, 2:14am — the night she told you she was at her aunt\'s, four hours away, and sent a photo of a dog to prove it.',
    keep: 'Save it. Back it up twice.', drop: 'Delete it, and call the pit in your stomach something else.',
    desc: 'You, asleep, from two feet away, at 2:14am.',
    reread: 'You open it again and this time you look past yourself, at the corner of the frame, where there is a chair that does not live in that corner. Somebody moved it there to sit down.' }
];

var ALLY = [
  { id: 'a_dez', name: 'Dez',
    plant: 'Dez has been staring at the same titration for eleven minutes and their hands are shaking. Nobody else has noticed, because nobody else is looking. It is not your lab and it is not your problem.',
    help: 'Sit down beside them and redo it from the start, out loud, slowly.',
    skip: 'Not your lab. Not your problem.',
    note: function (lv) { return lv >= 3 ? 'Dez would burn the building down for you and you have never once asked them to.' : lv >= 2 ? 'Dez saves you a seat now, without making it a thing.' : 'Dez knows your name and means it.'; } },
  { id: 'a_rhea', name: 'Rhea',
    plant: 'Rhea gets cut from the squad if she misses another practice, and she is going to miss it, because her little brother has nobody else to pick him up. She has not asked you. She would not.',
    help: 'Tell her you\'ll cover it. Don\'t make her say thank you.',
    skip: 'Say nothing. She\'ll work it out.',
    note: function (lv) { return lv >= 3 ? 'Rhea has decided, privately, that she owes you something enormous.' : lv >= 2 ? 'Rhea texts you terrible photos of her brother now.' : 'Rhea nods at you in the hall.'; } },
  { id: 'a_ollie', name: 'Ollie',
    plant: 'Three seniors have Ollie backed against the vending machine, doing the thing where it looks like a conversation. Ollie is fifteen and is trying very hard to look like he is in on it.',
    help: 'Walk over. Say his name like you\'ve been looking for him all lunch.',
    skip: 'Keep walking. It\'ll blow over.',
    note: function (lv) { return lv >= 3 ? 'Ollie would follow you into a burning building and you would have to physically stop him.' : lv >= 2 ? 'Ollie finds you most lunchtimes now, which you pretend to mind.' : 'Ollie says hi. Every time. Without fail.'; } },
  { id: 'a_vance', name: 'Mr Vance',
    plant: 'Mr Vance keeps you back after the bell for no reason you can see, asks how you are, and then waits. Actually waits. Longer than adults usually do.',
    help: 'Tell him the truth. Not all of it. Some of it.',
    skip: 'Say you\'re fine and leave. You are fine.',
    note: function (lv) { return lv >= 3 ? 'Mr Vance has your number in his phone under your first name and has told you to use it.' : lv >= 2 ? 'Mr Vance leaves his door open at lunch and you both pretend that is a coincidence.' : 'Mr Vance is paying attention.'; } }
];

var EXIT = [
  { id: 'e_firedoor', name: 'The propped fire door',
    plant: 'Two kids you barely know have propped the east fire door with a flattened can so they can smoke and get back in. They leave. The can stays. It is the sort of thing that gets noticed in about a week.',
    take: 'Move the can somewhere it won\'t get swept up.', skip: 'Kick the can out and let the door shut.',
    use: 'the east fire door', place: 'the east stairwell',
    desc: 'A fire door that shuts but does not lock.' },
  { id: 'e_supplykey', name: 'The supply key',
    plant: 'You get sent to the supply cupboard with the little brass key, and the teacher who gave it to you is already talking to somebody else by the time you get back.',
    take: 'Keep the key. Nobody will ask.', skip: 'Put it back on the hook where it belongs.',
    use: 'the supply cupboard and the service stair behind it', place: 'the supply corridor',
    desc: 'A small brass key nobody has asked about.' },
  { id: 'e_latch', name: 'The broken latch',
    plant: 'The art room window has a latch that does not seat. You notice because the draught has been moving the paper on your desk all lesson. There is a form for this. It is in the office.',
    take: 'Check it properly. Learn how it opens from outside.', skip: 'Mention it to somebody. Eventually. Probably.',
    use: 'the art room window', place: 'the art room',
    desc: 'A window that opens from the wrong side.' },
  { id: 'e_schedule', name: 'The caretaker\'s round',
    plant: 'You hear the caretaker on the phone in the corridor, complaining about his rounds. Thursday and Friday he does the science block last, at nine, and props everything open behind him while he does it.',
    take: 'File it away. Nine o\'clock. Science block.', skip: 'It is nothing to do with you.',
    use: 'the science block, still open at nine', place: 'the science block',
    desc: 'Nine o\'clock, science block, every door propped.' }
];

var TOOL = [
  { id: 't_stand', item: 'A lab stand',
    plant: 'The retort stand on your bench has a bent foot and wobbles all lesson, and at the end of it the technician tells you to leave it out for repair instead of racking it.\n\nIt is about as long as your forearm and heavier than anything that shape has a right to be. You put it by the door because you were told to.',
    keep: 'Stand it behind the door where the technician won\'t trip on it.',
    drop: 'Rack it anyway. It\'s not your job to leave junk lying about.',
    desc: 'Cast iron on a bent foot. Heavier than it looks.',
    where: 'behind the door where you left it' },
  { id: 't_extinguisher', item: 'The unbracketed extinguisher',
    plant: 'Somebody has taken the fire extinguisher off its bracket to prop a door open and has not put it back. It sits on the floor under the notice that says this must not be obstructed.\n\nYou are the only person in the corridor who has looked at it in a week.',
    keep: 'Stand it upright inside the doorway, out of the walkway.',
    drop: 'Put it back on its bracket. Somebody should.',
    desc: 'Nine kilos of red steel, off its bracket, on the floor.',
    where: 'standing inside the doorway' },
  { id: 't_trophy', item: 'The cabinet trophy',
    plant: 'The trophy cabinet has been open since Tuesday because the lock is broken, and the big one from 1994 has been moved to the front where it catches everybody\'s coat.\n\nYou take it down and put it somewhere it will stop assaulting people. Nobody sees you do it and nobody will move it back.',
    keep: 'Put it on the low shelf where nothing catches on it.',
    drop: 'Leave it. Somebody is paid to worry about the cabinet.',
    desc: 'A great deal of 1994 in plated brass.',
    where: 'on the low shelf where you put it' }
];

api.buildPools = function (seed) {
  var r = G.rngFrom(seed);
  return {
    proof: G.pick(r, PROOF),
    ally: G.pick(r, ALLY),
    exit: G.pick(r, EXIT),
    tool: G.pick(r, TOOL),
    wake: Math.floor(r() * 3),
    companion: Math.floor(r() * 3),
    hazard: Math.floor(r() * 3)
  };
};

api.BONDNAMES = api.BONDNAMES || {};
ALLY.forEach(function (a) { api.BONDNAMES[a.id] = { name: a.name, note: a.note }; });
api.BONDNAMES.ren = { name: 'Ren', note: function (l) { return l >= 3 ? 'Ren has started planning things that are weeks away and putting you in them.' : 'Ren is easy to be around, which is the entire problem.'; } };

/* ---------- items ---------- */

I.proof = { name: 'Proof', uses: 1, desc: 'Proof.', use: function () { return { toast: 'Not here. This is for somebody who can do something about it.' }; } };
I.exitkey = { name: 'The way out', uses: 1, desc: 'A way out of this building that nobody has written down.', use: function () { return { toast: 'You keep it where your hand can find it in the dark.' }; } };
I.tool = { name: 'A heavy thing', uses: 1, desc: 'A heavy thing.', use: function () { return { toast: 'Not for anything you would admit to. Not yet.' }; } };

api.applyPools = function (st) {
  if (!st || !st.pools) return;
  I.proof.name = st.pools.proof.item; I.proof.desc = st.pools.proof.desc;
  I.exitkey.name = st.pools.exit.name; I.exitkey.desc = st.pools.exit.desc;
  I.tool.name = st.pools.tool.item; I.tool.desc = st.pools.tool.desc;
};

/* ---------- helpers ---------- */

function P(st) { return st.pools; }
function dev(st, n) { st.devotion += n; }
function jel(st, n) { st.jealousy = (st.jealousy || 0) + n; }

/* the three quiet facts */
function conviction(st) { return !!st.flags.sure; }
function ground(st) { return !!st.flags.ground; }
function means(st) { return !!st.flags.tool; }
function ready(st) { return conviction(st) && ground(st) && means(st); }

function resolveLabels(id) {
  var sc = S[id], old = sc.onEnter;
  sc.onEnter = function (st) {
    if (old) old(st);
    (sc.choices || []).forEach(function (c) {
      if (typeof c.t === 'function') { c._fn = c._fn || c.t; c.t = c._fn(st); }
      else if (c._fn) c.t = c._fn(st);
    });
  };
}

/* ================================================================== */
/* MONDAY                                                              */

S.school_d1_a = {
  chapter: 'Monday', art: 'mira',
  quote: 'She got your coffee order wrong on purpose. She has been getting it wrong on purpose since September.',
  onEnter: function (st) {
    if (!st.pools) st.pools = api.buildPools(st.seed);
    api.applyPools(st);
    if (st.jealousy === undefined) st.jealousy = 0;
  },
  text: 'There is a seat saved for you. There is always a seat saved for you now — third row, by the window, with a bag on it that gets lifted off about half a second before you get there.\n\n' +
    '[[Mira]] does not make a thing of it. That is the whole trick of her. {You\'re late, $NAME,} she says. {I told her you were in the toilets.} And she slides the bag onto the floor and carries on drawing something small and awful in the corner of her notes.\n\n' +
    'She got your coffee order wrong again. On purpose. She has been getting it wrong on purpose since September, because the first time she did it you laughed so hard you got told off, and she has decided that is a thing worth doing forever.',
  choices: [
    { t: 'Take the seat. Tell her the coffee is a war crime.', do: function (st) { dev(st, 2); }, to: 'school_d1_ren' },
    { t: 'Take the seat. Say thanks. Get your book out.', to: 'school_d1_ren' },
    { t: 'Sit somewhere else. You don\'t owe anyone a seat.', do: function (st) { dev(st, -2); st.flags.cold = true; }, to: 'school_d1_ren' }
  ]
};

S.school_d1_ren = {
  chapter: 'Monday — second period', art: 'ren',
  quote: 'That is all it is. A noise in a silent room.',
  text: 'The new one is called Ren.\n\nRen transferred in at the start of term and has spent six weeks being pleasantly unremarkable, and then this morning says something so dry about the seating plan that you make a noise in a silent room and have to pretend it was a cough.\n\nThat is all it is. A noise in a silent room.\n\nAt lunch [[Mira]] asks, lightly, who Ren is. You have not mentioned Ren. You are fairly sure nobody has mentioned Ren.\n\n{I\'m not being weird,} she says, and laughs at herself. And she is not being weird, and you both move on.',
  choices: [
    { t: 'Find Ren after class. Say the thing back.', do: function (st) { G.bond('ren', 1); jel(st, 2); }, to: 'school_d1_b' },
    { t: 'Leave it. It was one joke in one lesson.', do: function (st) { st.passive++; }, to: 'school_d1_b' },
    { t: 'Tell Mira about Ren yourself, before she asks again.', do: function (st) { dev(st, 1); jel(st, 1); st.flags.told = true; }, to: 'school_d1_b' }
  ]
};

S.school_d1_b = {
  chapter: 'Monday — after last bell',
  text: function (st) { return P(st).exit.plant; },
  choices: [
    { t: function (st) { return P(st).exit.take; }, to: 'school_d2_a',
      do: function (st) { st.flags.exit = true; G.addItem('exitkey'); } },
    { t: function (st) { return P(st).exit.skip; }, to: 'school_d2_a', do: function (st) { st.passive++; } },
    { t: 'Go home. It\'s Monday. You\'re tired.', to: 'school_d2_a', do: function (st) { st.passive++; } }
  ]
};
resolveLabels('school_d1_b');

/* ================================================================== */
/* TUESDAY                                                             */

S.school_d2_a = {
  chapter: 'Tuesday', art: 'ally',
  text: function (st) { return P(st).ally.plant; },
  choices: [
    { t: function (st) { return P(st).ally.help; }, to: 'school_d2_b',
      do: function (st) { G.bond(P(st).ally.id, 1); } },
    { t: function (st) { return P(st).ally.skip; }, to: 'school_d2_b', do: function (st) { st.passive++; } }
  ]
};
resolveLabels('school_d2_a');

S.school_d2_b = {
  chapter: 'Tuesday — lunch', art: 'mira',
  text: '[[Mira]] eats the crusts first. She says it is so the good part is last, which is either the most optimistic thing you have ever heard or a small controlled act of violence, and with her it is genuinely hard to tell.\n\n' +
    'She is funny today. Properly funny — the kind where you cannot breathe and a teacher looks over. Her impression of the vice-principal is so accurate it feels illegal.\n\n' +
    'Somebody at the next table asks her, in the bored way people ask, whether she has a type.\n\n' +
    '{No,} she says, without looking up. {I don\'t do types. I do people.} And then, to you, in exactly the same voice: {That\'s why it was never going to be anybody else, $NAME.}\n\n' +
    'Her phone lights up face-down on the table. She turns it further over without looking at it, mid-sentence, and the sentence does not change at all.',
  choices: [
    { t: 'Ask who that was.', do: function (st) { st.noticed++; }, to: 'school_d3_a' },
    { t: 'Let her finish the impression. It is a very good impression.', do: function (st) { dev(st, 2); }, to: 'school_d3_a' },
    { t: 'Say you\'ve got to go, and go.', do: function (st) { dev(st, -2); }, to: 'school_d3_a' }
  ]
};

/* ================================================================== */
/* WEDNESDAY                                                           */

S.school_d3_a = {
  chapter: 'Wednesday',
  text: 'You are two minutes into a conversation about nothing when [[Mira]] says, offhand, {you should take the other stairs after fifth, $NAME, the ones by the gym. It\'s quicker.}\n\nIt is quicker. You worked that out yourself last week and you have never said it to a living soul.\n\nShe is already talking about something else. She does not appear to think she has done anything.',
  choices: [
    { t: 'Ask how she knows which way you walk.', do: function (st) { st.noticed++; st.flags.asked = true; }, to: 'school_d3_tool' },
    { t: 'Laugh. It\'s a school. Everyone knows everything.', do: function (st) { st.passive++; }, to: 'school_d3_tool' }
  ]
};

S.school_d3_tool = {
  chapter: 'Wednesday — last lesson',
  text: function (st) { return P(st).tool.plant; },
  choices: [
    { t: function (st) { return P(st).tool.keep; }, to: 'school_d3_b',
      do: function (st) { st.flags.tool = true; G.addItem('tool'); } },
    { t: function (st) { return P(st).tool.drop; }, to: 'school_d3_b', do: function (st) { st.passive++; } }
  ]
};
resolveLabels('school_d3_tool');

S.school_d3_b = {
  chapter: 'Wednesday — free period',
  text: function (st) { return P(st).proof.plant; },
  choices: [
    { t: function (st) { return P(st).proof.keep; }, to: 'school_d4_a',
      do: function (st) { st.flags.proof = true; G.addItem('proof'); st.noticed++; } },
    { t: function (st) { return P(st).proof.drop; }, to: 'school_d4_a', do: function (st) { st.passive++; } }
  ]
};
resolveLabels('school_d3_b');

/* ================================================================== */
/* THURSDAY                                                            */

S.school_d4_a = {
  chapter: 'Thursday', art: 'mira',
  quote: 'None of this excuses anything. It is not going to. But it is Thursday, and she is sixteen, and she is sitting right there.',
  text: '[[Mira]] is not herself today and will not say why.\n\nShe is in yesterday\'s shirt. She laughs half a beat after everybody else, like she is listening from another room. At one point she looks at the classroom door for a long time for no reason at all.\n\nThere is a photo on her lock screen you have never asked about — an older woman, a kitchen, a birthday cake with nobody behind it — and today, when the screen lights up, she puts her thumb over the woman\'s face without seeming to know she is doing it.\n\nNone of this excuses anything. It is not going to. But it is Thursday, and she is sixteen, and she is sitting right there.',
  choices: [
    { t: 'Ask if she\'s okay. Mean it.', do: function (st) { dev(st, 3); st.flags.kindday = true; }, to: 'school_d4_ren' },
    { t: 'Don\'t ask. Just stay next to her all lunch.', do: function (st) { dev(st, 2); }, to: 'school_d4_ren' },
    { t: 'Use the day. Sit with Ren while she isn\'t watching.', do: function (st) { dev(st, -3); jel(st, 3); G.bond('ren', 1); }, to: 'school_d4_ren' }
  ]
};

S.school_d4_ren = {
  chapter: 'Thursday — after school',
  text: function (st) {
    var j = st.jealousy || 0;
    if (G.bondLevel('ren') > 0) {
      return 'Ren waits at the gate, which is not Ren\'s way home, and you both walk the long way and neither of you says that is what is happening.\n\n' +
        'It is the easiest forty minutes of your week. That is all it is and it is enormous.\n\n' +
        (j >= 3
          ? 'At the corner Ren stops and says, carefully, {is your friend all right? She\'s been outside my last two lessons. Not in them. Outside them.}\n\nYou say something reassuring. It is Thursday, so you still believe it.'
          : 'When you split at the roundabout you both do the thing where you keep saying one more thing instead of leaving.');
    }
    return 'You go home on your own, which is fine.\n\nRen passes you at the gate and says something dry about the weather and you get the joke a full four seconds too late, by which time Ren is gone and the moment is a thing that did not happen.\n\n[[Mira]] texts you at nine. And at half nine. And at ten, to say she is going to bed, and at ten past ten to say she cannot sleep.';
  },
  choices: [
    { t: 'Tell Ren something true about yourself.', if: function (st) { return G.bondLevel('ren') > 0; },
      do: function (st) { G.bond('ren', 2); jel(st, 2); }, to: 'school_d4_b' },
    { t: 'Keep it light. Make them laugh. Go home on time.', if: function (st) { return G.bondLevel('ren') > 0; },
      do: function (st) { G.bond('ren', 1); jel(st, 1); }, to: 'school_d4_b' },
    { t: 'Go home.', if: function (st) { return G.bondLevel('ren') === 0; }, do: function (st) { st.passive++; }, to: 'school_d4_b' }
  ]
};

S.school_d4_b = {
  chapter: 'Thursday — night', art: 'ally',
  text: function (st) {
    var a = P(st).ally;
    if (G.bondLevel(a.id) > 0) {
      return a.name + ' messages you at eleven about nothing — a photo, a complaint, a question that could have waited until morning.\n\n' +
        'You talk for an hour about things that have nothing to do with [[Mira]]. That is not a tactic. It is just what happens, because ' + a.name + ' is a person and not a chess piece.\n\n' +
        'It should be obvious that this matters. It will not be. Not until tomorrow night.';
    }
    return 'Nobody messages you.\n\nThat is not a tragedy. That is most nights for most people. It is only worth saying because of what tomorrow night is going to ask for, and because tonight you still have time to do something about it, and you are going to spend it scrolling.';
  },
  choices: [
    { t: function (st) { return 'Tell ' + P(st).ally.name + ' something you haven\'t told anyone.'; },
      if: function (st) { return G.bondLevel(P(st).ally.id) > 0; },
      do: function (st) { G.bond(P(st).ally.id, 2); }, to: 'school_d5_a' },
    { t: 'Keep it light and go to sleep.', if: function (st) { return G.bondLevel(P(st).ally.id) > 0; },
      do: function (st) { G.bond(P(st).ally.id, 1); }, to: 'school_d5_a' },
    { t: 'Sleep badly.', if: function (st) { return G.bondLevel(P(st).ally.id) === 0; }, do: function (st) { st.passive++; }, to: 'school_d5_a' }
  ]
};
resolveLabels('school_d4_b');

/* ================================================================== */
/* FRIDAY                                                              */

S.school_d5_a = {
  chapter: 'Friday', art: 'mira',
  text: function (st) {
    var j = st.jealousy || 0;
    if (j >= 5) {
      return 'It tips today, and it does not tip towards you.\n\nRen is not in first period. Ren is not in third. At lunch somebody says Ren went home, and somebody else says Ren was crying in the stairwell, and a third person says it was about a message, and nobody can tell you what the message said.\n\n[[Mira]] is beautifully, uncomplicatedly kind about it all day. She says it is awful. She says Ren seemed nice. She says, at one point, with no weight on it at all:\n\n{People leave, $NAME. That\'s the thing about people. I don\'t.}';
    }
    if (st.devotion >= 4) {
      return 'It tips today, and it does not feel like tipping. It feels like being loved very hard.\n\n[[Mira]] has your timetable memorised, which you knew. Today she has the new one — the one they only handed out this morning — and she has annotated it. She knows about the dentist on the 14th. She has a plan for it.\n\n{I just don\'t want you to have to think about anything,} she says, and she means it so completely that arguing feels like kicking something.\n\nAt the end of the day she asks you to stay behind. She has already worked out which room.';
    }
    if (st.devotion <= -4) {
      return 'It tips today, and it looks like weather.\n\nThe rumour going round about you is small and specific and impossible to disprove, and it is in the exact shape of the thing that makes people stop sitting near you. By fourth period two people have moved desks.\n\n[[Mira]] does not gloat. She does something far worse: she is kind about it. She finds you at the end of the day and says, quietly, sadly, {I told you they\'d be like this, $NAME. It\'s only ever going to be me.}\n\nShe is not threatening you. She is grieving, in advance, and she has decided what to do about it.';
    }
    return 'It tips today, and you cannot point at the moment.\n\nYou have been careful. Not warm, not cold, nothing she could hold. It turns out that a person who has decided about you does not need you to hand them anything.\n\n{You\'ve been weird with me,} [[Mira]] says — not angry. Diagnosing. {It\'s okay. I know it\'s not you.}\n\nShe has worked out whose fault it is instead. She is wrong. It does not matter at all that she is wrong.';
  },
  to: 'school_d5_b'
};

S.school_d5_b = {
  chapter: 'Friday — the last quiet hour',
  quote: 'Whatever you do with it, you will have done before you understood what it was for.',
  onEnter: function (st) { G.checkpoint('Friday, the last quiet hour'); },
  text: 'Everybody goes home. The building does the thing buildings do when they empty, where the whole size of it arrives at once.\n\nYou have about an hour. Nobody is going to tell you that. There is no music cue and there is no list.\n\nWhatever you do with it, you will have done before you understood what it was for.',
  choices: [
    { t: 'Walk the building. Learn the doors, and pick the room you would rather be in.',
      if: function (st) { return st.flags.exit && !st.flags.ground; },
      do: function (st) { st.flags.ground = true; }, to: 'school_d5_c' },
    { t: 'Sit down somewhere quiet and go through what you kept, properly, from the start.',
      if: function (st) { return st.flags.proof && !st.flags.sure; },
      do: function (st) { st.flags.sure = true; }, to: 'school_d5_proof' },
    { t: function (st) { return 'Text ' + P(st).ally.name + '. Tell them where you are.'; },
      if: function (st) { return G.bondLevel(P(st).ally.id) >= 2 && !st.flags.called; },
      do: function (st) { st.flags.called = true; G.bond(P(st).ally.id, 1); }, to: 'school_d5_c' },
    { t: 'Go to the library and do your homework like a normal person.', do: function (st) { st.passive++; }, to: 'school_d6' }
  ]
};
resolveLabels('school_d5_b');

S.school_d5_proof = {
  chapter: 'Friday — the last quiet hour',
  text: function (st) { return P(st).proof.reread + '\n\nYou sit with that for a while.\n\nSomething goes quiet in you that has been loud since Monday. It is not courage. It is the end of the argument you have been having with yourself about whether you are being unfair to her.'; },
  to: 'school_d5_c'
};

S.school_d5_c = {
  chapter: 'Friday — the last quiet hour',
  text: 'There is time for one more thing, and then there is not.',
  choices: [
    { t: 'Walk the building. Learn the doors, and pick the room you would rather be in.',
      if: function (st) { return st.flags.exit && !st.flags.ground; },
      do: function (st) { st.flags.ground = true; }, to: 'school_d6' },
    { t: 'Go through what you kept, properly, from the start.',
      if: function (st) { return st.flags.proof && !st.flags.sure; },
      do: function (st) { st.flags.sure = true; }, to: 'school_d5_proof2' },
    { t: function (st) { return 'Text ' + P(st).ally.name + '. Tell them where you are.'; },
      if: function (st) { return G.bondLevel(P(st).ally.id) >= 2 && !st.flags.called; },
      do: function (st) { st.flags.called = true; G.bond(P(st).ally.id, 1); }, to: 'school_d6' },
    { t: 'Stop. Sit in the dark for a bit.', to: 'school_d6', do: function (st) { st.passive++; } }
  ]
};
resolveLabels('school_d5_c');

S.school_d5_proof2 = {
  chapter: 'Friday — the last quiet hour',
  text: function (st) { return P(st).proof.reread; },
  to: 'school_d6'
};

/* ================================================================== */
/* THE NIGHT                                                           */

S.school_d6 = {
  redirect: function (st) {
    if (st.passive >= 7) return 'ending_detention_scene';
    if ((st.jealousy || 0) >= 5) return 'lb_j1';
    return st.devotion >= 0 ? 'lb_h1' : 'lb_l1';
  }
};

S.ending_detention_scene = { ending: 'detention' };

S.lb_j1 = {
  chapter: 'Friday night — the stairwell', art: 'mira',
  onEnter: function (st) { st.flags.jealousNight = true; },
  text: 'She is in the east stairwell and she is not waiting for you. You can hear that before you can see it — the specific arrhythmia of somebody talking to a person who is not answering in full sentences.\n\nRen is on the landing. Ren\'s phone is on the step below, face up, screen cracked in a way it was not cracked at lunch.\n\n{I\'m not doing anything,} [[Mira]] says, to you, over her shoulder, perfectly evenly. {I\'m having a conversation. You\'re allowed to have a conversation with somebody, $NAME.}',
  choices: [
    { t: 'Get Ren out. Put yourself in the middle of it.', to: 'lb_j2',
      do: function (st) { st.flags.shielded = true; G.bond('ren', 1); },
      peek: 'It costs the whole of the rest of tonight. It buys somebody else all of theirs.' },
    { t: 'Say her name. Make this about you again.', to: 'lb_j2', do: function (st) { dev(st, 2); },
      peek: 'It works. That is the frightening part.' },
    { t: 'Back out of the stairwell and call somebody.', to: 'lb_j_wrong',
      peek: 'Heavy. Nobody is in this building.' }
  ]
};

S.lb_j_wrong = {
  chapter: 'Friday night',
  onEnter: function (st) { st.flags.renGone = true; },
  text: 'You back out and get your phone up and it takes eleven seconds to find the number and put it to your ear, and the building is very good at swallowing eleven seconds.\n\nBy the time anything rings, the stairwell is quiet, and quiet is much worse than the noise was.',
  to: 'lb_final'
};

S.lb_j2 = {
  chapter: 'Friday night — the stairwell',
  text: 'Ren gets out. You should let yourself have that one.\n\nWhat also happens is that the stairwell door shuts behind Ren and does not open again, and now it is the two of you in a concrete box with eight floors of nothing above you.\n\n[[Mira]] is not angry. She looks, if anything, relieved.\n\n{Good,} she says. {That\'s better. That\'s just us again.}',
  to: 'lb_final'
};

S.lb_h1 = {
  chapter: 'Friday night — the east corridor', art: 'mira',
  text: 'She is waiting by the lockers with two coffees, and yours is wrong on purpose, and for one second the whole week folds up small enough to fit in a pocket.\n\n{Don\'t be weird, $NAME,} [[Mira]] says. {I just wanted to actually talk. Ten minutes.}\n\nBehind her, down the east corridor, the fire door clunks. Not open — shut, and then the second sound, the one a door makes when somebody puts something through the handle from the other side.\n\nShe does not look round at it. She is looking at you, and she is smiling, and she is waiting to see what you decide you heard.',
  choices: [
    { t: 'Say you heard it. Ask her what it was.', to: 'lb_h2', do: function (st) { st.flags.named = true; },
      peek: 'It costs the pretending. Both of you.' },
    { t: 'Smile. Say ten minutes. Buy the time.', to: 'lb_h2_soft',
      peek: 'It costs the ten minutes, and the ten after that.' },
    { t: 'Tell her you love her.', to: 'lb_confess',
      peek: 'It costs every margin you had left.' },
    { t: 'Run. Now. Mid-sentence.', to: 'lb_run', peek: 'Everything, unless you already know where you are running.' }
  ]
};

S.lb_h2_soft = {
  chapter: 'Friday night',
  text: 'Ten minutes is not a length of time. It is a room you agree to stand in.\n\nShe talks. She is lovely. She does the vice-principal again and you laugh, actually laugh, and hate yourself slightly for it.\n\nAt some point you notice the corridor lights have gone off in sections behind her, the way they do on a timer, except the timer is half nine and it is not half nine.\n\n{You\'re not listening,} she says, and the fondness in it does not move at all.',
  to: 'lb_h2'
};

S.lb_h2 = {
  chapter: 'Friday night — the science block',
  text: 'She is between you and the way you came in. That happened slowly enough that there was never a moment to object to it.\n\n{You\'re doing the face,} [[Mira]] says. {The one where you\'re about to be reasonable at me.}\n\nShe is right. You were. Every instinct you have says talk her down, agree with her, be gentle, wait for the right moment.\n\nThere is no right moment. There was one, on Wednesday, and you have already spent it.',
  choices: [
    { t: 'Be gentle. Agree with everything. Wait for an opening.', to: 'lb_die_reasonable',
      peek: 'Heavy. The kind that does not come back.' },
    { t: 'Tell her you know. Say the thing you found, out loud.', if: function (st) { return st.flags.proof; },
      do: function (st) { st.flags.said = true; }, to: 'lb_final', peek: 'Sharp, and survivable.' },
    { t: 'Stop talking entirely and start moving.', to: 'lb_final', peek: 'Costly, but it is movement.' }
  ]
};

S.lb_confess = {
  chapter: 'Friday night', art: 'mira',
  onEnter: function (st) { st.flags.promised = true; dev(st, 6); },
  text: 'You say it.\n\nAnd it works — that is the thing nobody warns you about. It works immediately and completely. Whatever was gathering in her face puts itself away. She lets out a breath she has been holding since September.\n\n{Okay,} [[Mira]] says. {Okay. Okay.} And she laughs, wetly, and wipes her face with the back of her wrist like a child, and for about four seconds you are standing in a corridor with a girl who is simply, enormously happy.\n\nThen she says: {Say it again.}\n\nAnd you understand what you have done. You have not de-escalated anything. You have handed her a thing she is now going to check. Every sentence out of your mouth for the rest of tonight will be measured against the one you just said, and she has spent six days learning exactly what you sound like when you mean something.\n\nThere is no margin left. There was one. You spent it on the kindest available lie.',
  to: 'lb_final'
};

S.lb_l1 = {
  chapter: 'Friday night — the alarm',
  text: 'The fire alarm goes at twenty past six, which is a stupid time for a fire alarm, and the four people left in the building do what people do, which is leave.\n\nYou get as far as the front doors. There is a crowd of nobody — a caretaker, two kids from the year below, somebody\'s dad idling at the kerb — and every one of them has been told something about you this week.\n\nThe caretaker looks at you, and then very deliberately does not look at you, and pulls the door to.',
  choices: [
    { t: 'Bang on the glass. Make a scene. Scenes have witnesses.', to: 'lb_l2', peek: 'Loud, and it buys almost nothing. Almost.' },
    { t: 'Go back inside and wait for an adult to handle it.', to: 'lb_die_wait', peek: 'Heavy. Very heavy.' },
    { t: 'Turn around and go the other way while the alarm still covers you.', to: 'lb_l2',
      do: function (st) { st.flags.moved = true; }, peek: 'Cheap. Take it.' }
  ]
};

S.lb_l2 = {
  chapter: 'Friday night — the empty building',
  text: 'The alarm stops. That is worse.\n\nYou are alone in a building that has spent all week quietly agreeing to be somewhere you have no friends. It is not a conspiracy. It is four or five small lies and a rumour. They cost her nothing and they cost you the only thing you needed.\n\nTwo corridors over, a door opens and does not close.\n\n{I\'m not angry, $NAME,} [[Mira]] calls, and she isn\'t. {I just think you should know what it\'s like. One night. Then it\'ll only be me.}',
  choices: [
    { t: 'Answer her. Keep her talking so you know where she is.', to: 'lb_final', peek: 'Costly. Worth it.' },
    { t: 'Stay completely still. Give her nothing.', to: 'lb_die_still', peek: 'Heavy. It ends here.' },
    { t: 'Move, quietly, towards the part of the building you know best.', to: 'lb_final', peek: 'Cheap. Take it.' }
  ]
};

['lb_die_reasonable', 'lb_die_wait', 'lb_die_still'].forEach(function (id) {
  S[id] = {
    chapter: 'Friday night',
    text: {
      lb_die_reasonable: 'You are so reasonable.\n\nYou agree with her about the unfairness of teachers and the stupidity of rumours and the fact that nobody has ever really listened to her, and all of it is true, and she nods along, and she is so relieved, and she is so close.\n\nThe last thing you think is that you nearly had her.\n\nYou did not nearly have her. There was never a version of tonight where talking worked. You only wanted there to be.',
      lb_die_wait: 'You go back inside and sit in the foyer under the bright lights where anybody can see you, because that is what you do, because somebody taught you that the system is a thing that arrives.\n\nIt does arrive. On Monday.\n\nBy then this part is over.',
      lb_die_still: 'You hold your breath behind a door for four minutes and you do it beautifully.\n\nShe does not find you by listening. She finds you because there are only so many doors, and she is not in a hurry, and she has all night, and nobody is coming.'
    }[id],
    to: 'to_below'
  };
});

S.lb_run = { redirect: function (st) { return st.flags.exit ? 'lb_final' : 'lb_die_run'; } };
S.lb_die_run = {
  chapter: 'Friday night',
  text: 'You run brilliantly.\n\nYou run down the east corridor and through the double doors and into the yard and up against a gate that has been locked since half five, the way it is locked every single day of the year, the way you would have known if you had ever once this week looked at a door and thought about it.\n\nRunning is not a plan. It is the thing you do instead of having one.',
  to: 'to_below'
};

/* ================================================================== */
/* THE LAST BELL                                                       */

S.lb_final = {
  chapter: 'Friday night — the last bell', art: 'mira',
  quote: 'The worst thing in the world is how much it still sounds like a good thing.',
  onEnter: function (st) { G.checkpoint('Friday night'); },
  text: function (st) {
    var lines = [];
    if (ready(st)) {
      lines.push('Here is what you have, and nobody has ever told you that you needed any of it.');
      lines.push('You are certain. Not frightened-certain — the other kind, the kind that stopped arguing with itself an hour ago in an empty room.');
      lines.push('You are standing in ' + P(st).exit.place + ', and you are standing in it on purpose, because you walked this building while it was still light and decided where you would rather this happened.');
      lines.push('And there is a heavy thing ' + P(st).tool.where + ', which you put there on Wednesday for a reason that had nothing whatsoever to do with tonight.');
    } else {
      lines.push('Here is what you have.');
      lines.push('A week of being liked by somebody. A lot of small moments you let go past. And the specific feeling of standing in a corridor with nothing in your hands.');
    }
    lines.push('She comes round the corner. She is not hurrying. She says your name the way she says it at lunch, and the worst thing in the world is how much it still sounds like a good thing.');
    return lines.join('\n\n');
  },
  choices: [
    { t: 'Don\'t move. Let her come the whole way.', if: ready, to: 'lb_kill1',
      peek: 'Nothing, yet. Everything, in about nine seconds.' },
    { t: function (st) { return 'Go for ' + P(st).exit.use + '.'; },
      if: function (st) { return st.flags.exit; }, to: 'lb_out',
      peek: 'Cheap. It gets you outside. Outside is not the same as away.' },
    { t: 'Try to get past her to the front doors.', to: 'lb_die_front', peek: 'Heavy.' },
    { t: 'Tell her whatever she needs to hear.', to: 'lb_hers_check',
      peek: 'Something other than dying. Not better.' },
    { t: 'Stand your ground and shout for help.', to: 'lb_die_shout', peek: 'Heavy. Nobody is in this building.' }
  ]
};
resolveLabels('lb_final');

S.lb_die_front = { chapter: 'Friday night', text: 'The front doors are forty metres away and she is twelve.\n\nYou have known that for the whole conversation. You went anyway, because the front doors are how you leave this building, because that is what you have been taught a door is.', to: 'to_below' };
S.lb_die_shout = { chapter: 'Friday night', text: 'You shout.\n\nYour voice does the thing voices do in an empty building, which is come back to you slightly wrong and much smaller.\n\nShe waits, politely, until you have finished.', to: 'to_below' };

S.lb_hers_check = { redirect: function (st) { return (st.devotion >= 4 || st.flags.promised) ? 'ending_hers_scene' : 'lb_die_lie'; } };
S.ending_hers_scene = { ending: 'hers' };
S.lb_die_lie = {
  chapter: 'Friday night',
  text: 'You say it and she hears the shape of it, and the shape is wrong.\n\nShe has spent six days learning exactly how you sound when you mean something. That was the entire point of the six days. You were the only one of the two of you doing anything else with them.',
  to: 'to_below'
};

S.lb_out = {
  chapter: 'Friday night',
  text: 'You get to it. It opens. Cold air, wet tarmac, the sound of a road.\n\nAnd then the part nobody warns you about, which is that you have to decide what to do with the next four seconds while she is still in the building and you are not.',
  choices: [
    { t: 'Go back in. She is still a person. This can still be fixed.', to: 'lb_die_back', peek: 'Heavy. This is how people die.' },
    { t: 'Run to the road and keep running.', to: 'lb_out2', peek: 'Cheap. Not enough on its own.' },
    { t: function (st) { return 'Call ' + P(st).ally.name + '. Out loud. Where she can hear you do it.'; },
      if: function (st) { return G.bondLevel(P(st).ally.id) >= 2; }, to: 'lb_out2',
      do: function (st) { st.flags.witness = true; }, peek: 'Cheap, and it ends the night instead of pausing it.' }
  ]
};
resolveLabels('lb_out');

S.lb_die_back = {
  chapter: 'Friday night',
  text: 'You go back in, because she was crying, and because you have spent six days learning that she is a person and one day learning that she is this, and six beats one.\n\nIt is a kind thing to do. It is genuinely, unarguably a kind thing to do.\n\nThat is the part that should stay with you.',
  to: 'to_below'
};

S.lb_out2 = {
  chapter: 'Friday night',
  text: function (st) {
    if (st.flags.proof && st.flags.witness) {
      return 'You get to the road with your phone against your ear and somebody awake on the other end of it, saying your name, asking where you are, already moving.\n\nThat is not nothing. It is enough to make tonight stop.\n\nBut it is Friday, and she has a bike, and your address is in her own handwriting in a notebook you have never seen, and the thing in your bag will take six weeks to be read by anybody who can act on it.\n\nSix weeks is a long time to be somebody who got out of a building once.';
    }
    return 'You get to the road.\n\nOut of the building. Alive. Nobody on the road, nobody who knows where you are, and nothing in your hands that would make a single adult do a single thing tomorrow.\n\nShe has all night and a bike and your address in her own handwriting.\n\nGetting out was never the hard part.';
  },
  choices: [
    { t: 'Keep walking. Take the six weeks.', to: 'lb_die_alone' },
    { t: 'Turn around. Go back in and finish it.', if: function (st) { return st.flags.tool && st.flags.proof; }, to: 'lb_kill1' },
    { t: 'Decide, instead, that she does not get to be the one who ends this.', to: 'short_way' }
  ]
};

S.lb_die_alone = {
  chapter: 'Friday night',
  text: 'Six weeks is a long time.\n\nIt does not take six weeks.',
  to: 'to_below'
};

/* ================================================================== */
/* THE TWO WAYS OUT                                                    */

S.short_way = {
  chapter: 'Friday night',
  text: 'You stop in the middle of the road and understand something with complete clarity, which is not at all the same as understanding it correctly.\n\nShe has spent six days deciding what happens to you. Tonight is the last item on a list she wrote without telling you.\n\nAnd you think: not by her. Anything but by her.\n\nIt is the first decision all week that feels entirely yours, and that is the whole of its appeal, and it is a lie — because it is still hers. She only made you carry it.\n\nThe game is not going to describe this part. There is nothing in it worth describing.',
  choices: [
    { t: 'Take it. It is the only door she does not have a key to.', to: 'short_way_2' },
    { t: 'No. Not that. Not for her.', to: 'short_way_no' }
  ]
};

S.short_way_no = {
  chapter: 'Friday night',
  text: 'You stand in the road for a while with your hands on your knees.\n\nAnd then you keep walking, which is not brave and does not feel like anything, and is the correct answer, and is going to cost you a great deal.\n\nThere are six weeks between here and whatever happens next. You do not get to know, tonight, whether you used them well.',
  to: 'lb_die_alone'
};

S.short_way_2 = {
  chapter: '',
  beat: 'quiet',
  onEnter: function (st) { st.flags.shortWay = true; },
  text: 'You are seventeen for another four months.\n\nIt does not feel like winning. It was never going to. The only thing you take out of that road is the fact that she did not get to choose — and three hundred years from now, a very long way under everything, that will turn out to matter more than you could possibly have known, and a great deal less than you wanted it to.',
  contLabel: '—',
  to: 'three_hundred'
};

S.lb_kill1 = {
  chapter: 'Friday night — nine seconds', art: 'mira',
  beat: 'quiet',
  quote: 'She is saying that you do not have to be frightened. She believes that.',
  text: 'She comes the whole way.\n\nThere is a moment — short, and the only one there is going to be — where she is close enough that the thing in her hand stops being a threat and becomes a fact, and where her weight is on her front foot, and where she is still talking.\n\nShe is saying that you do not have to be frightened. She believes that. That is the horror of it, and it does not help you at all.',
  choices: [
    { t: function (st) { return 'Move first. Get to the heavy thing ' + P(st).tool.where + '.'; }, to: 'lb_kill2' },
    { t: 'Wait. Let her commit. Then move.', to: 'lb_kill2', do: function (st) { st.flags.clean = true; } },
    { t: 'Say her name.', to: 'lb_kill_fail' }
  ]
};
resolveLabels('lb_kill1');

S.lb_kill_fail = {
  chapter: 'Friday night',
  text: 'You say her name, because she is a person, and because saying somebody\'s name is what you do when you want them to stop.\n\nIt is the correct instinct. It is the one that has kept the species alive.\n\nIt costs you the nine seconds.',
  to: 'to_below'
};

S.lb_kill2 = {
  chapter: 'Friday night — nine seconds',
  text: function (st) {
    return (st.flags.clean
      ? 'You let her come, which takes everything you have, and then you are past her and behind her and it is very quick.'
      : 'You move first, and it is ugly, and it takes longer than it should, and both of you end up on the floor at least once.') +
      '\n\nThere is not much to it. That is the part that does not leave.\n\nAbout four seconds, and nothing you did not already have in your arms, and afterwards you are sitting against a wall in ' + P(st).exit.place + ' with your hands shaking too hard to hold your own phone.\n\n[[Mira]] is on the floor and she is sixteen and she ate the crusts first so the good part would be last.';
  },
  choices: [
    { t: 'Call it in. All of it. Now, from here, without moving anything.', to: 'lb_kill3',
      if: function (st) { return st.flags.proof; } },
    { t: 'Straighten it. Make it look like something else.', to: 'lb_kill_ruin' },
    { t: 'Walk out of the building and keep walking.', to: 'lb_kill_ruin' }
  ]
};

S.lb_kill_ruin = {
  chapter: 'Friday night',
  text: 'It is the wrong call and you make it for the right reason, which is that you are seventeen and terrified and there is a version of the next hour in which none of this happened.\n\nThere is not. There is a caretaker\'s log, and a fire door with your prints on the bar, and eleven minutes of you on a camera you did not know about, and a week of messages in which she was lovely to you in public.\n\nWhat the thing in your bag would have proved on Friday night, it cannot prove on Sunday. Not once you have moved things. Not once you have lied first.\n\nYou are alive. You are going to be alive for a very long time, somewhere else, being a different word than the one you were.',
  to: 'ending_whatyoudid_bad_scene'
};

S.lb_kill3 = {
  chapter: 'Friday night',
  onEnter: function (st) { st.flags.killed = true; },
  text: 'You do not move anything. You do not wash anything. You sit on the floor near her with the fire door open behind you and you tell a stranger on a phone exactly what happened, in order, badly, while it is still true in your mouth.\n\nThat is the third thing. Not the room, and not the weight in your hands — this. Certainty, early enough to still be evidence.\n\nThey are eleven minutes. You spend all eleven of them there.',
  to: 'ending_whatyoudid_scene'
};

/* ================================================================== */
/* TRANSITION                                                          */

S.to_below = {
  chapter: '',
  beat: 'loud',
  onEnter: function () { G.sfx.doom(); },
  text: 'She kills you.',
  contLabel: '—',
  to: 'to_below_after'
};

S.to_below_after = {
  chapter: '',
  beat: 'quiet',
  text: 'It is quick, and it is clumsy, and she is crying, and she says sorry a great many times.\n\nThat is the whole of it. There is no lesson in it and nothing is redeemed.\n\nThe last thing is the ceiling tiles, and the sound of the heating, and her hand on the side of your face, which is warm.',
  contLabel: '—',
  to: 'three_hundred'
};

S.three_hundred = {
  chapter: '',
  beat: 'loud',
  onEnter: function () { G.sfx.bell(); },
  text: 'THREE HUNDRED YEARS LATER',
  contLabel: 'open your eyes',
  to: 'below_wake'
};

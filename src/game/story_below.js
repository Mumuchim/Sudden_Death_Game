import { api } from './registry.js';

/* Sudden Death — arc two: the Below

   Three people walk this arc with you: Tallow, Quill and Bit. You meet
   them as people. They are told, much later and by somebody else, to be
   something else. Every one of them was told they were chosen, on an
   ordinary morning, by a warm and funny voice.

   And there is a fourth thing down here that is not an Apostle and is not
   a monster. She has done this before. She has done this a great many
   times. Her name is Mumu and she is the only honest thing in the Below.

   One rule, given in the first ten minutes: do not say out loud what he
   is. He hears it. He always hears it. */

var G = api, S = G.SCENES, I = G.ITEMS;

/* ---------------- items ---------------- */
I.lumaflies = {
  name: 'A jar of pale flies', label: 'pale flies', tag: 'light', uses: 2,
  desc: 'They are warm and they are dying and they do not mind. One jar, two good breaths of light.',
  suggest: function (st) { return st.ember <= 2; },
  use: function (st, ctx) {
    G.heal(2); G.sfx.heal();
    return ctx.combat ? { combatMsg: 'You crack the jar. Light goes into you where the hole was.' }
                      : { toast: 'Light goes into you where the hole was.' };
  }
};
I.wax = {
  name: 'A knuckle of pale wax', label: 'pale wax', tag: 'breath', uses: 3,
  desc: 'Chew it and the air comes easier for a while. It tastes like a church.',
  suggest: function (st) { return st.breath <= 2; },
  use: function (st, ctx) {
    st.breath = st.breathCap; G.drawHud(); G.sfx.heal();
    return ctx.combat ? { combatMsg: 'The air comes easier.' } : { toast: 'The air comes easier.' };
  }
};
I.nailchip = {
  name: 'A chip of old nail', label: 'nail chip', tag: 'hurts it', uses: 1,
  combatOnly: true,
  desc: 'Someone broke a weapon here a long time ago. This is the part that was doing the work.',
  suggest: function (st, where) { return where === 'combat' && G.Combat.poiseFrac() <= 0.4; },
  use: function (st, ctx) {
    if (!ctx.combat) return { refuse: 'Nothing here is worth breaking it on.' };
    G.Combat.damageFoe(2);
    return { instant: true, combatMsg: 'You put the chip through it, underhand, ugly. It folds.' };
  }
};
I.ashcoin = {
  name: 'A grey coin', label: 'grey coin', tag: 'buys a beat', uses: 1,
  combatOnly: true,
  desc: 'Mumu gave you this and did not explain it. It is warm on one side only.',
  suggest: function (st, where) { return where === 'combat' && st.ember <= 2; },
  use: function (st, ctx) {
    if (!ctx.combat) return { refuse: 'Not up here. It only does anything where something is trying to kill you.' };
    G.Combat.reel(1);
    return { instant: true, combatMsg: 'You turn the coin over. Something that was about to happen does not happen, and nobody except you notices that it did not.' };
  }
};
I.fingerbone = {
  name: 'Fingers', label: 'fingers', tag: 'the count', uses: 99, hideInline: true,
  desc: function () { return 'Five were promised. They are heavier than they look and none of them are cold.'; },
  use: function (st) { return { toast: 'You have ' + st.fingers + '. He says you need five.' }; }
};
I.palefruit = {
  name: 'A pale fruit', label: 'pale fruit', tag: 'do not', uses: 1, hideInline: true,
  desc: 'You were told not to. It smells like the inside of a peach and the outside of a grave.',
  use: function () { return { go: 'ending_breakfast_scene' }; }
};

api.BONDNAMES = api.BONDNAMES || {};
api.BONDNAMES.ap_tallow = { name: 'Tallow', note: function (l) {
  return l >= 3 ? 'Tallow has stopped filling the silences around you, which from Tallow is a declaration.'
       : l >= 1 ? 'Tallow talks at you. That is Tallow asking whether you are still there.'
       : 'Tallow is a lot, and knows it.'; } };
api.BONDNAMES.ap_quill = { name: 'Quill', note: function (l) {
  return l >= 3 ? 'Quill says things out loud before she is certain of them now. She has not done that in a very long time.'
       : l >= 1 ? 'Quill is assessing you and has not finished.'
       : 'Quill gives you exactly as much as you need and no more.'; } };
api.BONDNAMES.ap_bit = { name: 'Bit', note: function (l) {
  return l >= 3 ? 'Bit walks on your left, always, so your good hand is free. Bit has never mentioned doing it.'
       : l >= 1 ? 'Bit has explained the system to you. The whole system. Twice.'
       : 'Bit is too young for this and knows it.'; } };
api.BONDNAMES.mumu = { name: 'Mumu the Hollow', note: function (l) {
  return l >= 3 ? 'Mumu has told you the truth every single time, including the times you did not want it. She is the only one down here who has.'
       : l >= 1 ? 'Mumu watches from doorways and leaves before you get there.'
       : 'Something has been standing at the edge of every room you have been in.'; } };

/* ---------------- helpers ---------------- */
function foe(o) { return function () { return o; }; }
function nameHim(st, how) { st.flags.namedHow = how; }

/* ---------------- combat definitions ---------------- */

var quietOne = {
  art: 'husk', pattern: [0, 1, 2, 3, 0, 2, 1, 3], teach: 4, speed: 9000,
  name: 'A Quiet One, still walking',
  poise: 6,
  intro: 'It has been standing in the dark for longer than your country existed. It has your mask. A worse version of your mask.\n\nIt notices you the way a door notices weather.',
  outro: 'It comes apart into dust that is mostly cloth.\n\nThere is nothing in the mask. There was never going to be.',
  tells: [
    { t: 'Its shoulder drops and the arm draws back slow, the way you swing something heavy.', a: 'slip', heavy: true,
      clear: 'Shoulder down. Heavy. Move.',
      ok: 'You step inside the arc. It goes past like weather and you come out the other side with your lungs full.',
      bad: 'It lands across your chest and your ribs learn something new.' },
    { t: 'It snaps in close, short and fast, both hands at the height of your throat.', a: 'guard',
      clear: 'Close. Fast. Hold.',
      ok: 'You get the arm up and take it on the bone. Nothing gained. Nothing lost. Good.',
      bad: 'Short, fast, and exactly where you were not.' },
    { t: 'The light behind the mask goes out. It stops moving. It stops breathing.', a: 'strike',
      clear: 'Empty. Now.',
      ok: 'You hit it while it is nobody, and the light comes back on wrong.',
      bad: 'You wait for a thing that was already finished waiting.' },
    { t: 'It drifts back out of reach, circling, unhurried, giving you the whole room.', a: 'focus',
      clear: 'It has given you the room. Take it.',
      ok: 'You use the room. You breathe. Something in you knits.',
      bad: 'You spend the moment on the wrong thing and it is already inside your arms.' }
  ]
};

var waterThing = {
  art: 'serpent', pattern: [1, 0, 2, 3, 0, 3, 1, 2], teach: 4, speed: 8200,
  name: 'Something patient in the water',
  poise: 7,
  intro: 'It is long and it is under the surface and it has been listening to you walk for twenty minutes.\n\nWhen it comes up it does not splash. That is the part that stays with you.',
  outro: 'It sinks. The water closes over the place where it was and goes back to being water.',
  tells: [
    { t: 'It rears, gathers, and the whole length of it winds up behind the head.', a: 'slip', heavy: true,
      clear: 'It is winding up. Move.',
      ok: 'You are not there when it arrives. Your lungs thank you.',
      bad: 'It arrives.' },
    { t: 'It goes flat and skims in, low and fast, mouth first.', a: 'guard',
      clear: 'Low, fast, straight in. Hold.',
      ok: 'You brace and it breaks on you and neither of you gains a thing.',
      bad: 'Low and fast and through you.' },
    { t: 'It beaches itself hauling out of the water, ugly, overextended, stuck for half a second.', a: 'strike',
      clear: 'Stuck. Now.',
      ok: 'You put everything into the half second it gave you.',
      bad: 'You use the half second on nothing and it takes it back.' },
    { t: 'It slides away into the deep water and the surface goes smooth.', a: 'focus',
      clear: 'Gone, for now. Breathe.',
      ok: 'You get your back to a wall and your breath back in your chest. The footing here is bad. You will not be dodging anything next.',
      bad: 'The smooth water was not an invitation.' }
  ]
};

var longArmed = {
  art: 'warden', pattern: [0, 1, 2, 3, 1, 0, 2], teach: 4, speed: 7400,
  name: 'The Long-Armed',
  poise: 8,
  intro: 'It was somebody\'s idea of a guard, once, and nobody has told it that the thing it guards is gone.\n\nIts arms reach the walls on both sides of the gallery at the same time.',
  outro: 'It kneels, slowly, the way something kneels when it has been standing at a door for three hundred years and is finally allowed to stop.',
  tells: [
    { t: 'It hauls one arm across the whole width of the gallery, wall to wall, slow and total.', a: 'slip', heavy: true,
      clear: 'Wall to wall. Under it.',
      ok: 'You go under. The wall behind you takes what was meant for you.',
      bad: 'Wall to wall means wall to wall.' },
    { t: 'Both hands come in at once from either side, fast, like a book closing.', a: 'guard',
      clear: 'Both sides. Brace.',
      ok: 'You set yourself and the book closes on something that does not give.',
      bad: 'The book closes.' },
    { t: 'It overreaches. One arm is caught on the far pillar and it is stretched out flat and open.', a: 'strike',
      clear: 'Caught. Open. Now.',
      ok: 'You walk up the arm and hit the place where the arm stops being an arm.',
      bad: 'It unhooks itself while you are deciding.' },
    { t: 'It folds your striking arm in against your body and stands very tall and very still, out of range.', a: 'focus',
      clear: 'It has pinned the arm. That is the tell. Breathe.',
      ok: 'You do not go to it. You stand where you are and put yourself back together with the one arm you have.',
      bad: 'It was not as far away as it looked.' }
  ]
};

var keeper = {
  art: 'keeper', pattern: [0, 1, 2, 3, 0, 2], teach: 4, speed: 6400,
  name: 'What the seal keeps',
  poise: 10,
  intro: 'It is not a guard and it is not an animal. It is the shape three hundred years of holding makes when it finally gets to move.\n\nIt does not want anything. That is what makes it awful.',
  outro: 'It stops. Not defeated — finished, the way a sentence finishes.',
  phase: { at: 5, index: 2, a: 'slip',
    text: 'It changes. The stillness is not stillness any more — when the light goes out now, that is the wind-up, and you have half a second to unlearn everything the last four minutes taught you.' },
  tells: [
    { t: 'The whole room leans. Something enormous is being drawn back behind it.', a: 'slip', heavy: true,
      clear: 'The room is leaning. Move.',
      ok: 'You are somewhere else when the room comes back level.',
      bad: 'The room comes back level through you.' },
    { t: 'It closes the distance in one step and strikes short, precise, at the mask.', a: 'guard',
      clear: 'At the mask. Hold.',
      ok: 'You take it on your forearms and your teeth and the mask stays on.',
      bad: 'Something in the mask cracks and something behind the mask cracks with it.' },
    { t: 'The light behind it goes out and it stands perfectly still.', a: 'strike',
      clear: 'Dark and still.',
      ok: 'You hit it in the dark and the dark takes it badly.',
      bad: 'The dark was not an opening.' },
    { t: 'It withdraws to the edge of the chamber and bows its head, and the chains take its weight.', a: 'focus',
      clear: 'It has stepped back. Take the air.',
      ok: 'You take the air that is offered, because down here you take what is offered.',
      bad: 'The bow was not the end of the movement.' }
  ]
};

/* An Apostle fights like you, because the same voice taught you both. */
function apostleFoe(name, art, flavour, extra) {
  var d = {
    name: name, art: art, poise: 8, speed: 5800, teach: 4,
    pattern: [1, 0, 2, 3, 0, 1],
    intro: flavour,
    outro: 'They go down. Under the mask is a face about your age. There is always a face about your age.',
    tells: [
      { t: 'They drop the shoulder and load the back leg. You have seen this in a mirror.', a: 'slip', heavy: true,
        clear: 'Loading. Move.', ok: 'You slip it. It is like slipping yourself.', bad: 'They are better at it than you.' },
      { t: 'They come in tight and fast and do not commit — three short ones at the guard.', a: 'guard',
        clear: 'Short, tight, at the guard. Hold.', ok: 'You hold. They learn nothing. Neither do you.', bad: 'The third one is not like the first two.' },
      { t: 'They plant to swing and there is a beat in the middle of it where nothing is covered.', a: 'strike',
        clear: 'Nothing covered. Now.', ok: 'You take the beat. They make a sound that is not a monster\'s sound.', bad: 'There was no beat. You invented it.' },
      { t: 'They step back out of range, set their feet, and simply look at you.', a: 'focus',
        clear: 'They have stopped. Breathe.',
        ok: 'You breathe. So do they. Neither of you enjoys this.', bad: 'Looking at you was the attack.' }
    ]
  };
  if (extra) Object.keys(extra).forEach(function (k) { d[k] = extra[k]; });
  return d;
}

var brightOne = {
  art: 'radiance', pattern: [0, 1, 2, 3, 1, 2], teach: 4, speed: 5200,
  name: 'The Bright One',
  poise: 13,
  intro: 'She is not a monster and the game will not pretend she is.\n\nShe is enormous and she is beautiful and she has been asleep under everything you have walked on, and she did not ask to be woken, and the last thing she remembers is burning a world down because it stopped saying her name.\n\nShe looks at you. She knows exactly who sent you. You can see her decide that it does not matter, and that decision is the most frightening thing in the Below.',
  outro: 'The light goes out of her the way light goes out of a window at the end of a day.\n\nShe is not angry at the end. She says something and it is not for you, and the Below is dark and cold and yours.',
  phase: { at: 7, index: 0, a: 'guard',
    text: 'She stops circling. What was a wind-up is now a wall of light arriving all at once, and there is nowhere in this chamber to go that is not in it.',
    clearText: 'The whole chamber fills with light and there is no outside of it.' },
  tells: [
    { t: 'She draws the light back into herself and the chamber goes dim from the edges in.', a: 'slip', heavy: true,
      clear: 'She is drawing it back. Move.',
      ok: 'You are out of the line when it comes. The wall behind you is glass afterwards.',
      bad: 'You are in the line when it comes.' },
    { t: 'Threads of light come off her fast and low, a hundred of them, all at once.', a: 'guard',
      clear: 'A hundred at once. Cover.',
      ok: 'You cover everything that matters and let the rest happen.',
      bad: 'You cover the wrong everything.' },
    { t: 'She turns away from you to look at the ceiling, at the ruins of a sky, and forgets you completely.', a: 'strike',
      clear: 'She has forgotten you. Now.',
      ok: 'You go up her and it is the worst thing you have ever done and it works.',
      bad: 'She has not forgotten you. She was only being sad in front of you.' },
    { t: 'She sits back on herself, dim, almost small, and the air goes still and cold and very bright behind your eyes.', a: 'focus',
      clear: 'She has gone quiet. Take it.',
      ok: 'You take the quiet. You breathe in a room with her in it.',
      bad: 'You look away from her. In here, that is the mistake.' }
  ]
};

/* The true fight. Fast, mean, and it gets faster the longer you stay in it.
   Mumu's help is the difference between hard and unsurvivable. */
var manGod = {
  art: 'mangod', pattern: [0, 1, 2, 3], teach: 4, speed: 3400, accel: 0.985,
  allyBoost: true,
  name: 'Man-God',
  poise: 16,
  intro: 'He is standing in an ordinary room.\n\nThat is the worst of it. There is a chair. There is a cup on the table with something in it, still warm. He has been here the whole time — under every corridor you bled in, one floor up from everybody you buried — and he is not enormous, and he is not glowing, and he is wearing a cardigan.\n\nHe looks up when the dark puts you down on his floor and he says your name the way he always has, warmly, with the very slight relief of a man whose appointment has arrived.\n\n<<{Nine,}>> he says. He does not correct it this time.',
  outro: 'He is very surprised.\n\nThat is the whole of it, in the end. Not afraid. Not sorry. Surprised — the specific, offended surprise of a man who has never once had a tool do this.',
  phase: { at: 9, index: 3, a: 'strike', speed: 0.88,
    text: 'He stops being warm.\n\nIt happens between one word and the next and there is nothing underneath it. No second face. No true form. Just a man who has stopped bothering, in a cardigan, in a room — and he is faster now, and when he steps back he is not giving you room any more. He is winding up.' },
  tells: [
    { t: 'He talks, and while he talks he moves, and the movement is the part that is happening — a long lazy sweep of the arm with three hundred years behind it.', a: 'slip', heavy: true,
      clear: 'The talking is cover. The arm is the thing. Move.',
      ok: 'You move while he is still being charming and the charm hits the wall instead.',
      bad: 'You listened. Of course you listened. You have been listening for the whole game.' },
    { t: 'He comes forward fast with both hands, close, almost fond, like somebody taking your face to tell you something important.', a: 'guard',
      clear: 'Close and fond. Hold.',
      ok: 'You hold him off. Up close he smells like a classroom.',
      bad: 'He takes your face and tells you something important.' },
    { t: 'He laughs at something and for a second he is genuinely, helplessly amused, and completely undefended.', a: 'strike',
      clear: 'He is actually laughing. Now.',
      ok: 'You hit him while he is laughing. The laugh keeps going for half a beat after it should have stopped.',
      bad: 'The laugh was on purpose. Everything is on purpose.' },
    { t: 'He steps back, spreads his hands, and offers you a reasonable way out of this. It is a good offer. It is the best offer anybody has ever made you.', a: 'focus',
      clear: 'He is buying time. Use it too.',
      ok: 'You take the moment he wanted to spend on you and spend it on yourself instead.',
      bad: 'You take the offer seriously, for one second, and one second is the whole price.' }
  ]
};

/* ---------------- the waking ---------------- */
var WAKES = [
  { where: 'a flooded chapel', text:
    'You come back on in water up to your knees.\n\nThe first sound in the world is your own breath, close and wrong, because there is something on your face. The second sound is the water moving where you moved it.\n\nThe chapel has no roof and no sky either — just rock, a long way up, and a drowned window with nothing behind it.\n\nThere is a woman standing in the flooded doorway. She is watching you come back and she is not surprised by any part of it. By the time you have turned your head properly she is gone, and the water where she was standing is still going in rings.' },
  { where: 'a buried train car', text:
    'You come back on in the dark, lying down, in air that has been breathed already.\n\nThe first sound in the world is your own breath, close and wrong, because there is something on your face. The second is somebody moving, two cars down, who stops when you stop.\n\nYou are in a train. It is on its side and it is underground and it has been here so long that roots have come in through the windows and gone out through the floor.\n\nAt the far end of the car a woman stands in the doorway with her head slightly tilted — the way you look at a thing you have already seen. When you get there, there is nothing but a handprint in the dust that is smaller than yours.' },
  { where: 'a hollowed tree the size of a building', text:
    'You come back on standing up, which is worse.\n\nThe first sound in the world is your own breath, close and wrong, because there is something on your face. The second is singing, very far off, which stops the moment you notice it.\n\nYou are inside a tree. It is the size of a cathedral and it is dead and its roots are the ceiling of somewhere else.\n\nSomebody is up in the roots, sitting, with her legs over the edge, watching you. By the time you have found a way to look at her properly there is only a place where the moss has been flattened by sitting.' }
];

S.below_wake = {
  chapter: 'The Below', art: 'mumu',
  quote: 'Nothing down here is new. It has all happened, and it has all happened to somebody who is still here.',
  onEnter: function (st) {
    st.flags.below = true;
    st.ember = st.emberCap; st.breath = st.breathCap;
    st.chapter = 'The Below';
    G.drawHud();
  },
  text: function (st) { return WAKES[st.pools.wake].text; },
  choices: [
    { t: 'Take the mask off.', to: 'below_mask_off' },
    { t: 'Leave it. Stand up. Go after her.', to: 'below_wake2', do: function (st) { st.four = 'glimpsed'; G.bond('mumu', 1); } }
  ]
};

S.below_mask_off = {
  chapter: 'The Below',
  text: 'Your hands go up to it and stop.\n\nThey stop because the mask is not on your face. There is no edge. There is no under.\n\nYou stand in the dark for a while being the kind of quiet a person is only ever once.',
  to: 'below_wake2'
};

S.below_wake2 = {
  chapter: 'The Below',
  text: function (st) {
    return 'You are three hundred years into somewhere, in ' + WAKES[st.pools.wake].where + ', and you are not the only thing standing up.\n\n' +
      'It comes out of the dark wearing a mask that is almost yours, and there is no light behind it, and it has been walking for a very long time without anywhere to walk to.';
  },
  combat: foe(quietOne), win: 'below_mangod1', lose: 'fallen'
};

S.ending_hollow_scene = { ending: 'hollow' };

/* ---------------- the first turning ---------------- */
S.below_mangod1 = {
  chapter: 'The Below — the first turning', art: 'mangod',
  quote: 'He is the first kind thing that has happened to you in three hundred years.',
  onEnter: function (st) {
    st.fingers = 1; G.addItem('fingerbone', 99); G.addItem('lumaflies');
    G.checkpoint('The Waking');
  },
  text: 'A man is sitting on the stone with his elbows on his knees, watching you do it, like somebody waiting out a rain shower.\n\n' +
    '<<{Oh, good,}>> he says. <<{You kept it on. Sorry — that\'s a terrible way to say hello. I was genuinely worried. If you\'d taken that off in the first minute you\'d be a smear, and I\'d be sitting here on my own feeling awful about it.}>>\n\n' +
    'He is warm. He is funny. He is the first kind thing that has happened to you in three hundred years, and he knows your name, and he knows your school, and about four minutes into this he says <<{— like [[Mira]], right?}>> and does not explain how he knows that, and you do not make him.\n\n' +
    'He calls himself Man-God. Plainly. Like a job.\n\n' +
    'The dark at the bottom of the world is rising. It is called the Deep, and it will swallow the Below and everything under it and then everything over it. There is a way to stop it: five Fingers, scattered. Bring them together, seal the Deep, go home.\n\n' +
    'He puts the first one in your hand. It is warm.',
  choices: [
    { t: 'Ask him what you are now.', to: 'below_rule' },
    { t: 'Ask him how he knows her name.', to: 'below_rule', do: function (st) { st.noticed++; G.doubt(1, 'hername'); } },
    { t: 'Take the Finger and say nothing.', to: 'below_rule' }
  ]
};

S.below_rule = {
  chapter: 'The Below — the first turning', art: 'mangod',
  beat: 'quiet',
  text: '<<{You died,}>> he says, gently, like it is a small thing that happened to your car. <<{And the Deep kept a piece. That piece is why you\'re vertical. You\'re not a visitor here and I won\'t insult you by saying you are. You\'re one of them now. The difference is you\'ve got somewhere to get back to.}>>\n\nHe stands up and brushes off his knees. And then he stops, and turns round, and for the only time in the whole of this he is not funny.\n\n<<{One thing. It\'s the only thing I\'ll ever ask you for.}>>\n\n<<{Don\'t say what I am. Out loud. Down here. Not to a friend, not to a corpse, not on your own in a room you think is empty.}>>\n\n<<{The Below listens. It\'s the one thing it still does properly. Say it where it can hear you and it will come and check, and it will not be gentle about checking, and I will not get there in time.}>>\n\n<<{I\'ve lost people that way. I\'ve lost a lot of people that way.}>>\n\nHe waits until you nod.\n\n<<{Five. Then home. I\'ll find you.}>>\n\nAnd he is gone, in a way you do not see happen.',
  to: 'below_road'
};

/* ---------------- the road (hub) ---------------- */
S.below_road = {
  chapter: 'The Below — the long road down',
  text: function (st) {
    if (st.flags.road_all) return 'The road goes down. It only goes down.\n\nThere is nothing else here now.';
    return 'The road down is a road, which is the strangest thing about it. Somebody cut these steps. Somebody carved a handrail into the rock and wore a groove in it with three hundred years of hands.\n\nThere is no hurry, except the hurry he gave you. Nothing here is on his list.';
  },
  choices: [
    { t: 'Somebody is sitting on the steps below, talking. Loudly. To nobody.',
      if: function (st) { return !st.flags.met_tallow; }, to: 'road_tallow' },
    { t: 'There is a shrine cut into the rock, with the lamp still lit.', if: function (st) { return !st.flags.road0; },
      do: function (st) { st.flags.road0 = true; }, to: 'road_shrine' },
    { t: 'There is a body in an alcove, sitting up, arranged.', if: function (st) { return !st.flags.road1; },
      do: function (st) { st.flags.road1 = true; }, to: 'road_body' },
    { t: 'Something is growing down here that should not be.', if: function (st) { return !st.flags.road2; },
      do: function (st) { st.flags.road2 = true; }, to: 'road_orchard' },
    { t: 'Go down.', cont: true, if: function (st) { return !!st.flags.met_tallow; }, to: 'road_end' }
  ]
};

/* --- Tallow --- */
S.road_tallow = {
  chapter: 'The Below — the steps', art: 'tallow',
  onEnter: function (st) { st.flags.met_tallow = true; G.bond('ap_tallow', 1); },
  text: 'Tallow has been alone for nine months and is making up for it at a rate that would exhaust a wedding.\n\nTallow has opinions about the acoustics, about your mask, about the correct way to open a tin, about you. Tallow tells you, within about ninety seconds, the entire plot of a book Tallow read as a child, with an apology in the middle for how long it is taking.\n\nUnder all of it Tallow is doing the maths on whether you are going to get them killed. Continuously. While talking about tins.\n\nAt one point Tallow stops dead and says, in a completely different voice, {sorry — do you mind it? The noise? Some people mind it,} and you watch a person decide, in real time, that it is safer to be a lot than to be quiet.',
  choices: [
    { t: 'Tell them you do not mind it. Mean it.', do: function (st) { G.bond('ap_tallow', 2); }, to: 'road_tallow2',
      peek: 'Cheap now. It is the most expensive thing you will ever be glad you bought.' },
    { t: 'Ask what happened nine months ago.', do: function (st) { G.bond('ap_tallow', 1); G.doubt(1, 'tallow'); }, to: 'road_tallow2',
      peek: 'A little. It opens a door neither of you can shut.' },
    { t: 'Say nothing and keep walking.', to: 'below_road', peek: 'Nothing. That is the problem with it.' }
  ]
};

S.road_tallow2 = {
  chapter: 'The Below — the steps', art: 'tallow',
  text: 'Nine months ago Tallow was in a kitchen, upstairs, in a world with a sky in it, and a voice came out of the radio and said Tallow\'s name.\n\n{It was very nice about it,} Tallow says. {That\'s the bit I can\'t — it was so nice. It said I was chosen. It said there was a thing only I could do. Do you know how long I\'d been waiting for somebody to say that? Twenty-two years. Twenty-two years, and then a radio.}\n\nTallow laughs at that, properly, the way you laugh at a thing that is not funny.\n\n{Anyway. I packed four shirts and no food. Absolute idiot.}\n\nYou have a Finger in your bag. It is warm. You do not mention it.',
  choices: [
    { t: 'Say nothing about the Finger. Not yet.', to: 'below_road', do: function (st) { G.bond('ap_tallow', 1); } },
    { t: 'Tell them who sent you. Say out loud what he is.', to: 'named_check',
      do: function (st) { nameHim(st, 'to Tallow, on the steps, because they had been honest with you first'); },
      peek: 'Everything. He told you the one rule, and you are about to find out he meant it.' }
  ]
};

S.road_shrine = {
  chapter: 'The Below — the shrine',
  onEnter: function (st) { G.doubt(1, 'carving'); },
  text: 'The shrine is older than the catastrophe. You can tell because the catastrophe is carved into the wall above it as a thing that has not happened yet — a warning, a prediction, a sky full of light.\n\nUnderneath, in the place where a people put the thing they are asking for help, there is a man.\n\nHe has been carved with great care and no skill. The hands are wrong. The face is not wrong. It is a face you had lunch with, near a train that has been underground for three centuries, and the stone it is cut into is older than that by a thousand years.\n\nThere is a mask shard on the shelf, put there deliberately, the way you would leave a coin.',
  choices: [
    { t: 'Take the shard.', do: function (st) { G.shard('sh_shrine'); }, to: 'below_road' },
    { t: 'Leave it where somebody put it.', to: 'below_road' }
  ]
};

S.road_body = {
  chapter: 'The Below — the alcove',
  text: 'Somebody sat this one up and crossed its hands. That is not what happens to things that die down here. That is what happens to things that are buried.\n\nIt is wearing a mask. The mask is not almost yours. It is yours — the same maker, the same hand, the same small flaw at the left temple where the mould was tired.\n\nIn its lap, held, is a shard that is not from its own mask. Something has been visiting this body. Something has been leaving things here on purpose, for somebody, for a long time.',
  choices: [
    { t: 'Take the shard.', to: 'road_body_lore',
      do: function (st) { G.shard('sh_mumu_1', true); st.four = 'glimpsed'; G.bond('mumu', 1); } },
    { t: 'Close its hands again and go.', to: 'below_road' }
  ]
};

S.road_body_lore = {
  chapter: 'A memory that is not yours', art: 'mumu',
  quote: 'She has done this before. That is not a figure of speech.',
  text: '||A girl of about seventeen, in a corridor with the lights off, at the end of a Friday.||\n\n||She dies there. You know the ceiling tiles. You know the sound the heating makes. You have been in that corridor.||\n\n||And then she wakes up in a flooded chapel, three hundred years down, with something on her face.||\n\n||And then she dies again, somewhere else, later, worse.||\n\n||And then she wakes up in a flooded chapel.||\n\n||The memory does this eleven times before it stops, and it does not stop because it ran out. It stops because you cannot hold any more of it.||\n\n||The last thing in it is her sitting down in this alcove, arranging a stranger\'s hands, and leaving a piece of her own mask in them, for somebody who has not arrived yet.||',
  to: 'below_road'
};

S.road_orchard = {
  chapter: 'The Below — the orchard',
  onEnter: function (st) { G.addItem('palefruit'); G.addItem('wax'); },
  text: 'It is a tree, or it was, and it has fruited in the dark against every rule you have ever heard of.\n\nThe fruit is pale and heavy and hangs low enough to reach. Cut into the trunk, in letters worn nearly smooth, somebody has written the same word over and over, and the word is %%don\'t%%.\n\nEleven times. You count them twice.\n\nYou take one anyway, because you are a person, and people take one anyway.',
  choices: [
    { t: 'Put it in the bag. Not now.', to: 'below_road' },
    { t: 'Eat it now.', to: 'ending_breakfast_scene' }
  ]
};

S.ending_breakfast_scene = { ending: 'breakfast' };

S.road_end = {
  chapter: 'The Below — the cistern',
  onEnter: function (st) { st.flags.road_all = true; },
  text: 'The road ends at water, which is how everything down here ends.\n\nThe second Finger is sitting on a ledge in the middle of it, in plain sight, not hidden at all, the way you would leave keys out for somebody you were expecting.\n\nYou are halfway across before the water stops being water.',
  combat: foe(waterThing), win: 'road_finger2', lose: 'fallen'
};

S.road_finger2 = {
  chapter: 'The Below',
  onEnter: function (st) { st.fingers = 2; },
  text: 'You take the second Finger out of the water.\n\nTwo.\n\nTallow is sitting on the bank with both hands over their mouth and has not said a word in four minutes, which you will understand later was the most frightened anybody has ever been on your behalf.\n\nBelow the cistern the rock opens out into something that is not a cave, and there is light in it, blue and cold and moving, and there is singing.',
  to: 'choir_arrive'
};

/* ---------------- the choir ---------------- */
var HAZARDS = [
  { id: 'water', name: 'the water',
    body: 'The Choir is a drowned city and the drowning is not finished. There is a tide down here, three hundred years after there was any moon to pull it, and it comes up the streets in the dark.\n\nIt will be over the second-floor windows in about eleven minutes. It has been coming up while you talked.',
    wrong: 'You go up. Up is the obvious answer with water, and it is the correct answer in almost every building in the world, and this building has a sealed roof, because the people who built it were trying to keep something out.' },
  { id: 'loft', name: 'the loft',
    body: 'The Choir is a drowned city and the only dry way across is a warehouse loft, and the warehouse has been holding its breath since before your language existed.\n\nYou can hear the countdown in the structure. Everybody can. It is not a metaphor; it is a beam, and it is making a sound that beams make once.',
    wrong: 'You go fast. Fast is right in a collapse, everybody knows fast is right, and you are eight steps in when you understand that this floor was only ever going to hold for somebody moving slowly enough not to load it.' },
  { id: 'song', name: 'the singing',
    body: 'The Choir is a drowned city, and the city is still singing.\n\nIt is not beautiful and it is not evil. It is the dead doing the last thing they were doing, over and over, and the sound of it moves things in the water that are attracted to sound.\n\nSilence is survival. Silence, and the fact that neither of you can hear the other coming either.',
    wrong: 'You call out. Once. To find her, to tell her where you are, because it is dark and she is frightened and every decent instinct in your body is screaming that you do not leave a person alone in the dark.' }
];
function haz(st) { return HAZARDS[st.pools.hazard]; }

S.choir_arrive = {
  chapter: 'The Choir', art: 'quill',
  quote: 'The dead are doing the last thing they were doing. They will be doing it tomorrow.',
  onEnter: function (st) { G.bond('ap_quill', 1); G.checkpoint('The Choir'); },
  text: function (st) {
    return 'The Choir was a city and is now a ceiling with a city under it.\n\n' +
      'Quill taught, before. You can tell in about eleven seconds.\n\n' +
      'She is careful and she is a little cold and she gives you exactly as much information as you need, which is a kind of contempt and also the reason she is still alive. She does not ask your name for an hour. When she does, she uses it every time after that.\n\n' +
      'She has been trying to get across for two days, because of ' + haz(st).name + '.\n\n' + haz(st).body;
  },
  choices: [
    { t: 'Ask her what she taught.', do: function (st) { G.bond('ap_quill', 2); }, to: 'choir_quill2',
      peek: 'Nothing. It buys you a person.' },
    { t: 'Skip it. There are eleven minutes and a problem in them.', to: 'choir_mangod' }
  ]
};

S.choir_quill2 = {
  chapter: 'The Choir', art: 'quill',
  text: '{Year eight and year nine,} Quill says. {History. Badly. I was not good at it and I was not kind about it, and there is a boy called Aled who I was unfair to for an entire year because he reminded me of somebody.}\n\nShe says this the way you would read out a list.\n\n{On the last morning a voice came out of the tap and told me I was needed. Needed. That word. I had been in that school eleven years and nobody had once used that word about me, and a tap said it, and I went.}\n\nShe looks at the water.\n\n{Aled is dead of old age. Everybody I was unfair to is dead of old age. That is the part I would like somebody to explain to me, and nobody down here can.}',
  choices: [
    { t: 'Say nothing. Some things do not want a reply.', do: function (st) { G.bond('ap_quill', 1); }, to: 'choir_mangod' },
    { t: 'Tell her who sent you. Say out loud what he is.', to: 'named_check',
      do: function (st) { nameHim(st, 'to Quill, in a drowned city, because she had told you about Aled'); },
      peek: 'Everything. She will not even get to answer you.' }
  ]
};

S.choir_mangod = {
  chapter: 'The Choir — the second turning', art: 'mangod',
  text: function (st) {
    return 'He is sitting on a windowsill with his heels against the wall.\n\n<<{Right,}>> Man-God says, without preamble, in the voice of a man who has been watching this for ten minutes and has had enough. <<{Listen. You\'re going to want to do the obvious thing. Don\'t.}>>\n\n' +
      'And he tells you, exactly, in about forty words, what to do instead. It is specific. It is counterintuitive. It involves ' + ({
        water: 'going down before you go up, through a flooded level, because the sealed roof is a trap and the cellar stair comes out on the far side above the tideline',
        loft: 'going slowly, and putting your weight where the floor is already broken, because the broken parts have already found their bearing',
        song: 'not calling out, not once, for any reason, and trusting a woman you met an hour ago to be where a person would be'
      })[haz(st).id] + '.\n\n<<{Third Finger\'s in the vestry, by the way. Take it on the way. And don\'t be a hero, you haven\'t got the hit points.}>>\n\nOn the way out he glances at Quill for about a quarter of a second. It is not a long look. It is the look you give a chair you are going to move later.\n\nThen he is not on the windowsill.';
  },
  choices: [
    { t: 'Do exactly what he said.', to: 'choir_resolve_good' },
    { t: 'Do the obvious thing instead. Quill is right there.', to: 'choir_resolve_bad',
      peek: 'Heavy. It is the most reasonable decision in the game and it kills her.' },
    { t: 'Ignore him and go and look at the problem yourself first.', to: 'choir_explore' }
  ]
};

S.choir_explore = {
  chapter: 'The Choir',
  onEnter: function (st) { G.doubt(1, 'refuse_choir'); },
  text: 'You do not take the advice and you do not do the obvious thing. You go and look.\n\nIt takes eleven minutes you did not think you had, and it is eleven minutes of Quill watching you not rescue her.\n\nAnd there is a second way. It is not better than his. It is not worse. It is just there, and it has been there since before either of you arrived, and nobody had to tell you about it.\n\nThere are tracks in the silt at the bottom of it. Somebody came this way already, recently, and did not stay, and did not help.',
  choices: [
    { t: 'Take your own way across.', to: 'choir_resolve_own' },
    { t: 'Look at the tracks properly first.', to: 'choir_tracks' }
  ]
};

S.choir_tracks = {
  chapter: 'The Choir', art: 'mumu',
  onEnter: function (st) { G.shard('sh_mumu_2', true); st.four = 'glimpsed'; G.bond('mumu', 1); },
  text: '||Somebody stood here for a while. Long enough for the silt to settle around her feet twice.||\n\n||She was watching the loft, or the water, or the dark where the singing is. Then she went back the way she came, and the tracks going back are deeper, which means whatever she came here to do, she did not do it, and she carried it out with her.||\n\nThere is a shard pressed into the silt where the heel was. It has been put there.\n\nScratched into the wall beside it, small, at sitting height, worn almost out: %%she dies here on the seventh one. go down first.%%',
  to: 'choir_resolve_own'
};

S.choir_resolve_good = {
  chapter: 'The Choir',
  onEnter: function (st) { G.bond('ap_quill', 2); st.history.followedChoir = true; st.fingers = 3; },
  text: 'It works perfectly.\n\nIt works in the specific way that makes you stop checking: not narrowly, not at a cost, but cleanly, the way a thing works when somebody competent told you how to do it.\n\nQuill comes out the other side wet and furious and alive, and looks at you like you have done something extraordinary, and you did not do anything. You did what you were told.\n\nThe third Finger is in the vestry, exactly where he said, sitting in a font.',
  to: 'choir_slip'
};

S.choir_resolve_own = {
  chapter: 'The Choir',
  onEnter: function (st) { G.bond('ap_quill', 2); st.history.ownWay = true; st.fingers = 3; },
  text: 'It works.\n\nNot easily, and not the way he described, and there is a bad minute in the middle where you are certain you have killed both of you. But it works, and at the end of it Quill is sitting on a step getting her breath back, and nobody handed you anything.\n\nNobody congratulates you. No dialogue happens. There is just the small private fact, which you will not mention to him, that you did not need him for this one.\n\nThe third Finger is in the vestry. He was right about that.',
  to: 'choir_slip'
};

S.choir_resolve_bad = {
  chapter: 'The Choir', art: 'quill',
  beat: 'quiet',
  quote: 'It was a reasonable decision. Everybody you ever explain it to will agree that it was a reasonable decision.',
  onEnter: function (st) {
    st.flags.carried = true; st.history.lostThem = true; st.fingers = 3;
    st.apostles.ap_quill = 'dead'; st.bonds.ap_quill = 0;
  },
  text: function (st) {
    return haz(st).wrong + '\n\nQuill does not blame you. That is the whole problem with it.\n\nShe has about ninety seconds at the end and she spends them being decent about it. She asks you to tell a boy called Aled that she was sorry, and you say yes, and neither of you says the thing you both know, which is that Aled has been dead for two hundred and eighty years.\n\n{It is not your fault,} she says. {It is not. Say it back to me.}\n\nYou say it back to her. It does not take.\n\nThe third Finger is in the vestry. You take it with the wrong hand, because the other one is holding her mask.';
  },
  to: 'choir_slip'
};

S.choir_slip = {
  chapter: 'The Choir', art: 'mangod',
  text: 'He is waiting at the mouth of the culvert to walk you out, which he has not done before.\n\nHe is easy about it. He asks how it went. He is funny about the singing. At one point you hand him the third Finger to look at and he turns it over and hands it back and says:\n\n<<{Sure thing, Nine — }>>\n\n<<{ — sorry. You know what I mean.}>>\n\nHe carries on with the sentence he was in the middle of.',
  choices: [
    { t: 'Ask him what he just called you.', to: 'choir_slip_push', do: function (st) { G.doubt(2, 'slip'); st.noticed++; } },
    { t: 'Nothing. He misspoke. People misspeak.', to: 'gallery' }
  ]
};

S.choir_slip_push = {
  chapter: 'The Choir', art: 'mangod',
  text: '<<{Called you what?}>> he says, and then — genuinely, you would swear to it — he laughs. <<{Oh. Habit. Sorry. I\'ve been doing this a long time and there was a stretch where it was easier to — look, it\'s a bad habit and it\'s rude and I\'ll stop.}>>\n\nAnd he does stop. He never does it again.\n\nHe is so convincing. That is not a description of him lying; you have no evidence that he is lying. It is a description of the fact that you cannot tell.\n\nIt proves nothing. That is what you will keep coming back to, later, in the dark, on your own: it proves absolutely nothing, and you have been counting it as proof since the second it happened.',
  to: 'gallery'
};

/* ---------------- gallery + Bit ---------------- */
S.gallery = {
  chapter: 'The Long Gallery', art: 'bit',
  onEnter: function (st) { G.doubt(1, 'body2'); G.bond('ap_bit', 1); },
  text: 'The gallery runs for a mile under the roots of something and it was built to impress people who are all dead.\n\nHalfway along there is a child sitting on a plinth with a stick across their knees that is much too big for them.\n\nBit is thirteen and has been down here for two years and has a system for everything. Bit explains the system. The whole system. It takes some time and it is genuinely good, and Bit has clearly explained it before, at length, to somebody who is not here any more.\n\nAt the end Bit says, without any change of tone at all: {you\'re the ninth one I\'ve told it to. None of the other eight came back past here. I\'m not saying that to be horrible. I just think people should know their number.}',
  choices: [
    { t: 'Ask Bit who the other eight were.', do: function (st) { G.bond('ap_bit', 2); G.doubt(1, 'eight'); }, to: 'gallery_bit2',
      peek: 'A little. It is the cheapest doubt you will ever buy.' },
    { t: 'Tell Bit they should not be down here.', do: function (st) { G.bond('ap_bit', 1); }, to: 'gallery_bit2' },
    { t: 'Nothing. There is a mile of gallery and a thing at the end of it.', to: 'gallery_body' }
  ]
};

S.gallery_bit2 = {
  chapter: 'The Long Gallery', art: 'bit',
  quote: 'Nobody has crossed one out.',
  text: '{I write them down,} Bit says, and shows you, and there are eight names on the inside of a coat in eight different hands, because Bit made each of them sign it.\n\n{That\'s the system. If you sign it you have to come back and cross it out yourself. Nobody\'s crossed one out.}\n\nBit holds out a pen. It is a real pen. Bit has been carrying a working pen around a dead kingdom for two years so that this can keep happening.',
  choices: [
    { t: 'Sign it.', do: function (st) { G.bond('ap_bit', 2); st.flags.signed = true; }, to: 'gallery_body',
      peek: 'Nothing at all. It will cost somebody else a great deal.' },
    { t: 'Do not sign it. Tell Bit to stop doing this.', do: function (st) { G.bond('ap_bit', 1); }, to: 'gallery_body' },
    { t: 'Tell Bit who gave the other eight their numbers. Say what he is.', to: 'named_check',
      do: function (st) { nameHim(st, 'to a thirteen-year-old with a pen, in a gallery, because they deserved to know'); },
      peek: 'Everything. And they will be standing right there while it happens.' }
  ]
};

S.gallery_body = {
  chapter: 'The Long Gallery',
  text: 'Further along there is an Apostle, if that is what they are. Nobody has told you that word yet.\n\nThey are face down and they have been dead for a while and their mask is the same as yours. Not similar. The same flaw at the left temple. The same maker. Four hundred years between when this one was made and when yours was, and the same tired mould.\n\nThere is a shard beside them. It is not from their mask either.',
  choices: [
    { t: 'Take the shard.', do: function (st) { G.shard('sh_gallery'); }, to: 'gallery_fight' },
    { t: 'Leave it. You have enough to carry.', to: 'gallery_fight' }
  ]
};

S.gallery_fight = {
  chapter: 'The Long Gallery',
  text: 'At the end of the gallery something stands up that has been standing for three hundred years and was, briefly, before that, a door.',
  combat: foe(longArmed), win: 'seal_arrive', lose: 'fallen'
};

/* ---------------- the sealed one ---------------- */
S.seal_arrive = {
  chapter: 'The Sealed One — the third turning',
  quote: 'It cannot speak. So it does the only thing it can do.',
  onEnter: function (st) { G.doubt(1, 'sealed_memory'); G.checkpoint('The Sealed One'); },
  text: 'The bottom of everything is a room with a chain in it.\n\nThe thing in the chain has been holding the light in since before your grandparents\' grandparents. It is enormous and it is bowed and it is full. You can see it being full. Whatever is in it is trying to get out at a rate of about one attempt per second, forever, and has been doing that since before there was a Below to hold it under.\n\nIt looks at you. It has been alone for three hundred years, and the first thing it does when it sees you is try to warn you, and it cannot speak, and so it does the only thing it can do.\n\nIt pulls the chain tighter.\n\nThe fourth Finger is set into the seal at its feet.',
  to: 'seal_mangod'
};

S.seal_mangod = {
  chapter: 'The Sealed One — the third turning', art: 'mangod',
  text: function (st) {
    var lead;
    if (st.history.lostThem) {
      lead = '<<{You\'ve already lost one,}>> he says, quietly, not cruelly. <<{I\'m not going to pretend I don\'t know that. And I\'m not going to tell you it wasn\'t your fault, because you wouldn\'t believe me and you\'d be right not to. What I\'ll tell you is that there\'s a number of people the Deep gets if we stop here, and it isn\'t one.}>>';
    } else if (st.history.ownWay) {
      lead = '<<{You didn\'t need me at the Choir,}>> he says, and he sounds pleased, actually pleased. <<{I noticed. So I\'m going to talk to you like somebody who checks. Check this: what\'s holding the light in is also holding the light in. It is a lid. Lids go both ways. That thing has been the only reason the Below is dark for three centuries, and everybody down here has agreed not to say it.}>>';
    } else if (Object.keys(st.bonds).some(function (k) { return st.bonds[k] >= 3; })) {
      lead = '<<{Think about who\'s walking behind you,}>> he says. <<{Not humanity. I don\'t care about humanity and neither do you, not really. The one person. The specific one. Think about the Deep coming up through the floor of wherever they\'re sleeping tonight, and then tell me you want to be careful.}>>';
    } else {
      lead = '<<{You\'ve been careful the whole way down,}>> he says. <<{It\'s been the right call every single time and I\'ve never once told you to stop. So take this seriously when I say it: this is the one time being careful costs you everything. Not a lot. Everything.}>>';
    }
    return 'He is already there when you arrive, sitting on the steps below the chain, looking up at it with something you would swear is sadness.\n\n' + lead + '\n\n<<{Break the seal. Take the Finger. I know what it looks like. I know exactly what it looks like. Break it anyway.}>>\n\nEvery single thing he has told you has been true. Twice it has saved a life that was not yours.';
  },
  choices: [
    { t: 'Break the seal.', to: 'seal_four' },
    { t: 'Refuse. Tell him to find another way.', to: 'seal_refuse', do: function (st) { G.doubt(2, 'refuse_seal'); } },
    { t: 'Look for a way to get the Finger out without breaking anything.', to: 'seal_alt',
      if: function (st) { return st.echoes >= 1 || st.shards.length > 0 || st.doubt >= 3; } }
  ]
};

S.seal_four = {
  chapter: 'The Sealed One', art: 'mumu',
  beat: 'quiet',
  onEnter: function (st) { st.four = 'warned'; G.bond('mumu', 1); },
  text: 'There is somebody standing in the dark at the top of the chamber steps.\n\nShe has been there for a while. She is wearing a mask that is the same as yours and she is not moving and she is not coming down.\n\nShe says one word. It is the only completely unambiguous thing anybody says to you in three hundred years.\n\n||{Don\'t.}||\n\nShe does not explain. She does not come down. She waits, for about four seconds, to see what you are going to do, and four seconds is not very long to weigh a stranger in a mask against a warm voice that has been right every single time.',
  choices: [
    { t: 'Break it anyway.', to: 'seal_break' },
    { t: 'Stop. Listen to the stranger.', to: 'seal_refuse', do: function (st) { G.doubt(2, 'refuse_seal'); G.bond('mumu', 1); } },
    { t: 'Look for another way, now, quickly, before either of them can talk again.',
      if: function (st) { return st.echoes >= 1 || st.shards.length > 0; }, to: 'seal_alt' }
  ]
};

S.seal_break = {
  chapter: 'The Sealed One',
  onEnter: function (st) { st.sealIntact = false; st.fingers = 4; },
  text: 'You break the seal.\n\nIt is easy. That is the thing nobody prepares you for about the worst thing you will ever do: it takes about nine seconds and no strength at all, because it was not built to be defended, it was built to be honoured.\n\nThe chain does not fall. The thing in it does not come out. It is not that kind of seal and it never was.\n\nWhat comes out is what the seal was for. Not the light — the pressure behind the light. Three hundred years of held breath, released, into a room with you in it.\n\nThe Sealed One makes a sound. You will hear it again in about an hour, when it stops.',
  combat: foe(keeper), win: 'seal_after', lose: 'fallen'
};

S.seal_refuse = {
  chapter: 'The Sealed One',
  onEnter: function (st) { st.fingers = 4; },
  text: 'You say no.\n\nHe does not argue. That is the first genuinely frightening thing he does — he does not argue at all. He looks at you for a moment and he nods and he says <<{okay}>>, and he means it, and he walks up the steps past the woman in the mask without appearing to see her.\n\nThree hours later you find the fourth Finger on a ledge outside the chamber, sitting in plain sight, warm, where it was not before.\n\nHe got it. He did not need you to do it. He wanted you to be the one who did it, and you will spend a long time working out why, and when you work it out it will be too late to be useful.',
  to: 'mumu_meet'
};

S.seal_alt = {
  chapter: 'The Sealed One',
  onEnter: function (st) { st.fingers = 4; st.four = 'warned'; G.doubt(2, 'alt_seal'); G.bond('mumu', 1); },
  text: 'There is a third way and it is buried and it is nearly nothing.\n\nThe seal is set into a floor, and floors have undersides, and three hundred years of one enormous thing straining upward has opened a gap at the joint you could get an arm into if you were willing to put an arm somewhere you cannot see.\n\nIt costs you. Something under there takes a serious interest in your arm and you come back with less of it than you went in with, and the Finger, and the seal entirely whole.\n\nUp at the top of the steps the woman in the mask watches you do it, and does not leave when you look at her, and does not come down either.\n\nShe is still standing there when you go. You are fairly sure that is the closest thing to approval anybody down here has ever given anybody.',
  to: 'mumu_meet'
};

S.seal_after = {
  chapter: 'The Sealed One',
  text: 'The chamber is quiet.\n\nThe Sealed One is still holding. It will hold for a while yet; not forever, not now, but for a while. It does not look at you again.\n\nThe fourth Finger comes out of the broken seal warm, like the others.\n\nFour.',
  to: 'mumu_meet'
};

/* ---------------- Mumu the Hollow ---------------- */
S.mumu_meet = {
  chapter: 'The Hollow', art: 'mumu',
  quote: 'I am not a ghost. Ghosts only have to do it once.',
  onEnter: function (st) { st.flags.met_mumu = true; G.checkpoint('The Hollow'); },
  text: function (st) {
    return 'She is sitting on the bottom step with her back against the wall, and she does not get up.\n\n{Sit down,} she says. {You\'ve got about four minutes before he notices you\'ve stopped moving. Don\'t waste them standing.}\n\nShe is exactly your height. Her mask is exactly your mask, down to the tired flaw at the left temple, except that hers has been repaired eleven times and one of the repairs is a piece of somebody else.\n\n{Mumu,} she says. {The Hollow, if you\'re being formal, which nobody is.}\n\n{I\'ve done this ' + (st.shards.length >= 2 ? 'eleven' : 'a great many') + ' times. I die, I wake up in a chapel with my knees in the water, and I do it again. Not a metaphor. Not a curse. Just a thing that happens to me, the way rain happens to a field.}\n\n{And every single time, a very nice man tells me I am the only one who can fix it.}';
  },
  choices: [
    { t: 'Ask her what happens at the end.', to: 'mumu_talk', do: function (st) { G.bond('mumu', 1); } },
    { t: 'Ask her why she has not just stopped.', to: 'mumu_talk', do: function (st) { G.bond('mumu', 1); st.flags.askedstop = true; } },
    { t: 'Tell her she is lying, and walk away.', to: 'ascent', do: function (st) { st.bonds.mumu = 0; },
      peek: 'Nothing tonight. It costs you the last fight, and you will not know that until you are in it.' }
  ]
};

S.mumu_talk = {
  chapter: 'The Hollow', art: 'mumu',
  onEnter: function (st) { G.addItem('ashcoin'); G.bond('mumu', 1); },
  text: function (st) {
    var a = st.flags.askedstop
      ? '{I did stop. Run six. I sat in the orchard for what I think was a year and I did not move and I did not help anybody, and I watched the whole thing happen anyway, from a distance, with fruit.}\n\n{It turns out the world ending is not a thing you can decline.}\n\n'
      : '{The end is always the same. I put the fifth one in, and something very beautiful wakes up and takes me apart, and he is not in the room, and he has never once been in the room.}\n\n';
    return a +
      '{Here is the only thing I have that you don\'t,} she says. {I know where he is standing.}\n\n' +
      '{Not a guess. Run nine, I got there. I got all the way there and I stood in the doorway of a very ordinary room with a chair in it and a cup on the table, and I looked at him, and I had four seconds, and I spent all four of them saying something instead of moving.}\n\n' +
      '{Don\'t say anything. That\'s it. That\'s the whole of what I know and it took me two hundred years. Don\'t say anything to him. He does not get one more word out of anybody, ever, for any reason.}\n\n' +
      'She takes something out of her coat and turns it over twice before she gives it to you, which is how you know she thought about keeping it.';
  },
  choices: [
    { t: 'Ask her what her name was upstairs.', to: 'mumu_name', do: function (st) { G.bond('mumu', 2); } },
    { t: 'Ask her to come with you.', to: 'mumu_no', do: function (st) { G.bond('mumu', 1); } },
    { t: 'Take the coin and go.', to: 'ascent' }
  ]
};

S.mumu_name = {
  chapter: 'The Hollow', art: 'mumu',
  beat: 'quiet',
  onEnter: function (st) { G.bond('mumu', 2); st.flags.mumuName = true; },
  text: 'She is quiet for long enough that you think you have done something unforgivable.\n\n{Nobody has asked me that,} she says. {In three hundred years. Nobody has asked me that.}\n\n{It was Mumu. That is the actual name. It is not a Below name and it is not a mask name, it is what my mother called me in a kitchen with the wrong number of chairs in it, and I have been saying it out loud to myself once a day for eleven runs so that it does not go.}\n\n{The Hollow part I picked up here. That one is accurate.}\n\nShe looks at you properly for the first time.\n\n{You\'re going to get further than me. I can tell from how you hold the thing. When you get to the room — }\n\nShe stops.\n\n{ — when you get to the room, don\'t be kind to him. I was kind to him. That is what the four seconds went on.}',
  to: 'ascent'
};

S.mumu_no = {
  chapter: 'The Hollow', art: 'mumu',
  text: '{No,} she says, and it is not unkind. {If I come, I am in the room, and if I am in the room I will say something. I have proved that. Nine times I have proved that.}\n\n{I\'ll be behind you. Not close. Behind you the way weather is behind you.}\n\nAnd she is, for the rest of it. You will catch her at the edge of nine different rooms, and she will never once be closer than she said.',
  to: 'ascent'
};

/* ---------------- ascent ---------------- */
S.ascent = {
  chapter: 'The climb', art: 'mangod',
  onEnter: function (st) { st.fingers = 5; G.checkpoint('The climb'); },
  text: 'The fifth is not hidden.\n\nIt is at the top of a stair that goes up through the whole Below — past the Choir, past the gallery, past the road — and it is lying on the last step in the open, like something left out for a milkman.\n\nYou pick it up and nothing happens. You stand there in the dark holding five of them, and the count is done, and every instinct you have says that a thing should happen now.\n\nHe is at the top of the stair. Of course he is.\n\n<<{Go on, then,}>> he says, and he is so happy. That is the thing that will keep you up at night. He is so, so happy for you.',
  choices: [
    { t: 'Put the fifth one in.', to: 'bright_waking',
      peek: 'Everything. It costs everything, and it always did.' },
    { t: 'Say it out loud. Tell him to his face what he is.',
      if: function (st) { return st.doubt >= 5; }, to: 'accuse',
      peek: 'More than the other one. That is not the same as costing worse. The rule was about the dark. He is not the dark.' },
    { t: 'Drop all five down the hole you just climbed out of.', to: 'ending_fingers_scene',
      peek: 'Nothing. It costs nothing at all, which is its own kind of answer.' }
  ]
};

S.ending_fingers_scene = { ending: 'fingers' };

/* ---------------- saying it where the Below can hear ---------------- */
S.named_check = { redirect: function () { return 'ending_named_scene'; } };
S.ending_named_scene = { ending: 'named' };

/* ---------------- accuse / the hunt ---------------- */
S.accuse = {
  chapter: 'The climb', art: 'mangod',
  beat: 'quiet',
  onEnter: function (st) { st.flags.accused = true; },
  text: 'You say it.\n\nYou say it badly, because there is no good way to say it, and it comes out as a list: a carving older than the catastrophe, a mask with your flaw in it on a body four hundred years dead, a number instead of a name, a seal that was never a seal, eight signatures on the inside of a child\'s coat, and a man who has been right about everything — which is not a thing people are.\n\nHe listens to all of it. He does not interrupt once.\n\nWhen you have finished he is quiet for a moment, and then he says <<{okay}>>, exactly the way he said it at the seal.\n\nAnd then, because you said it to his face and not into the dark, he gives you one more sentence, and it is the last warm one he ever says to you.\n\n<<{For what it\'s worth — and I know exactly what it\'s worth — you\'re the first one who said it while I was standing here.}>>\n\nHe is gone before the word has finished.\n\nNothing happens that night.\n\nThey come the next one.',
  to: 'hunt_intro'
};

S.hunt_intro = {
  chapter: 'The Hunt',
  quote: 'Every one of them was told, on an ordinary morning, that they were chosen.',
  text: 'There is a word for them and nobody has used it in front of you until tonight.\n\nApostles. Three left standing in the whole of the Below, out of however many there have been, and you have met all three, and you liked all three, and not one of them knew about the others.\n\nThat is the design of it. He does not introduce them. Nine people in nine corridors, each one certain they are the only one.\n\nSomething goes round the Below at about two in the morning — not a shout, not a bell, just a decision arriving in three heads at once — and then the singing stops in the Choir, which it has not done in three hundred years.',
  to: 'hunt_tallow'
};

/* --- Tallow --- */
S.hunt_tallow = {
  chapter: 'The Hunt — Tallow', art: 'tallow',
  redirect: function (st) { return st.apostles.ap_tallow === 'dead' ? 'hunt_quill' : null; },
  text: function (st) {
    var lv = G.bondLevel('ap_tallow');
    if (lv >= 3) {
      return 'Tallow is waiting in the middle of the road, in the open, where you cannot possibly miss them, which is the exact opposite of how you ambush somebody.\n\nTallow is talking. Of course Tallow is talking. Tallow has been talking for an hour to an empty road to make sure you could hear where they were from a long way off.\n\n{— and I want it on record,} Tallow is saying, to nobody, {that I did not know. About any of it. I thought I was the only one. He told me I was the only one and I believed him because I have always been the only one, that is the whole thing about me, that is the entire — }\n\nTallow stops when you arrive.\n\n{He says I have to,} Tallow says. {And I have thought about it for an hour and I have decided that he can say things.}';
    }
    if (lv >= 1) {
      return 'Tallow comes down the road too fast and stops too far away and does not say anything for a long time, which from Tallow is a scream.\n\n{I don\'t want to,} Tallow says eventually. {I want that said out loud before anything else. I don\'t want to.}\n\n{But he said if I don\'t, he\'ll send somebody who does, and I know what that means, because I have seen what that means, and I would rather it was me, because at least if it\'s me I can — }\n\nTallow stops. Tallow does not have an end for that sentence. Nobody does.';
    }
    return 'Tallow does not say anything at all, which is how you know.\n\nYou walked past this person on a staircase once and did not stop, and they talked at your back for eleven minutes, and now they are standing in the road in the dark with their hands down and their weight forward and nothing to say to you.\n\nThere was a version of tonight where they could not have done this. It was cheap. It cost one conversation.';
  },
  choices: [
    { t: 'Tell them to stand aside. You are not going to fight them.',
      if: function (st) { return G.bondLevel('ap_tallow') >= 3; }, to: 'hunt_tallow_ally' },
    { t: 'Say their name. Just their name. Nothing else.',
      if: function (st) { return G.bondLevel('ap_tallow') >= 1; }, to: 'hunt_tallow_spare',
      peek: 'Nothing, and it might not work, and it is still the correct thing.' },
    { t: 'Fight them.', to: 'hunt_tallow_fight', peek: 'Heavy. They are a person and that will not stop being true while you do it.' }
  ]
};

S.hunt_tallow_ally = {
  chapter: 'The Hunt — Tallow', art: 'tallow',
  onEnter: function (st) { st.apostles.ap_tallow = 'ally'; G.bond('ap_tallow', 1); },
  text: '{Right,} Tallow says. {Right. Okay. Good. Because I had a whole speech and it was terrible.}\n\nAnd then Tallow does the thing that is going to matter later, which is that Tallow turns round and walks back up the road towards the Choir, shouting, at the top of their voice, the entire plot of a book they read as a child — badly, loudly, with an apology in the middle for how long it is taking.\n\nIt is the most useful noise anybody makes in the whole of the Below. It goes on for forty minutes. Two things that were coming for you go to look at it instead.\n\n{IT GETS BETTER IN THE THIRD PART,} Tallow bellows, from somewhere you can no longer see. {THE THIRD PART IS WORTH IT.}',
  to: 'hunt_quill'
};

S.hunt_tallow_spare = {
  chapter: 'The Hunt — Tallow', art: 'tallow',
  onEnter: function (st) { st.apostles.ap_tallow = 'spared'; G.bond('ap_tallow', 1); },
  text: '<<Tallow.>>\n\nThat is all you say. It is the first time in nine months that anybody down here has said it to their face instead of at their back.\n\nTallow sits down in the road. Not dramatically. The way somebody sits down when the thing that was holding them up was one sentence, and you took it.\n\n{That\'s not fair,} Tallow says. {That is not fair, and I want it noted that it is not fair, and I am going to sit here now, and you should go. You should go right now, because I am going to change my mind in about ninety seconds and I would like you to be gone before I do.}\n\nYou go. Behind you, somebody is talking to an empty road, which is what they were doing when you met them.',
  to: 'hunt_quill'
};

S.hunt_tallow_fight = {
  chapter: 'The Hunt — Tallow',
  text: 'They are not good at it. That is the thing that will not leave you.',
  combat: foe(apostleFoe('Tallow', 'apostle_tallow',
    'They fight like you, because the same voice taught you both, in the same warm patient way, on two ordinary mornings nine months apart.\n\nThey keep talking while they do it. Not taunts. Just talking, because Tallow talks, and the thing about a habit is that it does not know when to stop.')),
  win: 'hunt_tallow_dead', lose: 'fallen'
};

S.hunt_tallow_dead = {
  chapter: 'The Hunt — Tallow', art: 'tallow',
  beat: 'quiet',
  onEnter: function (st) { st.apostles.ap_tallow = 'dead'; st.bonds.ap_tallow = 0; },
  text: 'They stop talking about eight seconds before they stop.\n\nThat is the part. Not the fight — the eight seconds of a person who has talked continuously since the moment you met them lying in the road with nothing to say.\n\nIn their coat there are four shirts and no food.',
  to: 'hunt_quill'
};

/* --- Quill --- */
S.hunt_quill = {
  chapter: 'The Hunt — Quill', art: 'quill',
  redirect: function (st) { return st.apostles.ap_quill === 'dead' ? 'hunt_quill_already' : null; },
  text: function (st) {
    var lv = G.bondLevel('ap_quill');
    if (lv >= 3) {
      return 'Quill is standing in the vestry where the third Finger was, with her arms folded, exactly as cold as she was the first time.\n\n{I have worked something out,} she says, before you can speak. {I would like to say it to somebody competent, and you are the only person down here who qualifies.}\n\n{There were never any Apostles. There were nine strangers who each thought they were the only one. That is not an order. That is a filing system.}\n\nShe looks at you.\n\n{I have been a teacher and I have been unfair and I have been a great many things I am not proud of. I have not been somebody\'s filing.}';
    }
    if (lv >= 1) {
      return 'Quill is in the vestry and she has a weapon and she is holding it the way you hold a thing you have read about.\n\n{I want you to understand that I have thought about this properly,} she says. {I am not frightened and I am not confused. He has told me what you are, and I have weighed it, and the weighing came out wrong, and I am going to do it anyway — because the alternative is that I have been wrong about everything for two years.}\n\n{That is not a good reason. I am aware that it is not a good reason.}';
    }
    return 'Quill is in the vestry and she does not explain herself.\n\nYou were in a drowned city together for an afternoon. She told you what she needed you to know and nothing else, and you did not ask, and there was an hour in there where you could have.\n\nShe is not cold now. Cold was the thing she did when there was still a version of this where you were a person.';
  },
  choices: [
    { t: 'Tell her she is right, and that there were nine.',
      if: function (st) { return G.bondLevel('ap_quill') >= 3; }, to: 'hunt_quill_ally' },
    { t: 'Say the name Aled.',
      if: function (st) { return G.bondLevel('ap_quill') >= 2; }, to: 'hunt_quill_spare',
      peek: 'Nothing. It is the cruellest kind thing you will do tonight.' },
    { t: 'Fight her.', to: 'hunt_quill_fight', peek: 'Heavy.' }
  ]
};

S.hunt_quill_already = {
  chapter: 'The Hunt — Quill',
  beat: 'quiet',
  text: 'Nobody is waiting in the vestry.\n\nThere is a font with nothing in it, and a mark on the floor where a body was moved, some time ago, by somebody who was in a hurry.\n\nYou already did this part. You did it at the Choir, eleven minutes late, with the best information available and every good intention in the world, and she told you it was not your fault and made you say it back.\n\nShe was the one he was going to send. You saved her that, by accident, by killing her.\n\nNothing about that is a comfort, and you are going to spend years trying to make it one.',
  to: 'hunt_bit'
};

S.hunt_quill_ally = {
  chapter: 'The Hunt — Quill', art: 'quill',
  onEnter: function (st) { st.apostles.ap_quill = 'ally'; G.bond('ap_quill', 1); },
  text: '{Nine,} she says. {Thank you. That is the first number anybody has given me that added up.}\n\nAnd then Quill does the thing she is actually for, which was never fighting.\n\nShe goes down to the water and starts writing on walls. In chalk. In a dead language and three living ones. The same four sentences, over and over, at the height a frightened person\'s eyes go.\n\nYOU ARE NOT THE ONLY ONE.\nTHERE HAVE BEEN NINE.\nHE TELLS EVERYONE THEY ARE THE ONLY ONE.\nGO AND FIND THE OTHERS.\n\nIt does not help you tonight. It is going to help somebody in about forty years, in a corridor, on the worst morning of their life.',
  to: 'hunt_bit'
};

S.hunt_quill_spare = {
  chapter: 'The Hunt — Quill', art: 'quill',
  onEnter: function (st) { st.apostles.ap_quill = 'spared'; G.bond('ap_quill', 1); },
  text: '<<Aled.>>\n\nShe puts the weapon down on the font, carefully, the way she does everything.\n\n{That was unkind,} she says.\n\n{It was also correct. I am going to need a minute, and I would be grateful if you did not watch me have it.}\n\nYou wait outside the vestry for slightly longer than a minute. When she comes out she does not mention it and neither do you, and she walks with you as far as the gallery, and at the gallery she stops and says {I will not go further, I am not brave} in exactly the voice she used for Aled, and goes back.',
  to: 'hunt_bit'
};

S.hunt_quill_fight = {
  chapter: 'The Hunt — Quill',
  text: 'She is better at this than she should be. She has been practising alone in a vestry for two years with nobody there to correct her, and it shows, and it is worse that it shows.',
  combat: foe(apostleFoe('Quill', 'apostle_quill',
    'She fights the way she talks: exactly as much as is necessary and no more, with the specific contempt of somebody who has done the reading.',
    { speed: 5400 })),
  win: 'hunt_quill_dead', lose: 'fallen'
};

S.hunt_quill_dead = {
  chapter: 'The Hunt — Quill', art: 'quill',
  beat: 'quiet',
  onEnter: function (st) { st.apostles.ap_quill = 'dead'; st.bonds.ap_quill = 0; },
  text: 'She does not say anything at the end, and you understand that this is deliberate — that she has thought about what she would say, and decided that it would be for her and not for you, and that this would be unfair.\n\nIt is the most generous thing anybody does in the Below, and you are the only person who will ever know it happened.\n\nIn her coat there is a register. Two hundred and eleven names in year order, written from memory, over two years, by a woman who thought she had not been a good teacher.',
  to: 'hunt_bit'
};

/* --- Bit --- */
S.hunt_bit = {
  chapter: 'The Hunt — Bit', art: 'bit',
  quote: 'If you sign it you have to come back and cross it out yourself.',
  text: function (st) {
    var lv = G.bondLevel('ap_bit');
    if (lv >= 3) {
      return 'Bit is sitting on the plinth in the gallery with the coat across their knees and the pen in their hand. They have been crying. They have stopped. They are being extremely businesslike about the fact that they have stopped.\n\n{I did the system,} Bit says. {On him. I did the system on him and it came out wrong.}\n\n{He told me I was the only one. He told the other eight they were the only one. I know, because I have got their names, I have had their names for two years, and I never once asked any of them the one question — because it did not occur to me that there was a question.}\n\nBit holds up the coat.\n\n{There\'s nine now. Nine\'s you. He says I have to cross you out.}';
    }
    if (lv >= 1) {
      return 'Bit is in the gallery with the stick that is much too big, in a stance they have clearly practised in a mirror, and they are thirteen.\n\n{I have to,} Bit says. {It\'s not — I know what you\'re going to say. I have to, because he knows where I sleep, and he\'s always known where I sleep, and I only worked out this week that him knowing where I sleep was a thing he told me on purpose.}\n\nThe stick is shaking. Bit puts the other hand on it to stop it.';
    }
    return 'Bit is in the gallery with the stick that is much too big.\n\nYou did not sign the coat. You did not ask about the other eight. You listened to eleven minutes of a system a child built to keep strangers alive, and then you went and looked at a dead body instead.\n\nBit is not angry. Bit is thirteen and has a job.';
  },
  choices: [
    { t: 'Ask for the pen. Cross your own name out yourself.',
      if: function (st) { return st.flags.signed && G.bondLevel('ap_bit') >= 3; }, to: 'hunt_bit_ally' },
    { t: 'Tell Bit to go and cross out all eight of the others.',
      if: function (st) { return G.bondLevel('ap_bit') >= 3; }, to: 'hunt_bit_ally' },
    { t: 'Put your hands down and wait. Longer than is sensible.',
      if: function (st) { return G.bondLevel('ap_bit') >= 1; }, to: 'hunt_bit_spare',
      peek: 'A great deal, and it will not feel like it at the time.' },
    { t: 'Fight them.', to: 'hunt_bit_fight', peek: 'Heavy. They are thirteen. That does not change while you do it.' }
  ]
};

S.hunt_bit_ally = {
  chapter: 'The Hunt — Bit', art: 'bit',
  onEnter: function (st) { st.apostles.ap_bit = 'ally'; G.bond('ap_bit', 1); },
  text: 'Bit thinks about it for a long time, which is correct, because Bit thinks about everything for a long time and it is the reason Bit is alive.\n\n{All right,} Bit says. {But you have to come back and do it properly. That\'s the system. You can\'t just say it.}\n\nAnd then Bit puts the coat on — it is enormous, it has always been enormous, it was somebody else\'s — and goes down towards the water with the stick, to find eight people who have been dead for years, in order, so that each of them can be crossed out by hand.\n\nIt is not a useful thing to do. It is not going to save anybody.\n\nIt is the only funeral any of them are ever going to get, and a thirteen-year-old is going to walk a dead kingdom for a month to make sure it happens.',
  to: 'mumu_last'
};

S.hunt_bit_spare = {
  chapter: 'The Hunt — Bit', art: 'bit',
  onEnter: function (st) { st.apostles.ap_bit = 'spared'; G.bond('ap_bit', 1); },
  text: 'You put your hands down.\n\nIt takes a while. It takes much longer than it should, and there is a stretch in the middle where you are absolutely certain you have got this wrong and are about to die in a gallery to a child with a stick.\n\nBit does not do it.\n\nBit stands there with the stick up and their whole face going, and does not do it, and then sits down on the floor of the gallery very suddenly, the way children sit down, and says {I don\'t want to be the ninth one} in a voice you are going to hear for the rest of your life.\n\nYou are the ninth one. You do not correct them.',
  to: 'mumu_last'
};

S.hunt_bit_fight = {
  chapter: 'The Hunt — Bit',
  text: 'The game is not going to make this hard. Making it hard would be a lie about what it is.',
  combat: foe(apostleFoe('Bit', 'apostle_bit',
    'They are thirteen and they have a stick that is much too big, and they have practised, and you can see exactly which parts they practised, and you can see the parts nobody was there to correct.',
    { poise: 6, speed: 6400 })),
  win: 'hunt_bit_dead', lose: 'fallen'
};

S.hunt_bit_dead = {
  chapter: 'The Hunt — Bit', art: 'bit',
  beat: 'quiet',
  onEnter: function (st) { st.apostles.ap_bit = 'dead'; st.bonds.ap_bit = 0; },
  text: 'The coat is too big and it has eight names on the inside of it in eight different hands.\n\nThere is a working pen in the pocket. It still works. Somebody carried a working pen around a dead kingdom for two years so that this could keep happening, and it kept happening, and this is how it stops.\n\nYou could cross out the eight names. You have the pen. Nobody is stopping you.\n\nIt would not be the system. The system was that they had to do it themselves.',
  to: 'mumu_last'
};

/* --- Mumu, last --- */
S.mumu_last = {
  chapter: 'The Hunt — after', art: 'mumu',
  redirect: function (st) { return st.flags.met_mumu ? null : 'deep_speaks'; },
  text: function (st) {
    var lv = G.bondLevel('mumu');
    if (lv >= 3) {
      return 'She is at the edge of the room, which is where she always is.\n\n{That\'s all of them,} Mumu says. {That\'s all there are. He hasn\'t got anybody left to send, which means the next thing he does is the thing he does himself, and I have never once got to see what that is.}\n\nShe comes closer than she has come before. Not close. Closer.\n\n{Listen. I am going to be behind you the whole way and I am not going to come in, because if I come in I will talk. So here is what I am instead.}\n\n{He is fast. He is faster than anything you have fought, and he gets worse the longer it goes, because he is not tired and you are the ninth person he has done this to.}\n\n{But he has never once been hit by somebody who already knew what he was when they walked in. Nine times he has had four seconds of somebody working it out in the doorway. You are going to walk in already knowing.}\n\n{That is worth double everything you have got. Don\'t spend it on a sentence.}';
    }
    if (lv >= 1) {
      return 'She is at the edge of the room.\n\n{That\'s all of them,} Mumu says. {Whatever he does next, he does himself.}\n\nShe does not come closer. You never asked her name and she never offered it, and there is a whole conversation the two of you did not have, and you are going into the last room without it.\n\n{Good luck,} she says. It is not much. It is the most she has said to anybody in two hundred years.';
    }
    return 'Something is standing at the edge of the room.\n\nIt has been standing at the edge of every room since the first minute of this. You have never once gone over.\n\nIt does not follow you out.';
  },
  to: 'deep_speaks'
};

S.deep_speaks = {
  chapter: 'The Deep', art: 'deep',
  beat: 'quiet',
  quote: 'It has not spoken in three centuries. It does not waste the words.',
  text: 'You get through the last of them, and then there are no more of them, and you are standing in the dark bleeding into water that has been rising for three hundred years.\n\nAnd the dark speaks.\n\nIt has not done that before. It has not done that in three centuries, to anybody, which you will not find out until much later and from somebody else.\n\n||It says it has been looking for him.||\n\n||It says it is not what he told you it was, and that it has never been rising, and that it has been reaching — the entire time, upward, patiently, for exactly one thing.||\n\n||It says it cannot get to the room he is in.||\n\n||It says: but you can be got to the room he is in.||\n\nAnd it picks you up.',
  to: 'mangod_fight'
};

S.mangod_fight = {
  chapter: 'An ordinary room',
  combat: foe(manGod), win: 'ending_blackhand_scene', lose: 'fallen'
};

S.ending_blackhand_scene = { ending: 'blackhand' };

/* ---------------- the bright waking ---------------- */
S.bright_waking = {
  chapter: 'The Bright Waking — the last turning',
  beat: 'quiet',
  quote: 'It has always been a key. A hand is not for closing things.',
  text: function (st) {
    var open = '';
    if (st.sealIntact) {
      open = 'Far below you, something that should have stopped holding an hour ago does not stop holding.\n\nThe Sealed One has nothing left to give and gives it anyway, and the waking is slow because of that, and slow is a whole extra breath, and a breath is the difference between this being a fight and this being a thing that happens to you.\n\n';
    }
    var friends = Object.keys(st.bonds).filter(function (k) { return st.bonds[k] >= 2 && k !== 'mumu'; });
    var withYou = friends.length
      ? ((api.BONDNAMES[friends[0]] || {}).name || 'Somebody') + ' is behind you and will not go, and there is no argument to be had about it, and you do not make one.\n\n'
      : 'There is nobody behind you. You came down here alone in every way a person can, and you are about to find out what that is worth.\n\n';
    return 'You put the fifth one in.\n\nThe five Fingers go together the way a hand goes together, because that is what they are, and they were never a seal, and a hand is not for closing things.\n\nIt is a key. It has always been a key. You have spent the whole of the Below being the arm that turns it.\n\n' + open + withYou +
      'He is not in the chamber when she opens her eyes. He was never going to be in the chamber.';
  },
  combat: foe(brightOne), win: 'after_bright', lose: 'ending_ashlight_scene'
};

S.ending_ashlight_scene = { ending: 'ashlight' };

S.after_bright = {
  chapter: 'After',
  text: 'It is over and nothing is fixed.\n\nShe is out. The Below is dark and it is not going to burn, and the dark was never the thing that was going to kill anyone. The dark is just where you live now.\n\nHe is somewhere. You will not find him; there is no room he is standing in that you have a door to. You know that as a fact in your chest before you know it as a thought.\n\nSo it comes down to what you do with the rest of it, which is the only part of this that was ever actually yours.',
  choices: [
    { t: 'Stay. There is a whole kingdom down here with nobody minding it.',
      to: function (st) { return st.flags.carried ? 'ending_carried_scene' : 'ending_oldbones_scene'; } },
    { t: 'Kneel. She is still here, in pieces, and she is still the only thing that ever told you the truth about what you are.',
      to: 'ending_sixth_scene' },
    { t: 'Go down and take the Sealed One\'s place, so that it can stop.',
      to: 'ending_longquiet_scene' },
    { t: 'Give yourself to the Deep, all of it, so that it never has to reach again.',
      to: 'ending_trade_scene' }
  ]
};

S.ending_oldbones_scene = { ending: 'oldbones' };
S.ending_carried_scene = { ending: 'carried' };
S.ending_sixth_scene = { ending: 'sixth' };
S.ending_longquiet_scene = { ending: 'longquiet' };
S.ending_trade_scene = { ending: 'trade' };

/* ------------------------------------------------------------------ */
/* falling — every turning point is a place you can be put back to     */

S.fallen = {
  chapter: 'Falling',
  text: 'The light in you goes down to almost nothing.\n\nThis is the part where the Deep decides, and it is in no hurry, and there is a long moment in the dark where you are aware of being considered.\n\nYou can feel the last place you were sure of yourself. It is behind you, and it is not far, and going back to it costs something you will not be able to name afterwards.',
  choices: [
    { t: function (st) { return 'Go back to ' + G.lastCheckpoint() + '.'; },
      if: function () { return G.hasCheck(); },
      do: function () { G.restoreCheckpoint(); } },
    { t: 'Let go.', to: 'ending_hollow_scene' }
  ]
};

/* resolve function-valued labels at scene entry */
(function resolve(ids) {
  ids.forEach(function (id) {
    var sc = S[id]; if (!sc) return;
    var old = sc.onEnter;
    sc.onEnter = function (st) {
      if (old) old(st);
      (sc.choices || []).forEach(function (c) {
        if (typeof c.t === 'function') { c._fn = c._fn || c.t; c.t = c._fn(st); }
        else if (c._fn) c.t = c._fn(st);
      });
    };
  });
})(['choir_mangod', 'fallen']);

import { api } from './registry.js';

/* Sudden Death — arc two: the Below */
  var G = api, S = G.SCENES, I = G.ITEMS;

  /* ---------------- items ---------------- */
  I.lumaflies = {
    name: 'A jar of pale flies', uses: 2,
    desc: 'They are warm and they are dying and they do not mind. One jar, two good breaths of light.',
    use: function (st, ctx) {
      G.heal(2); G.sfx.heal();
      return ctx.combat ? { combatMsg: 'You crack the jar. Light goes into you where the hole was.' }
                        : { toast: 'Light goes into you where the hole was.' };
    }
  };
  I.wax = {
    name: 'A knuckle of pale wax', uses: 3,
    desc: 'Chew it and the air comes easier for a while. It tastes like a church.',
    use: function (st, ctx) {
      st.breath = st.breathCap; G.drawHud(); G.sfx.heal();
      return ctx.combat ? { combatMsg: 'The air comes easier.' } : { toast: 'The air comes easier.' };
    }
  };
  I.nailchip = {
    name: 'A chip of old nail', uses: 1,
    desc: 'Someone broke a weapon here a long time ago. This is the part that was doing the work.',
    use: function (st, ctx) {
      if (!ctx.combat) return { toast: 'Nothing here is worth breaking it on.' };
      api.Combat.damageFoe(2);
      return { combatMsg: 'You put the chip through it, underhand, ugly. It folds.' };
    }
  };
  I.fingerbone = {
    name: 'Fingers', uses: 99,
    desc: function () { return 'Five were promised. They are heavier than they look and none of them are cold.'; },
    use: function (st) { return { toast: 'You have ' + st.fingers + '. He says you need five.' }; }
  };
  I.palefruit = {
    name: 'A pale fruit', uses: 1,
    desc: 'You were told not to. It smells like the inside of a peach and the outside of a grave.',
    use: function (st) { return { go: 'ending_breakfast_scene' }; }
  };

  api.BONDNAMES = api.BONDNAMES || {};
  api.BONDNAMES.c_tallow = { name: 'Tallow', note: function (l) { return l >= 3 ? 'Tallow talks less around you now, which from Tallow is a declaration.' : 'Tallow has decided you are worth the noise.'; } };
  api.BONDNAMES.c_quill = { name: 'Quill', note: function (l) { return l >= 3 ? 'Quill has started saying things out loud before she is certain of them, which she has not done in years.' : 'Quill is assessing you and has not finished.'; } };
  api.BONDNAMES.c_bit = { name: 'Bit', note: function (l) { return l >= 3 ? 'Bit walks on your left now, always, so your good hand is free.' : 'Bit is too young to be down here and knows it.'; } };
  api.BONDNAMES.four = { name: 'Four', note: function () { return 'Not a friend. Not a stranger either, not any more.'; } };

  /* ---------------- combat definitions ---------------- */
  function foe(o) { return function () { return o; }; }

  var quietOne = {
    art: 'husk',
    pattern: [0,1,2,3,0,2,1,3],
    speed: 9000,
    name: 'A Quiet One, still walking',
    poise: 6,
    intro: 'It has been standing in the dark for longer than your country existed. It has your mask. A worse version of your mask.\n\nIt notices you the way a door notices weather.',
    outro: 'It comes apart into dust that is mostly cloth.\n\nThere is nothing in the mask. There was never going to be.',
    tells: [
      { t: 'Its shoulder drops and the arm draws back slow, the way you swing something heavy.', a: 'slip',
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
    art: 'serpent',
    pattern: [1,0,2,0,3,1,2,3],
    speed: 8200,
    name: 'Something patient in the water',
    poise: 7,
    intro: 'It is long and it is under the surface and it has been listening to you walk for twenty minutes.\n\nWhen it comes up it does not splash. That is the part that stays with you.',
    outro: 'It sinks. The water closes over the place where it was and goes back to being water.',
    tells: [
      { t: 'It rears, gathers, and the whole length of it winds up behind the head.', a: 'slip',
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
        ok: 'You get your back to a wall and your breath back in your chest.',
        bad: 'The smooth water was not an invitation.' }
    ]
  };

  var longArmed = {
    art: 'warden',
    pattern: [0,0,1,2,3,1,0,2],
    speed: 7400,
    name: 'The Long-Armed',
    poise: 8,
    intro: 'It was somebody\'s idea of a guard, once, and nobody has told it that the thing it guards is gone.\n\nIts arms reach the walls on both sides of the gallery at the same time.',
    outro: 'It kneels, slowly, the way something kneels when it has been standing at a door for three hundred years and is finally allowed to stop.',
    tells: [
      { t: 'It hauls one arm across the whole width of the gallery, wall to wall, slow and total.', a: 'slip',
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
      { t: 'It folds both arms in and stands very tall and very still, out of range, waiting for you to come to it.', a: 'focus',
        clear: 'It is waiting. Use it.',
        ok: 'You do not go to it. You stand where you are and you put yourself back together.',
        bad: 'It was not as far away as it looked.' }
    ]
  };

  var keeper = {
    art: 'keeper',
    pattern: [0,1,2,1,3,0,2,0,1,3],
    speed: 6400,
    name: 'What the seal keeps',
    poise: 10,
    intro: 'It is not a guard and it is not an animal. It is the shape three hundred years of holding makes when it finally gets to move.\n\nIt does not want anything. That is what makes it awful.',
    outro: 'It stops. Not defeated — finished, the way a sentence finishes.',
    phase: { at: 5, index: 2, a: 'slip', text: 'It changes. The stillness is not stillness any more — when the light goes out now, that is the wind-up, and you have half a second to unlearn everything the last four minutes taught you.' },
    tells: [
      { t: 'The whole room leans. Something enormous is being drawn back behind it.', a: 'slip',
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

  var apostle = function (n, flavour) {
    return {
      name: n,
      art: n === 'Four' ? 'four' : 'apostle',
      poise: 8,
      speed: 6000,
      pattern: [1, 0, 2, 3, 0, 1, 2, 0],
      intro: flavour,
      outro: 'They go down. Under the mask is a face about your age. There is always a face about your age.',
      tells: [
        { t: 'They drop the shoulder and load the back leg. You have seen this in a mirror.', a: 'slip',
          clear: 'Loading. Move.', ok: 'You slip it. It is like slipping yourself.', bad: 'They are better at it than you.' },
        { t: 'They come in tight and fast and do not commit — three short ones at the guard.', a: 'guard',
          clear: 'Short, tight, at the guard. Hold.', ok: 'You hold. They learn nothing. Neither do you.', bad: 'The third one is not like the first two.' },
        { t: 'They plant to swing and there is a beat in the middle of it where nothing is covered.', a: 'strike',
          clear: 'Nothing covered. Now.', ok: 'You take the beat. They make a sound that is not a monster\'s sound.', bad: 'There was no beat. You invented it.' },
        { t: 'They step back out of range and set their feet and simply look at you.', a: 'focus',
          clear: 'They have stopped. Breathe.', ok: 'You breathe. So do they. Neither of you enjoys this.', bad: 'Looking at you was the attack.' }
      ]
    };
  };

  var brightOne = {
    art: 'radiance',
    pattern: [0,1,0,2,3,1,2,0,1,3],
    speed: 5200,
    name: 'The Bright One',
    poise: 13,
    intro: 'She is not a monster and the game will not pretend she is.\n\nShe is enormous and she is beautiful and she has been asleep under everything you have walked on, and she did not ask to be woken, and the last thing she remembers is burning a world down because it stopped saying her name.\n\nShe looks at you. She knows exactly who sent you. You can see her decide that it does not matter, and that decision is the most frightening thing in the Below.',
    outro: 'The light goes out of her the way light goes out of a window at the end of a day.\n\nShe is not angry at the end. She says something and it is not for you, and the Below is dark and cold and yours.',
    phase: { at: 7, index: 0, a: 'guard',
      text: 'She stops circling. What was a wind-up is now a wall of light arriving all at once, and there is nowhere in this chamber to go that is not in it.',
      clearText: 'The whole chamber fills with light and there is no outside of it.' },
    tells: [
      { t: 'She draws the light back into herself and the chamber goes dim from the edges in.', a: 'slip',
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
      { t: 'She sits back on herself, dim, almost small, and the air in the chamber goes still and cold.', a: 'focus',
        clear: 'She has gone quiet. Take it.',
        ok: 'You take the quiet. You breathe in a room with her in it.',
        bad: 'You look away from her. In here, that is the mistake.' }
    ]
  };

  var manGod = {
    art: 'mangod',
    pattern: [0,1,2,0,3,1,0,2,1,3],
    speed: 4600,
    name: 'Man-God',
    poise: 15,
    intro: 'He is standing in an ordinary room.\n\nThat is the worst of it. There is a chair. There is a cup with something in it. He has been here the whole time, and he is not enormous, and he is not glowing, and he looks up when the dark puts you down on his floor and he says your name the way he always has, warmly, and with the very slight relief of a man whose appointment has arrived.\n\n<<{Nine,}>> he says. He does not correct it this time.',
    outro: 'He is very surprised.\n\nThat is the whole of it, in the end. Not afraid, not sorry. Surprised — the specific, offended surprise of someone who has never once had a tool do this.',
    phase: { at: 8, index: 3, a: 'strike',
      text: 'He stops being warm. It happens between one word and the next, and there is nothing underneath it — no second face, no true form. Just a man who has stopped bothering. When he steps back now, he is not giving you room. He is winding up.' },
    tells: [
      { t: 'He talks, and while he talks he moves, and the movement is the part that is happening — a long lazy sweep of the arm with three hundred years behind it.', a: 'slip',
        clear: 'The talking is cover. The arm is the thing. Move.',
        ok: 'You move while he is still being charming and the charm hits the wall instead.',
        bad: 'You listened. Of course you listened. You have been listening for the whole game.' },
      { t: 'He comes forward fast with both hands, close, almost fond, like someone taking your face to tell you something important.', a: 'guard',
        clear: 'Close and fond. Hold.',
        ok: 'You hold him off. Up close he smells like a classroom.',
        bad: 'He takes your face and tells you something important.' },
      { t: 'He laughs at something and for a second he is genuinely, helplessly amused, and completely undefended.', a: 'strike',
        clear: 'He is actually laughing. Now.',
        ok: 'You hit him while he is laughing. The laugh keeps going for half a beat after it should have stopped.',
        bad: 'The laugh was on purpose. Everything is on purpose.' },
      { t: 'He steps back, spreads his hands, and offers you a reasonable way out of this. It is a good offer. It is the best offer anyone has made you.', a: 'focus',
        clear: 'He is buying time. Use it too.',
        ok: 'You take the moment he wanted to spend on you and spend it on yourself instead.',
        bad: 'You take the offer seriously, for one second, and one second is the whole price.' }
    ]
  };

  /* ---------------- the waking ---------------- */
  var WAKES = [
    { where: 'a flooded chapel', text:
      'You come back on in water up to your knees.\n\nThe first sound in the world is your own breath, close and wrong, because there is something on your face. The second sound is the water moving where you moved it.\n\nThe chapel has no roof and no sky either — just rock, a long way up, and a drowned window with nothing behind it.\n\nThere is something in the flooded doorway. A shape, standing, watching you come back. By the time you have turned your head properly it is not there, and the water where it was standing is still going in rings.' },
    { where: 'a buried train car', text:
      'You come back on in the dark, lying down, in air that has been breathed already.\n\nThe first sound in the world is your own breath, close and wrong, because there is something on your face. The second is something moving, two cars down, that stops when you stop.\n\nYou are in a train. It is on its side and it is underground and it has been here so long that roots have come in through the windows and gone out through the floor.\n\nAt the far end of the car, briefly, a shape stands in the doorway with its head slightly tilted. When you get there, there is nothing but a handprint in the dust that is smaller than yours.' },
    { where: 'a hollowed tree the size of a building', text:
      'You come back on standing up, which is worse.\n\nThe first sound in the world is your own breath, close and wrong, because there is something on your face. The second is singing, very far off, which stops the moment you notice it.\n\nYou are inside a tree. It is the size of a cathedral and it is dead and its roots are the ceiling of somewhere else.\n\nSomething is up in the roots, sitting, with its legs over the edge, watching you. By the time you have found a way to look at it properly there is only a place where moss has been flattened by sitting.' }
  ];

  S.below_wake = {
    chapter: 'The Below',
    onEnter: function (st) {
      st.flags.below = true;
      st.ember = st.emberCap; st.breath = st.breathCap;
      st.chapter = 'The Below';
      G.drawHud();
    },
    text: function (st) { return WAKES[st.pools.wake].text; },
    choices: [
      { t: 'Take the mask off.', to: 'below_mask_off' },
      { t: 'Leave it. Stand up. Find the shape.', to: 'below_wake2', do: function (st) { st.four = 'glimpsed'; } }
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

  S.below_mangod1 = {
    chapter: 'The Below — the first turning',
    text: function (st) {
      return 'A man is sitting on the stone with his elbows on his knees, watching you do it, like someone waiting out a rain shower.\n\n' +
        '<<{Oh, good,}>> he says. <<{You kept it on. Sorry — that\'s a terrible way to say hello. I was genuinely worried. If you\'d taken that off in the first minute you\'d be a smear, and I\'d be sitting here on my own feeling awful about it.}>>\n\n' +
        'He is warm. He is funny. He is the first kind thing that has happened to you in three hundred years, and he knows your name, and he knows your school, and about four minutes into this he says <<{—like ' + '[[Mira]]' + ', right?}>> and does not explain how he knows that, and you do not make him.\n\n' +
        'He calls himself Man-God, plainly, like a job.\n\n' +
        'The dark at the bottom of the world is rising. It is called the Deep, or the Black, and it will swallow the Below and everything under it and then everything over it. There is a way to stop it. Five Fingers, scattered. Bring them together, seal the Deep, and he sends you home.\n\n' +
        'He puts the first one in your hand. It is warm.';
    },
    onEnter: function (st) {
      st.fingers = 1; G.addItem('fingerbone', 99); G.addItem('lumaflies');
      G.checkpoint('The Waking');
    },
    choices: [
      { t: 'Ask him what you are now.', to: 'below_mangod1b' },
      { t: 'Ask him how he knows her name.', to: 'below_mangod1b', do: function (st) { st.noticed++; } },
      { t: 'Take the Finger and say nothing.', to: 'below_road' }
    ]
  };

  S.below_mangod1b = {
    chapter: 'The Below — the first turning',
    text: '<<{You died,}>> he says, gently, like it is a small thing that happened to your car. <<{And the Deep kept a piece. That piece is why you\'re vertical. You\'re not a visitor here, I won\'t insult you by saying you are. You\'re one of them now. The difference is you\'ve got somewhere to get back to.}>>\n\nHe stands up and brushes off his knees.\n\n<<{Five. Then home. I\'ll find you.}>>\n\nAnd he is gone, in a way you do not see happen, and you do not see him again for a long time.',
    to: 'below_road'
  };

  /* ---------------- the road (hub) ---------------- */
  S.below_road = {
    chapter: 'The Below — the long road down',
    text: function (st) {
      if (st.flags.road_all) return 'The road goes down. It only goes down.\n\nThere is nothing else here now.';
      return 'The road down is a road, which is the strangest thing about it. Someone cut these steps. Someone carved a handrail into the rock and wore a groove in it with three hundred years of hands.\n\nThere is no hurry, except the hurry he gave you. Nothing here is on his list.';
    },
    choices: [
      { t: 'There is a shrine cut into the rock, with the lamp still lit.', if: function (st) { return !st.flags.road0; },
        do: function (st) { st.flags.road0 = true; }, to: 'road_shrine' },
      { t: 'There is a body in an alcove, sitting up, arranged.', if: function (st) { return !st.flags.road1; },
        do: function (st) { st.flags.road1 = true; }, to: 'road_body' },
      { t: 'Something is growing down here that should not be.', if: function (st) { return !st.flags.road2; },
        do: function (st) { st.flags.road2 = true; }, to: 'road_orchard' },
      { t: 'Go down.', cont: true, to: 'road_end' }
    ]
  };

  S.road_shrine = {
    chapter: 'The Below — the shrine',
    text: 'The shrine is older than the catastrophe. You can tell because the catastrophe is carved into the wall above it as a thing that has not happened yet — a warning, a prediction, a sky full of light.\n\nUnderneath, in the place where a people put the thing they are asking for help, there is a man.\n\nHe has been carved with great care and no skill. The hands are wrong. The face is not wrong. It is a face you had lunch with, near a train that has been underground for three centuries, and the stone it is cut into is older than that by a thousand years.\n\nThere is a mask shard on the shelf, put there deliberately, the way you would leave a coin.',
    onEnter: function (st) { G.doubt(1, 'carving'); },
    choices: [
      { t: 'Take the shard.', do: function (st) { G.shard('sh_shrine'); }, to: 'below_road' },
      { t: 'Leave it where somebody put it.', to: 'below_road' }
    ]
  };

  S.road_body = {
    chapter: 'The Below — the alcove',
    text: 'Somebody sat this one up and crossed its hands. That is not what happens to things that die down here. That is what happens to things that are buried.\n\nIt is wearing a mask. The mask is not almost yours. It is yours — the same maker, the same hand, the same small flaw at the left temple where the mould was tired.\n\nIn its lap, held, is a shard that is not from its own mask. Something has been visiting this body. Something has been leaving things here.',
    choices: [
      { t: 'Take the shard.', to: 'road_body_lore',
        do: function (st) { G.shard('sh_four_1', true); st.four = 'glimpsed'; } },
      { t: 'Close its hands again and go.', to: 'below_road' }
    ]
  };

  S.road_body_lore = {
    chapter: 'A memory that is not yours',
    text: '||A kitchen with the wrong number of chairs. A boy of about fifteen who has been told, that morning, by a voice from the plughole, that he is chosen — that there is a world that needs him and a door in the reservoir and a specific and important job.||\n\n||He packs a bag. He packs badly: four shirts and no food. He writes a note that says back soon and means it.||\n\n||Somewhere near the end of it there is a number. He is given it kindly. He is told it is easier this way and that he will get used to it, and he does get used to it, and that is the worst line in the whole memory.||\n\n||He was the fourth one.||',
    to: 'below_road'
  };

  S.road_orchard = {
    chapter: 'The Below — the orchard',
    text: 'It is a tree, or it was, and it has fruited in the dark against every rule you have ever heard of.\n\nThe fruit is pale and heavy and hangs low enough to reach. Cut into the trunk, in letters worn nearly smooth, someone has written the same word eleven times, and the word is %%don\'t%%.\n\nYou take one anyway, because you are a person, and people take one anyway.',
    onEnter: function (st) { G.addItem('palefruit'); G.addItem('wax'); },
    choices: [
      { t: 'Put it in the bag. Not now.', to: 'below_road' },
      { t: 'Eat it now.', to: 'ending_breakfast_scene' }
    ]
  };

  S.ending_breakfast_scene = { ending: 'breakfast' };

  S.road_end = {
    chapter: 'The Below — the cistern',
    onEnter: function (st) { st.flags.road_all = true; },
    text: 'The road ends at water, which is how everything down here ends.\n\nThe second Finger is sitting on a ledge in the middle of it, in plain sight, not hidden at all, the way you would leave keys out for someone you were expecting.\n\nYou are halfway across before the water stops being water.',
    combat: foe(waterThing), win: 'road_finger2', lose: 'fallen'
  };

  S.road_finger2 = {
    chapter: 'The Below',
    onEnter: function (st) { st.fingers = 2; },
    text: 'You take the second Finger out of the water.\n\nTwo.\n\nBelow the cistern the rock opens out into something that is not a cave, and there is light in it, blue and cold and moving, and there is singing.',
    to: 'choir_arrive'
  };

  /* ---------------- the choir ---------------- */
  var COMPANIONS = [
    { id: 'c_tallow', name: 'Tallow',
      intro: 'Tallow talks. Tallow has been alone for nine months and is making up for it at a rate that would exhaust a wedding. Tallow has opinions about the acoustics, about your mask, about the correct way to open a tin, about you.\n\nUnder all of it Tallow is doing the maths on whether you are going to get them killed, continuously, while talking about tins.' },
    { id: 'c_quill', name: 'Quill',
      intro: 'Quill taught, before. You can tell in about eleven seconds.\n\nShe is careful and she is a little cold and she gives you exactly as much information as you need, which is a kind of contempt and also the reason she is still alive. She does not ask your name for an hour. When she does, she uses it every time after that.' },
    { id: 'c_bit', name: 'Bit',
      intro: 'Bit is too young for this by several years and knows it, and has developed the specific competence of somebody who has had to be competent.\n\nBit carries a stick that is much too big. Bit has a system for everything. Bit has clearly explained the system, at length, to somebody who is not here any more.' }
  ];

  var HAZARDS = [
    { id: 'water', name: 'the water',
      body: 'The Choir is a drowned city and the drowning is not finished. There is a tide down here, three hundred years after there was any moon to pull it, and it comes up the streets in the dark.\n\nIt will be over the second-floor windows in about eleven minutes. It has been coming up while you talked.',
      wrong: 'You go up. Up is the obvious answer with water, and it is the correct answer in almost every building in the world, and this building has a sealed roof because the people who built it were trying to keep something out.' },
    { id: 'loft', name: 'the loft',
      body: 'The Choir is a drowned city and the only dry way across is a warehouse loft, and the warehouse has been holding its breath since before your language existed.\n\nYou can hear the countdown in the structure. Everybody can. It is not a metaphor; it is a beam, and it is making a sound that beams make once.',
      wrong: 'You go fast. Fast is right in a collapse, everybody knows fast is right, and you are eight steps in when you understand that this floor was only ever going to hold for somebody moving slowly enough not to load it.' },
    { id: 'song', name: 'the singing',
      body: 'The Choir is a drowned city, and the city is still singing.\n\nIt is not beautiful and it is not evil. It is the dead doing the last thing they were doing, over and over, and the sound of it moves things in the water that are attracted to sound.\n\nSilence is survival. Silence, and the fact that neither of you can hear the other coming either.',
      wrong: 'You call out. Once. To find them, to tell them where you are, because it is dark and they are frightened and every decent instinct in your body is screaming that you do not leave a person alone in the dark.' } ];

  function comp(st) { return COMPANIONS[st.pools.companion]; }
  function haz(st) { return HAZARDS[st.pools.hazard]; }

  S.choir_arrive = {
    chapter: 'The Choir',
    text: function (st) {
      return 'The Choir was a city and is now a ceiling with a city under it.\n\n' + comp(st).intro + '\n\nThey have been trying to get across for two days. They have not, because of ' + haz(st).name + '.\n\n' + haz(st).body;
    },
    onEnter: function (st) { G.bond(comp(st).id, 1); G.checkpoint('The Choir'); },
    to: 'choir_mangod'
  };

  S.choir_mangod = {
    chapter: 'The Choir — the second turning',
    text: function (st) {
      return 'He is sitting on a windowsill with his heels against the wall.\n\n<<{Right,}>> Man-God says, without preamble, without a hello, in the voice of a man who has been watching this for ten minutes and has had enough. <<{Listen. You\'re going to want to do the obvious thing. Don\'t.}>>\n\n' +
        'And he tells you, exactly, in about forty words, what to do instead. It is specific. It is counterintuitive. It involves ' + ({
          water: 'going down before you go up, through a flooded level, because the sealed roof is a trap and the cellar stair comes out on the far side above the tideline',
          loft: 'going slowly, and putting your weight where the floor is already broken, because the broken parts have already found their bearing',
          song: 'not calling out, not once, for any reason, and trusting a person you met an hour ago to be where a person would be'
        })[haz(st).id] + '.\n\n<<{Third Finger\'s in the vestry, by the way. Take it on the way. And don\'t be a hero, you haven\'t got the hit points.}>>\n\nThen he is not on the windowsill.';
    },
    choices: [
      { t: 'Do exactly what he said.', to: 'choir_resolve_good' },
      { t: function (st) { return 'Do the obvious thing instead. ' + comp(st).name + ' is right there.'; }, to: 'choir_resolve_bad' },
      { t: 'Ignore him and go and look at the problem yourself first.', to: 'choir_explore' }
    ]
  };

  S.choir_explore = {
    chapter: 'The Choir',
    onEnter: function (st) { G.doubt(1, 'refuse_choir'); },
    text: function (st) {
      return 'You do not take the advice and you do not do the obvious thing. You go and look.\n\n' +
        'It takes eleven minutes you did not think you had, and it is eleven minutes of ' + comp(st).name + ' watching you not rescue them.\n\n' +
        'And there is a second way. It is not better than his. It is not worse. It is just there, and it has been there since before either of you arrived, and nobody had to tell you about it.\n\n' +
        'There are tracks in the silt at the bottom of it. Someone came this way already, recently, and did not stay, and did not help.';
    },
    choices: [
      { t: 'Take your own way across.', to: 'choir_resolve_own' },
      { t: 'Look at the tracks properly first.', to: 'choir_tracks' }
    ]
  };

  S.choir_tracks = {
    chapter: 'The Choir',
    text: '||Somebody stood here for a while. Long enough for the silt to settle around their feet twice.||\n\n||They were watching the loft, or the water, or the dark where the singing is. Then they went back the way they came, and the tracks going back are deeper, which means whatever they came here to do, they did not do it, and they carried it out with them.||\n\nThere is a shard pressed into the silt where the heel was. It has been put there. It is the second one.',
    onEnter: function (st) { G.shard('sh_four_2', true); st.four = 'glimpsed'; },
    to: 'choir_lore2'
  };

  S.choir_lore2 = {
    chapter: 'A memory that is not yours',
    text: '||Four Fingers, in a bag, on a bridge over a reservoir at two in the morning.||\n\n||He is nineteen by then. He has been at it for four years and he is very good and he is very tired, and the voice that talks to him has started sounding tired too, which he takes, at the time, as a compliment. Like being trusted with the real version of someone.||\n\n||He is going to be told there is a fifth. He does not know that yet. In the memory he is happy. That is the part you would take back if you could take anything back.||',
    to: 'choir_resolve_own'
  };

  S.choir_resolve_good = {
    chapter: 'The Choir',
    onEnter: function (st) { G.bond(comp(st).id, 2); st.history.followedChoir = true; st.fingers = 3; },
    text: function (st) {
      return 'It works perfectly.\n\nIt works in the specific way that makes you stop checking: not narrowly, not at a cost, but cleanly, the way a thing works when somebody competent told you how to do it.\n\n' + comp(st).name + ' comes out the other side wet and furious and alive, and looks at you like you have done something extraordinary, and you did not do anything. You did what you were told.\n\nThe third Finger is in the vestry, exactly where he said, sitting in a font.';
    },
    to: 'choir_slip'
  };

  S.choir_resolve_own = {
    chapter: 'The Choir',
    onEnter: function (st) { G.bond(comp(st).id, 2); st.history.ownWay = true; st.fingers = 3; },
    text: function (st) {
      return 'It works.\n\nNot easily, and not the way he described, and there is a bad minute in the middle where you are certain you have killed both of you. But it works, and at the end of it ' + comp(st).name + ' is sitting on a step getting their breath back, and nobody handed you anything.\n\nNo one congratulates you. No dialogue happens. There is just the small private fact, which you will not mention to him, that you did not need him for this one.\n\nThe third Finger is in the vestry. He was right about that.';
    },
    to: 'choir_slip'
  };

  S.choir_resolve_bad = {
    chapter: 'The Choir',
    onEnter: function (st) { st.flags.carried = true; st.history.lostThem = true; st.fingers = 3; G.bond(comp(st).id, 0); },
    text: function (st) {
      return haz(st).wrong + '\n\n' + comp(st).name + ' does not blame you. That is the whole problem with it.\n\nThey have about ninety seconds at the end and they spend them being decent about it, and asking you to take something to somebody who has certainly been dead for two hundred years, and you say yes.\n\nIt was a reasonable decision. Everybody you will ever explain it to will agree that it was a reasonable decision.\n\nThe third Finger is in the vestry. You take it with the wrong hand because the other one is holding their mask.';
    },
    to: 'choir_slip'
  };

  S.choir_slip = {
    chapter: 'The Choir',
    text: function (st) {
      return 'He is waiting at the mouth of the culvert to walk you out, which he has not done before.\n\nHe is easy about it. He asks how it went. He is funny about the singing. At one point you hand him the third Finger to look at and he turns it over and hands it back and says:\n\n<<{Sure thing, Nine — }>>\n\n<<{ — sorry. You know what I mean.}>>\n\nHe carries on with the sentence he was in the middle of.';
    },
    choices: [
      { t: 'Ask him what he just called you.', to: 'choir_slip_push', do: function (st) { G.doubt(2, 'slip'); st.noticed++; } },
      { t: 'Nothing. He misspoke. People misspeak.', to: 'gallery' }
    ]
  };

  S.choir_slip_push = {
    chapter: 'The Choir',
    text: '<<{Called you what?}>> he says, and then — genuinely, you would swear to it — he laughs. <<{Oh. Habit. Sorry. I\'ve been doing this a long time and there was a stretch where it was easier to — look, it\'s a bad habit and it\'s rude and I\'ll stop.}>>\n\nAnd he does stop. He never does it again.\n\nHe is so convincing. That is not a description of him lying; you have no evidence that he is lying. It is a description of the fact that you cannot tell.\n\nIt proves nothing. That is what you will keep coming back to, later, in the dark, on your own: it proves absolutely nothing, and you have been counting it as proof since the second it happened.',
    to: 'gallery'
  };

  /* ---------------- gallery ---------------- */
  S.gallery = {
    chapter: 'The Long Gallery',
    text: 'The gallery runs for a mile under the roots of something and it was built to impress people who are all dead.\n\nHalfway along there is an Apostle, if that is what they are. Nobody has told you that word yet.\n\nThey are face down and they have been dead for a while and their mask is the same as yours. Not similar. The same flaw at the left temple. The same maker. Four hundred years between when this one was made and when yours was, and the same tired mould.\n\nThere is a shard beside them. It is not from their mask either.',
    onEnter: function (st) { G.doubt(1, 'body2'); },
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
    text: 'The bottom of everything is a room with a chain in it.\n\nThe thing in the chain has been holding the light in since before your grandparents\' grandparents. It is enormous and it is bowed and it is full. You can see it being full. Whatever is in it is trying to get out at a rate of about one attempt per second, forever, and has been doing that since before there was a Below to hold it under.\n\nIt looks at you. It has been alone for three hundred years and the first thing it does, when it sees you, is try to warn you, and it cannot speak, and so it does the only thing it can do.\n\nIt pulls the chain tighter.\n\nThe fourth Finger is set into the seal at its feet.',
    onEnter: function (st) { G.doubt(1, 'sealed_memory'); G.checkpoint('The Sealed One'); },
    to: 'seal_mangod'
  };

  S.seal_mangod = {
    chapter: 'The Sealed One — the third turning',
    text: function (st) {
      var lead;
      if (st.history.lostThem) {
        lead = '<<{You\'ve already lost one,}>> he says, quietly, not cruelly. <<{I\'m not going to pretend I don\'t know that. And I\'m not going to tell you it wasn\'t your fault, because you wouldn\'t believe me and you\'d be right not to. What I\'ll tell you is that there\'s a number of people the Deep gets if we stop here, and it isn\'t one.}>>';
      } else if (st.history.ownWay) {
        lead = '<<{You didn\'t need me at the Choir,}>> he says, and he sounds pleased, actually pleased. <<{I noticed. So I\'m going to talk to you like someone who checks. Check this: what\'s holding the light in is also holding the light in. It is a lid. Lids go both ways. That thing has been the only thing keeping the Below dark for three centuries and everybody down here has agreed not to say it.}>>';
      } else if (Object.keys(st.bonds).some(function (k) { return st.bonds[k] >= 3; })) {
        lead = '<<{Think about who\'s upstairs,}>> he says. <<{Not humanity. I don\'t care about humanity and neither do you, not really. The one person. The specific one. Think about the Deep coming up through the floor of wherever they\'re sleeping tonight, and then tell me you want to be careful.}>>';
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
    chapter: 'The Sealed One',
    onEnter: function (st) { st.four = 'warned'; },
    text: 'There is somebody standing in the dark at the top of the chamber steps.\n\nThey have been there for a while. They are wearing a mask that is the same as yours and they are not moving and they are not coming down.\n\nThey say one word. It is the only completely unambiguous thing anybody says to you in three hundred years.\n\n||{Don\'t.}||\n\nThey do not explain. They do not come down. They wait, for about four seconds, to see what you are going to do, and four seconds is not very long to weigh a stranger in a mask against a warm voice that has been right every single time.',
    choices: [
      { t: 'Break it anyway.', to: 'seal_break' },
      { t: 'Stop. Listen to the stranger.', to: 'seal_refuse', do: function (st) { G.doubt(2, 'refuse_seal'); } },
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
    text: function (st) {
      return 'You say no.\n\nHe does not argue. That is the first genuinely frightening thing he does — he does not argue at all. He looks at you for a moment and he nods and he says <<{okay}>>, and he means it, and he walks up the steps past the shape in the mask without appearing to see it.\n\nThree hours later you find the fourth Finger on a ledge outside the chamber, sitting in plain sight, warm, where it was not before.\n\nHe got it. He did not need you to do it. He wanted you to be the one who did it, and you will spend a long time working out why, and when you work it out it will be too late to be useful.';
    },
    onEnter: function (st) { st.fingers = 4; },
    to: 'ascent'
  };

  S.seal_alt = {
    chapter: 'The Sealed One',
    onEnter: function (st) { st.fingers = 4; st.four = 'warned'; G.doubt(2, 'alt_seal'); },
    text: 'There is a third way and it is buried and it is nearly nothing.\n\nThe seal is set into a floor, and floors have undersides, and three hundred years of one enormous thing straining upward has opened a gap at the joint you could get an arm into if you were willing to put an arm somewhere you cannot see.\n\nIt costs you. Something under there takes a serious interest in your arm and you come back with less of it than you went in with, and the Finger, and the seal entirely whole.\n\nUp at the top of the steps, the figure in the mask watches you do it, and does not leave when you look at them, and does not come down either.\n\nThey are still standing there when you go. You are fairly sure that is the closest thing to approval anybody down here has ever given anybody.',
    to: 'ascent'
  };

  S.seal_after = {
    chapter: 'The Sealed One',
    text: 'The chamber is quiet.\n\nThe Sealed One is still holding. It will hold for a while yet; not forever, not now, but for a while. It does not look at you again.\n\nThe fourth Finger comes out of the broken seal warm, like the others.\n\nFour.',
    to: 'ascent'
  };

  /* ---------------- ascent ---------------- */
  S.ascent = {
    chapter: 'The climb',
    text: function (st) {
      return 'The fifth is not hidden.\n\nIt is at the top of a stair that goes up through the whole Below, past the Choir, past the gallery, past the road, and it is lying on the last step in the open like something left out for a milkman.\n\nYou pick it up and nothing happens. You stand there in the dark holding five of them, and the count is done, and every instinct you have says that a thing should happen now.\n\nHe is at the top of the stair. Of course he is.\n\n<<{Go on, then,}>> he says, and he is so happy. That is the thing that will keep you up. He is so, so happy for you.';
    },
    onEnter: function (st) { st.fingers = 5; G.checkpoint('The climb'); },
    choices: [
      { t: 'Put the fifth one in.', to: 'bright_waking',
        peek: 'Everything. It costs everything, and it always did.' },
      { t: 'Say it out loud. Tell him you know what he is.',
        if: function (st) { return st.doubt >= 6; }, to: 'accuse',
        peek: 'It costs more than the other one. That is not the same as costing worse.' },
      { t: 'Drop all five down the hole you just climbed out of.', to: 'ending_fingers_scene',
        peek: 'Nothing. It costs nothing at all, which is its own kind of answer.' }
    ]
  };

  S.ending_fingers_scene = { ending: 'fingers' };

  /* ---------------- accuse / hunt ---------------- */
  S.accuse = {
    chapter: 'The climb',
    text: 'You say it.\n\nYou say it badly, because there is no good way to say it, and it comes out as a list: a carving older than the catastrophe, a mask with your flaw in it on a body four hundred years dead, a number instead of a name, a seal that was never a seal, and a man who has been right about everything, which is not a thing people are.\n\nHe listens to all of it. He does not interrupt once. When you have finished he is quiet for a moment, and then he says <<{okay}>>, exactly the way he said it at the seal, and he is gone before the word has finished.\n\nNothing happens that night.\n\nThey come the next one.',
    to: 'hunt1'
  };

  S.hunt1 = {
    chapter: 'The Hunt',
    text: 'There are more of them than you can count and they are not monsters.\n\nThey are people from other worlds, wearing masks with tired flaws in them, and every single one of them was told, on an ordinary morning, that they were chosen.\n\nThe first one finds you in the gallery.',
    combat: foe(apostle('An Apostle', 'They fight like you. Exactly like you. Every habit you have, they have, because the same voice taught both of you in the same warm patient way.')),
    win: 'hunt2', lose: 'fallen'
  };

  S.hunt2 = {
    chapter: 'The Hunt',
    text: 'You do not get to rest. That is the design of it.\n\nThe second one has been waiting where you were going to go, because they know where you were going to go, because they have been you.',
    combat: foe(apostle('Another Apostle', 'This one talks. Not much, and not to you — they are keeping a count, out loud, under their breath, and the number they are counting from is not one.')),
    win: 'hunt_four', lose: 'fallen'
  };

  S.hunt_four = {
    chapter: 'The Hunt',
    text: function (st) {
      var known = st.shards.length > 0;
      return 'The third one is standing in the water at the bottom of the chapel steps, not moving, waiting for you to get there.\n\n' +
        (known
          ? 'You know them.\n\nYou know a kitchen with the wrong number of chairs, and four shirts and no food, and a note that said back soon. You know a bridge over a reservoir at two in the morning and a bag with four Fingers in it and a boy who was happy.\n\nThey are the fourth one. They have been in every room you have been in since the first minute of this and they have never once helped you and they have never once been able to leave.'
          : 'They are the same height as you. They stand the way you stand. You have seen them before — in a doorway, in a train car, up in the roots — and you have never once got close enough to see what they wanted.') +
        '\n\nThey do not attack. They are waiting to see what you do, and they have been waiting a long time, and their whole face is a mask.';
    },
    choices: [
      { t: 'Fight them. There is no time and they are in the way.', to: 'hunt_four_fight' },
      { t: 'Say the number out loud. Not yours. Theirs.',
        if: function (st) { return st.shards.length > 0; }, to: 'hunt_four_spare' },
      { t: 'Put your hands down and wait longer than is sensible.',
        if: function (st) { return st.shards.length > 1 || st.four === 'warned'; }, to: 'hunt_four_spare' }
    ]
  };

  S.hunt_four_fight = {
    chapter: 'The Hunt',
    onEnter: function (st) { st.four = 'fought'; },
    text: 'They are the best of them, and they do not enjoy it, and neither do you.',
    combat: foe(apostle('Four', 'They fight the way somebody fights when they have already decided how this ends and are only doing the part in the middle.')),
    win: 'deep_speaks', lose: 'fallen'
  };

  S.hunt_four_spare = {
    chapter: 'The Hunt',
    onEnter: function (st) { st.four = 'spared'; G.bond('four', 3); },
    text: '<<Four.>>\n\nThat is all. You say it the way you would say a name, which is not how it has ever been said to them.\n\nThey stand in the water for a long moment. Nothing dramatic happens. They do not take off the mask; nobody down here takes off the mask. They just stop being in the way — they step aside, into the deeper water, and stand there with their hands open, and when you pass them they turn their head and follow you with it the entire time, the way you would watch someone go if you had been waiting three hundred years for somebody to go anywhere.\n\nThey do not come with you. They are not going to. But you go up the chapel steps carrying something that you did not have at the bottom of them, and you will still be carrying it at the end.',
    to: 'deep_speaks'
  };

  S.deep_speaks = {
    chapter: 'The Deep',
    text: 'You get through the last of them and then there is no more of them, and you are standing in the dark bleeding into water that has been rising for three hundred years.\n\nAnd the dark speaks.\n\nIt has not done that before. It has not done that in three centuries, to anybody, which you will not find out until much later and from somebody else.\n\n||It says it has been looking for him.||\n\n||It says it is not what he told you it was, and that it has never been rising, and that it has been reaching — the entire time, upward, patiently, for exactly one thing.||\n\n||It says it cannot get to the room he is in.||\n\n||It says: but you can be got to the room he is in.||\n\nAnd it picks you up.',
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
    text: function (st) {
      var open = '';
      if (st.sealIntact) {
        open = 'Far below you, something that should have stopped holding an hour ago does not stop holding.\n\nThe Sealed One has nothing left to give and gives it anyway, and the waking is slow because of that, and slow is a whole extra breath, and a breath is the difference between this being a fight and this being a thing that happens to you.\n\n';
      }
      var friends = Object.keys(st.bonds).filter(function (k) { return st.bonds[k] >= 2 && k !== 'four'; });
      var withYou = friends.length
        ? (api.BONDNAMES[friends[0]].name + ' is behind you and will not go, and there is no argument to be had about it, and you do not make one.\n\n')
        : 'There is nobody behind you. You came down here alone in every way a person can and you are about to find out what that is worth.\n\n';
      return 'You put the fifth one in.\n\nThe five Fingers go together the way a hand goes together, because that is what they are, and they were never a seal, and a hand is not for closing things.\n\nIt is a key. It has always been a key. You have spent the whole of the Below being the arm that turns it.\n\n' + open + withYou +
        'He is not in the chamber when she opens her eyes. He was never going to be in the chamber.';
    },
    combat: foe(brightOne), win: 'after_bright', lose: 'ending_ashlight_scene'
  };

  S.ending_ashlight_scene = { ending: 'ashlight' };

  S.after_bright = {
    chapter: 'After',
    text: function (st) {
      return 'It is over and nothing is fixed.\n\nShe is out. The Below is dark and it is not going to burn, and the dark was never the thing that was going to kill anyone. The dark is just where you live now.\n\nHe is somewhere. You will not find him; there is no room he is standing in that you have a door to. You know that as a fact in your chest before you know it as a thought.\n\nSo it comes down to what you do with the rest of it, which is the only part of this that was ever actually yours.';
    },
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

  /* fix function labels */
  (function resolve(ids) {
    ids.forEach(function (id) {
      var sc = S[id], old = sc.onEnter;
      sc.onEnter = function (st) {
        if (old) old(st);
        (sc.choices || []).forEach(function (c) {
          if (typeof c.t === 'function') { c._fn = c._fn || c.t; c.t = c._fn(st); }
          else if (c._fn) c.t = c._fn(st);
        });
      };
    });
  })(['choir_mangod']);


/* ------------------------------------------------------------------ */
/* falling — every turning point is a place you can be put back to     */

S.fallen = {
  chapter: 'Falling',
  text: function (st) {
    return 'The light in you goes down to almost nothing.\n\n' +
      'This is the part where the Deep decides, and it is in no hurry, and there is a long moment in the dark where you are aware of being considered.\n\n' +
      'You can feel the last place you were sure of yourself. It is behind you, and it is not far, and going back to it costs something you will not be able to name afterwards.';
  },
  choices: [
    { t: function (st) { return 'Go back to ' + G.lastCheckpoint() + '.'; },
      if: function () { return G.hasCheck(); },
      do: function () { G.restoreCheckpoint(); } },
    { t: 'Let go.', to: 'ending_hollow_scene' }
  ]
};
(function () {
  var sc = S.fallen, old = sc.onEnter;
  sc.onEnter = function (st) {
    if (old) old(st);
    (sc.choices || []).forEach(function (c) {
      if (typeof c.t === 'function') { c._fn = c._fn || c.t; c.t = c._fn(st); }
      else if (c._fn) c.t = c._fn(st);
    });
  };
})();

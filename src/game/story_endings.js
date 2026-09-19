import { api } from './registry.js';

/* Sudden Death — endings */
  var G = api, E = G.ENDINGS, S = G.SCENES;

  api.ENDING_ORDER = [
    'blackhand',
    'whatyoudid', 'oldbones',
    'named', 'hers', 'whatyoudid_bad', 'hollow', 'sixth', 'ashlight', 'longquiet', 'carried', 'trade',
    'detention', 'fingers', 'breakfast'
  ];

  function sealNote(st) {
    return st.sealIntact
      ? 'The seal held, because you let it. Whatever else is true, that is also true.'
      : '';
  }
  function roadNote(st) {
  if (st.flags.shortWay) return 'You were not brought down here. You came the only way that was yours, and something at the bottom of the Below has always known the difference.';
  if (st.flags.killed) return '';
  return '';
}
function fourNote(st) { return apostleNote(st); }

  var AP = { ap_tallow: 'Tallow', ap_quill: 'Quill', ap_bit: 'Bit' };

  function apostleNote(st) {
    var a = st.apostles || {}, out = [], dead = [], kept = [];
    Object.keys(AP).forEach(function (k) {
      if (a[k] === 'dead') dead.push(AP[k]);
      else if (a[k] === 'ally' || a[k] === 'spared') kept.push(AP[k]);
    });
    if (kept.length) out.push(kept.join(' and ') + ' walked out of this. Not saved. Out. It is not the same thing and it is the only thing that was ever on offer.');
    if (dead.length) out.push(dead.join(' and ') + ' did not, and every one of them was told on an ordinary morning that they were the only one.');
    if (!kept.length && !dead.length) out.push('You never learned what any of the three of them were. That is its own answer.');
    return out.join(' ');
  }

  function mumuNote(st) {
    var l = (st.bonds && st.bonds.mumu) || 0;
    if (st.flags && st.flags.mumuName) return 'Somewhere down there a woman is saying her own name out loud, once a day, so that it does not go. You are the only person in three hundred years who asked her for it.';
    if (l >= 3) return 'Mumu the Hollow is still in the Below, at the edge of a room, and for the first time since she started counting she does not know what happens next.';
    if (l >= 1) return 'You never asked her name.';
    return '';
  }

  E.oldbones = {
    title: 'Old Bones', kind: 'secret',
    blurb: 'You beat her, you stayed, and you got old. He never once had to explain himself.',
    note: function (st) { return [sealNote(st), apostleNote(st), mumuNote(st), roadNote(st)].filter(Boolean).join(' '); },
    text: function (st) {
      return 'You stay.\n\nThe first ten years are work. The Below has been a place people survive in and you make it a place people live in, badly, then less badly. You are not good at it. You are simply there every time, which turns out to be most of it.\n\nThe next twenty you are known. Children who were not born when you came down here grow up in corridors you made safe and are extremely unimpressed by you, which is the correct outcome.\n\nThe twenty after that you are old. There is light in the Below again and a great deal of it is your fault. You never take the mask off. Nobody ever asks you to.\n\nAt the end there are people in the room. That is the whole of it. There are people in the room, and one of them is holding your hand, and you are very tired, and nothing comes to collect you.\n\nYou die in a bed, three hundred years and one life away from a corridor on a Friday, as a person who was there every time.\n\nAnd in a room you never found, with a chair in it and a cup on the table, a warm and funny man is being very kind to somebody who was told this morning that they were chosen.\n\nYou did everything right. It was not the thing.';
    }
  };

  E.whatyoudid = { title: 'What You Did', kind: 'secret',
  blurb: 'You survived her. Three quiet decisions, nine seconds, and the rest of your life.',
  note: function (st) {
    return st.flags.clean
      ? 'You waited for her to commit. Four people will ask you, over the years, how you knew to wait. You will never have an answer.'
      : 'You moved first. That detail is in the transcript, and it is the one the lawyer keeps returning to.';
  },
  text: function (st) {
    return 'The eleven minutes end and the rest of it starts.\n\n' +
      'Here is what saves you, and none of it is the fight.\n\n' +
      'You were certain before she came round the corner, so you did not freeze. You had chosen the room, so there was no second where you were looking for a door. And you called it in from the floor without straightening a single thing, so that every part of the account you gave at 7:41pm still matches the building at 9:15.\n\n' +
      'It is six months of rooms with lanyards in them. It is a word — justified — arrived at slowly by adults who were mostly kind and occasionally not. It is not an acquittal in the way films do acquittals; it is a file closing, quietly, in a month when nothing else is happening.\n\n' +
      'You finish school somewhere else. You are fine, in the way that means fine except at about eleven at night.\n\n' +
      'People who know say you were brave. You were not brave. You were prepared, which is a colder word and the only true one, and the difference between the two is the entire subject of this game.\n\n' +
      'And nothing else ever happens to you. Nobody ever tells you that you were chosen. You never find out that there was an entire world underneath the rest of your life, or what it needed, or what you would have been in it.\n\n' +
      'You are at a bus stop one day, about thirty-four, and you think about crusts, and how she ate them first so the good part would be last.';
  }
};

E.whatyoudid_bad = { title: 'Tidied', kind: 'loss',
  blurb: 'You survived her and then spent the next hour making it unprovable.',
  text: function (st) {
    return 'There is a version of you that sat down on the floor and picked up the phone, and it is separated from this one by about ninety seconds of perfectly understandable panic.\n\n' +
      'The proof in your bag is worth nothing now. Everything it would have supported, you contradicted first, by moving a door and washing your hands and saying, at 8:04pm, that you had gone home at five.\n\n' +
      'It takes four days. The word that gets used is not the word that was true.\n\n' +
      'You are alive. You will be alive for a very long time. You will spend a great deal of it explaining, to people who are required to listen to you, a sequence of events that actually happened, and watching them decide not to believe the only part that was ever in your favour.\n\n' +
      'She is still sixteen. That does not change either.';
  }
};

E.blackhand = {
    title: 'The Black Hand', kind: 'win',
    blurb: 'The true one. You doubted him, survived the Hunt, and the Deep carried you to the room he was standing in.',
    note: function (st) { return [apostleNote(st), mumuNote(st), sealNote(st)].filter(Boolean).join(' '); },
    text: function (st) {
      return 'He does not get a speech.\n\nThat is the thing you decide, standing in an ordinary room over a man with a cup on the table beside him: he has had three hundred years of talking and every single word of it has been true and useful and aimed, and he does not get one more.\n\nAfterwards you sit down in his chair, because your legs go.\n\nThe Deep comes in slowly and fills the room and does not touch you. It has what it came for. It has been reaching upward for three centuries, and it was never rising, and there was never anything to seal — there was a thing in a room that it could not get to, and there was a long series of people who could.\n\nIt says one more thing to you and then it never speaks again, to you or to anyone. It says thank you. It says it the way you would say it to a hand.\n\nYou go back down into the Below, which is still dark, which still has her in it somewhere, unwoken, which still has everything in it that was in it before. You have fixed nothing. You have just ended the part where somebody was doing it on purpose.\n\n' + (function () {
        var a = st.apostles || {};
        var kept = Object.keys(AP).filter(function (k) { return a[k] === 'ally' || a[k] === 'spared'; }).map(function (k) { return AP[k]; });
        var dead = Object.keys(AP).filter(function (k) { return a[k] === 'dead'; }).map(function (k) { return AP[k]; });
        var bits = [];
        if (kept.length) bits.push('And ' + kept.join(' and ') + ' find out about it the way anybody down here finds out about anything, which is a month late, from a stranger, badly. Nobody throws a party. ' + (kept.length > 1 ? 'They sit' : 'They sit') + ' with it for a while and then go back to the small stupid work of a kingdom that has nobody minding it.');
        if (dead.length) bits.push('And ' + dead.join(' and ') + ' are not there, because you went through them to get here, and every one of them was somebody\'s kid, and being right about him does not move a single one of them.');
        if (st.bonds && st.bonds.mumu >= 3) {
          bits.push('And down at the bottom, in the chapel, a woman is standing in the water with her knees wet, waiting to die and wake up and do it again.\n\nShe does not. The morning comes and she is still there, and the next one, and the one after that, and on the fourth day she sits down on the steps and cries for six hours, which is the longest she has been able to afford in three hundred years.');
        } else if (st.flags && st.flags.met_mumu) {
          bits.push('And somewhere at the edge of a room there is a woman who has done this eleven times and will not have to do it again, and you never got close enough to learn what she was called.');
        }
        return bits.join('\n\n');
      })();
    }
  };

  E.hers = {
    title: 'Hers', kind: 'loss',
    blurb: 'She didn\'t kill you. She kept you.',
    text: 'She believes you.\n\nThat is the ending. She believes you, completely, and she puts down what she was holding and she cries and she holds on to you for a very long time in an empty corridor, and somewhere in the middle of it the shape of the rest of your life is quietly decided without anybody saying anything about it.\n\nYou do not go to hospital. You do not give a statement. You go to school on Monday and she saves you a seat.\n\nThings get smaller. Not fast. Over about eight months, in increments none of which are worth ending a friendship over — who you sit with, then who you text, then which route you walk, then what you say when someone asks how you are.\n\nShe is never cruel to you. Not once, not ever, in the whole of it.\n\nYou are alive. You are, as she keeps saying, the luckiest person she has ever met. And you are twenty-four before you say a single true sentence out loud to anybody, and by then there is not much left of the person who was going to say it.'
  };

  E.hollow = {
    title: 'Hollow', kind: 'loss',
    blurb: 'Your ember ran out in the Below and the Deep took the rest.',
    text: 'The light in you goes out.\n\nIt is not painful and it is not dramatic and it takes about as long as a yawn. The piece of you the Deep kept is the piece that was holding the rest together, and it lets go, and the rest is just coat and mask and the specific arrangement of a person.\n\nWhat stands up is not you. It is not anything. It walks because walking is what the shape does.\n\nIn about forty years somebody new will come down here, wearing a mask with a tired flaw in it at the left temple, and they will meet you in a corridor, and they will have been told that morning that they are chosen.'
  };

  E.sixth = {
    title: 'The Sixth Finger', kind: 'loss',
    blurb: 'You knelt. There is a new mask with your face on it.',
    text: function (st) {
      return 'You kneel.\n\nThere is a great deal of reason to. She is the only thing in three hundred years that has not wanted anything from you — she did not send you, she did not lie to you, she did not name you. She burned a world and she is honest about it, which by this point in your life is a shattering quality in a person.\n\nThe mask comes off. That is possible now. It comes off because there is nothing underneath it to keep in.\n\nA new one is made. It takes no time at all. It has your face on it, roughly, the way a mould remembers a face, with a small flaw at the left temple because the mould is tired.\n\nAnd somewhere else, in a world with a sky in it, it is an ordinary Tuesday morning, and a kid is being told by a warm and funny voice that they have been chosen, and that there is a way to fix everything, and that it will all be explained, and the voice is being very kind about it.\n\n' + (st.flags.d_slip
        ? 'You know what number they are about to be.\n\nYou know what number you are.'
        : 'They are given a name for it. They will get used to it. Everyone does.');
    }
  };

  E.ashlight = {
    title: 'Ash Light', kind: 'loss',
    blurb: 'She won. The Below burns a second time.',
    text: 'She does not finish you out of cruelty. She finishes you the way you would put down a tool that has stopped being useful, with a small amount of regret for the tool.\n\nThen she goes up.\n\nThe Below takes four days. It is not fire exactly; it is light, and light in a place with no sky is the same thing as fire with better manners. The Choir stops singing. The gallery becomes a shape. The Sealed One is the last thing to go, still holding, holding a thing that is not there any more, because the thing that was in it is outside and busy.\n\nThree hundred years ago someone made this same mistake in the opposite direction, and they built a chain and a seal and an entire kingdom of dark to fix it, and it held, and it held, and it held, and then somebody was told they were chosen.'
  };

  E.longquiet = {
    title: 'The Long Quiet', kind: 'loss',
    blurb: 'You took the Sealed One\'s place. You hold. You don\'t age, die, or live.',
    text: 'You go down and you take it off her. Off it. Off the thing that has been doing this since before any of it, which is so tired that it does not even resist the handover, which just steps back and folds up and is finally, mercifully, finished.\n\nThe chain is not heavy. That is the first surprise.\n\nThe second is that it works. It absolutely works. The Below is safe, in the specific and total way that only this arrangement has ever made it safe, and it stays that way, and people live up there and have arguments about nothing and get old.\n\nYou do not get old.\n\nYou are aware the entire time. That is the part the stories leave out. You are aware for a hundred years, and then for two hundred, and there is a thing inside you trying to get out at a rate of about one attempt per second, and you hold it, every second, correctly, forever.\n\nAnd one day somebody comes down the steps into your room, wearing a mask with a tired flaw at the left temple, and looks at you.\n\nAnd you cannot speak. And so you pull the chain tighter, which is the only warning you have, and you watch them decide what that means.'
  };

  E.carried = {
    title: 'Carried', kind: 'loss',
    blurb: 'Someone died because of a reasonable call. You finished it anyway, alone.',
    note: function (st) { return [sealNote(st), apostleNote(st), mumuNote(st)].filter(Boolean).join(' '); },
    text: function (st) {
      return 'You stay, and you do the work, and the work gets done.\n\nThe Below has light in it again. You are the reason. People who were not born yet will grow up under it and be unimpressed by you, which is correct.\n\nAnd you do the whole of it on your own.\n\nNot because nobody offers — people offer, constantly, for sixty years. Because of a warehouse, or a tide, or a sound in the dark, and a decision you made with good information and good intentions that any reasonable person would have made, and which was avoidable, which you found out about eight months later from somebody who did not know they were telling you anything.\n\nYou carry their mask the entire time. It is not a shrine and you do not talk to it. It is just in the bag, under the other things, the way a thing is in a bag.\n\nAt the end there is nobody in the room. You have outlived everyone who would have been, which is what happens, and it is nobody\'s fault, and that is the exact reason it does not help.';
    }
  };

  E.trade = {
    title: 'The Trade', kind: 'loss',
    blurb: 'Everyone lives. The light comes back. You are the price.',
    note: function (st) { return sealNote(st); },
    text: 'You give it back.\n\nEvery piece of you the Deep kept — which is the piece that has been walking, and reading tells, and holding on, and being a person for three hundred years past the point where you were entitled to be one.\n\nIt does not want it, particularly. That is almost funny. It takes it the way a tide takes a step back: because that is the arrangement, and because you asked, and because you are the only thing in the history of the Below that has ever asked it for anything instead of trying to seal it shut.\n\nAnd it stops reaching. Forever.\n\nThe Below is safe. Not held, not chained, not watched — safe, actually safe, in a way it has not been in three centuries. The light comes back on. Everyone you cared about grows old and complains about their knees. There are children. There is a second generation of children who think the story is made up.\n\nIt is the best outcome for absolutely everybody.\n\nYou do not get old. You do not get a bed, or a room with people in it, or sixty years of being unimpressive to teenagers.\n\nThat is a loss. It is a loss even though it is the right thing, and this game is not going to pretend otherwise: you won everything and you did not get the one thing, and the one thing was the whole point.'
  };

  E.named = {
    title: 'Named', kind: 'loss',
    blurb: 'You said out loud what he was, where the dark could hear you. He asked you for one thing.',
    note: function (st) {
      return st.flags.namedHow ? 'You said it ' + st.flags.namedHow + '.' : '';
    },
    text: function (st) {
      return 'You say it out loud.\n\nIt is a good sentence. It is true, and it is brave, and it is the most useful thing anybody could have told the person standing in front of you, and it takes about two seconds to say.\n\nThe Below stops.\n\nNot the way a room goes quiet. The way a machine stops — everything at once, the singing and the water and the small sounds behind the walls, all of it, in the same instant, as though the entire kingdom has turned its head.\n\nYou have about a breath and a half to understand that he was not warning you. He was telling you how he does it.\n\nIt is not a monster. There is nothing to fight. It is simply that the dark comes and checks, and checking is not a thing you survive, and it takes no longer than the sentence did.\n\nThe last thing you hear is the person you said it to, saying your name, and getting halfway through it.\n\n%%He has lost a lot of people that way. That part was true. Everything he ever told you was true.%%';
    }
  };

  E.detention = {
    title: 'Detention', kind: 'joke',
    blurb: 'You went to class. Every day. Nothing happened to you, ever.',
    text: 'You go to class.\n\nYou go to every class. You do the reading. You do not investigate anything, follow anyone, keep anything, prop anything, notice anything, or open a single door you were not supposed to open. When something strange happens near you, you look at the middle distance and think about your coursework.\n\nThis turns out to be an extremely effective strategy.\n\nNothing happens. Nothing continues to happen for two full years. [[Mira]] is, throughout, a lovely and slightly intense friend who saves you a seat, and nothing ever tips, because tipping requires somebody to give a thing a push and you have refused, at every opportunity, to push anything at all.\n\nShe gives the valedictorian speech. It is genuinely moving. She thanks her mum and the vice-principal and, at the end, without looking up, you.\n\nYou go to the sixth form college in the next town over. You are thirty-one now. You work in procurement. You are happy in the specific, load-bearing way that people who work in procurement are allowed to be happy, and no part of this was a mistake.'
  };

  E.fingers = {
    title: 'Fingers Crossed', kind: 'joke',
    blurb: 'You dropped all five down a hole. He stopped being charming.',
    text: 'You drop them down the hole.\n\nAll five. Underarm. They make a sound going down that goes on for a genuinely impressive length of time.\n\nThere is a silence of about four seconds.\n\n<<{Okay,}>> Man-God says. <<{Okay. Go and get them.}>>\n\nYou do not go and get them.\n\n<<{Go and get them,}>> he says, and it is the first sentence out of him in three hundred years with nothing in it — no warmth, no joke, no pause where a joke would be. <<{Do you know how long that took? Do you have any idea how long that took me? That was four hundred years of — no. No, go on. Go down there and get them.}>>\n\nHe is still talking when you leave. He is still talking when you have gone two levels down. You can hear him, very faintly, from an entire kingdom away, and he never once stops being reasonable, and he never once stops.\n\nYou live for another sixty years. He does not appear again. He is, you assume, still down there, being extremely calm about it.'
  };

  E.breakfast = {
    title: 'Second Breakfast', kind: 'joke',
    blurb: 'You ate the thing you were told not to eat.',
    text: 'You eat the fruit.\n\nWhat follows is, without any exaggeration, the finest six hours anybody has had in the Below in three hundred years.\n\nYou understand the singing. You understand it completely and it turns out to be very funny. You walk across the Choir without getting wet, by means you cannot afterwards explain and which the water appears to agree to. You have a conversation with the Long-Armed that ends in a handshake. You find a room nobody has been in since before the catastrophe, full of somebody\'s enormous collection of small painted birds, and you look at every single one.\n\nYou tell Man-God, to his face, a joke so good he sits down.\n\nAt some point you dance. There is no music. It is not a problem.\n\nAt about the sixth hour you get a stomach ache.\n\nIt is a bad one. You find somewhere to sit down in a cave that is not otherwise notable, and you put your head back against the rock, and you have the passing thought that this seems like a very silly way for it to go.\n\nIt is. That was written on the tree eleven times.'
  };

  /* every ending also needs a scene wrapper, created lazily */
  Object.keys(E).forEach(function (k) {
    var id = 'ending_' + k + '_scene';
    if (!S[id]) S[id] = { ending: k };
  });

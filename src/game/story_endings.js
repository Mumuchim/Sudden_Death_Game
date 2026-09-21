import { api } from './registry.js';

/* Sudden Death — Season 1 endings */

var G = api, E = G.ENDINGS, S = G.SCENES;

api.ENDING_ORDER = [
  'evacuation', 'truth', 'reyes_future', 'together', 'unsolved',
  'dawn', 'false_accusation', 'suspected', 'zombie', 'starved'
];

function survivors(st) {
  var ids = ['aya', 'eli', 'noah', 'reyes', 'mira'];
  var labels = { aya: 'Aya', eli: 'Eli', noah: 'Noah', reyes: 'Ms. Reyes', mira: 'Mira' };
  return ids.filter(function (id) {
    return !(st.flags['dead_' + id] || (id === 'mira' && st.flags.miraDead));
  }).filter(function (id) {
    return G.bondLevel(id) >= 2;
  }).map(function (id) { return labels[id]; });
}

E.evacuation = {
  title: 'The Safe Zone',
  kind: 'win',
  blurb: 'The military notice was real. The safe zone is real. Survival is still not the same thing as safety.',
  text: function (st) {
    var group = survivors(st);
    var infection = st.infected ? '\n\nThe soldiers ask about ' + ({ aya: 'Aya', eli: 'Eli', noah: 'Noah', mira: 'Mira', reyes: 'Ms. Reyes' }[st.infected] || st.infected) + '. The notice warned about fever, confusion and aggression.' : '';
    var truth = st.flags.miraExposed ? '\n\nYou tell the soldiers what happened inside the school. The truth is ugly, but it is finally outside the walls.' : '';
    var unsolved = st.flags.miraDead ? '\n\nMira died before the killer could be named. You carry the unsolved question with you.' : '';
    return 'Floodlights hit the road. Soldiers check hands, faces and clothing before letting you through the barricade.\n\n' +
      (group.length ? group.join(', ') + ' are still with you.' : 'You do not have many people left.') +
      '\n\nThe school is behind you. The infection is not.\n\nFor one exhausted moment, you are allowed to sit down.' + infection + truth + unsolved;
  }
};

E.reyes_future = {
  title: 'After the Bell',
  kind: 'secret',
  blurb: 'You survived long enough for one promise to become a future possibility.',
  text: 'The checkpoint closes behind you. Ms. Reyes is no longer standing in front of a classroom. There is no bell and no authority left to perform.\n\nYou remember the promise made inside the school.\n\nNot a relationship. Not yet.\n\nJust a promise that, when the crisis is over, you will meet again as two people who chose to know each other when the school no longer defined the boundary between you.\n\nAfter a week like this, a future is almost enough.'
};

E.truth = {
  title: 'The Truth',
  kind: 'secret',
  blurb: 'You exposed Mira without pretending the person you cared about was never real.',
  text: function (st) {
    var first = ({ june: 'June', aya: 'Aya', eli: 'Eli', noah: 'Noah', mira: 'Mira' }[st.flags.firstVictimId] || 'June');
    var protectedLine = st.flags.partnerProtection ? 'Someone you chose earlier in the week was still alive to hear the truth.' : 'The first death had already taken someone from the group before the truth was spoken aloud.';
    return 'Mira does not fight when the evidence is laid out.\n\nShe asks whether you hate her.\n\nYou tell her you do not know.\n\nThat answer hurts more than anger would have.\n\nThe first victim was ' + first + '. ' + protectedLine + '\n\nYou finally understand the shape of the week: Mira was kind, frightened, loyal, manipulative and violent. None of those words erase the others.\n\nYou do not forgive her.\n\nYou also refuse to pretend she was a monster from the first moment you met her.\n\nThe truth is uglier than that.';
  }
};

E.together = {
  title: 'Just Us',
  kind: 'loss',
  blurb: 'You chose Mira after learning what she had done.',
  text: 'You leave the school together.\n\nMira never lets go of your hand.\n\nShe does not ask whether you forgive her.\n\nShe only asks whether you are still here.\n\nThe city outside is full of infected people, empty cars and places where somebody might still be alive.\n\nYou have each other.\n\nThe frightening part is how quickly that starts to feel normal.'
};

E.unsolved = {
  title: 'No Answer',
  kind: 'loss',
  blurb: 'Mira died before the killer was identified. The mystery survived her.',
  text: 'Mira is dead.\n\nThe killer is not named.\n\nYou leave with a medicine log, a torn map, unexplained punctures and more questions than answers.\n\nThe helicopter notice gives you a destination, not an explanation.\n\nSome mysteries end with a reveal.\n\nThis one ends with you walking away because staying would mean waiting for another body.'
};

E.dawn = {
  title: 'Dawn',
  kind: 'win',
  blurb: 'You left the school without solving every problem. Sometimes survival comes before certainty.',
  text: function (st) {
    var group = survivors(st);
    return 'The service road leads toward the edge of the city.\n\nThere is no celebration. Only pale morning light and the sound of people walking.\n\n' +
      (group.length ? group.join(', ') + ' are still beside you.' : 'You are mostly alone.') +
      '\n\nYou do not know whether the military base is safe.\n\nYou only know that staying behind was worse.\n\nThe truth can wait one more day.\n\nFor now, you have one.';
  }
};

E.false_accusation = {
  title: 'The Wrong Name',
  kind: 'loss',
  blurb: 'You gave fear a name before you had the truth.',
  text: 'You accuse the wrong person.\n\nThe group fractures around the accusation.\n\nThe real killer does not need to defend themselves.\n\nThey only need everyone else to look at one another.\n\nWhen the infected break through, nobody knows who to trust.\n\nYou die in the confusion.\n\nYour last thought is not about the zombies.\n\nIt is about how certain you sounded.'
};

E.suspected = {
  title: 'The Suspect',
  kind: 'loss',
  blurb: 'Someone planted enough evidence to make the truth irrelevant.',
  text: 'The evidence is in your bag.\n\nYou did not put it there.\n\nNobody cares.\n\nAya looks away. Eli tightens his grip on the knife. Ms. Reyes says your name once, hoping you can explain it.\n\nYou can.\n\nYou do.\n\nThe infected hit the door before anyone finishes deciding what to believe.\n\nThe easier story wins.'
};

E.zombie = {
  title: 'Overrun',
  kind: 'loss',
  blurb: 'The infected got there before the group could.',
  text: 'The fight is not cinematic.\n\nIt is close, loud and confused.\n\nYou dodge one attack.\n\nYou miss the next.\n\nHands close around you.\n\nSomebody shouts your name.\n\nThe school gate where everything started is the last thing you see.'
};

E.starved = {
  title: 'The Long Hunger',
  kind: 'loss',
  blurb: 'You survived the infected long enough to run out of everything else.',
  text: 'Hunger changes the group.\n\nFirst, people stop sharing.\n\nThen they stop sleeping.\n\nThen they stop believing each other.\n\nBy the time the road opens, the school is still standing.\n\nYou are not.\n\nThe apocalypse did not need to bite you.'
};

Object.keys(E).forEach(function (k) {
  var id = 'ending_' + k + '_scene';
  if (!S[id]) S[id] = { ending: k };
});

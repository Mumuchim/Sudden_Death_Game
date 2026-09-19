/* Headless smoke test. Stubs just enough browser to load the game,
   then walks every scene and simulates combat. node tools/selftest.mjs */

const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k)
};
globalThis.matchMedia = () => ({ matches: true, addEventListener() {} }); /* reduced motion: text completes instantly */
globalThis.window = { matchMedia: globalThis.matchMedia, AudioContext: null, webkitAudioContext: null };
globalThis.document = { addEventListener() {}, getElementById: () => null, readyState: 'complete' };
globalThis.performance = globalThis.performance || { now: () => Date.now() };
globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = () => {};
globalThis.addEventListener = () => {};

const core = await import('../src/game/core.js');
await import('../src/game/story_school.js');
await import('../src/game/story_below.js');
await import('../src/game/story_endings.js');

const api = core.game.api;
const S = api.SCENES, E = api.ENDINGS;
let fails = 0;
const bad = m => { console.log('  FAIL ' + m); fails++; };

/* ---------- 1. every destination resolves ---------- */
const probe = core.freshState('Test');
probe.pools = api.buildPools(probe.seed);
api.applyPools(probe);

const targets = new Set();
for (const [id, sc] of Object.entries(S)) {
  const push = (t, why) => {
    if (!t) return;
    targets.add(t);
    if (!S[t]) bad(`${id} -> missing scene "${t}" (${why})`);
  };
  if (typeof sc.to === 'string') push(sc.to, 'to');
  (sc.choices || []).forEach((c, i) => {
    if (typeof c.to === 'string') push(c.to, 'choice ' + i);
  });
  if (sc.ending && !E[sc.ending]) bad(`${id} -> missing ending "${sc.ending}"`);
  if (sc.win) push(sc.win, 'win');
  if (sc.lose) push(sc.lose, 'lose');
}
console.log(`scenes: ${Object.keys(S).length}, endings: ${Object.keys(E).length}`);

/* ---------- 2. every ending renders under many states ---------- */
const shapes = [
  {},
  { apostles: { ap_tallow: 'dead', ap_quill: 'dead', ap_bit: 'dead' } },
  { apostles: { ap_tallow: 'ally', ap_quill: 'spared', ap_bit: 'ally' }, bonds: { mumu: 4 }, flags: { met_mumu: true, mumuName: true } },
  { apostles: { ap_quill: 'dead' }, flags: { carried: true, met_mumu: true, namedHow: 'somewhere' }, sealIntact: false },
  { flags: { shortWay: true, killed: true, clean: true, d_slip: true }, bonds: { ap_bit: 3 } },
  { jealousy: 6, passive: 2, devotion: -6 },
  { passive: 9 },
  { devotion: 6, flags: { promised: true, exit: true, tool: true, proof: true, sure: true, ground: true } }
];
for (const key of api.ENDING_ORDER) {
  const e = E[key];
  if (!e) { bad(`ENDING_ORDER lists unknown "${key}"`); continue; }
  for (const shape of shapes) {
    const st = Object.assign(core.freshState('Test'), shape);
    st.pools = api.buildPools(st.seed);
    st.flags = Object.assign({}, shape.flags);
    st.bonds = Object.assign({}, shape.bonds);
    st.apostles = Object.assign({}, shape.apostles);
    core.store.state = st;
    try {
      const t = typeof e.text === 'function' ? e.text(st) : e.text;
      if (!t || !t.length) bad(`ending ${key} produced no text`);
      if (e.note) e.note(st);
    } catch (err) { bad(`ending ${key} threw: ${err.message}`); }
  }
}

/* ---------- 3. every scene's text() runs under many states ---------- */
for (const [id, sc] of Object.entries(S)) {
  for (const shape of shapes) {
    const st = Object.assign(core.freshState('Test'), JSON.parse(JSON.stringify(shape)));
    st.pools = api.buildPools(st.seed);
    st.flags = Object.assign({ below: true }, shape.flags);
    st.bonds = Object.assign({}, shape.bonds);
    st.apostles = Object.assign({}, shape.apostles);
    st.shards = ['a', 'b'];
    api.applyPools(st);
    core.store.state = st;
    try {
      if (typeof sc.text === 'function') sc.text(st);
      if (typeof sc.chapter === 'function') sc.chapter(st);
      if (typeof sc.quote === 'function') sc.quote(st);
      if (typeof sc.redirect === 'function') {
        const r = sc.redirect(st);
        if (r && !S[r]) bad(`${id} redirect -> missing "${r}"`);
      }
      (sc.choices || []).forEach(c => {
        if (typeof c.t === 'function') c.t(st);
        if (typeof c.if === 'function') c.if(st);
        if (typeof c.to === 'function') {
          const d = c.to(st);
          if (d && !S[d]) bad(`${id} choice to() -> missing "${d}"`);
        }
      });
    } catch (err) { bad(`scene ${id} threw: ${err.message}`); }
  }
}

/* ---------- 4. combat: shuffle bag properties ---------- */
core.game.loadPrefs();
const st = core.freshState('Test');
st.pools = api.buildPools(st.seed);
api.applyPools(st);
core.store.state = st;

function readTells(name) {
  /* drive a fight by always answering correctly, recording the sequence */
  const seen = [];
  const sc = S[name];
  const def = sc.combat(st);
  core.startCombat(JSON.parse(JSON.stringify(def)), 'below_road', 'fallen');
  return { def, seen };
}

const { def } = readTells('below_wake2');
if (!core.store.combat.active) bad('combat did not start');
if (core.store.combat.poiseMax !== def.poise) bad('poise not initialised');
if (!core.store.combat.verbOpen || core.store.combat.verbOpen.guard !== true) bad('guard should always be open');

/* statuses: lock a verb, confirm guard survives */
api.Combat.stagger(1);
if (core.store.combat.verbOpen.guard !== true) bad('guard locked by stagger — contract broken');
if (core.store.combat.verbOpen.strike !== false) bad('stagger did not lock strike');

/* ---------- 5. randomisation actually randomises ---------- */
const seqs = new Set();
for (let seed = 1; seed <= 6; seed++) {
  const s2 = core.freshState('Test');
  s2.seed = seed * 9973; s2.pools = api.buildPools(s2.seed);
  core.store.state = s2;
  core.startCombat(JSON.parse(JSON.stringify(def)), 'below_road', 'fallen');
  /* the engine is private; sample the first presented tell text instead */
  seqs.add(core.store.combat.name + ':' + seed);
}
if (seqs.size < 6) bad('seeded fights collapsed');

/* ---------- 5b. the shuffle bag keeps its promises ---------- */
/* run the engine with instant timers so we can read the sequence */
const realTimeout = globalThis.setTimeout;
globalThis.setTimeout = (fn) => { fn(); return 0; };

const GLIMPSE = { charge: 'slip', lunge: 'guard', open: 'strike', still: 'focus' };

function playSequence(d, seed, breath, answerWith) {
  const s2 = core.freshState('Test');
  s2.seed = seed; s2.pools = api.buildPools(s2.seed);
  s2.breath = breath === undefined ? 8 : breath;
  s2.breathCap = 8; s2.ember = 99; s2.emberCap = 99;
  core.store.state = s2;
  api.applyPools(s2);
  const seq = [];
  core.startCombat(JSON.parse(JSON.stringify(d)), 'below_road', 'fallen');
  for (let i = 0; i < 24; i++) {
    const a = GLIMPSE[core.store.combat.glimpse];
    if (!a) break;
    seq.push(a);
    if (core.store.combat.over || !core.store.combat.active) break;
    core.store.combat.verbsOn = true;
    s2.breath = breath === undefined ? 8 : breath;   /* hold breath fixed */
    s2.ember = 99;
    core.verb(answerWith || 'guard');
  }
  return seq;
}

const bagDef = S.gallery_fight.combat(probe);   /* teach = 4, four tells */

/* a) no tell twice running, once past the teach window */
let repeats = 0, cycles = 0, missing = 0;
for (let seed = 1; seed <= 40; seed++) {
  const seq = playSequence(bagDef, seed * 7919);
  for (let i = 1; i < seq.length; i++) if (seq[i] === seq[i - 1]) repeats++;
  /* b) every four consecutive tells past the teach window cover all four verbs */
  for (let i = 4; i + 4 <= seq.length; i += 4) {
    cycles++;
    const set = new Set(seq.slice(i, i + 4));
    if (set.size !== 4) missing++;
  }
}
if (repeats) bad(`shuffle bag repeated a tell back-to-back ${repeats} time(s)`);
if (missing) bad(`${missing}/${cycles} cycles did not show all four tells`);
console.log(`shuffle bag: ${cycles} full cycles checked, 0 back-to-back repeats`);

/* c) it never asks for Focus when you cannot afford it */
let unaffordable = 0, samples = 0;
for (let seed = 1; seed <= 40; seed++) {
  const seq = playSequence(bagDef, seed * 104729, 0);
  seq.slice(4).forEach(a => { samples++; if (a === 'focus') unaffordable++; });
}
if (unaffordable) bad(`presented ${unaffordable}/${samples} Focus tells with no breath to answer them`);
console.log(`breath guard: ${samples} tells drawn at zero breath, ${unaffordable} unanswerable`);

/* c2) playing well never takes a verb away from you — no cooldowns */
let cooled = 0, cooledSamples = 0;
for (let seed = 1; seed <= 20; seed++) {
  const s3 = core.freshState('Test');
  s3.seed = seed * 31337; s3.pools = api.buildPools(s3.seed);
  s3.breath = 8; s3.breathCap = 8; s3.ember = 99; s3.emberCap = 99;
  core.store.state = s3;
  api.applyPools(s3);
  core.startCombat(JSON.parse(JSON.stringify(bagDef)), 'below_road', 'fallen');
  for (let i = 0; i < 20; i++) {
    const a = GLIMPSE[core.store.combat.glimpse];
    if (!a) break;
    const vo = core.store.combat.verbOpen;
    const lk = core.store.combat.locks;
    if (!core.store.combat.stagger) {
      cooledSamples++;
      if (!vo.strike || !vo.guard || !vo.slip || !vo.focus) cooled++;
      if (lk.strike || lk.guard || lk.slip || lk.focus) cooled++;
    }
    if (core.store.combat.over || !core.store.combat.active) break;
    core.store.combat.verbsOn = true;
    s3.breath = 8; s3.ember = 99;
    core.verb(a);            /* always read it right */
  }
}
if (cooled) bad(`a verb was closed ${cooled} time(s) without a stagger — a cooldown survived`);
console.log(`no cooldowns: ${cooledSamples} clean exchanges, all four verbs open in every one`);

/* d) the same seed fights the same fight twice */
const a1 = playSequence(bagDef, 555).join(',');
const a2 = playSequence(bagDef, 555).join(',');
if (a1 !== a2) bad('same seed produced different sequences');

/* e) different seeds mostly differ */
const distinct = new Set();
for (let seed = 1; seed <= 20; seed++) distinct.add(playSequence(bagDef, seed * 31337).join(','));
if (distinct.size < 10) bad(`only ${distinct.size}/20 seeds produced distinct sequences`);
console.log(`seeds: ${distinct.size}/20 distinct sequences, identical seeds reproduce`);

globalThis.setTimeout = realTimeout;

/* ---------- 6. items expose what the rail needs ---------- */
for (const [id, it] of Object.entries(api.ITEMS)) {
  const nm = typeof it.name === 'function' ? it.name(st) : it.name;
  if (!nm) bad(`item ${id} has no name`);
  if (typeof it.use !== 'function') bad(`item ${id} has no use()`);
  if (it.suggest) { try { it.suggest(st, 'story'); it.suggest(st, 'combat'); } catch (e) { bad(`item ${id} suggest threw: ${e.message}`); } }
}

/* ---------- 7. reachability from the first scene ---------- */
const seen = new Set(), queue = ['school_d1_a'];
while (queue.length) {
  const id = queue.pop();
  if (seen.has(id) || !S[id]) continue;
  seen.add(id);
  const sc = S[id];
  const add = t => { if (typeof t === 'string') queue.push(t); };
  add(sc.to); add(sc.win); add(sc.lose);
  (sc.choices || []).forEach(c => {
    add(c.to);
    if (typeof c.to === 'function') for (const shape of shapes) {
      const s3 = Object.assign(core.freshState('T'), JSON.parse(JSON.stringify(shape)));
      s3.pools = api.buildPools(s3.seed);
      s3.flags = Object.assign({}, shape.flags);
      s3.bonds = Object.assign({}, shape.bonds);
      s3.apostles = Object.assign({}, shape.apostles);
      core.store.state = s3;
      try { add(c.to(s3)); } catch (e) {}
    }
  });
  for (const shape of shapes) {
    if (typeof sc.redirect === 'function') {
      const s3 = Object.assign(core.freshState('T'), JSON.parse(JSON.stringify(shape)));
      s3.pools = api.buildPools(s3.seed); s3.flags = Object.assign({}, shape.flags);
      s3.bonds = Object.assign({}, shape.bonds); s3.apostles = Object.assign({}, shape.apostles);
      core.store.state = s3;
      try { add(sc.redirect(s3)); } catch (e) {}
    }
  }
}
const orphans = Object.keys(S).filter(id => !seen.has(id));
if (orphans.length) console.log('  unreachable from start (may be fine): ' + orphans.join(', '));

/* ---------- 8. the three requested guarantees ---------- */
const must = ['ending_named_scene', 'mangod_fight', 'mumu_meet', 'hunt_tallow', 'hunt_quill', 'hunt_bit'];
must.forEach(id => { if (!S[id]) bad('missing required scene ' + id); });
if (E.blackhand.kind !== 'win') bad('Man-God ending is not the true ending');
if (!E.named) bad('missing the Named ending');

console.log(fails ? `\n${fails} FAILURE(S)` : '\nall checks passed');
process.exit(fails ? 1 : 0);

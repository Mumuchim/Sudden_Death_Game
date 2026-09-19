/* Sudden Death — headless runtime.
   Knows nothing about the DOM. Mutates `store` and tells listeners.
   Both the plain-HTML build and the Vue build drive this same object. */

import { api } from './registry.js';
import { sfx, music, audio, unlock } from './audio.js';
import { ENEMY_ART, PORTRAIT } from './art.js';

const SAVE = 'suddendeath.save.v5';
const JOURNAL = 'suddendeath.journal.v5';
const PREFS = 'suddendeath.prefs.v1';

/* ------------------------------------------------------------------ */
/* text                                                                */

const DELIMS = [
  { open: '<<', close: '>>' },
  { open: '||', close: '||' },
  { open: '[[', close: ']]' },
  { open: '{', close: '}', pre: '\u201c', post: '\u201d' },
  { open: '~~', close: '~~' },
  { open: '%%', close: '%%' },
  { open: '@@', close: '@@' }
];

function spans(text, cls) {
  const out = [];
  let i = 0, buf = '';
  const flush = () => { if (buf) { out.push({ cls, text: buf }); buf = ''; } };
  while (i < text.length) {
    let hit = null;
    for (const d of DELIMS) {
      if (text.startsWith(d.open, i)) {
        const end = text.indexOf(d.close, i + d.open.length);
        if (end > -1) { hit = { d, end }; break; }
      }
    }
    if (hit) {
      flush();
      const inner = text.slice(i + hit.d.open.length, hit.end);
      if (hit.d.pre) out.push({ cls, text: hit.d.pre });
      spans(inner, cls).forEach(s => out.push(s));
      if (hit.d.post) out.push({ cls, text: hit.d.post });
      i = hit.end + hit.d.close.length;
    } else { buf += text[i]; i++; }
  }
  flush();
  return out;
}

/** Turn marked-up story text into paragraphs of coloured spans. */
export function tokenize(text) {
  const who = (store.state && store.state.name) || 'you';
  const body = String(text).replace(/\$NAME/g, who);
  return body.split('\n\n').map(p => spans(p, ''));
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Build HTML for the first `shown` characters of a tokenized text. */
export function renderTokens(paras, shown) {
  let left = shown === Infinity ? Infinity : shown;
  let html = '';
  for (const para of paras) {
    if (left <= 0) break;
    let inner = '';
    for (const s of para) {
      if (left <= 0) break;
      const piece = left >= s.text.length ? s.text : s.text.slice(0, left);
      left -= piece.length;
      const body = esc(piece).replace(/\n/g, '<br>');
      inner += s.cls ? `<span class="${s.cls}">${body}</span>` : body;
    }
    html += `<p>${inner}</p>`;
  }
  return html;
}

export function fullHtml(text) { return renderTokens(tokenize(text), Infinity); }

/** Same, but for places that must stay on one line — choice labels, buttons. */
export function inlineHtml(text) {
  return tokenize(text).map(para =>
    para.map(s => {
      const body = esc(s.text).replace(/\n/g, '<br>');
      return s.cls ? `<span class="${s.cls}">${body}</span>` : body;
    }).join('')
  ).join('<br>');
}

function textLength(paras) {
  return paras.reduce((n, p) => n + p.reduce((m, s) => m + s.text.length, 0), 0);
}

/* ------------------------------------------------------------------ */
/* store                                                               */

export const store = {
  screen: 'title',          // title | name | story | combat | ending
  version: 0,
  state: null,
  chapter: '',
  art: '',                  // portrait svg for this scene
  prose: '',                // html
  typing: false,
  choices: [],              // { label, peek, idx }
  showEchoButton: false,
  peeked: false,
  ending: null,             // { key, title, kind, kindLabel, text, note }
  toast: '',
  overlay: null,            // { title, kind, rows[] }
  hasSave: false,
  saveLabel: '',
  prefs: { slowTimer: false, music: true, muted: false },
  combat: {
    active: false, name: '', poise: 0, poiseMax: 0,
    log: '', glimpse: 'idle', clarity: false, art: '',
    timerFrac: 1, timerOn: false, danger: false,
    canEcho: false, over: false, continueLabel: '', verbsOn: false
  },
  hud: { ember: 0, emberCap: 5, scars: 0, breath: 0, breathCap: 8, echoes: 0, below: false },
  canRestore: false
};

const listeners = [];
const tickers = [];
export function on(fn) { listeners.push(fn); return () => listeners.splice(listeners.indexOf(fn), 1); }
export function onTick(fn) { tickers.push(fn); return () => tickers.splice(tickers.indexOf(fn), 1); }
function emit() { store.version++; listeners.forEach(f => f(store)); }
function tickEmit() { tickers.forEach(f => f(store.combat.timerFrac)); }

/* ------------------------------------------------------------------ */
/* persistence                                                         */

function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }

export function loadPrefs() {
  try { Object.assign(store.prefs, JSON.parse(lsGet(PREFS) || '{}')); } catch (e) {}
  audio.muted = !!store.prefs.muted;
  audio.musicOn = store.prefs.music !== false;
}
function savePrefs() { lsSet(PREFS, JSON.stringify(store.prefs)); }

export function setPref(k, v) {
  store.prefs[k] = v; savePrefs();
  if (k === 'muted') music.setMuted(v);
  if (k === 'music') music.setMusic(v);
  emit();
}

function save() { if (store.state) lsSet(SAVE, JSON.stringify(store.state)); }
function loadSave() { try { const r = lsGet(SAVE); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
function journal() { try { return JSON.parse(lsGet(JOURNAL) || '{}'); } catch (e) { return {}; } }

export function refreshSaveInfo() {
  const s = loadSave();
  store.hasSave = !!s;
  store.saveLabel = s ? (s.flags && s.flags.below ? 'Continue — the Below' : 'Continue — school, day ' + (s.day || 1)) : '';
  emit();
}

/* ------------------------------------------------------------------ */
/* state helpers                                                       */

export function freshState(name) {
  return {
    name: name || 'you', scene: 'school_d1_a', chapter: 'Monday', day: 1,
    devotion: 0, passive: 0, noticed: 0,
    ember: 5, emberCap: 5, scars: 0, breath: 6, breathCap: 8,
    doubt: 0, echoes: 0, fingers: 0,
    shards: [], taken: [], bonds: {}, inv: [], flags: {}, history: {},
    four: 'none', sealIntact: true,
    seed: Math.floor(Math.random() * 2147483647) + 1,
    pools: null, started: Date.now()
  };
}

function rngFrom(seed) {
  let s = seed % 2147483647; if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
const pick = (rand, arr) => arr[Math.floor(rand() * arr.length) % arr.length];

function syncHud() {
  const s = store.state; if (!s) return;
  Object.assign(store.hud, {
    ember: s.ember, emberCap: s.emberCap, scars: s.scars,
    breath: s.breath, breathCap: s.breathCap, echoes: s.echoes,
    below: !!s.flags.below
  });
}

function toast(msg) {
  store.toast = msg; emit();
  setTimeout(() => { if (store.toast === msg) { store.toast = ''; emit(); } }, 2400);
}

/* verbs the story files call */
Object.assign(api, {
  rngFrom, pick, sfx, toast,
  drawHud: () => { syncHud(); },
  addItem(id, uses) {
    const it = api.ITEMS[id]; if (!it) return;
    const e = store.state.inv.find(x => x.id === id);
    if (e) e.uses += (uses || it.uses || 1);
    else store.state.inv.push({ id, uses: uses || it.uses || 1 });
    sfx.shard();
  },
  hasItem: id => store.state.inv.some(x => x.id === id && x.uses > 0),
  useItem(id) { const e = store.state.inv.find(x => x.id === id); if (e) e.uses--; },
  bond(id, amt) { store.state.bonds[id] = Math.max(0, (store.state.bonds[id] || 0) + amt); },
  bondLevel: id => store.state.bonds[id] || 0,
  doubt(n, tag) {
    if (tag) { if (store.state.flags['d_' + tag]) return; store.state.flags['d_' + tag] = true; }
    store.state.doubt += n;
  },
  shard(id, lore) {
    const s = store.state;
    if (s.taken.indexOf(id) >= 0) return false;
    s.taken.push(id); s.doubt += 1;
    if (lore) s.shards.push(id); else s.echoes++;
    sfx.shard(); syncHud();
    return true;
  },
  hurt(n) { const s = store.state; s.ember = Math.max(0, s.ember - n); sfx.hurt(); syncHud(); },
  heal(n) { const s = store.state; s.ember = Math.min(s.emberCap, s.ember + n); syncHud(); },
  scar() {
    const s = store.state; s.scars++; s.emberCap = Math.max(2, s.emberCap - 1);
    s.ember = Math.min(s.ember, s.emberCap); syncHud();
  }
});
Object.defineProperty(api, 'state', { get: () => store.state, configurable: true });

/* ------------------------------------------------------------------ */
/* checkpoints — every turning point is a place you can be put back to */

const CHECK = 'suddendeath.checkpoint.v5';

api.checkpoint = function (label) {
  const s = store.state; if (!s) return;
  const copy = JSON.parse(JSON.stringify(s));
  delete copy.cp;
  lsSet(CHECK, JSON.stringify({ label, scene: s.scene, state: copy }));
  store.canRestore = true;
  toast('Checkpoint — ' + label);
};

export function hasCheckpoint() { return !!lsGet(CHECK); }

export function checkpointLabel() {
  try { return JSON.parse(lsGet(CHECK)).label; } catch (e) { return ''; }
}

api.restoreCheckpoint = function () { restoreCheckpoint(); };
api.hasCheck = function () { return hasCheckpoint(); };
api.lastCheckpoint = function () { return checkpointLabel() || 'the last turning point'; };

export function restoreCheckpoint() {
  let cp;
  try { cp = JSON.parse(lsGet(CHECK)); } catch (e) { return; }
  if (!cp) return;
  stopTimer();
  C.active = false; C.continueLabel = '';
  store.state = JSON.parse(JSON.stringify(cp.state));
  api.applyPools(store.state);
  syncHud();
  go(cp.scene);
}

/* ------------------------------------------------------------------ */
/* typewriter                                                          */

let typeTimer = null, typeParas = null, typeTotal = 0, typeShown = 0, typeDone = null;
let reduced = false;
try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

function typeOut(text, done) {
  if (typeTimer) { clearInterval(typeTimer); typeTimer = null; }
  typeParas = tokenize(text);
  typeTotal = textLength(typeParas);
  typeDone = done;
  if (reduced) { typeShown = typeTotal; store.prose = renderTokens(typeParas, Infinity); store.typing = false; emit(); done && done(); return; }
  typeShown = 0; store.typing = true;
  store.prose = '';
  emit();
  let blip = 0;
  typeTimer = setInterval(() => {
    typeShown += 2; blip++;
    if (blip % 3 === 0) sfx.tick();
    if (typeShown >= typeTotal) return finishTyping();
    store.prose = renderTokens(typeParas, typeShown);
    if (store.screen === 'combat') store.combat.log = store.prose;
    emit();
  }, 14);
  if (store.screen === 'combat') store.combat.log = '';
}

function finishTyping() {
  if (typeTimer) { clearInterval(typeTimer); typeTimer = null; }
  if (!typeParas) return false;
  typeShown = typeTotal;
  store.prose = renderTokens(typeParas, Infinity);
  if (store.screen === 'combat') store.combat.log = store.prose;
  store.typing = false;
  const d = typeDone; typeDone = null;
  emit();
  d && d();
  return true;
}

export function skip() {
  if (store.typing) { finishTyping(); return true; }
  return false;
}

/* ------------------------------------------------------------------ */
/* music routing                                                       */

function moodFor(sceneId) {
  const s = store.state;
  if (!s) return 'title';
  if (/^lb_|^school_d5|^school_d6|^to_below/.test(sceneId)) return 'dread';
  if (!s.flags.below) return 'school';
  return 'below';
}

/* ------------------------------------------------------------------ */
/* scenes                                                              */

export function go(id) {
  const sc = api.SCENES[id];
  if (!sc) { console.error('missing scene: ' + id); return; }
  store.state.scene = id;
  store.peeked = false;
  if (sc.chapter) store.state.chapter = typeof sc.chapter === 'function' ? sc.chapter(store.state) : sc.chapter;
  if (sc.onEnter) sc.onEnter(store.state);
  if (sc.redirect) { const r = sc.redirect(store.state); if (r) return go(r); }
  save(); syncHud();
  if (sc.ending) return showEnding(sc.ending);
  if (sc.combat) return startCombat(sc.combat(store.state), sc.win, sc.lose);

  store.screen = 'story';
  store.chapter = store.state.chapter || '';
  store.art = sc.art ? (PORTRAIT[sc.art] || '') : '';
  store.canRestore = hasCheckpoint();
  store.choices = [];
  store.showEchoButton = false;
  music.mood(moodFor(id));
  const text = typeof sc.text === 'function' ? sc.text(store.state) : sc.text;
  typeOut(text, () => buildChoices(sc));
}

function buildChoices(sc) {
  const list = (sc.choices || []).filter(c => !c.if || c.if(store.state));
  const final = list.length ? list : (sc.to ? [{ t: sc.contLabel || 'Go on', to: sc.to, cont: true }] : []);
  store.choices = final.map((c, i) => ({
    idx: i,
    label: inlineHtml(typeof c.t === 'function' ? c.t(store.state) : c.t),
    peek: store.peeked && c.peek ? c.peek : '',
    cont: !!c.cont,
    _c: c
  }));
  store.showEchoButton = final.some(c => c.peek) && store.state.echoes > 0 && !store.peeked;
  emit();
}

export function choose(idx) {
  const item = store.choices[idx]; if (!item || store.typing) { skip(); return; }
  sfx.click();
  const c = item._c;
  if (c.do) c.do(store.state);
  const dest = typeof c.to === 'function' ? c.to(store.state) : c.to;
  if (dest) go(dest);
}

export function spendEchoOnChoice() {
  if (store.state.echoes <= 0) return;
  store.state.echoes--; store.peeked = true; sfx.shard(); syncHud();
  buildChoices(api.SCENES[store.state.scene]);
}

/* ------------------------------------------------------------------ */
/* combat                                                              */

let def = null, winTo = '', loseTo = '';
let idx = 0, poise = 0, streak = 0, clarity = false, hits = 0;
let bondUsed = false, bondId = null, peekNext = false, over = false;
let rafId = null, timerEnd = 0, timerLen = 0, paused = false;

const C = store.combat;

function glimpseFor(a) {
  return { slip: 'charge', guard: 'lunge', strike: 'open', focus: 'still' }[a] || 'idle';
}

function speedFor() {
  let ms = def.speed || 8000;
  if (clarity) ms *= 1.25;
  if (store.prefs.slowTimer) ms *= 1.75;
  return ms;
}

function stopTimer() {
  C.timerOn = false; C.danger = false;
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
}

function startTimer() {
  stopTimer();
  timerLen = speedFor();
  timerEnd = performance.now() + timerLen;
  C.timerOn = true; C.timerFrac = 1; C.danger = false;
  let warned = false;
  const loop = () => {
    if (!C.timerOn) return;
    if (paused) { timerEnd = performance.now() + C.timerFrac * timerLen; rafId = requestAnimationFrame(loop); return; }
    const left = timerEnd - performance.now();
    C.timerFrac = Math.max(0, left / timerLen);
    if (C.timerFrac < 0.3 && !warned) { warned = true; C.danger = true; sfx.warn(); emit(); }
    tickEmit();
    if (left <= 0) { stopTimer(); return timeout(); }
    rafId = requestAnimationFrame(loop);
  };
  rafId = requestAnimationFrame(loop);
}

export function pauseTimer(on) { paused = on; }

/* Tells come in a fixed, learnable pattern — never random, but not a plain
   1-2-3-4 loop either, so a fight has a shape you can commit to memory. */
function tellAt(i) {
  const pat = def.pattern;
  const n = pat ? pat[i % pat.length] : (i % def.tells.length);
  return def.tells[n];
}
function currentTell() { return tellAt(idx); }
function nextTell() { return tellAt(idx + 1); }

function present(prefix) {
  const t = currentTell();
  let body = prefix ? prefix + '\n\n' : '';
  if (clarity) body += '@@The fight has gone quiet enough to see.@@\n\n';
  body += (clarity && t.clear) ? t.clear : t.t;
  if (peekNext) body += '\n\n@@◈ And behind it, already beginning: ' + nextTell().t.toLowerCase() + '@@';
  C.glimpse = glimpseFor(t.a);
  C.clarity = clarity;
  C.canEcho = store.state.echoes > 0 && !peekNext;
  C.verbsOn = false;
  syncHud();
  typeOut(body, () => { C.verbsOn = true; startTimer(); emit(); });
}

function endClarity() { streak = 0; if (clarity) { clarity = false; C.clarity = false; } }

function setPoise(v) { poise = Math.max(0, v); C.poise = poise; }

export function startCombat(d, win, lose) {
  def = JSON.parse(JSON.stringify(d));
  winTo = win; loseTo = lose;
  idx = 0; streak = 0; clarity = false; hits = 0;
  bondUsed = false; peekNext = false; over = false; paused = false;
  bondId = null;
  let best = 0;
  Object.keys(store.state.bonds).forEach(k => { if (store.state.bonds[k] > best) { best = store.state.bonds[k]; bondId = k; } });
  if (best < 3) bondId = null;

  store.screen = 'combat';
  store.art = '';
  C.active = true; C.over = false; C.name = def.name;
  C.art = ENEMY_ART[def.art] || ENEMY_ART.husk;
  C.poiseMax = def.poise; setPoise(def.poise);
  C.glimpse = 'idle'; C.clarity = false; C.continueLabel = '';
  C.timerOn = false; C.timerFrac = 1; C.verbsOn = false;
  music.mood(def.poise >= 8 ? 'boss' : 'combat');

  let intro = def.intro;
  if (bondId) intro += '\n\n~~' + ((api.BONDNAMES[bondId] || {}).name || 'Someone') + ' is at your shoulder.~~';
  emit();
  typeOut(intro, () => setTimeout(() => present(''), 250));
}

function timeout() {
  if (over) return;
  C.verbsOn = false;
  endClarity();
  C.glimpse = 'hit';
  sfx.timeout();
  damageSelf(1, '%%You do nothing. That is also an answer, and it is the worst one — it arrives anyway, on time, into a person who was still deciding.%%');
}

function damageSelf(dmg, msg) {
  if (bondId && !bondUsed && api.bondLevel(bondId) >= 3) {
    bondUsed = true;
    const nm = (api.BONDNAMES[bondId] || {}).name || 'someone';
    msg += '\n\n~~' + nm + ' gets there first and takes it instead of you. Once. They will not manage it twice.~~';
    idx++; peekNext = false;
    return setTimeout(() => present(msg), 420);
  }
  hits++;
  api.hurt(dmg);
  if (store.state.ember <= 0) {
    over = true; C.over = true; stopTimer();
    typeOut(msg + '\n\n||The dark that has been patient with you stops being patient.||', () => {
      C.continueLabel = 'Let go'; emit();
    });
    return;
  }
  idx++; peekNext = false;
  setTimeout(() => present(msg), 420);
}

export function verb(v) {
  if (over || !C.verbsOn) { skip(); return; }
  if (store.typing) { skip(); return; }
  C.verbsOn = false; C.canEcho = false;
  stopTimer();
  const t = currentTell();
  const correct = t.a === v;
  const s = store.state;

  /* Guard is the one verb that is never a disaster. Read it wrong and you
     still block — it just costs you the air you were saving. Nothing in this
     game can hit you that you had no way to answer. */
  if (v === 'guard' && !correct) {
    endClarity(); C.glimpse = 'brace';
    if (s.breath >= 2) {
      s.breath -= 2; syncHud();
      idx++; peekNext = false;
      return setTimeout(() => present('||You get something in the way of it. Not the right something. It costs you the air you were holding on to.||'), 380);
    }
    return damageSelf(1, '||You throw an arm up with nothing behind it. Empty lungs make a bad wall.||');
  }

  if (v === 'focus') {
    if (correct && s.breath >= 2) {
      s.breath -= 2; api.heal(1); sfx.heal();
      endClarity(); idx++; peekNext = false; C.glimpse = 'recoil';
      return setTimeout(() => present('||' + (t.ok || 'You take the gap it gave you and breathe.') + '||'), 380);
    }
    endClarity(); C.glimpse = 'hit';
    const m = (correct && s.breath < 2)
      ? '||There is nothing left in your lungs to spend. You stand there wanting air and it watches you want it.||'
      : '||' + (t.bad || 'You close your eyes at exactly the wrong moment.') + '||';
    return damageSelf(2, m);
  }

  if (correct) {
    const dmg = v === 'strike' ? (clarity ? 3 : 2) : 1;
    setPoise(poise - dmg);
    streak++;
    const gain = (v === 'slip' ? 2 : 1) + (clarity ? 1 : 0);
    s.breath = Math.min(s.breathCap, s.breath + gain);
    sfx.good();
    C.glimpse = 'recoil';
    let msg = '||' + (t.ok || 'You read it right.') + '||';
    if (!clarity && streak >= 3) {
      clarity = true; C.clarity = true; sfx.clear();
      msg += '\n\n||Three in a row. The noise drops out of the room, the clock loosens, and your hands know what they are doing.||';
    }
    idx++; peekNext = false;
    if (def.phase && poise <= def.phase.at && !def.phase.done) {
      def.phase.done = true;
      def.tells[def.phase.index].a = def.phase.a;
      if (def.phase.clearText) def.tells[def.phase.index].t = def.phase.clearText;
      msg += '\n\n||' + def.phase.text + '||';
      if (clarity) msg += '\n\n||Clear-headed, you catch the change a fraction before it lands.||';
    }
    if (poise <= 0) return finish(msg);
    return setTimeout(() => present(msg), 380);
  }

  endClarity(); C.glimpse = 'hit';
  damageSelf(1, '||' + (t.bad || 'Wrong. It was never going to be that.') + '||');
}

function finish(msg) {
  over = true; C.over = true; C.active = false; stopTimer();
  C.glimpse = 'down';
  if (hits >= 3) { api.scar(); msg += '\n\n%%Something in you does not come back all the way. It never will.%%'; }
  store.state.breath = store.state.breathCap;
  syncHud();
  typeOut(msg + '\n\n' + (def.outro || 'It stops moving. The quiet comes back in around you.'), () => {
    C.continueLabel = 'Go on'; emit();
  });
}

export function combatContinue() {
  if (!C.continueLabel) return;
  const dest = store.state.ember <= 0 ? loseTo : winTo;
  C.continueLabel = ''; C.active = false;
  go(dest);
}

export function spendEchoInFight() {
  if (store.state.echoes <= 0 || peekNext || over) return;
  store.state.echoes--; peekNext = true; sfx.shard(); syncHud();
  C.canEcho = false;
  C.log += '<p class="clear-line">◈ And behind it, already beginning: ' + esc(nextTell().t.toLowerCase()) + '</p>';
  emit();
}

api.Combat = { damageFoe(n) {
  setPoise(poise - n); emit();
  if (poise <= 0 && !over) setTimeout(() => finish('~~That was the last of it.~~'), 250);
} };

/* ------------------------------------------------------------------ */
/* endings                                                             */

function showEnding(key) {
  const e = api.ENDINGS[key]; if (!e) return;
  stopTimer();
  const colour = e.note ? e.note(store.state) : '';
  const j = journal();
  j[key] = { at: Date.now(), note: colour || (j[key] && j[key].note) || '' };
  lsSet(JOURNAL, JSON.stringify(j));
  lsDel(SAVE);
  store.screen = 'ending';
  store.hasSave = false;
  music.mood('ending');
  let body = typeof e.text === 'function' ? e.text(store.state) : e.text;
  if (colour) body += '\n\n' + colour;
  store.ending = {
    key, title: e.title, kind: e.kind || 'loss',
    kindLabel: e.kind === 'win' ? 'the one way through'
      : e.kind === 'secret' ? 'a secret'
      : e.kind === 'joke' ? 'well, technically' : 'an ending'
  };
  if (e.kind === 'win' || e.kind === 'secret') sfx.win();
  else if (e.kind === 'joke') sfx.bell();
  else sfx.doom();
  emit();
  typeOut(body, () => { store.choices = []; emit(); });
}

/* ------------------------------------------------------------------ */
/* panels                                                              */

export function openBag() {
  const s = store.state;
  const rows = s.inv.map(entry => {
    const it = api.ITEMS[entry.id]; if (!it) return null;
    return {
      id: entry.id,
      title: (typeof it.name === 'function' ? it.name(s) : it.name) + (entry.uses > 1 && entry.uses < 90 ? ' ×' + entry.uses : ''),
      body: typeof it.desc === 'function' ? it.desc(s) : it.desc,
      action: entry.uses > 0 ? 'Use it' : ''
    };
  }).filter(Boolean);
  store.overlay = { kind: 'bag', title: 'Bag', rows, empty: 'Nothing but lint and the mask you are wearing.' };
  pauseTimer(true); emit();
}

export function useBagItem(id) {
  const s = store.state;
  const it = api.ITEMS[id]; const entry = s.inv.find(x => x.id === id);
  if (!it || !entry) return;
  const res = it.use(s, { combat: C.active, scene: s.scene }) || {};
  entry.uses--;
  s.inv = s.inv.filter(x => x.uses > 0);
  syncHud(); save(); closeOverlay();
  if (res.toast) toast(res.toast);
  if (res.combatMsg && C.active) { C.log += '<p class="good">' + esc(res.combatMsg) + '</p>'; emit(); }
  if (res.go) go(res.go);
}

export function openBonds() {
  const s = store.state;
  const rows = Object.keys(s.bonds).filter(k => s.bonds[k] > 0).map(k => {
    const n = api.BONDNAMES[k] || {};
    return { id: k, title: n.name || k, body: n.note ? n.note(s.bonds[k]) : '', bar: Math.min(100, s.bonds[k] * 33) };
  });
  store.overlay = { kind: 'bonds', title: 'Bonds', rows, empty: 'Nobody yet. That is allowed, and it costs you later.' };
  pauseTimer(true); emit();
}

export function openJournal() {
  const j = journal();
  let found = 0;
  const rows = api.ENDING_ORDER.map(k => {
    const e = api.ENDINGS[k]; if (!e) return null;
    const got = !!j[k]; if (got) found++;
    return {
      id: k, locked: !got,
      title: got ? e.title : '— — —',
      tag: e.kind === 'win' ? 'the one true win' : e.kind === 'secret' ? 'secret' : e.kind === 'joke' ? 'joke' : 'attempt',
      body: got ? e.blurb : 'Not yet.',
      note: got ? j[k].note : ''
    };
  }).filter(Boolean);
  store.overlay = { kind: 'journal', title: 'Endings found', rows, footer: found + ' of ' + rows.length + ' found.' };
  pauseTimer(true); emit();
}

export function closeOverlay() { store.overlay = null; pauseTimer(false); emit(); }

export function openPanel(panel) { store.overlay = panel; pauseTimer(true); emit(); }

/* ------------------------------------------------------------------ */
/* lifecycle                                                           */

export function bootTitle() {
  store.screen = 'title';
  music.mood('title');
  refreshSaveInfo();
}

export function newGame() {
  unlock();
  store.state = freshState('you');
  store.screen = 'name';
  emit();
}

export function beginRun(name) {
  const s = store.state || freshState(name);
  s.name = (name || '').trim().slice(0, 16) || 'Wren';
  s.pools = api.buildPools(s.seed);
  api.applyPools(s);
  store.state = s;
  save();
  go('school_d1_a');
}

export function continueGame() {
  unlock();
  const s = loadSave(); if (!s) return;
  store.state = s;
  if (!s.pools) s.pools = api.buildPools(s.seed);
  api.applyPools(s);
  go(s.scene);
}

export function toTitle() {
  stopTimer();
  C.active = false;
  bootTitle();
  emit();
}


/* ---------- menu + help panels (shared by both renderers) ---------- */

export function openMenu() {
  const p = store.prefs;
  openPanel({
    kind: 'menu', title: 'Menu',
    html:
      '<div class="row"><h4>Endings found</h4><p>What this run and every run before it turned into.</p><button class="use" data-a="journal">Open</button></div>' +
      '<div class="row"><h4>Slower timer</h4><p>Gives you about three quarters again as long to read each tell. Currently ' + (p.slowTimer ? 'on' : 'off') + '.</p><button class="use" data-a="slow">Turn ' + (p.slowTimer ? 'off' : 'on') + '</button></div>' +
      '<div class="row"><h4>Music</h4><p>Generated live, no files. Currently ' + (p.music ? 'on' : 'off') + '.</p><button class="use" data-a="music">Turn ' + (p.music ? 'off' : 'on') + '</button></div>' +
      '<div class="row"><h4>All sound</h4><p>Currently ' + (p.muted ? 'muted' : 'on') + '.</p><button class="use" data-a="mute">' + (p.muted ? 'Unmute' : 'Mute') + '</button></div>' +
      '<div class="row"><h4>Back to the title</h4><p>Your place is saved. It saves itself every scene.</p><button class="use" data-a="title">Leave</button></div>'
  });
}

export function openHelp() {
  openPanel({
    kind: 'help', title: 'How to play',
    html: '<div class="help">' +
      '<p><b>Read.</b> Tap or press space to finish a line early. Number keys pick choices. The game never tells you which choices mattered, and most of the ones that matter do not look like they do.</p>' +
      '<p><b>Fight by reading.</b> No dice anywhere. Every enemy tells you what it is about to do \u2014 in words, and in the shape it makes above the text \u2014 and the same tell always has the same right answer.</p>' +
      '<p><b>Strike</b> when it is open. It hurts twice as much as anything else. <b>Slip</b> when it winds up something heavy; it gives you the most breath back. <b>Focus</b> only when it has stepped back and given you the room \u2014 it heals, it costs breath, and misreading it hurts double.</p>' +
      '<p><b>Guard is the one that is never a disaster.</b> Guess wrong with it and you still block; it only costs the breath you were saving. Nothing in this game can hit you that you had no way to answer. If you do not know, guard.</p>' +
      '<p><b>The clock.</b> Every exchange is timed, and the worse the thing in front of you, the less time you get. Let it run out and it hits you anyway. Standing still is a choice with a price.</p>' +
      '<p><b>Clarity.</b> Three correct reads in a row without Focus and the prose goes plain, the clock loosens, a clean read gives extra breath, and Strike hits harder still. One mistake ends it.</p>' +
      '<p><b>Echoes</b> are mask shards found off the path. Spend one to feel what a choice costs, or to see the enemy\'s next move early.</p>' +
      '<p><b>Turning points save themselves.</b> Fall in the Below and you can be put back to the last one. It costs something, but it does not cost the run.</p>' +
      '<p><b>Keys.</b> 1\u20139 choose \u00b7 space skips typing \u00b7 Q W E R are Strike, Guard, Slip, Focus \u00b7 I bag \u00b7 B bonds \u00b7 Esc menu.</p>' +
      '<p>If the clock is too fast there is a slower setting in the menu. It costs nothing.</p>' +
      '</div>'
  });
}

/** Handle a click on a [data-a] button inside a panel. */
export function panelAction(a) {
  if (a === 'journal') return openJournal();
  if (a === 'title') { closeOverlay(); toTitle(); return; }
  if (a === 'mute') { setPref('muted', !store.prefs.muted); return openMenu(); }
  if (a === 'music') { setPref('music', !store.prefs.music); return openMenu(); }
  if (a === 'slow') { setPref('slowTimer', !store.prefs.slowTimer); return openMenu(); }
  if (a === 'close') return closeOverlay();
}

export const game = {
  store, on, onTick, go, choose, skip, verb, spendEchoOnChoice, spendEchoInFight,
  combatContinue, openBag, useBagItem, openBonds, openJournal, closeOverlay, openPanel,
  newGame, beginRun, continueGame, toTitle, bootTitle, refreshSaveInfo,
  openMenu, openHelp, panelAction,
  hasCheckpoint, checkpointLabel, restoreCheckpoint,
  setPref, loadPrefs, pauseTimer, music, sfx, audio, unlock, api
};

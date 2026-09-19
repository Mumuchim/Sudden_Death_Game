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
  speaker: '',               // id of whoever is currently speaking/focal
  cast: [],                  // [{ id, art }] — others present but not speaking
  prose: '',                // html
  beat: '',                 // '' | 'quiet' | 'loud' — emphasis for a turning-point line
  quote: '',                // an epigraph shown above the prose
  typing: false,
  carrying: [],             // usable items surfaced under story choices
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
    log: '', glimpse: 'idle', dir: null, clarity: false, art: '',
    timerFrac: 1, timerOn: false, danger: false,
    canEcho: false, over: false, continueLabel: '', verbsOn: false,
    statuses: [], locks: { strike: 0, parry: 0, jump: 0, heal: 0 },
    verbOpen: { strike: true, parry: true, jump: true, heal: true },
    stagger: false, reeling: false, rail: []
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
    four: 'none', sealIntact: true, fights: 0,
    apostles: {}, told: {},
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
  store.state = migrate(JSON.parse(JSON.stringify(cp.state)));
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
  store.beat = sc.beat || '';
  store.quote = sc.quote ? (typeof sc.quote === 'function' ? sc.quote(store.state) : sc.quote) : '';
  store.art = sc.art ? (PORTRAIT[sc.art] || '') : '';
  store.speaker = sc.art || '';
  store.cast = (sc.cast || []).filter(id => id !== sc.art).map(id => ({ id, art: PORTRAIT[id] || '' }));
  syncRail();
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
/*
   Reading, not dice. Every tell still has exactly one right answer.
   The order is no longer memorisable, and getting it wrong now costs you.

   Four verbs:
   - Strike (Space)  — hurts twice as much as anything else, opens you up.
   - Parry (arrows,  — a timed block in one of three directions: left,
     left/front/right)  front, right. Guess the wrong side and it counts
                        as a miss, same as guessing the wrong verb.
   - Jump (down arrow) — a dodge. Some attacks are flatly unparryable and
                        say so, plainly, in the text: those must be jumped.
   - Heal (Ctrl)       — spends breath to mend one ember. Misread it and
                        it costs you double.

   - Each enemy has a teach window. For the first few exchanges it walks
     its written pattern, so you get shown all four tells once, in a shape
     the writer chose.
   - After that a seeded shuffle bag takes over. You still see every tell
     once per cycle, never the same one twice running, and it will not
     hand you a Heal tell when you have no breath to spend on it.
   - The seed is your run seed, so a save fights the same fight twice.

   Statuses:
   - Staggered   — any miss now staggers you, not just the heavy ones.
                   While staggered every verb but Jump goes dark. Jumping
                   clear is free and clears it. Standing there — trying
                   anything else, or the clock running out on you — costs
                   you again and leaves you staggered.
   - Reeling     — a clean Strike read while in Clarity knocks it back.
                   It cannot reach you that exchange.

   There are no cooldowns beyond that. The clock itself runs tighter and
   meaner than it used to — two to four seconds, shorter on anything that
   cannot be blocked — and a miss is never a minor tick any more.
*/

const DIRS = ['left', 'front', 'right'];
const DIRCUE = {
  left: 'It is coming from your left.',
  front: 'It is coming straight down the middle.',
  right: 'It is coming from your right.'
};

let def = null, winTo = '', loseTo = '';
let poise = 0, streak = 0, clarity = false, hits = 0;
let bondUsed = false, bondId = null, peekNext = false, over = false;
let rafId = null, timerEnd = 0, timerLen = 0, paused = false;
let curDir = null;

/* tell sequencing */
let rand = null, bag = [], drawn = 0, curT = 0, nxtT = 0, lastT = -1, shownT = -1;

/* statuses */
let stagger = 0, reel = 0, timeouts = 0, dmgMul = 1, speedMul = 1;
let allyLines = [];

const C = store.combat;

function glimpseFor(a) {
  return { jump: 'charge', parry: 'lunge', strike: 'open', heal: 'still' }[a] || 'idle';
}

function speedFor(t) {
  let ms = (def.speed || 8000) * speedMul;
  if (def.accel) ms *= Math.pow(def.accel, Math.max(0, drawn - 1));
  if (clarity) ms *= 1.15;
  if (stagger > 0) ms *= 1.15;   /* staggered still gives you a sliver more time to jump */
  if (t && t.a === 'jump') ms *= 0.82;  /* unparryable attacks arrive meaner and faster */
  if (store.prefs.slowTimer) ms *= 1.75;
  return Math.max(2000, Math.min(4000, ms));
}

function stopTimer() {
  C.timerOn = false; C.danger = false;
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
}

function startTimer() {
  stopTimer();
  timerLen = speedFor(currentTell());
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

/* ---------- the shuffle bag ---------- */

function shuffledBag() {
  const a = def.tells.map((_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

/* never present a tell whose only right answer you cannot afford */
function unaffordable(i) {
  const t = def.tells[i];
  if (t.a === 'heal' && store.state.breath < 2) return true;
  return false;
}

function drawTell() {
  const teach = def.teach === undefined ? 4 : def.teach;
  if (drawn < teach && def.pattern && def.pattern.length) {
    const v = def.pattern[drawn % def.pattern.length];
    drawn++; lastT = v; return v;
  }
  drawn++;
  if (!bag.length) bag = shuffledBag();
  let k = -1;
  for (let i = 0; i < bag.length; i++) if (bag[i] !== lastT && !unaffordable(bag[i])) { k = i; break; }
  if (k < 0) for (let i = 0; i < bag.length; i++) if (bag[i] !== lastT) { k = i; break; }
  if (k < 0) k = 0;
  const v = bag.splice(k, 1)[0];
  lastT = v; return v;
}

/* The next tell is drawn an exchange early so the Echo peek has something to
   show. By the time it actually lands you may have spent the breath it needs,
   so check again at the moment it becomes the current tell and quietly swap it
   for one you can answer. Skipped when you paid for a peek — a peek that lies
   is worse than a hard tell. */
function ensureAffordable() {
  if (!unaffordable(curT)) return;
  for (let i = 0; i < def.tells.length; i++) {
    if (i === curT || i === nxtT || i === shownT) continue;
    if (unaffordable(i)) continue;
    const j = bag.indexOf(i);
    if (j >= 0) bag.splice(j, 1);
    bag.push(curT);
    curT = i;
    return;
  }
}

function currentTell() { return def.tells[curT]; }
function nextTell() { return def.tells[nxtT]; }

/* ---------- statuses ---------- */

function setStagger(n) { stagger = Math.max(stagger, n + 1); }
function setReel(n) { reel = Math.max(reel, n + 1); }

function tickStatuses() {
  if (stagger > 0) stagger--;
  if (reel > 0) reel--;
}

/* Staggered, only Jump is open — you are off balance and there is no
   blocking or striking or breathing from there, only getting clear. */
function verbOpen(v) {
  if (stagger > 0) return v === 'jump';
  return true;
}

function syncStatus() {
  const list = [];
  if (stagger > 0) list.push({ k: 'bad', t: 'staggered', n: '', why: 'Only Jump is open. Jump clears it. Anything else, and the clock, cost you again.' });
  if (reel > 0) list.push({ k: 'good', t: 'it is reeling', n: '', why: 'It cannot reach you this exchange.' });
  if (clarity) list.push({ k: 'good', t: 'clarity', n: '', why: 'Clean reads hit harder and the clock loosens.' });
  C.statuses = list;
  C.locks = { strike: 0, parry: 0, jump: 0, heal: 0 };
  C.stagger = stagger > 0;
  C.reeling = reel > 0;
  C.verbOpen = { strike: verbOpen('strike'), parry: verbOpen('parry'), jump: verbOpen('jump'), heal: verbOpen('heal') };
}

/* ---------- the item rail ---------- */

function railRows(where) {
  const s = store.state; if (!s) return [];
  return s.inv.map(entry => {
    const it = api.ITEMS[entry.id];
    if (!it || entry.uses <= 0) return null;
    if (where === 'story' && it.combatOnly) return null;
    if (where === 'story' && it.hideInline) return null;
    if (where === 'combat' && it.storyOnly) return null;
    let hot = false;
    try { hot = it.suggest ? !!it.suggest(s, where) : false; } catch (e) {}
    return {
      id: entry.id,
      label: it.label || (typeof it.name === 'function' ? it.name(s) : it.name),
      tag: it.tag || '',
      uses: entry.uses < 90 ? entry.uses : 0,
      hot: hot
    };
  }).filter(Boolean);
}

export function syncRail() {
  C.rail = railRows('combat');
  store.carrying = railRows('story');
}

/* ---------- presenting a tell ---------- */

function present(prefix) {
  tickStatuses();
  const t = currentTell();
  curDir = t.a === 'parry' ? DIRS[Math.floor(rand() * DIRS.length)] : null;
  let body = prefix ? prefix + '\n\n' : '';
  if (stagger > 0) body += '%%You are not set. Nothing you own is where you left it. Jump clear of it \u2014 that is the only door left open.%%\n\n';
  else if (reel > 0) body += '@@It is still going backwards. This one is free.@@\n\n';
  if (clarity) body += '@@The fight has gone quiet enough to see.@@\n\n';
  body += (clarity && t.clear) ? t.clear : t.t;
  if (t.a === 'jump') body += '\n\n%%This one cannot be parried. There is no direction that blocks it. Jump, or take it.%%';
  if (t.a === 'parry') body += '\n\n~~' + DIRCUE[curDir] + '~~';
  C.glimpse = glimpseFor(t.a);
  C.dir = curDir;
  C.clarity = clarity;
  C.canEcho = store.state.echoes > 0 && !peekNext;
  C.verbsOn = false;
  syncStatus(); syncRail(); syncHud();
  typeOut(body, () => { C.verbsOn = true; startTimer(); emit(); });
}

/* move to the next exchange */
function nextExchange(msg, delay) {
  curT = nxtT; nxtT = drawTell();
  if (!peekNext) ensureAffordable();
  shownT = curT;
  peekNext = false;
  setTimeout(() => present(msg), delay === undefined ? 380 : delay);
}

function endClarity() { streak = 0; if (clarity) { clarity = false; C.clarity = false; } }
function setPoise(v) { poise = Math.max(0, v); C.poise = poise; }

/* ---------- start ---------- */

export function startCombat(d, win, lose) {
  def = JSON.parse(JSON.stringify(d));
  winTo = win; loseTo = lose;
  streak = 0; clarity = false; hits = 0; drawn = 0; bag = []; lastT = -1; shownT = -1;
  stagger = 0; reel = 0; timeouts = 0; dmgMul = 1; speedMul = 1; allyLines = [];
  bondUsed = false; peekNext = false; over = false; paused = false;
  bondId = null;

  const s = store.state;
  rand = rngFrom((s.seed || 1) + (def.name || '').length * 7717 + (s.fights = (s.fights || 0) + 1) * 131);

  let best = 0;
  Object.keys(s.bonds).forEach(k => {
    if (k === 'mumu') return;
    if (s.bonds[k] > best) { best = s.bonds[k]; bondId = k; }
  });
  if (best < 3) bondId = null;

  /* the regressor's help, if you earned it */
  if (def.allyBoost && api.bondLevel('mumu') >= 3) {
    dmgMul = 2; speedMul = 1.6;
    allyLines.push('Mumu the Hollow is standing in the doorway with her arms folded, and she is not going to help you fight, and she has already helped you more than anyone alive.');
  }
  /* apostles you did not kill */
  (def.allyBoost ? ['ap_tallow', 'ap_quill', 'ap_bit'] : []).forEach(k => {
    if (api.bondLevel(k) >= 3) {
      speedMul *= 1.06;
      setPoiseBonus();
      allyLines.push(((api.BONDNAMES[k] || {}).name || 'Someone') + ' is here. They should not be. They came anyway.');
    }
  });
  function setPoiseBonus() { def.poise = Math.max(4, def.poise - 2); }

  curT = drawTell(); nxtT = drawTell();
  ensureAffordable(); shownT = curT;

  store.screen = 'combat';
  store.art = '';
  C.active = true; C.over = false; C.name = def.name;
  C.art = ENEMY_ART[def.art] || ENEMY_ART.husk;
  C.poiseMax = def.poise; setPoise(def.poise);
  C.glimpse = 'idle'; C.clarity = false; C.continueLabel = '';
  C.timerOn = false; C.timerFrac = 1; C.verbsOn = false;
  C.statuses = []; C.rail = [];
  music.mood(def.poise >= 12 ? 'boss' : def.poise >= 8 ? 'boss' : 'combat');

  let intro = def.intro;
  if (bondId) intro += '\n\n~~' + ((api.BONDNAMES[bondId] || {}).name || 'Someone') + ' is at your shoulder.~~';
  allyLines.forEach(l => { intro += '\n\n~~' + l + '~~'; });
  syncStatus(); syncRail();
  emit();
  typeOut(intro, () => setTimeout(() => present(''), 250));
}

/* ---------- taking one ---------- */

function timeout() {
  if (over) return;
  C.verbsOn = false;
  endClarity();
  timeouts++;
  C.glimpse = 'hit';
  sfx.timeout();
  const msg = '%%You do nothing. That is also an answer, and it is the worst one \u2014 it arrives anyway, on time, into a person who was still deciding.%%';
  damageSelf(2, msg, true);
}

function damageSelf(dmg, msg, causesStagger) {
  if (reel > 0) {
    reel = 0;
    return nextExchange(msg + '\n\n||It is too far back to finish it. The blow goes through the space where you would have been standing if either of you had been having a good night.||');
  }
  if (bondId && !bondUsed && api.bondLevel(bondId) >= 3) {
    bondUsed = true;
    const nm = (api.BONDNAMES[bondId] || {}).name || 'someone';
    msg += '\n\n~~' + nm + ' gets there first and takes it instead of you. Once. They will not manage it twice.~~';
    return nextExchange(msg, 420);
  }
  timeouts = 0;
  hits++;
  api.hurt(dmg);
  if (causesStagger && store.state.ember > 0) setStagger(1);
  if (store.state.ember <= 0) {
    over = true; C.over = true; stopTimer();
    typeOut(msg + '\n\n||The dark that has been patient with you stops being patient.||', () => {
      C.continueLabel = 'Let go'; emit();
    });
    return;
  }
  nextExchange(msg, 420);
}

/* ---------- the four verbs ---------- */

export function verb(v, dir) {
  if (over || !C.verbsOn) { skip(); return; }
  if (store.typing) { skip(); return; }
  if (!verbOpen(v)) { sfx.warn(); return; }

  C.verbsOn = false; C.canEcho = false;
  stopTimer();
  const t = currentTell();
  const s = store.state;

  /* jumping clear of a stagger is free, always works, and clears it —
     it is the one door that never closes, but it is the only one. */
  if (stagger > 0) {
    stagger = 0; timeouts = 0;
    endClarity(); C.glimpse = 'brace';
    return nextExchange('||You throw yourself clear of wherever you were standing and land somewhere that is, for one more beat, still yours.||');
  }

  timeouts = 0;
  const correctVerb = t.a === v;
  const correctDir = v !== 'parry' || dir === curDir;
  const correct = correctVerb && correctDir;

  if (v === 'heal') {
    if (correct && s.breath >= 2) {
      s.breath -= 2; api.heal(1); sfx.heal();
      endClarity(); C.glimpse = 'recoil';
      return nextExchange('||' + (t.ok || 'You take the gap it gave you and breathe.') + '||');
    }
    endClarity(); C.glimpse = 'hit';
    const m = (correctVerb && s.breath < 2)
      ? '||There is nothing left in your lungs to spend. You stand there wanting air and it watches you want it.||'
      : '||' + (t.bad || 'You close your eyes at exactly the wrong moment.') + '||';
    return damageSelf(2, m, true);
  }

  if (correct) {
    let dmg = v === 'strike' ? (clarity ? 3 : 2) : 1;
    dmg *= dmgMul;
    setPoise(poise - dmg);
    streak++;
    const gain = (v === 'jump' ? 2 : 1) + (clarity ? 1 : 0);
    s.breath = Math.min(s.breathCap, s.breath + gain);
    sfx.good();
    C.glimpse = 'recoil';
    let msg = '||' + (t.ok || 'You read it right.') + '||';

    if (v === 'strike' && clarity) {
      setReel(1); msg += '\n\n||It goes backwards off it. For one exchange it is not a threat, it is furniture.||';
    }

    if (!clarity && streak >= 3) {
      clarity = true; C.clarity = true; sfx.clear();
      msg += '\n\n||Three in a row. The noise drops out of the room, the clock loosens, and your hands know what they are doing.||';
    }
    if (def.phase && poise <= def.phase.at && !def.phase.done) {
      def.phase.done = true;
      def.tells[def.phase.index].a = def.phase.a;
      if (def.phase.clearText) def.tells[def.phase.index].t = def.phase.clearText;
      if (def.phase.speed) speedMul *= def.phase.speed;
      msg += '\n\n||' + def.phase.text + '||';
      if (clarity) msg += '\n\n||Clear-headed, you catch the change a fraction before it lands.||';
      bag = [];
    }
    if (poise <= 0) return finish(msg);
    return nextExchange(msg);
  }

  /* a miss. every miss now costs you and staggers you — there is no
     verb left that absorbs a wrong read for free. */
  endClarity(); C.glimpse = 'hit';
  let dmg = 2, msg;
  if (t.a === 'jump' && v !== 'jump') {
    dmg = 3;
    msg = '||' + (t.bad || 'You try to hold against a thing that was never going to be held.') +
      '||\n\n%%That one could not be parried. Only jumped.%%';
  } else if (v === 'parry' && correctVerb && !correctDir) {
    msg = '||Wrong side. It comes through the gap you left open.||';
  } else {
    msg = '||' + (t.bad || 'Wrong. It was never going to be that.') + '||';
  }
  return damageSelf(dmg, msg, true);
}

function finish(msg) {
  over = true; C.over = true; C.active = false; stopTimer();
  C.glimpse = 'down';
  if (hits >= 3) { api.scar(); msg += '\n\n%%Something in you does not come back all the way. It never will.%%'; }
  store.state.breath = store.state.breathCap;
  syncHud(); syncStatus();
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

/* the story can end a fight early, or hand you an opening */
api.Combat = {
  damageFoe(n) {
    setPoise(poise - n * dmgMul); emit();
    if (poise <= 0 && !over) setTimeout(() => finish('~~That was the last of it.~~'), 250);
  },
  isActive() { return C.active && !over; },
  foeName() { return def ? def.name : ''; },
  poiseFrac() { return def && def.poise ? poise / def.poise : 1; },
  stagger(n) { setStagger(n || 1); syncStatus(); emit(); },
  reel(n) { setReel(n || 1); syncStatus(); emit(); }
};

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
  if (!it || !entry || entry.uses <= 0) return;
  const inFight = C.active && !C.over;
  /* no reaching into the bag mid-sentence: the exchange has not been handed
     to you yet, and letting it through queues a second nextExchange and
     desyncs the whole fight. */
  if (inFight && (store.typing || !C.verbsOn)) return;
  const res = it.use(s, { combat: inFight, scene: s.scene }) || {};
  if (res.refuse) { toast(res.refuse); return; }
  entry.uses--;
  s.inv = s.inv.filter(x => x.uses > 0);
  syncHud(); syncRail(); save();
  if (store.overlay) closeOverlay();
  if (res.toast) toast(res.toast);
  if (res.go) {
    /* an item that ends the scene has to end the fight with it, or the timer
       keeps running underneath the story and hits you in a room with no
       enemy in it. */
    if (inFight) { over = true; C.over = true; C.active = false; C.verbsOn = false; C.timerOn = false; stopTimer(); }
    go(res.go); return;
  }
  if (inFight) {
    if (res.instant) {
      C.log += '<p class="good">' + esc(res.combatMsg || 'You use it.') + '</p>';
      emit(); return;
    }
    /* using a thing costs you the exchange. it resolves as a free guard,
       so it is a real decision and not a free heal. */
    C.verbsOn = false; C.canEcho = false; stopTimer();
    nextExchange('||' + (res.combatMsg || 'You use it.') + '\n\nIt costs you the exchange. You get an arm up instead, and that is all you get.||');
    return;
  }
  emit();
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

function migrate(s) {
  if (!s) return s;
  if (!s.apostles) s.apostles = {};
  if (!s.told) s.told = {};
  if (typeof s.fights !== 'number') s.fights = 0;
  return s;
}

export function continueGame() {
  unlock();
  const s = migrate(loadSave()); if (!s) return;
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
      '<p><b>Fight by reading.</b> No dice anywhere. Every enemy tells you what it is about to do \u2014 in words, and in the shape it makes above the text \u2014 and the same tell always has the same right answer. You have two to four seconds to answer it. That is not long.</p>' +
      '<p><b>Strike</b> (space) when it is open; it hurts twice as much as anything else, and it leaves you open while you do it.</p>' +
      '<p><b>Parry</b> (arrow keys \u2014 left, up, right) is a timed block in one of three directions. The text always tells you which side it is coming from. Block the wrong side and it counts as a full miss, same as guessing wrong entirely.</p>' +
      '<p><b>Jump</b> (down arrow) is a dodge, and it is the only answer to anything the game tells you flatly cannot be parried. It will say so, in the text, every time \u2014 there is no hidden tell for this. Try to parry one of these anyway and it hurts worse than a normal miss.</p>' +
      '<p><b>Heal</b> (Ctrl) only when it has stepped back \u2014 it mends one ember and costs breath, and misreading it hurts as much as any other miss.</p>' +
      '<p><b>Every miss costs you, and every miss staggers you.</b> There is no verb left that absorbs a wrong read for free \u2014 not any more. A miss is a real wound and a bad position, both at once.</p>' +
      '<p><b>Staggered.</b> One wrong read, or the clock running out on you, and everything but Jump goes dark for that beat. Jumping clear is free and clears it. Standing there and trying anything else \u2014 or freezing \u2014 hits you again and leaves you staggered.</p>' +
      '<p><b>The order is not fixed.</b> Each enemy shows you all four of its tells in its own written order first, so you can learn them. After that the order shuffles: you will still see every tell once a cycle, never twice running, and never a Heal tell you have no breath for. You cannot memorise a fight. You can only read it, fast.</p>' +
      '<p><b>Reeling.</b> A clean Strike while you are in Clarity knocks it back. For one exchange it cannot reach you.</p>' +
      '<p><b>Clarity.</b> Three correct reads in a row without Heal and the prose goes plain, the clock loosens slightly, a clean read gives extra breath, and Strike hits harder still. One mistake ends it.</p>' +
      '<p><b>Your bag is on the screen.</b> Items sit under the verbs in a fight and under the choices out of one. A glowing one is the game telling you now would be the moment. Using something in a fight costs you the exchange \u2014 you take a free hit\'s worth of risk instead of a read.</p>' +
      '<p><b>Echoes</b> are mask shards found off the path. Spend one to feel what a choice costs, or to see the enemy\'s next move early.</p>' +
      '<p><b>Turning points save themselves.</b> Fall in the Below and you can be put back to the last one. It costs something, but it does not cost the run.</p>' +
      '<p><b>People are the mechanic.</b> Time spent on somebody is not flavour. It decides who stands aside for you later, and who does not get to.</p>' +
      '<p><b>Keys.</b> 1\u20139 choose \u00b7 space skips typing and Strikes in a fight \u00b7 arrow keys parry left / front / right \u00b7 down arrow jumps \u00b7 Ctrl heals \u00b7 I bag \u00b7 B bonds \u00b7 Esc menu.</p>' +
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
  store, on, onTick, go, choose, skip, verb, syncRail, spendEchoOnChoice, spendEchoInFight,
  combatContinue, openBag, useBagItem, openBonds, openJournal, closeOverlay, openPanel,
  newGame, beginRun, continueGame, toTitle, bootTitle, refreshSaveInfo,
  openMenu, openHelp, panelAction,
  hasCheckpoint, checkpointLabel, restoreCheckpoint,
  setPref, loadPrefs, pauseTimer, music, sfx, audio, unlock, api
};

/* Sudden Death — by mumuchxm.
   Generated from src/game by tools/build-static.js. Do not edit by hand. */
(function () {
'use strict';

/* ===== registry.js ===== */
/* Sudden Death — shared registry.
   Story modules import `api` and hang scenes, endings and items off it.
   The runtime (core.js) fills in the verbs. Both the static build and the
   Vue build use this exact object, so the story is written once. */

const api = {
  SCENES: {},
  ENDINGS: {},
  ITEMS: {},
  BONDNAMES: {},
  ENDING_ORDER: [],
  Combat: { damageFoe: function () {} },
  state: null,

  /* filled by core.js */
  rngFrom: null, pick: null,
  addItem: null, hasItem: null, useItem: null,
  bond: null, bondLevel: null,
  doubt: null, shard: null,
  hurt: null, heal: null, scar: null,
  toast: null, drawHud: function () {},
  sfx: null
};


/* ===== audio.js ===== */
/* Sudden Death — everything you hear is made on the spot.
   No audio files. Two parts: short sfx, and an adaptive generated score. */

let ctx = null;
let dead = false;
let master = null;
let musicGain = null;
let sfxGain = null;

const audio = {
  muted: false,
  musicOn: true
};

function ac() {
  if (dead) return null;
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 1; master.connect(ctx.destination);
      sfxGain = ctx.createGain(); sfxGain.gain.value = 1; sfxGain.connect(master);
      musicGain = ctx.createGain(); musicGain.gain.value = 0; musicGain.connect(master);
    } catch (e) { dead = true; return null; }
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function unlock() { ac(); }

function tone(freq, dur, type, vol, slideTo, dest) {
  const c = ac(); if (!c || audio.muted) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(freq, c.currentTime);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.exponentialRampToValueAtTime(vol || 0.06, c.currentTime + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  o.connect(g); g.connect(dest || sfxGain);
  o.start(); o.stop(c.currentTime + dur + 0.02);
}

function noise(dur, vol, filt) {
  const c = ac(); if (!c || audio.muted) return;
  const n = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filt || 900;
  const g = c.createGain(); g.gain.value = vol || 0.08;
  src.connect(f); f.connect(g); g.connect(sfxGain); src.start();
}

const sfx = {
  tick: () => tone(1400 + Math.random() * 300, 0.012, 'square', 0.005),
  click: () => tone(420, 0.09, 'triangle', 0.05, 300),
  good: () => { tone(660, 0.11, 'sine', 0.05); setTimeout(() => tone(990, 0.13, 'sine', 0.04), 60); },
  hurt: () => { noise(0.22, 0.14, 500); tone(96, 0.3, 'sawtooth', 0.05, 62); },
  heal: () => tone(520, 0.2, 'sine', 0.045, 780),
  clear: () => { tone(880, 0.16, 'sine', 0.035); setTimeout(() => tone(1320, 0.22, 'sine', 0.028), 80); },
  shard: () => { tone(1180, 0.14, 'triangle', 0.04); setTimeout(() => tone(1570, 0.2, 'sine', 0.03), 70); },
  doom: () => { tone(140, 1.1, 'sawtooth', 0.06, 48); noise(0.7, 0.07, 340); },
  bell: () => { tone(300, 1.6, 'sine', 0.07, 150); setTimeout(() => tone(452, 1.4, 'sine', 0.04), 90); },
  win: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.5, 'sine', 0.045), i * 150)),
  warn: () => tone(220, 0.07, 'square', 0.035),
  timeout: () => { tone(70, 0.6, 'sawtooth', 0.07, 40); noise(0.4, 0.1, 260); }
};

/* ------------------------------------------------------------------ */
/* music                                                               */

const MOODS = {
  title:  { root: 110.00, scale: [0, 3, 7, 10, 12], step: 2400, drone: 0.05, bright: 320, pulse: 0 },
  school: { root: 146.83, scale: [0, 2, 4, 7, 9, 12], step: 1900, drone: 0.03, bright: 620, pulse: 0 },
  dread:  { root: 130.81, scale: [0, 1, 3, 6, 8], step: 1500, drone: 0.05, bright: 280, pulse: 0 },
  below:  { root: 98.00,  scale: [0, 3, 5, 7, 10, 15], step: 2600, drone: 0.06, bright: 300, pulse: 0 },
  combat: { root: 87.31,  scale: [0, 3, 5, 6, 10], step: 1100, drone: 0.05, bright: 420, pulse: 620 },
  boss:   { root: 73.42,  scale: [0, 1, 5, 6, 8, 11], step: 800, drone: 0.07, bright: 500, pulse: 430 },
  ending: { root: 164.81, scale: [0, 4, 7, 11, 14], step: 2200, drone: 0.05, bright: 700, pulse: 0 }
};

let current = null;
let wanted = null;
let voices = [];
let seqTimer = null;
let pulseTimer = null;
let step = 0;

function stopVoices() {
  voices.forEach(v => { try { v.stop ? v.stop() : v.disconnect(); } catch (e) {} });
  voices = [];
  if (seqTimer) { clearInterval(seqTimer); seqTimer = null; }
  if (pulseTimer) { clearInterval(pulseTimer); pulseTimer = null; }
}

function startDrone(m) {
  const c = ac(); if (!c) return;
  const filt = c.createBiquadFilter();
  filt.type = 'lowpass'; filt.frequency.value = m.bright; filt.Q.value = 2;
  filt.connect(musicGain);

  [1, 1.005, 2.002].forEach((mult, i) => {
    const o = c.createOscillator();
    o.type = i === 2 ? 'triangle' : 'sawtooth';
    o.frequency.value = m.root * mult;
    const g = c.createGain();
    g.gain.value = (i === 2 ? 0.25 : 1) * m.drone;
    o.connect(g); g.connect(filt); o.start();
    voices.push(o);
  });

  // slow breathing of the filter
  const lfo = c.createOscillator(); lfo.frequency.value = 0.05;
  const lg = c.createGain(); lg.gain.value = m.bright * 0.4;
  lfo.connect(lg); lg.connect(filt.frequency); lfo.start();
  voices.push(lfo);
}

const music = {
  mood(name) {
    wanted = name;
    if (!audio.musicOn) { current = null; return; }
    if (name === current) return;
    const m = MOODS[name] || MOODS.below;
    const c = ac(); if (!c) return;
    current = name;
    stopVoices();
    startDrone(m);
    musicGain.gain.cancelScheduledValues(c.currentTime);
    musicGain.gain.setValueAtTime(Math.max(0.0001, musicGain.gain.value), c.currentTime);
    musicGain.gain.linearRampToValueAtTime(0.55, c.currentTime + 2.2);

    step = 0;
    seqTimer = setInterval(() => {
      if (audio.muted || !audio.musicOn) return;
      step++;
      if (step % 3 === 2) return;              // leave holes; it should feel empty
      const deg = m.scale[(step * 3 + (step % 5)) % m.scale.length];
      const oct = step % 7 === 0 ? 2 : 1;
      tone(m.root * 4 * oct * Math.pow(2, deg / 12), 1.9, 'sine', 0.05, null, musicGain);
    }, m.step);

    if (m.pulse) {
      pulseTimer = setInterval(() => {
        if (audio.muted || !audio.musicOn) return;
        tone(m.root / 2, 0.16, 'sine', 0.16, m.root / 2.6, musicGain);
      }, m.pulse);
    }
  },

  stop() {
    const c = ac(); if (!c) { current = null; return; }
    musicGain.gain.cancelScheduledValues(c.currentTime);
    musicGain.gain.setValueAtTime(musicGain.gain.value, c.currentTime);
    musicGain.gain.linearRampToValueAtTime(0.0001, c.currentTime + 0.8);
    setTimeout(stopVoices, 900);
    current = null;
  },

  duck(on) {
    const c = ac(); if (!c || !musicGain) return;
    musicGain.gain.linearRampToValueAtTime(on ? 0.18 : 0.55, c.currentTime + 0.4);
  },

  setMusic(on) {
    audio.musicOn = on;
    if (!on) { this.stop(); return; }
    current = null;
    if (wanted) this.mood(wanted);
  },

  setMuted(on) {
    audio.muted = on;
    const c = ac(); if (!c) return;
    master.gain.linearRampToValueAtTime(on ? 0.0001 : 1, c.currentTime + 0.2);
  }
};


/* ===== art.js ===== */
/* Sudden Death — art.
   Every enemy gets its own silhouette. They all share the same structure
   (aura / mask / shadow) so one set of state animations drives all of them. */

const wrap = inner => '<svg viewBox="0 0 160 124" preserveAspectRatio="xMidYMid meet">' +
  '<ellipse class="aura" cx="80" cy="58" rx="44" ry="40"/>' +
  '<g class="mask">' + inner + '</g>' +
  '<g class="shadow"><ellipse cx="80" cy="112" rx="32" ry="5"/></g></svg>';

const ENEMY_ART = {
  /* a hollowed-out vessel, horns, two slits */
  husk: wrap(
    '<path class="horns" d="M54 44 L43 12 L68 34 Z M106 44 L117 12 L92 34 Z"/>' +
    '<path class="shell" d="M80 20 C58 20 46 38 46 58 c0 23 14 41 34 46 20-5 34-23 34-46 0-20-12-38-34-38z"/>' +
    '<path class="eyes" d="M64 60 h13 M83 60 h13"/>' +
    '<path class="crack" d="M80 26 l-7 26 9 10 -5 22"/>'),

  /* something long under the water */
  serpent: wrap(
    '<path class="shell" d="M22 84 c18 0 20-16 36-16 s18 16 34 16 20-18 34-18 c8 0 12 4 12 4"/>' +
    '<path class="shell" d="M96 36 c14 0 22 10 22 20 0 12-10 20-22 20 -14 0-22-9-22-20 0-11 9-20 22-20z"/>' +
    '<path class="eyes" d="M104 52 h10"/>' +
    '<path class="horns" d="M96 38 L86 18 L110 32 Z"/>' +
    '<path class="crack" d="M98 44 l-4 14 8 6"/>'),

  /* a door that learned to stand up */
  warden: wrap(
    '<path class="shell" d="M62 22 h36 v70 h-36 z"/>' +
    '<path class="horns" d="M62 22 L46 8 L62 38 Z M98 22 L114 8 L98 38 Z"/>' +
    '<path class="shell" d="M20 56 h42 M98 56 h42"/>' +
    '<path class="eyes" d="M70 46 h8 M82 46 h8"/>' +
    '<path class="crack" d="M80 24 v66"/>'),

  /* the shape three hundred years of holding makes */
  keeper: wrap(
    '<path class="shell" d="M80 14 C60 14 50 32 50 54 c0 26 12 44 30 52 18-8 30-26 30-52 0-22-10-40-30-40z"/>' +
    '<path class="horns" d="M50 44 L34 10 L70 30 Z M110 44 L126 10 L90 30 Z"/>' +
    '<path class="eyes" d="M68 54 l10 8 M92 54 l-10 8"/>' +
    '<path class="chains" d="M30 76 h100 M36 88 h88"/>' +
    '<path class="crack" d="M80 20 l-8 34 10 12 -6 28"/>'),

  /* someone from another world, wearing your flaw */
  apostle: wrap(
    '<path class="horns" d="M56 42 L46 14 L70 34 Z M104 42 L114 14 L90 34 Z"/>' +
    '<path class="shell" d="M80 20 C59 20 48 37 48 57 c0 22 13 39 32 45 19-6 32-23 32-45 0-20-11-37-32-37z"/>' +
    '<path class="eyes" d="M65 58 h12 M83 58 h12"/>' +
    '<path class="shell" d="M64 78 q16 8 32 0"/>' +
    '<path class="crack" d="M62 30 l4 -8"/>'),

  /* the fourth one */
  four: wrap(
    '<path class="horns" d="M56 42 L46 14 L70 34 Z M104 42 L114 14 L90 34 Z"/>' +
    '<path class="shell" d="M80 20 C59 20 48 37 48 57 c0 22 13 39 32 45 19-6 32-23 32-45 0-20-11-37-32-37z"/>' +
    '<path class="eyes" d="M65 58 h12 M83 58 h12"/>' +
    '<path class="numeral" d="M70 76 v10 M76 76 v10 M82 76 v10 M88 72 v14"/>'),

  /* she is not a monster and the game will not pretend she is */
  radiance: wrap(
    '<g class="rays"><path class="horns" d="M80 4 v18 M80 108 v-18 M18 58 h18 M142 58 h-18 M36 20 l13 13 M124 20 l-13 13 M36 96 l13-13 M124 96 l-13-13"/></g>' +
    '<circle class="shell" cx="80" cy="58" r="30"/>' +
    '<path class="eyes" d="M66 52 q14 -10 28 0"/>' +
    '<path class="eyes" d="M70 66 q10 8 20 0"/>' +
    '<circle class="crack" cx="80" cy="58" r="16"/>'),

  /* a warm, funny, helpful man */
  mangod: wrap(
    '<circle class="shell" cx="80" cy="56" r="32"/>' +
    '<path class="eyes" d="M66 46 q5 -7 10 0 M84 46 q5 -7 10 0"/>' +
    '<path class="smile" d="M62 64 q18 20 36 0"/>' +
    '<path class="crack" d="M80 24 v-8 M62 30 l-5 -6 M98 30 l5 -6"/>')
};

/* Small line portraits, shown once when a character matters. */
const face = inner => '<svg viewBox="0 0 80 80" preserveAspectRatio="xMidYMid meet"><g class="por">' + inner + '</g></svg>';

const PORTRAIT = {
  mira: face(
    '<path d="M40 12 C26 12 20 24 20 36 c0 16 9 27 20 31 11-4 20-15 20-31 0-12-6-24-20-24z"/>' +
    '<path d="M30 36 h8 M42 36 h8"/>' +
    '<path d="M32 50 q8 6 16 0"/>' +
    '<path d="M40 62 l-6 8 6 6 6-6z"/>'),
  ally: face(
    '<path d="M40 14 C28 14 22 25 22 36 c0 15 8 25 18 29 10-4 18-14 18-29 0-11-6-22-18-22z"/>' +
    '<path d="M31 35 h7 M42 35 h7"/>' +
    '<path d="M33 48 q7 4 14 0"/>' +
    '<path d="M16 70 q24 -12 48 0"/>'),
  mangod: face(
    '<circle cx="40" cy="36" r="22"/>' +
    '<path d="M31 30 q4 -6 8 0 M41 30 q4 -6 8 0"/>' +
    '<path d="M28 42 q12 14 24 0"/>' +
    '<path d="M40 10 v-6 M22 16 l-4 -5 M58 16 l4 -5"/>'),
  four: face(
    '<path d="M40 14 C28 14 22 26 22 37 c0 14 8 24 18 28 10-4 18-14 18-28 0-11-6-23-18-23z"/>' +
    '<path d="M30 36 h8 M42 36 h8"/>' +
    '<path d="M30 56 v8 M35 56 v8 M40 56 v8 M46 52 v12"/>'),
  sealed: face(
    '<path d="M40 8 C27 8 20 22 20 38 c0 18 8 30 20 34 12-4 20-16 20-34 0-16-7-30-20-30z"/>' +
    '<path d="M31 34 l7 7 M49 34 l-7 7"/>' +
    '<path d="M12 52 h56 M16 62 h48"/>'),
  bright: face(
    '<circle cx="40" cy="38" r="18"/>' +
    '<path d="M40 6 v10 M40 70 v-10 M8 38 h10 M72 38 h-10 M17 15 l7 7 M63 15 l-7 7 M17 61 l7 -7 M63 61 l-7 -7"/>' +
    '<path d="M31 34 q9 -6 18 0"/>'),
  companion: face(
    '<path d="M40 16 C29 16 24 26 24 36 c0 14 7 23 16 27 9-4 16-13 16-27 0-10-5-20-16-20z"/>' +
    '<path d="M32 34 h6 M43 34 h6"/>' +
    '<path d="M34 47 q6 4 12 0"/>' +
    '<path d="M22 66 q18 -10 36 0"/>'),
  you: face(
    '<path d="M40 12 C27 12 21 25 21 38 c0 16 8 27 19 31 11-4 19-15 19-31 0-13-6-26-19-26z"/>' +
    '<path d="M29 37 h9 M43 37 h9"/>' +
    '<path d="M40 18 L30 4 L52 16 Z"/>')
};


/* ===== core.js ===== */
/* Sudden Death — headless runtime.
   Knows nothing about the DOM. Mutates `store` and tells listeners.
   Both the plain-HTML build and the Vue build drive this same object. */


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
function tokenize(text) {
  const who = (store.state && store.state.name) || 'you';
  const body = String(text).replace(/\$NAME/g, who);
  return body.split('\n\n').map(p => spans(p, ''));
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Build HTML for the first `shown` characters of a tokenized text. */
function renderTokens(paras, shown) {
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

function fullHtml(text) { return renderTokens(tokenize(text), Infinity); }

/** Same, but for places that must stay on one line — choice labels, buttons. */
function inlineHtml(text) {
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

const store = {
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
function on(fn) { listeners.push(fn); return () => listeners.splice(listeners.indexOf(fn), 1); }
function onTick(fn) { tickers.push(fn); return () => tickers.splice(tickers.indexOf(fn), 1); }
function emit() { store.version++; listeners.forEach(f => f(store)); }
function tickEmit() { tickers.forEach(f => f(store.combat.timerFrac)); }

/* ------------------------------------------------------------------ */
/* persistence                                                         */

function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }

function loadPrefs() {
  try { Object.assign(store.prefs, JSON.parse(lsGet(PREFS) || '{}')); } catch (e) {}
  audio.muted = !!store.prefs.muted;
  audio.musicOn = store.prefs.music !== false;
}
function savePrefs() { lsSet(PREFS, JSON.stringify(store.prefs)); }

function setPref(k, v) {
  store.prefs[k] = v; savePrefs();
  if (k === 'muted') music.setMuted(v);
  if (k === 'music') music.setMusic(v);
  emit();
}

function save() { if (store.state) lsSet(SAVE, JSON.stringify(store.state)); }
function loadSave() { try { const r = lsGet(SAVE); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
function journal() { try { return JSON.parse(lsGet(JOURNAL) || '{}'); } catch (e) { return {}; } }

function refreshSaveInfo() {
  const s = loadSave();
  store.hasSave = !!s;
  store.saveLabel = s ? (s.flags && s.flags.below ? 'Continue — the Below' : 'Continue — school, day ' + (s.day || 1)) : '';
  emit();
}

/* ------------------------------------------------------------------ */
/* state helpers                                                       */

function freshState(name) {
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

function hasCheckpoint() { return !!lsGet(CHECK); }

function checkpointLabel() {
  try { return JSON.parse(lsGet(CHECK)).label; } catch (e) { return ''; }
}

api.restoreCheckpoint = function () { restoreCheckpoint(); };
api.hasCheck = function () { return hasCheckpoint(); };
api.lastCheckpoint = function () { return checkpointLabel() || 'the last turning point'; };

function restoreCheckpoint() {
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

function skip() {
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

function go(id) {
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

function choose(idx) {
  const item = store.choices[idx]; if (!item || store.typing) { skip(); return; }
  sfx.click();
  const c = item._c;
  if (c.do) c.do(store.state);
  const dest = typeof c.to === 'function' ? c.to(store.state) : c.to;
  if (dest) go(dest);
}

function spendEchoOnChoice() {
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

function pauseTimer(on) { paused = on; }

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

function startCombat(d, win, lose) {
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

function verb(v) {
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

function combatContinue() {
  if (!C.continueLabel) return;
  const dest = store.state.ember <= 0 ? loseTo : winTo;
  C.continueLabel = ''; C.active = false;
  go(dest);
}

function spendEchoInFight() {
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

function openBag() {
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

function useBagItem(id) {
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

function openBonds() {
  const s = store.state;
  const rows = Object.keys(s.bonds).filter(k => s.bonds[k] > 0).map(k => {
    const n = api.BONDNAMES[k] || {};
    return { id: k, title: n.name || k, body: n.note ? n.note(s.bonds[k]) : '', bar: Math.min(100, s.bonds[k] * 33) };
  });
  store.overlay = { kind: 'bonds', title: 'Bonds', rows, empty: 'Nobody yet. That is allowed, and it costs you later.' };
  pauseTimer(true); emit();
}

function openJournal() {
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

function closeOverlay() { store.overlay = null; pauseTimer(false); emit(); }

function openPanel(panel) { store.overlay = panel; pauseTimer(true); emit(); }

/* ------------------------------------------------------------------ */
/* lifecycle                                                           */

function bootTitle() {
  store.screen = 'title';
  music.mood('title');
  refreshSaveInfo();
}

function newGame() {
  unlock();
  store.state = freshState('you');
  store.screen = 'name';
  emit();
}

function beginRun(name) {
  const s = store.state || freshState(name);
  s.name = (name || '').trim().slice(0, 16) || 'Wren';
  s.pools = api.buildPools(s.seed);
  api.applyPools(s);
  store.state = s;
  save();
  go('school_d1_a');
}

function continueGame() {
  unlock();
  const s = loadSave(); if (!s) return;
  store.state = s;
  if (!s.pools) s.pools = api.buildPools(s.seed);
  api.applyPools(s);
  go(s.scene);
}

function toTitle() {
  stopTimer();
  C.active = false;
  bootTitle();
  emit();
}


/* ---------- menu + help panels (shared by both renderers) ---------- */

function openMenu() {
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

function openHelp() {
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
function panelAction(a) {
  if (a === 'journal') return openJournal();
  if (a === 'title') { closeOverlay(); toTitle(); return; }
  if (a === 'mute') { setPref('muted', !store.prefs.muted); return openMenu(); }
  if (a === 'music') { setPref('music', !store.prefs.music); return openMenu(); }
  if (a === 'slow') { setPref('slowTimer', !store.prefs.slowTimer); return openMenu(); }
  if (a === 'close') return closeOverlay();
}

const game = {
  store, on, onTick, go, choose, skip, verb, spendEchoOnChoice, spendEchoInFight,
  combatContinue, openBag, useBagItem, openBonds, openJournal, closeOverlay, openPanel,
  newGame, beginRun, continueGame, toTitle, bootTitle, refreshSaveInfo,
  openMenu, openHelp, panelAction,
  hasCheckpoint, checkpointLabel, restoreCheckpoint,
  setPref, loadPrefs, pauseTimer, music, sfx, audio, unlock, api
};


/* ===== motes.js ===== */
/* Sudden Death — drifting spores. Shared by both builds. */

/* ---------- motes ---------- */
function motes(canvas) {
  const cv = canvas || document.getElementById('motes');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W, H;
  const size = () => { W = cv.width = innerWidth; H = cv.height = innerHeight; };
  size(); addEventListener('resize', size);
  const n = reduced ? 16 : Math.min(42, Math.floor(innerWidth / 30));
  const parts = [];
  for (let i = 0; i < n; i++) parts.push({
    x: Math.random() * innerWidth, y: Math.random() * innerHeight,
    r: Math.random() * 0.9 + 0.25, s: Math.random() * 0.2 + 0.04,
    d: Math.random() * 6.3, a: Math.random() * 0.16 + 0.05
  });
  (function frame() {
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      if (!reduced) { p.y -= p.s; p.d += 0.01; p.x += Math.sin(p.d) * 0.22; }
      if (p.y < -6) { p.y = H + 6; p.x = Math.random() * W; }
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
      g.addColorStop(0, 'rgba(198,226,236,' + p.a + ')');
      g.addColorStop(1, 'rgba(121,200,219,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, 6.3); ctx.fill();
    }
    if (!reduced) requestAnimationFrame(frame);
  })();
}



/* ===== story_school.js ===== */

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
  chapter: 'Monday — second period',
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
  onEnter: function (st) { st.flags.shortWay = true; },
  text: 'You are seventeen for another four months.\n\nIt does not feel like winning. It was never going to. The only thing you take out of that road is the fact that she did not get to choose — and three hundred years from now, a very long way under everything, that will turn out to matter more than you could possibly have known, and a great deal less than you wanted it to.',
  contLabel: '—',
  to: 'three_hundred'
};

S.lb_kill1 = {
  chapter: 'Friday night — nine seconds', art: 'mira',
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
  onEnter: function () { G.sfx.doom(); },
  text: 'She kills you.\n\nIt is quick, and it is clumsy, and she is crying, and she says sorry a great many times. That is the whole of it. There is no lesson in it and nothing is redeemed.\n\nThe last thing is the ceiling tiles, and the sound of the heating, and her hand on the side of your face, which is warm.',
  contLabel: '—',
  to: 'three_hundred'
};

S.three_hundred = {
  chapter: '',
  onEnter: function () { G.sfx.bell(); },
  text: 'THREE HUNDRED YEARS LATER',
  contLabel: 'open your eyes',
  to: 'below_wake'
};


/* ===== story_below.js ===== */

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


/* ===== story_endings.js ===== */

/* Sudden Death — endings */
  var G = api, E = G.ENDINGS, S = G.SCENES;

  api.ENDING_ORDER = [
    'oldbones', 'whatyoudid', 'blackhand',
    'hers', 'whatyoudid_bad', 'hollow', 'sixth', 'ashlight', 'longquiet', 'carried', 'trade',
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
function fourNote(st) {
    if (st.four === 'spared') return 'You did not kill the fourth one. It does not make this a happier ending. It makes it a different kind of alone.';
    if (st.four === 'fought') return 'You killed the fourth one. They were fifteen once, in a kitchen with the wrong number of chairs.';
    return '';
  }

  E.oldbones = {
    title: 'Old Bones', kind: 'win',
    blurb: 'You beat her, you refused him, you stayed, and you got old.',
    note: function (st) { return [sealNote(st), fourNote(st), roadNote(st)].filter(Boolean).join(' '); },
    text: function (st) {
      return 'You stay.\n\nThe first ten years are work. The Below has been a place people survive in and you make it a place people live in, badly, then less badly. You are not good at it. You are simply there every time, which turns out to be most of it.\n\nThe next twenty you are known. Children who were not born when you came down here grow up in corridors you made safe and are extremely unimpressed by you, which is the correct outcome.\n\nThe twenty after that you are old. There is light in the Below again and a great deal of it is your fault. You never take the mask off. Nobody ever asks you to.\n\nAt the end there are people in the room. That is the whole of it. There are people in the room, and one of them is holding your hand, and you are very tired, and nothing comes to collect you.\n\nYou die in a bed, three hundred years and one life away from a corridor on a Friday, as a person who was there every time.';
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
    title: 'The Black Hand', kind: 'secret',
    blurb: 'You doubted him, survived the Hunt, and the Deep carried you to the room he was standing in.',
    note: function (st) { return fourNote(st); },
    text: function (st) {
      return 'He does not get a speech.\n\nThat is the thing you decide, standing in an ordinary room over a man with a cup on the table beside him: he has had three hundred years of talking and every single word of it has been true and useful and aimed, and he does not get one more.\n\nAfterwards you sit down in his chair, because your legs go.\n\nThe Deep comes in slowly and fills the room and does not touch you. It has what it came for. It has been reaching upward for three centuries, and it was never rising, and there was never anything to seal — there was a thing in a room that it could not get to, and there was a long series of people who could.\n\nIt says one more thing to you and then it never speaks again, to you or to anyone. It says thank you. It says it the way you would say it to a hand.\n\nYou go back down into the Below, which is still dark, which still has her in it somewhere, unwoken, which still has everything in it that was in it before. You have fixed nothing. You have just ended the part where somebody was doing it on purpose.\n\n' + (st.four === 'spared'
        ? 'And in the water at the bottom of the chapel steps, three days later, there is a mask, set down carefully, with nobody in it. No note. They were never going to write a note.\n\nYou keep it. You do not know what for.'
        : 'And there is nobody in the water at the bottom of the chapel steps, and there is nobody in the gallery, and there is nobody anywhere, because you went through all of them to get here and every single one of them was somebody\'s kid.\n\nYou keep going anyway. That is what it costs.');
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
    note: function (st) { return [sealNote(st), fourNote(st)].filter(Boolean).join(' '); },
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


/* ===== renderer.js ===== */
/* Sudden Death — plain DOM renderer for the no-build version. */


const $ = id => document.getElementById(id);
const SCREENS = ['title', 'name', 'story', 'combat', 'ending'];

/* ---------- hud ---------- */
function hudHtml(h) {
  let s = '';
  for (let i = 0; i < 5; i++) {
    s += i < h.ember ? '<i class="pip"></i>' : i < h.emberCap ? '<i class="pip empty"></i>' : '<i class="pip scar"></i>';
  }
  return s;
}

function paintHud() {
  const h = store.hud;
  ['ember-meter', 'ember-meter2'].forEach(id => { const e = $(id); if (e) e.innerHTML = hudHtml(h); });
  ['', '2'].forEach(sfx => {
    const f = $('breath-fill' + sfx), n = $('breath-num' + sfx);
    if (f) f.style.width = Math.round(100 * h.breath / h.breathCap) + '%';
    if (n) n.textContent = h.breath;
  });
  ['shard-count', 'shard-count2'].forEach(id => {
    const e = $(id); if (e) e.textContent = '◈'.repeat(Math.min(8, h.echoes));
  });
  $('breath-wrap').hidden = !h.below;
}

/* ---------- screens ---------- */
function paint() {
  SCREENS.forEach(s => $(s).classList.toggle('active', store.screen === s));
  paintHud();

  if (store.screen === 'title') {
    $('btn-continue').hidden = !store.hasSave;
    $('btn-continue').textContent = store.saveLabel;
  }

  if (store.screen === 'story') {
    var por = $('portrait');
    if (por && por.dataset.art !== store.art) { por.dataset.art = store.art; por.innerHTML = store.art; }
    $('chapter').textContent = store.chapter;
    $('prose').innerHTML = store.prose;
    paintChoices($('choices'));
  }

  if (store.screen === 'combat') {
    const c = store.combat;
    $('foe-name').textContent = c.name;
    let p = '';
    for (let i = 0; i < c.poiseMax; i++) p += '<i class="' + (i < c.poise ? '' : 'gone') + '"></i>';
    $('poise').innerHTML = p;
    $('fight-log').innerHTML = c.log;
    var gl = $('glimpse');
    if (gl.dataset.art !== c.art) { gl.dataset.art = c.art; gl.innerHTML = c.art; }
    gl.dataset.state = c.glimpse;
    $('clarity-pip').hidden = !c.clarity;
    $('timer-wrap').hidden = !c.timerOn;
    $('timer-wrap').classList.toggle('danger', c.danger);
    $('btn-echo-fight').hidden = !c.canEcho;
    $('btn-continue-fight').hidden = !c.continueLabel;
    $('btn-continue-fight').textContent = c.continueLabel || '';
    document.querySelectorAll('#verbs .verb').forEach(b => { b.disabled = !c.verbsOn; });
  }

  if (store.screen === 'ending') {
    const e = store.ending;
    $('ending').className = 'screen active ' + e.kind;
    $('ending-kind').textContent = e.kindLabel;
    $('ending-title').textContent = e.title;
    $('ending-text').innerHTML = store.prose;
    $('ending-choices').innerHTML = '';
    if (!store.typing) {
      [['Endings found', () => game.openJournal()], ['Back to the surface', () => game.toTitle()]].forEach(([t, fn]) => {
        const b = document.createElement('button');
        b.className = 'choice cont'; b.textContent = t;
        b.onclick = () => { game.sfx.click(); fn(); };
        $('ending-choices').appendChild(b);
      });
    }
  }

  paintOverlay();
  paintToast();
}

function paintChoices(wrap) {
  wrap.innerHTML = '';
  store.choices.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = 'choice' + (c.cont ? ' cont' : '');
    b.innerHTML = (c.cont ? '' : '<span class="key">' + (i + 1) + '</span>') + c.label +
      (c.peek ? '<span class="peek">' + c.peek + '</span>' : '');
    b.onclick = () => game.choose(i);
    wrap.appendChild(b);
  });
  if (store.showEchoButton) {
    const e = document.createElement('button');
    e.className = 'choice cont';
    e.textContent = '◈ Spend an echo — feel what these cost';
    e.onclick = () => game.spendEchoOnChoice();
    wrap.appendChild(e);
  }
  const first = wrap.querySelector('.choice');
  if (first && store.screen === 'story') first.focus({ preventScroll: true });
}

/* ---------- overlay ---------- */
let lastOverlay = null;
function paintOverlay() {
  const o = store.overlay;
  $('overlay').hidden = !o;
  if (!o) { lastOverlay = null; return; }
  if (o === lastOverlay) return;
  lastOverlay = o;
  $('overlay-title').textContent = o.title;
  const body = $('overlay-body');
  body.innerHTML = '';
  if (o.html) { body.innerHTML = o.html; return; }
  if (!o.rows || !o.rows.length) {
    body.innerHTML = '<p class="row"><em>' + (o.empty || '') + '</em></p>';
    return;
  }
  o.rows.forEach(r => {
    const row = document.createElement('div');
    row.className = 'row' + (r.locked ? ' locked' : '');
    row.innerHTML = '<h4>' + r.title + (r.tag ? ' <span class="tag">' + r.tag + '</span>' : '') + '</h4>' +
      '<p>' + r.body + '</p>' +
      (r.note ? '<p class="tagline">' + r.note + '</p>' : '') +
      (r.bar !== undefined ? '<div class="bar"><i style="width:' + r.bar + '%"></i></div>' : '');
    if (r.action) {
      const b = document.createElement('button');
      b.className = 'use'; b.textContent = r.action;
      b.onclick = () => game.useBagItem(r.id);
      row.appendChild(b);
    }
    body.appendChild(row);
  });
  if (o.footer) {
    const f = document.createElement('p');
    f.className = 'tagline'; f.style.marginTop = '18px'; f.textContent = o.footer;
    body.appendChild(f);
  }
}

/* ---------- toast ---------- */
let toastEl = null;
function paintToast() {
  if (store.toast && !toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    toastEl.textContent = store.toast;
    document.body.appendChild(toastEl);
  } else if (store.toast && toastEl) {
    toastEl.textContent = store.toast;
  } else if (!store.toast && toastEl) {
    toastEl.remove(); toastEl = null;
  }
}

/* ---------- wiring ---------- */
function mount() {
  motes();
  game.loadPrefs();
  game.on(paint);
  onTick(f => {
    const bar = $('timer-fill');
    if (bar) bar.style.width = (f * 100) + '%';
  });

  $('btn-new').onclick = () => {
    game.sfx.click(); game.newGame();
    $('name-field').value = ''; $('name-go').disabled = true;
    setTimeout(() => $('name-field').focus(), 60);
  };
  $('btn-continue').onclick = () => { game.sfx.click(); game.continueGame(); };
  $('btn-journal').onclick = () => { game.sfx.click(); game.openJournal(); };
  $('btn-help').onclick = () => { game.sfx.click(); game.openHelp(); };
  const nameOk = () => $('name-field').value.trim().length > 0;
  const syncName = () => { $('name-go').disabled = !nameOk(); };
  const submitName = () => { if (nameOk()) game.beginRun($('name-field').value); };
  $('name-field').addEventListener('input', syncName);
  $('name-go').onclick = submitName;
  $('name-field').addEventListener('keydown', e => { if (e.key === 'Enter') submitName(); });
  syncName();

  $('overlay-x').onclick = () => game.closeOverlay();
  $('overlay-body').addEventListener('click', e => {
    const b = e.target.closest('[data-a]');
    if (b) game.panelAction(b.dataset.a);
  });
  $('overlay').addEventListener('click', e => { if (e.target.id === 'overlay') game.closeOverlay(); });
  $('btn-bag').onclick = () => game.openBag();
  $('btn-bag2').onclick = () => game.openBag();
  $('btn-bonds').onclick = () => game.openBonds();
  $('btn-menu').onclick = () => game.openMenu();
  $('btn-echo-fight').onclick = () => game.spendEchoInFight();
  $('btn-continue-fight').onclick = () => game.combatContinue();
  document.querySelectorAll('#verbs .verb').forEach(b => { b.onclick = () => game.verb(b.dataset.v); });

  ['story', 'ending'].forEach(id => {
    $(id).addEventListener('click', e => { if (!e.target.closest('button')) game.skip(); });
  });
  $('combat').addEventListener('click', e => { if (!e.target.closest('button')) game.skip(); });

  document.addEventListener('keydown', e => {
    if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
    const k = e.key.toLowerCase();
    if (k === 'escape') {
      if (store.overlay) { game.closeOverlay(); return; }
      if (store.screen === 'story') { game.openMenu(); return; }
    }
    if (store.overlay) return;
    if (k === ' ' || k === 'enter') {
      if (game.skip()) { e.preventDefault(); return; }
      if (k === ' ') {
        e.preventDefault();
        if (store.screen === 'combat' && store.combat.continueLabel) return game.combatContinue();
        const cont = store.choices.findIndex(c => c.cont);
        if (cont >= 0) game.choose(cont);
      }
      return;
    }
    if (k === 'i' && store.state) return game.openBag();
    if (k === 'b' && store.state) return game.openBonds();
    if (store.screen === 'combat') {
      const map = { q: 'strike', w: 'guard', e: 'slip', r: 'focus', 1: 'strike', 2: 'guard', 3: 'slip', 4: 'focus' };
      if (map[k]) game.verb(map[k]);
      return;
    }
    if (/^[1-9]$/.test(k)) game.choose(parseInt(k, 10) - 1);
  });

  document.addEventListener('pointerdown', function once() {
    game.unlock();
    if (store.screen === 'title') game.music.mood('title');
    document.removeEventListener('pointerdown', once);
  });

  document.addEventListener('visibilitychange', () => game.pauseTimer(document.hidden));

  game.bootTitle();
  paint();
}


if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
else mount();
window.__sd = { game: game, store: store };
})();

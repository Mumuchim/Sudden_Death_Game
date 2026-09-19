/* Boots static/game.js against a tiny fake DOM built from the real ids in
   static/index.html, then plays: title -> name -> a few scenes -> a fight.
   Catches renderer bugs (missing elements, bad property access) that the
   logic-only self test cannot. node tools/domtest.mjs */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));

const html = fs.readFileSync(path.join(here, '..', 'static', 'index.html'), 'utf8');
const ids = [...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]);

const listeners = [];
function El(tag, id) {
  const e = {
    tagName: (tag || 'div').toUpperCase(), id: id || '', dataset: {}, style: {},
    children: [], hidden: false, disabled: false, value: '', textContent: '',
    innerHTML: '', className: '', onclick: null,
    classList: {
      _s: new Set(),
      add(...c) { c.forEach(x => this._s.add(x)); },
      remove(...c) { c.forEach(x => this._s.delete(x)); },
      toggle(c, on) { on === undefined ? (this._s.has(c) ? this._s.delete(c) : this._s.add(c)) : (on ? this._s.add(c) : this._s.delete(c)); },
      contains(c) { return this._s.has(c); }
    },
    appendChild(c) { this.children.push(c); return c; },
    remove() {},
    focus() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    closest() { return null; },
    addEventListener(t, f) { listeners.push([this, t, f]); },
    removeEventListener() {},
    setAttribute() {}, getAttribute() { return null; }
  };
  return e;
}

const byId = new Map();
ids.forEach(id => byId.set(id, El('div', id)));
/* the motes canvas needs a 2d context */
const canvas = byId.get('motes');
canvas.width = 900; canvas.height = 700;
canvas.getContext = () => ({
  clearRect() {}, beginPath() {}, arc() {}, fill() {},
  createRadialGradient: () => ({ addColorStop() {} })
});

/* verbs need real children for querySelectorAll('#verbs .verb') */
const VERBS = ['strike', 'guard', 'slip', 'focus'];
const verbEls = VERBS.map(v => {
  const b = El('button');
  b.dataset.v = v;
  const cool = El('i'); cool.className = 'cool';
  b.querySelector = sel => (sel === '.cool' ? cool : null);
  return b;
});

globalThis.document = {
  readyState: 'complete',
  body: El('body'),
  activeElement: null,
  getElementById: id => byId.get(id) || null,
  createElement: t => El(t),
  querySelector: () => null,
  querySelectorAll: sel => (sel === '#verbs .verb' ? verbEls : []),
  addEventListener(t, f) { listeners.push([globalThis.document, t, f]); },
  removeEventListener() {}
};

const ls = new Map();
globalThis.localStorage = {
  getItem: k => (ls.has(k) ? ls.get(k) : null),
  setItem: (k, v) => ls.set(k, String(v)),
  removeItem: k => ls.delete(k)
};
globalThis.matchMedia = () => ({ matches: true, addEventListener() {} });  /* reduced motion: instant text */
globalThis.window = { matchMedia: globalThis.matchMedia, innerWidth: 900, innerHeight: 700 };
globalThis.innerWidth = 900; globalThis.innerHeight = 700;
globalThis.addEventListener = () => {};
globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = () => {};
globalThis.performance = globalThis.performance || { now: () => Date.now() };

let fails = 0;
const bad = m => { console.log('  FAIL ' + m); fails++; };

const src = fs.readFileSync(path.join(here, '..', 'static', 'game.js'), 'utf8');
try {
  (0, eval)(src);
} catch (e) {
  bad('static bundle threw on load: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n'));
  process.exit(1);
}

const { PORTRAIT, ENEMY_ART } = await import('../src/game/art.js');

const sd = globalThis.window.__sd;
if (!sd) { bad('bundle did not expose window.__sd'); process.exit(1); }
const { game, store } = sd;

function step(label, fn) {
  try { fn(); } catch (e) {
    bad(label + ': ' + e.message + '\n    ' + (e.stack || '').split('\n')[1]);
  }
}

step('boot', () => { if (store.screen !== 'title') throw new Error('not on title, on ' + store.screen); });
step('new game', () => { game.newGame(); if (store.screen !== 'name') throw new Error('name screen not shown'); });
step('begin run', () => { game.beginRun('Wren'); if (store.screen !== 'story') throw new Error('story not shown'); });

/* walk the school arc taking choice 0 until we hit a fight or an ending */
let guard = 0;
step('walk school', () => {
  while (store.screen === 'story' && guard++ < 400) {
    if (!store.choices.length) throw new Error('scene ' + store.state.scene + ' produced no choices');
    game.choose(0);
  }
});
console.log('walked ' + guard + ' scenes, ended on: ' + store.screen + ' (' + (store.state && store.state.scene) + ')');

/* drive straight to a fight and exercise the new systems */
step('force a fight', () => {
  store.state.flags.below = true;
  store.state.pools = game.api.buildPools(store.state.seed);
  game.api.applyPools(store.state);
  game.go('below_wake2');
  if (store.screen !== 'combat') throw new Error('combat did not start');
});

step('combat surface', () => {
  const c = store.combat;
  if (!c.verbOpen) throw new Error('verbOpen missing');
  if (c.verbOpen.guard !== true) throw new Error('guard must always be open');
  if (!Array.isArray(c.statuses)) throw new Error('statuses missing');
  if (!Array.isArray(c.rail)) throw new Error('rail missing');
});

step('stagger locks all but guard', () => {
  game.api.Combat.stagger(1);
  const o = store.combat.verbOpen;
  if (o.guard !== true) throw new Error('guard was locked by stagger');
  if (o.strike !== false || o.slip !== false || o.focus !== false) throw new Error('stagger did not lock the others');
  if (!store.combat.statuses.some(s => s.t === 'staggered')) throw new Error('no staggered chip');
});

step('reel shows', () => {
  game.api.Combat.reel(1);
  if (!store.combat.reeling) throw new Error('reel flag not set');
});

step('play the fight out', () => {
  let n = 0;
  while (store.combat.active && !store.combat.over && n++ < 200) {
    store.combat.verbsOn = true;
    game.verb('guard');            /* guard is always legal; a slow, safe win or loss */
    if (store.state.ember <= 0) break;
  }
  if (n >= 200) throw new Error('fight did not resolve in 200 exchanges');
});
console.log('fight resolved after exchanges; ember ' + store.state.ember + '/' + store.state.emberCap);

step('bag rail is populated in story', () => {
  store.state.inv = [{ id: 'lumaflies', uses: 2 }, { id: 'nailchip', uses: 1 }];
  store.state.ember = 1;
  game.syncRail();
  const names = store.carrying.map(r => r.id);
  if (!names.includes('lumaflies')) throw new Error('lumaflies not offered inline');
  if (names.includes('nailchip')) throw new Error('combat-only item leaked into the story rail');
  if (!store.carrying.find(r => r.id === 'lumaflies').hot) throw new Error('low ember did not light the flies');
});

step('every portrait and enemy art exists', () => {
  const S = game.api.SCENES;
  for (const [id, sc] of Object.entries(S)) {
    if (sc.art && !PORTRAIT[sc.art]) throw new Error('scene ' + id + ' wants missing portrait "' + sc.art + '"');
  }
});

step('every foe art exists', () => {
  const S = game.api.SCENES;
  const st = store.state;
  for (const [id, sc] of Object.entries(S)) {
    if (!sc.combat) continue;
    const d = sc.combat(st);
    if (!ENEMY_ART[d.art]) throw new Error('fight ' + id + ' wants missing art "' + d.art + '"');
    if (!d.tells || d.tells.length !== 4) throw new Error('fight ' + id + ' does not have four tells');
    const answers = new Set(d.tells.map(t => t.a));
    ['strike', 'guard', 'slip', 'focus'].forEach(v => {
      if (!answers.has(v)) throw new Error('fight ' + id + ' has no tell answered by ' + v);
    });
  }
});

step('panels open', () => {
  game.openBag(); game.closeOverlay();
  game.openBonds(); game.closeOverlay();
  game.openJournal(); game.closeOverlay();
  game.openMenu(); game.closeOverlay();
  game.openHelp(); game.closeOverlay();
});

console.log(fails ? `\n${fails} FAILURE(S)` : '\nall dom checks passed');
process.exit(fails ? 1 : 0);

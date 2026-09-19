/* Sudden Death — plain DOM renderer for the no-build version. */

import { game, store, onTick } from './core.js';
import { motes } from './motes.js';

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
    const q = $('quote');
    if (q) { q.hidden = !store.quote; q.textContent = store.quote || ''; }
    const pr = $('prose');
    pr.className = 'prose' + (store.beat ? ' beat-' + store.beat : '');
    pr.innerHTML = store.prose;
    paintChoices($('choices'));
    paintRail($('carrying'), store.carrying, 'You are carrying');
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
    paintStatuses($('statuses'), c);
    document.querySelectorAll('#verbs .verb').forEach(b => {
      const v = b.dataset.v;
      const open = c.verbOpen ? c.verbOpen[v] !== false : true;
      b.disabled = !c.verbsOn || !open;
      b.classList.toggle('locked', !open);
      const badge = b.querySelector('.cool');
      if (badge) badge.textContent = open ? '' : '—';
    });
    paintRail($('rail'), c.rail, 'Bag');
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

function paintStatuses(wrap, c) {
  if (!wrap) return;
  const list = c.statuses || [];
  if (!list.length) { wrap.innerHTML = ''; wrap.hidden = true; return; }
  wrap.hidden = false;
  wrap.innerHTML = list.map(s =>
    '<span class="chip ' + s.k + '" title="' + (s.why || '') + '">' +
    s.t + (s.n ? ' <b>' + s.n + '</b>' : '') + '</span>').join('');
}

/* items, where you can actually see them */
function paintRail(wrap, rows, label) {
  if (!wrap) return;
  rows = rows || [];
  if (!rows.length) { wrap.innerHTML = ''; wrap.hidden = true; return; }
  wrap.hidden = false;
  wrap.innerHTML = '<span class="rail-label">' + label + '</span>';
  rows.forEach(r => {
    const b = document.createElement('button');
    b.className = 'item' + (r.hot ? ' hot' : '');
    b.innerHTML = r.label + (r.tag ? '<small>' + r.tag + '</small>' : '') +
      (r.uses > 1 ? '<i>×' + r.uses + '</i>' : '');
    b.onclick = e => { e.stopPropagation(); game.useBagItem(r.id); };
    wrap.appendChild(b);
  });
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
export function mount() {
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

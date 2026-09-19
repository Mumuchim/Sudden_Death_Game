/* Sudden Death — everything you hear is made on the spot.
   No audio files. Two parts: short sfx, and an adaptive generated score. */

let ctx = null;
let dead = false;
let master = null;
let musicGain = null;
let sfxGain = null;

export const audio = {
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

export function unlock() { ac(); }

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

export const sfx = {
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

export const music = {
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

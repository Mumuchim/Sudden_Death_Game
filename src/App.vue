<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { game, store, on, onTick } from './game/core.js'
import { motes } from './game/motes.js'
import './game/story_school.js'
import './game/story_endings.js'

/* The core is a plain object that mutates itself and announces it.
   We bump a counter on every announcement and rebuild shallow copies,
   which is all Vue needs to re-render. */
const tick = ref(0)
const timerFrac = ref(1)
const motesEl = ref(null)
const nameField = ref(null)
const nameValue = ref('')

const screen = computed(() => (tick.value, store.screen))
const chapter = computed(() => (tick.value, store.chapter))
const art = computed(() => (tick.value, store.art))
const prose = computed(() => (tick.value, store.prose))
const choices = computed(() => (tick.value, store.choices.slice()))
const showEcho = computed(() => (tick.value, store.showEchoButton))
const hud = computed(() => (tick.value, { ...store.hud }))
const combat = computed(() => (tick.value, { ...store.combat }))
const ending = computed(() => (tick.value, store.ending ? { ...store.ending } : null))
const overlay = computed(() => (tick.value, store.overlay
  ? { ...store.overlay, rows: (store.overlay.rows || []).slice() }
  : null))
const toast = computed(() => (tick.value, store.toast))
const quote = computed(() => (tick.value, store.quote))
const beat = computed(() => (tick.value, store.beat))
const carrying = computed(() => (tick.value, (store.carrying || []).slice()))
const rail = computed(() => (tick.value, (store.combat.rail || []).slice()))
const statuses = computed(() => (tick.value, (store.combat.statuses || []).slice()))
const hasSave = computed(() => (tick.value, store.hasSave))
const saveLabel = computed(() => (tick.value, store.saveLabel))
const typing = computed(() => (tick.value, store.typing))
const resources = computed(() => (tick.value, { food: store.state ? store.state.food : 0, water: store.state ? store.state.water : 0 }))
const weaponVerb = computed(() => {
  const id = combat.value.weapon
  return ({ bat: 'Bonk', knife: 'Slash', extinguisher: 'Smash' })[id] || 'Strike'
})

const emberPips = computed(() => {
  const h = hud.value
  return [0, 1, 2, 3, 4].map(i => i < h.ember ? 'pip' : i < h.emberCap ? 'pip empty' : 'pip scar')
})
const poisePips = computed(() => {
  const c = combat.value
  return Array.from({ length: c.poiseMax }, (_, i) => i < c.poise)
})
const breathPct = computed(() => Math.round(100 * hud.value.breath / hud.value.breathCap) + '%')
const echoDots = computed(() => '◈'.repeat(Math.min(8, hud.value.echoes)))

function verbOpen (v) { const o = combat.value.verbOpen; return !o || o[v] !== false }
function useItem (id) { game.useBagItem(id) }

const nameOk = computed(() => nameValue.value.trim().length > 0)

function startNew () {
  game.sfx.click()
  game.newGame()
  nameValue.value = ''
  nextTick(() => nameField.value && nameField.value.focus())
}
function begin () { if (nameOk.value) game.beginRun(nameValue.value) }

function onPanelClick (e) {
  const b = e.target.closest('[data-a]')
  if (b) game.panelAction(b.dataset.a)
}

function skipIfBackground (e) {
  if (!e.target.closest('button, input')) game.skip()
}

function onKey (e) {
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return
  const k = e.key.toLowerCase()
  if (k === 'escape') {
    if (store.overlay) return game.closeOverlay()
    if (store.screen === 'story') return game.openMenu()
  }
  if (store.overlay) return
  if (k === ' ' || k === 'enter') {
    if (game.skip()) { e.preventDefault(); return }
    if (k === ' ') {
      e.preventDefault()
      if (store.screen === 'combat') {
        if (store.combat.continueLabel) return game.combatContinue()
        if (store.combat.grabActive) { if (!e.repeat) game.grabTap(); return }
        if (store.combat.mode === 'zombie' && store.combat.weapon && store.combat.verbsOn) return game.verb('bonk')
        if (store.combat.verbsOn && store.combat.mode !== 'zombie') return game.verb('strike')
        return
      }
      const cont = store.choices.findIndex(c => c.cont)
      if (cont >= 0) game.choose(cont)
    }
    return
  }
  if (store.screen === 'combat') {
    if (store.combat.grabActive) {
      if (k === ' ' && !e.repeat) { e.preventDefault(); game.grabTap(); }
      return
    }
    if (store.combat.mode === 'zombie') {
      if (k === 'arrowleft') { e.preventDefault(); game.verb(store.combat.weapon ? 'parry' : 'dodge', 'left'); return }
      if (k === 'arrowright') { e.preventDefault(); game.verb(store.combat.weapon ? 'parry' : 'dodge', 'right'); return }
      if (k === ' ' && store.combat.weapon && store.combat.verbsOn && !e.repeat) { e.preventDefault(); game.verb('bonk'); return }
      if (k === 'i' && store.state) return game.openBag()
      return
    }
    if (k === 'arrowleft') { e.preventDefault(); game.verb('parry', 'left'); return }
    if (k === 'arrowup') { e.preventDefault(); game.verb('parry', 'front'); return }
    if (k === 'arrowright') { e.preventDefault(); game.verb('parry', 'right'); return }
    if (k === 'arrowdown') { e.preventDefault(); game.verb('jump'); return }
    if (k === 'control') { game.verb('heal'); return }
    if (k === 'i' && store.state) return game.openBag()
    return
  }
  if (k === 'i' && store.state) return game.openBag()
  if (k === 'b' && store.state) return game.openBonds()
  if (/^[1-9]$/.test(k)) game.choose(parseInt(k, 10) - 1)
}

let offChange, offTick
function unlockOnce () {
  game.unlock()
  if (store.screen === 'title') game.music.mood('title')
  document.removeEventListener('pointerdown', unlockOnce)
}
function onVisibility () { game.pauseTimer(document.hidden) }

onMounted(() => {
  motes(motesEl.value)
  game.loadPrefs()
  offChange = on(() => { tick.value++ })
  offTick = onTick(f => { timerFrac.value = f })
  document.addEventListener('keydown', onKey)
  document.addEventListener('pointerdown', unlockOnce)
  document.addEventListener('visibilitychange', onVisibility)
  game.bootTitle()
  tick.value++
})

onUnmounted(() => {
  offChange && offChange()
  offTick && offTick()
  document.removeEventListener('keydown', onKey)
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<template>
  <canvas id="motes" ref="motesEl" aria-hidden="true"></canvas>
  <div id="vignette" aria-hidden="true"></div>

  <!-- title -->
  <section id="title" class="screen" :class="{ active: screen === 'title' }">
    <div class="title-inner">
      <div class="crest" aria-hidden="true">
        <svg viewBox="0 0 120 120" width="120" height="120">
          <g fill="none" stroke="currentColor" stroke-width="1.4">
            <path d="M60 14 C36 14 24 34 24 56 c0 24 14 44 36 50 22-6 36-26 36-50 0-22-12-42-36-42z" />
            <path d="M60 22 C42 22 32 38 32 56 c0 20 11 36 28 42 17-6 28-22 28-42 0-18-10-34-28-34z" opacity=".45" />
            <path d="M44 52 l8-10 8 10 8-10 8 10" opacity=".8" />
            <path d="M60 70 v18" opacity=".6" />
          </g>
        </svg>
      </div>
      <h1>Sudden<span>Death</span></h1>
      <p class="byline">by mumuchxm</p>
      <div class="title-menu">
        <button v-if="hasSave" class="menu-btn" @click="game.sfx.click(); game.continueGame()">{{ saveLabel }}</button>
        <button class="menu-btn" @click="startNew">Begin</button>
        <button class="menu-btn quiet" @click="game.sfx.click(); game.openJournal()">Endings found</button>
        <button class="menu-btn quiet" @click="game.sfx.click(); game.openHelp()">How to play</button>
      </div>
      <p class="warn">Contains infection, violence, death, stalking and obsessive behavior.</p>
    </div>
  </section>

  <!-- name -->
  <section id="name" class="screen" :class="{ active: screen === 'name' }">
    <div class="name-inner">
      <p class="prompt-line">The register is open. Someone has to write something.</p>
      <label for="name-field" class="sr-only">Your name</label>
      <input id="name-field" ref="nameField" v-model="nameValue" maxlength="16"
             autocomplete="off" spellcheck="false" placeholder="your name"
             @keydown.enter="begin" />
      <p class="name-hint">The story says it out loud. It needs one.</p>
      <button class="menu-btn" :disabled="!nameOk" @click="begin">Write it down</button>
    </div>
  </section>

  <!-- story -->
  <section id="story" class="screen" :class="{ active: screen === 'story' }" @click="skipIfBackground">
    <header id="hud">
      <div class="hud-left">
        <div class="meter" title="Ember">
          <i v-for="(cls, i) in emberPips" :key="i" :class="cls"></i>
        </div>
        <div v-if="hud.below" class="breath-wrap">
          <div class="breath-bar"><i :style="{ width: breathPct }"></i></div>
          <span class="breath-label">{{ hud.breath }}</span>
        </div>
        <div v-if="screen === 'story'" class="resource-strip" :class="{ critical: resources.food === 0 || resources.water === 0 }">
          <span title="food">food {{ resources.food }}</span>
          <span title="water">water {{ resources.water }}</span>
        </div>
      </div>
      <div class="hud-right">
        <span class="shards" title="Echoes">{{ echoDots }}</span>
        <button class="hud-btn" @click="game.openBag()">Bag</button>
        <button class="hud-btn" @click="game.openBonds()">Bonds</button>
        <button class="hud-btn" @click="game.openMenu()">Menu</button>
      </div>
    </header>
    <main id="stage">
      <div class="portrait" aria-hidden="true" v-html="art"></div>
      <p class="chapter">{{ chapter }}</p>
      <p v-if="quote" class="epigraph">{{ quote }}</p>
      <div class="prose" :class="beat ? 'beat-' + beat : ''" v-html="prose"></div>
      <div class="choices">
        <button v-for="(c, i) in choices" :key="i" class="choice" :class="{ cont: c.cont }"
                @click="game.choose(i)">
          <span v-if="!c.cont" class="key">{{ i + 1 }}</span><span v-html="c.label"></span>
          <span v-if="c.peek" class="peek">{{ c.peek }}</span>
        </button>
        <button v-if="showEcho" class="choice cont" @click="game.spendEchoOnChoice()">
          ◈ Spend an echo — feel what these cost
        </button>
      </div>
      <div v-if="carrying.length" class="rail">
        <span class="rail-label">You are carrying</span>
        <button v-for="r in carrying" :key="r.id" class="item" :class="{ hot: r.hot }"
                @click.stop="useItem(r.id)">
          {{ r.label }}<small v-if="r.tag">{{ r.tag }}</small><i v-if="r.uses > 1">×{{ r.uses }}</i>
        </button>
      </div>
    </main>
  </section>

  <!-- combat -->
  <section id="combat" class="screen" :class="{ active: screen === 'combat' }" @click="skipIfBackground">
    <header id="hud2">
      <div class="hud-left">
        <div class="meter" title="Ember">
          <i v-for="(cls, i) in emberPips" :key="i" :class="cls"></i>
        </div>
        <div class="breath-wrap">
          <div class="breath-bar"><i :style="{ width: breathPct }"></i></div>
          <span class="breath-label">{{ hud.breath }}</span>
        </div>
        <div class="resource-strip combat-resources">
          <span>food {{ resources.food }}</span>
          <span>water {{ resources.water }}</span>
        </div>
      </div>
      <div class="hud-right">
        <span v-if="combat.clarity" class="clarity">clear</span>
        <span class="shards">{{ echoDots }}</span>
        <button class="hud-btn" @click="game.openBag()">Bag</button>
      </div>
    </header>
    <main id="arena">
      <p class="foe-name">{{ combat.name }}</p>
      <p v-if="combat.objective" class="combat-objective">{{ combat.objective }}</p>
      <div v-if="combat.poiseMax" class="poise">
        <i v-for="(alive, i) in poisePips" :key="i" :class="{ gone: !alive }"></i>
      </div>

      <div class="glimpse" :class="{ 'zombie-glimpse': combat.mode === 'zombie' }" :data-state="combat.glimpse" :data-dir="combat.dir || ''" aria-hidden="true" v-html="combat.art"></div>

      <div v-show="combat.timerOn" class="timer-wrap" :class="{ danger: combat.danger }">
        <i :style="{ width: (timerFrac * 100) + '%' }"></i>
      </div>

      <div class="prose fight" v-html="combat.log"></div>

      <div v-if="statuses.length" class="statuses">
        <span v-for="(s, i) in statuses" :key="i" class="chip" :class="s.k" :title="s.why">
          {{ s.t }}<b v-if="s.n"> {{ s.n }}</b>
        </span>
      </div>

      <div v-if="combat.mode === 'zombie' && combat.grabActive" class="grab-qte">
        <p><b>BREAK FREE</b> — press <kbd>SPACE</kbd> {{ combat.grabGoal }} times.</p>
        <div class="grab-count">{{ combat.grabCount }} / {{ combat.grabGoal }}</div>
        <button class="verb full" @click="game.grabTap()">
          <b>TAP SPACE</b><small>Keep tapping until you break free.</small>
        </button>
      </div>

      <div v-else-if="combat.mode === 'zombie'" class="verbs zombie-verbs">
        <template v-if="combat.weapon">
          <button class="verb full" :class="{ locked: !combat.verbsOn || !combat.weaponOpening }"
                  :disabled="!combat.verbsOn || !combat.weaponOpening"
                  @click="game.verb('bonk')">
            <b>{{ weaponVerb }}</b><small>space · strike only after a successful parry</small>
          </button>
          <div class="parry-group">
            <button class="verb" :disabled="!combat.verbsOn" @click="game.verb('parry', 'left')">
              <b>◄ Parry</b><small>left side</small>
            </button>
            <button class="verb" :disabled="!combat.verbsOn" @click="game.verb('parry', 'right')">
              <b>► Parry</b><small>right side</small>
            </button>
          </div>
        </template>
        <template v-else>
          <div class="parry-group">
            <button class="verb" :disabled="!combat.verbsOn" @click="game.verb('dodge', 'left')">
              <b>◄ Dodge left</b><small>move away from a right-side attack</small>
            </button>
            <button class="verb" :disabled="!combat.verbsOn" @click="game.verb('dodge', 'right')">
              <b>Dodge right ►</b><small>move away from a left-side attack</small>
            </button>
          </div>
        </template>
      </div>

      <div v-else class="verbs">
        <button class="verb full" :class="{ locked: !verbOpen('strike') }"
                :disabled="!combat.verbsOn || !verbOpen('strike')"
                @click="game.verb('strike')">
          <b>Strike</b><small>space · hurts it twice over, opens you</small>
          <i class="cool">{{ verbOpen('strike') ? '' : '—' }}</i>
        </button>
        <div class="parry-group">
          <button class="verb" :class="{ locked: !verbOpen('parry') }"
                  :disabled="!combat.verbsOn || !verbOpen('parry')"
                  @click="game.verb('parry', 'left')">
            <b>◄ Parry</b><small>left</small>
          </button>
          <button class="verb" :class="{ locked: !verbOpen('parry') }"
                  :disabled="!combat.verbsOn || !verbOpen('parry')"
                  @click="game.verb('parry', 'front')">
            <b>▲ Parry</b><small>front</small>
          </button>
          <button class="verb" :class="{ locked: !verbOpen('parry') }"
                  :disabled="!combat.verbsOn || !verbOpen('parry')"
                  @click="game.verb('parry', 'right')">
            <b>► Parry</b><small>right</small>
          </button>
        </div>
        <button class="verb" :class="{ locked: !verbOpen('jump') }"
                :disabled="!combat.verbsOn || !verbOpen('jump')"
                @click="game.verb('jump')">
          <b>Jump</b><small>▼ · dodges what cannot be blocked</small>
          <i class="cool">{{ verbOpen('jump') ? '' : '—' }}</i>
        </button>
        <button class="verb" :class="{ locked: !verbOpen('heal') }"
                :disabled="!combat.verbsOn || !verbOpen('heal')"
                @click="game.verb('heal')">
          <b>Heal</b><small>ctrl · mends one ember, costs breath</small>
          <i class="cool">{{ verbOpen('heal') ? '' : '—' }}</i>
        </button>
      </div>
      <div v-if="rail.length" class="rail">
        <span class="rail-label">Bag</span>
        <button v-for="r in rail" :key="r.id" class="item" :class="{ hot: r.hot }"
                @click.stop="useItem(r.id)">
          {{ r.label }}<small v-if="r.tag">{{ r.tag }}</small><i v-if="r.uses > 1">×{{ r.uses }}</i>
        </button>
      </div>
      <div class="fight-extra">
        <button v-if="combat.canEcho" class="hud-btn" @click="game.spendEchoInFight()">Spend an Echo</button>
        <button v-if="combat.continueLabel" class="hud-btn" @click="game.combatContinue()">
          {{ combat.continueLabel }}
        </button>
      </div>
    </main>
  </section>

  <!-- ending -->
  <section id="ending" class="screen" :class="[ending ? ending.kind : '', { active: screen === 'ending' }]"
           @click="skipIfBackground">
    <div class="ending-inner" v-if="ending">
      <p class="ending-kind">{{ ending.kindLabel }}</p>
      <h2>{{ ending.title }}</h2>
      <div class="prose" v-html="prose"></div>
      <div class="choices" v-if="!typing">
        <button class="choice cont" @click="game.sfx.click(); game.openJournal()">Endings found</button>
        <button class="choice cont" @click="game.sfx.click(); game.toTitle()">Back to the surface</button>
      </div>
    </div>
  </section>

  <!-- overlay -->
  <div v-if="overlay" class="overlay" @click.self="game.closeOverlay()">
    <div class="panel" role="dialog" aria-modal="true">
      <button class="x" @click="game.closeOverlay()" aria-label="Close">close</button>
      <h3>{{ overlay.title }}</h3>
      <div v-if="overlay.html" v-html="overlay.html" @click="onPanelClick"></div>
      <template v-else>
        <p v-if="!overlay.rows.length" class="row"><em>{{ overlay.empty }}</em></p>
        <div v-for="r in overlay.rows" :key="r.id" class="row" :class="{ locked: r.locked }">
          <h4>{{ r.title }} <span v-if="r.tag" class="tag">{{ r.tag }}</span></h4>
          <p>{{ r.body }}</p>
          <p v-if="r.note" class="tagline">{{ r.note }}</p>
          <div v-if="r.bar !== undefined" class="bar"><i :style="{ width: r.bar + '%' }"></i></div>
          <button v-if="r.action" class="use" @click="game.useBagItem(r.id)">{{ r.action }}</button>
        </div>
        <p v-if="overlay.footer" class="tagline" style="margin-top:18px">{{ overlay.footer }}</p>
      </template>
    </div>
  </div>

  <div v-if="toast" class="toast">{{ toast }}</div>
</template>

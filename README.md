# Sudden Death
by **mumuchxm**

A browser story game in two halves. A school, and a kingdom under it three hundred years later.

There are two builds of the same game. They run **identical logic** — the story, the combat
resolver, the timer, the music and the save format all live in `src/game/` and are shared.
Only the last layer differs.

| | what it is | how you run it |
|---|---|---|
| **Vue build** | Vue 3 + Vite, the project you asked for | `npm install && npm run dev` |
| **Static build** | one folder, no toolchain | open `static/index.html` |

---

## Running the Vue version

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # -> dist/
npm run preview
```

### Deploying to Vercel

Push the repo and import it. Vercel detects Vite on its own:

- Framework preset: **Vite**
- Build command: `npm run build`
- Output directory: `dist`

Nothing else to configure. No environment variables, no server, no database.

## Running the static version

Open `static/index.html`. That is the whole instruction — it works from a `file://` path,
off a USB stick, or from any static host with no build step at all. Drop the `static/`
folder onto Vercel, Netlify or GitHub Pages and it is live.

`static/game.js` is generated from the shared modules. If you edit anything in `src/game/`,
regenerate it:

```bash
npm run build:static
```

---

## Layout

```
index.html              Vite entry
src/
  main.js               mounts the Vue app
  App.vue               every screen, bound to the shared core
  styles.css
  game/                 ← the actual game, shared by both builds
    core.js             scene machine, typewriter, combat, timer, save
    combat lives in core.js alongside the scene runner
    audio.js            sound effects and the generated score
    motes.js            the drifting spores
    registry.js         the object story files attach themselves to
    story_school.js     arc one
    story_below.js      arc two and every enemy
    story_endings.js    thirteen endings
    renderer.js         plain-DOM renderer, used only by the static build
static/                 the no-build version (generated)
tools/build-static.js   bundles src/game into static/game.js
```

No images. No audio files. No fonts to fetch. Every sound is generated live by the Web
Audio API, the particle field is a canvas, the masks are inline SVG.

---

## What changed in this pass

### Bugs found and fixed in the sweep

- **Two of four tells were never taught.** The apostle fights ran a `teach` window of 2 and
  the Keeper and the Bright One ran 3, so the shuffle bag took over before you had been
  shown the whole moveset — exactly the unfair-hit hole the engine is supposed to close.
  Every teach window is now at least as long as the enemy's tell list, and `tools/audit.mjs`
  fails the build if one ever isn't again.
- **Items could be used mid-sentence.** `useBagItem` never checked `store.typing` or
  `verbsOn`, so tapping an item while the prose was still typing queued a second
  `nextExchange` and desynced the fight — the tell on screen stopped being the tell you were
  answering. It now refuses while the exchange is still being handed to you.
- **An item that ends a scene left the fight running.** The pale fruit calls `go()`. Used
  inside a fight, combat stayed `active` and the rAF clock kept ticking underneath the story,
  so the timeout handler could fire and hit you in a room with no enemy in it. `go()` from an
  item now closes the fight first.
- **Instant items printed their message twice**, once to the log and once as the exchange
  prefix.
- **Dead peek branch.** `present()` tested `peekNext` to append the Echo peek, but
  `nextExchange` clears `peekNext` immediately before calling `present`, so the branch could
  never run. The peek was already being written straight to the log; the dead code is gone.

### The order is not fixed any more

Every enemy used to walk a hardcoded `pattern` array. Eight exchanges and you had seen the
whole fight; after that you were not reading anything, you were reciting.

Now each enemy has a **teach window** — the first few exchanges still walk its written
pattern, so you get shown all four of its tells in a sensible order — and after that a
seeded shuffle bag takes over. The bag guarantees:

- you see all four tells once per cycle, so nothing is ever withheld,
- never the same tell twice in a row,
- never a Focus tell you cannot afford. This is checked twice: once when the tell is drawn,
  and again at the moment it lands, because the draw happens an exchange early so the Echo
  peek has something honest to show you. If you paid for the peek, the peek wins and the
  tell stands — and guarding a Focus tell on empty lungs costs you nothing.

The randomness is in the sequence only. The same tell still has exactly one right answer.
The bag is seeded from your run seed, so the same save fights the same fight twice. This is
also the first time the Echo peek is worth its price.

### Statuses, and why there are no cooldowns

There were cooldowns for about a day. They were a mistake and they are gone.

The problem was that a cooldown only ever fires on a **correct** read. Strike locked itself
after it landed; Focus locked itself after it healed. So the better you played, the fewer
verbs you had, and the game's answer to a good read was to take the good read away from you.
Since Guard is the only verb that is never a disaster, the optimal line collapsed into
guarding through your own cooldowns and waiting. That is why it felt simultaneously fiddly
and far too easy: you were rarely *choosing* anything, and the thing you were mostly doing
was the thing that cannot hurt you.

What is left:

- **Staggered.** Misread a tell marked `heavy` — each enemy has one — or let the clock run
  out twice running, and every verb except Guard goes dark for an exchange. Guarding out of
  a stagger is free and clears it. This is the only thing that ever closes a verb, and it is
  always a consequence of something you did wrong.
- **Reeling.** A clean Strike while you are in Clarity knocks the enemy back. It cannot hurt
  you that exchange.

**Guard is never closed, under any circumstance.** Nothing in this game can hit you that you
had no way to answer.

To put the difficulty back where the cooldowns were pretending to hold it, misreading a
heavy tell now costs **two** ember instead of one, and the clock is less generous while you
are in Clarity (×1.15, was ×1.25) or staggered (×1.25, was ×1.35). The pressure now comes
from mistakes rather than from bookkeeping.

### The bag is visible now

Items used to live behind a modal that nobody opens mid-fight. There is now an item rail
under the combat verbs and a *You are carrying* strip under story choices. Items carry a
short label, a tag, and a `suggest()` function — the lumaflies glow gold when your ember is
low, the wax when your breath bottoms out, the nail chip when the enemy is nearly finished.

Using an item in a fight **costs you the exchange** (it resolves as a free guard), so it is
a decision rather than a free heal. The pale fruit and the nail chip stay out of the story
strip on purpose: the fruit because a stray number key should not trigger an ending, the
chip because it does nothing outside a fight.

### Three Apostles, and they are people

The Apostles are not monsters and they are not a boss rush. They are three people you meet
early, by name, doing ordinary things, long before you learn what they are:

- **Tallow**, on the road, who has been walking alone for nine months and packed four shirts
  and no food, and who will not stop talking.
- **Quill**, at the Choir, who used to teach, and who is carrying a boy called Aled. You can
  get her killed at the Choir without ever meaning to.
- **Bit**, thirteen, in the gallery, with a coat holding eight signatures and a working pen,
  who tells you that you are the ninth one.

Whether each of them ends the run as an ally, a spared stranger, or a body depends on what
you said to them hours earlier. They are Man-God's victims before they are his hands, and
the epilogue counts them.

### Mumu the Hollow

The regressor. She has done this before, more times than she will say, and she turns up at
the edge of all three wakes leaving memory shards behind her. Befriend her (bond 3) and in
the final fight she **doubles your damage and slows the clock by a little over half again**.
Ignore her and Man-God is a very fast, very short, very unkind fight.

She does not fight for you. She has decided that helping you is not the same as saving you.

### The Rule, and how to break it

Man-God asks one thing: never say out loud what he is. The Below listens. Say it anywhere —
to an apostle, to a stranger, to him — and the run ends instantly, in the **Named** ending,
with a note that remembers exactly how you did it. There is no fight and no second chance.
Be careful what you let yourself be clever about.

### Beating Man-God is the true ending

`blackhand` is now the `win` ending, and its epilogue branches on which apostles lived, which
died, and whether Mumu ever stopped looping. His fight has `poise 16`, a 3.4s clock that
**accelerates every exchange**, and a phase change at half poise that speeds it up again.
Surviving apostles each shave his poise and loosen the clock slightly.

`oldbones` is now a secret rather than the best outcome, and it closes on him getting away
and starting again with somebody new.

### Emphasis and epigraphs

Scenes can now carry a `beat` (`loud` or `quiet`) and a `quote`. **She kills you.** is its
own scene now, alone on the page, before the rest of it arrives quietly. *Three hundred
years later* lands the same way. Sad and unpleasant epigraphs sit above the prose where they
earn it.

### Portraits for everyone

`PORTRAIT` was enemies-only. There are now faces for Ren, Tallow, Quill, Bit, Mumu, the deep
thing, and you, and the story scenes use them.

### Tests

Two headless harnesses, since there is no `node_modules` here to run a real build against:

- `node tools/selftest.mjs` — imports the ES modules, validates that every scene target and
  ending key resolves, runs every scene and ending body across a spread of state shapes, and
  property-checks the shuffle bag (no repeats, full cycles, breath guard, seed determinism).
- `node tools/audit.mjs` — structural sweep over the content rather than the engine: every
  combat def has four tells covering all four verbs, a pattern that indexes real tells and
  teaches all of them before the bag takes over, a real portrait and enemy art, a phase that
  actually changes something and cannot fire on the first exchange, at most two heavy tells;
  every item has a `use()`; every `addItem()` names an item that exists; exactly one ending
  is marked `win`; no choice goes nowhere.
- `node tools/domtest.mjs` — builds a fake DOM from the real `static/index.html`, evals
  `static/game.js`, plays the opening 23 scenes into a forced fight, and asserts the status
  and rail wiring, that Guard is never locked, and that every referenced portrait and enemy
  art actually exists.

Run `npm run build:static` after any change under `src/game/`, then `npm test`.

---

## What changed in the pass before this one

### Combat is no longer capable of hitting you unfairly

The old resolver had a hole: if a Focus tell came round while your breath was empty, every
button on the screen cost you an ember. That is gone. **Guard now always blocks.** Read it
wrong and you still get something in the way — it only costs the two breath you were
saving, and if you have no breath it costs one ember instead of two. Guard is the
"I don't know" button, and using it is a real decision rather than a punishment.

The rest of the rebalance follows from that:

- **Strike** now deals 2 poise instead of 1, and 3 during Clarity. It is the reward for
  reading, not just another correct answer.
- **Slip** returns the most breath. **Guard** returns 1. **Focus** heals and costs 2.
- Enemies no longer cycle their tells 1-2-3-4. Each has its own fixed **pattern** — still
  completely deterministic and learnable, just not a metronome.
- Enemy poise went up to match, so fights last about as long as before but you spend the
  time deciding rather than waiting for the loop to come round.

### Every turning point is a checkpoint

Falling in the Below no longer ends the run outright. You get a scene called Falling with
two options: go back to the last turning point, or let go and take the Hollow ending.
Checkpoints are written at the Waking, the Choir, the Sealed One, the climb, the Bright
Waking, and twice in the school arc.

### Arc one is a different story now

**Ren.** Somebody new, who is easy to be around, and who Mira notices before you tell her
about them. There is a hidden Jealousy count that rises with every hour you spend on Ren,
and if it gets high enough the last night does not begin with you at all.

**Mira is pansexual, and it is stated plainly in the Tuesday lunch scene**, so nothing
about who you are changes what she is. She does not have a type. She has a person.

**Telling her you love her is not a way out.** It works — completely, instantly, and that
is the trap. She now has a sentence to measure every other sentence against, and the rest
of the night has no margin at all. One ordinary mistake kills you. It can still reach the
Hers ending, which is not a good one.

**There are exactly two ways to survive her**, and neither is pleasant.

*The short way.* Available only after you get out of the building and understand that
getting out was not the same as getting away. The game refuses to describe it and treats
it as what it is — her decision, which she made you carry. It is not a win, it is not an
ending, and it does not skip anything: it drops you into the Below like every other death,
carrying a flag that a few endings quietly notice.

*The long way.* Kill her. This needs **three things the game never mentions, never lists,
and never flags:**

1. **Certainty** — keep the proof *and* go back and read it properly in the last quiet
   hour. Reading it a second time is what stops you freezing.
2. **Ground** — set up an exit earlier in the week *and* spend part of that last hour
   walking the building, so the last scene happens in a room you chose.
3. **Means** — a mundane heavy object you moved on Wednesday for a reason that had nothing
   to do with any of this.

With all three, one extra option appears in the final scene and it is not marked. Without
them it is not there and you will never know it existed. And surviving the nine seconds is
still only two thirds of it — call it in from the floor without straightening anything and
you get **What You Did**; tidy up first and the proof in your bag becomes worthless and you
get **Tidied**.

The last quiet hour only has room for two actions and there are three things you might want
from it. Choosing the ally is choosing not to be ready. That is the point.

### The text is no longer coloured

Speech is marked with actual quotation marks now, the way prose does it, and nothing in the
body text is tinted. Feedback in combat comes from the enemy, the meters and the clock.

### Your name is required, and the story uses it

The Begin button stays disabled until you type something. Mira says it, Man-God nearly says
something else instead of it, and it turns up through both arcs.

### Art

Every enemy has its own silhouette now rather than one shared mask: a hollow vessel, a long
thing under the water, a door that learned to stand up, a chained keeper, apostles with
their numerals, the Bright One as a sun with a face in it, and Man-God as a plain round
head with a warm, permanent, extremely friendly smile. They all share the six animation
states, so a charge reads as a charge no matter what is doing it.

Characters get small line portraits when they matter — Mira, your ally, the companion, the
Sealed One, Four, the Bright One and Man-God.

### Smaller things

Larger ember masks and a wider breath bar. Roughly a third of the vertical padding removed
throughout; the arena centres itself instead of leaving a field of nothing under the verbs.
Detention now takes real commitment to reach.

---

## The pass before that

### The clock

Every combat exchange is now timed, and the timer is the main pressure in the game.

The worse the thing in front of you, the less time you get:

| | seconds |
|---|---|
| A Quiet One | 9.0 |
| Something patient in the water | 8.2 |
| The Long-Armed | 7.4 |
| What the seal keeps | 6.4 |
| An Apostle | 6.0 |
| The Bright One | 5.2 |
| Man-God | 4.6 |

The bar sits directly under the enemy and turns to ember with a tick of sound at the last
third. **Let it run out and it hits you anyway, for one ember** — the same as a misread,
because standing there deciding is a decision.

Two things loosen it. A **Clarity** streak gives you a quarter again as long, which is now
the real reward for reading cleanly rather than just prettier prose. And there is a
**slower timer** setting in the menu that adds three quarters again to everything, for
anyone who wants to read rather than react. It is not hidden and it costs nothing.

The clock pauses when you open your bag and when the tab is in the background, so nothing
kills you while you are looking at an item.

### The glimpse

Above the text there is now a mask, and it moves before it is described. Six states, each
one a different silhouette rather than a different colour, so you can learn to read it at
the edge of your vision:

- **charging** — leans back, swells, the aura goes ember and shudders → *Slip*
- **striking** — snaps forward, close and enormous, pale → *Guard*
- **open** — slumped, dim, a crack showing → *Strike*
- **withdrawn** — small, far off, waiting → *Focus*
- **it landed one** — a red jolt
- **finished** — falls forward and fades

It never tells you the verb. It is the same information the prose gives you, half a beat
sooner and in a form you can read without finishing the sentence — which is exactly what
getting good at a fight feels like.

### Music

A generated score, no files. A drone of two detuned oscillators through a slow breathing
filter, a sparse note sequencer that deliberately leaves holes, and a heartbeat pulse that
only exists in combat. Seven moods, switched by the game itself:

`title` · `school` (warm, wide intervals) · `dread` (the last two school days — minor
second, close and airless) · `below` · `combat` · `boss` (faster pulse, a tritone in the
scale) · `ending`

Music and all sound have separate toggles in the menu. Both are remembered.

---

## Deviations from the original design doc

- **Scars** only trigger on three or more hits in one fight, not on every fight. Permanent
  chip damage from a fight you basically won reads as unfair rather than costly, and
  no-random-numbers combat only works if every loss is legible as your fault.
- **Vue is real here, but the game logic is framework-free on purpose.** Putting scenes and
  combat in a framework would have made the static build impossible and the story harder to
  edit. `src/game/` is plain JavaScript; `App.vue` is a 300-line view over it.

---

## Things worth knowing before you play

- Dying at the end of the school arc is the story. The game will not say game over.
- Surviving her is possible and it is not a reward.
- If you survive the school arc, that is where the game ends. You never see the other world.
- There are no dice in the answers. The same tell always has exactly one right verb. Only the
  order shuffles.
- Nothing you do right ever takes a verb away from you. If a verb is dark, you are staggered,
  and you got there yourself.
- Say out loud what Man-God is and the run is over immediately. It is the one rule.
- The three people you meet on the way down matter more than anything you carry.
- Chasing Echoes makes you stronger and makes him harder to trust. That is the trade.
- The number slip happens once, is never flagged, and proves nothing.

## Keys

`1`–`9` choose · `space` skips typing · `Q W E R` are Strike, Guard, Slip, Focus ·
`I` bag · `B` bonds · `Esc` menu

One save slot in localStorage, written every scene. It clears when a run ends. The endings
journal does not.

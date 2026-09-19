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

## The pass before this one

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
- There are no dice. The same tell always has the same right answer.
- Chasing Echoes makes you stronger and makes him harder to trust. That is the trade.
- The number slip happens once, is never flagged, and proves nothing.

## Keys

`1`–`9` choose · `space` skips typing · `Q W E R` are Strike, Guard, Slip, Focus ·
`I` bag · `B` bonds · `Esc` menu

One save slot in localStorage, written every scene. It clears when a run ends. The endings
journal does not.
#   S u d d e n _ D e a t h _ G a m e  
 
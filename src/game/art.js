/* Sudden Death — art.
   Every enemy gets its own silhouette. They all share the same structure
   (aura / mask / shadow) so one set of state animations drives all of them. */

const wrap = inner => '<svg viewBox="0 0 160 124" preserveAspectRatio="xMidYMid meet">' +
  '<ellipse class="aura" cx="80" cy="58" rx="44" ry="40"/>' +
  '<g class="mask">' + inner + '</g>' +
  '<g class="shadow"><ellipse cx="80" cy="112" rx="32" ry="5"/></g></svg>';

export const ENEMY_ART = {
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

export const PORTRAIT = {
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

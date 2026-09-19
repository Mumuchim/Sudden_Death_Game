/* Sudden Death — shared registry.
   Story modules import `api` and hang scenes, endings and items off it.
   The runtime (core.js) fills in the verbs. Both the static build and the
   Vue build use this exact object, so the story is written once. */

export const api = {
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

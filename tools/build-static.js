/* Builds static/game.js from the ES modules in src/game.
   The two builds run identical logic; this one just doesn't need a toolchain.
   Run with: node tools/build-static.js */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ORDER = ['registry', 'audio', 'art', 'core', 'motes', 'story_school', 'story_below', 'story_endings', 'renderer'];
const SRC = path.join(__dirname, '..', 'src', 'game');
const OUT = path.join(__dirname, '..', 'static', 'game.js');

let body = '';
for (const name of ORDER) {
  let s = fs.readFileSync(path.join(SRC, name + '.js'), 'utf8');
  s = s.split('\n').filter(l => !/^\s*import\s/.test(l)).join('\n');
  s = s.replace(/^export\s+/gm, '');
  body += `\n/* ===== ${name}.js ===== */\n` + s + '\n';
}

const out =
`/* Sudden Death — by mumuchxm.
   Generated from src/game by tools/build-static.js. Do not edit by hand. */
(function () {
'use strict';
${body}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
else mount();
window.__sd = { game: game, store: store };
})();
`;

fs.writeFileSync(OUT, out);
console.log('wrote', OUT, (out.length / 1024).toFixed(1) + ' kB');

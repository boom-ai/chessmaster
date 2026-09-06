// Verifies OPENINGS_EXTRA: mirrors scripts/verify-openings.mjs checks plus
// count === 88, id uniqueness (incl. no collision with OPENINGS), and
// non-empty explanations on every mainline step.
import { Chess } from 'chess.js';
import { OPENINGS_EXTRA } from '../src/data/openingsExtra.js';
import { OPENINGS } from '../src/data/openings.js';

function play(moves) {
  const game = new Chess();
  const sans = [];
  for (const uci of moves) {
    const m = game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    sans.push(m.san);
  }
  return { sans, fen: game.fen() };
}

let failures = 0;
const fail = (msg) => { console.log(`  FAIL ${msg}`); failures++; };

// count
if (OPENINGS_EXTRA.length !== 88) {
  console.log(`FAIL count: expected 88, got ${OPENINGS_EXTRA.length}`);
  failures++;
} else {
  console.log('count === 88 ✔');
}

// id uniqueness + no collision with existing
const existing = new Set(OPENINGS.map((o) => o.id));
const seen = new Set();
for (const o of OPENINGS_EXTRA) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(o.id)) fail(`${o.id}: id not kebab-case`);
  if (seen.has(o.id)) fail(`${o.id}: duplicate id within EXTRA`);
  seen.add(o.id);
  if (existing.has(o.id)) fail(`${o.id}: collides with existing OPENINGS id`);
}
console.log(`ids unique, no collisions ✔ (${seen.size})`);

// forColor split
const w = OPENINGS_EXTRA.filter((o) => o.forColor === 'w').length;
const b = OPENINGS_EXTRA.filter((o) => o.forColor === 'b').length;
console.log(`forColor split: w=${w} b=${b}`);
if (w + b !== 88) { console.log('FAIL forColor values'); failures++; }

for (const o of OPENINGS_EXTRA) {
  console.log(`\n== ${o.name} ==`);
  for (const f of ['name', 'eco', 'forColor', 'level', 'tagline', 'description']) {
    if (!o[f] || typeof o[f] !== 'string') fail(`${o.id}: missing/empty ${f}`);
  }
  if (!Array.isArray(o.keyIdeas) || o.keyIdeas.length < 3) fail(`${o.id}: keyIdeas < 3`);
  if (!Array.isArray(o.variations) || o.variations.length < 2) fail(`${o.id}: variations < 2`);
  try {
    const mainUcis = o.mainline.map((s) => s.uci);
    const { sans, fen } = play(mainUcis);
    console.log(`  mainline (${mainUcis.length} ply): ${sans.join(' ')}`);
    console.log(`  final FEN: ${fen}`);
    for (const [i, s] of o.mainline.entries()) {
      if (!s.explanation || typeof s.explanation !== 'string' || s.explanation.trim() === '') {
        fail(`${o.id} step ${i}: empty explanation`);
      }
      for (const a of [...(s.arrows ?? []), ...((s.highlight ?? []).map((h) => ({ from: h, to: h })))]) {
        for (const sq of [a.from, a.to]) {
          if (!/^[a-h][1-8]$/.test(sq)) fail(`${o.id} step ${i}: bad square "${sq}"`);
        }
      }
    }
  } catch (e) {
    fail(`${o.id} mainline: ${e.message}`);
  }
  for (const v of o.variations) {
    try {
      const { sans } = play(v.moves);
      console.log(`  ✓ ${v.name} (${v.moves.length} ply): ${sans.join(' ')}`);
    } catch (e) {
      fail(`${o.id} variation "${v.name}": ${e.message}`);
    }
  }
}
console.log(failures === 0 ? '\nALL EXTRA OPENINGS VERIFIED ✔' : `\n${failures} FAILURE(S) ✘`);
process.exit(failures === 0 ? 0 : 1);

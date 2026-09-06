// Verifies STRATEGY_MID (mirrors verify-strategy.mjs) + count/ids/phase.
import { Chess } from 'chess.js';
import { STRATEGY_MID } from '../src/data/strategyMid.js';

const BASE_IDS = ['m-iqp','m-majority','m-open-files','m-outposts','m-bishop-pair','m-storm','m-prophylaxis','m-space','m-bad-bishop','m-hanging','m-doubled','m-exchange-sac','m-kingside-roll','m-central-break','m-weak-square'];
function playUci(game, uci) {
  return game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
}
let failures = 0;
console.log(`Lessons: ${STRATEGY_MID.length}`);
if (STRATEGY_MID.length !== 85) { console.log(`FAIL: count ${STRATEGY_MID.length} !== 85`); failures++; }
const seen = new Set();
for (const L of STRATEGY_MID) {
  if (!L.id || seen.has(L.id) || BASE_IDS.includes(L.id)) { console.log(`FAIL id ${L.id}`); failures++; }
  seen.add(L.id);
  if (L.phase !== 'middlegame') { console.log(`FAIL ${L.id}: phase`); failures++; }
  for (const f of ['title','level','tagline','description','keyIdeas','mainline','drill']) {
    if (!L[f] || (Array.isArray(L[f]) && !L[f].length)) { console.log(`FAIL ${L.id}: missing ${f}`); failures++; }
  }
  let game;
  try { game = L.startFen ? new Chess(L.startFen) : new Chess(); }
  catch { console.log(`FAIL ${L.id}: bad startFen`); failures++; continue; }
  let ok = true;
  L.mainline.forEach((s, i) => {
    if (!s.uci || !s.explanation) { console.log(`FAIL ${L.id} step ${i}`); ok = false; return; }
    try { playUci(game, s.uci); } catch { console.log(`FAIL ${L.id} step ${i} (${s.uci})`); ok = false; }
    for (const sq of [...(s.highlight ?? []), ...((s.arrows ?? []).flatMap((a) => [a.from, a.to]))]) {
      if (!/^[a-h][1-8]$/.test(sq)) { console.log(`FAIL ${L.id} step ${i}: bad square`); ok = false; }
    }
  });
  if (!ok) { failures++; continue; }
  const d = L.drill;
  let dg;
  try { dg = new Chess(d.startFen); } catch { console.log(`FAIL ${L.id} drill FEN`); failures++; continue; }
  if (dg.turn() !== d.forColor) { console.log(`FAIL ${L.id} drill turn`); failures++; continue; }
  for (const u of d.moves) {
    try { playUci(dg, u); } catch { console.log(`FAIL ${L.id} drill move ${u}`); ok = false; break; }
  }
  if (!ok) { failures++; continue; }
  console.log(`  ✓ ${L.id}`);
}
console.log(failures === 0 ? 'ALL STRATEGY_MID VERIFIED ✔ (85/85)' : `${failures} FAILURE(S) ✘`);
process.exit(failures === 0 ? 0 : 1);

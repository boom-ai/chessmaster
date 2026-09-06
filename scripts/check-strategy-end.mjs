// Verifies STRATEGY_END (src/data/strategyEnd.js): mirrors scripts/verify-strategy.mjs
// checks on the new lessons, plus: count===85, id uniqueness, no collision with
// existing endgame ids, phase==='endgame', startFen present on every lesson.
import { Chess } from 'chess.js';
import { STRATEGY_END } from '../src/data/strategyEnd.js';

const EXISTING = ['e-king-center', 'e-opposition', 'e-lucena', 'e-philidor', 'e-outside-passer',
  'e-rook-activity', 'e-fortress', 'e-mate-kq', 'e-mate-kr', 'e-pawn-push', 'e-outside',
  'e-rook-behind', 'e-triangulation', 'e-stalemate-save', 'e-key-squares'];

function playUci(game, uci) {
  return game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
}

let failures = 0;
const seen = new Set();
console.log(`Lessons: ${STRATEGY_END.length}`);
if (STRATEGY_END.length !== 85) {
  console.log(`FAIL: expected exactly 85 entries, got ${STRATEGY_END.length}`);
  failures++;
}
for (const L of STRATEGY_END) {
  if (seen.has(L.id)) { console.log(`FAIL ${L.id}: duplicate id`); failures++; }
  seen.add(L.id);
  if (!L.id || !L.id.startsWith('e-')) { console.log(`FAIL ${L.id}: id must start with e-`); failures++; }
  if (EXISTING.includes(L.id)) { console.log(`FAIL ${L.id}: collides with existing lesson`); failures++; }
  if (L.phase !== 'endgame') { console.log(`FAIL ${L.id}: phase must be endgame, got ${L.phase}`); failures++; }
  for (const f of ['id', 'title', 'phase', 'level', 'tagline', 'description', 'keyIdeas', 'mainline']) {
    if (!L[f] || (Array.isArray(L[f]) && !L[f].length)) {
      console.log(`FAIL ${L.id}: missing ${f}`);
      failures++;
    }
  }
  if (!L.startFen) { console.log(`FAIL ${L.id}: missing startFen`); failures++; continue; }
  // soundness: the side NOT to move must not be in check (else illegal position)
  for (const [label, fen] of [['main', L.startFen], ['drill', L.drill?.startFen]]) {
    if (!fen) continue;
    const p = fen.split(' ');
    try {
      const flipped = new Chess(p[0] + ' ' + (p[1] === 'w' ? 'b' : 'w') + ' ' + p.slice(2).join(' '));
      if (flipped.isCheck()) { console.log(`FAIL ${L.id} ${label} start: enemy king in check (invalid position)`); failures++; }
    } catch { console.log(`FAIL ${L.id} ${label}: bad FEN`); failures++; }
  }
  if (!L.drill || !L.drill.startFen || !L.drill.forColor || !L.drill.about ||
      !Array.isArray(L.drill.moves) || L.drill.moves.length < 2 || L.drill.moves.length > 11) {
    console.log(`FAIL ${L.id}: drill must have startFen/forColor/about/moves(2-11)`);
    failures++;
    continue;
  }
  // mainline from startFen
  let game;
  try { game = new Chess(L.startFen); }
  catch { console.log(`FAIL ${L.id}: bad startFen`); failures++; continue; }
  const sans = [];
  let ok = true;
  L.mainline.forEach((s, i) => {
    if (!s.uci || !s.explanation) {
      console.log(`FAIL ${L.id} step ${i}: missing uci/explanation`);
      ok = false;
      return;
    }
    try { sans.push(playUci(game, s.uci).san); }
    catch { console.log(`FAIL ${L.id} step ${i} (${s.uci}): illegal. fen=${game.fen()}`); ok = false; }
    for (const sq of [...(s.highlight ?? []), ...((s.arrows ?? []).flatMap((a) => [a.from, a.to]))]) {
      if (!/^[a-h][1-8]$/.test(sq)) {
        console.log(`FAIL ${L.id} step ${i}: bad square "${sq}"`);
        ok = false;
      }
    }
  });
  if (!ok) { failures++; continue; }
  // drill
  const d = L.drill;
  let dg;
  try { dg = new Chess(d.startFen); }
  catch { console.log(`FAIL ${L.id} drill: bad startFen`); failures++; continue; }
  if (dg.turn() !== d.forColor) {
    console.log(`FAIL ${L.id} drill: turn=${dg.turn()} but forColor=${d.forColor}`);
    failures++;
    continue;
  }
  const dsans = [];
  for (const u of d.moves) {
    try { dsans.push(playUci(dg, u).san); }
    catch { console.log(`FAIL ${L.id} drill move ${u}: illegal. fen=${dg.fen()}`); ok = false; break; }
  }
  if (!ok) { failures++; continue; }
  if (L.id.startsWith('e-mate-') && !dg.isCheckmate()) {
    console.log(`FAIL ${L.id} drill: does not end in mate`);
    failures++;
    continue;
  }
  console.log(`  ✓ ${L.id} main ${sans.join(' ')}`);
  console.log(`    drill ${dsans.join(' ')}`);
}
console.log(failures === 0 ? 'ALL STRATEGY_END VERIFIED ✔ (85/85)' : `${failures} FAILURE(S) ✘`);
process.exit(failures === 0 ? 0 : 1);

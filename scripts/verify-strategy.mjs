// Verifies strategy lessons: FEN validity, mainline + drill legality,
// E-mate drill ends in checkmate. Prints drill-end FENs for tablebase WDL check.
import { Chess } from 'chess.js';
import { STRATEGY } from '../src/data/strategy.js';

function playUci(game, uci) {
  return game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
}

let failures = 0;
console.log(`Lessons: ${STRATEGY.length}`);
const drillEnds = [];
for (const L of STRATEGY) {
  for (const f of ['id', 'title', 'phase', 'level', 'tagline', 'description', 'keyIdeas', 'mainline']) {
    if (!L[f] || (Array.isArray(L[f]) && !L[f].length)) {
      console.log(`FAIL ${L.id}: missing ${f}`);
      failures++;
    }
  }
  // mainline
  let game;
  try {
    game = L.mainline[0]?.fen ? new Chess() : new Chess();
  } catch { game = new Chess(); }
  try {
    if (L.startFen) game = new Chess(L.startFen);
  } catch (e) {
    console.log(`FAIL ${L.id}: bad startFen`);
    failures++;
    continue;
  }
  const sans = [];
  let ok = true;
  L.mainline.forEach((s, i) => {
    if (!s.uci || !s.explanation) {
      console.log(`FAIL ${L.id} step ${i}: missing uci/explanation`);
      ok = false;
      return;
    }
    if (s.fen) {
      try { game = new Chess(s.fen); } catch { console.log(`FAIL ${L.id} step ${i}: bad fen`); ok = false; }
      return;
    }
    try {
      sans.push(playUci(game, s.uci).san);
    } catch {
      console.log(`FAIL ${L.id} step ${i} (${s.uci}): illegal. fen=${game.fen()}`);
      ok = false;
    }
    for (const sq of [...(s.highlight ?? []), ...((s.arrows ?? []).flatMap((a) => [a.from, a.to]))]) {
      if (!/^[a-h][1-8]$/.test(sq)) {
        console.log(`FAIL ${L.id} step ${i}: bad square "${sq}"`);
        ok = false;
      }
    }
  });
  if (!ok) { failures++; continue; }
  // drill
  if (L.drill) {
    const d = L.drill;
    let dg;
    try {
      dg = new Chess(d.startFen);
    } catch {
      console.log(`FAIL ${L.id} drill: bad startFen`);
      failures++;
      continue;
    }
    if (dg.turn() !== d.forColor) {
      console.log(`FAIL ${L.id} drill: turn=${dg.turn()} but forColor=${d.forColor}`);
      failures++;
      continue;
    }
    const dsans = [];
    for (const u of d.moves) {
      try {
        dsans.push(playUci(dg, u).san);
      } catch {
        console.log(`FAIL ${L.id} drill move ${u}: illegal. fen=${dg.fen()}`);
        ok = false;
        break;
      }
    }
    if (!ok) { failures++; continue; }
    if (L.id === 'e-mate-kq' && !dg.isCheckmate()) {
      console.log(`FAIL ${L.id} drill: does not end in mate`);
      failures++;
      continue;
    }
    if (L.phase === 'endgame') drillEnds.push([L.id, dg.fen()]);
    console.log(`  ✓ ${L.id} main ${sans.join(' ')}`);
    console.log(`    drill ${dsans.join(' ')}`);
  } else {
    console.log(`  ✓ ${L.id} main ${sans.join(' ')} (no drill)`);
  }
}
console.log('--- drill end FENs (tablebase WDL check) ---');
for (const [id, fen] of drillEnds) console.log(`${id} :: ${fen}`);
console.log(failures === 0 ? 'ALL STRATEGY VERIFIED ✔' : `${failures} FAILURE(S) ✘`);
process.exit(failures === 0 ? 0 : 1);

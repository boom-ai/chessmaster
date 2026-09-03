// Verifies every opening mainline + variation: all UCI moves legal from the start.
// Prints SAN transcription so you can eyeball correctness.
import { Chess } from 'chess.js';
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
for (const o of OPENINGS) {
  console.log(`\n== ${o.name} ==`);
  try {
    const mainUcis = o.mainline.map((s) => s.uci);
    const { sans, fen } = play(mainUcis);
    console.log(`  mainline (${mainUcis.length} ply): ${sans.join(' ')}`);
    console.log(`  final FEN: ${fen}`);
    // squares referenced by arrows/highlights must be valid
    for (const [i, s] of o.mainline.entries()) {
      for (const a of [...(s.arrows ?? []), ...((s.highlight ?? []).map((h) => ({ from: h, to: h })))] ) {
        for (const sq of [a.from, a.to]) {
          if (!/^[a-h][1-8]$/.test(sq)) {
            console.log(`  FAIL step ${i}: bad square "${sq}"`);
            failures++;
          }
        }
      }
    }
  } catch (e) {
    console.log(`  FAIL mainline: ${e.message}`);
    failures++;
  }
  for (const v of o.variations) {
    try {
      const { sans } = play(v.moves);
      console.log(`  ✓ ${v.name} (${v.moves.length} ply): ${sans.join(' ')}`);
    } catch (e) {
      console.log(`  FAIL variation "${v.name}": ${e.message}`);
      failures++;
    }
  }
}
console.log(failures === 0 ? '\nALL OPENINGS VERIFIED ✔' : `\n${failures} FAILURE(S) ✘`);
process.exit(failures === 0 ? 0 : 1);

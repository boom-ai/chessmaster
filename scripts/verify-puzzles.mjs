// Verifies every puzzle line: legal moves, correct turn order, final checkmate.
import { Chess } from 'chess.js';
import { PUZZLES } from '../src/data/puzzles.js';

function uciToMove(uci) {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined };
}

let failures = 0;
for (const p of PUZZLES) {
  const game = new Chess(p.fen);
  const expectedSide = p.side;
  if (game.turn() !== expectedSide) {
    console.log(`FAIL ${p.id}: FEN turn=${game.turn()} but puzzle side=${expectedSide}`);
    failures++;
    continue;
  }
  let ok = true;
  p.solution.forEach((uci, i) => {
    const mover = i % 2 === 0 ? expectedSide : expectedSide === 'w' ? 'b' : 'w';
    if (game.turn() !== mover) {
      console.log(`FAIL ${p.id} ply ${i}: expected ${mover} to move, got ${game.turn()}`);
      ok = false;
      return;
    }
    let mv = null;
    try {
      mv = game.move(uciToMove(uci));
    } catch (e) {
      console.log(`FAIL ${p.id} ply ${i} (${uci}): illegal — ${e.message}`);
      ok = false;
      return;
    }
    const tag = i % 2 === 0 ? 'player' : 'reply ';
    console.log(`  ${p.id} [${tag}] ${uci} -> ${mv.san} | fen: ${game.fen()}`);
  });
  if (!ok) {
    failures++;
    continue;
  }
  if (!game.isCheckmate()) {
    console.log(`FAIL ${p.id}: final position is NOT checkmate (game over=${game.isGameOver()})`);
    failures++;
  } else {
    console.log(`OK ${p.id}: ends in checkmate. Final FEN: ${game.fen()}`);
  }
}
console.log(failures === 0 ? '\nALL PUZZLES VERIFIED ✔' : `\n${failures} PUZZLE(S) FAILED ✘`);
process.exit(failures === 0 ? 0 : 1);

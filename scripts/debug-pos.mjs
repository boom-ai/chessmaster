// Debug helper: print position + legal moves, test candidate continuations.
import { Chess } from 'chess.js';

const fen = process.argv[2];
const moves = (process.argv[3] ?? '').split(',').filter(Boolean);
const g = new Chess(fen);
console.log(g.ascii());
console.log('turn:', g.turn());
for (const u of moves) {
  try {
    const m = g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
    console.log(`ok ${u} -> ${m.san}`);
  } catch (e) {
    console.log(`ILLEGAL ${u}`);
    break;
  }
}
console.log('--- legal moves:');
console.log(g.moves({ verbose: true }).map((m) => `${m.from}${m.to}${m.san}`).join(' '));
console.log('fen:', g.fen());

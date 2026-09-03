// Diff data-file UCI vs SAN-derived truth for problem games.
import fs from 'node:fs';
import { Chess } from 'chess.js';
import { FAMOUS_GAMES } from '../src/data/games/index.js';

function sansFor(id) {
  const txt = fs.readFileSync('/tmp/games.txt', 'utf8');
  const blocks = txt.split('@@@ ').slice(1);
  for (const b of blocks) {
    if (!b.startsWith(id + ' ') && !b.startsWith(id + '\n')) continue;
    const sanLine = b.split('\n').find((l) => l.startsWith('SAN:'));
    if (sanLine) return sanLine.slice(4).trim().split(/\s+/);
  }
  // hand games: derive from extract script output? they have no SAN line; skip
  return null;
}

for (const id of process.argv.slice(2)) {
  const g = FAMOUS_GAMES.find((x) => x.id === id);
  const sans = sansFor(id);
  if (!sans) { console.log(id, 'no SAN (hand game)'); continue; }
  const game = new Chess();
  const trueUci = [];
  for (const s of sans) {
    try {
      const m = game.move(s);
      trueUci.push(m.from + m.to + (m.promotion ?? ''));
    } catch (e) { console.log(id, 'SAN replay failed at', s); break; }
  }
  console.log(`### ${id}: san=${trueUci.length} mine=${g.moves.length}`);
  const n = Math.min(trueUci.length, g.moves.length);
  let shown = 0;
  for (let i = 0; i < n && shown < 6; i++) {
    if (trueUci[i] !== g.moves[i][0]) {
      console.log(`  ply ${i}: mine=${g.moves[i][0]} (${g.moves[i][1]}) true=${trueUci[i]}`);
      shown++;
    }
  }
  if (trueUci.length !== g.moves.length) console.log(`  LENGTH MISMATCH`);
  if (!shown) console.log('  identical up to min length');
}

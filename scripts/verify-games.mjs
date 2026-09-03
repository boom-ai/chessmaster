// Verifies all 100 famous games: UCI legal, metadata present, ids unique.
// Usage: node scripts/verify-games.mjs
import { Chess } from 'chess.js';
import { FAMOUS_GAMES } from '../src/data/games/index.js';

let failures = 0;
const ids = new Set();
console.log(`Games: ${FAMOUS_GAMES.length}`);
if (FAMOUS_GAMES.length !== 100) {
  console.log(`FAIL: expected 100, got ${FAMOUS_GAMES.length}`);
  failures++;
}
let totalPly = 0;
for (const g of FAMOUS_GAMES) {
  if (ids.has(g.id)) {
    console.log(`FAIL duplicate id: ${g.id}`);
    failures++;
  }
  ids.add(g.id);
  for (const f of ['white', 'black', 'event', 'site', 'year', 'result', 'eco', 'opening', 'tagline', 'story', 'moves']) {
    if (g[f] === undefined || g[f] === '' || g[f] === null) {
      console.log(`FAIL ${g.id}: missing ${f}`);
      failures++;
    }
  }
  if (!['1-0', '0-1', '1/2-1/2'].includes(g.result)) {
    console.log(`FAIL ${g.id}: bad result ${g.result}`);
    failures++;
  }
  const game = new Chess();
  let ok = true;
  g.moves.forEach(([uci, note], i) => {
    if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) {
      console.log(`FAIL ${g.id} ply ${i}: bad UCI "${uci}"`);
      ok = false;
      return;
    }
    if (!note || !note.length) {
      console.log(`FAIL ${g.id} ply ${i}: missing note`);
      ok = false;
      return;
    }
    try {
      game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    } catch {
      console.log(`FAIL ${g.id} ply ${i} (${uci}): illegal, fen=${game.fen()}`);
      ok = false;
    }
  });
  if (!ok) {
    failures++;
    continue;
  }
  totalPly += g.moves.length;
  const end = game.isCheckmate() ? 'mate' : game.isStalemate() ? 'stale' : 'end';
  if (end === 'mate') {
    const winnerIsWhite = game.turn() === 'b';
    const expectWhite = g.result === '1-0';
    if (winnerIsWhite !== expectWhite) {
      console.log(`FAIL ${g.id}: mate winner mismatch (result ${g.result})`);
      failures++;
    }
  }
  console.log(`ok ${g.id} ${g.moves.length}ply ${g.result} [${end}]`);
}
console.log(`Total ply: ${totalPly}`);
console.log(failures === 0 ? 'ALL GAMES VERIFIED ✔' : `${failures} FAILURE(S) ✘`);
process.exit(failures === 0 ? 0 : 1);

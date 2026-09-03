// Phase 2: verify sampled puzzles with chess.js, dedupe, emit src/data/puzzlesLichess.js.
// Usage: node scripts/emit-puzzles.mjs
import fs from 'node:fs';
import { Chess } from 'chess.js';

const picked = JSON.parse(fs.readFileSync('/tmp/picked-puzzles.json', 'utf8'));

const MOTIF = {
  backRankMate: ['Back Rank Mate', 'The rook seals the back rank while his own pawns block every escape square.'],
  smotheredMate: ['Smothered Mate', 'The king is entombed by his own men — the knight delivers the kiss.'],
  arabianMate: ['Arabian Mate', 'Knight covers the escape while the rook mates on the open file.'],
  anastasiaMate: ['Anastasia\u2019s Mate', 'Knight and rook combine: the knight covers the flights, the rook checks home.'],
  bodenMate: ['Boden\u2019s Mate', 'Criss-crossing bishops mate a king trapped by his own pieces.'],
  doubleBishopMate: ['Double Bishop Mate', 'The bishop pair slices the position open on adjacent diagonals.'],
  dovetailMate: ['Dovetail Mate', 'The queen mates next to the king, his own pawns blocking every flight.'],
  hookMate: ['Hook Mate', 'Rook, knight and pawn hook the king — escape squares covered one by one.'],
  killBoxMate: ['Kill Box Mate', 'Rook plus minor piece build an inescapable box around the king.'],
  vukovicMate: ['Vukovic Mate', 'Rook and knight coordinate the classic back-rank execution.'],
  damianoMate: ['Damiano\u2019s Mate', 'Queen sacrifice clears the way — one of the oldest mating patterns.'],
  damianoBishopMate: ['Damiano Bishop Mate', 'The bishop delivers after the queen lures the king out.'],
  anderssenMate: ['Anderssen\u2019s Mate', 'Rook supported by pawn or piece mates along the edge.'],
  operaMate: ['Opera Mate', 'Rook on the back rank, bishop covering the escape — Morphy\u2019s recipe.'],
  epauletteMate: ['Epaulette Mate', 'The king is pinned between his own rooks like epaulettes.'],
};
const GENERIC_THEMES = new Set(['mate', 'middlegame', 'endgame', 'opening', 'short', 'long', 'veryLong', 'master', 'mateIn1', 'mateIn2', 'mateIn3', 'mateIn4', 'mateIn5']);

function prettify(camel) {
  return camel.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
}

const HINTS = {
  1: 'Mate in 1 — list every check; one of them ends the game.',
  2: 'Mate in 2 — force the king out, then deliver mate.',
  3: 'Mate in 3 — every move must force. Calculate to the final mate.',
  4: 'Mate in 4 — stay precise; one slack move and the win slips.',
  5: 'Mate in 5 — deep calculation required. Trust forcing moves.',
};

const counters = {};
const seenFen = new Set();
const out = [];
const stats = { illegal: 0, noMate: 0, dup: 0 };

for (const { tag, row } of picked) {
  const parts = row.split(',');
  const id = parts[0];
  const fen = parts[1];
  const movesStr = parts[2];
  const rating = +parts[3];
  const themes = parts.slice(4).join(',');
  const tagList = themes.split(' ');
  const mateN = +tag.slice(6);
  const tokens = movesStr.trim().split(/\s+/);
  try {
    const g = new Chess(fen);
    g.move({ from: tokens[0].slice(0, 2), to: tokens[0].slice(2, 4), promotion: tokens[0][4] });
    const puzzleFen = g.fen();
    if (seenFen.has(puzzleFen)) { stats.dup++; continue; }
    const solution = tokens.slice(1);
    const sans = [];
    for (const u of solution) {
      const m = g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      sans.push(m.san);
    }
    if (!g.isCheckmate()) { stats.noMate++; continue; }
    seenFen.add(puzzleFen);
    const side = puzzleFen.split(' ')[1];
    const motifTag = tagList.find((t) => MOTIF[t]) ?? tagList.find((t) => !GENERIC_THEMES.has(t));
    const [pretty, blurb] = MOTIF[motifTag] ?? [motifTag ? prettify(motifTag) : 'Mating Net', 'A forced mating sequence — checks, threats and domination until there is no escape.'];
    counters[pretty] = (counters[pretty] ?? 0) + 1;
    const lastSan = sans[sans.length - 1].replace(/#$/, '');
    out.push({
      id: `lichess-${id}`,
      title: `${pretty} ${counters[pretty]}`,
      theme: `Mate in ${mateN}`,
      rating,
      side,
      fen: puzzleFen,
      solution,
      hint: HINTS[mateN] ?? HINTS[5],
      explanation: `Finished by ${lastSan}#. ${blurb}`,
    });
  } catch {
    stats.illegal++;
  }
}

console.log(`verified=${out.length} illegal=${stats.illegal} noMate=${stats.noMate} dup=${stats.dup}`);

const header = `// Auto-generated from the Lichess puzzle database (CC0) via scripts/sample-puzzles.mjs + emit-puzzles.mjs.\n// Each line verified: full solution legal and ends in checkmate. Do not hand-edit.\n`;
const body = `export const LICHESS_PUZZLES = ${JSON.stringify(out, null, 1)};\n`;
fs.writeFileSync(new URL('../src/data/puzzlesLichess.js', import.meta.url), header + body);
console.log('wrote src/data/puzzlesLichess.js', (header + body).length, 'bytes');

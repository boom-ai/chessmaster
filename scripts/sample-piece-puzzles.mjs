// Sample 5 themed puzzles per piece from the Lichess DB, verify, emit data file.
// Usage: node scripts/sample-piece-puzzles.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import readline from 'node:readline';
import { Chess } from 'chess.js';

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// [piece, theme, want]
const QUOTAS = [
  ['pawn', 'enPassant', 1],
  ['pawn', 'promotion', 1],
  ['pawn', 'advancedPawn', 1],
  ['pawn', 'pawnEndgame', 2],
  ['knight', 'fork', 2],
  ['knight', 'smotheredMate', 1],
  ['knight', 'knightEndgame', 1],
  ['knight', 'doubleCheck', 1],
  ['bishop', 'pin', 2],
  ['bishop', 'doubleBishopMate', 1],
  ['bishop', 'bishopEndgame', 1],
  ['bishop', 'discoveredAttack', 1],
  ['rook', 'backRankMate', 2],
  ['rook', 'rookEndgame', 1],
  ['rook', 'queenRookEndgame', 1],
  ['rook', 'clearance', 1],
  ['queen', 'queenEndgame', 2],
  ['queen', 'kingsideAttack', 1],
  ['queen', 'sacrifice', 1],
  ['queen', 'attraction', 1],
  ['king', 'castling', 1],
  ['king', 'pawnEndgame', 2],
  ['king', 'zugzwang', 1],
  ['king', 'queenEndgame', 1],
];

const PRETTY = {
  enPassant: 'En Passant', promotion: 'Promotion', underPromotion: 'Underpromotion',
  advancedPawn: 'Advanced Pawn', pawnEndgame: 'Pawn Endgame', fork: 'Fork',
  smotheredMate: 'Smothered Mate', knightEndgame: 'Knight Endgame', doubleCheck: 'Double Check',
  pin: 'Pin', doubleBishopMate: 'Double Bishop Mate', bishopEndgame: 'Bishop Endgame',
  discoveredAttack: 'Discovered Attack', backRankMate: 'Back Rank Mate', rookEndgame: 'Rook Endgame',
  queenRookEndgame: 'Queen + Rook Endgame', clearance: 'Clearance', queenEndgame: 'Queen Endgame',
  kingsideAttack: 'Kingside Attack', sacrifice: 'Sacrifice', attraction: 'Attraction',
  castling: 'Castling', zugzwang: 'Zugzwang',
};
const HINTS = {
  enPassant: 'An enemy pawn just jumped two squares beside yours — you can capture it en passant, but only now!',
  promotion: 'Push the passer! Calculate whether it queens safely.',
  advancedPawn: 'Your advanced pawn is gold — push it before Black organizes.',
  pawnEndgame: 'King activity first: bring the king to the center, then push.',
  fork: 'One piece attacks two — find the move that hits both targets at once.',
  smotheredMate: 'The king is buried by its own men — the knight gives mate.',
  knightEndgame: 'Centralize the knight and squeeze; knights love outposts.',
  doubleCheck: 'Double check! The king must move — every reply is forced.',
  pin: 'The pinned piece cannot move away — pile onto it or exploit the pin.',
  doubleBishopMate: 'Two bishops on adjacent diagonals mate like scissors.',
  bishopEndgame: 'Put pawns on the opposite color of your bishop, then invade.',
  discoveredAttack: 'Move one piece to unleash another — the double threat wins.',
  backRankMate: 'His own pawns trap the king — seal the back rank.',
  rookEndgame: 'Activate the rook first; passive rooks lose endings.',
  queenRookEndgame: 'Coordinate queen and rook on the 7th rank.',
  clearance: 'Sacrifice to clear a square or line for the real threat.',
  queenEndgame: 'Centralize the queen and push the passed pawn.',
  kingsideAttack: 'Open lines toward the king — sacrifices are usually sound.',
  sacrifice: 'Give material to destroy the king’s shelter — calculate the follow-up.',
  attraction: 'Lure a defender away, then strike what it guarded.',
  castling: 'Get the king safe and connect the rooks — castle now.',
  zugzwang: 'No good moves exist for him — pass the turn with a waiting move.',
};
const BLURBS = {
  enPassant: 'The en passant capture removes the pawn that dared to jump past.',
  promotion: 'The passer queens — passed pawns must be pushed.',
  advancedPawn: 'The advanced pawn decided the game before the ending began.',
  pawnEndgame: 'Textbook king-and-pawn technique: opposition and outflanking.',
  fork: 'One move, two targets — the fork wins material by force.',
  smotheredMate: 'A smothered mate: the knight exploits a fully entombed king.',
  knightEndgame: 'Domination with the minor piece: outpost, zugzwang, conversion.',
  doubleCheck: 'Double check forces the king out — mates and wins follow.',
  pin: 'The pin paralyzed the defender while the pressure grew unbearable.',
  doubleBishopMate: 'Criss-crossing bishops — the classic double-bishop finish.',
  bishopEndgame: 'Good bishop versus bad bishop (or knight): technique triumphs.',
  discoveredAttack: 'The moving piece uncovered a second attacker — two threats, one move.',
  backRankMate: 'Sealed on the back rank by his own pawns.',
  rookEndgame: 'Active rook, active king: the whole endgame formula.',
  queenRookEndgame: 'Queen and rook doubled on the 7th — resignable.',
  clearance: 'The sacrifice cleared the square the real attacker needed.',
  queenEndgame: 'Queen activity plus a runner decided it.',
  kingsideAttack: 'The shelter cracked open and the attack played itself.',
  sacrifice: 'Sound aggression: the shelter was worth more than the piece.',
  attraction: 'Lured away from its post, the defender watched everything collapse.',
  castling: 'Safety first, speed second — castling connected everything.',
  zugzwang: 'With no useful move available, any move loses — pure zugzwang.',
};

const rand = mulberry32(777);
const pools = new Map(); // quotaIdx -> { items: [], seen: n }
QUOTAS.forEach((_, i) => pools.set(i, { items: [], seen: 0 }));

const unz = spawn('unzstd', ['-c', '/tmp/lichess_db_puzzle.csv.zst'], { stdio: ['ignore', 'pipe', 'inherit'] });
const rl = readline.createInterface({ input: unz.stdout, crlfDelay: Infinity });

rl.on('line', (line) => {
  if (!line || line.startsWith('PuzzleId')) return;
  const f = line.split(',');
  if (f.length < 9) return;
  const [id, fen, moves, ratingS, , popS, playsS, themes] = f;
  const rating = +ratingS;
  if (!Number.isFinite(rating) || rating < 500 || rating > 2100) return;
  if (+popS < 50 || +playsS < 80) return;
  const tags = (themes || '').split(' ');
  const solLen = moves.trim().split(/\s+/).length - 1;
  if (solLen < 1 || solLen > 7) return;
  QUOTAS.forEach(([piece, theme], qi) => {
    if (!tags.includes(theme)) return;
    const b = pools.get(qi);
    b.seen++;
    const row = `${piece}|${theme}|${id}|${fen}|${moves}|${rating}`;
    if (b.items.length < 60) b.items.push(row);
    else {
      const j = Math.floor(rand() * b.seen);
      if (j < 60) b.items[j] = row;
    }
  });
});

rl.on('close', () => {
  const seenFen = new Set();
  const result = { pawn: [], knight: [], bishop: [], rook: [], queen: [], king: [] };
  const counters = {};
  const stats = { short: 0, illegal: 0, dup: 0 };
  QUOTAS.forEach(([piece, theme, want], qi) => {
    const items = pools.get(qi).items.slice();
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    let got = 0;
    for (const row of items) {
      if (got >= want) break;
      const [, , id, fen, moves, rating] = row.split('|');
      try {
        const g = new Chess(fen);
        const tokens = moves.trim().split(/\s+/);
        g.move({ from: tokens[0].slice(0, 2), to: tokens[0].slice(2, 4), promotion: tokens[0][4] });
        const puzzleFen = g.fen();
        if (seenFen.has(puzzleFen)) { stats.dup++; continue; }
        const solution = tokens.slice(1);
        const side = puzzleFen.split(' ')[1];
        const sans = [];
        solution.forEach((u, i) => {
          const mover = i % 2 === 0 ? side : side === 'w' ? 'b' : 'w';
          if (g.turn() !== mover) throw new Error('turn');
          sans.push(g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san);
        });
        seenFen.add(puzzleFen);
        const key = `${piece}-${theme}`;
        counters[key] = (counters[key] ?? 0) + 1;
        const n = counters[key] > 1 ? ` ${counters[key]}` : '';
        result[piece].push({
          id: `piece-${id}`,
          title: `${PRETTY[theme] ?? theme}${n}`,
          theme: PRETTY[theme] ?? theme,
          rating: +rating,
          side,
          fen: puzzleFen,
          solution,
          hint: HINTS[theme] ?? 'Find the strongest continuation.',
          explanation: `Played ${sans.join(' ')} — ${BLURBS[theme] ?? 'Thematic, forcing play.'}`,
        });
        got++;
      } catch {
        stats.illegal++;
      }
    }
    if (got < want) { stats.short++; console.log(`SHORT ${piece}/${theme}: ${got}/${want}`); }
  });
  const total = Object.values(result).reduce((s, a) => s + a.length, 0);
  console.log(`total=${total} illegal=${stats.illegal} dup=${stats.dup}`);
  const header = `// Auto-generated piece puzzles from the Lichess DB (CC0). Lines verified legal. Do not hand-edit.\n`;
  fs.writeFileSync(
    new URL('../src/data/puzzlesByPiece.js', import.meta.url),
    header + `export const PIECE_PUZZLES = ${JSON.stringify(result, null, 1)};\n`,
  );
  console.log('wrote src/data/puzzlesByPiece.js');
});

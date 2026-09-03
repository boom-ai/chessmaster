// Tiny pure-JS fallback engine (used if Stockfish worker fails to load).
// Negamax with alpha-beta, material + piece-square eval. Plenty strong for beginners.
import { Chess } from 'chess.js';

const VAL = { p: 100, n: 320, b: 330, r: 500, q: 950, k: 0 };

// Simple piece-square bonuses (from white's perspective, a1 = index 0 in our table layout)
const PST = {
  p: [
    0, 0, 0, 0, 0, 0, 0, 0,
    5, 10, 10, -20, -20, 10, 10, 5,
    5, -5, -10, 0, 0, -10, -5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, 5, 10, 25, 25, 10, 5, 5,
    10, 10, 20, 30, 30, 20, 10, 10,
    50, 50, 50, 50, 50, 50, 50, 50,
    0, 0, 0, 0, 0, 0, 0, 0,
  ],
  n: [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50,
  ],
  b: [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -20, -10, -10, -10, -10, -10, -10, -20,
  ],
  r: [
    0, 0, 0, 5, 5, 0, 0, 0,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    5, 10, 10, 10, 10, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0,
  ],
  q: [
    -20, -10, -10, -5, -5, -10, -10, -20,
    -10, 0, 5, 0, 0, 0, 0, -10,
    -10, 5, 5, 5, 5, 5, 0, -10,
    0, 0, 5, 5, 5, 5, 0, -5,
    -5, 0, 5, 5, 5, 5, 0, -5,
    -10, 0, 5, 5, 5, 5, 0, -10,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -20, -10, -10, -5, -5, -10, -10, -20,
  ],
  k: [
    20, 30, 10, 0, 0, 10, 30, 20,
    20, 20, 0, 0, 0, 0, 20, 20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
  ],
};

function sqIndex(square) {
  const f = square.charCodeAt(0) - 97; // a->0
  const r = square.charCodeAt(1) - 49; // 1->0
  return r * 8 + f;
}

export function evaluateCentipawns(game) {
  const board = game.board(); // 8x8 from rank 8 to rank 1
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (!piece) continue;
      const type = piece.type;
      // our PST tables are laid out a1..h8; board rows go 8..1
      const idx = (7 - r) * 8 + f;
      const v = VAL[type] + (PST[type]?.[idx] ?? 0);
      score += piece.color === 'w' ? v : -v;
    }
  }
  return game.turn() === 'w' ? score : -score; // side-to-move perspective
}

function orderMoves(moves) {
  return moves
    .map((m) => ({
      m,
      s: (m.captured ? VAL[m.captured] * 10 - VAL[m.piece] : 0) + (m.promotion ? 800 : 0) + (m.san.includes('+') ? 50 : 0),
    }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.m);
}

function negamax(game, depth, alpha, beta, ply = 0) {
  if (game.isCheckmate()) return -100000 + ply;
  if (game.isDraw() || game.isStalemate() || game.isThreefoldRepetition() || game.isInsufficientMaterial()) return 0;
  if (depth === 0) return evaluateCentipawns(game);

  let best = -Infinity;
  const moves = orderMoves(game.moves({ verbose: true }));
  for (const m of moves) {
    game.move(m);
    const s = -negamax(game, depth - 1, -beta, -alpha, ply + 1);
    game.undo();
    if (s > best) best = s;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

/** Returns { from, to, promotion, scoreCp } — score in centipawns from side-to-move perspective. */
export function findBestMove(fen, depth = 2) {
  const game = new Chess(fen);
  const moves = orderMoves(game.moves({ verbose: true }));
  if (moves.length === 0) return null;
  let best = null;
  let bestScore = -Infinity;
  let alpha = -Infinity;
  for (const m of moves) {
    game.move(m);
    const s = -negamax(game, depth - 1, -Infinity, -alpha, 1);
    game.undo();
    if (s > bestScore) {
      bestScore = s;
      best = m;
    }
    if (s > alpha) alpha = s;
  }
  return {
    from: best.from,
    to: best.to,
    promotion: best.promotion,
    scoreCp: Math.round(bestScore),
  };
}

/** Random legal move (used to make easy levels human-like). */
export function randomMove(fen) {
  const game = new Chess(fen);
  const moves = game.moves({ verbose: true });
  if (!moves.length) return null;
  const m = moves[Math.floor(Math.random() * moves.length)];
  return { from: m.from, to: m.to, promotion: m.promotion, scoreCp: 0, random: true };
}

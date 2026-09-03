// Curated tactics. solution = full UCI line from the puzzle position.
// Player moves are at even indices; odd indices are auto-played opponent replies.
// All lines are machine-verified (see scripts/verify-puzzles.mjs).

export const PUZZLES = [
  {
    id: 'scholars-mate',
    title: "Scholar's Mate",
    theme: 'Mate in 1',
    rating: 400,
    side: 'w',
    fen: 'r1bqk1nr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
    solution: ['h5f7'],
    hint: 'The f7 pawn is only defended by the king. Aim your queen at it.',
    explanation:
      'Qxf7# is the classic Scholar\'s Mate. The f7 square is the weakest point in Black\'s camp at the start — defended only by the king. Your bishop on c4 guards the queen, so Black has no escape.',
  },
  {
    id: 'fools-mate',
    title: "Fool's Mate",
    theme: 'Mate in 1 • Black to move',
    rating: 300,
    side: 'b',
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2',
    solution: ['d8h4'],
    hint: 'White pushed f- and g-pawns and left the e1–h4 diagonal wide open.',
    explanation:
      'Qh4# is the fastest possible checkmate — Fool\'s Mate. White\'s f3 and g4 pawn pushes fatally weaken the diagonal to their own king, and the e-pawn blocks any escape.',
  },
  {
    id: 'back-rank-basics',
    title: 'Back-Rank Basics',
    theme: 'Mate in 1',
    rating: 500,
    side: 'w',
    fen: '6k1/ppp2ppp/8/8/8/8/PPP2PPP/4R1K1 w - - 0 1',
    solution: ['e1e8'],
    hint: 'Black\'s own pawns trap the king on the back rank. Slide the rook down the open file.',
    explanation:
      'Re8# is a pure back-rank mate. Black\'s king is smothered by its own pawns on f7, g7 and h7, and the rook on e8 seals every flight square on the 8th rank.',
  },
  {
    id: 'down-the-a-file',
    title: 'Down the A-File',
    theme: 'Mate in 1',
    rating: 550,
    side: 'w',
    fen: 'r5k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1',
    solution: ['a1a8'],
    hint: 'The a-file is wide open and Black\'s king is boxed in. Even capturing the rook works.',
    explanation:
      'Rxa8# mates because the new rook on a8 covers the entire 8th rank. Black\'s own pawns on f7, g7 and h7 take away every escape square.',
  },
  {
    id: 'queen-to-corner',
    title: 'Queen to the Corner',
    theme: 'Mate in 1',
    rating: 650,
    side: 'w',
    fen: '6k1/5ppp/8/3Q4/8/8/5PPP/6K1 w - - 0 1',
    solution: ['d5d8'],
    hint: 'Your queen belongs on the back rank. Check which corner square ends it immediately.',
    explanation:
      'Qd8# swoops onto the back rank with check. The queen covers f8, g8 and h8 along the rank while Black\'s own pawns cover every other escape. There is no defender in range to help.',
  },
  {
    id: 'kiss-of-death',
    title: 'Kiss of Death',
    theme: 'Mate in 1',
    rating: 700,
    side: 'w',
    fen: '7k/5ppp/7Q/4B3/8/8/5PPP/6K1 w - - 0 1',
    solution: ['h6g7'],
    hint: 'Move the queen next to the king where your bishop protects it.',
    explanation:
      'Qg7# is the famous "kiss of death": the queen steps right next to the enemy king, protected by the bishop on e5. The king cannot capture, and g8 is covered.',
  },
  {
    id: 'smothered-finale',
    title: 'Smothered Finale',
    theme: 'Mate in 1',
    rating: 800,
    side: 'w',
    fen: '7k/5ppP/6KN/8/8/8/8/8 w - - 0 1',
    solution: ['h6f7'],
    hint: 'The black king is buried alive by its own men. One knight hop ends it.',
    explanation:
      'Nf7# is a smothered mate: the black king on h8 is completely entombed — g8 is watched by your h7 pawn, g7 is its own pawn, and h7 is guarded by your king on g6.',
  },
  {
    id: 'anastasias-gift',
    title: "Anastasia's Gift",
    theme: 'Mate in 2 • Sacrifice',
    rating: 1100,
    side: 'w',
    fen: '5r1k/6pp/7N/8/2Q5/8/5PPP/6K1 w - - 0 1',
    solution: ['c4g8', 'f8g8', 'h6f7'],
    hint: 'Sacrifice the queen on g8! The knight on h6 is ready to spring the trap.',
    explanation:
      '1. Qxg8+! forces 1…Rxg8 (the king cannot capture — the knight guards g8, and its own pawns block every flight), and then 2. Nf7# is a smothered mate. A queen sacrifice to lure the last defender away.',
  },
  {
    id: 'rook-roller',
    title: 'Rook Roller',
    theme: 'Mate in 2 • Deflection',
    rating: 950,
    side: 'w',
    fen: '6k1/1pn2ppp/8/8/Q7/8/5PPP/4R1K1 w - - 0 1',
    solution: ['a4a8', 'c7a8', 'e1e8'],
    hint: 'Draw the knight away from the action first, then let your rook deliver the verdict.',
    explanation:
      '1. Qa8+ forces 1…Nxa8 — the king has no legal move since the queen seals the 8th rank. With the knight dragged to the corner, 2. Re8# mates on the back rank. A deflection: the queen lures Black\'s only defender away.',
  },
  {
    id: 'legal-trap',
    title: 'The Légal Trap',
    theme: 'Mate in 3 • Trap',
    rating: 1300,
    side: 'w',
    // After 1.e4 e5 2.Nf3 Nc6 3.Bc4 d6 4.Nc3 Bg4?! 5.h3 Bh5?
    fen: 'r1bqkbnr/ppp2ppp/2np4/4p2b/2B1P3/2N2N1P/PPPP1PP1/R1BQK2R w KQkq - 0 5',
    solution: ['f3e5', 'h5d1', 'c4f7', 'e8e7', 'c3d5'],
    hint: 'Black\'s bishop is loose and the queen is greedy. Offer the knight, then the queen — Black takes the bait and gets mated.',
    explanation:
      '1. Nxe5! threatens the bishop. After the greedy 1…Bxd1?? comes 2. Bxf7+ Ke7 (forced) 3. Nd5# — a pure Legal mate. Moral: developing with …Bg4?! before castling can be fatal.',
  },
];

export function puzzleRatingColor(rating) {
  if (rating < 600) return '#4ade80';
  if (rating < 1000) return '#facc15';
  if (rating < 1700) return '#fb7185';
  return '#c084fc';
}

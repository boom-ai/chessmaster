// Auto-generated piece puzzles from the Lichess DB (CC0). Lines verified legal. Do not hand-edit.
export const PIECE_PUZZLES = {
 "pawn": [
  {
   "id": "piece-ed7Bl",
   "title": "En Passant",
   "theme": "En Passant",
   "rating": 1694,
   "side": "w",
   "fen": "2rq2r1/1b3pPk/p2p3P/6b1/3nP3/2NB4/1P6/R2K3R w - - 4 28",
   "solution": [
    "e4e5",
    "f7f5",
    "e5f6",
    "b7e4",
    "d3e4",
    "d4f5",
    "e4f5"
   ],
   "hint": "An enemy pawn just jumped two squares beside yours — you can capture it en passant, but only now!",
   "explanation": "Played e5+ f5 exf6+ Be4 Bxe4+ Nf5 Bxf5# — The en passant capture removes the pawn that dared to jump past."
  },
  {
   "id": "piece-ak0DN",
   "title": "Promotion",
   "theme": "Promotion",
   "rating": 1475,
   "side": "w",
   "fen": "8/2p2P1k/p2p2pp/8/2r1qQ2/7P/6PK/8 w - - 0 34",
   "solution": [
    "f4e4",
    "c4e4",
    "f7f8q"
   ],
   "hint": "Push the passer! Calculate whether it queens safely.",
   "explanation": "Played Qxe4 Rxe4 f8=Q — The passer queens — passed pawns must be pushed."
  },
  {
   "id": "piece-qWn8c",
   "title": "Advanced Pawn",
   "theme": "Advanced Pawn",
   "rating": 1851,
   "side": "b",
   "fen": "5r1k/p5b1/1p3r1p/P2B4/2PQ1pq1/6Pb/1P1B1P1P/2R1R1K1 b - - 0 36",
   "solution": [
    "f4g3",
    "d4g4",
    "g3f2"
   ],
   "hint": "Your advanced pawn is gold — push it before Black organizes.",
   "explanation": "Played fxg3 Qxg4 gxf2+ — The advanced pawn decided the game before the ending began."
  },
  {
   "id": "piece-7c7xy",
   "title": "Pawn Endgame",
   "theme": "Pawn Endgame",
   "rating": 981,
   "side": "w",
   "fen": "8/8/4p3/2Pk4/3P1p2/5K2/8/8 w - - 0 64",
   "solution": [
    "f3f4",
    "d5d4",
    "c5c6"
   ],
   "hint": "King activity first: bring the king to the center, then push.",
   "explanation": "Played Kxf4 Kxd4 c6 — Textbook king-and-pawn technique: opposition and outflanking."
  },
  {
   "id": "piece-B8b5m",
   "title": "Pawn Endgame 2",
   "theme": "Pawn Endgame",
   "rating": 1483,
   "side": "w",
   "fen": "8/p3k3/1p1p1p2/2p2P1p/2P4P/5K2/P1P5/8 w - - 1 38",
   "solution": [
    "f3e4",
    "e7d7",
    "e4d5"
   ],
   "hint": "King activity first: bring the king to the center, then push.",
   "explanation": "Played Ke4 Kd7 Kd5 — Textbook king-and-pawn technique: opposition and outflanking."
  }
 ],
 "knight": [
  {
   "id": "piece-1C6eF",
   "title": "Fork",
   "theme": "Fork",
   "rating": 1714,
   "side": "w",
   "fen": "2b1r1k1/p4p2/5qpQ/2pp4/8/P5R1/2B2PP1/6K1 w - - 2 31",
   "solution": [
    "c2g6",
    "f7g6",
    "g3g6",
    "f6g6",
    "h6g6"
   ],
   "hint": "One piece attacks two — find the move that hits both targets at once.",
   "explanation": "Played Bxg6 fxg6 Rxg6+ Qxg6 Qxg6+ — One move, two targets — the fork wins material by force."
  },
  {
   "id": "piece-nmEKk",
   "title": "Fork 2",
   "theme": "Fork",
   "rating": 837,
   "side": "w",
   "fen": "r6r/1pp2k1p/Pb1p4/n3p1p1/P3Pn2/2PP1N1q/5P1N/R2Q1R1K w - - 0 21",
   "solution": [
    "f3g5",
    "f7e7",
    "g5h3"
   ],
   "hint": "One piece attacks two — find the move that hits both targets at once.",
   "explanation": "Played Nxg5+ Ke7 Nxh3 — One move, two targets — the fork wins material by force."
  },
  {
   "id": "piece-BF1aD",
   "title": "Smothered Mate",
   "theme": "Smothered Mate",
   "rating": 1468,
   "side": "b",
   "fen": "r4rk1/pp3ppp/8/2qN4/1QB2Bn1/8/PP2n1PP/R4R1K b - - 2 17",
   "solution": [
    "c5g1",
    "f1g1",
    "g4f2"
   ],
   "hint": "The king is buried by its own men — the knight gives mate.",
   "explanation": "Played Qg1+ Rxg1 Nf2# — A smothered mate: the knight exploits a fully entombed king."
  },
  {
   "id": "piece-5WEZG",
   "title": "Knight Endgame",
   "theme": "Knight Endgame",
   "rating": 1079,
   "side": "w",
   "fen": "8/8/p2nk2p/5p1P/2N2K2/1P6/8/8 w - - 2 42",
   "solution": [
    "c4d6",
    "e6d6",
    "f4f5"
   ],
   "hint": "Centralize the knight and squeeze; knights love outposts.",
   "explanation": "Played Nxd6 Kxd6 Kxf5 — Domination with the minor piece: outpost, zugzwang, conversion."
  },
  {
   "id": "piece-R15yL",
   "title": "Double Check",
   "theme": "Double Check",
   "rating": 1186,
   "side": "b",
   "fen": "r1b2rk1/ppqn1pp1/2p4p/3p4/3P2KB/2NBP3/PPQ1NPP1/R4R2 b - - 0 14",
   "solution": [
    "d7f6",
    "g4f3",
    "c8g4"
   ],
   "hint": "Double check! The king must move — every reply is forced.",
   "explanation": "Played Nf6+ Kf3 Bg4# — Double check forces the king out — mates and wins follow."
  }
 ],
 "bishop": [
  {
   "id": "piece-3gcrc",
   "title": "Pin",
   "theme": "Pin",
   "rating": 1922,
   "side": "w",
   "fen": "r4r1k/pbq3bp/1p1pB1p1/3n4/3BP3/P2P3P/1PP2QP1/4RRK1 w - - 0 21",
   "solution": [
    "f2f8",
    "a8f8",
    "f1f8"
   ],
   "hint": "The pinned piece cannot move away — pile onto it or exploit the pin.",
   "explanation": "Played Qxf8+ Rxf8 Rxf8# — The pin paralyzed the defender while the pressure grew unbearable."
  },
  {
   "id": "piece-n8m25",
   "title": "Pin 2",
   "theme": "Pin",
   "rating": 1477,
   "side": "b",
   "fen": "3r3k/pp4p1/1q1P3p/2p5/8/3Q4/PP4PP/3R2K1 b - - 0 31",
   "solution": [
    "c5c4",
    "d3d4",
    "d8d6",
    "d4b6",
    "d6d1",
    "g1f2",
    "a7b6"
   ],
   "hint": "The pinned piece cannot move away — pile onto it or exploit the pin.",
   "explanation": "Played c4+ Qd4 Rxd6 Qxb6 Rxd1+ Kf2 axb6 — The pin paralyzed the defender while the pressure grew unbearable."
  },
  {
   "id": "piece-g3WhD",
   "title": "Double Bishop Mate",
   "theme": "Double Bishop Mate",
   "rating": 1458,
   "side": "w",
   "fen": "5r1k/ppp4p/3p1pnQ/2PB4/8/1P1p2P1/PB2q2P/6K1 w - - 3 31",
   "solution": [
    "h6f8",
    "g6f8",
    "b2f6"
   ],
   "hint": "Two bishops on adjacent diagonals mate like scissors.",
   "explanation": "Played Qxf8+ Nxf8 Bxf6# — Criss-crossing bishops — the classic double-bishop finish."
  },
  {
   "id": "piece-NnS9J",
   "title": "Bishop Endgame",
   "theme": "Bishop Endgame",
   "rating": 1435,
   "side": "w",
   "fen": "8/8/6P1/1P6/1k6/p7/Kb6/8 w - - 1 46",
   "solution": [
    "b5b6",
    "b2e5",
    "b6b7"
   ],
   "hint": "Put pawns on the opposite color of your bishop, then invade.",
   "explanation": "Played b6 Be5 b7 — Good bishop versus bad bishop (or knight): technique triumphs."
  },
  {
   "id": "piece-TJrT1",
   "title": "Discovered Attack",
   "theme": "Discovered Attack",
   "rating": 1578,
   "side": "b",
   "fen": "r2qk2r/pp3ppp/2bbp3/8/3QP3/8/PP4PP/R1B1KBNR b KQkq - 1 13",
   "solution": [
    "d6g3",
    "h2g3",
    "d8d4"
   ],
   "hint": "Move one piece to unleash another — the double threat wins.",
   "explanation": "Played Bg3+ hxg3 Qxd4 — The moving piece uncovered a second attacker — two threats, one move."
  }
 ],
 "rook": [
  {
   "id": "piece-2ic61",
   "title": "Back Rank Mate",
   "theme": "Back Rank Mate",
   "rating": 644,
   "side": "b",
   "fen": "4r3/2p5/2Qp1k1p/3P4/4q3/2P5/PP6/K5R1 b - - 1 40",
   "solution": [
    "e4e1",
    "g1e1",
    "e8e1"
   ],
   "hint": "His own pawns trap the king — seal the back rank.",
   "explanation": "Played Qe1+ Rxe1 Rxe1# — Sealed on the back rank by his own pawns."
  },
  {
   "id": "piece-A1aEp",
   "title": "Back Rank Mate 2",
   "theme": "Back Rank Mate",
   "rating": 1275,
   "side": "b",
   "fen": "4r1k1/4rppp/pp6/3P4/2PQ4/q7/P4PPP/R1R3K1 b - - 2 26",
   "solution": [
    "a3c1",
    "a1c1",
    "e7e1",
    "c1e1",
    "e8e1"
   ],
   "hint": "His own pawns trap the king — seal the back rank.",
   "explanation": "Played Qxc1+ Rxc1 Re1+ Rxe1 Rxe1# — Sealed on the back rank by his own pawns."
  },
  {
   "id": "piece-HHhAB",
   "title": "Rook Endgame",
   "theme": "Rook Endgame",
   "rating": 1630,
   "side": "w",
   "fen": "4k3/p3r1R1/1p6/2p5/8/P2K4/1PP5/8 w - - 0 37",
   "solution": [
    "g7e7",
    "e8e7",
    "d3c4",
    "e7d7",
    "c4b5"
   ],
   "hint": "Activate the rook first; passive rooks lose endings.",
   "explanation": "Played Rxe7+ Kxe7 Kc4 Kd7 Kb5 — Active rook, active king: the whole endgame formula."
  },
  {
   "id": "piece-JDpuV",
   "title": "Queen + Rook Endgame",
   "theme": "Queen + Rook Endgame",
   "rating": 854,
   "side": "w",
   "fen": "8/p1R5/1p6/k2pp3/P5K1/2P5/5q2/8 w - - 1 39",
   "solution": [
    "c7a7"
   ],
   "hint": "Coordinate queen and rook on the 7th rank.",
   "explanation": "Played Rxa7# — Queen and rook doubled on the 7th — resignable."
  },
  {
   "id": "piece-JUHpa",
   "title": "Clearance",
   "theme": "Clearance",
   "rating": 1589,
   "side": "b",
   "fen": "2kr1r2/p2n1p1Q/b1pPp1p1/5q2/1p1PN3/1B2nP1N/PPPR2PP/2K4R b - - 2 18",
   "solution": [
    "f8h8",
    "h7g7",
    "d8g8",
    "g7g8",
    "h8g8"
   ],
   "hint": "Sacrifice to clear a square or line for the real threat.",
   "explanation": "Played Rh8 Qg7 Rdg8 Qxg8+ Rxg8 — The sacrifice cleared the square the real attacker needed."
  }
 ],
 "queen": [
  {
   "id": "piece-8W8HU",
   "title": "Queen Endgame",
   "theme": "Queen Endgame",
   "rating": 1161,
   "side": "w",
   "fen": "8/p6p/6p1/5p1k/8/6P1/q4P1P/5QK1 w - - 0 41",
   "solution": [
    "f1h3",
    "h5g5",
    "h3h4"
   ],
   "hint": "Centralize the queen and push the passed pawn.",
   "explanation": "Played Qh3+ Kg5 Qh4# — Queen activity plus a runner decided it."
  },
  {
   "id": "piece-aunG0",
   "title": "Queen Endgame 2",
   "theme": "Queen Endgame",
   "rating": 1774,
   "side": "w",
   "fen": "7k/p5p1/2p1p1P1/3p4/3P4/4PQ1p/P2q1K1P/8 w - - 5 31",
   "solution": [
    "f2g3",
    "d2g2",
    "f3g2",
    "h3g2",
    "g3g2"
   ],
   "hint": "Centralize the queen and push the passed pawn.",
   "explanation": "Played Kg3 Qg2+ Qxg2 hxg2 Kxg2 — Queen activity plus a runner decided it."
  },
  {
   "id": "piece-OCWD6",
   "title": "Kingside Attack",
   "theme": "Kingside Attack",
   "rating": 2098,
   "side": "w",
   "fen": "3r2k1/1pb1r1p1/p1p1p1bp/P7/1PB2B2/2P4P/6P1/4RR1K w - - 0 24",
   "solution": [
    "e1e6",
    "e7e6",
    "c4e6",
    "g8h7",
    "f4c7"
   ],
   "hint": "Open lines toward the king — sacrifices are usually sound.",
   "explanation": "Played Rxe6 Rxe6 Bxe6+ Kh7 Bxc7 — The shelter cracked open and the attack played itself."
  },
  {
   "id": "piece-EA2ik",
   "title": "Sacrifice",
   "theme": "Sacrifice",
   "rating": 1895,
   "side": "b",
   "fen": "3B4/1KPk4/8/7r/4p3/3P2P1/5P2/8 b - - 1 45",
   "solution": [
    "h5b5",
    "b7a6",
    "e4d3",
    "a6b5",
    "d3d2"
   ],
   "hint": "Give material to destroy the king’s shelter — calculate the follow-up.",
   "explanation": "Played Rb5+ Ka6 exd3 Kxb5 d2 — Sound aggression: the shelter was worth more than the piece."
  },
  {
   "id": "piece-zSudg",
   "title": "Attraction",
   "theme": "Attraction",
   "rating": 1827,
   "side": "b",
   "fen": "2k5/ppp5/1qp1RN2/5n1p/8/3P3r/PPP2PK1/R2Q4 b - - 3 24",
   "solution": [
    "h3h2",
    "g2h2",
    "b6f2",
    "h2h3",
    "f2g3"
   ],
   "hint": "Lure a defender away, then strike what it guarded.",
   "explanation": "Played Rh2+ Kxh2 Qxf2+ Kh3 Qg3# — Lured away from its post, the defender watched everything collapse."
  }
 ],
 "king": [
  {
   "id": "piece-Lynky",
   "title": "Castling",
   "theme": "Castling",
   "rating": 2063,
   "side": "w",
   "fen": "3rkr2/pp4pp/2p5/6Q1/3Bp3/2P3P1/P1P2Pqn/R3KR2 w Q - 0 24",
   "solution": [
    "g5e5",
    "e8d7",
    "e1c1"
   ],
   "hint": "Get the king safe and connect the rooks — castle now.",
   "explanation": "Played Qe5+ Kd7 O-O-O — Safety first, speed second — castling connected everything."
  },
  {
   "id": "piece-kjnFE",
   "title": "Pawn Endgame",
   "theme": "Pawn Endgame",
   "rating": 1304,
   "side": "w",
   "fen": "8/8/2p1kp2/pp4p1/P1KP2P1/8/2P3P1/8 w - - 0 40",
   "solution": [
    "a4b5",
    "c6b5",
    "c4b5"
   ],
   "hint": "King activity first: bring the king to the center, then push.",
   "explanation": "Played axb5 cxb5+ Kxb5 — Textbook king-and-pawn technique: opposition and outflanking."
  },
  {
   "id": "piece-rIRwM",
   "title": "Pawn Endgame 2",
   "theme": "Pawn Endgame",
   "rating": 1944,
   "side": "w",
   "fen": "8/8/8/2P5/5kp1/3K4/8/8 w - - 0 54",
   "solution": [
    "c5c6",
    "g4g3",
    "d3e2",
    "g3g2",
    "e2f2",
    "g2g1r",
    "f2g1"
   ],
   "hint": "King activity first: bring the king to the center, then push.",
   "explanation": "Played c6 g3 Ke2 g2 Kf2 g1=R Kxg1 — Textbook king-and-pawn technique: opposition and outflanking."
  },
  {
   "id": "piece-Pvqcf",
   "title": "Zugzwang",
   "theme": "Zugzwang",
   "rating": 1263,
   "side": "w",
   "fen": "8/8/7p/1p2k1p1/p2pP2P/P2K2P1/1P6/8 w - - 0 35",
   "solution": [
    "h4g5",
    "h6g5",
    "g3g4",
    "e5e6",
    "d3d4"
   ],
   "hint": "No good moves exist for him — pass the turn with a waiting move.",
   "explanation": "Played hxg5 hxg5 g4 Ke6 Kxd4 — With no useful move available, any move loses — pure zugzwang."
  },
  {
   "id": "piece-MLSKE",
   "title": "Queen Endgame",
   "theme": "Queen Endgame",
   "rating": 1670,
   "side": "b",
   "fen": "8/5k2/7p/4QP2/8/2p4P/3q2PK/8 b - - 0 45",
   "solution": [
    "c3c2",
    "e5e6",
    "f7f8"
   ],
   "hint": "Centralize the queen and push the passed pawn.",
   "explanation": "Played c2 Qe6+ Kf8 — Queen activity plus a runner decided it."
  }
 ]
};

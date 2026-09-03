# ♞ ChessMaster — Play, Solve & Learn Chess

A complete chess training app built with React + Vite: play against Stockfish,
solve hand-picked tactics, study 12 opening repertoires with a coach, and replay
100 famous games with every move explained.

![Vite](https://img.shields.io/badge/vite-8-blue) ![React](https://img.shields.io/badge/react-19-blue)
![Stockfish](https://img.shields.io/badge/engine-Stockfish_10-green)

## Features

- **♞ Play vs Engine** — real Stockfish 10 running as a WASM web worker, fully
  offline in the browser (with a built-in fallback engine). 5 levels from
  Beginner (~600) to Master (2200+), live eval bar, hints, undo, flip board,
  PGN-style move list.
- **⏱ Time controls** — chess.com-style game screen with player bars and live
  clocks: Casual plus Bullet (1+0, 2+1), Blitz (3+0, 3+2, 5+0, 5+3) and Rapid
  (10+0, 10+5, 15+10, 30+0), with increments and flag detection.
- **🔍 Game review & ⛶ fullscreen** — step through any finished game move by
  move, or go board-first fullscreen (moves panel included on portrait screens).
- **🧩 Puzzles** — 10 curated mates & tactics (Scholar's Mate → Légal Trap),
  with hints, streak tracking, puzzle rating and coach explanations.
- **🎓 Openings Coach** — 12 repertoires (Italian, Ruy López, Sicilian Najdorf,
  French, London, Queen's Gambit, Scotch, Vienna, Caro-Kann, King's Indian,
  Nimzo-Indian, Dutch), each with a coached main line, colored board arrows,
  3–6 full variations and a practice mode that quizzes your moves.
- **🏛 Famous Games** — 100 classics from Anderssen (1851) to Carlsen–Nepo
  (2021), every one of 8,542 plies annotated with the reasoning behind each
  move. Searchable, era-filtered, with Watch mode and studied-tracking.
- **📚 Guide** — notation & symbols reference plus an interactive piece school:
  drag each piece to learn its moves, with if-scenario tips.

## Run it

```bash
npm install
npm run dev      # → http://localhost:5173
npm run build    # production build in dist/
npm run verify   # machine-checks every puzzle, opening line and game score
```

## Tech

- [chess.js](https://github.com/jhlywa/chess.js) — rules & move validation
- [react-chessboard](https://github.com/Clariity/react-chessboard) — board UI
- [stockfish.js](https://github.com/niklasf/stockfish.js) — WASM engine
  (served from `public/engine/`)

## Data integrity

All content is machine-verified — `npm run verify` replays every puzzle
solution (must end in checkmate), every opening/variation line (must be legal)
and all 100 famous-game scores (must be legal) via chess.js.

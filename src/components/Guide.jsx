import { useState } from 'react';
import { Chess } from 'chess.js';
import Board from './Board.jsx';

const PIECES = [
  {
    id: 'pawn',
    glyph: '♙',
    name: 'Pawn',
    value: '1 point',
    piece: 'p',
    fen: '7k/8/8/8/8/3p1p2/4P3/K7 w - - 0 1',
    how: 'Marches straight forward one square (two from its starting rank) but captures one square diagonally. Try it: push to e3/e4, or take on d3 or f3.',
    scenarios: [
      'If an enemy pawn jumps two squares to land beside yours, you may capture it en passant — but only on the very next move.',
      'If a pawn reaches the far rank, promote it — a queen 9 times out of 10. Two queens usually beat one.',
      'If your pawn can no longer be stopped by the enemy king, it is “passed” — push it, and trade everything else.',
      'If pawns get locked head-to-head, the side that breaks with a pawn lever (like …c5 or f4) usually takes over.',
    ],
  },
  {
    id: 'knight',
    glyph: '♘',
    name: 'Knight',
    value: '3 points',
    piece: 'n',
    fen: '7k/8/2p1p3/8/3N4/1p3P2/8/K7 w - - 0 1',
    how: 'Jumps in an L: two squares one way, one square sideways. The only piece that leaps over others. Drag it — try the captures on c6, e6 and b3 (f3 holds your own pawn).',
    scenarios: [
      'If your knight sits where no enemy pawn can chase it, it is an “outpost” — often worth a rook.',
      'If you see Nf7+ against a castled king, look for a royal fork of queen and rook.',
      'If the enemy king is smothered by its own pieces, a knight check can be instant mate.',
      'If knights face bishops in a closed position, keep the knights; trade them off in wide-open ones.',
    ],
  },
  {
    id: 'bishop',
    glyph: '♗',
    name: 'Bishop',
    value: '3 points',
    piece: 'b',
    fen: '7k/5p2/8/1P6/2B5/8/8/K7 w - - 0 1',
    how: 'Glides along diagonals, any distance, but never changes square color. Try sliding to d5 and e6, capturing on f7 — or retreat to b3, a2, d3, e2, f1 (b5 holds your own pawn, so that way is shut).',
    scenarios: [
      'If your bishop is locked behind its own pawns (“bad bishop”), trade it for a knight or reroute it with a pawn break.',
      'If you fianchetto (pawns g3 + bishop g2), the bishop snipes the center from the flank — but watch the dark squares around your king.',
      'If both sides keep opposite-colored bishops in an endgame, draws are far more likely — avoid them when winning.',
      'If the two bishops aim at the enemy king (like Bc2 + Bg5 vs h7), sacrifices on h7/f7 are always in the air.',
    ],
  },
  {
    id: 'rook',
    glyph: '♖',
    name: 'Rook',
    value: '5 points',
    piece: 'r',
    fen: '7k/p7/8/8/R3p3/8/8/K7 w - - 0 1',
    how: 'Travels straight along ranks and files. Climb the a-file to take on a7, or sweep the 4th rank and capture on e4.',
    scenarios: [
      'If a file has no pawns (“open file”), put a rook on it — rooks starve without open lines.',
      'If your rook reaches the 7th rank, enemy pawns start falling: Rxf7-style chaos follows.',
      'If you double rooks (one behind the other), penetration is usually decisive.',
      'If you own a passed pawn, park the rook BEHIND it — it pushes itself while the rook guards.',
    ],
  },
  {
    id: 'queen',
    glyph: '♕',
    name: 'Queen',
    value: '9 points',
    piece: 'q',
    fen: '7k/8/3p1p2/8/1P1Q4/8/8/K7 w - - 0 1',
    how: 'Moves like rook + bishop combined — the strongest piece. Explore: take on d6 or f6, slide anywhere open (b4 holds your own pawn).',
    scenarios: [
      'If you bring the queen out too early, enemy pieces gain free moves chasing it — develop knights and bishops first.',
      'If you are a queen up, trade queens and win the endgame: fewer pieces, fewer surprises.',
      'If the enemy queen enters your camp (…Qh4+, …Qf2 ideas), check every mate threat before grabbing material.',
      'If queen + knight coordinate near the king (Qh5, Nf6+, Qg5+ patterns), mates appear almost by themselves.',
    ],
  },
  {
    id: 'king',
    glyph: '♔',
    name: 'King',
    value: 'Priceless',
    piece: 'k',
    fen: '7k/8/8/4p3/4KP2/8/8/8 w - - 0 1',
    how: 'Steps one square in any direction. Try taking on e5 (your f4 pawn blocks that way). In endgames the king becomes a fighting piece — march it to the center.',
    scenarios: [
      'If you have not castled by move 10, you are probably behind — castle early, connect rooks, then attack.',
      'If you are in check, you must: move the king, capture the checker, or block the check (blocking fails against knights).',
      'If kings face off with one square between (“opposition”), the side NOT to move usually wins the pawn race.',
      'If you are losing, stalemate tricks (giving away your last moves) can steal half a point — always check them when defending.',
    ],
  },
];

const SYMBOLS = [
  ['x', 'Capture — Bxe5 takes on e5'],
  ['+', 'Check — Qh5+ attacks the king'],
  ['#', 'Checkmate — Qxf7# ends the game'],
  ['O-O', 'Kingside castle'],
  ['O-O-O', 'Queenside castle'],
  ['=Q', 'Promotion — e8=Q becomes a queen'],
  ['e.p.', 'En passant (write the capture, e.g. exd6)'],
  ['!', 'Brilliant move'],
  ['!!', 'Exceptional / only move'],
  ['?', 'Mistake'],
  ['??', 'Blunder'],
  ['!?', 'Interesting, worth a look'],
  ['?!', 'Dubious'],
  ['1-0 / 0-1 / ½-½', 'White wins / Black wins / draw'],
];

export default function Guide() {
  const [section, setSection] = useState('notation');
  const [pieceId, setPieceId] = useState('pawn');
  const demo = PIECES.find((p) => p.id === pieceId);
  const [demoFen, setDemoFen] = useState(demo.fen);
  const [demoMoves, setDemoMoves] = useState(0);

  const pickPiece = (id) => {
    const d = PIECES.find((p) => p.id === id);
    setPieceId(id);
    setDemoFen(d.fen);
    setDemoMoves(0);
  };

  const forceWhite = (fen) => fen.replace(/ ([wb]) /, ' w ');

  const tryDemoMove = (from, to) => {
    try {
      const test = new Chess(forceWhite(demoFen));
      const m = test.move({ from, to, promotion: 'q' });
      if (!m) return false;
      setDemoFen(test.fen());
      setDemoMoves((n) => n + 1);
      return true;
    } catch {
      return false;
    }
  };

  const legalFrom = (sq) => {
    try {
      return new Chess(forceWhite(demoFen)).moves({ square: sq, verbose: true }).map((m) => m.to);
    } catch {
      return [];
    }
  };

  return (
    <div className="play-layout">
      <div className="board-col">
        <div className="btn-row wrap" style={{ marginTop: 0 }}>
          <button className={`btn ${section === 'notation' ? 'primary' : ''}`} onClick={() => setSection('notation')}>📝 Notation guide</button>
          <button className={`btn ${section === 'pieces' ? 'primary' : ''}`} onClick={() => setSection('pieces')}>♟ Piece school</button>
        </div>

        {section === 'pieces' && (
          <>
            <div className="piece-picker">
              {PIECES.map((p) => (
                <button key={p.id} className={`piece-btn ${p.id === pieceId ? 'active' : ''}`} onClick={() => pickPiece(p.id)}>
                  <span className="piece-glyph">{p.glyph}</span>
                  <span className="small">{p.name}</span>
                </button>
              ))}
            </div>
            <Board
              fen={demoFen}
              orientation="white"
              canDragPiece={({ piece, square }) => {
                if (!piece) return false;
                try {
                  const g = new Chess(forceWhite(demoFen));
                  const cur = g.get(square);
                  return !!cur && cur.color === 'w' && cur.type === demo.piece;
                } catch {
                  return false;
                }
              }}
              onMove={tryDemoMove}
              getLegalTargets={legalFrom}
            />
            <div className="status-line">
              <strong>Drag the {demo.name.toLowerCase()} — dots show where it can go.</strong>
              <span className="muted">Moves tried: {demoMoves}</span>
            </div>
            <div className="btn-row">
              <button className="btn" onClick={() => { setDemoFen(demo.fen); setDemoMoves(0); }}>↺ Reset demo</button>
            </div>
          </>
        )}

        {section === 'notation' && (
          <div className="card">
            <h3>📝 Reading a chessboard</h3>
            <p className="coach-text">
              Files run <strong>a–h</strong> (left to right from White’s side), ranks run <strong>1–8</strong> (White to Black).
              Every square has a name like <strong>e4</strong>. Remember: a light square sits on h1 — “white on right.”
            </p>
            <h4>♞ Piece letters</h4>
            <p className="coach-text">K king · Q queen · R rook · B bishop · <strong>N knight</strong> (K is taken!) · pawns get no letter.</p>
            <h4>✍️ Writing moves</h4>
            <p className="coach-text">
              Piece + square: <strong>Nf3</strong>. Pawns just name the square: <strong>e4</strong>.
              Number White’s move and Black’s reply together: <strong>1. e4 e5</strong>.
              If two identical pieces could move there, add the file or rank: <strong>Nbd7</strong>, <strong>R1e2</strong>.
            </p>
            <h4>⚡ Symbols table</h4>
            <div className="moves symbols">
              {SYMBOLS.map(([s, d]) => (
                <div key={s} className="move-row">
                  <span className="move-n"><strong>{s}</strong></span>
                  <span style={{ gridColumn: 'span 2' }}>{d}</span>
                </div>
              ))}
            </div>
            <h4>📊 Reading this app</h4>
            <p className="coach-text">
              <span className="sw green" /> your move · <span className="sw red" /> opponent/last move ·
              <span className="sw yellow" /> key square · <span className="sw" style={{ background: '#3b82f6' }} /> hint.
              Eval <strong>+1.5</strong> means White is up ~1½ pawns; <strong>#3</strong> means mate in 3.
            </p>
          </div>
        )}
      </div>

      <div className="side-col">
        {section === 'pieces' ? (
          <div className="card coach">
            <h2>{demo.glyph} {demo.name} <span className="muted small">· {demo.value}</span></h2>
            <p className="coach-text">{demo.how}</p>
            <h4>🧠 If-scenarios to remember</h4>
            <ul className="ideas">
              {demo.scenarios.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        ) : (
          <div className="card coach">
            <h3>💡 How to use this guide</h3>
            <p className="coach-text">
              Every move in Openings Coach, Famous Games and Puzzles is written in this notation.
              Learn to read it here once, and all 8,500+ annotated moves in the app become lessons.
            </p>
            <div className="btn-row">
              <button className="btn primary" onClick={() => setSection('pieces')}>Next: piece school →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

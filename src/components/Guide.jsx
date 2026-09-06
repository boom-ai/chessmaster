import { useRef, useState } from 'react';
import { Chess } from 'chess.js';
import Board from './Board.jsx';
import { Button, SectionHeader, Progress, CoachCallout, Chip, SearchField, Accordion } from '../v2/ui/Kit.jsx';
import { LessonPage, UpNextDrawer, CelebrateSummary } from '../v2/lesson/LessonPage.jsx';
import { PIECE_PUZZLES } from '../data/puzzlesByPiece.js';

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
    fen: '7k/5p2/8/1P1p4/2B5/8/p7/K7 w - - 0 1',
    how: 'Glides along diagonals, any distance, but never changes square color. Start by taking on d5, then continue to f7 — or grab a2 (b5 holds your own pawn, so that way is shut).',
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
    fen: '7k/p7/8/8/R3p2p/8/8/K7 w - - 0 1',
    how: 'Travels straight along ranks and files. Climb the a-file to take on a7, sweep the 4th rank to capture on e4 — then h4 opens up.',
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
    how: 'Moves like rook + bishop combined — the strongest piece. Explore: take on d6 or f6, or swing across to grab g4 (b4 holds your own pawn).',
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
    fen: '7k/8/8/4p3/3pKP2/5p2/8/8 w - - 0 1',
    how: 'Steps one square in any direction. Gobble e5 or f3 — but d4 is defended by the e5 pawn, and f4 holds your own pawn. In endgames march the king to the center.',
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
  const [challenge, setChallenge] = useState(false);
  const [ppuzzle, setPpuzzle] = useState(null);
  const [pply, setPply] = useState(0);
  const [pmsg, setPmsg] = useState('');
  const busyRef = useRef(false);
  const fenRef = useRef(demo.fen);
  const setFenBoth = (f) => {
    fenRef.current = f;
    setDemoFen(f);
  };

  const pickPiece = (id) => {
    const d = PIECES.find((p) => p.id === id);
    setPieceId(id);
    setFenBoth(d.fen);
    setDemoMoves(0);
    setPpuzzle(null);
    setPply(0);
    setPmsg('');
    busyRef.current = false;
  };

  const startPuzzle = (p) => {
    busyRef.current = false;
    setChallenge(false);
    setPpuzzle(p);
    setPply(0);
    setPmsg('');
    setDemoMoves(0);
    setFenBoth(p.fen);
  };

  const exitPuzzle = () => {
    setPpuzzle(null);
    setPply(0);
    setPmsg('');
    busyRef.current = false;
    setFenBoth(demo.fen);
    setDemoMoves(0);
  };

  const tryPuzzleMove = (from, to) => {
    const p = ppuzzle;
    if (!p || busyRef.current) return false;
    const expected = p.solution[pply];
    if (!expected) return false;
    if ((from + to).toLowerCase() !== expected.slice(0, 4).toLowerCase()) {
      setPmsg('Not quite — try again.');
      return false;
    }
    try {
      const test = new Chess(demoFen);
      test.move({ from, to, promotion: 'q' });
      setFenBoth(test.fen());
      setDemoMoves((n) => n + 1);
    } catch {
      return false;
    }
    const np = pply + 1;
    setPply(np);
    if (np >= p.solution.length) {
      setPmsg(`🎉 Solved! ${p.explanation}`);
      return true;
    }
    busyRef.current = true;
    setPmsg('Good move! Opponent replies…');
    const reply = p.solution[np];
    setTimeout(() => {
      try {
        const g2 = new Chess(fenRef.current);
        g2.move({ from: reply.slice(0, 2), to: reply.slice(2, 4), promotion: 'q' });
        setFenBoth(g2.fen());
      } catch {
        /* verified lines never fail */
      }
      setPply(np + 1);
      busyRef.current = false;
      if (np + 1 >= p.solution.length) setPmsg(`🎉 Solved! ${p.explanation}`);
      else setPmsg('Your move — finish it!');
    }, 650);
    return true;
  };

  const countTargets = (fen) => {
    try {
      return new Chess(fen).board().flat().filter((p) => p && p.color === 'b' && p.type !== 'k').length;
    } catch {
      return 0;
    }
  };
  const totalTargets = countTargets(demo.fen);
  const remaining = countTargets(demoFen);
  const hasDemoPiece = (() => {
    try {
      return new Chess(demoFen).board().flat().some((p) => p && p.color === 'w' && p.type === demo.piece);
    } catch {
      return false;
    }
  })();
  const challengeWon = challenge && remaining === 0;

  const nextPiece = () => {
    const i = PIECES.findIndex((p) => p.id === pieceId);
    pickPiece(PIECES[(i + 1) % PIECES.length].id);
  };

  const showPieces = () => setSection('pieces');
  const showNotation = () => setSection('notation');

  const forceWhite = (fen) => fen.replace(/ ([wb]) /, ' w ');

  const tryDemoMove = (from, to) => {
    try {
      const test = new Chess(forceWhite(demoFen));
      const cur = test.get(from);
      // Only the featured piece may move — kings and pawns stay put.
      if (!cur || cur.color !== 'w' || cur.type !== demo.piece) return false;
      const m = test.move({ from, to, promotion: 'q' });
      if (!m) return false;
      setFenBoth(test.fen());
      setDemoMoves((n) => n + 1);
      return true;
    } catch {
      return false;
    }
  };

  const legalFrom = (sq) => {
    if (ppuzzle) {
      try {
        return new Chess(demoFen).moves({ square: sq, verbose: true }).map((m) => m.to);
      } catch {
        return [];
      }
    }
    try {
      return new Chess(forceWhite(demoFen)).moves({ square: sq, verbose: true }).map((m) => m.to);
    } catch {
      return [];
    }
  };

  const canDragDemo = ({ piece, square }) => {
    if (!piece) return false;
    if (ppuzzle) {
      try {
        const cur = new Chess(demoFen).get(square);
        return !!cur && cur.color === ppuzzle.side;
      } catch {
        return false;
      }
    }
    try {
      const g = new Chess(forceWhite(demoFen));
      const cur = g.get(square);
      return !!cur && cur.color === 'w' && cur.type === demo.piece;
    } catch {
      return false;
    }
  };

  const [drawerOpen, setDrawerOpen] = useState(false);

  const statusText = section === 'pieces'
    ? (ppuzzle
      ? `${ppuzzle.title} ★${ppuzzle.rating} — ${pmsg || 'Find the move!'}`
      : challenge
        ? (challengeWon
          ? `Challenge complete — all ${totalTargets} captured!`
          : !hasDemoPiece
            ? 'Promoted! That ends the run — reset to retry the challenge.'
            : `Capture all black pieces with the ${demo.name.toLowerCase()}: ${remaining} left!`)
        : `Drag the ${demo.name.toLowerCase()} — dots show where it can go.`)
    : 'Files a–h, ranks 1–8. Every square has a name like e4.';

  return (
    <LessonPage
      progress={
        <>
          <SectionHeader title="Guide" sub="Pieces, rules and notation — look anything up." action={section === 'pieces' ? 'Piece school' : 'Notation'} />
          <Progress value={section === 'pieces' ? 1 : 0} max={2} label={section === 'pieces' ? 'Step 2 of 2' : 'Step 1 of 2'} />
        </>
      }
      coach={
        <>
          {section === 'pieces' && challenge && challengeWon && (
            <CelebrateSummary stars={3} xp={10} perfect onNext={nextPiece} onRetry={() => { setFenBoth(demo.fen); setDemoMoves(0); }} />
          )}
          <CoachCallout text={section === 'pieces' ? demo.how : 'Learn to read moves once, and all 8,500+ annotated moves in the app become lessons.'} avatar={section === 'pieces' ? demo.glyph : '📝'} />
          <Accordion
            items={
              section === 'pieces'
                ? [
                  { title: '🧠 If-scenarios to remember', content: (<ul className="v2-ideas">{demo.scenarios.map((s, i) => <li key={i}>{s}</li>)}</ul>) },
                  ...(ppuzzle ? [{ title: '💭 Hint', content: <p>{ppuzzle.hint}</p> }] : []),
                ]
                : [
                  { title: '♞ Piece letters', content: <p>K king · Q queen · R rook · B bishop · <strong>N knight</strong> (K is taken!) · pawns get no letter.</p> },
                  { title: '✍️ Writing moves', content: <p>Piece + square: <strong>Nf3</strong>. Pawns just name the square: <strong>e4</strong>. Number White’s move and Black’s reply together: <strong>1. e4 e5</strong>.</p> },
                  { title: '⚡ Symbols', content: (<ul className="v2-ideas">{SYMBOLS.map(([s, d]) => <li key={s}><strong>{s}</strong> — {d}</li>)}</ul>) },
                  { title: '📊 Reading this app', content: <p>Green is your move, red the opponent, yellow a key square, blue a hint. +1.5 means White is up ~1½ pawns; #3 means mate in 3.</p> },
                ]
            }
          />
        </>
      }
      board={
        section === 'pieces' ? (
          <Board
            fen={demoFen}
            orientation="white"
            canDragPiece={canDragDemo}
            onMove={ppuzzle ? tryPuzzleMove : tryDemoMove}
            getLegalTargets={legalFrom}
          />
        ) : (
          <Board
            fen={new Chess().fen()}
            orientation="white"
            getLegalTargets={() => []}
          />
        )
      }
      hint={section === 'pieces' ? `Moves tried: ${demoMoves}` : null}
      controls={
        <>
          <div className="v2-controlsrow">
            <Chip label="📝 Notation guide" active={section === 'notation'} onClick={() => setSection('notation')} />
            <Chip label="♟ Piece school" active={section === 'pieces'} onClick={() => setSection('pieces')} />
          </div>
          {section === 'pieces' && (
            <>
              <div className="v2-controlsrow">
                {PIECES.map((p) => (
                  <Chip key={p.id} label={`${p.glyph} ${p.name}`} active={p.id === pieceId} onClick={() => pickPiece(p.id)} />
                ))}
              </div>
              <div className="v2-controlsrow">
                <Button
                  level="tonal"
                  label={`↺ ${ppuzzle ? 'Restart puzzle' : 'Reset demo'}`}
                  onClick={() => {
                    if (ppuzzle) { setPply(0); setPmsg(''); setFenBoth(ppuzzle.fen); }
                    else { setFenBoth(demo.fen); }
                    setDemoMoves(0);
                  }}
                />
                {!ppuzzle && (
                  <Button level={challenge ? 'text' : 'filled'} label={challenge ? '✕ Exit challenge' : `🎯 Challenge (${totalTargets} targets)`} onClick={() => setChallenge((c) => !c)} />
                )}
                {ppuzzle && (
                  <Button level="text" label="✕ Exit puzzle (free play)" onClick={exitPuzzle} />
                )}
                <Button level="text" label="☰ Puzzles" onClick={() => setDrawerOpen(true)} />
              </div>
              <p className="v2-stepcount"><strong>{statusText}</strong></p>
            </>
          )}
        </>
      }
      list={
        section === 'pieces' ? (
          <>
            <SectionHeader title={`${demo.name} puzzles`} sub="Real Lichess puzzles starring this piece. Play them!" action={`${PIECE_PUZZLES[demo.id].length} puzzles`} />
            <UpNextDrawer
              open={drawerOpen}
              items={PIECE_PUZZLES[demo.id].map((p) => ({ id: p.id, title: `${p.title} ★${p.rating}`, done: false }))}
              onSelect={(id) => { startPuzzle(PIECE_PUZZLES[demo.id].find((x) => x.id === id)); setDrawerOpen(false); }}
              onClose={() => setDrawerOpen(false)}
            />
          </>
        ) : (
          <SectionHeader title="How to use this guide" sub="Every move in Openings Coach, Famous Games and Puzzles is written in this notation." action="Read once" />
        )
      }
    />
  );
}

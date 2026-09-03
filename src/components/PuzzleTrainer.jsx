import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import Board from './Board.jsx';
import { PUZZLES, puzzleRatingColor } from '../data/puzzles.js';

function loadStats() {
  try {
    return JSON.parse(localStorage.getItem('chessmaster-puzzles') ?? '{}');
  } catch {
    return {};
  }
}

export default function PuzzleTrainer() {
  const [index, setIndex] = useState(0);
  const [fen, setFen] = useState(PUZZLES[0].fen);
  const [ply, setPly] = useState(0); // next solution index to match
  const [mistakes, setMistakes] = useState(0);
  const [solved, setSolved] = useState(false);
  const [message, setMessage] = useState('');
  const [hintArrow, setHintArrow] = useState([]);
  const [failedFlash, setFailedFlash] = useState([]);
  const [stats, setStats] = useState(loadStats);
  const [history, setHistory] = useState([]);
  const busy = useRef(false);
  const gameRef = useRef(new Chess(PUZZLES[0].fen));

  const puzzle = PUZZLES[index];
  const solvedCount = useMemo(() => PUZZLES.filter((p) => stats[p.id]?.solved).length, [stats]);
  const rating = useMemo(() => {
    let r = 800;
    for (const p of PUZZLES) {
      const s = stats[p.id];
      if (s?.solved) r += 12;
      if (s?.failed) r -= 6;
    }
    return Math.max(200, r);
  }, [stats]);

  const loadPuzzle = (i) => {
    const p = PUZZLES[(i + PUZZLES.length) % PUZZLES.length];
    gameRef.current = new Chess(p.fen);
    busy.current = false;
    setIndex(PUZZLES.indexOf(p));
    setFen(p.fen);
    setPly(0);
    setMistakes(0);
    setSolved(false);
    setMessage(p.side === 'b' ? 'Black to move.' : 'White to move.');
    setHintArrow([]);
    setFailedFlash([]);
    setHistory([]);
  };

  useEffect(() => {
    loadPuzzle(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = (id, patch) => {
    setStats((prev) => {
      const next = { ...prev, [id]: { ...(prev[id] ?? {}), ...patch } };
      try {
        localStorage.setItem('chessmaster-puzzles', JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const sanOf = (uci) =>
    uci.slice(0, 2).toUpperCase() + '→' + uci.slice(2, 4).toUpperCase();

  const handleMove = (from, to) => {
    const p = PUZZLES[index];
    if (solved || busy.current) return false;
    const expected = p.solution[ply];
    if (!expected) return false;

    const attempt = (from + to).toLowerCase();
    const want = expected.slice(0, 4).toLowerCase();
    if (attempt !== want) {
      setMistakes((m) => m + 1);
      setFailedFlash([from]);
      setMessage('Not quite — try again.');
      setTimeout(() => setFailedFlash([]), 900);
      if (mistakes + 1 >= 3) persist(p.id, { failed: true });
      return false;
    }

    // Correct move
    let mv = null;
    try {
      mv = gameRef.current.move({ from, to, promotion: 'q' });
    } catch {
      return false;
    }
    void mv;
    const nextPly = ply + 1;
    setPly(nextPly);
    setFen(gameRef.current.fen());
    setHistory(gameRef.current.history());
    setHintArrow([]);
    setFailedFlash([]);

    if (nextPly >= p.solution.length) {
      setSolved(true);
      setMessage('Brilliant! Puzzle solved. 🎉');
      persist(p.id, { solved: true });
      return true;
    }
    // Opponent auto-reply
    busy.current = true;
    setMessage('Good move! Opponent replies…');
    const reply = p.solution[nextPly];
    setTimeout(() => {
      try {
        gameRef.current.move({ from: reply.slice(0, 2), to: reply.slice(2, 4), promotion: 'q' });
      } catch {
        /* should never happen (verified) */
      }
      setPly(nextPly + 1);
      setFen(gameRef.current.fen());
      setHistory(gameRef.current.history());
      busy.current = false;
      const done = nextPly + 1 >= p.solution.length;
      if (done) {
        setSolved(true);
        setMessage('Brilliant! Puzzle solved. 🎉');
        persist(p.id, { solved: true });
      } else {
        setMessage('Your move — finish it!');
      }
    }, 650);
    return true;
  };

  const showHint = () => {
    const expected = puzzle.solution[ply];
    if (!expected || solved) return;
    setHintArrow([{ startSquare: expected.slice(0, 2), endSquare: expected.slice(2, 4), color: '#3b82f6' }]);
    setMessage(`Hint: think about ${sanOf(expected)}.`);
    setTimeout(() => setHintArrow([]), 2500);
  };

  const showSolution = () => {
    if (solved || busy.current) return;
    busy.current = true;
    setMessage('Watch the solution…');
    let i = ply;
    const step = () => {
      if (i >= puzzle.solution.length) {
        busy.current = false;
        setSolved(true);
        persist(puzzle.id, { failed: true });
        setMessage('Study the idea, then try the next one.');
        return;
      }
      const uci = puzzle.solution[i];
      try {
        gameRef.current.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: 'q' });
      } catch {
        busy.current = false;
        return;
      }
      i += 1;
      setPly(i);
      setFen(gameRef.current.fen());
      setHistory(gameRef.current.history());
      setTimeout(step, 800);
    };
    step();
  };

  const progress = Math.min(100, (ply / puzzle.solution.length) * 100);

  return (
    <div className="play-layout">
      <div className="board-col">
        <Board
          fen={fen}
          orientation={puzzle.side === 'w' ? 'white' : 'black'}
          arrows={hintArrow}
          highlights={failedFlash}
          canDragPiece={({ square }) => {
            if (solved || busy.current) return false;
            const piece = gameRef.current.get(square);
            return !!piece && piece.color === puzzle.side;
          }}
          onMove={handleMove}
          getLegalTargets={(sq) => gameRef.current.moves({ square: sq, verbose: true }).map((m) => m.to)}
        />
        <div className="status-line">
          <strong>{message}</strong>
          <span className="muted">Mistakes: {mistakes}</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="side-col">
        <div className="card puzzle-head">
          <div>
            <h3>{puzzle.title}</h3>
            <div className="puzzle-meta">
              <span className="pill" style={{ borderColor: puzzleRatingColor(puzzle.rating) }}>{puzzle.theme}</span>
              <span className="pill">★ {puzzle.rating}</span>
            </div>
          </div>
          <div className="streak-box">
            <span className="streak-num">{solvedCount}/{PUZZLES.length}</span>
            <span className="muted small">solved</span>
            <span className="streak-num">~{rating}</span>
            <span className="muted small">puzzle rating</span>
          </div>
        </div>

        {puzzle.solution.length > 1 && (
          <p className="muted small">A longer combination — your moves: {Math.ceil(puzzle.solution.length / 2)}, opponent replies play automatically.</p>
        )}

        <div className="card">
          <h3>Moves</h3>
          <div className="moves">
            {history.length === 0 && <span className="muted">Make the first move.</span>}
            {history.map((s, i) => (
              <span key={i} className="move-chip">
                {Math.floor(i / 2) + 1}.{i % 2 === 0 ? '' : '…'} {s}
              </span>
            ))}
          </div>
          <div className="btn-row wrap">
            <button className="btn" onClick={showHint} disabled={solved}>💡 Hint</button>
            <button className="btn" onClick={() => loadPuzzle(index)}>↺ Retry</button>
            <button className="btn" onClick={showSolution} disabled={solved}>👁 Solution</button>
          </div>
        </div>

        {solved && (
          <div className="card coach">
            <h3>✅ Why it works</h3>
            <p>{puzzle.explanation}</p>
            <div className="btn-row">
              <button className="btn primary" onClick={() => loadPuzzle(index + 1)}>Next puzzle →</button>
            </div>
          </div>
        )}

        {!solved && (
          <div className="card coach">
            <h3>💭 Coach tip</h3>
            <p>{puzzle.hint}</p>
          </div>
        )}

        <div className="card">
          <h3>All puzzles</h3>
          <div className="puzzle-list">
            {PUZZLES.map((p, i) => (
              <button key={p.id} className={`puzzle-item ${i === index ? 'active' : ''}`} onClick={() => loadPuzzle(i)}>
                <span className="puzzle-check">{stats[p.id]?.solved ? '✅' : `${i + 1}.`}</span>
                <span className="puzzle-name">{p.title}</span>
                <span className="pill small" style={{ borderColor: puzzleRatingColor(p.rating) }}>{p.rating}</span>
              </button>
            ))}
          </div>
          <div className="btn-row">
            <button className="btn" onClick={() => loadPuzzle(index - 1)}>← Prev</button>
            <button className="btn" onClick={() => loadPuzzle(index + 1)}>Next →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

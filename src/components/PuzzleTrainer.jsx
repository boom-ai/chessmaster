import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import Board from './Board.jsx';
import { TbCoachAcc, TbCoachAccItem } from './TbCoachAcc.jsx';
import { TbActionBar } from './TbActionBar.jsx';
import { UxSectionHeader } from '../ux-section/UxSection.jsx';
import { PUZZLES, puzzleRatingColor } from '../data/puzzles.js';
import { toPlain } from '../data/cmPlainWords.js';
import { awardStar } from '../utils/cmProgressStore.js';

// 3010 puzzles: 10 curated (bundled) + 500 classics + 5×500 by mate length,
// each band lazy-loaded on demand so slow connections only fetch one ~230KB chunk.
const TOTAL_PUZZLES = 10 + 500 + 5 * 500;
const BANDS = [
  { id: 'curated', label: '⭐ Curated', count: 10, load: async () => PUZZLES },
  { id: 'm1', label: 'Mate in 1', count: 500, load: () => import('../data/puzzlesM1.js').then((m) => m.LICHESS_M1) },
  { id: 'm2', label: 'Mate in 2', count: 500, load: () => import('../data/puzzlesM2.js').then((m) => m.LICHESS_M2) },
  { id: 'm3', label: 'Mate in 3', count: 500, load: () => import('../data/puzzlesM3.js').then((m) => m.LICHESS_M3) },
  { id: 'm4', label: 'Mate in 4', count: 500, load: () => import('../data/puzzlesM4.js').then((m) => m.LICHESS_M4) },
  { id: 'm5', label: 'Mate in 5', count: 500, load: () => import('../data/puzzlesM5.js').then((m) => m.LICHESS_M5) },
  { id: 'classics', label: 'Classics', count: 500, load: () => import('../data/puzzlesLichess.js').then((m) => m.LICHESS_PUZZLES) },
];

function loadStats() {
  try {
    return JSON.parse(localStorage.getItem('chessmaster-puzzles') ?? '{}');
  } catch {
    return {};
  }
}

function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function PuzzleTrainer() {
  const [pool, setPool] = useState(PUZZLES);
  const [loading, setLoading] = useState(false);
  const [queue, setQueue] = useState(() => PUZZLES.map((_, i) => i));
  const [pos, setPos] = useState(0);
  const [band, setBand] = useState('curated');
  const [listCap, setListCap] = useState(80);
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

  const index = queue[pos] ?? 0;
  const puzzle = pool[index];
  const solvedCount = useMemo(() => pool.filter((p) => stats[p.id]?.solved).length, [stats, pool]);
  const rating = useMemo(() => {
    let r = 800;
    for (const p of pool) {
      const s = stats[p.id];
      if (s?.solved) r += 2;
      if (s?.failed) r -= 1;
    }
    return Math.max(200, r);
  }, [stats, pool]);

  const loadInto = (arr, absIdx) => {
    const p = arr[absIdx];
    if (!p) return;
    gameRef.current = new Chess(p.fen);
    busy.current = false;
    setFen(p.fen);
    setPly(0);
    setMistakes(0);
    setSolved(false);
    setMessage(p.side === 'b' ? 'Black to move.' : 'White to move.');
    setHintArrow([]);
    setFailedFlash([]);
    setHistory([]);
  };

  const loadByIndex = (absIdx) => loadInto(pool, absIdx);

  const gotoPos = (newPos) => {
    const q = queue;
    if (!q.length) return;
    const wrapped = ((newPos % q.length) + q.length) % q.length;
    setPos(wrapped);
    loadByIndex(q[wrapped]);
  };

  const applyBand = async (bandId, reshuffle = false) => {
    const b = BANDS.find((x) => x.id === bandId) ?? BANDS[0];
    setBand(bandId);
    setLoading(true);
    setMessage('Loading puzzles…');
    try {
      const arr = await b.load();
      if (!arr.length) {
        setMessage('Download failed — check connection and try again.');
        return;
      }
      let idxs = arr.map((_, i) => i);
      if (reshuffle) idxs = shuffled(idxs);
      setPool(arr);
      setQueue(idxs);
      setPos(0);
      setListCap(80);
      loadInto(arr, idxs[0] ?? 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadByIndex(0);
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

  const solveIt = (msg = 'Brilliant! Puzzle solved. 🎉') => {
    setSolved(true);
    setMessage(msg);
    persist(puzzle.id, { solved: true });
    try { awardStar('first-tactics'); } catch { /* ignore */ }
  };

  const handleMove = (from, to) => {
    const p = pool[index];
    if (solved || busy.current) return false;
    const expected = p.solution[ply];
    if (!expected) return false;

    const attempt = (from + to).toLowerCase();
    const want = expected.slice(0, 4).toLowerCase();
    if (attempt !== want) {
      // Mate-in-1 puzzles can have several solutions — accept any move that mates.
      if (p.solution.length === 1) {
        try {
          const test = new Chess(gameRef.current.fen());
          test.move({ from, to, promotion: 'q' });
          if (test.isCheckmate()) {
            gameRef.current.move({ from, to, promotion: 'q' });
            setPly(1);
            setFen(gameRef.current.fen());
            setHistory(gameRef.current.history());
            setHintArrow([]);
            setFailedFlash([]);
            solveIt('Brilliant — an alternative mate! 🎉');
            return true;
          }
        } catch {
          /* fall through to wrong-move handling */
        }
      }
      setMistakes((m) => m + 1);
      setFailedFlash([from]);
      setMessage('Not quite — try again.');
      setTimeout(() => setFailedFlash([]), 900);
      if (mistakes + 1 >= 3) persist(p.id, { failed: true });
      return false;
    }

    // Correct move
    try {
      gameRef.current.move({ from, to, promotion: 'q' });
    } catch {
      return false;
    }
    const nextPly = ply + 1;
    setPly(nextPly);
    setFen(gameRef.current.fen());
    setHistory(gameRef.current.history());
    setHintArrow([]);
    setFailedFlash([]);

    if (nextPly >= p.solution.length) {
      solveIt();
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
      if (nextPly + 1 >= p.solution.length) solveIt();
      else setMessage('Your move — finish it!');
    }, 650);
    return true;
  };

  const showHint = () => {
    const expected = puzzle.solution[ply];
    if (!expected || solved) return;
    setHintArrow([{ startSquare: expected.slice(0, 2), endSquare: expected.slice(2, 4), color: '#3b82f6' }]);
    setMessage(`Hint: think about ${toPlain(expected)}.`);
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

  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="play-layout tb-flow tb-lesson">
      <div style={{ gridColumn: '1 / -1' }}>
        <UxSectionHeader eyebrow="Solve" title="Puzzles" sub="Find the winning move — tap Hint anytime, retry as often as you like." meta={`${solvedCount}/${pool.length} in view • ${TOTAL_PUZZLES} total`} />
      </div>
      <div className="board-col tb-main tb-board tb-stick">
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
        <div className="puzzle-quickbar">
          <button className="btn" onClick={() => loadByIndex(index)}>↺ Retry</button>
          <button className="btn primary" onClick={() => gotoPos(pos + 1)}>Next puzzle →</button>
        </div>
      </div>

      <div className="side-col tb-aside tb-coachacc">
        <TbCoachAcc>
          <TbCoachAccItem title="Puzzle">
        <div className="card puzzle-head">
          <div>
            <h3>{puzzle.title}</h3>
            <div className="puzzle-meta">
              <span className="pill" style={{ borderColor: puzzleRatingColor(puzzle.rating) }}>{puzzle.theme}</span>
              <span className="pill">★ {puzzle.rating}</span>
              <span className="pill">{puzzle.side === 'w' ? 'White to move' : 'Black to move'}</span>
            </div>
          </div>
          <div className="streak-box">
            <span className="streak-num">{solvedCount}/{pool.length}</span>
            <span className="muted small">solved</span>
            <span className="streak-num">~{rating}</span>
            <span className="muted small">puzzle rating</span>
          </div>
        </div>
          </TbCoachAccItem>

        {puzzle.solution.length > 1 && (
          <TbCoachAccItem title="Note">
          <p className="muted small">A longer combination — your moves: {Math.ceil(puzzle.solution.length / 2)}, opponent replies play automatically.</p>
          </TbCoachAccItem>
        )}

          <TbCoachAccItem title="Moves">
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
            <button className="btn" onClick={() => loadByIndex(index)}>↺ Retry</button>
            <button className="btn" onClick={showSolution} disabled={solved}>👁 Solution</button>
          </div>
        </div>
          </TbCoachAccItem>

        {solved && (
          <TbCoachAccItem title="Why it works">
          <div className="card coach">
            <h3>✅ Why it works</h3>
            <p>{puzzle.explanation}</p>
            <div className="btn-row">
              <button className="btn primary" onClick={() => gotoPos(pos + 1)}>Next puzzle →</button>
            </div>
          </div>
          </TbCoachAccItem>
        )}

        {!solved && (
          <TbCoachAccItem title="Coach tip">
          <div className="card coach">
            <h3>💭 Coach tip</h3>
            <p>{puzzle.hint}</p>
          </div>
          </TbCoachAccItem>
        )}

          <TbCoachAccItem title="Puzzles">
        <div className="card">
          <h3>Puzzles <span className="muted small">{queue.length} in view • {TOTAL_PUZZLES} total</span></h3>
          <div className="btn-row wrap era-row">
            {BANDS.map((b) => (
              <button key={b.id} className={`btn small-btn ${band === b.id ? 'primary' : ''}`} onClick={() => applyBand(b.id)} disabled={loading}>
                {b.label} ({b.count})
              </button>
            ))}
            <button className="btn small-btn" onClick={() => applyBand(band, true)} disabled={loading}>🔀 Shuffle</button>
          </div>
          {loading && <p className="muted small">Loading puzzles… (one small download, then cached)</p>}
          <div className="puzzle-list">
            {queue.slice(0, listCap).map((qi, qi2) => {
              const p = pool[qi];
              return (
                <button key={p.id} className={`puzzle-item ${qi === index ? 'active' : ''}`} onClick={() => { setPos(qi2); loadByIndex(qi); }}>
                  <span className="puzzle-check">{stats[p.id]?.solved ? '✅' : `${qi2 + 1}.`}</span>
                  <span className="puzzle-name">{p.title}</span>
                  <span className="pill small" style={{ borderColor: puzzleRatingColor(p.rating) }}>{p.rating}</span>
                </button>
              );
            })}
          </div>
          {queue.length > listCap && (
            <div className="btn-row">
              <button className="btn" onClick={() => setListCap((c) => c + 120)}>Show more ({queue.length - listCap} left)</button>
            </div>
          )}
          <div className="btn-row">
            <button className="btn" onClick={() => gotoPos(pos - 1)}>← Prev</button>
            <button className="btn" onClick={() => gotoPos(pos + 1)}>Next →</button>
          </div>
        </div>
          </TbCoachAccItem>
        </TbCoachAcc>
      </div>
      <TbActionBar actions={[{ id: 'hint', label: 'Hint', onClick: showHint }, { id: 'next', label: 'Next', onClick: () => gotoPos(pos + 1), primary: true }, { id: 'retry', label: 'Retry', onClick: () => loadByIndex(index) }]} />
    </div>
  );
}

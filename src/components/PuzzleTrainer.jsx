import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import Board from './Board.jsx';
import { Button, SectionHeader, Progress, CoachCallout, Chip, SearchField, Accordion } from '../v2/ui/Kit.jsx';
import { LessonPage, UpNextDrawer, CelebrateSummary } from '../v2/lesson/LessonPage.jsx';
import { PUZZLES, puzzleRatingColor } from '../data/puzzles.js';
import { LICHESS_PUZZLES } from '../data/puzzlesLichess.js';
import { toPlain } from '../data/cmPlainWords.js';
import { awardStar } from '../utils/cmProgressStore.js';

const ALL = [...PUZZLES, ...LICHESS_PUZZLES];

const BANDS = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'curated', label: '⭐ Curated', test: (_, i) => i < PUZZLES.length },
  { id: 'easy', label: 'Easy', test: (p) => p.rating < 800 },
  { id: 'club', label: 'Medium', test: (p) => p.rating >= 800 && p.rating < 1200 },
  { id: 'adv', label: 'Hard', test: (p) => p.rating >= 1200 && p.rating < 1700 },
  { id: 'expert', label: 'Very hard', test: (p) => p.rating >= 1700 },
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
  const [queue, setQueue] = useState(() => ALL.map((_, i) => i));
  const [pos, setPos] = useState(0);
  const [band, setBand] = useState('all');
  const [fen, setFen] = useState(ALL[0].fen);
  const [ply, setPly] = useState(0); // next solution index to match
  const [mistakes, setMistakes] = useState(0);
  const [solved, setSolved] = useState(false);
  const [message, setMessage] = useState('');
  const [hintArrow, setHintArrow] = useState([]);
  const [failedFlash, setFailedFlash] = useState([]);
  const [stats, setStats] = useState(loadStats);
  const [history, setHistory] = useState([]);
  const busy = useRef(false);
  const gameRef = useRef(new Chess(ALL[0].fen));

  const index = queue[pos] ?? 0;
  const puzzle = ALL[index];
  const solvedCount = useMemo(() => ALL.filter((p) => stats[p.id]?.solved).length, [stats]);
  const rating = useMemo(() => {
    let r = 800;
    for (const p of ALL) {
      const s = stats[p.id];
      if (s?.solved) r += 2;
      if (s?.failed) r -= 1;
    }
    return Math.max(200, r);
  }, [stats]);

  const loadByIndex = (absIdx) => {
    const p = ALL[absIdx];
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

  const gotoPos = (newPos) => {
    const q = queue;
    const wrapped = ((newPos % q.length) + q.length) % q.length;
    setPos(wrapped);
    loadByIndex(q[wrapped]);
  };

  const applyBand = (bandId, reshuffle = false) => {
    const b = BANDS.find((x) => x.id === bandId) ?? BANDS[0];
    let idxs = ALL.map((_, i) => i).filter((i) => b.test(ALL[i], i));
    if (reshuffle) idxs = shuffled(idxs);
    setBand(bandId);
    setQueue(idxs);
    setPos(0);
    loadByIndex(idxs[0] ?? 0);
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
    const p = ALL[index];
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
    <LessonPage
      progress={
        <>
          <SectionHeader title={puzzle.title} sub={`${puzzle.theme} • ★${puzzle.rating} • ${puzzle.side === 'w' ? 'White to move' : 'Black to move'}`} action={`${solvedCount}/${ALL.length} solved`} />
          <Progress value={ply} max={puzzle.solution.length} label={`Move ${ply} of ${puzzle.solution.length}`} />
        </>
      }
      coach={
        <>
          {solved && <CelebrateSummary stars={mistakes === 0 ? 3 : 2} xp={10} perfect={mistakes === 0} onNext={() => gotoPos(pos + 1)} onRetry={() => loadByIndex(index)} />}
          <CoachCallout text={message} avatar="🧩" />
          <div className="v2-puzzlehead">
            <div className="v2-streakbox">
              <span className="v2-streaknum">{solvedCount}/{ALL.length}</span>
              <span className="v2-progress__label">solved</span>
              <span className="v2-streaknum">~{rating}</span>
              <span className="v2-progress__label">puzzle rating</span>
            </div>
          </div>
          <Accordion
            items={[
              ...(solved ? [{ title: '✅ Why it works', content: <p>{puzzle.explanation}</p> }] : [{ title: '💭 Coach tip', content: <p>{puzzle.hint}</p> }]),
              {
                title: 'Moves',
                content: (
                  <div className="v2-moves">
                    {history.length === 0 && <span>Make the first move.</span>}
                    {history.map((s, i) => (
                      <span key={i} className="v2-moverow">
                        <span className="v2-moven">{Math.floor(i / 2) + 1}.{i % 2 === 0 ? '' : '…'}</span>
                        <span className="v2-movecell">{s}</span>
                      </span>
                    ))}
                  </div>
                ),
              },
            ]}
          />
          {puzzle.solution.length > 1 && (
            <p className="v2-progress__label">A longer combination — your moves: {Math.ceil(puzzle.solution.length / 2)}, opponent replies play automatically.</p>
          )}
        </>
      }
      board={
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
      }
      hint={`Mistakes: ${mistakes}`}
      controls={
        <>
          <div className="v2-controlsrow">
            <Button level="tonal" label="💡 Hint" onClick={showHint} disabled={solved} />
            <Button level="tonal" label="↺ Retry" onClick={() => loadByIndex(index)} />
            <Button level="tonal" label="👁 Solution" onClick={showSolution} disabled={solved} />
            <Button label="Next puzzle →" onClick={() => gotoPos(pos + 1)} />
            <Button level="text" label="☰ Puzzles" onClick={() => setDrawerOpen(true)} />
          </div>
          <div className="v2-controlsrow">
            {BANDS.map((b) => (
              <Chip key={b.id} label={b.label} active={band === b.id} onClick={() => applyBand(b.id)} />
            ))}
            <Chip label="🔀 Shuffle" active={false} onClick={() => applyBand(band, true)} />
          </div>
        </>
      }
      list={
        <>
          <SectionHeader title="Puzzles" sub="Pick any puzzle to jump to it." action={`${queue.length} in view`} />
          <UpNextDrawer
            open={drawerOpen}
            items={queue.map((qi, qi2) => {
              const p = ALL[qi];
              return { id: p.id, title: `${stats[p.id]?.solved ? '✓ ' : `${qi2 + 1}. `}${p.title}`, done: !!stats[p.id]?.solved };
            })}
            onSelect={(id) => {
              const qi2 = queue.findIndex((qi) => ALL[qi].id === id);
              if (qi2 >= 0) { setPos(qi2); loadByIndex(queue[qi2]); }
              setDrawerOpen(false);
            }}
            onClose={() => setDrawerOpen(false)}
          />
        </>
      }
    />
  );
}

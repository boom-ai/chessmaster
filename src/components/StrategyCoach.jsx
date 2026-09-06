import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import Board from './Board.jsx';
import { STRATEGY } from '../data/strategy.js';

function playUci(game, uci) {
  return game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
}

function replay(lesson, n) {
  const g = lesson.startFen ? new Chess(lesson.startFen) : new Chess();
  const sans = [];
  for (let i = 0; i < Math.min(n, lesson.mainline.length); i++) {
    const s = lesson.mainline[i];
    if (s.fen) {
      try {
        const ng = new Chess(s.fen);
        // copy state
        g.load(s.fen);
        void ng;
      } catch {
        break;
      }
      continue;
    }
    try {
      sans.push(playUci(g, s.uci).san);
    } catch {
      break;
    }
  }
  return { fen: g.fen(), sans, game: g };
}

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem('chessmaster-strategy') ?? '{}');
  } catch {
    return {};
  }
}

export default function StrategyCoach({ phase }) {
  const lessons = useMemo(
    () => (phase ? STRATEGY.filter((l) => l.phase === phase) : STRATEGY),
    [phase],
  );
  const [lessonId, setLessonId] = useState(lessons[0].id);
  const [step, setStep] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [practice, setPractice] = useState(false);
  const [pPly, setPPly] = useState(0);
  const [pFen, setPFen] = useState(lessons[0].drill?.startFen ?? new Chess().fen());
  const [pMsg, setPMsg] = useState('');
  const [pDone, setPDone] = useState(false);
  const [progress, setProgress] = useState(loadProgress);
  const [auto, setAuto] = useState(false);
  const [query, setQuery] = useState('');
  const pGame = useRef(new Chess(lessons[0].drill?.startFen ?? new Chess().fen()));
  const autoTimer = useRef(null);

  const lesson = lessons.find((l) => l.id === lessonId) ?? lessons[0];
  const { fen, sans } = useMemo(() => replay(lesson, step), [lesson, step]);

  const selectLesson = (id) => {
    setLessonId(id);
    setStep(0);
    setAuto(false);
    setPractice(false);
    setPDone(false);
    setPPly(0);
  };

  // Reset when switching sections (same component, different phase prop)
  useEffect(() => {
    setLessonId(lessons[0].id);
    setStep(0);
    setAuto(false);
    setPractice(false);
    setPDone(false);
    setPPly(0);
    setPFen(lessons[0].drill?.startFen ?? new Chess().fen());
    pGame.current = new Chess(lessons[0].drill?.startFen ?? new Chess().fen());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (autoTimer.current) clearInterval(autoTimer.current);
    if (auto && !practice) {
      if (step >= lesson.mainline.length) {
        setAuto(false);
        return;
      }
      autoTimer.current = setInterval(() => {
        setStep((s) => {
          if (s >= lesson.mainline.length) {
            setAuto(false);
            return s;
          }
          return s + 1;
        });
      }, 1400);
    }
    return () => {
      if (autoTimer.current) clearInterval(autoTimer.current);
    };
  }, [auto, practice, lesson.mainline.length, step]);

  const startPractice = () => {
    if (!lesson.drill) return;
    pGame.current = new Chess(lesson.drill.startFen);
    setPPly(0);
    setPFen(pGame.current.fen());
    setPDone(false);
    setPractice(true);
    setAuto(false);
    setPMsg(lesson.drill.about);
  };

  function exitPractice() {
    setPractice(false);
    setPDone(false);
    setPPly(0);
  }

  useEffect(() => {
    if (!practice || pDone || !lesson.drill) return;
    if (pPly >= lesson.drill.moves.length) {
      setPDone(true);
      setPMsg('Lesson complete! Technique banked. 🎉');
      setProgress((prev) => {
        const next = { ...prev, [lessonId]: { practiced: true } };
        try {
          localStorage.setItem('chessmaster-strategy', JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
      return;
    }
    const turn = pGame.current.turn();
    if (turn !== lesson.drill.forColor) {
      const t = setTimeout(() => {
        const u = lesson.drill.moves[pPly];
        try {
          playUci(pGame.current, u);
        } catch {
          return;
        }
        setPFen(pGame.current.fen());
        setPPly((p) => p + 1);
      }, 700);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practice, pPly, pDone, lessonId]);

  const handlePracticeMove = (from, to, promotion) => {
    if (!practice || pDone || !lesson.drill) return false;
    if (pGame.current.turn() !== lesson.drill.forColor) return false;
    const expected = lesson.drill.moves[pPly];
    if (!expected) return false;
    const wantFrom = expected.slice(0, 2).toLowerCase();
    const wantTo = expected.slice(2, 4).toLowerCase();
    if (from.toLowerCase() !== wantFrom || to.toLowerCase() !== wantTo) {
      setPMsg('Not the coached move — read the drill tip and try again.');
      return false;
    }
    try {
      pGame.current.move({ from, to, promotion: expected[4] ?? promotion ?? 'q' });
    } catch {
      return false;
    }
    setPFen(pGame.current.fen());
    setPPly((p) => p + 1);
    setPMsg('Good! Keep going…');
    return true;
  };

  const learnArrows = useMemo(() => {
    if (practice || step === 0) return [];
    const s = lesson.mainline[step - 1];
    return (s.arrows ?? []).map((a) => ({ startSquare: a.from, endSquare: a.to, color: a.color }));
  }, [practice, step, lesson]);

  const learnHighlights = useMemo(() => {
    if (practice || step === 0) return [];
    return lesson.mainline[step - 1].highlight ?? [];
  }, [practice, step, lesson]);

  const boardFen = practice ? pFen : fen;
  const orientation = flipped ? 'black' : 'white';
  const currentStep = !practice && step > 0 ? lesson.mainline[step - 1] : null;

  const groups = phase
    ? [{ phase, title: phase === 'middlegame' ? '⚔️ Middlegame' : '♔ Endgame', desc: phase === 'middlegame' ? 'Plans, structures & attacks' : 'Must-know technique' }]
    : [
      { phase: 'middlegame', title: '⚔️ Middlegame', desc: 'Plans, structures & attacks' },
      { phase: 'endgame', title: '♔ Endgame', desc: 'Must-know technique' },
    ];
  const doneCount = lessons.filter((l) => progress[l.id]?.practiced).length;
  const drillEndFen = useMemo(() => {
    if (!lesson.drill) return null;
    try {
      const g = new Chess(lesson.drill.startFen);
      for (const u of lesson.drill.moves) playUci(g, u);
      return g.fen();
    } catch {
      return null;
    }
  }, [lesson]);

  return (
    <div className="learn-layout">
      <aside className="open-list">
        <h3>{phase === 'middlegame' ? 'Middlegame' : phase === 'endgame' ? 'Endgame' : 'Strategy'} <span className="muted small">{doneCount}/{lessons.length} practiced</span></h3>
        <input
          className="search-box"
          type="search"
          placeholder={`Search ${lessons.length} lessons…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search lessons"
        />
        {groups.map((group) => {
          const q = query.trim().toLowerCase();
          const items = lessons.filter((l) => l.phase === group.phase)
            .filter((l) => !q || l.title.toLowerCase().includes(q) || l.tagline.toLowerCase().includes(q));
          const done = items.filter((l) => progress[l.id]?.practiced).length;
          return (
            <div key={group.phase} className="open-group">
              <div className="open-group-head" title={group.desc}>
                <span>{group.title}</span>
                <span className="muted small">{done}/{items.length}</span>
              </div>
              {items.map((l) => (
                <button key={l.id} className={`open-item ${l.id === lessonId ? 'active' : ''}`} onClick={() => selectLesson(l.id)}>
                  <span className="open-name">{progress[l.id]?.practiced ? '✅ ' : ''}{l.title}</span>
                  <span className="open-tags">
                    <span className="pill small">{l.level}</span>
                    <span className="pill small">{l.phase}</span>
                  </span>
                </button>
              ))}
            </div>
          );
        })}
      </aside>

      <div className="board-col">
        <Board
          fen={boardFen}
          orientation={orientation}
          arrows={learnArrows}
          highlights={learnHighlights}
          canDragPiece={practice ? ({ square }) => {
            if (pDone || !lesson.drill) return false;
            if (pGame.current.turn() !== lesson.drill.forColor) return false;
            const piece = pGame.current.get(square);
            return !!piece && piece.color === lesson.drill.forColor;
          } : undefined}
          onMove={practice ? handlePracticeMove : undefined}
          getLegalTargets={(sq) => {
            const g = practice ? pGame.current : replay(lesson, step).game;
            try {
              return g.moves({ square: sq, verbose: true }).map((m) => m.to);
            } catch {
              return [];
            }
          }}
        />
        <div className="step-controls">
          {!practice ? (
            <>
              <button className="btn" onClick={() => { setAuto(false); setStep(0); }}>⏮ Start</button>
              <button className="btn" onClick={() => { setAuto(false); setStep((s) => Math.max(0, s - 1)); }}>← Prev</button>
              <span className="step-count">Move {step} / {lesson.mainline.length}</span>
              <button className="btn" onClick={() => { setAuto(false); setStep((s) => Math.min(lesson.mainline.length, s + 1)); }}>Next →</button>
              <button className={`btn ${auto ? 'primary' : ''}`} onClick={() => { if (step >= lesson.mainline.length) setStep(0); setAuto((a) => !a); }}>{auto ? '⏸ Pause' : '▶ Watch'}</button>
            </>
          ) : (
            <>
              <span className="step-count">Drill: move {Math.min(pPly + 1, lesson.drill?.moves.length ?? 0)} / {lesson.drill?.moves.length ?? 0}</span>
              <button className="btn" onClick={exitPractice}>✕ Exit drill</button>
              <button className="btn" onClick={startPractice}>↺ Restart</button>
            </>
          )}
          <button className="btn" onClick={() => setFlipped((f) => !f)}>🔄 Flip</button>
        </div>
        {practice && <div className="status-line"><strong>{pMsg}</strong></div>}
        {!practice && (
          <div className="move-strip">
            {sans.length === 0 && <span className="muted">Starting position — press Next.</span>}
            {sans.map((s, i) => (
              <button key={i} className={`move-chip clickable ${i === step - 1 ? 'current' : ''}`} onClick={() => { setAuto(false); setStep(i + 1); }}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="side-col">
        <div className="card">
          <h2>{lesson.title}</h2>
          <p className="muted">{lesson.level} • {lesson.phase} • {lesson.tagline}</p>
          <p className="coach-text">{lesson.description}</p>
          <h4>🔑 Key ideas</h4>
          <ul className="ideas">
            {lesson.keyIdeas.map((k, i) => <li key={i}>{k}</li>)}
          </ul>
        </div>

        <div className="card coach">
          {!practice ? (
            step === 0 ? (
              <>
                <h3>♟ Your lesson</h3>
                <p>Step through with the arrows: <span className="sw green" /> = your move, <span className="sw red" /> = opponent, <span className="sw yellow" /> = key square. Then test yourself in Drill mode.</p>
                {lesson.drill && (
                  <div className="btn-row">
                    <button className="btn primary" onClick={startPractice}>🎯 Drill: {lesson.drill.about}</button>
                  </div>
                )}
              </>
            ) : (
              <>
                <h3>{sans[step - 1] && <span className="coach-move">{sans[step - 1]}</span>}</h3>
                <p>{currentStep?.explanation}</p>
                {step >= lesson.mainline.length && lesson.drill && (
                  <div className="btn-row">
                    <button className="btn primary" onClick={startPractice}>🎯 Practice the drill</button>
                  </div>
                )}
              </>
            )
          ) : (
            <>
              <h3>🎯 Drill mode</h3>
              <p>{pDone ? 'Drill complete! Technique banked.' : lesson.drill?.about}</p>
              {!pDone && lesson.drill && pPly < lesson.drill.moves.length && (
                <p className="muted small">Coach whispers: {lesson.mainline[Math.min(step, lesson.mainline.length - 1)]?.explanation ?? 'Follow the plan.'}</p>
              )}
              {pDone && <div className="btn-row"><button className="btn" onClick={exitPractice}>← Back to lesson</button></div>}
            </>
          )}
        </div>

        {lesson.phase === 'endgame' && drillEndFen && (
          <div className="card">
            <h3>♜ Tablebase check</h3>
            <p className="muted small">Drill-end FEN (verified legal; check WDL):</p>
            <code className="small">{drillEndFen}</code>
            <div className="btn-row">
              <a className="btn" href={`https://tablebase.lichess.ovh/standard?fen=${encodeURIComponent(drillEndFen)}`} target="_blank" rel="noreferrer">Open tablebase ↗</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

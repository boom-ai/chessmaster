import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import Board from './Board.jsx';
import { OPENINGS, getOpening } from '../data/openings.js';

function replay(ucis, n) {
  const g = new Chess();
  const sans = [];
  for (let i = 0; i < Math.min(n, ucis.length); i++) {
    const u = ucis[i];
    try {
      sans.push(g.move({ from: u.slice(0, 2), to: u.slice(2, 4) }).san);
    } catch {
      break;
    }
  }
  return { fen: g.fen(), sans, game: g };
}

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem('chessmaster-openings') ?? '{}');
  } catch {
    return {};
  }
}

export default function OpeningsTeacher() {
  const [openingId, setOpeningId] = useState(OPENINGS[0].id);
  const [lineSel, setLineSel] = useState('main'); // 'main' | `var:${i}`
  const [step, setStep] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [practice, setPractice] = useState(false);
  const [pPly, setPPly] = useState(0);
  const [pFen, setPFen] = useState(new Chess().fen());
  const [pMsg, setPMsg] = useState('');
  const [pDone, setPDone] = useState(false);
  const [progress, setProgress] = useState(loadProgress);
  const [auto, setAuto] = useState(false);
  const pGame = useRef(new Chess());
  const autoTimer = useRef(null);

  const opening = getOpening(openingId);
  const isMain = lineSel === 'main';
  const varIndex = isMain ? -1 : parseInt(lineSel.split(':')[1], 10);
  const lineUcis = useMemo(
    () => (isMain ? opening.mainline.map((s) => s.uci) : opening.variations[varIndex].moves),
    [opening, isMain, varIndex],
  );
  const { fen, sans } = useMemo(() => replay(lineUcis, step), [lineUcis, step]);

  // Reset navigation when switching lines
  const selectLine = (sel) => {
    setLineSel(sel);
    setStep(0);
    setAuto(false);
    exitPractice();
  };
  const selectOpening = (id) => {
    setOpeningId(id);
    setLineSel('main');
    setStep(0);
    setAuto(false);
    exitPractice();
  };

  // Auto-play ("watch") mode
  useEffect(() => {
    if (autoTimer.current) clearInterval(autoTimer.current);
    if (auto && !practice) {
      if (step >= lineUcis.length) {
        setAuto(false);
        return;
      }
      autoTimer.current = setInterval(() => {
        setStep((s) => {
          if (s >= lineUcis.length) {
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
  }, [auto, practice, lineUcis.length, step]);

  // ---- Practice mode ----
  const startPractice = () => {
    pGame.current = new Chess();
    setPPly(0);
    setPFen(pGame.current.fen());
    setPDone(false);
    setPractice(true);
    setAuto(false);
    setPMsg(
      opening.forColor === 'w'
        ? 'Your move as White — play the main ideas.'
        : 'White moves first — then reply as Black.',
    );
  };

  function exitPractice() {
    setPractice(false);
    setPDone(false);
    setPPly(0);
  }

  // Auto-play opponent replies during practice
  useEffect(() => {
    if (!practice || pDone) return;
    if (pPly >= lineUcis.length) {
      setPDone(true);
      setPMsg('Perfect repertoire! You played the whole line. 🎉');
      setProgress((prev) => {
        const next = { ...prev, [openingId]: { practiced: true } };
        try {
          localStorage.setItem('chessmaster-openings', JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
      return;
    }
    const turn = pGame.current.turn();
    if (turn !== opening.forColor) {
      const t = setTimeout(() => {
        const u = lineUcis[pPly];
        try {
          pGame.current.move({ from: u.slice(0, 2), to: u.slice(2, 4) });
        } catch {
          return;
        }
        setPFen(pGame.current.fen());
        setPPly((p) => p + 1);
      }, 700);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practice, pPly, pDone, lineUcis, openingId]);

  const handlePracticeMove = (from, to) => {
    if (!practice || pDone) return false;
    if (pGame.current.turn() !== opening.forColor) return false;
    const expected = lineUcis[pPly];
    if (!expected) return false;
    if ((from + to).toLowerCase() !== expected.slice(0, 4).toLowerCase()) {
      setPMsg('Not the repertoire move — look at the coach tip and try again.');
      return false;
    }
    try {
      pGame.current.move({ from, to });
    } catch {
      return false;
    }
    setPFen(pGame.current.fen());
    setPPly((p) => p + 1);
    setPMsg('Good! Keep going…');
    return true;
  };

  // ---- Learn-mode board overlays ----
  const learnArrows = useMemo(() => {
    if (practice || step === 0) return [];
    if (isMain) {
      const s = opening.mainline[step - 1];
      return (s.arrows ?? []).map((a) => ({ startSquare: a.from, endSquare: a.to, color: a.color }));
    }
    // variation: arrow for the move just played
    const u = lineUcis[step - 1];
    return [{ startSquare: u.slice(0, 2), endSquare: u.slice(2, 4), color: '#eab308' }];
  }, [practice, step, isMain, opening, lineUcis]);

  const learnHighlights = useMemo(() => {
    if (practice || step === 0) return [];
    if (isMain) return opening.mainline[step - 1].highlight ?? [];
    const u = lineUcis[step - 1];
    return [u.slice(0, 2), u.slice(2, 4)];
  }, [practice, step, isMain, opening, lineUcis]);

  const boardFen = practice ? pFen : fen;
  const orientation = (flipped ? (opening.forColor === 'w' ? 'b' : 'w') : opening.forColor) === 'w' ? 'white' : 'black';

  const currentStep = !practice && step > 0 && isMain ? opening.mainline[step - 1] : null;

  const practicedCount = OPENINGS.filter((o) => progress[o.id]?.practiced).length;

  return (
    <div className="learn-layout">
      <aside className="open-list">
        <h3>Repertoire <span className="muted small">{practicedCount}/{OPENINGS.length} practiced</span></h3>
        {[
          { color: 'w', title: '♔ White openings', desc: 'Play these as White' },
          { color: 'b', title: '♚ Black openings', desc: 'Play these as Black' },
        ].map((group) => {
          const items = OPENINGS.filter((o) => o.forColor === group.color);
          const done = items.filter((o) => progress[o.id]?.practiced).length;
          return (
            <div key={group.color} className="open-group">
              <div className="open-group-head" title={group.desc}>
                <span>{group.title}</span>
                <span className="muted small">{done}/{items.length}</span>
              </div>
              {items.map((o) => (
                <button key={o.id} className={`open-item ${o.id === openingId ? 'active' : ''}`} onClick={() => selectOpening(o.id)}>
                  <span className="open-name">{progress[o.id]?.practiced ? '✅ ' : ''}{o.name}</span>
                  <span className="open-tags">
                    <span className="pill small">{o.level}</span>
                    <span className="pill small">{o.eco}</span>
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
            if (pDone) return false;
            if (pGame.current.turn() !== opening.forColor) return false;
            const piece = pGame.current.get(square);
            return !!piece && piece.color === opening.forColor;
          } : undefined}
          onMove={practice ? handlePracticeMove : undefined}
          getLegalTargets={(sq) => {
            const g = practice ? pGame.current : replay(lineUcis, step).game;
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
              <span className="step-count">Move {step} / {lineUcis.length}</span>
              <button className="btn" onClick={() => { setAuto(false); setStep((s) => Math.min(lineUcis.length, s + 1)); }}>Next →</button>
              <button className={`btn ${auto ? 'primary' : ''}`} onClick={() => { if (step >= lineUcis.length) setStep(0); setAuto((a) => !a); }}>{auto ? '⏸ Pause' : '▶ Watch'}</button>
            </>
          ) : (
            <>
              <span className="step-count">Practice: move {Math.min(pPly + 1, lineUcis.length)} / {lineUcis.length}</span>
              <button className="btn" onClick={exitPractice}>✕ Exit practice</button>
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
                {i % 2 === 0 ? `${i / 2 + 1}. ` : ''}{s}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="side-col">
        <div className="card">
          <h2>{opening.name}</h2>
          <p className="muted">{opening.eco} • {opening.tagline}</p>
          <p className="coach-text">{opening.description}</p>
          <h4>🔑 Key ideas</h4>
          <ul className="ideas">
            {opening.keyIdeas.map((k, i) => <li key={i}>{k}</li>)}
          </ul>
        </div>

        <div className="card">
          <h3>Lines</h3>
          <div className="btn-row wrap">
            <button className={`btn ${isMain ? 'primary' : ''}`} onClick={() => selectLine('main')}>📖 Main line</button>
            {opening.variations.map((v, i) => (
              <button key={v.name} className={`btn ${lineSel === `var:${i}` ? 'primary' : ''}`} onClick={() => selectLine(`var:${i}`)}>{v.name}</button>
            ))}
          </div>
          {!isMain && <p className="coach-text var-desc">{opening.variations[varIndex].description}</p>}
        </div>

        <div className="card coach">
          {!practice ? (
            step === 0 ? (
              <>
                <h3>♟ Your lesson</h3>
                <p>Step through the {isMain ? 'main line' : opening.variations[varIndex].name} with the arrows: <span className="sw green" /> = your move, <span className="sw red" /> = opponent, <span className="sw yellow" /> = key square. Then test yourself in Practice mode.</p>
                <div className="btn-row">
                  <button className="btn primary" onClick={startPractice}>🎯 Practice this line</button>
                </div>
              </>
            ) : (
              <>
                <h3>{sans[step - 1] && <span className="coach-move">{Math.ceil(step / 2)}{step % 2 === 1 ? '.' : '…'} {sans[step - 1]}</span>}</h3>
                <p>{isMain ? currentStep?.explanation : variationCoachText(step, lineUcis.length)}</p>
                {step >= lineUcis.length && (
                  <div className="btn-row">
                    <button className="btn primary" onClick={startPractice}>🎯 Practice this line</button>
                  </div>
                )}
              </>
            )
          ) : (
            <>
              <h3>🎯 Practice mode</h3>
              <p>{pDone ? 'Line complete! This opening is now in your repertoire.' : `You play ${opening.forColor === 'w' ? 'White' : 'Black'}. Next up: move ${Math.min(pPly + 1, lineUcis.length)} of ${lineUcis.length}.`}</p>
              {!pDone && <CoachNext opening={opening} isMain={isMain} pPly={pPly} lineUcis={lineUcis} varIndex={varIndex} />}
              {pDone && <div className="btn-row"><button className="btn" onClick={exitPractice}>← Back to lesson</button></div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function variationCoachText(step, total) {
  if (step >= total) return 'End of the variation — compare the resulting structures with the main line above, then practice it until the moves feel automatic.';
  return 'Follow the board: the yellow arrow shows the move just played. Watch how the pawn structure and piece placement differ from the main line.';
}

function CoachNext({ opening, isMain, pPly, lineUcis, varIndex }) {
  const u = lineUcis[pPly];
  if (!u) return null;
  if (isMain) {
    return <p className="muted small">Coach whispers: {opening.mainline[pPly]?.explanation}</p>;
  }
  return <p className="muted small">Variation: {opening.variations[varIndex].name} — play the next move of the line.</p>;
}

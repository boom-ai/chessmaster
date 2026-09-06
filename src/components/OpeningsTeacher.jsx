import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import Board from './Board.jsx';
import { OPENINGS, getOpening } from '../data/openings.js';
import { Button, SectionHeader, Progress, CoachCallout, Chip, SearchField, Accordion } from '../v2/ui/Kit.jsx';
import { LessonPage, UpNextDrawer, CelebrateSummary } from '../v2/lesson/LessonPage.jsx';
import { awardStar } from '../utils/cmProgressStore.js';
import { readAutoplayMs } from '../hooks/cmDisplayMode.js';

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
  const [query, setQuery] = useState('');
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
      }, readAutoplayMs(1400));
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
        try { awardStar('opening-habits'); } catch { /* ignore */ }
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
  const [drawerOpen, setDrawerOpen] = useState(false);

  const q = query.trim().toLowerCase();
  const flatItems = OPENINGS
    .filter((o) => !q || o.name.toLowerCase().includes(q) || o.eco.toLowerCase().includes(q) || o.tagline.toLowerCase().includes(q))
    .map((o) => ({ id: o.id, title: o.name, done: !!progress[o.id]?.practiced }));

  const goNextOpening = () => {
    const i = OPENINGS.findIndex((o) => o.id === openingId);
    selectOpening(OPENINGS[(i + 1) % OPENINGS.length].id);
  };

  const coachText = practice
    ? (pDone ? 'Line complete! This opening is now in your repertoire.' : `You play ${opening.forColor === 'w' ? 'White' : 'Black'}. Next up: move ${Math.min(pPly + 1, lineUcis.length)} of ${lineUcis.length}.`)
    : step === 0
      ? `Step through the ${isMain ? 'main line' : opening.variations[varIndex].name} with the arrows: green is your move, red is the opponent, yellow marks key squares. Then test yourself in Practice mode.`
      : (isMain ? currentStep?.explanation : variationCoachText(step, lineUcis.length));

  return (
    <LessonPage
      progress={
        <>
          <SectionHeader title={opening.name} sub={`${opening.eco} • ${opening.tagline}`} action={`${practicedCount}/${OPENINGS.length} practiced`} />
          <Progress value={practice ? pPly : step} max={lineUcis.length} label={practice ? `Practice ${Math.min(pPly + 1, lineUcis.length)} of ${lineUcis.length}` : `Move ${step} of ${lineUcis.length}`} />
        </>
      }
      coach={
        <>
          {pDone && <CelebrateSummary stars={3} xp={10} perfect onNext={goNextOpening} onRetry={startPractice} />}
          <CoachCallout text={coachText} avatar="♟" />
          {!practice && !pDone && <CoachNext opening={opening} isMain={isMain} pPly={pPly} lineUcis={lineUcis} varIndex={varIndex} />}
          <Accordion
            items={[
              { title: '🔑 Key ideas', content: (<ul className="v2-ideas">{opening.keyIdeas.map((k, i) => <li key={i}>{k}</li>)}</ul>) },
              {
                title: 'Lines',
                content: (
                  <>
                    <div className="v2-controlsrow">
                      <Chip label="📖 Main line" active={isMain} onClick={() => selectLine('main')} />
                      {opening.variations.map((v, i) => (
                        <Chip key={v.name} label={v.name} active={lineSel === `var:${i}`} onClick={() => selectLine(`var:${i}`)} />
                      ))}
                    </div>
                    {!isMain && <p className="v2-prose">{opening.variations[varIndex].description}</p>}
                  </>
                ),
              },
            ]}
          />
        </>
      }
      board={
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
      }
      hint={practice ? null : (step === 0 ? 'Starting position — press Next.' : null)}
      controls={
        <>
          {!practice ? (
            <div className="v2-controlsrow">
              <Button level="tonal" label="⏮ Start" onClick={() => { setAuto(false); setStep(0); }} />
              <Button level="tonal" label="← Prev" onClick={() => { setAuto(false); setStep((s) => Math.max(0, s - 1)); }} />
              <Button label="Next →" onClick={() => { setAuto(false); setStep((s) => Math.min(lineUcis.length, s + 1)); }} />
              <Button level="tonal" label={auto ? '⏸ Pause' : '▶ Watch'} onClick={() => { if (step >= lineUcis.length) setStep(0); setAuto((a) => !a); }} />
              <Button level="tonal" label="🔄 Flip" onClick={() => setFlipped((f) => !f)} />
              <Button level="tonal" label="🎯 Practice" onClick={startPractice} />
              <Button level="text" label="☰ Lessons" onClick={() => setDrawerOpen(true)} />
            </div>
          ) : (
            <div className="v2-controlsrow">
              <Button level="text" label="✕ Exit practice" onClick={exitPractice} />
              <Button level="tonal" label="↺ Restart" onClick={startPractice} />
              <Button level="tonal" label="🔄 Flip" onClick={() => setFlipped((f) => !f)} />
            </div>
          )}
          {!practice && (
            <div className="v2-controlsrow">
              {sans.map((s, i) => (
                <Chip key={i} label={`${i % 2 === 0 ? `${i / 2 + 1}. ` : ''}${s}`} active={i === step - 1} onClick={() => { setAuto(false); setStep(i + 1); }} />
              ))}
            </div>
          )}
        </>
      }
      list={
        <>
          <SearchField value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search 100 openings…" />
          <UpNextDrawer
            open={drawerOpen}
            items={flatItems}
            onSelect={(id) => { selectOpening(id); setDrawerOpen(false); }}
            onClose={() => setDrawerOpen(false)}
          />
        </>
      }
    />
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
    return <p className="v2-progress__label">Coach whispers: {opening.mainline[pPly]?.explanation}</p>;
  }
  return <p className="v2-progress__label">Variation: {opening.variations[varIndex].name} — play the next move of the line.</p>;
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import Board from './Board.jsx';
import { STRATEGY } from '../data/strategy.js';
import { Button, SectionHeader, Progress, CoachCallout, Chip, SearchField, Accordion } from '../v2/ui/Kit.jsx';
import { LessonPage, UpNextDrawer, CelebrateSummary } from '../v2/lesson/LessonPage.jsx';
import { awardStar } from '../utils/cmProgressStore.js';
import { readAutoplayMs } from '../hooks/cmDisplayMode.js';

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
      }, readAutoplayMs(1400));
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
        try { awardStar(phase === 'middlegame' ? 'middlegame-toolkit' : 'key-endgames'); } catch { /* ignore */ }
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const q = query.trim().toLowerCase();
  const flatItems = lessons
    .filter((l) => !q || l.title.toLowerCase().includes(q) || l.tagline.toLowerCase().includes(q))
    .map((l) => ({ id: l.id, title: l.title, done: !!progress[l.id]?.practiced }));

  const goNextLesson = () => {
    const i = lessons.findIndex((l) => l.id === lessonId);
    selectLesson(lessons[(i + 1) % lessons.length].id);
  };

  const coachText = practice
    ? (pDone ? 'Drill complete! Technique banked.' : (lesson.drill?.about ?? ''))
    : step === 0
      ? 'Step through with the arrows: green is your move, red is the opponent, yellow marks key squares. Then test yourself in Drill mode.'
      : (currentStep?.explanation ?? '');
  const sectionTitle = phase === 'middlegame' ? 'Middlegame Coach' : 'Endgame Coach';

  return (
    <LessonPage
      progress={
        <>
          <SectionHeader title={lesson.title} sub={`${lesson.level} • ${lesson.phase} • ${lesson.tagline}`} action={`${doneCount}/${lessons.length} practiced`} />
          <Progress value={practice ? pPly : step} max={practice ? (lesson.drill?.moves.length ?? 1) : lesson.mainline.length} label={practice ? `Drill ${Math.min(pPly + 1, lesson.drill?.moves.length ?? 0)} of ${lesson.drill?.moves.length ?? 0}` : `Move ${step} of ${lesson.mainline.length}`} />
        </>
      }
      coach={
        <>
          {pDone && <CelebrateSummary stars={3} xp={10} perfect onNext={goNextLesson} onRetry={startPractice} />}
          <CoachCallout text={coachText} avatar="♟" />
          <Accordion
            items={[
              { title: '🔑 Key ideas', content: (<ul className="v2-ideas">{lesson.keyIdeas.map((k, i) => <li key={i}>{k}</li>)}</ul>) },
              ...(lesson.phase === 'endgame' && drillEndFen ? [{ title: '♜ Tablebase check', content: (<><code className="v2-code">{drillEndFen}</code><p><a className="v2-link" href={`https://tablebase.lichess.ovh/standard?fen=${encodeURIComponent(drillEndFen)}`} target="_blank" rel="noreferrer">Open tablebase ↗</a></p></>) }] : []),
            ]}
          />
          {!practice && step >= lesson.mainline.length && lesson.drill && (
            <Button label="🎯 Practice the drill" onClick={startPractice} />
          )}
        </>
      }
      board={
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
      }
      hint={practice ? pMsg : (step === 0 ? 'Starting position — press Next.' : null)}
      controls={
        <>
          {!practice ? (
            <div className="v2-controlsrow">
              <Button level="tonal" label="⏮ Start" onClick={() => { setAuto(false); setStep(0); }} />
              <Button level="tonal" label="← Prev" onClick={() => { setAuto(false); setStep((s) => Math.max(0, s - 1)); }} />
              <Button label="Next →" onClick={() => { setAuto(false); setStep((s) => Math.min(lesson.mainline.length, s + 1)); }} />
              <Button level="tonal" label={auto ? '⏸ Pause' : '▶ Watch'} onClick={() => { if (step >= lesson.mainline.length) setStep(0); setAuto((a) => !a); }} />
              <Button level="tonal" label="🔄 Flip" onClick={() => setFlipped((f) => !f)} />
              {lesson.drill && <Button level="tonal" label="🎯 Drill" onClick={startPractice} />}
              <Button level="text" label="☰ Lessons" onClick={() => setDrawerOpen(true)} />
            </div>
          ) : (
            <div className="v2-controlsrow">
              <Button level="text" label="✕ Exit drill" onClick={exitPractice} />
              <Button level="tonal" label="↺ Restart" onClick={startPractice} />
              <Button level="tonal" label="🔄 Flip" onClick={() => setFlipped((f) => !f)} />
            </div>
          )}
          {!practice && (
            <div className="v2-controlsrow">
              {sans.map((s, i) => (
                <Chip key={i} label={s} active={i === step - 1} onClick={() => { setAuto(false); setStep(i + 1); }} />
              ))}
            </div>
          )}
        </>
      }
      list={
        <>
          <SectionHeader title={sectionTitle} sub={phase === 'middlegame' ? 'Plans, structures and attacks.' : 'Must-know technique.'} action={`${doneCount}/${lessons.length}`} />
          <SearchField value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${lessons.length} lessons…`} />
          <UpNextDrawer
            open={drawerOpen}
            items={flatItems}
            onSelect={(id) => { selectLesson(id); setDrawerOpen(false); }}
            onClose={() => setDrawerOpen(false)}
          />
        </>
      }
    />
  );
}

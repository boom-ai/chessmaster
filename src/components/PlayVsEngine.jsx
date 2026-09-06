import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import Board from './Board.jsx';
import { Button, SectionHeader, Progress, CoachCallout, Chip, SearchField, Accordion } from '../v2/ui/Kit.jsx';
import { LessonPage, UpNextDrawer, CelebrateSummary } from '../v2/lesson/LessonPage.jsx';
import { awardStar } from '../utils/cmProgressStore.js';
import { getEngine } from '../engine/stockfish.js';
import { randomMove } from '../engine/fallbackEngine.js';

const LEVELS = [
  { id: 'beginner', name: 'Beginner', elo: '~600', depth: 1, movetime: 120, skill: 0, blunder: 0.35, desc: 'Learning the moves. Hangs pieces.' },
  { id: 'casual', name: 'Casual', elo: '~1000', depth: 4, movetime: 300, skill: 5, blunder: 0.12, desc: 'Plays sensible chess, misses tactics.' },
  { id: 'club', name: 'Club Player', elo: '~1400', depth: 8, movetime: 600, skill: 10, blunder: 0, desc: 'Solid. Punishes blunders.' },
  { id: 'strong', name: 'Expert', elo: '~1800', depth: 11, movetime: 900, skill: 16, blunder: 0, desc: 'Deep tactics, strong endgames.' },
  { id: 'master', name: 'Master', elo: '2200+', depth: 15, movetime: 1400, skill: 20, blunder: 0, desc: 'Full-strength Stockfish. Good luck.' },
];

function evalToWhitePct(cp, mate) {
  if (mate != null) return mate > 0 ? 100 : 0;
  return 50 * (1 + Math.tanh((cp ?? 0) / 600));
}

const TIME_CONTROLS = [
  { id: 'casual', name: 'Casual', cat: 'No clock', base: null, inc: 0 },
  { id: 'b10', name: '1+0', cat: 'Bullet', base: 60, inc: 0 },
  { id: 'b21', name: '2+1', cat: 'Bullet', base: 120, inc: 1 },
  { id: 'z30', name: '3+0', cat: 'Blitz', base: 180, inc: 0 },
  { id: 'z32', name: '3+2', cat: 'Blitz', base: 180, inc: 2 },
  { id: 'z50', name: '5+0', cat: 'Blitz', base: 300, inc: 0 },
  { id: 'z53', name: '5+3', cat: 'Blitz', base: 300, inc: 3 },
  { id: 'r100', name: '10+0', cat: 'Rapid', base: 600, inc: 0 },
  { id: 'r105', name: '10+5', cat: 'Rapid', base: 600, inc: 5 },
  { id: 'r1510', name: '15+10', cat: 'Rapid', base: 900, inc: 10 },
  { id: 'r300', name: '30+0', cat: 'Rapid', base: 1800, inc: 0 },
];

function fmtClock(ms) {
  const total = Math.max(0, ms);
  const m = Math.floor(total / 60000);
  const s = Math.floor((total % 60000) / 1000);
  if (total < 20000) {
    const d = Math.floor((total % 1000) / 100);
    return `${m}:${String(s).padStart(2, '0')}.${d}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function PlayVsEngine() {
  const gameRef = useRef(new Chess());
  const [fen, setFen] = useState(gameRef.current.fen());
  const [playerColor, setPlayerColor] = useState('w');
  const [levelId, setLevelId] = useState('casual');
  const [thinking, setThinking] = useState(false);
  const [engineStatus, setEngineStatus] = useState('loading');
  const [evalCp, setEvalCp] = useState(20);
  const [evalMate, setEvalMate] = useState(null);
  const [hintArrow, setHintArrow] = useState([]);
  const [lastMove, setLastMove] = useState([]);
  const [result, setResult] = useState(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [history, setHistory] = useState([]);
  const [verboseHist, setVerboseHist] = useState([]);
  const [reviewing, setReviewing] = useState(false);
  const [reviewPly, setReviewPly] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tcId, setTcId] = useState('casual');
  const [clocks, setClocks] = useState({ w: 600000, b: 600000 });
  const [clockOn, setClockOn] = useState(null); // 'w' | 'b' | null
  const searchId = useRef(0);
  const wrapRef = useRef(null);
  // Mirrors to avoid stale closures in timeouts/engine callbacks
  const playerColorRef = useRef('w');
  const thinkingRef = useRef(false);
  const resultRef = useRef(null);
  const tcRef = useRef(TIME_CONTROLS[0]);
  const flaggedRef = useRef(false);

  const setThinkingBoth = (v) => {
    thinkingRef.current = v;
    setThinking(v);
  };

  const level = useMemo(() => LEVELS.find((l) => l.id === levelId), [levelId]);
  const orientation = playerColor === 'w' ? 'white' : 'black';

  // Engine lifecycle
  useEffect(() => {
    const engine = getEngine();
    engine.onStatus = setEngineStatus;
    engine.onEval = (cp, mate) => {
      setEvalCp(cp ?? 0);
      setEvalMate(mate);
    };
    engine.init();
    return () => {
      searchId.current += 1;
      engine.stop();
    };
  }, []);

  // Fullscreen tracking
  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const flagFall = (side) => {
    if (resultRef.current || flaggedRef.current) return;
    flaggedRef.current = true;
    setClockOn(null);
    const r = side === playerColorRef.current
      ? 'Flag! Your time ran out — engine wins on time.'
      : 'Flag! Engine ran out of time — you win! 🎉';
    resultRef.current = r;
    setResult(r);
    if (r) { try { awardStar('playbook-review'); } catch { /* ignore */ } }
  };

  // Clock ticker — pauses while reviewing or after game end
  useEffect(() => {
    if (!clockOn || tcRef.current.base == null || resultRef.current || reviewing) return undefined;
    const side = clockOn;
    const iv = setInterval(() => {
      setClocks((prev) => {
        const next = Math.max(0, prev[side] - 100);
        if (next <= 0) setTimeout(() => flagFall(side), 0);
        return { ...prev, [side]: next };
      });
    }, 100);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clockOn, tcId, result, reviewing]);

  const addIncrement = (side) => {
    const inc = tcRef.current.inc;
    if (!inc) return;
    setClocks((prev) => ({ ...prev, [side]: prev[side] + inc * 1000 }));
  };

  const sync = () => {
    const g = gameRef.current;
    setFen(g.fen());
    setHistory(g.history());
    setVerboseHist(g.history({ verbose: true }));
    let r = null;
    if (g.isCheckmate()) {
      r = g.turn() === playerColorRef.current ? 'Checkmate — engine wins.' : 'Checkmate — you win! 🎉';
    } else if (g.isStalemate()) r = 'Draw — stalemate.';
    else if (g.isThreefoldRepetition()) r = 'Draw — threefold repetition.';
    else if (g.isInsufficientMaterial()) r = 'Draw — insufficient material.';
    else if (g.isDraw()) r = 'Draw.';
    resultRef.current = r;
    setResult(r);
    if (r) { try { awardStar('playbook-review'); } catch { /* ignore */ } }
  };

  const requestEngineMove = (fenSnapshot) => {
    const engine = getEngine();
    const lvl = LEVELS.find((l) => l.id === levelId) ?? LEVELS[1];
    const id = ++searchId.current;
    setThinkingBoth(true);
    const go = async () => {
      // Occasional deliberate blunder on easy levels (human-like)
      if (lvl.blunder > 0 && Math.random() < lvl.blunder) {
        const m = randomMove(fenSnapshot);
        await new Promise((r) => setTimeout(r, 350));
        if (searchId.current !== id) return;
        applyEngineMove(m, fenSnapshot);
        return;
      }
      try {
        const m = await engine.getBestMove(fenSnapshot, {
          depth: lvl.depth,
          movetime: lvl.movetime,
          skill: lvl.skill,
        });
        if (searchId.current !== id) return;
        applyEngineMove(m, fenSnapshot);
      } catch {
        if (searchId.current === id) setThinkingBoth(false);
      }
    };
    // Small delay so the player's move visibly lands first
    setTimeout(go, 300);
  };

  const applyEngineMove = (m, fenSnapshot) => {
    const g = gameRef.current;
    if (!m || g.fen() !== fenSnapshot || g.isGameOver()) {
      setThinkingBoth(false);
      return;
    }
    try {
      g.move({ from: m.from, to: m.to, promotion: m.promotion ?? 'q' });
      setLastMove([m.from, m.to]);
    } catch {
      /* ignore illegal engine replies */
    }
    setThinkingBoth(false);
    setReviewing(false);
    sync();
    addIncrement(gameRef.current.turn() === 'w' ? 'b' : 'w'); // mover just played
    if (!gameRef.current.isGameOver() && tcRef.current.base != null) {
      setClockOn(gameRef.current.turn());
    }
  };

  const handleMove = (from, to) => {
    const g = gameRef.current;
    if (resultRef.current || thinkingRef.current || g.turn() !== playerColorRef.current) return false;
    let move = null;
    try {
      move = g.move({ from, to });
    } catch {
      try {
        move = g.move({ from, to, promotion: 'q' });
      } catch {
        return false;
      }
    }
    void move;
    setHintArrow([]);
    setLastMove([from, to]);
    setReviewing(false);
    sync();
    addIncrement(playerColorRef.current);
    if (!g.isGameOver()) {
      if (tcRef.current.base != null) setClockOn(g.turn());
      requestEngineMove(g.fen());
    } else {
      setClockOn(null);
    }
    return true;
  };

  const newGame = (color = playerColorRef.current, tc = tcRef.current) => {
    searchId.current += 1;
    getEngine().stop();
    setThinkingBoth(false);
    flaggedRef.current = false;
    gameRef.current = new Chess();
    playerColorRef.current = color;
    setPlayerColor(color);
    tcRef.current = tc;
    setTcId(tc.id);
    const base = tc.base != null ? tc.base * 1000 : 600000;
    setClocks({ w: base, b: base });
    setClockOn(tc.base != null ? 'w' : null);
    setLastMove([]);
    setHintArrow([]);
    setEvalMate(null);
    setEvalCp(20);
    setHintsUsed(0);
    setReviewing(false);
    setReviewPly(0);
    sync();
    if (color === 'b') requestEngineMove(gameRef.current.fen());
  };

  // THE FLIP FIX: after swapping sides, wake the engine if it is its turn.
  const flipBoard = () => {
    const newColor = playerColorRef.current === 'w' ? 'b' : 'w';
    playerColorRef.current = newColor;
    setPlayerColor(newColor);
    const g = gameRef.current;
    if (!g.isGameOver() && !resultRef.current && g.turn() !== newColor && !thinkingRef.current) {
      requestEngineMove(g.fen());
    }
  };

  const undo = () => {
    searchId.current += 1;
    getEngine().stop();
    setThinkingBoth(false);
    flaggedRef.current = false;
    const g = gameRef.current;
    if (g.history().length === 0) return;
    g.undo();
    if (g.turn() !== playerColorRef.current && g.history().length > 0) g.undo();
    const h = g.history({ verbose: true });
    const last = h[h.length - 1];
    setLastMove(last ? [last.from, last.to] : []);
    setHintArrow([]);
    setReviewing(false);
    sync();
    if (tcRef.current.base != null && !resultRef.current) setClockOn(gameRef.current.turn());
  };

  const hint = async () => {
    const g = gameRef.current;
    if (resultRef.current || thinkingRef.current || g.turn() !== playerColorRef.current || reviewing) return;
    setThinkingBoth(true);
    try {
      const m = await getEngine().getBestMove(g.fen(), { depth: 8, movetime: 500, skill: 15 });
      setHintArrow([{ startSquare: m.from, endSquare: m.to, color: '#3b82f6' }]);
      setHintsUsed((n) => n + 1);
      setTimeout(() => setHintArrow([]), 3000);
    } finally {
      setThinkingBoth(false);
    }
  };

  // ---- Game review ----
  const startReview = () => {
    if (verboseHist.length === 0) return;
    setReviewPly(verboseHist.length);
    setReviewing(true);
  };
  const reviewFen = useMemo(() => {
    if (!reviewing) return null;
    const g = new Chess();
    for (let i = 0; i < Math.min(reviewPly, verboseHist.length); i++) {
      const m = verboseHist[i];
      try {
        g.move({ from: m.from, to: m.to, promotion: m.promotion });
      } catch {
        break;
      }
    }
    return g.fen();
  }, [reviewing, reviewPly, verboseHist]);
  const reviewMove = reviewing && reviewPly > 0 ? verboseHist[reviewPly - 1] : null;

  // ---- Fullscreen ----
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        const el = wrapRef.current ?? document.documentElement;
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      }
    } catch {
      /* fullscreen unsupported — ignore */
    }
  };

  const fsMovesRef = useRef(null);
  useEffect(() => {
    if (isFullscreen && !reviewing && fsMovesRef.current) {
      fsMovesRef.current.scrollTop = fsMovesRef.current.scrollHeight;
    }
  }, [history.length, isFullscreen, reviewing]);

  const reviewAt = (ply) => {
    if (ply >= verboseHist.length) {
      setReviewing(false);
      setReviewPly(verboseHist.length);
    } else {
      setReviewPly(ply);
      setReviewing(true);
    }
  };

  const statusText = () => {
    if (reviewing) return `Reviewing move ${reviewPly} / ${verboseHist.length}. Exit review to continue playing.`;
    if (result) return result;
    const g = gameRef.current;
    if (thinking) return 'Engine is thinking…';
    if (g.inCheck()) return g.turn() === playerColor ? 'Check! Your move.' : 'Check! Engine to move.';
    return g.turn() === playerColor ? 'Your move.' : 'Engine to move.';
  };

  const pairs = [];
  for (let i = 0; i < history.length; i += 2) {
    pairs.push({ n: i / 2 + 1, w: history[i], b: history[i + 1] });
  }

  const pct = evalToWhitePct(evalCp, evalMate);
  const liveArrows = hintArrow.length
    ? hintArrow
    : lastMove.length
      ? [{ startSquare: lastMove[0], endSquare: lastMove[1], color: '#eab308' }]
      : [];
  const arrows = reviewing && reviewMove
    ? [{ startSquare: reviewMove.from, endSquare: reviewMove.to, color: '#eab308' }]
    : liveArrows;
  const highlights = reviewing && reviewMove ? [reviewMove.from, reviewMove.to] : lastMove;
  const displayFen = reviewing && reviewFen ? reviewFen : fen;

  const resign = () => {
    searchId.current += 1;
    getEngine().stop();
    setThinkingBoth(false);
    setClockOn(null);
    resultRef.current = 'You resigned. Engine wins.';
    setResult(resultRef.current);
  };

  const tc = TIME_CONTROLS.find((t) => t.id === tcId) ?? TIME_CONTROLS[0];
  const engineColor = playerColor === 'w' ? 'b' : 'w';
  const topColor = orientation === 'white' ? 'b' : 'w';
  const bottomColor = orientation === 'white' ? 'w' : 'b';
  const clockRunning = (side) => !reviewing && !result && clockOn === side && tc.base != null;
  const nameFor = (side) => (side === playerColor
    ? `You ${side === 'w' ? '♔' : '♚'}`
    : `Stockfish ${level.name}`);
  const playerBar = (side) => (
    <div className="v2-playerbar">
      <span aria-hidden="true">{side === playerColor ? '👤' : '🤖'}</span>
      <span>{nameFor(side)} <em>{side === playerColor ? tc.name : level.elo}</em></span>
      {tc.base != null && (
        <span className={`v2-clock${clockRunning(side) ? ' v2-clock--active' : ''}${clocks[side] < 10000 ? ' v2-clock--low' : ''}`}>
          {fmtClock(clocks[side])}
        </span>
      )}
    </div>
  );

  const evalPlain = (() => {
    if (evalMate != null) return (evalMate > 0 ? playerColor === 'w' : playerColor === 'b') ? 'You can force checkmate!' : 'Engine threatens checkmate — be careful!';
    const mine = playerColor === 'w' ? evalCp : -evalCp;
    const a = Math.abs(mine);
    if (a < 60) return 'Even game — keep to your plan.';
    if (a < 180) return mine > 0 ? 'You have a small edge.' : 'Engine has a small edge.';
    if (a < 400) return mine > 0 ? 'You are ahead — trade pieces!' : 'Engine is ahead — look for tricks!';
    return mine > 0 ? 'You are winning!' : 'Engine is winning — don’t give up!';
  })();
  const youWon = !!result && /you win/i.test(result);

  return (
    <LessonPage
      progress={
        <>
          <SectionHeader title="Play the engine" sub={`${level.name} ${level.elo} • ${tc.name}`} action={engineStatus === 'ready' ? '⚡ Stockfish' : engineStatus === 'fallback' ? '🧠 Local engine' : '⏳ Loading engine…'} />
          <Progress value={history.length} max={Math.max(history.length, 20)} label={`${history.length} moves played`} />
        </>
      }
      coach={
        <>
          {result && <CelebrateSummary stars={youWon ? 3 : 1} xp={10} perfect={youWon && hintsUsed === 0} onNext={() => newGame(playerColorRef.current)} onRetry={startReview} />}
          <CoachCallout text={`${statusText()} ${evalPlain}`} avatar={thinking ? '⏳' : '♞'} />
          <Accordion
            items={[
              {
                title: 'New game',
                content: (
                  <>
                    <div className="v2-controlsrow">
                      <Chip label="♔ Play White" active={playerColor === 'w'} onClick={() => newGame('w')} />
                      <Chip label="♚ Play Black" active={playerColor === 'b'} onClick={() => newGame('b')} />
                    </div>
                    <span className="v2-fieldlabel">Time control</span>
                    <div className="v2-controlsrow">
                      {TIME_CONTROLS.map((t) => (
                        <Chip key={t.id} label={t.name} active={t.id === tcId} onClick={() => newGame(playerColorRef.current, t)} />
                      ))}
                    </div>
                    <span className="v2-fieldlabel">Engine strength</span>
                    <div className="v2-controlsrow">
                      {LEVELS.map((l) => (
                        <Chip
                          key={l.id}
                          label={`${l.name} ${l.elo}`}
                          active={l.id === levelId}
                          onClick={() => { setLevelId(l.id); newGame(playerColorRef.current); }}
                        />
                      ))}
                    </div>
                    <p className="v2-progress__label">{level.desc} Promotions auto-queen. Drag or tap a piece, then tap its destination.</p>
                  </>
                ),
              },
              {
                title: `Moves (${pairs.length})`,
                content: (
                  <div className="v2-moves">
                    {pairs.length === 0 && <span>No moves yet.</span>}
                    {pairs.map((p, pi) => (
                      <div key={p.n} className="v2-moverow">
                        <span className="v2-moven">{p.n}.</span>
                        <button type="button" className={`v2-movecell ${reviewing && reviewPly === pi * 2 + 1 ? 'v2-movecell--current' : ''}`} onClick={reviewing ? () => setReviewPly(pi * 2 + 1) : undefined}>{p.w}</button>
                        <button type="button" className={`v2-movecell ${reviewing && reviewPly === pi * 2 + 2 ? 'v2-movecell--current' : ''}`} onClick={reviewing && p.b ? () => setReviewPly(pi * 2 + 2) : undefined}>{p.b ?? ''}</button>
                      </div>
                    ))}
                  </div>
                ),
              },
            ]}
          />
        </>
      }
      board={
        <div ref={wrapRef}>
          {playerBar(topColor)}
          <div className="v2-evalrow">
            <div className="v2-evalbar" title="Engine evaluation">
              <div className="v2-evalfill" style={{ height: `${100 - pct}%` }} />
              <span className="v2-evlabel">
                {evalMate != null ? `#${Math.abs(evalMate)}` : (evalCp >= 0 ? '+' : '') + (evalCp / 100).toFixed(1)}
              </span>
            </div>
            <Board
              fen={displayFen}
              orientation={orientation}
              arrows={arrows}
              highlights={highlights}
              canDragPiece={reviewing ? undefined : ({ square }) => {
                if (result || thinking) return false;
                const g = gameRef.current;
                if (g.turn() !== playerColor) return false;
                const piece = g.get(square);
                return !!piece && piece.color === playerColor;
              }}
              onMove={reviewing ? undefined : handleMove}
              getLegalTargets={(sq) => {
                if (reviewing) return [];
                try {
                  return gameRef.current.moves({ square: sq, verbose: true }).map((m) => m.to);
                } catch {
                  return [];
                }
              }}
            />
          </div>
          {playerBar(bottomColor)}
        </div>
      }
      hint={result ?? null}
      controls={
        <>
          <div className="v2-controlsrow">
            <Button level="tonal" label="↩ Undo" onClick={undo} disabled={history.length === 0 || thinking} />
            <Button level="tonal" label="💡 Hint" onClick={hint} disabled={!!result || thinking || reviewing} />
            <Button level="tonal" label="🔄 Flip" onClick={flipBoard} />
            {!reviewing ? (
              <Button level="tonal" label="🔍 Review" onClick={startReview} disabled={history.length === 0} />
            ) : (
              <Button label="▶ Live" onClick={() => setReviewing(false)} />
            )}
            <Button level="tonal" label={isFullscreen ? '⛶ Exit full' : '⛶ Full'} onClick={toggleFullscreen} />
            <Button level="text" label="🏳 Resign" onClick={resign} disabled={!!result} />
          </div>
          {reviewing && (
            <div className="v2-controlsrow">
              <Button level="tonal" label="⏮ Start" onClick={() => setReviewPly(0)} />
              <Button level="tonal" label="← Prev" onClick={() => setReviewPly((p) => Math.max(0, p - 1))} />
              <Button level="tonal" label="Next →" onClick={() => setReviewPly((p) => Math.min(verboseHist.length, p + 1))} />
              <Button level="tonal" label="End ⏭" onClick={() => setReviewPly(verboseHist.length)} />
              <Button level="text" label="✕ Exit review" onClick={() => setReviewing(false)} />
            </div>
          )}
          {hintsUsed > 0 && <span className="v2-stepcount">• {hintsUsed} hint{hintsUsed > 1 ? 's' : ''}</span>}
        </>
      }
      list={null}
    />
  );
}


import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import Board from './Board.jsx';
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
  const searchId = useRef(0);
  const wrapRef = useRef(null);
  // Mirrors to avoid stale closures in timeouts/engine callbacks
  const playerColorRef = useRef('w');
  const thinkingRef = useRef(false);
  const resultRef = useRef(null);

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
    if (!g.isGameOver()) requestEngineMove(g.fen());
    return true;
  };

  const newGame = (color = playerColorRef.current) => {
    searchId.current += 1;
    getEngine().stop();
    setThinkingBoth(false);
    gameRef.current = new Chess();
    playerColorRef.current = color;
    setPlayerColor(color);
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
    resultRef.current = 'You resigned. Engine wins.';
    setResult(resultRef.current);
  };

  return (
    <div ref={wrapRef} className={`play-layout ${isFullscreen ? 'is-fullscreen' : ''} ${reviewing ? 'is-reviewing' : ''}`}>
      <div className="board-col">
        <div className="status-line">
          <span className={`dot ${thinking ? 'thinking' : 'idle'}`} />
          <strong>{statusText()}</strong>
          <span className={`engine-badge ${engineStatus}`}>
            {engineStatus === 'ready' ? '⚡ Stockfish' : engineStatus === 'fallback' ? '🧠 Local engine' : '⏳ Loading engine…'}
          </span>
        </div>
        {isFullscreen && (
          <div className="fs-bar">
            <button className="btn small-btn" onClick={undo} disabled={history.length === 0 || thinking}>↩ Undo</button>
            <button className="btn small-btn" onClick={hint} disabled={!!result || thinking || reviewing}>💡 Hint</button>
            <button className="btn small-btn" onClick={flipBoard}>🔄 Flip</button>
            {!reviewing ? (
              <button className="btn small-btn" onClick={startReview} disabled={history.length === 0}>🔍 Review</button>
            ) : (
              <button className="btn small-btn primary" onClick={() => setReviewing(false)}>▶ Live</button>
            )}
            <button className="btn small-btn" onClick={toggleFullscreen}>⛶ Exit</button>
          </div>
        )}
        <div className="eval-row">
          <div className="eval-bar" title="Engine evaluation">
            <div className="eval-fill" style={{ height: `${100 - pct}%` }} />
            <span className="eval-label">
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
        {reviewing && (
          <div className="step-controls">
            <button className="btn" onClick={() => setReviewPly(0)}>⏮ Start</button>
            <button className="btn" onClick={() => setReviewPly((p) => Math.max(0, p - 1))}>← Prev</button>
            <span className="step-count">Move {reviewPly} / {verboseHist.length}</span>
            <button className="btn" onClick={() => setReviewPly((p) => Math.min(verboseHist.length, p + 1))}>Next →</button>
            <button className="btn" onClick={() => setReviewPly(verboseHist.length)}>End ⏭</button>
            <button className="btn primary" onClick={() => setReviewing(false)}>✕ Exit review</button>
          </div>
        )}
      </div>

      <div className="side-col">
        <div className="card">
          <h3>New game</h3>
          <div className="btn-row">
            <button className={`btn ${playerColor === 'w' ? 'primary' : ''}`} onClick={() => newGame('w')}>♔ Play White</button>
            <button className={`btn ${playerColor === 'b' ? 'primary' : ''}`} onClick={() => newGame('b')}>♚ Play Black</button>
          </div>
          <label className="field-label">Engine strength</label>
          <div className="level-list">
            {LEVELS.map((l) => (
              <button
                key={l.id}
                className={`level ${l.id === levelId ? 'active' : ''}`}
                onClick={() => {
                  setLevelId(l.id);
                  newGame(playerColorRef.current);
                }}
              >
                <span className="level-name">{l.name} <em>{l.elo}</em></span>
                <span className="level-desc">{l.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <h3>Moves {hintsUsed > 0 && <span className="muted">• {hintsUsed} hint{hintsUsed > 1 ? 's' : ''}</span>}</h3>
          <div className={`moves ${reviewing ? 'review-clickable' : ''}`}>
            {pairs.length === 0 && <span className="muted">No moves yet.</span>}
            {pairs.map((p, pi) => (
              <div key={p.n} className="move-row">
                <span className="move-n">{p.n}.</span>
                <span
                  className={`move-cell ${reviewing && reviewPly === pi * 2 + 1 ? 'current' : ''}`}
                  onClick={reviewing ? () => setReviewPly(pi * 2 + 1) : undefined}
                >{p.w}</span>
                <span
                  className={`move-cell ${reviewing && reviewPly === pi * 2 + 2 ? 'current' : ''}`}
                  onClick={reviewing && p.b ? () => setReviewPly(pi * 2 + 2) : undefined}
                >{p.b ?? ''}</span>
              </div>
            ))}
          </div>
          <div className="btn-row wrap">
            <button className="btn" onClick={undo} disabled={history.length === 0 || thinking}>↩ Undo</button>
            <button className="btn" onClick={hint} disabled={!!result || thinking || reviewing}>💡 Hint</button>
            <button className="btn" onClick={flipBoard}>🔄 Flip</button>
            <button className="btn" onClick={toggleFullscreen}>{isFullscreen ? '⛶ Exit full' : '⛶ Fullscreen'}</button>
          </div>
          <div className="btn-row wrap">
            {!reviewing ? (
              <button className="btn" onClick={startReview} disabled={history.length === 0}>🔍 Review game</button>
            ) : (
              <button className="btn primary" onClick={() => setReviewing(false)}>▶ Back to live game</button>
            )}
            <button className="btn danger" onClick={resign} disabled={!!result}>🏳 Resign</button>
          </div>
          <p className="muted small">Promotions auto-queen. Drag or tap a piece, then tap its destination.</p>
        </div>
      </div>
    </div>
  );
}

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
  const searchId = useRef(0);

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

  const sync = () => {
    const g = gameRef.current;
    setFen(g.fen());
    setHistory(g.history());
    if (g.isCheckmate()) {
      setResult(g.turn() === playerColor ? 'Checkmate — engine wins.' : 'Checkmate — you win! 🎉');
    } else if (g.isStalemate()) setResult('Draw — stalemate.');
    else if (g.isThreefoldRepetition()) setResult('Draw — threefold repetition.');
    else if (g.isInsufficientMaterial()) setResult('Draw — insufficient material.');
    else if (g.isDraw()) setResult('Draw.');
    else setResult(null);
  };

  const requestEngineMove = (fenSnapshot) => {
    const engine = getEngine();
    const lvl = LEVELS.find((l) => l.id === levelId) ?? LEVELS[1];
    const id = ++searchId.current;
    setThinking(true);
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
        if (searchId.current === id) setThinking(false);
      }
    };
    // Small delay so the player's move visibly lands first
    setTimeout(go, 300);
  };

  const applyEngineMove = (m, fenSnapshot) => {
    const g = gameRef.current;
    if (!m || g.fen() !== fenSnapshot || g.isGameOver()) {
      setThinking(false);
      return;
    }
    try {
      g.move({ from: m.from, to: m.to, promotion: m.promotion ?? 'q' });
      setLastMove([m.from, m.to]);
    } catch {
      /* ignore illegal engine replies */
    }
    setThinking(false);
    sync();
  };

  const handleMove = (from, to) => {
    const g = gameRef.current;
    if (result || thinking || g.turn() !== playerColor) return false;
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
    sync();
    if (!g.isGameOver()) requestEngineMove(g.fen());
    return true;
  };

  const newGame = (color = playerColor) => {
    searchId.current += 1;
    getEngine().stop();
    setThinking(false);
    gameRef.current = new Chess();
    setPlayerColor(color);
    setLastMove([]);
    setHintArrow([]);
    setEvalMate(null);
    setEvalCp(20);
    setHintsUsed(0);
    setResult(null);
    setHistory([]);
    setFen(gameRef.current.fen());
    if (color === 'b') requestEngineMove(gameRef.current.fen());
  };

  const undo = () => {
    searchId.current += 1;
    getEngine().stop();
    setThinking(false);
    const g = gameRef.current;
    if (g.history().length === 0) return;
    g.undo();
    if (g.turn() !== playerColor && g.history().length > 0) g.undo();
    const h = g.history({ verbose: true });
    const last = h[h.length - 1];
    setLastMove(last ? [last.from, last.to] : []);
    setHintArrow([]);
    sync();
  };

  const hint = async () => {
    const g = gameRef.current;
    if (result || thinking || g.turn() !== playerColor) return;
    setThinking(true);
    try {
      const m = await getEngine().getBestMove(g.fen(), { depth: 8, movetime: 500, skill: 15 });
      setHintArrow([{ startSquare: m.from, endSquare: m.to, color: '#3b82f6' }]);
      setHintsUsed((n) => n + 1);
      setTimeout(() => setHintArrow([]), 3000);
    } finally {
      setThinking(false);
    }
  };

  const statusText = () => {
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
  const arrows = hintArrow.length
    ? hintArrow
    : lastMove.length
      ? [{ startSquare: lastMove[0], endSquare: lastMove[1], color: '#eab308' }]
      : [];

  return (
    <div className="play-layout">
      <div className="board-col">
        <div className="eval-row">
          <div className="eval-bar" title="Engine evaluation">
            <div className="eval-fill" style={{ height: `${100 - pct}%` }} />
            <span className="eval-label">
              {evalMate != null ? `#${Math.abs(evalMate)}` : (evalCp >= 0 ? '+' : '') + (evalCp / 100).toFixed(1)}
            </span>
          </div>
          <Board
            fen={fen}
            orientation={orientation}
            arrows={arrows}
            highlights={lastMove}
            canDragPiece={({ square }) => {
              if (result || thinking) return false;
              const g = gameRef.current;
              if (g.turn() !== playerColor) return false;
              const piece = g.get(square);
              return !!piece && piece.color === playerColor;
            }}
            onMove={handleMove}
            getLegalTargets={(sq) => gameRef.current.moves({ square: sq, verbose: true }).map((m) => m.to)}
          />
        </div>
        <div className="status-line">
          <span className={`dot ${thinking ? 'thinking' : 'idle'}`} />
          <strong>{statusText()}</strong>
          <span className={`engine-badge ${engineStatus}`}>
            {engineStatus === 'ready' ? '⚡ Stockfish' : engineStatus === 'fallback' ? '🧠 Local engine' : '⏳ Loading engine…'}
          </span>
        </div>
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
                  newGame(playerColor);
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
          <div className="moves">
            {pairs.length === 0 && <span className="muted">No moves yet.</span>}
            {pairs.map((p) => (
              <div key={p.n} className="move-row">
                <span className="move-n">{p.n}.</span>
                <span>{p.w}</span>
                <span>{p.b ?? ''}</span>
              </div>
            ))}
          </div>
          <div className="btn-row wrap">
            <button className="btn" onClick={undo} disabled={history.length === 0}>↩ Undo</button>
            <button className="btn" onClick={hint} disabled={!!result || thinking}>💡 Hint</button>
            <button className="btn" onClick={() => setPlayerColor((c) => (c === 'w' ? 'b' : 'w'))}>🔄 Flip</button>
            <button className="btn danger" onClick={() => setResult('You resigned. Engine wins.')}>🏳 Resign</button>
          </div>
          <p className="muted small">Promotions auto-queen. Drag or tap a piece, then tap its destination.</p>
        </div>
      </div>
    </div>
  );
}

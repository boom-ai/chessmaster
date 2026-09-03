import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import Board from './Board.jsx';
import { FAMOUS_GAMES, getGame, gameEra } from '../data/games/index.js';

function replay(game, n) {
  const g = new Chess();
  const sans = [];
  for (let i = 0; i < Math.min(n, game.moves.length); i++) {
    const u = game.moves[i][0];
    try {
      sans.push(g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san);
    } catch {
      break;
    }
  }
  return { fen: g.fen(), sans };
}

function loadStudied() {
  try {
    return JSON.parse(localStorage.getItem('chessmaster-games') ?? '{}');
  } catch {
    return {};
  }
}

function resultBadge(r) {
  if (r === '1-0') return '1–0';
  if (r === '0-1') return '0–1';
  return '½–½';
}

export default function FamousGames() {
  const [gameId, setGameId] = useState(FAMOUS_GAMES[0].id);
  const [step, setStep] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [auto, setAuto] = useState(false);
  const [query, setQuery] = useState('');
  const [eraFilter, setEraFilter] = useState('All');
  const [studied, setStudied] = useState(loadStudied);
  const autoTimer = useRef(null);

  const game = getGame(gameId);
  const { fen, sans } = useMemo(() => replay(game, step), [game, step]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAMOUS_GAMES.filter((g) => {
      if (eraFilter !== 'All' && gameEra(g.year) !== eraFilter) return false;
      if (!q) return true;
      return (
        g.white.toLowerCase().includes(q) ||
        g.black.toLowerCase().includes(q) ||
        g.event.toLowerCase().includes(q) ||
        g.opening.toLowerCase().includes(q) ||
        String(g.year).includes(q)
      );
    });
  }, [query, eraFilter]);

  const eras = useMemo(() => ['All', ...new Set(FAMOUS_GAMES.map((g) => gameEra(g.year)))], []);
  const studiedCount = Object.keys(studied).length;

  const selectGame = (id) => {
    setGameId(id);
    setStep(0);
    setAuto(false);
    setFlipped(false);
  };

  useEffect(() => {
    if (autoTimer.current) clearInterval(autoTimer.current);
    if (auto) {
      if (step >= game.moves.length) {
        setAuto(false);
        return;
      }
      autoTimer.current = setInterval(() => {
        setStep((s) => {
          if (s >= game.moves.length) {
            setAuto(false);
            return s;
          }
          return s + 1;
        });
      }, 1300);
    }
    return () => {
      if (autoTimer.current) clearInterval(autoTimer.current);
    };
  }, [auto, game.moves.length, step]);

  const toggleStudied = () => {
    setStudied((prev) => {
      const next = { ...prev };
      if (next[gameId]) delete next[gameId];
      else next[gameId] = true;
      try {
        localStorage.setItem('chessmaster-games', JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const lastMove = step > 0 ? game.moves[step - 1][0] : null;
  const highlights = lastMove ? [lastMove.slice(0, 2), lastMove.slice(2, 4)] : [];
  const arrows = lastMove
    ? [{ startSquare: lastMove.slice(0, 2), endSquare: lastMove.slice(2, 4), color: '#eab308' }]
    : [];
  const currentNote = step > 0 ? game.moves[step - 1][1] : null;
  const currentSan = step > 0 ? sans[step - 1] : null;
  const gameIndex = FAMOUS_GAMES.findIndex((g) => g.id === gameId);

  return (
    <div className="learn-layout">
      <aside className="open-list games-list-col">
        <h3>Library <span className="muted small">{studiedCount}/100 studied</span></h3>
        <input
          className="search-box"
          type="text"
          placeholder="Search player, event, opening…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="btn-row wrap era-row">
          {eras.map((e) => (
            <button key={e} className={`btn small-btn ${eraFilter === e ? 'primary' : ''}`} onClick={() => setEraFilter(e)}>
              {e === 'All' ? 'All' : e.replace(' Era', '').replace('Cold War Duels', 'Cold War').replace('Modern Masters', 'Modern').replace('Soviet School', 'Soviet')}
            </button>
          ))}
        </div>
        <div className="games-scroll">
          {filtered.length === 0 && <p className="muted small">No games match.</p>}
          {filtered.map((g) => (
            <button key={g.id} className={`game-item ${g.id === gameId ? 'active' : ''}`} onClick={() => selectGame(g.id)}>
              <span className="game-check">{studied[g.id] ? '✅' : `${FAMOUS_GAMES.indexOf(g) + 1}.`}</span>
              <span className="game-main">
                <span className="game-players">{g.white} – {g.black}</span>
                <span className="muted small">{g.event} · {g.year} · {g.opening}</span>
              </span>
              <span className={`result-pill r-${g.result.replace(/[^01]/g, '') || 'draw'}`}>{resultBadge(g.result)}</span>
            </button>
          ))}
        </div>
      </aside>

      <div className="board-col">
        <Board
          fen={fen}
          orientation={flipped ? 'black' : 'white'}
          arrows={arrows}
          highlights={highlights}
          getLegalTargets={() => []}
        />
        <div className="step-controls">
          <button className="btn" onClick={() => { setAuto(false); setStep(0); }}>⏮ Start</button>
          <button className="btn" onClick={() => { setAuto(false); setStep((s) => Math.max(0, s - 1)); }}>← Prev</button>
          <span className="step-count">Move {step} / {game.moves.length}</span>
          <button className="btn" onClick={() => { setAuto(false); setStep((s) => Math.min(game.moves.length, s + 1)); }}>Next →</button>
          <button className={`btn ${auto ? 'primary' : ''}`} onClick={() => { if (step >= game.moves.length) setStep(0); setAuto((a) => !a); }}>
            {auto ? '⏸ Pause' : '▶ Watch'}
          </button>
          <button className="btn" onClick={() => setFlipped((f) => !f)}>🔄 Flip</button>
        </div>
        <div className="move-strip">
          {sans.map((s, i) => (
            <button key={i} className={`move-chip clickable ${i === step - 1 ? 'current' : ''}`} onClick={() => { setAuto(false); setStep(i + 1); }}>
              {i % 2 === 0 ? `${i / 2 + 1}. ` : ''}{s}
            </button>
          ))}
        </div>
      </div>

      <div className="side-col">
        <div className="card">
          <h2>{game.white} – {game.black}</h2>
          <p className="muted">{game.event} · {game.site} · {game.year} · {game.eco} {game.opening}</p>
          <p className="result-line"><strong>{resultBadge(game.result)}</strong> · {game.moves.length} plies · <span className="pill small">{gameEra(game.year)}</span></p>
          <p className="coach-text"><em>{game.tagline}</em></p>
          <p className="coach-text">{game.story}</p>
        </div>

        <div className="card coach">
          {step === 0 ? (
            <>
              <h3>📖 How to study</h3>
              <p>Press <strong>Watch</strong> or step through with Next. Every move carries a coaching note explaining <em>why</em> it was played — plans, threats, mistakes and all.</p>
            </>
          ) : (
            <>
              <h3>
                <span className="coach-move">{Math.ceil(step / 2)}{step % 2 === 1 ? '.' : '…'} {currentSan}</span>
              </h3>
              <p>{currentNote}</p>
            </>
          )}
          {step >= game.moves.length && (
            <div className="btn-row wrap">
              <button className="btn primary" onClick={toggleStudied}>
                {studied[gameId] ? '✅ Studied!' : 'Mark as studied'}
              </button>
              {gameIndex < FAMOUS_GAMES.length - 1 && (
                <button className="btn" onClick={() => selectGame(FAMOUS_GAMES[gameIndex + 1].id)}>Next game →</button>
              )}
            </div>
          )}
        </div>

        <div className="card">
          <h3>Navigate</h3>
          <div className="btn-row">
            <button className="btn" disabled={gameIndex === 0} onClick={() => selectGame(FAMOUS_GAMES[gameIndex - 1].id)}>← Prev game</button>
            <button className="btn" disabled={gameIndex === FAMOUS_GAMES.length - 1} onClick={() => selectGame(FAMOUS_GAMES[gameIndex + 1].id)}>Next game →</button>
          </div>
          <p className="muted small" style={{ marginTop: 8 }}>
            Game {gameIndex + 1} of 100 · {sans.filter((s) => s.includes('x')).length} captures · {sans.filter((s) => s.includes('+') || s.includes('#')).length} checks
          </p>
        </div>
      </div>
    </div>
  );
}

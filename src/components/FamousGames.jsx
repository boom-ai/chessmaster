import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import Board from './Board.jsx';
import { Button, SectionHeader, Progress, CoachCallout, Chip, SearchField, Accordion } from '../v2/ui/Kit.jsx';
import { LessonPage, UpNextDrawer, CelebrateSummary } from '../v2/lesson/LessonPage.jsx';
import { FAMOUS_GAMES, getGame, gameEra } from '../data/games/index.js';
import { awardStar } from '../utils/cmProgressStore.js';
import { readAutoplayMs } from '../hooks/cmDisplayMode.js';

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
      }, readAutoplayMs(1300));
    }
    return () => {
      if (autoTimer.current) clearInterval(autoTimer.current);
    };
  }, [auto, game.moves.length, step]);

  const toggleStudied = () => {
    if (!studied[gameId]) {
      try { awardStar('annotated-classics'); } catch { /* ignore */ }
    }
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

  const handleWatch = () => {
    if (step >= game.moves.length) setStep(0);
    setAuto((a) => !a);
  };

  const handleNextGame = () => {
    if (gameIndex < FAMOUS_GAMES.length - 1) selectGame(FAMOUS_GAMES[gameIndex + 1].id);
  };

  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerItems = filtered.map((g) => ({
    id: g.id,
    title: `${FAMOUS_GAMES.indexOf(g) + 1}. ${g.white} – ${g.black}`,
    done: !!studied[g.id],
  }));

  return (
    <LessonPage
      progress={
        <>
          <SectionHeader title={`${game.white} – ${game.black}`} sub={`${game.event} · ${game.year} · ${game.opening}`} action={`${resultBadge(game.result)} · ${studiedCount}/${FAMOUS_GAMES.length} studied`} />
          <Progress value={step} max={game.moves.length} label={`Move ${step} of ${game.moves.length}`} />
        </>
      }
      coach={
        <>
          {step >= game.moves.length && studied[gameId] && (
            <CelebrateSummary stars={3} xp={10} perfect onNext={handleNextGame} onRetry={() => { setAuto(false); setStep(0); }} />
          )}
          <CoachCallout
            text={step === 0 ? 'Press Watch or step through with Next. Every move carries a coaching note explaining why it was played.' : (currentNote ?? '')}
            avatar="📖"
          />
          <Accordion
            items={[
              { title: 'Game info', content: (<p className="v2-prose">{game.tagline} {game.story}</p>) },
              {
                title: 'Navigate',
                content: (
                  <div className="v2-controlsrow">
                    <Button level="tonal" label="← Prev game" onClick={() => gameIndex > 0 && selectGame(FAMOUS_GAMES[gameIndex - 1].id)} />
                    <Button label="Next game →" onClick={handleNextGame} />
                    {!studied[gameId] && step >= game.moves.length && (
                      <Button level="tonal" label="✓ Mark as studied" onClick={toggleStudied} />
                    )}
                  </div>
                ),
              },
            ]}
          />
        </>
      }
      board={
        <Board
          fen={fen}
          orientation={flipped ? 'black' : 'white'}
          arrows={arrows}
          highlights={highlights}
          getLegalTargets={() => []}
        />
      }
      hint={step === 0 ? 'Starting position — press Watch.' : (currentSan ? `Last move: ${currentSan}` : null)}
      controls={
        <>
          <div className="v2-controlsrow">
            <Button level="tonal" label="⏮ Start" onClick={() => { setAuto(false); setStep(0); }} />
            <Button level="tonal" label="← Prev" onClick={() => { setAuto(false); setStep((s) => Math.max(0, s - 1)); }} />
            <Button label="Next →" onClick={() => { setAuto(false); setStep((s) => Math.min(game.moves.length, s + 1)); }} />
            <Button level="tonal" label={auto ? '⏸ Pause' : '▶ Watch'} onClick={() => { if (step >= game.moves.length) setStep(0); setAuto((a) => !a); }} />
            <Button level="tonal" label="🔄 Flip" onClick={() => setFlipped((f) => !f)} />
            <Button level="text" label="☰ Library" onClick={() => setDrawerOpen(true)} />
          </div>
          <div className="v2-controlsrow">
            {sans.map((s, i) => (
              <Chip key={i} label={`${i % 2 === 0 ? `${i / 2 + 1}. ` : ''}${s}`} active={i === step - 1} onClick={() => { setAuto(false); setStep(i + 1); }} />
            ))}
          </div>
        </>
      }
      list={
        <>
          <SectionHeader title="Library" sub="100 classics, every move explained." action={`${studiedCount}/100 studied`} />
          <SearchField value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search player, event, opening…" />
          <div className="v2-controlsrow">
            {eras.map((e) => (
              <Chip key={e} label={e === 'All' ? 'All' : e.replace(' Era', '').replace('Cold War Duels', 'Cold War').replace('Modern Masters', 'Modern').replace('Soviet School', 'Soviet')} active={eraFilter === e} onClick={() => setEraFilter(e)} />
            ))}
          </div>
          <UpNextDrawer
            open={drawerOpen}
            items={drawerItems}
            onSelect={(id) => { selectGame(id); setDrawerOpen(false); }}
            onClose={() => setDrawerOpen(false)}
          />
        </>
      }
    />
  );
}

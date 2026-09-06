import { useEffect, useMemo, useState } from 'react';
import PlayVsEngine from './components/PlayVsEngine.jsx';
import PuzzleTrainer from './components/PuzzleTrainer.jsx';
import OpeningsTeacher from './components/OpeningsTeacher.jsx';
import StrategyCoach from './components/StrategyCoach.jsx';
import FamousGames from './components/FamousGames.jsx';
import Guide from './components/Guide.jsx';
import { CmStartHere } from './components/CmStartHere.jsx';
import { CmNextStep } from './components/CmNextStep.jsx';
import { CmDisplaySettings } from './components/CmDisplaySettings.jsx';
import UxThemeToggle from './ux-theme/UxThemeToggle.jsx';
import { UxSectionHeader } from './ux-section/UxSection.jsx';
import { CM_PATH } from './data/cmPathData.js';
import { useCmDisplayMode } from './hooks/cmDisplayMode.js';
import { getInitialTheme, resolveTheme, THEME_KEY } from './ux-theme/uxThemeInit.js';
import { getCompletedIds } from './utils/cmProgressStore.js';
import { speakText } from './utils/cmSpeech.js';
import './App.css';

const TABS = [
  { id: 'start', label: '🏠 Start Here', desc: 'Your 9-step learning path' },
  { id: 'play', label: '♞ Play Engine', desc: 'Practice games vs the computer' },
  { id: 'puzzles', label: '🧩 Puzzles', desc: '510 mates & tactics' },
  { id: 'learn', label: '🎓 Openings Coach', desc: '100 repertoires with arrows' },
  { id: 'middlegame', label: '⚔️ Middlegame', desc: '100 plans, traps & tactics' },
  { id: 'endgame', label: '♔ Endgame', desc: '100 techniques with drills' },
  { id: 'games', label: '🏛 Famous Games', desc: '100 classics, every move explained' },
  { id: 'guide', label: '📚 Guide', desc: 'Notation, pieces & rules' },
];

const PATH_TO_TAB = {
  Guide: 'guide',
  Puzzles: 'puzzles',
  Openings: 'learn',
  Endgame: 'endgame',
  Middlegame: 'middlegame',
  FamousGames: 'games',
  Play: 'play',
};

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '{}');
  } catch {
    return {};
  }
}

// Steps completed via real activity in each section + earned stars.
function computeCompletedIds() {
  const ids = new Set(getCompletedIds());
  const op = readJson('chessmaster-openings');
  if (Object.keys(op).length > 0) ids.add('opening-habits');
  if (Object.keys(op).length >= 3) ids.add('tiny-repertoire');
  const st = readJson('chessmaster-strategy');
  const keys = Object.keys(st);
  if (keys.some((k) => k.startsWith('m-'))) ids.add('middlegame-toolkit');
  if (keys.some((k) => k.startsWith('e-'))) ids.add('key-endgames');
  const pz = readJson('chessmaster-puzzles');
  const solved = Object.values(pz).filter((v) => v?.solved).length;
  if (solved > 0) ids.add('mate-in-one');
  if (solved >= 5) ids.add('first-tactics');
  const gm = readJson('chessmaster-games');
  if (Object.keys(gm).length > 0) ids.add('annotated-classics');
  return [...ids];
}

export default function App() {
  const [tab, setTab] = useState('start');
  const [menuOpen, setMenuOpen] = useState(false);
  const dm = useCmDisplayMode();

  // Manual theme (light/dark/system) wins over OS; applied to <html>.
  useEffect(() => {
    const apply = () => {
      try {
        const stored = window.localStorage.getItem(THEME_KEY);
        const mode = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : getInitialTheme();
        document.documentElement.dataset.theme = resolveTheme(mode);
      } catch {
        /* ignore */
      }
    };
    apply();
    window.addEventListener('cm-theme-change', apply);
    window.addEventListener('storage', apply);
    return () => {
      window.removeEventListener('cm-theme-change', apply);
      window.removeEventListener('storage', apply);
    };
  }, []);

  const go = (id) => {
    setTab(id);
    setMenuOpen(false);
    window.scrollTo(0, 0);
  };

  const completedIds = useMemo(computeCompletedIds, [tab]);

  useEffect(() => {
    if (!menuOpen) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const modeClass = dm.mode === 'standard' ? '' : `cm-type-${dm.mode}`;

  return (
    <div className={`app ${modeClass}`}>
      <header className="topbar">
        <div className="brand">
          <span className="brand-icon">♞</span>
          <div>
            <h1>ChessMaster</h1>
            <p>Learn chess step by step • Ages 10 to 80+</p>
          </div>
        </div>
        <button
          className="menu-btn"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
        <nav className="tabs">
          {TABS.map((t) => (
            <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => go(t.id)} title={t.desc}>
              {t.label}
            </button>
          ))}
        </nav>
        <UxThemeToggle className="topbar-theme" />
      </header>
      <div
        className={`drawer-backdrop ${menuOpen ? 'open' : ''}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden={!menuOpen}
      />
      <nav className={`drawer ${menuOpen ? 'open' : ''}`} aria-label="Sections">
        <div className="drawer-head">
          <span className="brand-icon small">♞</span>
          <strong>ChessMaster</strong>
        </div>
        {TABS.map((t) => (
          <button key={t.id} className={`drawer-item ${tab === t.id ? 'active' : ''}`} onClick={() => go(t.id)}>
            <span className="drawer-label">{t.label}</span>
            <span className="drawer-desc">{t.desc}</span>
          </button>
        ))}
        <p className="muted small drawer-foot">Engine runs offline in your browser.</p>
      </nav>
      <main className="main">
        {tab === 'start' && (
          <div className="side-col" style={{ maxWidth: 860, marginInline: 'auto' }}>
            <UxSectionHeader
              eyebrow="Start here"
              title="Welcome! Start here"
              sub="Nine small steps take you from your first piece to your first win. Do them in order."
              meta={`${completedIds.length} of ${CM_PATH.length} done`}
            />
            <CmStartHere
              steps={CM_PATH}
              completedIds={completedIds}
              onChoose={(target) => go(PATH_TO_TAB[target] ?? 'guide')}
            />
            <CmNextStep
              completedIds={completedIds}
              onGo={(stepId) => {
                const step = CM_PATH.find((s) => s.id === stepId);
                go(step ? (PATH_TO_TAB[step.targetTab] ?? 'guide') : 'guide');
              }}
            />
            <div className="card">
              <h3>Make it comfortable</h3>
              <CmDisplaySettings
                value={{ mode: dm.mode }}
                onChange={dm.setMode}
                onSpeak={() => speakText('Welcome to ChessMaster. Start with step one.')}
              />
            </div>
          </div>
        )}
        {tab === 'play' && <PlayVsEngine />}
        {tab === 'puzzles' && <PuzzleTrainer />}
        {tab === 'learn' && <OpeningsTeacher />}
        {tab === 'middlegame' && <StrategyCoach key="middlegame" phase="middlegame" />}
        {tab === 'endgame' && <StrategyCoach key="endgame" phase="endgame" />}
        {tab === 'games' && <FamousGames />}
        {tab === 'guide' && <Guide />}
      </main>
      <footer className="footer">
        <span>Engine: Stockfish 10 (WASM, runs fully offline in your browser) with a built-in fallback • Positions & lines verified with chess.js</span>
      </footer>
    </div>
  );
}

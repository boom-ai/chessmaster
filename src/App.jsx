import { useEffect, useState } from 'react';
import PlayVsEngine from './components/PlayVsEngine.jsx';
import PuzzleTrainer from './components/PuzzleTrainer.jsx';
import OpeningsTeacher from './components/OpeningsTeacher.jsx';
import FamousGames from './components/FamousGames.jsx';
import './App.css';

const TABS = [
  { id: 'play', label: '♞ Play Engine', desc: 'Challenge Stockfish at 5 levels' },
  { id: 'puzzles', label: '🧩 Puzzles', desc: '510 mates & tactics' },
  { id: 'learn', label: '🎓 Openings Coach', desc: '12 repertoires with arrows' },
  { id: 'games', label: '🏛 Famous Games', desc: '100 classics, every move explained' },
];

export default function App() {
  const [tab, setTab] = useState('play');
  const [menuOpen, setMenuOpen] = useState(false);

  const go = (id) => {
    setTab(id);
    setMenuOpen(false);
  };

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

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-icon">♞</span>
          <div>
            <h1>ChessMaster</h1>
            <p>Play the engine • Solve tactics • Master openings • Study 100 classics</p>
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
        {tab === 'play' && <PlayVsEngine />}
        {tab === 'puzzles' && <PuzzleTrainer />}
        {tab === 'learn' && <OpeningsTeacher />}
        {tab === 'games' && <FamousGames />}
      </main>
      <footer className="footer">
        <span>Engine: Stockfish 10 (WASM, runs fully offline in your browser) with a built-in fallback • Positions & lines verified with chess.js</span>
      </footer>
    </div>
  );
}

import { useState } from 'react';
import PlayVsEngine from './components/PlayVsEngine.jsx';
import PuzzleTrainer from './components/PuzzleTrainer.jsx';
import OpeningsTeacher from './components/OpeningsTeacher.jsx';
import FamousGames from './components/FamousGames.jsx';
import './App.css';

const TABS = [
  { id: 'play', label: '♞ Play Engine', desc: 'Challenge Stockfish at 5 levels' },
  { id: 'puzzles', label: '🧩 Puzzles', desc: '10 hand-picked mates & tactics' },
  { id: 'learn', label: '🎓 Openings Coach', desc: '12 repertoires with arrows' },
  { id: 'games', label: '🏛 Famous Games', desc: '100 classics, every move explained' },
];

export default function App() {
  const [tab, setTab] = useState('play');
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
        <nav className="tabs">
          {TABS.map((t) => (
            <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)} title={t.desc}>
              {t.label}
            </button>
          ))}
        </nav>
      </header>
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

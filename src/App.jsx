import { useEffect, useMemo, useState } from 'react';
import PlayVsEngine from './components/PlayVsEngine.jsx';
import PuzzleTrainer from './components/PuzzleTrainer.jsx';
import OpeningsTeacher from './components/OpeningsTeacher.jsx';
import StrategyCoach from './components/StrategyCoach.jsx';
import FamousGames from './components/FamousGames.jsx';
import Guide from './components/Guide.jsx';
import { AppShell, FirstRunWelcome } from './v2/shell/AppShell.jsx';
import { TABS } from './v2/shell/tabs.js';
import { ThemeToggle } from './v2/shell/ThemeToggle.jsx';
import { Button, Card, SectionHeader, Progress, Chip, Stars } from './v2/ui/Kit.jsx';
import { CM_PATH } from './data/cmPathData.js';
import { useCmDisplayMode } from './hooks/cmDisplayMode.js';
import { CM_AUTOPLAY_MS } from './hooks/cmDisplayMode.js';
import { getCompletedIds } from './utils/cmProgressStore.js';
import { speakText, supportsTTS } from './utils/cmSpeech.js';
import { getInitialTheme, resolveTheme, THEME_KEY } from './ux-theme/uxThemeInit.js';

const PATH_TO_TAB = {
  Guide: 'guide',
  Puzzles: 'puzzles',
  Openings: 'openings',
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

function nextStep(completedIds) {
  return CM_PATH.find((s) => !completedIds.includes(s.id)) ?? CM_PATH[CM_PATH.length - 1];
}

export default function App() {
  const [tab, setTab] = useState('start');
  const [theme, setTheme] = useState(() => getInitialTheme());
  const [welcomed, setWelcomed] = useState(() => {
    try {
      return window.localStorage.getItem('cm-first-run-v1') === 'done';
    } catch {
      return true;
    }
  });
  const dm = useCmDisplayMode();

  const go = (id) => {
    setTab(id);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    try {
      document.documentElement.dataset.theme = resolveTheme(theme);
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const markWelcomed = () => {
    try {
      window.localStorage.setItem('cm-first-run-v1', 'done');
    } catch {
      /* ignore */
    }
    setWelcomed(true);
  };

  const completedIds = useMemo(computeCompletedIds, [tab, dm.mode]);
  const upcoming = nextStep(completedIds);
  const ageClass = dm.mode === 'standard' ? '' : `v2-age-${dm.mode}`;

  return (
    <div className={ageClass}>
      <AppShell
        tabs={TABS}
        activeId={tab === 'openings' ? 'openings' : tab}
        onNavigate={(id) => go(id)}
        themeToggle={<ThemeToggle theme={theme} onToggle={(next) => setTheme(next)} />}
      >
        {!welcomed ? (
          <FirstRunWelcome
            onStart={() => { markWelcomed(); go('start'); }}
            onGuidedTour={() => { markWelcomed(); go('start'); }}
          />
        ) : tab === 'start' ? (
          <div className="v2-container v2-stack">
            <SectionHeader
              title="Welcome! Start here"
              sub="Nine small steps take you from your first piece to your first win."
              action={`${completedIds.length} of ${CM_PATH.length} done`}
            />
            <Progress value={completedIds.length} max={CM_PATH.length} label={`${completedIds.length} of ${CM_PATH.length} steps`} />
            <Card
              title={`Next: ${upcoming.titlePlain}`}
              sub={upcoming.oneLine}
              meta="Continue"
              onClick={() => go(PATH_TO_TAB[upcoming.targetTab] ?? 'guide')}
            />
            <div className="v2-cluster">
              {CM_PATH.map((s, i) => (
                <Card
                  key={s.id}
                  title={`${i + 1}. ${s.titlePlain}${completedIds.includes(s.id) ? ' ✓' : ''}`}
                  sub={s.oneLine}
                  meta={s.action}
                  onClick={() => go(PATH_TO_TAB[s.targetTab] ?? 'guide')}
                />
              ))}
            </div>
            <SectionHeader title="Make it comfortable" sub="Bigger text, slower moves, or read-aloud — pick what suits you." />
            <div className="v2-cluster">
              {['kid', 'standard', 'senior'].map((m) => (
                <Chip key={m} label={m === 'kid' ? '🧒 Kid' : m === 'senior' ? '👴 Senior' : 'Standard'} active={dm.mode === m} onClick={() => dm.setMode(m)} />
              ))}
            </div>
            <p className="v2-progress__label">
              {dm.mode === 'senior' ? 'Senior: bigger text, slower moves.' : dm.mode === 'kid' ? 'Kid: roomy text, quicker pace.' : 'Standard pace.'} Watch speed: {Math.round((CM_AUTOPLAY_MS[dm.mode] ?? 3000) / 1000)}s per move.
            </p>
            {supportsTTS() && (
              <Button level="tonal" label="🔊 Hear welcome" onClick={() => speakText('Welcome to ChessMaster. Start with step one.')} />
            )}
            <p className="v2-progress__label"><Stars earned={Math.min(completedIds.length, 3)} total={3} /> Keep going — stars grow as you finish steps.</p>
          </div>
        ) : (
          <>
            {tab === 'play' && <PlayVsEngine />}
            {tab === 'puzzles' && <PuzzleTrainer />}
            {tab === 'openings' && <OpeningsTeacher />}
            {tab === 'middlegame' && <StrategyCoach key="middlegame" phase="middlegame" />}
            {tab === 'endgame' && <StrategyCoach key="endgame" phase="endgame" />}
            {tab === 'games' && <FamousGames />}
            {tab === 'guide' && <Guide />}
          </>
        )}
      </AppShell>
    </div>
  );
}

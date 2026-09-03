// Extract the 100 famous games: PGN -> verified UCI + metadata.
// Usage: node scripts/extract-games.mjs > /tmp/games.txt
import fs from 'node:fs';
import path from 'node:path';
import { Chess } from 'chess.js';

const dir = '/tmp/pgns/all';

// {id, file, idx} or {id, hand:[uci...]}
const GAMES = [
  { id: 'opera-1858', hand: ['e2e4','e7e5','g1f3','d7d6','d2d4','c8g4','d4e5','g4f3','d1f3','d6e5','f1c4','g8f6','f3b3','d8e7','b1c3','c7c6','c1g5','b7b5','c3b5','c6b5','c4b5','b8d7','e1c1','a8d8','d1d7','d8d7','h1d1','e7e6','b5d7','f6d7','b3b8','d7b8','d1d8'] },
  { id: 'immortal-1851', hand: ['e2e4','e7e5','f2f4','e5f4','f1c4','d8h4','e1f1','b7b5','c4b5','g8f6','g1f3','h4h6','d2d3','f6h5','f3h4','h6g5','h4f5','c7c6','g2g4','h5f6','h1g1','c6b5','h2h4','g5g6','h4h5','g6g5','d1f3','f6g8','c1f4','g5f6','b1c3','f8c5','c3d5','f6b2','f4d6','c5g1','e4e5','b2a1','f1e2','b8a6','f5g7','e8d8','f3f6','g8f6','d6e7'] },
  { id: 'evergreen-1852', hand: ['e2e4','e7e5','g1f3','b8c6','f1c4','f8c5','b2b4','c5b4','c2c3','b4a5','d2d4','e5d4','e1g1','d4d3','d1b3','d8f6','e4e5','f6g6','f1e1','g8e7','c1a3','b7b5','b3b5','a8b8','b5a4','a5b6','b1d2','c8b7','d2e4','g6f5','c4d3','f5h5','e4f6','g7f6','e5f6','h8g8','a1d1','h5f3','e1e7','c6e7','a4d7','e8d7','d3f5','d7e8','f5d7','e8f8','a3e7'] },
  { id: 'lasker-thomas-1912', hand: ['d2d4','e7e6','g1f3','f7f5','b1c3','g8f6','c1g5','f8e7','g5f6','e7f6','e2e4','f5e4','c3e4','b7b6','f3e5','e8g8','f1d3','c8b7','d1h5','d8e7','h5h7','g8h7','e4f6','h7h6','e5g4','h6g5','h2h4','g5f4','g2g3','f4f3','d3e2','f3g2','h1h2','g2g1','e1c1'] },
  { id: 'game-of-century-1956', hand: ['g1f3','g8f6','c2c4','g7g6','b1c3','f8g7','d2d4','e8g8','c1f4','d7d5','d1b3','d5c4','b3c4','c7c6','e2e4','b8d7','a1d1','d7b6','c4c5','c8g4','f4g5','b6a4','c5a3','a4c3','b2c3','f6e4','g5e7','d8b6','f1c4','e4c3','e7c5','f8e8','e1f1','g4e6','c5b6','e6c4','f1g1','c3e2','g1f1','e2d4','f1g1','d4e2','g1f1','e2c3','f1g1','a7b6','a3b4','a8a4','b4b6','c3d1','h2h3','a4a2','g1h2','d1f2','h1e1','e8e1','b6d8','g7f8','f3e1','c4d5','e1f3','f2e4','d8b8','b7b5','h3h4','h7h5','f3e5','g8g7','h2g1','f8c5','g1f1','e4g3','f1e1','c5b4','e1d1','d5b3','d1c1','g3e2','c1b1','e2c3','b1c1','a2c2'] },
  { id: 'wcc1886-g20', file: 'WorldChamp1886.pgn', idx: 19 },
  { id: 'wcc1892-g23', file: 'WorldChamp1892.pgn', idx: 22 },
  { id: 'wcc1894-g1', file: 'WorldChamp1894.pgn', idx: 0 },
  { id: 'wcc1907-g1', file: 'WorldChamp1907.pgn', idx: 0 },
  { id: 'wcc1908-g1', file: 'WorldChamp1908.pgn', idx: 0 },
  { id: 'wcc1910a-g5', file: 'WorldChamp1910a.pgn', idx: 4 },
  { id: 'wcc1910b-g10', file: 'WorldChamp1910b.pgn', idx: 9 },
  { id: 'wcc1921-g10', file: 'WorldChamp1921.pgn', idx: 9 },
  { id: 'wcc1927-g1', file: 'WorldChamp1927.pgn', idx: 0 },
  { id: 'wcc1927-g12', file: 'WorldChamp1927.pgn', idx: 11 },
  { id: 'wcc1935-g26', file: 'WorldChamp1935.pgn', idx: 25 },
  { id: 'wcc1937-g2', file: 'WorldChamp1937.pgn', idx: 1 },
  { id: 'wcc1948-g10', file: 'WorldChamp1948.pgn', idx: 19 },
  { id: 'wcc1951-g23', file: 'WorldChamp1951.pgn', idx: 22 },
  { id: 'wcc1954-g11', file: 'WorldChamp1954.pgn', idx: 10 },
  { id: 'wcc1960-g6', file: 'WorldChamp1960.pgn', idx: 5 },
  { id: 'wcc1960-g19', file: 'WorldChamp1960.pgn', idx: 18 },
  { id: 'wcc1961-g13', file: 'WorldChamp1961.pgn', idx: 12 },
  { id: 'wcc1963-g5', file: 'WorldChamp1963.pgn', idx: 4 },
  { id: 'wcc1966-g10', file: 'WorldChamp1966.pgn', idx: 9 },
  { id: 'wcc1969-g19', file: 'WorldChamp1969.pgn', idx: 18 },
  { id: 'wcc1972-g6', file: 'WorldChamp1972.pgn', idx: 5 },
  { id: 'wcc1972-g10', file: 'WorldChamp1972.pgn', idx: 9 },
  { id: 'wcc1972-g13', file: 'WorldChamp1972.pgn', idx: 12 },
  { id: 'wcc1978-g32', file: 'WorldChamp1978.pgn', idx: 31 },
  { id: 'wcc1981-g18', file: 'WorldChamp1981.pgn', idx: 17 },
  { id: 'wcc1984-g48', file: 'WorldChamp1984.pgn', idx: 47 },
  { id: 'wcc1985-g24', file: 'WorldChamp1985.pgn', idx: 23 },
  { id: 'wcc1986-g16', file: 'WorldChamp1986.pgn', idx: 15 },
  { id: 'wcc1987-g24', file: 'WorldChamp1987.pgn', idx: 23 },
  { id: 'wcc1990-g20', file: 'WorldChamp1990.pgn', idx: 19 },
  { id: 'wcc1993-g1', file: 'PCAChamp1993.pgn', idx: 0 },
  { id: 'wcc1995-g9', file: 'PCAChamp1995.pgn', idx: 8 },
  { id: 'wcc1995-g10', file: 'PCAChamp1995.pgn', idx: 9 },
  { id: 'wcc1995-g14', file: 'PCAChamp1995.pgn', idx: 13 },
  { id: 'wcc2000-g2', file: 'WorldChamp2000.pgn', idx: 1 },
  { id: 'wcc2000-g10', file: 'WorldChamp2000.pgn', idx: 9 },
  { id: 'wcc2004-g8', file: 'WorldChamp2004.pgn', idx: 7 },
  { id: 'wcc2004-g14', file: 'WorldChamp2004.pgn', idx: 13 },
  { id: 'wcc2006-g2', file: 'WorldChamp2006.pgn', idx: 1 },
  { id: 'wcc2006-g10', file: 'WorldChamp2006.pgn', idx: 9 },
  { id: 'wcc2008-g3', file: 'WorldChamp2008.pgn', idx: 2 },
  { id: 'wcc2008-g6', file: 'WorldChamp2008.pgn', idx: 5 },
  { id: 'steinitz-bardeleben-1895', file: 'Steinitz.pgn', idx: 452 },
  { id: 'capablanca-marshall-1918', file: 'Capablanca.pgn', idx: 170 },
  { id: 'bogoljubow-alekhine-1922', file: 'Alekhine.pgn', idx: 313 },
  { id: 'botvinnik-capablanca-1938', file: 'Botvinnik.pgn', idx: 191 },
  { id: 'reti-capablanca-1924', file: 'Reti.pgn', idx: 416 },
  { id: 'reti-tartakower-1910', file: 'Reti.pgn', idx: 24 },
  { id: 'reti-alekhine-1925', file: 'Reti.pgn', idx: 435 },
  { id: 'reti-bogoljubow-1924', file: 'Reti.pgn', idx: 415 },
  { id: 'rubinstein-alekhine-1911', file: 'Alekhine.pgn', idx: 86 },
  { id: 'nimzowitsch-tarrasch-1914', file: 'Nimzowitsch.pgn', idx: 160 },
  { id: 'geller-fischer-1962', file: 'Geller.pgn', idx: 587 },
  { id: 'fischer-geller-1961', file: 'Fischer60.pgn', idx: 28 },
  { id: 'fischer-larsen-1958', file: 'Fischer60.pgn', idx: 1 },
  { id: 'fischer-keres-1959', file: 'Fischer60.pgn', idx: 7 },
  { id: 'keres-fischer-1959', file: 'Fischer60.pgn', idx: 13 },
  { id: 'reshevsky-fischer-1961', file: 'Fischer60.pgn', idx: 26 },
  { id: 'fischer-petrosian-1961', file: 'Fischer60.pgn', idx: 30 },
  { id: 'fischer-tal-1961', file: 'Fischer60.pgn', idx: 31 },
  { id: 'byrne-fischer-1963', file: 'Fischer60.pgn', idx: 47 },
  { id: 'fischer-larsen-1971', file: 'Larsen.pgn', idx: 886 },
  { id: 'tal-keres-1957', file: 'Tal.pgn', idx: 15 },
  { id: 'tal-spassky-1958', file: 'Tal.pgn', idx: 21 },
  { id: 'tal-fischer-1959', file: 'Tal.pgn', idx: 29 },
  { id: 'tal-smyslov-1959', file: 'Tal.pgn', idx: 39 },
  { id: 'larsen-tal-1965', file: 'Larsen.pgn', idx: 441 },
  { id: 'larsen-spassky-1964', file: 'Larsen.pgn', idx: 396 },
  { id: 'spassky-larsen-1970', file: 'Spassky.pgn', idx: 854 },
  { id: 'karpov-unzicker-1974', file: 'Karpov.pgn', idx: 321 },
  { id: 'karpov-kortschnoj-1974', file: 'Karpov.pgn', idx: 288 },
  { id: 'kasparov-topalov-1999', file: 'Kasparov.pgn', idx: 1510 },
  { id: 'ivanchuk-kasparov-1991', file: 'Ivanchuk.pgn', idx: 398 },
  { id: 'shirov-topalov-1998', file: 'Topalov.pgn', idx: 720 },
  { id: 'gelfand-kramnik-1994', file: 'Gelfand.pgn', idx: 604 },
  { id: 'topalov-anand-2010-g1', file: 'Anand.pgn', idx: 2526 },
  { id: 'topalov-anand-2010-g12', file: 'Anand.pgn', idx: 2537 },
  { id: 'anand-gelfand-2012-g7', file: 'Anand.pgn', idx: 2670 },
  { id: 'anand-gelfand-2012-g8', file: 'Anand.pgn', idx: 2671 },
  { id: 'aronian-anand-2013', file: 'Aronian.pgn', idx: 1550 },
  { id: 'anand-aronian-2014', file: 'Anand.pgn', idx: 2814 },
  { id: 'carlsen-anand-2013', file: 'Anand.pgn', idx: 2783 },
  { id: 'anand-carlsen-2014', file: 'Anand.pgn', idx: 2880 },
  { id: 'carlsen-karjakin-2016-g8', file: 'Carlsen.pgn', idx: 2055 },
  { id: 'carlsen-karjakin-2016-g10', file: 'Carlsen.pgn', idx: 2057 },
  { id: 'carlsen-nepo-2021-g6', file: 'Carlsen.pgn', idx: 4049 },
  { id: 'carlsen-ernst-2004', file: 'Carlsen.pgn', idx: 221 },
  { id: 'carlsen-topalov-2008', file: 'Carlsen.pgn', idx: 850 },
  { id: 'polgar-kasparov-1994', file: 'PolgarJ.pgn', idx: 506 },
  { id: 'polgar-spassky-1993', file: 'PolgarJ.pgn', idx: 375 },
  { id: 'polgar-shirov-1994', file: 'PolgarJ.pgn', idx: 470 },
  { id: 'short-timman-1991', file: 'Short.pgn', idx: 1000 },
  { id: 'short-karpov-1992', file: 'Karpov.pgn', idx: 1506 },
  { id: 'wcc1958-g22', file: 'WorldChamp1958.pgn', idx: 21 },
];

console.error(`CONFIG: ${GAMES.length} games`);
if (GAMES.length !== 100) { console.error('ERROR: need exactly 100'); process.exit(1); }

function splitGames(text) {
  const games = [];
  const lines = text.split('\n');
  let cur = [];
  let inTags = false;
  for (const line of lines) {
    if (line.startsWith('[')) {
      if (!inTags && cur.length) { games.push(cur.join('\n')); cur = []; }
      inTags = true;
      cur.push(line);
    } else if (line.trim() === '') {
      cur.push(line);
      if (inTags) inTags = false;
    } else {
      cur.push(line);
      inTags = false;
    }
  }
  if (cur.join('').trim()) games.push(cur.join('\n'));
  return games;
}
function tag(game, name) {
  const m = game.match(new RegExp(`\\[${name}\\s+"([^"]*)"\\]`));
  return m ? m[1] : '';
}
function cleanMovetext(raw) {
  let t = raw.replace(/\{[^}]*\}/g, ' ');
  t = t.replace(/\$\d+/g, ' ');
  t = t.replace(/;[^\n]*/g, ' ');
  t = t.replace(/\([^()]*\)/g, ' ');
  t = t.replace(/\([^()]*\)/g, ' ');
  return t;
}
function toUci(gameText) {
  const lines = gameText.split('\n');
  const moveLines = lines.filter((l) => !l.startsWith('[')).join(' ');
  const clean = cleanMovetext(moveLines);
  const tokens = clean.split(/\s+/).filter(Boolean).filter((tok) => {
    if (/^\d+\.+$/.test(tok)) return false;
    if (/^(1-0|0-1|1\/2-1\/2|\*)$/.test(tok)) return false;
    return true;
  }).map((tok) => tok.replace(/^\d+\.+(.*)$/, '$1').replace(/[!?]+$/g, ''));
  const game = new Chess();
  const uci = [];
  const sans = [];
  for (const tok of tokens) {
    if (!tok) continue;
    let m = null;
    try { m = game.move(tok); } catch { throw new Error(`illegal token "${tok}" at ply ${uci.length} (fen ${game.fen()})`); }
    uci.push(m.from + m.to + (m.promotion ?? ''));
    sans.push(m.san);
  }
  return { uci, sans };
}

const cache = {};
function getGame(file, idx) {
  if (!cache[file]) {
    const text = fs.readFileSync(path.join(dir, file), 'utf8');
    cache[file] = splitGames(text);
  }
  const g = cache[file][idx];
  if (!g) throw new Error(`missing ${file}#${idx} (has ${cache[file].length})`);
  return g;
}

for (const cfg of GAMES) {
  try {
    if (cfg.hand) {
      const game = new Chess();
      const sans = [];
      cfg.hand.forEach((u, i) => {
        let m = null;
        try { m = game.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); }
        catch { throw new Error(`hand illegal ply ${i} (${u}) fen=${game.fen()}`); }
        sans.push(m.san);
      });
      console.log(`@@@ ${cfg.id} | HAND | ${cfg.hand.length}ply | ${sans.join(' ')}`);
      console.log(`UCI:${cfg.hand.join(' ')}`);
      console.log(`END:${game.isCheckmate() ? 'mate' : game.isStalemate() ? 'stale' : game.isDraw() ? 'draw' : game.isGameOver() ? 'over' : 'play'}`);
    } else {
      const raw = getGame(cfg.file, cfg.idx);
      const meta = ['White', 'Black', 'Event', 'Site', 'Date', 'Result', 'ECO', 'Opening'].map((t) => `${t}=${tag(raw, t)}`).join(' | ');
      const { uci, sans } = toUci(raw);
      console.log(`@@@ ${cfg.id} | ${cfg.file}#${cfg.idx} | ${uci.length}ply | ${meta}`);
      console.log(`UCI:${uci.join(' ')}`);
      console.log(`SAN:${sans.join(' ')}`);
    }
  } catch (e) {
    console.log(`@@@ ${cfg.id} FAILED: ${e.message}`);
  }
}

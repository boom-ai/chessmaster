// Targeted queries with proper PGN parsing.
// Usage: node scripts/query.mjs
import fs from 'node:fs';
import path from 'node:path';

const dir = '/tmp/pgns/all';
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
  return games.filter((g) => g.includes('[White'));
}
function tag(game, name) {
  const m = game.match(new RegExp(`\\[${name}\\s+"([^"]*)"\\]`));
  return m ? m[1] : '';
}

const Q = [
  ['Karpov.pgn', 'kortschnoj', 'karpov', '1974'],
  ['Karpov.pgn', 'karpov', 'kortschnoj', '1974'],
  ['Carlsen.pgn', 'carlsen', 'nepomniachtchi', '2021'],
  ['Carlsen.pgn', 'nepomniachtchi', 'carlsen', '2021'],
  ['Anand.pgn', '', '', '2012'],
  ['Anand.pgn', '', '', '2014'],
  ['Gelfand.pgn', '', '', '2012'],
];
for (const [file, wf, bf, yf] of Q) {
  const games = splitGames(fs.readFileSync(path.join(dir, file), 'utf8'));
  console.log(`### ${file} w=${wf} b=${bf} y=${yf} (total ${games.length})`);
  games.forEach((g, i) => {
    const w = tag(g, 'White'), b = tag(g, 'Black'), d = tag(g, 'Date');
    if ((!wf || w.toLowerCase().includes(wf)) && (!bf || b.toLowerCase().includes(bf)) && (!yf || d.startsWith(yf))) {
      console.log(`  #${i} ${d} | ${w} vs ${b} | ${tag(g, 'Result')} | ${tag(g, 'Event')} | ${tag(g, 'ECO')}`);
    }
  });
}
// Fischer60 + Tal book contents
for (const file of ['Fischer60.pgn', 'Tal.pgn']) {
  const games = splitGames(fs.readFileSync(path.join(dir, file), 'utf8'));
  console.log(`### ${file} contents (${games.length})`);
  games.forEach((g, i) => {
    console.log(`  #${i} ${tag(g, 'Date')} | ${tag(g, 'White')} vs ${tag(g, 'Black')} | ${tag(g, 'Result')} | ${tag(g, 'Event')}`);
  });
}
// global searches
const extra = [['rubinstein', '', ''], ['zukertort', '', ''], ['levitsky', '', ''], ['rotlevi', '', ''], ['', 'tartakower', '1910'], ['', 'reti', '1925'], ['reti', 'bogoljubow', '1924'], ['kortschnoj', 'spassky', '']];
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.pgn'));
for (const [wf, bf, yf] of extra) {
  const hits = [];
  for (const f of files) {
    const games = splitGames(fs.readFileSync(path.join(dir, f), 'utf8'));
    games.forEach((g, i) => {
      const w = tag(g, 'White'), b = tag(g, 'Black'), d = tag(g, 'Date');
      if ((!wf || w.toLowerCase().includes(wf)) && (!bf || b.toLowerCase().includes(bf)) && (!yf || d.startsWith(yf))) {
        hits.push(`  [${f}#${i}] ${d} | ${w} vs ${b} | ${tag(g, 'Result')} | ${tag(g, 'Event')}`);
      }
    });
  }
  console.log(`### global w=${wf} b=${bf} y=${yf} (${hits.length})`);
  hits.slice(0, 10).forEach((h) => console.log(h));
}

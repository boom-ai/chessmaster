// Build an index of all downloaded PGN games: file | #games | players/years sample.
// Usage: node scripts/pgn-index.mjs [filter]
import fs from 'node:fs';
import path from 'node:path';

const dir = '/tmp/pgns/all';
const filter = (process.argv[2] ?? '').toLowerCase();

function splitGames(text) {
  // split on blank line followed by '[' tag start... standard: games separated by blank lines; use tag-pair scanning
  const games = [];
  const lines = text.split('\n');
  let cur = [];
  let inTags = false;
  for (const line of lines) {
    if (line.startsWith('[')) {
      if (!inTags && cur.length) {
        games.push(cur.join('\n'));
        cur = [];
      }
      inTags = true;
      cur.push(line);
    } else if (line.trim() === '') {
      if (inTags) {
        cur.push(line);
        inTags = false;
      } else {
        cur.push(line);
      }
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

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.pgn'));
let total = 0;
for (const f of files) {
  const text = fs.readFileSync(path.join(dir, f), 'utf8');
  const games = splitGames(text);
  total += games.length;
  const rows = games.map((g) => ({
    w: tag(g, 'White'), b: tag(g, 'Black'), d: tag(g, 'Date'),
    e: tag(g, 'Event'), r: tag(g, 'Result'),
  }));
  const hit = rows.filter(
    (r) => !filter || r.w.toLowerCase().includes(filter) || r.b.toLowerCase().includes(filter),
  );
  if (!filter) {
    console.log(`${f}: ${games.length} games`);
  } else if (hit.length) {
    console.log(`--- ${f} (${hit.length}/${games.length})`);
    for (const r of hit.slice(0, 60)) {
      console.log(`  ${r.d} | ${r.w} vs ${r.b} | ${r.r} | ${r.e}`);
    }
  }
}
console.log(`TOTAL: ${total} games in ${files.length} files`);

// Phase 1b: stream the Lichess puzzle DB, reservoir-sample 500 NEW mate puzzles
// per band (M1-M5), excluding IDs already shipped in puzzlesLichess.js.
// Usage: node scripts/sample-puzzles2.mjs  (writes /tmp/picked-puzzles2.json)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import readline from 'node:readline';

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// [mateTag, minRating, maxRating, want, minPop, minPlays]
const QUOTAS = [
  ['mateIn1', 400, 950, 500, 60, 100],
  ['mateIn2', 700, 1450, 500, 60, 100],
  ['mateIn3', 1100, 1850, 500, 60, 100],
  ['mateIn4', 900, 2350, 500, 5, 5],
  ['mateIn5', 1000, 2500, 500, 5, 5],
];
const KEEP_PER_BUCKET = 120;

const existing = new Set(JSON.parse(fs.readFileSync('/tmp/existing-puzzle-ids.json', 'utf8')));
console.log(`excluding ${existing.size} existing ids`);

const rand = mulberry32(20260906);
const buckets = new Map();
const key = (q, band) => `${q}|${band}`;
for (const [tag] of QUOTAS) {
  for (let r = 300; r <= 2500; r += 100) buckets.set(key(tag, r), { items: [], seen: 0 });
}

const stats = { lines: 0, mate: 0, kept: 0, skippedDup: 0 };
const t0 = Date.now();
const unz = spawn('unzstd', ['-c', '/tmp/lichess_db_puzzle.csv.zst'], { stdio: ['ignore', 'pipe', 'inherit'] });
const rl = readline.createInterface({ input: unz.stdout, crlfDelay: Infinity });

rl.on('line', (line) => {
  stats.lines++;
  if (!line || line.startsWith('PuzzleId')) return;
  const f = line.split(',');
  if (f.length < 9) return;
  const [id, fen, moves, ratingS, devS, popS, playsS, themes] = f;
  if (existing.has(id)) { stats.skippedDup++; return; }
  const rating = +ratingS;
  const pop = +popS;
  const plays = +playsS;
  if (!Number.isFinite(rating)) return;
  const tags = (themes || '').split(' ');
  const mateTag = tags.find((t) => /^mateIn[1-5]$/.test(t));
  if (!mateTag) return;
  stats.mate++;
  const q = QUOTAS.find(([tag, lo, hi, , p, pl]) => tag === mateTag && rating >= lo && rating <= hi && pop >= p && plays >= pl);
  if (!q) return;
  const solLen = moves.trim().split(/\s+/).length - 1;
  if (solLen < 1 || solLen > 9) return;
  const mateN = +mateTag.slice(6);
  if (solLen > mateN * 2 - 1) return;
  const band = Math.floor(rating / 100) * 100;
  const b = buckets.get(key(mateTag, band));
  if (!b) return;
  b.seen++;
  const row = `${id},${fen},${moves},${rating},${themes}`;
  if (b.items.length < KEEP_PER_BUCKET) b.items.push(row);
  else {
    const j = Math.floor(rand() * b.seen);
    if (j < KEEP_PER_BUCKET) b.items[j] = row;
  }
  stats.kept++;
});

rl.on('close', () => {
  const picked = [];
  const seenIds = new Set();
  for (const [tag, lo, hi, want] of QUOTAS) {
    const bands = [];
    for (let r = 300; r <= 2500; r += 100) {
      if (r + 100 < lo || r > hi) continue;
      const items = (buckets.get(key(tag, r))?.items ?? []).slice();
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }
      if (items.length) bands.push(items);
    }
    const got = [];
    let round = 0;
    while (got.length < want && bands.length && round < 2000) {
      round++;
      for (const arr of bands) {
        if (got.length >= want) break;
        const row = arr.pop();
        if (!row) continue;
        const id = row.split(',')[0];
        if (seenIds.has(id) || existing.has(id)) continue;
        seenIds.add(id);
        got.push({ tag, row });
      }
      for (let i = bands.length - 1; i >= 0; i--) if (!bands[i].length) bands.splice(i, 1);
    }
    console.log(`${tag}: wanted ${want}, picked ${got.length}`);
    picked.push(...got);
  }
  fs.writeFileSync('/tmp/picked-puzzles2.json', JSON.stringify(picked));
  console.log(`lines=${stats.lines} mate=${stats.mate} kept=${stats.kept} dupSkipped=${stats.skippedDup} picked=${picked.length} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
});

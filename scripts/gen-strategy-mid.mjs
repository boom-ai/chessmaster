// Generates src/data/strategyMid.js from compact data files.
// Validates every line with chess.js; aborts on any failure.
// Usage: node scripts/gen-strategy-mid.mjs
import { Chess } from 'chess.js';
import { writeFileSync } from 'node:fs';
import { TRAPS } from './mid-traps.mjs';
import { PLANS } from './mid-plans.mjs';
import { MOTIFS } from './mid-motifs.mjs';

const BASE_IDS = new Set(['m-iqp','m-majority','m-open-files','m-outposts','m-bishop-pair','m-storm','m-prophylaxis','m-space','m-bad-bishop','m-hanging','m-doubled','m-exchange-sac','m-kingside-roll','m-central-break','m-weak-square']);

const PIECE = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const BOOK = {
  e2e4: 'Plays e4 — stakes the center and frees the queen and king bishop.',
  e7e5: 'Replies e5 — holds the center symmetrically.',
  g1f3: 'Develops the knight toward the center with tempo.',
  b8c6: 'Develops the knight, defending and eyeing the center.',
  f1c4: 'Develops the bishop to its most active diagonal.',
  f8c5: 'Develops the bishop to its most active diagonal.',
  d2d4: 'Strikes in the center.',
  d7d5: 'Strikes back in the center.',
  e1g1: 'Castles — king to safety, rook to the center.',
  e8g8: 'Castles — king to safety, rook to the center.',
  c2c4: 'Challenges the center.',
  c7c5: 'Counterattacks the center.',
  g8f6: 'Develops the knight with tempo.',
  b1c3: 'Develops the knight toward the center.',
  f1b5: 'Pins with the Spanish bishop.',
  d7d6: 'Solidifies the center.',
  e7e6: 'Builds the pawn wall.',
  c7c6: 'Supports the center solidly.',
  f2f4: 'Launches the flank pawn with attacking ideas.',
  e2e3: 'Solidifies the center and opens the bishop.',
};

function uciToMove(game, uci) {
  return game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
}

function explain(uci, m, hero, note) {
  if (note) return note;
  if (BOOK[uci]) return BOOK[uci];
  const san = m.san;
  const check = san.endsWith('#') ? ' Checkmate!' : san.includes('+') ? ' with check — the opponent must respond.' : '';
  if (m.flags.includes('k') || m.flags.includes('q')) return `${san}: castles to safety and connects the rooks${check ? '.' + check : '.'}`;
  if (m.captured) return `${san}: captures on ${m.to}${check} Material and initiative decide now.`;
  if (m.promotion) return `${san}: pushes through to a new queen${check}`;
  const p = PIECE[m.piece] ?? m.piece;
  if (m.piece === 'n') return `${san}: the knight leaps to ${m.to}${check} Knights want advanced outposts.`;
  if (m.piece === 'b') return `${san}: the bishop takes aim from ${m.to}${check}`;
  if (m.piece === 'r') return `${san}: the rook seizes the open line${check}`;
  if (m.piece === 'q') return `${san}: the queen enters with threats${check}`;
  if (m.piece === 'k') return `${san}: the king steps to ${m.to}${check}`;
  return `${san}: plays ${m.to}${check}`;
}

function buildLesson(d) {
  const g = d.startFen ? new Chess(d.startFen) : new Chess();
  const mainline = [];
  d.line.forEach((uci, i) => {
    let m;
    try { m = uciToMove(g, uci); }
    catch { throw new Error(`${d.id} mainline ply ${i} (${uci}) illegal. fen=${g.fen()}`); }
    const mover = m.color;
    const color = mover === d.hero ? '#22c55e' : '#ef4444';
    const step = { uci, explanation: explain(uci, m, d.hero, d.notes?.[i]), arrows: [{ from: uci.slice(0, 2), to: uci.slice(2, 4), color }] };
    if (m.captured || m.san.includes('+')) step.highlight = [m.to];
    mainline.push(step);
  });
  // drill
  let drillFen;
  if (d.drill.startFen) drillFen = d.drill.startFen;
  else {
    const dg = d.startFen ? new Chess(d.startFen) : new Chess();
    for (let i = 0; i < d.drill.afterPly; i++) uciToMove(dg, d.line[i]);
    drillFen = dg.fen();
  }
  let dg;
  try { dg = new Chess(drillFen); } catch { throw new Error(`${d.id} drill: bad startFen`); }
  const forColor = dg.turn();
  for (const u of d.drill.moves) {
    try { uciToMove(dg, u); }
    catch { throw new Error(`${d.id} drill move ${u} illegal. fen=${dg.fen()}`); }
  }
  return {
    id: d.id, title: d.title, phase: 'middlegame', level: d.level, tagline: d.tagline,
    description: d.desc, keyIdeas: d.ideas,
    ...(d.startFen ? { startFen: d.startFen } : {}),
    mainline,
    drill: { startFen: drillFen, forColor, about: d.drill.about, moves: d.drill.moves },
  };
}

const ALL = [...TRAPS, ...PLANS, ...MOTIFS];
console.log(`entries: traps=${TRAPS.length} plans=${PLANS.length} motifs=${MOTIFS.length} total=${ALL.length}`);
if (ALL.length !== 85) { console.log(`FAIL: need exactly 85, got ${ALL.length}`); process.exit(1); }
const seen = new Set();
for (const d of ALL) {
  if (!d.id || seen.has(d.id) || BASE_IDS.has(d.id)) { console.log(`FAIL: bad/dup id ${d.id}`); process.exit(1); }
  seen.add(d.id);
  for (const f of ['title', 'level', 'tagline', 'desc', 'hero', 'line']) {
    if (!d[f] || (Array.isArray(d[f]) && !d[f].length)) { console.log(`FAIL ${d.id}: missing ${f}`); process.exit(1); }
  }
  if (!d.ideas?.length || !d.drill?.moves?.length || !d.drill?.about) { console.log(`FAIL ${d.id}: missing ideas/drill`); process.exit(1); }
}

const lessons = ALL.map(buildLesson);
const out = `// Middlegame lessons part 2: 85 lessons (TRAPS + PLANS + MOTIFS).
// Generated by scripts/gen-strategy-mid.mjs — do not hand-edit; edit the mid-*.mjs data files.
export const STRATEGY_MID = ${JSON.stringify(lessons, null, 2)};
`;
writeFileSync(new URL('../src/data/strategyMid.js', import.meta.url), out);
console.log(`WROTE src/data/strategyMid.js with ${lessons.length} lessons ✔`);

import { Chess } from 'chess.js';
import { writeFileSync } from 'node:fs';

const OUT = new URL('../src/data/strategyEnd.js', import.meta.url);

// ---------- FEN builder ----------
function B(list, turn = 'w') {
  const b = Array(64).fill(null);
  for (const [p, sq] of list) {
    const f = sq.charCodeAt(0) - 97, r = parseInt(sq[1], 10) - 1;
    if (f < 0 || f > 7 || r < 0 || r > 7) throw new Error('bad square ' + sq);
    if (b[r * 8 + f]) throw new Error('overlap ' + sq);
    b[r * 8 + f] = p;
  }
  const rows = [];
  for (let rank = 7; rank >= 0; rank--) {
    let row = '', empty = 0;
    for (let file = 0; file < 8; file++) {
      const p = b[rank * 8 + file];
      if (!p) empty++;
      else { if (empty) { row += empty; empty = 0; } row += p; }
    }
    if (empty) row += empty;
    rows.push(row);
  }
  const fen = rows.join('/') + ` ${turn} - - 0 1`;
  new Chess(fen); // validate
  return fen;
}

// king move UCIs from sq, ordered by chebyshev distance to target (reverse = farthest first)
function kingTo(sq, target, reverse = false) {
  const f = sq.charCodeAt(0) - 97, r = parseInt(sq[1], 10) - 1;
  const t = [target.charCodeAt(0) - 97, parseInt(target[1], 10) - 1];
  const ms = [];
  for (let df = -1; df <= 1; df++) for (let dr = -1; dr <= 1; dr++) {
    if (!df && !dr) continue;
    const nf = f + df, nr = r + dr;
    if (nf < 0 || nf > 7 || nr < 0 || nr > 7) continue;
    ms.push({ u: sq + String.fromCharCode(97 + nf) + (nr + 1), d: Math.max(Math.abs(nf - t[0]), Math.abs(nr - t[1])) });
  }
  ms.sort((a, b) => (reverse ? b.d - a.d : a.d - b.d));
  return ms.map(m => m.u);
}
function rookSlides(sq, dests) {
  // UCIs from sq to each dest (assumes same rank/file); caller lists legal-looking ones
  return dests.map(d => sq + d);
}

function doMove(g, uci) {
  const mv = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  return mv.san;
}
function tryPrefs(g, prefs) {
  for (const u of prefs || []) {
    try { const san = doMove(g, u); return { uci: u, san }; }
    catch { /* try next */ }
  }
  return null;
}
function autoMove(g, atkPieceOk = true) {
  const ms = g.moves({ verbose: true });
  if (!ms.length) throw new Error('no legal moves in ' + g.fen());
  const score = m => ((m.piece === 'k' || m.piece === 'p') ? 0 : 10) + (m.captured ? 5 : 0) + (m.promotion ? 50 : 0) + (m.san.includes('+') && atkPieceOk ? -3 : 0);
  ms.sort((a, b) => score(a) - score(b));
  const m = ms[0];
  const san = g.move(m).san;
  return { uci: m.from + m.to + (m.promotion || ''), san };
}
function mkStep(uci, san, color, ex) {
  return {
    uci, ex,
    arrows: [{ from: uci.slice(0, 2), to: uci.slice(2, 4), color: color === 'w' ? 'green' : 'red' }],
    highlight: [uci.slice(2, 4)],
  };
}
// fixed plan; falls back to a safe automatic move if no pref is legal
function playSteps(startFen, plan, tag) {
  const g = new Chess(startFen);
  const steps = [];
  for (let i = 0; i < plan.length; i++) {
    const color = g.turn();
    let r = tryPrefs(g, plan[i].prefs);
    if (!r) r = autoMove(g);
    steps.push(mkStep(r.uci, r.san, color, plan[i].ex(r.san, r.uci, color)));
  }
  return { steps, moves: steps.map(s => s.uci), endFen: g.fen() };
}

// ---- mate line finder: DFS over cooperative line, ends in checkmate ----
let NODES = 0;
function orderedMoves(g, atk) {
  const ms = g.moves({ verbose: true });
  const out = [];
  for (const m of ms) {
    g.move(m);
    NODES++;
    let s = 0;
    if (g.isCheckmate()) s = -10000;
    else if (g.isCheck()) s = -100;
    if (g.isStalemate() || g.isDraw()) s = 100000;
    g.undo();
    if (s >= 100000) continue;
    if (g.turn() === atk) { if (m.piece === 'k') s -= 10; if (m.promotion) s -= 30; }
    else if (m.piece !== 'k') s += 50;
    out.push({ m, s });
  }
  out.sort((a, b) => a.s - b.s);
  return out.map(x => x.m).slice(0, g.turn() === atk ? 14 : 8);
}
function findMateLine(startFen, cap = 5, prefix = []) {
  const g = new Chess(startFen);
  const pre = [];
  for (const u of prefix) { const san = doMove(g, u); pre.push({ uci: u, san, color: g.turn() === 'w' ? 'b' : 'w' }); }
  // fix color recorded before move: recompute properly below
  const line = [];
  NODES = 0;
  function dfs(depth) {
    if (g.isCheckmate()) return true;
    if (depth >= cap) return false;
    if (NODES > 300000) throw new Error('node budget exceeded from ' + startFen);
    const atk = new Chess(startFen).turn(); // attacker = side to move at start... note prefix flips; use original mover
    void atk;
    for (const m of orderedMoves(g, g.turn() === lineSide ? lineSide : g.turn())) {
      g.move(m);
      if (g.isStalemate() || g.isDraw()) { g.undo(); continue; }
      line.push(m);
      if (dfs(depth + 1)) return true;
      line.pop();
      g.undo();
    }
    return false;
  }
  // attacker = side to move after prefix
  const lineSide = g.turn();
  if (!dfs(0)) throw new Error('NO MATE LINE (cap ' + cap + ') from ' + g.fen() + ' prefix=' + prefix.join(','));
  const plays = [];
  const g2 = new Chess(startFen);
  for (const u of prefix) { const color = g2.turn(); const san = doMove(g2, u); plays.push({ uci: u, san, color }); }
  for (const m of line) { const color = g2.turn(); const san = g2.move(m).san; plays.push({ uci: m.from + m.to + (m.promotion || ''), san, color }); }
  if (!g2.isCheckmate()) throw new Error('finder line does not mate: ' + startFen);
  return plays;
}

function mateLesson(o) {
  // o: {id,title,level,tagline,desc,ideas,pieces,turn,prefix,cap,about,exW,exB}
  const startFen = B(o.pieces, o.turn || 'w');
  const plays = findMateLine(startFen, o.cap || 5, o.prefix || []);
  const main = plays.map((p, i) => {
    const last = i === plays.length - 1;
    const ex = last
      ? `MATE ${p.san}! ${o.exMate}`
      : p.color === 'w' ? o.exW(p.san, p.uci) : o.exB(p.san, p.uci);
    return mkStep(p.uci, p.san, p.color, ex);
  });
  return {
    id: o.id, title: o.title, level: o.level, tagline: o.tagline, desc: o.desc, ideas: o.ideas,
    startFen, main, drillFen: startFen, drillColor: o.turn || 'w',
    about: o.about, drillMoves: main.map(s => s.uci),
  };
}

function std(o) {
  // fixed-line lesson
  const startFen = B(o.pieces, o.turn || 'w');
  const mp = playSteps(startFen, o.mainPlan, o.id + '-main');
  const dFen = o.drillPieces ? B(o.drillPieces, o.drillTurn || o.turn || 'w') : startFen;
  const dp = playSteps(dFen, o.drillPlan, o.id + '-drill');
  return {
    id: o.id, title: o.title, level: o.level, tagline: o.tagline, desc: o.desc, ideas: o.ideas,
    startFen, main: mp.steps, drillFen: dFen, drillColor: new Chess(dFen).turn(),
    about: o.about, drillMoves: dp.moves,
  };
}

const L = [];
const exK = t => (san, uci) => `${san}: ${t} (${uci.slice(0, 2)}-${uci.slice(2, 4)}).`;
const exP = t => (san, uci) => `${san}: ${t} (${uci.slice(0, 2)}-${uci.slice(2, 4)}).`;
const exR = t => (san, uci) => `${san}: ${t} (${uci.slice(0, 2)}-${uci.slice(2, 4)}).`;
const exQ = t => (san, uci) => `${san}: ${t} (${uci.slice(0, 2)}-${uci.slice(2, 4)}).`;
const exN = t => (san, uci) => `${san}: ${t} (${uci.slice(0, 2)}-${uci.slice(2, 4)}).`;
const exB = t => (san, uci) => `${san}: ${t} (${uci.slice(0, 2)}-${uci.slice(2, 4)}).`;

// ================= A. KEY SQUARES a/b/c/d/f/g/h =================
const KEYDEF = {
  a: { p: 'a4', k: 'c3', tgt: 'b6', push: 'a4a5' },
  b: { p: 'b4', k: 'd3', tgt: 'c6', push: 'b4b5' },
  c: { p: 'c4', k: 'e3', tgt: 'd6', push: 'c4c5' },
  d: { p: 'd4', k: 'f3', tgt: 'e6', push: 'd4d5' },
  f: { p: 'f4', k: 'h3', tgt: 'g6', push: 'f4f5' },
  g: { p: 'g4', k: 'e3', tgt: 'f6', push: 'g4g5' },
  h: { p: 'h4', k: 'f3', tgt: 'g6', push: 'h4h5' },
};
for (const f of ['a', 'b', 'c', 'd', 'f', 'g', 'h']) {
  const d = KEYDEF[f];
  L.push(std({
    id: 'e-key-' + f, title: `Key Squares: ${f}-Pawn`, level: 'Beginner',
    tagline: `Reach the ${f}-pawn key squares and the pawn queens.`,
    desc: `Every ${f}-pawn has key squares two ranks ahead of it: plant the king there and promotion is forced. Here White marches toward ${d.tgt} while Black runs back. Push the pawn only once the king leads the way.`,
    ideas: [`Key squares sit two ranks ahead of the ${f}-pawn: occupy one with the king.`, `March the king first toward ${d.tgt}; the pawn waits.`, `Push ${d.push.slice(0, 2)}-${d.push.slice(2, 4)} only with the king ready to escort.`, `If the enemy king reaches the queening square first, there is no win.`],
    pieces: [['K', d.k], ['P', d.p], ['k', 'e7']], turn: 'w',
    mainPlan: [
      { prefs: kingTo(d.k, d.tgt), ex: exK(`step toward the ${d.tgt} key square`) },
      { prefs: kingTo('e7', 'e8', true), ex: exK('Black hurries back toward the queening square') },
      { prefs: [d.push, ...kingTo(d.k, d.tgt)], ex: exP('the pawn advances now that the king leads') },
    ],
    drillPlan: [
      { prefs: kingTo(d.k, d.tgt).slice(1).concat(kingTo(d.k, d.tgt)), ex: exK('improve the king') },
      { prefs: kingTo('e7', 'd8', true), ex: exK('Black defends') },
      { prefs: [d.push], ex: exP('push with support') },
    ],
    about: `White to play: head for the key squares, then push the ${f}-pawn!`,
  }));
}

// ================= B. OPPOSITION VARIANTS =================
L.push(std({
  id: 'e-opp-distant', title: 'Distant Opposition', level: 'Beginner',
  tagline: 'Same file, three squares apart: step in with tempo.',
  desc: 'Distant opposition means the kings share a file with an odd number of squares between them. The side NOT to move holds it. White steps up the file here and Black must yield ground on one flank.',
  ideas: ['Distant opposition: kings on one file with 3 or 5 squares between.', 'Advance one square to take it: the other king must step aside.', 'Keep the pawn back until the king has penetrated.', 'Penetrate to the 5th rank, then advance the pawn with tempo.'],
  pieces: [['K', 'd2'], ['P', 'e2'], ['k', 'd6']], turn: 'w',
  mainPlan: [
    { prefs: kingTo('d2', 'd5'), ex: exK('step up the file, taking distant opposition') },
    { prefs: kingTo('d6', 'a6', true), ex: exK('Black must give way on a flank') },
    { prefs: ['e2e4', ...kingTo('d2', 'd5')], ex: exP('the pawn follows once the king leads') },
  ],
  drillPlan: [
    { prefs: kingTo('d2', 'd4'), ex: exK('approach') },
    { prefs: kingTo('d6', 'd8', true), ex: exK('Black yields') },
    { prefs: ['e2e3'], ex: exP('support first') },
  ],
  about: 'White to play: take distant opposition up the file!',
}));
L.push(std({
  id: 'e-opp-diagonal', title: 'Diagonal Opposition', level: 'Intermediate',
  tagline: 'Control the key diagonal and outflank him.',
  desc: 'Opposition also works diagonally: kings on the same diagonal with one square between. Whoever moves breaks it. White uses diagonal pressure here to force Black wide, then penetrates on the opposite side.',
  ideas: ['Diagonal opposition: kings one diagonal step apart decide the game.', 'Threaten to queen on one side so he commits, then go the other way.', 'Keep the pawn mobile as a second front.', 'Outflanking beats head-on pushing when he holds the file.'],
  pieces: [['K', 'b2'], ['P', 'c2'], ['k', 'e5']], turn: 'w',
  mainPlan: [
    { prefs: kingTo('b2', 'c4'), ex: exK('approach along the diagonal') },
    { prefs: kingTo('e5', 'a5', true), ex: exK('Black covers the entry squares') },
    { prefs: ['c2c4', ...kingTo('b2', 'c4')], ex: exP('open the second front at the right moment') },
  ],
  drillPlan: [
    { prefs: kingTo('b2', 'b4'), ex: exK('gain ground') },
    { prefs: kingTo('e5', 'e7', true), ex: exK('Black holds') },
    { prefs: ['c2c3'], ex: exP('keep the pawn ready') },
  ],
  about: 'White to play: use diagonal opposition to outflank Black!',
}));
L.push(std({
  id: 'e-opp-direct', title: 'Direct Opposition', level: 'Beginner',
  tagline: 'Face to face: whoever moves must step aside.',
  desc: 'Direct opposition is kings nose to nose with one square between: the mover yields. White steps into direct opposition here, Black sidesteps, and the pawn advance decides. Never step adjacent to his king.',
  ideas: ['Direct opposition: one square between the kings on file or rank.', 'Step in so HE must move: the sidestep wins the key square.', 'Kings can never stand adjacent: plan every step.', 'Once he yields, the pawn advances with check-free tempo.'],
  pieces: [['K', 'e3'], ['P', 'f2'], ['k', 'e6']], turn: 'w',
  mainPlan: [
    { prefs: kingTo('e3', 'e5'), ex: exK('take direct opposition up the file') },
    { prefs: kingTo('e6', 'a6', true), ex: exK('Black must sidestep') },
    { prefs: ['f2f4', ...kingTo('e3', 'e5')], ex: exP('advance with the king in front') },
  ],
  drillPlan: [
    { prefs: ['e3d4', 'e3f4', 'e3e4'], ex: exK('press forward') },
    { prefs: kingTo('e6', 'e8', true), ex: exK('Black gives ground') },
    { prefs: ['f2f3'], ex: exP('support the march') },
  ],
  about: 'White to play: seize direct opposition!',
}));

// ================= C. SQUARE RULE RACES =================
function squareRace(id, title, pawn, wk, bk, push, wkTgt) {
  return std({
    id, title, level: 'Intermediate',
    tagline: 'Draw the square: if he steps inside, the pawn falls.',
    desc: `The square rule decides pawn races without calculation: draw the square from the pawn to its queening square. If the enemy king steps inside, the pawn is caught. Here White pushes ${push.slice(0, 2)} while counting whether Black enters the square in time.`,
    ideas: [`The square: from ${push.slice(0, 2)} to the 8th rank, same number of files wide.`, `Push ${push} when he stands outside the square.`, 'March your own king to shorten the race.', 'Count tempi every move: one wasted step flips the result.'],
    pieces: [['K', wk], ['P', pawn], ['k', bk]], turn: 'w',
    mainPlan: [
      { prefs: [push, ...kingTo(wk, wkTgt)], ex: exP('push while he is outside the square') },
      { prefs: kingTo(bk, pawn, false), ex: exK('Black sprints into the square') },
      { prefs: kingTo(wk, wkTgt), ex: exK('the king follows: count the tempi') },
    ],
    drillPlan: [
      { prefs: [push], ex: exP('test the square') },
      { prefs: kingTo(bk, 'd5', true), ex: exK('Black reacts') },
      { prefs: kingTo(wk, wkTgt), ex: exK('keep counting') },
    ],
    about: 'White to play: push and count the square!',
  });
}
L.push(squareRace('e-square-race-a', 'Square Rule: a-Pawn Sprint', 'a5', 'b1', 'd6', 'a5a6', 'c3'));
L.push(squareRace('e-square-race-c', 'Square Rule: c-Pawn Sprint', 'c5', 'h1', 'e6', 'c5c6', 'g2'));
L.push(squareRace('e-square-race-e', 'Square Rule: e-Pawn Sprint', 'e5', 'a1', 'e7', 'e5e6', 'b2'));
L.push(squareRace('e-square-race-g', 'Square Rule: g-Pawn Sprint', 'g5', 'b1', 'd6', 'g5g6', 'c3'));

// ================= D/E. KQ + KR MATES (corners, edge, far, drive) =================
const KQC = [
  { id: 'e-mate-kq-h8', title: 'KQ Mate: h8 Corner', corner: 'h8', K: 'f6', Q: 'e4', k: 'h8' },
  { id: 'e-mate-kq-a1', title: 'KQ Mate: a1 Corner', corner: 'a1', K: 'c3', Q: 'd5', k: 'a1' },
  { id: 'e-mate-kq-h1', title: 'KQ Mate: h1 Corner', corner: 'h1', K: 'f3', Q: 'e5', k: 'h1' },
  { id: 'e-mate-kq-edge', title: 'KQ Mate: Edge Drive on c8', corner: 'c8 edge', K: 'a6', Q: 'd4', k: 'c8' },
  { id: 'e-mate-kq-far', title: 'KQ Mate: Queen Joins Late', corner: 'a8', K: 'c6', Q: 'h4', k: 'a8' },
  { id: 'e-mate-kq-drive', title: 'KQ Mate: Hunt from b7', corner: 'a8', K: 'c5', Q: 'd4', k: 'b7' },
];
for (const m of KQC) {
  L.push(mateLesson({
    id: m.id, title: m.title, level: 'Beginner',
    tagline: `Shrink the box toward ${m.corner}, bring the king, deliver.`,
    desc: `Queen and king mate on any edge: squeeze the box smaller each move, walk the king to opposition, and finish on the back rank near ${m.corner}. Never stalemate: when his squares run out, make sure the last move is check.`,
    ideas: [`Shrink the box every move: the queen fences the king near ${m.corner}.`, `Walk the king up before the final blow.`, `Stalemate check: no squares plus no check is a disaster, not a win.`, `The classic finish lands the queen on the edge with check.`],
    pieces: [['K', m.K], ['Q', m.Q], ['k', m.k]], turn: 'w', cap: 5,
    about: `White to play and mate near ${m.corner}!`,
    exW: exQ('tighten the net'),
    exB: (san) => `${san}: Black shuffles inside the shrinking box.`,
    exMate: 'the box is shut: back-rank mate.',
  }));
}
const KRC = [
  { id: 'e-mate-kr-h8', title: 'KR Mate: h8 Corner', corner: 'h8', K: 'f6', Q: 'e4', k: 'h8' },
  { id: 'e-mate-kr-a1', title: 'KR Mate: a1 Corner', corner: 'a1', K: 'c3', Q: 'd5', k: 'a1' },
  { id: 'e-mate-kr-h1', title: 'KR Mate: h1 Corner', corner: 'h1', K: 'f3', Q: 'e5', k: 'h1' },
  { id: 'e-mate-kr-edge', title: 'KR Mate: Edge Drive on c8', corner: 'c8 edge', K: 'a6', Q: 'd4', k: 'c8' },
  { id: 'e-mate-kr-far', title: 'KR Mate: Rook Joins Late', corner: 'a8', K: 'c6', Q: 'h4', k: 'a8' },
  { id: 'e-mate-kr-drive', title: 'KR Mate: Hunt from b7', corner: 'a8', K: 'c5', Q: 'd4', k: 'b7' },
];
for (const m of KRC) {
  const p = m.Q, R = 'R';
  L.push(mateLesson({
    id: m.id, title: m.title, level: 'Beginner',
    tagline: `Cut him off toward ${m.corner}, bring the king, mate on the edge.`,
    desc: `Rook and king mate on any edge: the rook cuts the file or rank while the king walks to opposition near ${m.corner}. Keep the rook safe from checks, wait with rook moves when he lunges, and mate him on the rim.`,
    ideas: [`The rook cuts off ranks or files: the box near ${m.corner} shrinks.`, `Opposition first: king two squares away before mating.`, `Waiting rook moves force his king backward.`, `Mate lands on the edge with king support, never stalemate.`],
    pieces: [['K', m.K], [R, p], ['k', m.k]], turn: 'w', cap: 5,
    about: `White to play and mate near ${m.corner}!`,
    exW: exR('cut the box smaller'),
    exB: (san) => `${san}: Black paces inside the cage.`,
    exMate: 'the rook seals the edge: mate.',
  }));
}

// ================= F. KP vs K WINS =================
const KPW = [
  { f: 'a', p: 'a5', k: 'b4', bk: 'd7', tgt: 'b6' },
  { f: 'c', p: 'c5', k: 'd4', bk: 'f7', tgt: 'd6' },
  { f: 'd', p: 'd5', k: 'e4', bk: 'g7', tgt: 'e6' },
  { f: 'f', p: 'f5', k: 'g4', bk: 'd7', tgt: 'g6' },
  { f: 'g', p: 'g5', k: 'f4', bk: 'd7', tgt: 'f6' },
  { f: 'h', p: 'h5', k: 'g4', bk: 'd7', tgt: 'g6' },
];
for (const d of KPW) {
  L.push(std({
    id: 'e-kp-win-' + d.f, title: `Pawn Win: ${d.f}-Pawn Queens`, level: 'Beginner',
    tagline: `King leads, ${d.f}-pawn follows: textbook promotion.`,
    desc: `With the king in front and the ${d.f}-pawn protected, promotion is forced. White improves the king toward ${d.tgt}, Black chases the pawn, and the escort march finishes the job. The only rule is never push past royal support.`,
    ideas: [`King in front of the ${d.f}-pawn is the winning shape.`, `Improve toward ${d.tgt} before pushing again.`, `Push only when the pawn stays defended.`, `Keep the black king out of the queening square.`],
    pieces: [['K', d.k], ['P', d.p], ['k', d.bk]], turn: 'w',
    mainPlan: [
      { prefs: kingTo(d.k, d.tgt), ex: exK(`lead with the king toward ${d.tgt}`) },
      { prefs: kingTo(d.bk, d.p, false), ex: exK('Black chases the runner') },
      { prefs: [d.p + (parseInt(d.p[1], 10) + 1), ...kingTo(d.k, d.tgt)], ex: exP('push under escort') },
    ],
    drillPlan: [
      { prefs: kingTo(d.k, d.tgt).slice(0, 3), ex: exK('take the lead') },
      { prefs: kingTo(d.bk, 'e6', true), ex: exK('Black resists') },
      { prefs: [d.p + (parseInt(d.p[1], 10) + 1)], ex: exP('advance') },
    ],
    about: `White to play and win: escort the ${d.f}-pawn home!`,
  }));
}

// ================= G. KP vs K DRAWS + FORTRESSES =================
L.push(std({
  id: 'e-draw-wrong-a', title: 'Wrong Rook Pawn: a-Pawn Stuck', level: 'Intermediate',
  tagline: 'The a-pawn queens on a dark square: one bishop short of winning.',
  desc: 'An a-pawn promotes on a8, a dark square. If the defender reaches a8 with a light-squared bishop missing, the attacker can never force him out. White can try forever here, but the corner draw is ironclad.',
  ideas: ['Rook pawns promote in the corner the enemy king can camp in.', 'Wrong bishop means the corner square is untouchable.', 'Attacker rule: keep the pawn back and try to zugzwang him.', 'Defender rule: sit on a8 and never move the pawn.'],
  pieces: [['K', 'b6'], ['P', 'a5'], ['k', 'a8']], turn: 'w',
  mainPlan: [
    { prefs: kingTo('b6', 'b7'), ex: exK('White probes the corner') },
    { prefs: kingTo('a8', 'a8'), ex: exK('Black sits tight on a8') },
    { prefs: ['a5a6', ...kingTo('b6', 'a6')], ex: exP('pushing changes nothing') },
  ],
  drillPlan: [
    { prefs: kingTo('b6', 'a6'), ex: exK('sidestep') },
    { prefs: kingTo('a8', 'b8'), ex: exK('Black waits') },
    { prefs: ['a5a6'], ex: exP('no breakthrough') },
  ],
  about: 'White “tries” to win: feel the wrong-pawn wall on the a-file!',
}));
L.push(std({
  id: 'e-draw-wrong-h', title: 'Wrong Rook Pawn: h-Pawn Stuck', level: 'Intermediate',
  tagline: 'The h-pawn needs h8: camped king, dead draw.',
  desc: 'An h-pawn promotes on h8. With the black king camped on h8 and no way to force him out, White draws at best despite the extra pawn. Learn to recognize this before burning fifty moves.',
  ideas: ['h-pawns promote in the h8 corner: the natural campsite.', 'No spare tempi means no zugzwang: the draw holds.', 'Do not push to h6 blindly: it only fixes the draw.', 'Claim the half point early when defending.'],
  pieces: [['K', 'g6'], ['P', 'h5'], ['k', 'h8']], turn: 'w',
  mainPlan: [
    { prefs: kingTo('g6', 'g7'), ex: exK('White crowds the corner') },
    { prefs: kingTo('h8', 'h8'), ex: exK('Black refuses to leave h8') },
    { prefs: ['h5h6', ...kingTo('g6', 'h6')], ex: exP('the push fixes nothing') },
  ],
  drillPlan: [
    { prefs: kingTo('g6', 'f6'), ex: exK('try another angle') },
    { prefs: kingTo('h8', 'g8'), ex: exK('Black shuffles h8-g8') },
    { prefs: ['h5h6'], ex: exP('still drawn') },
  ],
  about: 'White “tries” to win: feel the wrong-pawn wall on the h-file!',
}));
L.push(std({
  id: 'e-fort-corner-a8', title: 'Fortress: Camp on a8', level: 'Advanced',
  tagline: 'King on a8 plus a locked pawn: nothing gets in.',
  desc: 'Black camps the king on a8 behind his own a-pawn while the bishop-less attacker knocks in vain. The dark-squared entry points are all covered or blockaded. Fortresses like this save lost positions: head for the corner early.',
  ideas: ['Corner plus pawn wall equals fortress when entries are one color.', 'Never push the wall pawn: it only opens doors.', 'The attacker needs a second front: with one, he is helpless.', 'Shuffle the king between a8 and b8 forever.'],
  pieces: [['K', 'd4'], ['B', 'c2'], ['k', 'a8'], ['p', 'a7']], turn: 'w',
  mainPlan: [
    { prefs: ['c2d3', 'c2b3', 'c2d1', 'c2e4'], ex: exB('White repositions the bishop') },
    { prefs: kingTo('a8', 'a8'), ex: exK('Black waits on a8') },
    { prefs: ['d4c5', 'd4e5', 'd4d5'], ex: exK('the king tour finds no entry') },
  ],
  drillPlan: [
    { prefs: ['c2b1', 'c2d3'], ex: exB('probe') },
    { prefs: kingTo('a8', 'b8'), ex: exK('shuttle a8-b8') },
    { prefs: ['d4c4', 'd4e4'], ex: exK('no way through') },
  ],
  about: 'White “tries” to win: batter the a8 fortress!',
}));
L.push(std({
  id: 'e-fort-corner-h1', title: 'Fortress: Camp on h1', level: 'Advanced',
  tagline: 'King on h1 behind the h-pawn: the mirror fortress.',
  desc: 'The same fortress idea flipped to the kingside corner: Black sits on h1 behind the h2 pawn while White owns the wrong squares. The bishop cannot touch the corner complex and the king cannot invade. Memorize both corners.',
  ideas: ['h1 mirrors a8: camp the king behind the wall pawn.', 'Wrong-colored bishop means the corner is sealed.', 'The wall pawn never moves: every push leaks.', 'Two corners, one idea: head for the safe one when worse.'],
  pieces: [['K', 'e5'], ['B', 'e2'], ['k', 'h1'], ['p', 'h2']], turn: 'w',
  mainPlan: [
    { prefs: ['e2d3', 'e2f3', 'e2d1', 'e2g4'], ex: exB('White shifts the bishop') },
    { prefs: kingTo('h1', 'h1'), ex: exK('Black sits on h1') },
    { prefs: ['e5f5', 'e5e4', 'e5f4'], ex: exK('no invasion squares') },
  ],
  drillPlan: [
    { prefs: ['e2f1', 'e2d3'], ex: exB('probe the wall') },
    { prefs: kingTo('h1', 'g1'), ex: exK('shuttle h1-g1') },
    { prefs: ['e5d5', 'e5f5'], ex: exK('sealed') },
  ],
  about: 'White “tries” to win: batter the h1 fortress!',
}));
L.push(std({
  id: 'e-draw-bishop-a', title: 'Bishop Stalemate Net: a-File', level: 'Advanced',
  tagline: 'One bishop, one pawn, zero wins: the a-file net.',
  desc: 'With bishop plus a-pawn against a bare king camped near a8, many positions are drawn despite the material. The pawn fixes its own blockade and the bishop cannot lose a tempo. Technique here means knowing when to stop pushing.',
  ideas: ['a-file blockades favor the defender: the pawn cannot sidestep.', 'Bishop needs a spare tempo to win: the corner gives none.', 'Keep the defending king near a8 and b7.', 'Trade down into this only when you are the defender.'],
  pieces: [['K', 'e4'], ['B', 'b2'], ['k', 'a7'], ['p', 'a6']], turn: 'w',
  mainPlan: [
    { prefs: ['b2c3', 'b2a3', 'b2c1', 'b2d4'], ex: exB('White improves the bishop') },
    { prefs: kingTo('a7', 'a8'), ex: exK('Black drifts to the corner') },
    { prefs: ['e4d5', 'e4e5', 'e4f5'], ex: exK('the king comes, the door stays shut') },
  ],
  drillPlan: [
    { prefs: ['b2a1', 'b2c3'], ex: exB('reposition') },
    { prefs: kingTo('a7', 'b8'), ex: exK('Black waits') },
    { prefs: ['e4d4', 'e4f4'], ex: exK('no zugzwang available') },
  ],
  about: 'White “tries” to win: test the a-file drawing net!',
}));
L.push(std({
  id: 'e-draw-bishop-h', title: 'Bishop Stalemate Net: h-File', level: 'Advanced',
  tagline: 'One bishop, one pawn, zero wins: the h-file net.',
  desc: 'The kingside mirror: bishop plus h-pawn cannot force a king out of the h8 corner complex. The h-pawn blocks its own bishop diagonals and every approach stalemates or repeats. File this under positions to avoid as the attacker.',
  ideas: ['h-file blockades mirror the a-file: the corner saves Black.', 'The h-pawn clogs the exact diagonals the bishop needs.', 'Defend with Kh7-h8 shuttles and never touch the pawn.', 'Attackers: keep the pawn flexible or do not enter.'],
  pieces: [['K', 'e4'], ['B', 'g2'], ['k', 'h7'], ['p', 'h6']], turn: 'w',
  mainPlan: [
    { prefs: ['g2f3', 'g2h3', 'g2f1', 'g2e4'], ex: exB('White re-aims the bishop') },
    { prefs: kingTo('h7', 'h8'), ex: exK('Black takes the corner') },
    { prefs: ['e4f5', 'e4e5', 'e4f4'], ex: exK('approach meets the wall') },
  ],
  drillPlan: [
    { prefs: ['g2h1', 'g2f3'], ex: exB('probe') },
    { prefs: kingTo('h7', 'g8'), ex: exK('shuttle the corner') },
    { prefs: ['e4d4', 'e4d5'], ex: exK('held') },
  ],
  about: 'White “tries” to win: test the h-file drawing net!',
}));

// ================= H. LUCENA PER FILE =================
function lucena(file, pawn, wk, bk, rookStart, bridge, bReplies) {
  const rank4 = ['a4', 'b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4'];
  // rook slides anywhere along the 4th rank, never onto the bridge square early
  const wslides = [];
  for (const a of rank4) for (const b of rank4) {
    if (a !== b && b !== bridge) wslides.push(a + b);
  }
  const bridgePrefs = rank4.filter(s => s !== bridge).map(s => s + bridge);
  return std({
    id: 'e-lucena-' + file, title: `Lucena: ${file}-Pawn Bridge`, level: 'Intermediate',
    tagline: `Rook plus ${file}-pawn wins with the same bridge.`,
    desc: `The Lucena recipe works on every file: ${file}-pawn on the 7th, king in front, enemy king cut off. White checks from afar while the king walks up, then plays the bridge ${bridge.toUpperCase()} so the checks run out and the pawn queens.`,
    ideas: [`Lucena checklist on the ${file}-file: pawn on 7th, king in front, rook checking.`, `Walk the king up while the rook fires from the 4th rank.`, `The bridge ${bridge.toUpperCase()}: interpose so checks trade rooks.`, `Never push the pawn before the bridge is ready.`],
    pieces: [['K', wk], ['P', pawn], ['k', bk], ['R', rookStart], ['r', 'h2']], turn: 'w',
    mainPlan: [
      { prefs: wslides, ex: exR('check from afar, starting the march') },
      { prefs: bReplies[0], ex: exK('Black runs from the checks') },
      { prefs: kingTo(wk, pawn[0] + '8'), ex: exK('walk the king toward the pawn') },
      { prefs: bReplies[1] || bReplies[0], ex: exK('checks continue, king runs') },
      { prefs: wslides, ex: exR('keep firing while approaching') },
      { prefs: bReplies[0], ex: exK('Black has only king moves') },
      { prefs: bridgePrefs, ex: exR(`THE BRIDGE on ${bridge}: checks now cost the rook`) },
    ],
    drillPlan: [
      { prefs: wslides, ex: exR('start checking') },
      { prefs: bReplies[0], ex: exK('Black runs') },
      { prefs: kingTo(wk, pawn[0] + '7'), ex: exK('approach') },
      { prefs: bReplies[1] || bReplies[0], ex: exK('more checks') },
      { prefs: bridgePrefs, ex: exR('build the bridge') },
    ],
    about: `White to play and win: build the Lucena bridge on the ${file}-file!`,
  });
}
L.push(lucena('b', 'b7', 'e8', 'd6', 'e4', 'b4', [['d6e6', 'd6c6', 'd6d5'], ['e6d6', 'e6f6', 'e6e5']]));
L.push(lucena('c', 'c7', 'e8', 'd6', 'e4', 'c4', [['d6e6', 'd6c6', 'd6d5'], ['e6d6', 'e6f6', 'e6e5']]));
L.push(lucena('d', 'd7', 'f8', 'd5', 'e4', 'd4', [['d5e5', 'd5c5', 'd5d6'], ['e5d5', 'e5f5', 'e5e6']]));
L.push(lucena('e', 'e7', 'g8', 'c6', 'd4', 'e4', [['c6b6', 'c6d6', 'c6c5'], ['b6c6', 'b6a6', 'd6c6']]));
L.push(lucena('g', 'g7', 'e8', 'c6', 'e4', 'g4', [['c6b6', 'c6d6', 'c6c5'], ['b6c6', 'b6a6', 'd6c6']]));

// ================= I. PHILIDOR PER FILE =================
function philidor(file, pawn, wrook) {
  const hold = ['b6', 'c6', 'd6', 'e6', 'f6', 'g6', 'h6'].map(s => 'a6' + s);
  const check = ['a6', 'b6', 'c6', 'd6', 'e6', 'f6', 'g6', 'h6'].filter(s => s !== 'e6').map(s => s + 'e6').concat(['e6e6']);
  return std({
    id: 'e-philidor-' + file, title: `Philidor: Stopping the ${file}-Pawn`, level: 'Intermediate',
    tagline: `Rook on the 6th holds the ${file}-pawn cold.`,
    desc: `Philidor defense, ${file}-file edition: the defending king stands in front of the pawn while the rook camps on the 6th rank. White pushes the king up, Black answers with a sideways check, and the rook always returns home. Patience draws.`,
    ideas: [`The rook lives on the 6th rank until the pawn advances.`, `Meet Ke5-style approaches with a sideways check.`, `After the check, return to the 6th rank at once.`, `If the pawn pushes, capture with check and the draw is trivial.`],
    pieces: [['K', 'e4'], ['P', pawn], ['k', 'f8'], ['R', wrook], ['r', 'a6']], turn: 'b',
    mainPlan: [
      { prefs: hold, ex: exR('stay on the 6th rank') },
      { prefs: kingTo('e4', 'e5'), ex: exK('White brings the king up') },
      { prefs: check, ex: exR('check from the side') },
      { prefs: kingTo('e4', 'e5'), ex: exK('White tries again') },
    ],
    drillPlan: [
      { prefs: hold.slice(2), ex: exR('hold the rank') },
      { prefs: kingTo('e4', 'd5'), ex: exK('White probes') },
      { prefs: check, ex: exR('side check') },
    ],
    about: `Black to move and draw: freeze the ${file}-pawn on the 6th rank!`,
  });
}
L.push(philidor('c', 'c5', 'c2'));
L.push(philidor('d', 'd5', 'd2'));
L.push(philidor('e', 'e5', 'e2'));
L.push(philidor('g', 'g5', 'g2'));
L.push(philidor('b', 'b5', 'b2'));

// ================= J. ROOK BEHIND VARIANTS =================
function behind(file, pawn, wrook, brook) {
  const push = pawn + file + (parseInt(pawn[1], 10) + 1);
  return std({
    id: 'e-behind-' + file, title: `Rook Behind: ${file}-Pawn`, level: 'Intermediate',
    tagline: `Rook behind the ${file}-passer pushes it home.`,
    desc: `Tarrasch law on the ${file}-file: the rook belongs behind the passed pawn, supporting without blocking. White pushes ${push.slice(0, 2)} with the rook already home behind it while the king marches up the center.`,
    ideas: [`Behind the passer is the rook strongest square.`, `Push ${push} once the rook is behind it.`, `March the king to escort: rook plus king beats rook.`, `Never step in front of your own runner with the rook.`],
    pieces: [['K', 'f4'], ['P', pawn], ['k', 'g8'], ['R', wrook], ['r', brook]], turn: 'w',
    mainPlan: [
      { prefs: [push, ...kingTo('f4', 'f5')], ex: exP('push: the rook already supports from behind') },
      { prefs: [brook + 'c8', brook + 'd8', brook + 'e8', brook + 'f8', brook + 'g8', brook + 'h8', brook + 'a8', brook + 'b8'], ex: exR('Black repositions on the back rank') },
      { prefs: kingTo('f4', 'f5'), ex: exK('the king marches to escort') },
    ],
    drillPlan: [
      { prefs: [push], ex: exP('push with support') },
      { prefs: kingTo('g8', 'f8'), ex: exK('Black watches') },
      { prefs: kingTo('f4', 'e5'), ex: exK('escort march') },
    ],
    about: `White to play: push the ${file}-passer with the rook behind it!`,
  });
}
L.push(behind('b', 'b5', 'b1', 'c8'));
L.push(behind('c', 'c5', 'c1', 'd8'));
L.push(behind('g', 'g5', 'g1', 'h8'));
L.push(behind('h', 'h5', 'h1', 'a8'));

// ================= K. OUTSIDE PASSERS =================
L.push(std({
  id: 'e-outside-h', title: 'Outside Passer: h-Pawn Decoy', level: 'Intermediate',
  tagline: 'The h-pawn drags him wide, the king feasts center.',
  desc: 'The kingside mirror of the a-pawn decoy: White pushes the distant h-pawn, Black must chase it, and the white king invades the queenside. Count the race before committing: decoy first, invasion second.',
  ideas: ['A distant h-pawn pulls the king off the center.', 'Push h5-h6 to force his king wide.', 'Invade with your king the moment he turns away.', 'Win the race by one tempo: calculate, then sprint.'],
  pieces: [['K', 'e3'], ['P', 'h5'], ['k', 'd5']], turn: 'w',
  mainPlan: [
    { prefs: ['h5h6'], ex: exP('the decoy sprints') },
    { prefs: kingTo('d5', 'h6', false), ex: exK('Black must chase the runner') },
    { prefs: kingTo('e3', 'c4'), ex: exK('meanwhile the king invades the other wing') },
  ],
  drillPlan: [
    { prefs: ['h5h6'], ex: exP('decoy') },
    { prefs: kingTo('d5', 'e6', true), ex: exK('Black reacts') },
    { prefs: kingTo('e3', 'd4'), ex: exK('invade') },
  ],
  about: 'White to play: push the h-decoy, then invade!',
}));
L.push(std({
  id: 'e-outside-black-a', title: 'Black Outside Passer: a-Pawn', level: 'Intermediate',
  tagline: 'Black decoys with the a-pawn and feasts kingside.',
  desc: 'Outside passers work for Black too. Black pushes the far a-pawn, White must send the king across the board, and the black king collects the kingside. Same counting, reversed colors: the decoy decides.',
  ideas: ['Black pushes a4-a3 to stretch White across the board.', 'The white king cannot be in two places at once.', 'Follow the decoy by invading the far wing with the king.', 'Promote with check whenever the race gets close.'],
  pieces: [['K', 'e3'], ['k', 'e6'], ['p', 'a4']], turn: 'b',
  mainPlan: [
    { prefs: ['a4a3'], ex: exP('the black decoy advances') },
    { prefs: kingTo('e3', 'a3', false), ex: exK('White must chase across') },
    { prefs: kingTo('e6', 'f5'), ex: exK('meanwhile Black feasts kingside') },
  ],
  drillPlan: [
    { prefs: ['a4a3'], ex: exP('decoy first') },
    { prefs: kingTo('e3', 'd4'), ex: exK('White responds') },
    { prefs: kingTo('e6', 'e5'), ex: exK('invade') },
  ],
  about: 'Black to play: push the a-decoy, then invade!',
}));
L.push(std({
  id: 'e-outside-black-h', title: 'Black Outside Passer: h-Pawn', level: 'Intermediate',
  tagline: 'Black h-pawn decoy, white king stretched wide.',
  desc: 'Black version on the kingside: the h-pawn runs, White king is dragged over, and Black collects queenside pawns by geometry. Push the runner before invading: order decides these races.',
  ideas: ['h4-h3 first: force White to commit the king.', 'Only then swing the black king queenside.', 'Keep the runner protected until it queens.', 'Count: decoy tempo, invasion tempo, promotion tempo.'],
  pieces: [['K', 'e3'], ['k', 'e6'], ['p', 'h4']], turn: 'b',
  mainPlan: [
    { prefs: ['h4h3'], ex: exP('the runner goes') },
    { prefs: kingTo('e3', 'h3', false), ex: exK('White is dragged kingside') },
    { prefs: kingTo('e6', 'd5'), ex: exK('Black swings the other way') },
  ],
  drillPlan: [
    { prefs: ['h4h3'], ex: exP('push') },
    { prefs: kingTo('e3', 'f4'), ex: exK('White reacts') },
    { prefs: kingTo('e6', 'f5'), ex: exK('invade') },
  ],
  about: 'Black to play: push the h-decoy, then collect!',
}));

// ================= L. ROOK 7TH + BACK RANKS =================
L.push(std({
  id: 'e-rook-7th', title: 'Seventh Rank Invasion', level: 'Intermediate',
  tagline: 'Rook to the 7th first: everything else follows.',
  desc: 'The rook belongs on the 7th rank, attacking pawns and tying the king down. White invades with check, Black king is forced to a bad square, and the a-pawn advances under cover. Activity converts what passivity would spoil.',
  ideas: ['Occupy the 7th rank with check whenever possible.', 'Force his king to the short side before pushing.', 'Advance the passer only under rook cover.', 'Trade rooks only into a winning pawn ending.'],
  pieces: [['K', 'f4'], ['R', 'd7'], ['P', 'a6'], ['k', 'g8'], ['r', 'a8']], turn: 'w',
  mainPlan: [
    { prefs: ['d7d8', 'd7c7', 'd7e7'], ex: exR('invade the 7th with check ideas') },
    { prefs: kingTo('g8', 'g8'), ex: exK('Black is tied down') },
    { prefs: ['a6a7', ...kingTo('f4', 'f5')], ex: exP('the passer advances under cover') },
  ],
  drillPlan: [
    { prefs: ['d7c7', 'd7d8'], ex: exR('seize the 7th') },
    { prefs: kingTo('g8', 'h8'), ex: exK('Black shuffles') },
    { prefs: ['a6a7'], ex: exP('push') },
  ],
  about: 'White to play: invade the 7th, then push!',
}));
L.push(mateLesson({
  id: 'e-mate-backrank-1', title: 'Back-Rank Mate: Corridor on g8', level: 'Intermediate',
  tagline: 'His own pawns are his prison: mate down the corridor.',
  desc: 'Black king on g8 is boxed in by his own g7 and h7 pawns. White wastes a tempo with the rook, Black shuffles, and the rook returns to the 8th rank for a mate his king cannot flee. His wall becomes his cage.',
  ideas: ['Spot the corridor: king trapped by its own pawns.', 'Lose a tempo first so the mate lands cleanly.', 'Mate down the open file onto the 8th rank.', 'His g7 and h7 pawns block every escape.'],
  pieces: [['K', 'e6'], ['R', 'd1'], ['k', 'g8'], ['p', 'g7'], ['p', 'h7']], turn: 'w', cap: 4,
  prefix: ['d1d2'],
  about: 'White to play and mate down the back rank!',
  exW: exR('lose a tempo along the file'),
  exB: (san) => `${san}: Black shuffles inside the cage.`,
  exMate: 'the corridor is sealed: back-rank mate.',
}));
L.push(mateLesson({
  id: 'e-mate-backrank-2', title: 'Back-Rank Mate: Corridor on f7', level: 'Intermediate',
  tagline: 'Pawns on f7 and h7 wall him in: deliver.',
  desc: 'Same corridor idea with the pawn wall on f7 and h7: the g8 king has no flight squares once the rook reaches the 8th. White marks time, Black must shuffle the king, and the rook strike ends it. Learn both pawn walls.',
  ideas: ['Two pawn walls, one pattern: f7-h7 traps g8 too.', 'Waiting rook moves force the fatal shuffle.', 'Strike the 8th rank with check when escapes are gone.', 'Keep your king covering the flight squares.'],
  pieces: [['K', 'f6'], ['R', 'd1'], ['k', 'g8'], ['p', 'f7'], ['p', 'h7']], turn: 'w', cap: 4,
  prefix: ['d1d2'],
  about: 'White to play and mate down the back rank!',
  exW: exR('mark time on the file'),
  exB: (san) => `${san}: Black paces the cage.`,
  exMate: 'the wall holds: back-rank mate.',
}));

// ================= M. STALEMATE SAVES =================
L.push(std({
  id: 'e-stale-sac-rook', title: 'Rook Sac for Stalemate', level: 'Intermediate',
  tagline: 'Down everything? Park the rook where it cannot be taken.',
  desc: 'The classic swindle: with the king cornered and the enemy pawn blocking escape, give the rook on a square the king cannot leave. If he captures, it is stalemate; if he refuses, you check forever. Never resign these.',
  ideas: ['Cornered king plus blocked pawn equals stalemate fund.', 'Offer the rook where capture stalemates.', 'If he refuses the gift, check forever instead.', 'Head for the corner when lost: h8 and a8 save points.'],
  pieces: [['K', 'f6'], ['Q', 'c4'], ['k', 'h8'], ['r', 'g8']], turn: 'b',
  mainPlan: [
    { prefs: ['g8g7', 'g8h8', 'g8f8'], ex: exR('offer the rook: capture risks stalemate') },
    { prefs: ['c4c5', 'c4b4', 'c4d4'], ex: exQ('White improves, wary of the trick') },
    { prefs: ['g7g8', 'g7h7', 'h8g8'], ex: exR('keep offering: the draw trick lives') },
  ],
  drillPlan: [
    { prefs: ['g8g7', 'g8f8'], ex: exR('sac ideas') },
    { prefs: ['c4c5', 'c4d4'], ex: exQ('White probes') },
    { prefs: ['g7g8', 'g7g7'], ex: exR('hold the fort') },
  ],
  about: 'Black to move: sac the rook idea and steal the draw!',
}));
L.push(std({
  id: 'e-stale-corner', title: 'Corner Stalemate Alarm', level: 'Beginner',
  tagline: 'Winning? Check first: the corner stalemates.',
  desc: 'Attackers stalemate more victims in corners than anywhere else. With the black king on h8 and no flight squares, any lazy king move or pawn push without check throws the win away. The rule is iron: check when his moves run out.',
  ideas: ['Corners stalemate: no squares plus no check equals half a point lost.', 'Always give check when he has one move left.', 'Push pawns only with check or escape squares ready.', 'Slow down in won positions: the last step matters most.'],
  pieces: [['K', 'f7'], ['P', 'g6'], ['k', 'h8']], turn: 'w',
  mainPlan: [
    { prefs: ['f7e6', 'f7f6', 'f7e7'], ex: exK('improve without stalemating: keep his move') },
    { prefs: kingTo('h8', 'h8'), ex: exK('Black waits in the corner') },
    { prefs: ['g6g7', 'f7f6'], ex: exP('push only with his escape intact') },
  ],
  drillPlan: [
    { prefs: ['f7e7', 'f7f6'], ex: exK('careful steps') },
    { prefs: kingTo('h8', 'g8'), ex: exK('Black shuffles') },
    { prefs: ['g6g7'], ex: exP('now the push is safe') },
  ],
  about: 'White to play and win: avoid the corner stalemate!',
}));
L.push(std({
  id: 'e-stale-pawn-block', title: 'Blocked Pawn Stalemate Net', level: 'Intermediate',
  tagline: 'His pawn is his padlock: sac onto the blockade.',
  desc: 'When his own pawn blocks the king and removes flight squares, the defender sacrifices onto the blockade square. Capture or refuse, the position freezes into stalemate or perpetual. Spot the locked pawn chain before you give up.',
  ideas: ['Locked pawns erase flight squares: stalemate looms.', 'Sacrifice onto the square his pawn cannot recapture from.', 'Frozen chains mean frozen results: hold your pieces still.', 'As attacker, keep one pawn mobile to dodge the net.'],
  pieces: [['K', 'e5'], ['P', 'd5'], ['k', 'e7'], ['p', 'd6']], turn: 'w',
  mainPlan: [
    { prefs: ['e5d4', 'e5e4', 'e5f4'], ex: exK('White maneuvers around the blockade') },
    { prefs: kingTo('e7', 'e8', true), ex: exK('Black holds the wall') },
    { prefs: ['d5d6', 'e5d5'], ex: exP('test the blockade square') },
  ],
  drillPlan: [
    { prefs: ['e5f5', 'e5e4'], ex: exK('probe') },
    { prefs: kingTo('e7', 'd8'), ex: exK('Black waits') },
    { prefs: ['e5d5', 'e5e5'], ex: exK('no way through') },
  ],
  about: 'White to play: test the blocked-pawn net!',
}));

// ================= N. TRIANGULATION =================
L.push(std({
  id: 'e-triang-a', title: 'Triangulation: Queenside Pass', level: 'Advanced',
  tagline: 'Triangle on c3-d3-d4: same spot, his move.',
  desc: 'Zugzwang decides this queenside ending: whoever moves yields the entry. White walks the triangle c3-d3-d4-c3, returning to the same setup with Black to move. One lost tempo becomes one won game.',
  ideas: ['Zugzwang: the mover must abandon a key square.', 'Triangle c3-d3-d4-c3 loses exactly one move.', 'Pawns stay frozen while the king dances.', 'Use it only with a spare triangle available.'],
  pieces: [['K', 'c3'], ['P', 'e2'], ['k', 'c5']], turn: 'w',
  mainPlan: [
    { prefs: ['c3d3', 'c3b3', 'c3c4'], ex: exK('triangle corner one: sidestep') },
    { prefs: kingTo('c5', 'c6', true), ex: exK('Black mirrors') },
    { prefs: ['d3d4', 'd3c3', 'd3e3'], ex: exK('corner two: same setup, his turn to yield') },
  ],
  drillPlan: [
    { prefs: ['c3b3', 'c3d3'], ex: exK('start the triangle') },
    { prefs: kingTo('c5', 'b6'), ex: exK('Black holds') },
    { prefs: ['b3c3', 'b3b4'], ex: exK('pass the move') },
  ],
  about: 'White to play: triangulate and pass the move!',
}));
L.push(std({
  id: 'e-triang-b', title: 'Triangulation: Kingside Pass', level: 'Advanced',
  tagline: 'Triangle on g3-h3-h4: lose a move, win the ending.',
  desc: 'Kingside version of the passing trick: with kings opposed and pawns fixed, White loops g3-h3-g4-g3 to flip the turn. Black, forced to move, abandons the blockade square and the white king penetrates.',
  ideas: ['Same triangle idea, kingside squares.', 'Loop three king moves to return with colors reversed.', 'Opposed kings plus fixed pawns signal triangulation.', 'After he yields, penetrate at once: tempo is everything.'],
  pieces: [['K', 'g3'], ['P', 'e2'], ['k', 'g5']], turn: 'w',
  mainPlan: [
    { prefs: ['g3h3', 'g3f3', 'g3g4'], ex: exK('start the kingside triangle') },
    { prefs: kingTo('g5', 'g6', true), ex: exK('Black holds the blockade') },
    { prefs: ['h3g3', 'h3h4', 'f3g3'], ex: exK('close the loop: now he must yield') },
  ],
  drillPlan: [
    { prefs: ['g3f3', 'g3h3'], ex: exK('sidestep') },
    { prefs: kingTo('g5', 'h6'), ex: exK('Black mirrors') },
    { prefs: ['f3g3', 'f3f4'], ex: exK('tempo passed') },
  ],
  about: 'White to play: triangulate on the kingside!',
}));

// ================= O. BREAKTHROUGHS =================
L.push(std({
  id: 'e-break-kingside', title: 'Breakthrough: Kingside Lever', level: 'Intermediate',
  tagline: 'f4-f5 cracks the kingside pawn wall.',
  desc: 'Pawn majorities win by forcing a passed pawn: White rams f4-f5 into the f7-g7 wall. Either Black captures and a new passer appears, or the wall crumbles and the king walks through. One lever opens the whole wing.',
  ideas: ['The lever f4-f5 challenges the base of his wall.', 'Recapture lines create a protected passer.', 'Refusals let the king penetrate through the gap.', 'Prepare levers with king support before striking.'],
  pieces: [['K', 'e3'], ['P', 'f4'], ['P', 'g3'], ['k', 'e6'], ['p', 'f7'], ['p', 'g7']], turn: 'w',
  mainPlan: [
    { prefs: ['f4f5', 'e3f3'], ex: exP('the lever strikes f5') },
    { prefs: ['f7f6', 'g7g6', 'e6f6'], ex: exP('Black must react to the break') },
    { prefs: ['e3f4', 'e3e4', 'g3g4'], ex: exK('the king follows into the gap') },
  ],
  drillPlan: [
    { prefs: ['f4f5'], ex: exP('break') },
    { prefs: kingTo('e6', 'e7'), ex: exK('Black holds') },
    { prefs: ['e3f3'], ex: exK('support the wedge') },
  ],
  about: 'White to play: crack the kingside with f4-f5!',
}));
L.push(std({
  id: 'e-break-queenside', title: 'Breakthrough: Queenside Lever', level: 'Intermediate',
  tagline: 'b4-b5 smashes the queenside chain.',
  desc: 'Queenside chains break the same way: White drives b4-b5 at the a6-b6 wall. Captures spawn passers, retreats surrender squares, and the white king invades either way. Strike where your majority lives.',
  ideas: ['b4-b5 is the queenside battering ram.', 'His captures manufacture your passer.', 'His retreats hand over c5 and a5.', 'Majority side attacks: minority side defends passively.'],
  pieces: [['K', 'd3'], ['P', 'a4'], ['P', 'b4'], ['k', 'd6'], ['p', 'a6'], ['p', 'b6']], turn: 'w',
  mainPlan: [
    { prefs: ['b4b5', 'd3c4'], ex: exP('the queenside lever') },
    { prefs: ['a6a5', 'b6b6', 'd6c6'], ex: exP('Black patches the wall') },
    { prefs: ['d3c4', 'd3d4', 'a4a5'], ex: exK('invade the cracks') },
  ],
  drillPlan: [
    { prefs: ['b4b5'], ex: exP('ram the chain') },
    { prefs: kingTo('d6', 'd7'), ex: exK('Black waits') },
    { prefs: ['d3c3'], ex: exK('king up') },
  ],
  about: 'White to play: smash through with b4-b5!',
}));
L.push(std({
  id: 'e-break-center', title: 'Breakthrough: Central Break', level: 'Intermediate',
  tagline: 'd4-d5 splits the center and makes a queen.',
  desc: 'Central breaks are the most violent: White punches d4-d5 through the middle, opening lines for the king to both wings. The resulting passer is central, supported, and almost unstoppable. Break in the center when ahead in tempi.',
  ideas: ['Central passers are the hardest to stop.', 'd4-d5 opens the king road to both wings.', 'Support the break with the king on e3.', 'After the break, escort: never outrun your king.'],
    pieces: [['K', 'e3'], ['P', 'd4'], ['P', 'e4'], ['k', 'g6'], ['p', 'd6'], ['p', 'e6'], ['p', 'f7']], turn: 'w',
  mainPlan: [
    { prefs: ['d4d5', 'e3d3'], ex: exP('the central punch') },
    { prefs: ['e6d6', 'f7f6', 'e6e5'], ex: exK('Black contains as best he can') },
    { prefs: ['e3d4', 'e3e4', 'e3f4'], ex: exK('escort the new passer') },
  ],
  drillPlan: [
    { prefs: ['d4d5'], ex: exP('break center') },
    { prefs: kingTo('e6', 'e7'), ex: exK('Black reacts') },
    { prefs: ['e3d3'], ex: exK('follow up') },
  ],
  about: 'White to play: punch through the center!',
}));

// ================= P. PAWN MAJORITIES =================
L.push(std({
  id: 'e-majority-kingside', title: 'Majority: Kingside 3v2', level: 'Beginner',
  tagline: 'Three against two makes a passer: push the candidate.',
  desc: 'A 3-on-2 kingside majority must produce a passed pawn: White advances the candidate f-pawn, Black cannot hold all three, and the survivor runs. Do not push the rook pawns first: the candidate leads.',
  ideas: ['The candidate pawn (f-pawn here) advances first.', 'Force him to capture: the recapture makes the passer.', 'Keep the king behind the majority while pushing.', 'Trade into this ending whenever you own the majority.'],
  pieces: [['K', 'e2'], ['P', 'f2'], ['P', 'g2'], ['P', 'h2'], ['k', 'e7'], ['p', 'f7'], ['p', 'g7']], turn: 'w',
  mainPlan: [
    { prefs: ['f2f4', 'e2f3'], ex: exP('the candidate pawn leads') },
    { prefs: ['f7f5', 'g7g6', 'e7f6'], ex: exP('Black cannot hold everything') },
    { prefs: ['e2f3', 'e2e3', 'g2g4'], ex: exK('king follows the majority') },
  ],
  drillPlan: [
    { prefs: ['f2f4'], ex: exP('push the candidate') },
    { prefs: kingTo('e7', 'e8'), ex: exK('Black waits') },
    { prefs: ['e2e3'], ex: exK('support') },
  ],
  about: 'White to play: turn the 3v2 into a passer!',
}));
L.push(std({
  id: 'e-majority-queenside', title: 'Majority: Queenside 3v2', level: 'Beginner',
  tagline: 'Queenside majority: the b-pawn candidate decides.',
  desc: 'Queenside majorities decide games far from the kings: White pushes the b-pawn candidate, cracks the 2-pawn defense, and queens on the wing the black king abandoned. Distant passers win by geometry.',
  ideas: ['Push the candidate b-pawn before the rook pawns.', 'Distant passers drag his king across the board.', 'Advance with the king in support, not ahead.', 'Count the resulting race before trading into it.'],
  pieces: [['K', 'e2'], ['P', 'a2'], ['P', 'b2'], ['P', 'c2'], ['k', 'e7'], ['p', 'a7'], ['p', 'b7']], turn: 'w',
  mainPlan: [
    { prefs: ['b2b4', 'e2d3'], ex: exP('the queenside candidate goes') },
    { prefs: ['b7b5', 'a7a6', 'e7d6'], ex: exP('Black answers on the wing') },
    { prefs: ['e2d3', 'e2e3', 'c2c4'], ex: exK('support from behind') },
  ],
  drillPlan: [
    { prefs: ['b2b4'], ex: exP('candidate first') },
    { prefs: kingTo('e7', 'e8'), ex: exK('Black holds center') },
    { prefs: ['e2d3'], ex: exK('king up') },
  ],
  about: 'White to play: mobilize the queenside majority!',
}));

// ================= Q. ROOK vs PAWN SACS =================
function rvpawn(file, pawn, wk, bk, rook) {
  const push = pawn + file + (parseInt(pawn[1], 10) + 1);
  return std({
    id: 'e-rvpsac-' + file, title: `Rook vs Pawn: Taming the ${file}-Runner`, level: 'Intermediate',
    tagline: `Give checks, then give the rook: the ${file}-pawn must fall.`,
    desc: `Rook against a far ${file}-passer: check from behind to gain tempi, then sacrifice the rook for the pawn the moment it steps too far. White pushes here, Black checks from behind, and the rook waits for the fatal step.`,
    ideas: [`Check from behind the ${file}-runner to steal tempi.`, `The rook sac works once the pawn outruns its king.`, `Keep checking until the pawn reaches the fatal square.`, `King too far means the pawn dies: count first.`],
    pieces: [['K', wk], ['P', pawn], ['k', bk], ['r', rook]], turn: 'w',
    mainPlan: [
      { prefs: [push, ...kingTo(wk, wk)], ex: exP('the runner sprints') },
      { prefs: rookSlides(rook, ['b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'a1', 'h1'].filter(s => s !== rook)), ex: exR('checks from behind begin') },
      { prefs: kingTo(wk, bk), ex: exK('the king chases up') },
    ],
    drillPlan: [
      { prefs: [push], ex: exP('push') },
      { prefs: kingTo(bk, 'e6'), ex: exK('Black approaches') },
      { prefs: kingTo(wk, bk), ex: exK('escort') },
    ],
    about: `White to play: push the ${file}-runner against the lone rook!`,
  });
}
L.push(rvpawn('a', 'a6', 'b5', 'e7', 'e1'));
L.push(rvpawn('c', 'c6', 'd5', 'g7', 'e1'));
L.push(rvpawn('f', 'f6', 'g5', 'c7', 'a1'));
L.push(rvpawn('h', 'h6', 'g5', 'c7', 'a1'));

// ================= R. QUEEN vs PAWN =================
function qvpawn(file, pawn, bk, wq, wk) {
  return std({
    id: 'e-qvp-' + file, title: `Queen vs Pawn: Catching the ${file}-Runner`, level: 'Intermediate',
    tagline: `Check the king toward the ${file}-pawn, then collect it.`,
    desc: `Queen beats a lone ${file}-pawn by checking its king toward the pawn, then walking the queen and king closer together. White improves here while Black shuffles near the runner. Never let it queen with check.`,
    ideas: [`Check first, approach second: tempi do the work.`, `Drive his king onto the pawn path toward ${pawn}.`, `Bring your own king up to finish the collection.`, `Beware stalemate nets once the pawn is pinned.`],
    pieces: [['K', wk], ['Q', wq], ['k', bk], ['p', pawn]], turn: 'w',
    mainPlan: [
      { prefs: kingTo(wk, bk), ex: exK('walk the king closer') },
      { prefs: kingTo(bk, pawn, false), ex: exK('Black cowers near the runner') },
      { prefs: [wq + wq[0] + (parseInt(wq[1], 10) + 1), wq + String.fromCharCode(wq.charCodeAt(0) + 1) + wq[1], wq + String.fromCharCode(wq.charCodeAt(0) - 1) + wq[1]].filter(u => /^[a-h][1-8][a-h][1-8]$/.test(u)), ex: exQ('the queen tightens the net') },
    ],
    drillPlan: [
      { prefs: kingTo(wk, bk), ex: exK('approach') },
      { prefs: kingTo(bk, 'c2', true), ex: exK('Black waits') },
      { prefs: kingTo(wk, pawn), ex: exK('closer still') },
    ],
    about: `White to play and win: hunt the ${file}-runner!`,
  });
}
L.push(qvpawn('b', 'b2', 'b1', 'h4', 'e3'));
L.push(qvpawn('d', 'd2', 'e1', 'h5', 'e4'));
L.push(qvpawn('f', 'f2', 'g1', 'a4', 'e3'));
L.push(qvpawn('g', 'g2', 'h1', 'a4', 'e3'));

// ================= S. BISHOP ENDINGS =================
L.push(std({
  id: 'e-bishop-same-1', title: 'Same-Color Bishops: Extra Pawn Wins', level: 'Advanced',
  tagline: 'Same color, one pawn up: fix, invade, convert.',
  desc: 'Same-colored bishop endings with an extra pawn are won by fixing enemy pawns on squares your bishop attacks, invading with the king, and shedding the bishops at the right moment. White fixes here, improves the bishop, and marches.',
  ideas: ['Fix his pawns on squares your bishop already attacks.', 'The extra pawn must be outside his blockade.', 'Invade with the king once his bishop is tied down.', 'Trade bishops only into a winning pawn ending.'],
  pieces: [['K', 'e4'], ['B', 'd5'], ['P', 'f4'], ['k', 'f6'], ['b', 'c6']], turn: 'w',
  mainPlan: [
    { prefs: ['f4f5', 'e4d4'], ex: exP('fix his pawns on dark squares') },
    { prefs: ['c6d7', 'c6b7', 'c6b5', 'c6e8'], ex: exB('Black repositions the bishop') },
    { prefs: ['e4e5', 'e4d4', 'e4f4'], ex: exK('invade with the king') },
  ],
  drillPlan: [
    { prefs: ['d5c4', 'd5e4'], ex: exB('improve the bishop') },
    { prefs: kingTo('f6', 'f7'), ex: exK('Black holds') },
    { prefs: ['e4d4', 'e4f4'], ex: exK('king in') },
  ],
  about: 'White to play and win: convert the extra pawn!',
}));
L.push(std({
  id: 'e-bishop-opp-1', title: 'Opposite-Color Bishops: Drawing Zone', level: 'Advanced',
  tagline: 'Opposite colors: the defender draws a pawn down.',
  desc: 'Opposite-colored bishops are the great drawing machine: the defender blockades on the color his bishop controls and the attacker cannot force through. Black sets the blockade here while White probes in vain.',
  ideas: ['Blockade on the color your bishop controls.', 'One pawn down is often drawn: do not panic.', 'Keep the bishop active: passive bishops lose even these.', 'Attacker: avoid these endings a pawn up.'],
  pieces: [['K', 'e4'], ['B', 'c4'], ['P', 'c5'], ['k', 'd7'], ['B', 'f6']], turn: 'w',
  mainPlan: [
    { prefs: ['c4d5', 'c4b5', 'c4b3'], ex: exB('White probes the blockade') },
    { prefs: ['f6e5', 'f6g5', 'f6d4'], ex: exB('Black holds the light squares') },
    { prefs: ['e4e5', 'e4d4', 'e4f4'], ex: exK('the king finds no way through') },
  ],
  drillPlan: [
    { prefs: ['c4b3', 'c4d3'], ex: exB('re-aim') },
    { prefs: kingTo('d7', 'd8'), ex: exK('Black waits') },
    { prefs: ['e4d4', 'e4f4'], ex: exK('blockaded') },
  ],
  about: 'White “tries” to win: test the opposite-color blockade!',
}));

// ================= T. KNIGHT ENDINGS =================
L.push(std({
  id: 'e-knight-tempo-1', title: 'Knight Endings: The Extra Tempo', level: 'Intermediate',
  tagline: 'Check with the knight, gain the move that queens.',
  desc: 'Knight endings turn on single tempi: a check at the right moment flips the move order. White forks a tempo here with knight check, the black king is pushed off the pawn path, and the passer runs.',
  ideas: ['Knight hops gain tempi the enemy king must spend.', 'Push him off the pawn road before advancing.', 'Knights need outposts: centralize before pushing.', 'One tempo decides: calculate the forcing move first.'],
  pieces: [['K', 'e3'], ['N', 'd4'], ['k', 'f6'], ['p', 'd5']], turn: 'w',
  mainPlan: [
    { prefs: ['d4f5', 'd4c6', 'd4f3'], ex: exN('centralize with tempo') },
    { prefs: kingTo('f6', 'f7', true), ex: exK('Black is shoved off the road') },
    { prefs: ['e3d4', 'e3e4', 'e3f4'], ex: exK('the king escorts through') },
  ],
  drillPlan: [
    { prefs: ['d4f5', 'd4b5'], ex: exN('gain the tempo') },
    { prefs: kingTo('f6', 'e6'), ex: exK('Black steps') },
    { prefs: ['e3e4'], ex: exK('follow up') },
  ],
  about: 'White to play: find the knight tempo!',
}));
L.push(std({
  id: 'e-knight-tempo-2', title: 'Knight Endings: Domination Sprint', level: 'Intermediate',
  tagline: 'Outpost first, sprint second: knight beats pawn.',
  desc: 'A centralized knight dominates a lone pawn: White plants the knight on its outpost, ties the black king down, and sprints the white king across. Domination means his pieces have no good squares left.',
  ideas: ['Centralize the knight to its best outpost first.', 'Tie his king to the pawn, then outrun it.', 'Knights blockade passers best from in front.', 'Sprint only once his king is fully tied.'],
  pieces: [['K', 'f3'], ['N', 'g4'], ['k', 'e6'], ['p', 'e5']], turn: 'w',
  mainPlan: [
    { prefs: ['g4h6', 'g4e3', 'g4h2'], ex: exN('take the dominating outpost') },
    { prefs: kingTo('e6', 'e7', true), ex: exK('Black clings to the pawn') },
    { prefs: ['f3e4', 'f3f4', 'f3g3'], ex: exK('sprint while he is tied down') },
  ],
  drillPlan: [
    { prefs: ['g4h6', 'g4f2'], ex: exN('outpost') },
    { prefs: kingTo('e6', 'd6'), ex: exK('Black holds') },
    { prefs: ['f3f4'], ex: exK('king up') },
  ],
  about: 'White to play: dominate, then sprint!',
}));

// ================= U. SHOULDERING / BODYCHECK / CORRESPONDING =================
L.push(std({
  id: 'e-shoulder-1', title: 'Shouldering: Bump Him Off', level: 'Intermediate',
  tagline: 'Bump his king wide, then take the key square.',
  desc: 'Shouldering means using your king to shove his off the pawn road: White steps into his path so Black must walk around. Each bumped tempo brings the pawn closer. Bump first, push second.',
  ideas: ['Step onto his road so he must detour.', 'Every detour tempo escorts the pawn one rank.', 'Bump with opposition in mind: stay two apart.', 'Push only after the bump has taken effect.'],
  pieces: [['K', 'd4'], ['P', 'e4'], ['k', 'd6']], turn: 'w',
  mainPlan: [
    { prefs: ['d4c5', 'd4e5', 'd4d5'], ex: exK('shoulder onto his road') },
    { prefs: kingTo('d6', 'd6', true), ex: exK('Black detours around') },
    { prefs: ['e4e5', ...kingTo('d4', 'd5')], ex: exP('the pawn cashes the tempo') },
  ],
  drillPlan: [
    { prefs: ['d4c4', 'd4e5'], ex: exK('bump') },
    { prefs: kingTo('d6', 'c6'), ex: exK('Black sidesteps') },
    { prefs: ['e4e5'], ex: exP('push') },
  ],
  about: 'White to play: shoulder him off the road!',
}));
L.push(std({
  id: 'e-bodycheck-1', title: 'Bodycheck: Kingside Shove', level: 'Intermediate',
  tagline: 'Check him with the pawn, shove him with the king.',
  desc: 'The kingside bodycheck: White rams g4-g5 with check, Black king is shoved off the g6 outpost, and the white king follows into the gap. Pawn checks that gain ground are the purest shouldering.',
  ideas: ['Pawn checks that gain ground double as shoves.', 'g4-g5 with check evicts him from g6.', 'Follow into the gap at once with the king.', 'Keep the pawn defended during the shove.'],
  pieces: [['K', 'f4'], ['P', 'g4'], ['k', 'f6']], turn: 'w',
  mainPlan: [
    { prefs: ['g4g5', 'f4e5'], ex: exP('bodycheck with check') },
    { prefs: kingTo('f6', 'f6', true), ex: exK('Black is shoved off') },
    { prefs: ['f4f5', 'f4e4', 'f4g4'], ex: exK('into the gap') },
  ],
  drillPlan: [
    { prefs: ['g4g5'], ex: exP('shove') },
    { prefs: kingTo('f6', 'e6'), ex: exK('Black retreats') },
    { prefs: ['f4e4'], ex: exK('follow') },
  ],
  about: 'White to play: bodycheck him off g6!',
}));
L.push(std({
  id: 'e-corresp-1', title: 'Corresponding Squares: Intro', level: 'Advanced',
  tagline: 'Match his square, take his tempo: correspondence.',
  desc: 'Corresponding squares generalize opposition: certain pairs belong together, and whoever holds the pair wins the entry. White steps to the matching square here so any black reply loses its mate. Learn one pair at a time.',
  ideas: ['Some square pairs correspond: hold yours and he yields.', 'Step to the matching square, not the closest one.', 'His every reply then drops a key entry.', 'Opposition is just the simplest correspondence.'],
  pieces: [['K', 'e3'], ['P', 'd4'], ['k', 'e6']], turn: 'w',
  mainPlan: [
    { prefs: ['e3d3', 'e3f3', 'e3e4'], ex: exK('step to the corresponding square') },
    { prefs: kingTo('e6', 'e7', true), ex: exK('his replies all drop something') },
    { prefs: ['d4d5', 'e3d4'], ex: exP('cash the correspondence') },
  ],
  drillPlan: [
    { prefs: ['e3f3', 'e3d3'], ex: exK('match squares') },
    { prefs: kingTo('e6', 'd6'), ex: exK('Black tries') },
    { prefs: ['d4d5'], ex: exP('through') },
  ],
  about: 'White to play: find the corresponding square!',
}));
L.push(std({
  id: 'e-shoulder-2', title: 'Shouldering: Queenside Bump', level: 'Intermediate',
  tagline: 'c4-c5 bumps him off the d6 post.',
  desc: 'Queenside shouldering with interest: White advances c4-c5 with check, evicting Black from d6, then shoulders the king through the hole. Pawn shoves plus king bumps combine into one winning march.',
  ideas: ['c4-c5 with check evicts the d6 blockade.', 'Follow the shove by occupying the hole.', 'Bump every step until the pawn queens.', 'Never let him re-occupy the post.'],
  pieces: [['K', 'c4'], ['P', 'd4'], ['k', 'd6']], turn: 'w',
  mainPlan: [
    { prefs: ['c4c5', 'c4b5', 'd4d5'], ex: exK('bump him off the post') },
    { prefs: kingTo('d6', 'd6', true), ex: exK('Black must walk around') },
    { prefs: ['d4d5', 'c5c6'], ex: exP('march through the hole') },
  ],
  drillPlan: [
    { prefs: ['c4b5', 'c4c5'], ex: exK('shoulder') },
    { prefs: kingTo('d6', 'e6'), ex: exK('Black detours') },
    { prefs: ['d4d5'], ex: exP('push') },
  ],
  about: 'White to play: bump him off d6!',
}));
L.push(std({
  id: 'e-pawn-duo-1', title: 'Pawn Duo: Connected Passers', level: 'Beginner',
  tagline: 'Two connected passers beat any lone king.',
  desc: 'Connected passed pawns defend each other all the way home: White advances the duo in steps, Black can attack only one at a time, and the survivor queens. Keep them connected: stragglers die alone.',
  ideas: ['Connected passers protect each other up the board.', 'Advance the rear pawn to keep contact.', 'He can only capture one: the other queens.', 'King escorts behind the duo, never ahead.'],
  pieces: [['K', 'e3'], ['P', 'd4'], ['P', 'e4'], ['k', 'd6']], turn: 'w',
  mainPlan: [
    { prefs: ['d4d5', 'e3d3'], ex: exP('the duo steps together') },
    { prefs: kingTo('d6', 'd6', true), ex: exK('Black picks one to attack') },
    { prefs: ['e4e5', 'e3e4'], ex: exP('the survivor runs') },
  ],
  drillPlan: [
    { prefs: ['d4d5'], ex: exP('duo forward') },
    { prefs: kingTo('d6', 'c6'), ex: exK('Black reacts') },
    { prefs: ['e4e5'], ex: exP('connected still') },
  ],
  about: 'White to play: march the connected duo!',
}));

// ================= EMIT =================
function q(s) {
  return "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}
const lines = [];
lines.push('// Endgame lessons part 2: 85 NEW lessons (STRATEGY_END). Generated by scripts/gen-strategy-end.mjs.');
lines.push('// Verified by scripts/check-strategy-end.mjs: fields, mainline + drill legality from startFen,');
lines.push('// arrow/highlight squares, drill turn match, e-mate-* drills ending in checkmate.');
lines.push('');
lines.push('const C = {');
lines.push("  green: '#22c55e',");
lines.push("  red: '#ef4444',");
lines.push("  blue: '#3b82f6',");
lines.push("  yellow: '#eab308',");
lines.push("  purple: '#a855f7',");
lines.push('};');
lines.push('');
lines.push('export const STRATEGY_END = [');
function step(s) {
  const parts = [`uci: ${q(s.uci)}`, `explanation: ${q(s.ex)}`];
  const a = s.arrows.map(x => `{ from: ${q(x.from)}, to: ${q(x.to)}, color: C.${x.color} }`).join(', ');
  parts.push(`arrows: [${a}]`);
  parts.push(`highlight: [${s.highlight.map(q).join(', ')}]`);
  return `      { ${parts.join(', ')} },`;
}
for (const o of L) {
  lines.push('  {');
  lines.push(`    id: ${q(o.id)},`);
  lines.push(`    title: ${q(o.title)},`);
  lines.push(`    phase: 'endgame',`);
  lines.push(`    level: ${q(o.level)},`);
  lines.push(`    tagline: ${q(o.tagline)},`);
  lines.push(`    description: ${q(o.desc)},`);
  lines.push('    keyIdeas: [');
  for (const k of o.ideas) lines.push(`      ${q(k)},`);
  lines.push('    ],');
  lines.push(`    startFen: ${q(o.startFen)},`);
  lines.push('    mainline: [');
  for (const s of o.main) lines.push(step(s));
  lines.push('    ],');
  lines.push('    drill: {');
  lines.push(`      startFen: ${q(o.drillFen)},`);
  lines.push(`      forColor: ${q(o.drillColor)},`);
  lines.push(`      about: ${q(o.about)},`);
  lines.push(`      moves: [${o.drillMoves.map(q).join(', ')}],`);
  lines.push('    },');
  lines.push('  },');
}
lines.push('];');
lines.push('');
writeFileSync(OUT, lines.join('\n'));
console.log(`lessons: ${L.length} -> ${OUT.pathname}`);
const ids = L.map(x => x.id);
const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
if (dup.length) { console.error('DUP IDS', dup); process.exit(1); }
console.log('ids unique ✔');

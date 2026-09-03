// One-pass matcher: finds candidate games for a wanted list across all PGNs.
// Usage: node scripts/match-games.mjs
import fs from 'node:fs';
import path from 'node:path';

const dir = '/tmp/pgns/all';

// [key, whiteFrag, blackFrag, yearFrag('' = any)]
const WANTED = [
  ['steinitz-bardeleben', 'steinitz', 'bardeleben', '1895'],
  ['zukertort-blackburne', 'zukertort', 'blackburne', '1883'],
  ['levitsky-marshall', 'levitsky', 'marshall', '1912'],
  ['capablanca-marshall', 'capablanca', 'marshall', '1918'],
  ['rotlevi-rubinstein', 'rotlevi', 'rubinstein', '1907'],
  ['tartakower-reti', 'tartakower', 'reti', '1910'],
  ['nimzo-tarrasch', 'nimzowitsch', 'tarrasch', '1914'],
  ['alekhine-reti', 'alekhine', 'reti', '1925'],
  ['bogoljubow-alekhine', 'bogoljubow', 'alekhine', '1922'],
  ['botvinnik-capa38', 'botvinnik', 'capablanca', '1938'],
  ['reti-capa24', 'reti', 'capablanca', '1924'],
  ['euwe-capa31', 'euwe', 'capablanca', '1931'],
  ['geller-euwe53', 'geller', 'euwe', '1953'],
  ['keres-fischer', 'keres', 'fischer', '1962'],
  ['keres-najdorf', 'keres', 'najdorf', '1953'],
  ['bronstein-boleslavsky', 'bronstein', 'boleslavsky', '1950'],
  ['spassky-larsen70', 'spassky', 'larsen', '1970'],
  ['larsen-spassky70', 'larsen', 'spassky', '1970'],
  ['larsen-tal65', 'larsen', 'tal', '1965'],
  ['tal-larsen65', 'tal', 'larsen', '1965'],
  ['tal-smyslov59', 'tal', 'smyslov', '1959'],
  ['karpov-korchnoi74', 'karpov', 'korchnoi', '1974'],
  ['karpov-spassky74', 'karpov', 'spassky', '1974'],
  ['karpov-unzicker', 'karpov', 'unzicker', '1974'],
  ['korchnoi-spassky', 'korchnoi', 'spassky', '1977'],
  ['kasparov-topalov99', 'kasparov', 'topalov', '1999'],
  ['topalov-kasparov99', 'topalov', 'kasparov', '1999'],
  ['kasparov-shirov', 'kasparov', 'shirov', ''],
  ['shirov-kasparov', 'shirov', 'kasparov', ''],
  ['kasparov-ivanchuk', 'kasparov', 'ivanchuk', ''],
  ['topalov-shirov98', 'topalov', 'shirov', '1998'],
  ['shirov-topalov98', 'shirov', 'topalov', '1998'],
  ['topalov-ponomariov', 'topalov', 'ponomariov', '2005'],
  ['topalov-anand', 'topalov', 'anand', '2010'],
  ['anand-topalov', 'anand', 'topalov', ''],
  ['anand-gelfand', 'anand', 'gelfand', ''],
  ['gelfand-anand', 'gelfand', 'anand', ''],
  ['anand-aronian', 'anand', 'aronian', '2013'],
  ['aronian-anand', 'aronian', 'anand', '2013'],
  ['anand-carlsen', 'anand', 'carlsen', '2013'],
  ['anand-shirov', 'anand', 'shirov', ''],
  ['carlsen-anand13', 'carlsen', 'anand', '2013'],
  ['carlsen-karjakin', 'carlsen', 'karjakin', '2016'],
  ['karjakin-carlsen', 'karjakin', 'carlsen', '2016'],
  ['carlsen-nepo', 'carlsen', 'nepomniachtchi', '2021'],
  ['carlsen-ernst', 'carlsen', 'ernst', '2004'],
  ['carlsen-nakamura', 'carlsen', 'nakamura', ''],
  ['nakamura-carlsen', 'nakamura', 'carlsen', ''],
  ['carlsen-topalov', 'carlsen', 'topalov', ''],
  ['carlsen-aronian', 'carlsen', 'aronian', ''],
  ['carlsen-kramnik', 'carlsen', 'kramnik', ''],
  ['carlsen-ivanchuk', 'carlsen', 'ivanchuk', ''],
  ['polgar-kasparov', 'polgar', 'kasparov', '1994'],
  ['polgar-anand', 'polgar', 'anand', ''],
  ['polgar-shirov', 'polgar', 'shirov', ''],
  ['polgar-spassky', 'polgar', 'spassky', ''],
  ['polgar-karpov', 'polgar', 'karpov', ''],
  ['short-timman', 'short', 'timman', '1991'],
  ['timman-short', 'timman', 'short', '1991'],
  ['short-karpov', 'short', 'karpov', '1992'],
  ['timman-yusupov', 'timman', 'yusupov', ''],
  ['yusupov-timman', 'yusupov', 'timman', ''],
  ['timman-karpov', 'timman', 'karpov', ''],
  ['gelfand-kramnik', 'gelfand', 'kramnik', ''],
  ['gelfand-carlsen', 'gelfand', 'carlsen', ''],
  ['ivanchuk-kasparov', 'ivanchuk', 'kasparov', ''],
  ['ivanchuk-anand', 'ivanchuk', 'anand', ''],
  ['ivanchuk-kramnik', 'ivanchuk', 'kramnik', ''],
  ['nakamura-caruana', 'nakamura', 'caruana', ''],
  ['caruana-nakamura', 'caruana', 'nakamura', ''],
  ['caruana-topalov14', 'caruana', 'topalov', '2014'],
  ['caruana-aronian14', 'caruana', 'aronian', '2014'],
  ['aronian-kramnik', 'aronian', 'kramnik', ''],
  ['so-caruana', 'so', 'caruana', '2016'],
  ['gligoric-fischer59', 'gligoric', 'fischer', '1959'],
  ['reshevsky-fischer', 'reshevsky', 'fischer', ''],
  ['fischer-byrne63', 'fischer', 'byrne', '1963'],
  ['lasker-tarrasch08', 'lasker', 'tarrasch', '1908'],
  ['schlechter-lasker', 'schlechter', 'lasker', '1910'],
  ['janowski-lasker', 'janowski', 'lasker', ''],
  ['capa-lasker14', 'capablanca', 'lasker', '1914'],
  ['alekhine-capa27', 'alekhine', 'capablanca', '1927'],
  ['capa-alekhine27', 'capablanca', 'alekhine', '1927'],
  ['euwe-alekhine35', 'euwe', 'alekhine', '1935'],
  ['alekhine-euwe37', 'alekhine', 'euwe', '1937'],
  ['nimzo-capa29', 'nimzowitsch', 'capablanca', '1929'],
  ['capa-nimzo29', 'capablanca', 'nimzowitsch', '1929'],
  ['svidler-kramnik', 'svidler', 'kramnik', ''],
  ['kramnik-svidler', 'kramnik', 'svidler', ''],
  ['morozevich-anand', 'morozevich', 'anand', ''],
  ['morozevich-kramnik', 'morozevich', 'kramnik', ''],
  ['geller-fischer', 'geller', 'fischer', ''],
  ['fischer-geller', 'fischer', 'geller', ''],
  ['larsen-fischer71', 'larsen', 'fischer', '1971'],
  ['fischer-larsen71', 'fischer', 'larsen', '1971'],
  ['larsen-spassky', 'larsen', 'spassky', ''],
  ['korchnoi-tarrasch?', 'korchnoi', 'tarrasch', ''],
];

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

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.pgn'));
const all = [];
for (const f of files) {
  const text = fs.readFileSync(path.join(dir, f), 'utf8');
  const games = splitGames(text);
  games.forEach((g, i) => {
    all.push({ f, i, w: tag(g, 'White'), b: tag(g, 'Black'), d: tag(g, 'Date'), e: tag(g, 'Event'), r: tag(g, 'Result') });
  });
}

for (const [key, wf, bf, yf] of WANTED) {
  const hits = all.filter(
    (g) => g.w.toLowerCase().includes(wf) && g.b.toLowerCase().includes(bf) && (!yf || g.d.startsWith(yf)),
  );
  console.log(`### ${key} (${hits.length})`);
  for (const h of hits.slice(0, 8)) {
    console.log(`  [${h.f}#${h.i}] ${h.d} | ${h.w} vs ${h.b} | ${h.r} | ${h.e}`);
  }
}

// List games in specific files compactly + run extra name searches.
// Usage: node scripts/pick-lists.mjs
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
const short = (n) => n.split(',')[0].replace(/^(Paul|Mikhail|Mihail|Robert James|Jose Raul|Alexander|Emanuel|Anatoly|Garry|Gary|Viswanathan|Vladimir|Veselin|Magnus|Boris V|Tigran|Mikhail|Max|Efim|Vassily|Nigel D|Jan H|Judit|Alexei|Levon|Fabiano|Hikaru|Wesley|Bent|Svetozar|Samuel Herman|Richard|Aaron|Paul|David I|Isaak|Miguel|Viktor|Wolfgang|Dawid Markelowicz|Frank James|Jean|Lionel|Adolf|Curt|Joseph Henry)\s*/g, '').split(' ').pop() || n;

const WCC = ['WorldChamp1886','WorldChamp1892','WorldChamp1894','WorldChamp1907','WorldChamp1908','WorldChamp1910a','WorldChamp1910b','WorldChamp1921','WorldChamp1927','WorldChamp1935','WorldChamp1937','WorldChamp1948','WorldChamp1951','WorldChamp1954','WorldChamp1958','WorldChamp1960','WorldChamp1961','WorldChamp1963','WorldChamp1966','WorldChamp1969','WorldChamp1972','WorldChamp1978','WorldChamp1981','WorldChamp1984','WorldChamp1985','WorldChamp1986','WorldChamp1987','WorldChamp1990','PCAChamp1993','PCAChamp1995','WorldChamp2000','WorldChamp2004','WorldChamp2006','WorldChamp2008'];
for (const f of WCC) {
  const p = path.join(dir, f + '.pgn');
  if (!fs.existsSync(p)) { console.log(`--- ${f}: MISSING`); continue; }
  const games = splitGames(fs.readFileSync(p, 'utf8'));
  console.log(`--- ${f} (${games.length})`);
  games.forEach((g, i) => {
    console.log(`  #${i} R${tag(g, 'Round')} ${short(tag(g, 'White'))}-${short(tag(g, 'Black'))} ${tag(g, 'Result')} ${tag(g, 'ECO')}`);
  });
}

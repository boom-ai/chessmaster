import { GAMES_01 } from './games01.js';
import { GAMES_02 } from './games02.js';
import { GAMES_03 } from './games03.js';
import { GAMES_04 } from './games04.js';
import { GAMES_05 } from './games05.js';
import { GAMES_06 } from './games06.js';
import { GAMES_07 } from './games07.js';
import { GAMES_08 } from './games08.js';
import { GAMES_09 } from './games09.js';
import { GAMES_10 } from './games10.js';

export const FAMOUS_GAMES = [
  ...GAMES_01,
  ...GAMES_02,
  ...GAMES_03,
  ...GAMES_04,
  ...GAMES_05,
  ...GAMES_06,
  ...GAMES_07,
  ...GAMES_08,
  ...GAMES_09,
  ...GAMES_10,
];

export function getGame(id) {
  return FAMOUS_GAMES.find((g) => g.id === id) ?? FAMOUS_GAMES[0];
}

export function gameEras() {
  const eras = [];
  for (const g of FAMOUS_GAMES) {
    const y = g.year;
    const era = y < 1900 ? 'Romantic Era' : y < 1930 ? 'Classical Era' : y < 1960 ? 'Soviet School' : y < 1990 ? 'Cold War Duels' : 'Modern Masters';
    if (!eras.includes(era)) eras.push(era);
  }
  return eras;
}

export function gameEra(year) {
  if (year < 1900) return 'Romantic Era';
  if (year < 1930) return 'Classical Era';
  if (year < 1960) return 'Soviet School';
  if (year < 1990) return 'Cold War Duels';
  return 'Modern Masters';
}

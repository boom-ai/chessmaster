export const BREAKPOINTS = { phone: 600, lesson2Col: 900, tablet: 1024, contentMax: 1120 };

export const ORDER = { board: 1, coach: 2, actions: 3, list: 4 };

export function lessonColumns(w) {
  return w >= 900 ? 2 : 1;
}

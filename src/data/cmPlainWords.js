/**
 * Plain-language words for ChessMaster teaching app.
 * No numbers / Elo / engine jargon in user-facing strings.
 */

/**
 * Convert UCI to plain short notation.
 * @param {string} uci e.g. 'e2e4', 'g1f3', 'e1g1', 'e1c1', 'e7e8q'
 * @param {string} [piece='p'] moving piece: 'p' | 'n' | 'b' | 'r' | 'q' | 'k' (case-insensitive).
 *   Required because the piece cannot be known from UCI alone.
 * @returns {string} e.g. 'e4', 'Nf3', 'O-O', 'O-O-O', 'e8=Q'
 */
export function toPlain(uci, piece = 'p') {
  if (typeof uci !== 'string') return '';
  const u = uci.trim().toLowerCase();
  if (u.length < 4) return '';

  // Castling (both colors).
  if (u === 'e1g1' || u === 'e8g8') return 'O-O';
  if (u === 'e1c1' || u === 'e8c8') return 'O-O-O';

  const to = u.slice(2, 4);

  // Promotion: 5-char UCI, e.g. e7e8q -> e8=Q
  if (u.length >= 5) {
    const promo = u[4].toUpperCase();
    if (['N', 'B', 'R', 'Q'].includes(promo)) {
      return `${to}=${promo}`;
    }
  }

  const p = String(piece || 'p').toLowerCase();
  if (p === 'p') return to;

  const letterMap = { n: 'N', b: 'B', r: 'R', q: 'Q', k: 'K' };
  const letter = letterMap[p] || 'P';
  // Fallback: never emit 'P' prefix for pawns; unknown maps to destination only.
  if (letter === 'P') return to;
  return `${letter}${to}`;
}

export const CM_PUZZLE_BANDS = [
  { id: 'starter', label: 'Starting out' },
  { id: 'practice', label: 'Getting practice' },
  { id: 'challenge', label: 'Tricky' },
];

export const CM_CONTROL_LABELS = {
  undo: 'Undo',
  hint: 'Hint',
  flip: 'Flip board',
  review: 'Review moves',
};

/**
 * Guarded confirm for destructive actions (resign, reset, etc.).
 * Safe in non-browser environments: returns false when no dialog available.
 * @param {string} msg
 * @returns {boolean}
 */
export function destructiveConfirm(msg) {
  try {
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      return window.confirm(msg);
    }
  } catch {
    return false;
  }
  return false;
}

import { useEffect, useState } from 'react';

export const CM_DISPLAY_MODES = ['kid', 'standard', 'senior'];

export const CM_AUTOPLAY_MS = { kid: 1750, standard: 3000, senior: 4500 };

const CM_TEXT_SIZE_PX = { kid: 17, standard: 16, senior: 19 };

const STORAGE_KEY = 'cm-display-v1';

// Plain helper for non-React code (autoplay intervals): read stored mode's ms.
export function readAutoplayMs(fallback = 3000) {
  const mode = readStoredMode();
  return CM_AUTOPLAY_MS[mode] ?? fallback;
}

function isValidMode(value) {
  return (
    value === 'kid' || value === 'standard' || value === 'senior'
  );
}

function readStoredMode() {
  if (typeof window === 'undefined') return 'standard';
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw == null) return 'standard';
    const parsed = JSON.parse(raw);
    const candidate =
      parsed != null && typeof parsed === 'object' && 'mode' in parsed
        ? parsed.mode
        : parsed;
    if (isValidMode(candidate)) return candidate;
    return 'standard';
  } catch {
    return 'standard';
  }
}

export function useCmDisplayMode() {  const [mode, setModeState] = useState(() => readStoredMode());

  useEffect(() => {
    const stored = readStoredMode();
    if (stored !== mode) setModeState(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode }));
    } catch {
      // storage unavailable — ignore
    }
  }, [mode]);

  function setMode(next) {
    const value = typeof next === 'function' ? next(mode) : next;
    if (!isValidMode(value)) return;
    setModeState(value);
  }

  const textSizePx = CM_TEXT_SIZE_PX[mode] ?? CM_TEXT_SIZE_PX.standard;
  const autoplayMs = CM_AUTOPLAY_MS[mode] ?? CM_AUTOPLAY_MS.standard;

  return { mode, setMode, textSizePx, autoplayMs };
}

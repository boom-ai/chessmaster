import { useCallback, useEffect, useState } from 'react';

export const THEME_KEY = 'cm-theme';
export const THEME_ORDER = ['system', 'light', 'dark'];

function readStoredTheme() {
  try {
    const v = window.localStorage.getItem(THEME_KEY);
    return THEME_ORDER.includes(v) ? v : 'system';
  } catch {
    return 'system';
  }
}

function applyTheme(mode) {
  try {
    const root = document.documentElement;
    if (mode === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', mode);
    }
  } catch {
    // ignore: storage / DOM may be unavailable
  }
}

const GLYPHS = {
  system: '◐',
  light: '☀',
  dark: '☾',
};

export default function UxThemeToggle({ className = '' }) {
  const [mode, setMode] = useState('system');

  useEffect(() => {
    setMode(readStoredTheme());
    const onChange = () => setMode(readStoredTheme());
    window.addEventListener('cm-theme-change', onChange);
    return () => window.removeEventListener('cm-theme-change', onChange);
  }, []);

  useEffect(() => {
    applyTheme(mode);
  }, [mode]);

  const cycle = useCallback(() => {
    setMode((prev) => {
      const i = THEME_ORDER.indexOf(prev);
      const next = THEME_ORDER[(i + 1) % THEME_ORDER.length];
      try {
        window.localStorage.setItem(THEME_KEY, next);
      } catch {
        // ignore write errors (private mode / blocked storage)
      }
      window.dispatchEvent(new Event('cm-theme-change'));
      return next;
    });
  }, []);

  const glyph = GLYPHS[mode] ?? GLYPHS.system;
  const label = mode.charAt(0).toUpperCase() + mode.slice(1);
  const next =
    THEME_ORDER[(THEME_ORDER.indexOf(mode) + 1) % THEME_ORDER.length];

  return (
    <button
      type="button"
      aria-label={`Theme: ${label}. Activate to switch to ${next}.`}
      aria-pressed={mode === 'dark'}
      title={`Theme: ${label} (switch to ${next})`}
      onClick={cycle}
      className={className ? `tm-toggle ${className}` : 'tm-toggle'}
      style={{ minWidth: 44, minHeight: 44 }}
    >
      <span className="tm-toggle-track" aria-hidden="true">
        <span className="tm-toggle-icon" aria-hidden="true">
          {glyph}
        </span>
      </span>
      <span className="tm-toggle-label">{label}</span>
    </button>
  );
}

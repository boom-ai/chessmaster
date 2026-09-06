export const THEME_KEY = 'cm-theme';

const VALID = ['system', 'light', 'dark'];

export function getInitialTheme() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return 'system';
    const v = window.localStorage.getItem(THEME_KEY);
    return VALID.includes(v) ? v : 'system';
  } catch {
    return 'system';
  }
}

export function resolveTheme(m) {
  const mode = VALID.includes(m) ? m : 'system';
  if (mode === 'light' || mode === 'dark') return mode;
  try {
    if (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      return 'dark';
    }
  } catch {
    // ignore: matchMedia unavailable
  }
  return 'light';
}

export const noFlashScript = `(function(){try{var m=null;try{m=window.localStorage.getItem('cm-theme');}catch(e){}if(m==='light'||m==='dark'){document.documentElement.dataset.theme=m;return;}var r='light';try{if(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches){r='dark';}}catch(e){}if(m&&m!=='system'){return;}return;}catch(e){}})();`;

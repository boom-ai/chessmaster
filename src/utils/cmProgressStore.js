const KEY = 'cm-progress-v1';

function defaultStore() {
  return { stars: {}, streakDays: 0, lastDay: null };
}

function toDayStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function todayStr() {
  return toDayStr(new Date());
}

function parseDay(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function dayDiff(fromStr, toStr) {
  const a = parseDay(fromStr);
  const b = parseDay(toStr);
  if (!a || !b) return null;
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / 86400000);
}

function readRaw() {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function writeRaw(value) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(KEY, value);
  } catch {
    // storage unavailable; ignore
  }
}

function normalize(p) {
  const base = defaultStore();
  if (!p || typeof p !== 'object') return base;
  const stars =
    p.stars && typeof p.stars === 'object' && !Array.isArray(p.stars) ? p.stars : {};
  const clean = {};
  for (const k of Object.keys(stars)) {
    const v = Number(stars[k]);
    if (Number.isFinite(v) && v >= 1) clean[k] = Math.min(3, Math.floor(v));
  }
  const streakDays =
    Number.isFinite(Number(p.streakDays)) && Number(p.streakDays) > 0
      ? Math.floor(Number(p.streakDays))
      : 0;
  const lastDay = typeof p.lastDay === 'string' && parseDay(p.lastDay) ? p.lastDay : null;
  return { stars: clean, streakDays, lastDay };
}

export function loadProgress() {
  try {
    const raw = readRaw();
    if (!raw) return defaultStore();
    const parsed = JSON.parse(raw);
    return normalize(parsed);
  } catch {
    return defaultStore();
  }
}

export function saveProgress(p) {
  try {
    writeRaw(JSON.stringify(normalize(p)));
  } catch {
    // ignore
  }
  return p;
}

function touchStreak(store) {
  const today = todayStr();
  if (store.lastDay === today) return store;
  if (!store.lastDay) {
    store.streakDays = 1;
    store.lastDay = today;
    return store;
  }
  const diff = dayDiff(store.lastDay, today);
  if (diff === null || diff < 0) {
    if (diff !== null && diff < 0) return store;
    store.streakDays = 1;
    store.lastDay = today;
    return store;
  }
  if (diff === 0) return store;
  if (diff === 1 || diff === 2) {
    store.streakDays = (store.streakDays || 0) + 1;
    store.lastDay = today;
    return store;
  }
  store.streakDays = 1;
  store.lastDay = today;
  return store;
}

export function awardStar(lessonId, n = 1) {
  const store = loadProgress();
  if (typeof lessonId === 'string' && lessonId.length > 0) {
    const add = Number.isFinite(Number(n)) && Number(n) > 0 ? Math.floor(Number(n)) : 1;
    const prev = Number(store.stars[lessonId]) || 0;
    store.stars[lessonId] = Math.min(3, Math.max(1, prev + add));
    touchStreak(store);
    saveProgress(store);
  }
  return store;
}

export function getStreak() {
  const store = loadProgress();
  if (!store.lastDay) return 0;
  const today = todayStr();
  if (store.lastDay === today) return store.streakDays || 0;
  const diff = dayDiff(store.lastDay, today);
  if (diff === null) return store.streakDays || 0;
  if (diff < 0) return store.streakDays || 0;
  if (diff === 1 || diff === 2) return store.streakDays || 0;
  try {
    saveProgress({ stars: store.stars, streakDays: 0, lastDay: store.lastDay });
  } catch {
    // ignore
  }
  return 0;
}

export function getCompletedIds() {
  const store = loadProgress();
  return Object.keys(store.stars).filter((id) => Number(store.stars[id]) >= 1);
}

export function nextLessonId(pathIds) {
  if (!Array.isArray(pathIds) || pathIds.length === 0) return null;
  const store = loadProgress();
  for (const id of pathIds) {
    if (!(Number(store.stars[id]) >= 1)) return id;
  }
  return null;
}

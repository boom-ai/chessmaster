const KID_RATE = 0.95;
const STANDARD_RATE = 1;
const SENIOR_RATE = 0.85;

function resolveRate(options) {
  if (options != null && typeof options.rate === 'number' && Number.isFinite(options.rate)) {
    return options.rate;
  }
  if (options != null && options.mode === 'kid') return KID_RATE;
  if (options != null && options.mode === 'senior') return SENIOR_RATE;
  if (options != null && options.mode === 'standard') return STANDARD_RATE;
  return STANDARD_RATE;
}

export function supportsTTS() {
  if (typeof window === 'undefined') return false;
  if (!('speechSynthesis' in window)) return false;
  return true;
}

export function speakText(text, { rate, mode } = {}) {
  if (typeof window === 'undefined') return;
  if (!('speechSynthesis' in window)) return;
  if (typeof text !== 'string' || text.trim() === '') return;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new window.SpeechSynthesisUtterance(text);
    const baseRate = resolveRate({ rate, mode });
    utterance.rate = baseRate;
    if (mode === 'kid' && (rate == null || typeof rate !== 'number')) {
      utterance.rate = KID_RATE;
    } else if (mode === 'senior' && (rate == null || typeof rate !== 'number')) {
      utterance.rate = SENIOR_RATE;
    }
    synth.speak(utterance);
  } catch {
    // speech synthesis unavailable — no-op
  }
}

export function stopSpeak() {
  if (typeof window === 'undefined') return;
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // no-op
  }
}

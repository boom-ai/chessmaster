// Stockfish (WASM worker) manager with UCI protocol + graceful fallback.
// Files are served from /engine/ (copied from the stockfish.js npm package).

import { findBestMove as localBestMove } from './fallbackEngine.js';

const wasmSupported =
  typeof WebAssembly === 'object' &&
  typeof WebAssembly.validate === 'function' &&
  WebAssembly.validate(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));

export class Engine {
  constructor() {
    this.worker = null;
    this.ready = false;
    this.failed = false;
    this.pending = null; // { resolve, reject, timeout }
    this.onEval = null; // (cpScoreFromWhitePerspective|null, mate|null) => void
    this.onStatus = null; // (status: 'loading'|'ready'|'fallback') => void
  }

  setStatus(s) {
    this.status = s;
    this.onStatus?.(s);
  }

  init() {
    if (this._initPromise) return this._initPromise;
    this._initPromise = this._doInit();
    return this._initPromise;
  }

  _doInit() {
    this.setStatus('loading');
    return new Promise((resolve) => {
      let settled = false;
      const done = (ok) => {
        if (settled) return;
        settled = true;
        if (ok) {
          this.ready = true;
          this.setStatus('ready');
        } else {
          this.failed = true;
          this.setStatus('fallback');
        }
        resolve(ok);
      };
      try {
        const base = import.meta.env.BASE_URL || '/';
        const file = wasmSupported ? 'stockfish.wasm.js' : 'stockfish.js';
        const url = `${base}engine/${file}`.replace(/\/+/g, '/');
        this.worker = new Worker(url);
        const timer = setTimeout(() => done(false), 8000);
        const onMsg = (e) => {
          const line = typeof e.data === 'string' ? e.data : '';
          if (line === 'uciok') {
            this.send('isready');
          } else if (line === 'readyok') {
            clearTimeout(timer);
            done(true);
          } else {
            this.handleLine(line);
          }
        };
        this.worker.addEventListener('message', onMsg);
        this.worker.addEventListener('error', () => {
          clearTimeout(timer);
          done(false);
        });
        this.worker.postMessage('uci');
      } catch {
        done(false);
      }
    });
  }

  send(cmd) {
    try {
      this.worker?.postMessage(cmd);
    } catch {
      /* ignore */
    }
  }

  handleLine(line) {
    if (!line) return;
    if (line.startsWith('bestmove')) {
      const parts = line.split(' ');
      const uci = parts[1];
      if (this.pending && uci && uci !== '(none)') {
        const { resolve, timeout } = this.pending;
        this.pending = null;
        clearTimeout(timeout);
        const from = uci.slice(0, 2);
        const to = uci.slice(2, 4);
        const promotion = uci.length > 4 ? uci[4] : undefined;
        resolve({ from, to, promotion, scoreCp: this.lastScore, mate: this.lastMate });
      } else if (this.pending) {
        const { reject, timeout } = this.pending;
        this.pending = null;
        clearTimeout(timeout);
        reject(new Error('no move'));
      }
      return;
    }
    if (line.startsWith('info') && line.includes(' score ')) {
      const m = line.match(/score\s+(cp|mate)\s+(-?\d+)/);
      if (m && this.onEval) {
        // score is from side-to-move perspective; we need white perspective -> track turn via fen
        const kind = m[1];
        const val = parseInt(m[2], 10);
        if (kind === 'mate') {
          this.lastMate = val;
          this.lastScore = val > 0 ? 100000 : -100000;
          this.onEval(this.turn === 'w' ? this.lastScore : -this.lastScore, this.turn === 'w' ? val : -val);
        } else {
          this.lastMate = null;
          this.lastScore = val;
          this.onEval(this.turn === 'w' ? val : -val, null);
        }
      }
    }
  }

  /** Ask engine for a move. Resolves { from, to, promotion, scoreCp }. Falls back to local search. */
  getBestMove(fen, { depth = 10, movetime = 600, skill = 10 } = {}) {
    const turn = fen.split(' ')[1] || 'w';
    if (this.failed || !this.worker || !this.ready) {
      return Promise.resolve(this.localMove(fen, depth));
    }
    return new Promise((resolve) => {
      const fallback = () => {
        if (this.pending) {
          this.pending = null;
          resolve(this.localMove(fen, depth));
        }
      };
      const timeout = setTimeout(fallback, movetime + 6000);
      this.pending = { resolve, reject: fallback, timeout };
      this.turn = turn;
      this.lastScore = null;
      this.lastMate = null;
      this.send(`setoption name Skill Level value ${skill}`);
      this.send(`position fen ${fen}`);
      this.send(`go depth ${depth} movetime ${movetime}`);
    });
  }

  localMove(fen, depth) {
    const d = Math.min(Math.max(depth > 8 ? 3 : 2, 1), 3);
    const r = localBestMove(fen, d) || { from: 'e2', to: 'e4' };
    return { ...r, local: true };
  }

  stop() {
    try {
      this.send('stop');
    } catch {
      /* ignore */
    }
    if (this.pending) {
      const p = this.pending;
      this.pending = null;
      clearTimeout(p.timeout);
      p.reject(new Error('stopped'));
    }
  }

  terminate() {
    try {
      this.worker?.terminate();
    } catch {
      /* ignore */
    }
  }
}

let singleton = null;
export function getEngine() {
  if (!singleton) singleton = new Engine();
  return singleton;
}

import { useState } from 'react';
import '../css/cm-controls.css';

/**
 * First-step hint for learn mode.
 * Renders as a small dismissible banner above the board (in normal flow —
 * never covering the board) only on mode==='learn' && stepIndex===0, else null.
 */
export function CmLearnAffordance({ mode, stepIndex, onStartPractice }) {
  const [dismissed, setDismissed] = useState(false);
  if (!(mode === 'learn' && stepIndex === 0) || dismissed) {
    return null;
  }

  return (
    <div className="cm-afford-overlay" role="note" aria-label="How to use this lesson">
      <div className="cm-afford-card">
        <p>Watch first, then press Practice 👇</p>
        <div className="btn-row wrap">
          <button
            type="button"
            className="cm-controls-btn"
            aria-label="Start practice"
            onClick={onStartPractice}
          >
            Practice
          </button>
          <button
            type="button"
            className="cm-controls-btn"
            aria-label="Dismiss this tip"
            onClick={() => setDismissed(true)}
          >
            Got it ✕
          </button>
        </div>
      </div>
    </div>
  );
}

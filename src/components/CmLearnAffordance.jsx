import '../css/cm-controls.css';

/**
 * First-step affordance for learn mode.
 * Renders an overlay card only on mode==='learn' && stepIndex===0, else null.
 */
export function CmLearnAffordance({ mode, stepIndex, onStartPractice }) {
  if (!(mode === 'learn' && stepIndex === 0)) {
    return null;
  }

  return (
    <div className="cm-afford-overlay">
      <div className="cm-afford-card">
        <p>Watch first, then press Practice</p>
        <button
          type="button"
          className="cm-controls-btn"
          aria-label="Practice"
          onClick={onStartPractice}
        >
          Practice
        </button>
      </div>
    </div>
  );
}

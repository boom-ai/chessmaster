import { CM_CONTROL_LABELS } from '../data/cmPlainWords.js';
import '../css/cm-controls.css';

/**
 * Labeled board controls — every button shows a text label, never icon-only.
 * Props:
 *  - onUndo, onHint, onFlip, onReview: handlers (optional)
 *  - canUndo: bool, disables Undo when false
 *  - evalPlain: string|null, e.g. 'White is ahead' (never numbers)
 *  - className: optional passthrough appended to the bar
 */
export function CmLabeledBoardControls({
  onUndo,
  onHint,
  onFlip,
  onReview,
  canUndo,
  evalPlain,
  className = '',
}) {
  const barClass = ['cm-controls-bar', className].filter(Boolean).join(' ');

  return (
    <div className={barClass}>
      <button
        type="button"
        className="cm-controls-btn"
        aria-label={CM_CONTROL_LABELS.undo}
        onClick={onUndo}
        disabled={!canUndo}
      >
        {CM_CONTROL_LABELS.undo}
      </button>
      <button
        type="button"
        className="cm-controls-btn"
        aria-label={CM_CONTROL_LABELS.hint}
        onClick={onHint}
      >
        {CM_CONTROL_LABELS.hint}
      </button>
      <button
        type="button"
        className="cm-controls-btn"
        aria-label={CM_CONTROL_LABELS.flip}
        onClick={onFlip}
      >
        {CM_CONTROL_LABELS.flip}
      </button>
      <button
        type="button"
        className="cm-controls-btn"
        aria-label={CM_CONTROL_LABELS.review}
        onClick={onReview}
      >
        {CM_CONTROL_LABELS.review}
      </button>
      {typeof evalPlain === 'string' && evalPlain.length > 0 ? (
        <p className="cm-controls-note">{evalPlain}</p>
      ) : null}
    </div>
  );
}

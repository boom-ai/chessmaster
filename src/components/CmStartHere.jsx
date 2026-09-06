import React from 'react';

export function CmStartHere({ steps, completedIds = [], onChoose }) {
  const total = steps ? steps.length : 0;
  const done = steps ? steps.filter((s) => completedIds.includes(s.id)).length : 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const handleChoose = (targetTab) => {
    if (typeof onChoose === 'function') onChoose(targetTab);
  };

  return (
    <div className="cm-path-wrap">
      <div
        className="cm-path-progress"
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`Completed ${done} of ${total} steps`}
      >
        {done} of {total} done ({pct}%)
      </div>
      <div className="cm-path-grid">
        {(steps || []).map((step, i) => (
          <div className="cm-path-card" key={step.id}>
            <span className="cm-path-num" aria-hidden="true">
              {i + 1}
            </span>
            <h3>{step.titlePlain}</h3>
            <p>{step.kidTitle}</p>
            <p>{step.oneLine}</p>
            <button
              type="button"
              className="cm-path-cta"
              onClick={() => handleChoose(step.targetTab)}
            >
              {step.action}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CmPathChecklist({ steps, completedIds = [] }) {
  return (
    <div className="cm-path-wrap">
      <ul>
        {(steps || []).map((step, i) => (
          <li key={step.id}>
            <span className="cm-path-num" aria-hidden="true">
              {i + 1}
            </span>{' '}
            {completedIds.includes(step.id) ? '✓ ' : '○ '}
            {step.titlePlain}
          </li>
        ))}
      </ul>
    </div>
  );
}

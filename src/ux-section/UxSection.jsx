import React from 'react';

export function UxSectionHeader({ eyebrow, title, sub, meta }) {
  return (
    <div className="ux-sec-head">
      {eyebrow ? <div className="ux-sec-eyebrow">{eyebrow}</div> : null}
      {title ? <h2 className="ux-sec-title">{title}</h2> : null}
      {sub ? <p className="ux-sec-sub">{sub}</p> : null}
      {meta ? <div className="ux-sec-meta">{meta}</div> : null}
    </div>
  );
}

export function UxCard({ index, status = 'todo', title, body, hint, ctaLabel, onCta }) {
  const statusClass =
    status === 'done' ? 'ux-item ux-item-done' : status === 'current' ? 'ux-item ux-item-current' : 'ux-item';
  const handleCta = () => {
    if (typeof onCta === 'function') onCta();
  };
  return (
    <div className={statusClass}>
      {index != null ? (
        <span className="ux-item-badge" aria-hidden="true">
          {index}
        </span>
      ) : null}
      {title ? <h3 className="ux-item-title">{title}</h3> : null}
      {body ? <p className="ux-item-body">{body}</p> : null}
      {hint ? <p className="ux-item-hint">{hint}</p> : null}
      {ctaLabel ? (
        <div className="ux-item-foot">
          <button type="button" className="ux-item-cta" onClick={handleCta}>
            {ctaLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function UxCoachCallout({ label = 'COACH TIP', children }) {
  return (
    <div className="ux-coach">
      <div className="ux-coach-label">{label}</div>
      <div className="ux-coach-body">{children}</div>
    </div>
  );
}

export function UxEmptyState({ icon, title, why, ctaLabel, onCta }) {
  const handleCta = () => {
    if (typeof onCta === 'function') onCta();
  };
  return (
    <div className="ux-empty">
      {icon ? (
        <div className="ux-empty-icon" aria-hidden="true">
          {icon}
        </div>
      ) : null}
      {title ? <h3 className="ux-empty-title">{title}</h3> : null}
      {why ? <p className="ux-empty-why">{why}</p> : null}
      {ctaLabel ? (
        <button type="button" className="ux-empty-cta" onClick={handleCta}>
          {ctaLabel}
        </button>
      ) : null}
    </div>
  );
}

export function UxProgress({ done, total }) {
  const safeTotal = total > 0 ? total : 0;
  const safeDone = done > 0 ? done : 0;
  const pct = safeTotal > 0 ? Math.round((safeDone / safeTotal) * 100) : 0;
  return (
    <div className="ux-progress">
      <div
        className="ux-progress-bar"
        role="progressbar"
        aria-valuenow={safeDone}
        aria-valuemin={0}
        aria-valuemax={safeTotal}
        aria-label={`Completed ${safeDone} of ${safeTotal} steps`}
      >
        <div className="ux-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="ux-progress-meta">
        {safeDone} of {safeTotal} done ({pct}%)
      </div>
    </div>
  );
}

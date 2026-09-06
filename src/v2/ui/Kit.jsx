import { useState } from "react";

export function Button({ level = "filled", label, onClick, disabled }) {
  return (
    <button
      type="button"
      className={"v2-btn v2-btn--" + level}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}

export function Card({ title, sub, meta, onClick }) {
  if (onClick) {
    return (
      <button type="button" className="v2-card v2-card--clickable" onClick={onClick}>
        <span className="v2-section-header__title">{title}</span>
        {sub ? <span className="v2-section-header__sub">{sub}</span> : null}
        {meta ? <span className="v2-progress__label">{meta}</span> : null}
      </button>
    );
  }
  return (
    <div className="v2-card">
      <span className="v2-section-header__title">{title}</span>
      {sub ? <span className="v2-section-header__sub">{sub}</span> : null}
      {meta ? <span className="v2-progress__label">{meta}</span> : null}
    </div>
  );
}

export function SectionHeader({ title, sub, action }) {
  return (
    <div className="v2-section-header">
      <span className="v2-section-header__title">{title}</span>
      {sub ? <span className="v2-section-header__sub">{sub}</span> : null}
      {action ? <span className="v2-progress__label">{action}</span> : null}
    </div>
  );
}

export function Progress({ value, max, label }) {
  const safeMax = max > 0 ? max : 1;
  const clamped = Math.min(Math.max(value, 0), safeMax);
  const pct = (clamped / safeMax) * 100;
  return (
    <div className="v2-progress">
      <div className="v2-progress__bar" style={{ width: pct + "%" }} />
      {label ? <span className="v2-progress__label">{label}</span> : null}
    </div>
  );
}

export function CoachCallout({ text, avatar }) {
  return (
    <div className="v2-coach">
      <span className="v2-coach__avatar">{avatar}</span>
      <span className="v2-coach__bubble">{text}</span>
    </div>
  );
}

export function EmptyState({ icon, title, hint, actionLabel, onAction }) {
  return (
    <div className="v2-empty">
      {icon ? <span className="v2-empty__icon">{icon}</span> : null}
      <span className="v2-empty__title">{title}</span>
      {hint ? <span className="v2-section-header__sub">{hint}</span> : null}
      {actionLabel ? (
        <button type="button" className="v2-empty__action" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export function Chip({ label, active, onClick }) {
  return (
    <button
      type="button"
      className={active ? "v2-chip v2-chip--active" : "v2-chip"}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export function SearchField({ value, onChange, placeholder }) {
  return (
    <input
      type="search"
      className="v2-search"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  );
}

export function Stars({ earned, total }) {
  const safeTotal = total > 0 ? total : 0;
  const safeEarned = Math.min(Math.max(earned, 0), safeTotal);
  const items = [];
  for (let i = 0; i < safeTotal; i += 1) {
    const isEarned = i < safeEarned;
    const isLatest = i === safeEarned - 1;
    items.push(
      <span
        key={i}
        className={
          isEarned
            ? isLatest
              ? "v2-star v2-star--earned v2-star--pop"
              : "v2-star v2-star--earned"
            : "v2-star"
        }
      >
        {"\u2605"}
      </span>
    );
  }
  return <div className="v2-stars">{items}</div>;
}

export function Accordion({ items }) {
  const [openIndex, setOpenIndex] = useState(-1);
  const list = Array.isArray(items) ? items : [];
  return (
    <div className="v2-accordion">
      {list.map((item, index) => {
        const open = index === openIndex;
        return (
          <div key={index} className="v2-accordion">
            <button
              type="button"
              className="v2-accordion__trigger"
              onClick={() => setOpenIndex(open ? -1 : index)}
            >
              {item.title}
            </button>
            {open ? <div className="v2-accordion__panel">{item.content}</div> : null}
          </div>
        );
      })}
    </div>
  );
}

export function ActionBar({ primaryLabel, onPrimary, secondaryLabel, onSecondary }) {
  return (
    <div className="v2-actionbar">
      {secondaryLabel ? (
        <button type="button" className="v2-btn v2-btn--text" onClick={onSecondary}>
          {secondaryLabel}
        </button>
      ) : null}
      <button type="button" className="v2-btn v2-btn--filled" onClick={onPrimary}>
        {primaryLabel}
      </button>
    </div>
  );
}

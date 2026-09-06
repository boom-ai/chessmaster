import { Children, cloneElement, isValidElement, useId, useState } from 'react';

export function TbCoachAcc({ defaultOpen = 0, single = true, children }) {
  const items = Children.toArray(children).filter(Boolean);
  const [openIndex, setOpenIndex] = useState(defaultOpen);
  const [openSet, setOpenSet] = useState(() =>
    typeof defaultOpen === 'number' ? new Set([defaultOpen]) : new Set()
  );
  const baseId = useId();

  const isOpenAt = (i) => (single ? openIndex === i : openSet.has(i));

  const toggleAt = (i) => {
    if (single) {
      setOpenIndex((prev) => (prev === i ? -1 : i));
    } else {
      setOpenSet((prev) => {
        const next = new Set(prev);
        if (next.has(i)) next.delete(i);
        else next.add(i);
        return next;
      });
    }
  };

  return (
    <div className="tb-coachacc">
      {items.map((child, i) => {
        if (!isValidElement(child)) return child;
        return cloneElement(child, {
          key: child.key ?? `${baseId}-${i}`,
          open: isOpenAt(i),
          onToggle: () => toggleAt(i),
          buttonId: `${baseId}-btn-${i}`,
          panelId: `${baseId}-panel-${i}`,
        });
      })}
    </div>
  );
}

export function TbCoachAccItem({ title, children, open, onToggle, buttonId, panelId }) {
  const isOpen = !!open;
  return (
    <div className="tb-coachacc-item">
      <button
        type="button"
        className="tb-coachacc-btn"
        aria-expanded={isOpen}
        aria-controls={panelId}
        id={buttonId}
        onClick={onToggle}
      >
        <span>{title}</span>
        <span aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
      </button>
      <div
        className="tb-coachacc-panel"
        role="region"
        aria-labelledby={buttonId}
        id={panelId}
        hidden={!isOpen}
      >
        {children}
      </div>
    </div>
  );
}

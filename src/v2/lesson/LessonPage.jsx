import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/Kit.jsx";

const CONFETTI = [
  { left: "2%", delay: "0ms" },
  { left: "10%", delay: "120ms" },
  { left: "18%", delay: "240ms" },
  { left: "26%", delay: "60ms" },
  { left: "34%", delay: "300ms" },
  { left: "42%", delay: "180ms" },
  { left: "50%", delay: "0ms" },
  { left: "58%", delay: "360ms" },
  { left: "66%", delay: "120ms" },
  { left: "74%", delay: "240ms" },
  { left: "82%", delay: "60ms" },
  { left: "90%", delay: "300ms" },
];

export function LessonPage({ progress, coach, board, hint, controls, list, streak }) {
  return (
    <div className="v2-lesson">
      <div className="v2-lesson__progress">
        {progress}
        {streak === undefined || streak === null || streak === "" ? null : (
          <span className="v2-streak-chip">{streak}</span>
        )}
      </div>
      <div className="v2-lesson__coach">{coach}</div>
      <div className="v2-lesson__board">{board}</div>
      <div className="v2-lesson__hint">{hint}</div>
      <div className="v2-lesson__controls">{controls}</div>
      <div className="v2-lesson__list">{list}</div>
    </div>
  );
}

export function UpNextDrawer({ open, items, onSelect, onClose }) {
  const dialogRef = useRef(null);
  const entries = Array.isArray(items) ? items : [];
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    if (dialogRef.current && typeof dialogRef.current.focus === "function") {
      dialogRef.current.focus();
    }
    const onKeyDown = (event) => {
      if (event.key === "Escape" && typeof onClose === "function") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);
  return (
    <div className={open ? "v2-upnext v2-upnext--open" : "v2-upnext"}>
      <div className="v2-upnext__scrim" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="v2-lesson__list"
        role="dialog"
        aria-modal="true"
        aria-label="Up next"
      >
        {entries.map((item) => (
          <Button
            key={item.id}
            label={item.done ? item.title + " ✓" : item.title}
            onClick={() => {
              if (typeof onSelect === "function") {
                onSelect(item.id);
              }
            }}
          />
        ))}
        <Button level="text" label="Close" onClick={onClose} />
      </div>
    </div>
  );
}

export function CelebrateSummary({ stars, xp, perfect, onNext, onRetry }) {
  const starCount = typeof stars === "number" ? stars : 0;
  const target = typeof xp === "number" ? xp : 0;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (target <= 0) {
      setShown(0);
      return undefined;
    }
    let frame = 0;
    const started = Date.now();
    const duration = 750;
    const tick = () => {
      const elapsed = Date.now() - started;
      const ratio = Math.min(elapsed / duration, 1);
      setShown(Math.round(target * ratio));
      if (ratio < 1) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [target]);
  const starItems = [];
  for (let i = 0; i < starCount; i += 1) {
    starItems.push(<span key={"star-" + i}>{"\u2605"}</span>);
  }
  return (
    <div className="v2-celebrate" role="status">
      <div className="v2-celebrate__stars" aria-label={starCount + " stars"}>
        {starItems}
        {perfect
          ? CONFETTI.map((piece, index) => (
              <span
                key={"confetti-" + index}
                aria-hidden="true"
                style={{ left: piece.left, animationDelay: piece.delay }}
              />
            ))
          : null}
      </div>
      <span className="v2-streak-chip">{"+" + shown + " XP"}</span>
      <div className="v2-lesson__controls">
        <Button level="text" label="Retry" onClick={onRetry} />
        <Button label="Next" onClick={onNext} />
      </div>
    </div>
  );
}

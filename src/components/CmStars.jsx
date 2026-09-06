export function CmStars({ count, max = 3 }) {
  const safeMax = Number.isFinite(Number(max)) && Number(max) > 0 ? Math.floor(Number(max)) : 3;
  const safeCount =
    Number.isFinite(Number(count)) && Number(count) > 0
      ? Math.min(safeMax, Math.floor(Number(count)))
      : 0;
  const filled = Array.from({ length: safeCount }, (_, i) => i);
  const empty = Array.from({ length: safeMax - safeCount }, (_, i) => i);
  return (
    <span className="cm-stars-row" role="img" aria-label={`${safeCount} of ${safeMax} stars`}>
      {filled.map((i) => (
        <span key={`f-${i}`} className="cm-star-on" aria-hidden="true">
          ★
        </span>
      ))}
      {empty.map((i) => (
        <span key={`e-${i}`} aria-hidden="true">
          ☆
        </span>
      ))}
    </span>
  );
}

export function CmProgressBar({ done, total }) {
  const safeTotal = Number.isFinite(Number(total)) && Number(total) > 0 ? Number(total) : 0;
  const safeDone = Number.isFinite(Number(done)) && Number(done) > 0 ? Math.min(Number(done), safeTotal) : 0;
  const pct = safeTotal > 0 ? Math.round((safeDone / safeTotal) * 100) : 0;
  return (
    <div
      className="cm-progress-track"
      role="progressbar"
      aria-valuenow={safeDone}
      aria-valuemin={0}
      aria-valuemax={safeTotal}
      aria-label={`${safeDone} of ${safeTotal} complete`}
    >
      <div style={{ width: `${pct}%`, height: '100%' }} />
    </div>
  );
}

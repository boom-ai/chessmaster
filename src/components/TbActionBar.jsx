export function TbActionBar({ actions }) {
  const list = Array.isArray(actions) ? actions : [];
  return (
    <nav className="tb-actionbar" aria-label="Lesson actions">
      <div className="tb-actionbar-inner">
        {list.map((a) => (
          <button
            key={a.id}
            type="button"
            className={`tb-actionbar-btn${a.primary ? ' primary' : ''}`}
            onClick={a.onClick}
          >
            {a.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

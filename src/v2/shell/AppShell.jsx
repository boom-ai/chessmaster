import { TABS } from "./tabs.js";

export function AppShell({ tabs = TABS, activeId, onNavigate, children, fab, themeToggle }) {
  return (
    <div className="v2-app-shell">
      <TopAppBar title="ChessMaster" themeToggle={themeToggle} />
      <SideBar tabs={tabs} activeId={activeId} onNavigate={onNavigate} />
      <NavRail tabs={tabs} activeId={activeId} onNavigate={onNavigate} />
      <main>{children}</main>
      <BottomNav tabs={tabs} activeId={activeId} onNavigate={onNavigate} />
      {fab ? <div className="v2-fab">{fab}</div> : null}
    </div>
  );
}

export function TopAppBar({ title, onSearch, onHelp, themeToggle }) {
  const searchSlot =
    typeof onSearch === "function" ? (
      <button type="button" onClick={onSearch} aria-label="Search">
        {"🔍"}
      </button>
    ) : (
      onSearch ?? null
    );
  const helpSlot =
    typeof onHelp === "function" ? (
      <button type="button" onClick={onHelp} aria-label="Help">
        {"?"}
      </button>
    ) : (
      onHelp ?? null
    );
  return (
    <header className="v2-topbar">
      <span aria-hidden="true">{"♞"}</span>
      <div className="v2-topbar-title">{title}</div>
      <div className="v2-topbar-actions">
        {searchSlot}
        {helpSlot}
        {themeToggle ?? null}
      </div>
    </header>
  );
}

const LEARN_IDS = ["openings", "middlegame", "endgame", "games"];

export function BottomNav({ tabs = TABS, activeId, onNavigate }) {
  const list = tabs ?? TABS;
  const core = list.filter((t) => t.id === "start" || t.id === "play" || t.id === "puzzles");
  const items = [...core, { id: "learn-hub", label: "Learn", icon: "🎓", group: "STUDY" }];
  return (
    <nav className="v2-bottomnav" aria-label="Primary">
      {items.map((item) => {
        const isActive =
          item.id === "learn-hub"
            ? activeId === "learn-hub" || LEARN_IDS.includes(activeId)
            : activeId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() =>
              item.id === "learn-hub" ? onNavigate?.("openings") : onNavigate?.(item.id)
            }
            className={
              isActive ? "v2-bottomnav-item v2-bottomnav-item--active" : "v2-bottomnav-item"
            }
            aria-current={isActive ? "page" : undefined}
          >
            <span aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function NavRail({ tabs = TABS, activeId, onNavigate }) {
  const items = (tabs ?? TABS).slice(0, 8);
  return (
    <nav className="v2-rail" aria-label="Primary">
      {items.map((item) => {
        const isActive = activeId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate?.(item.id)}
            className={isActive ? "v2-rail-item v2-rail-item--active" : "v2-rail-item"}
            aria-current={isActive ? "page" : undefined}
          >
            <span aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function SideBar({ tabs = TABS, activeId, onNavigate }) {
  const list = tabs ?? TABS;
  const groups = [];
  for (const t of list) {
    let g = groups.find((x) => x.name === t.group);
    if (!g) {
      g = { name: t.group, items: [] };
      groups.push(g);
    }
    g.items.push(t);
  }
  return (
    <nav className="v2-sidebar" aria-label="Sections">
      {groups.map((g) => (
        <div key={g.name} className="v2-sidebar-group">
          <p className="v2-sidebar-label">{g.name}</p>
          {g.items.map((item) => {
            const isActive = activeId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate?.(item.id)}
                className={
                  isActive ? "v2-sidebar-item v2-sidebar-item--active" : "v2-sidebar-item"
                }
                aria-current={isActive ? "page" : undefined}
              >
                <span aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function FirstRunWelcome({ onStart, onGuidedTour }) {
  return (
    <section className="v2-welcome" aria-label="Welcome">
      <h2>Learn the game, one step at a time</h2>
      <p>Play, solve puzzles, and study classic ideas. No account needed.</p>
      <div className="v2-welcome-actions">
        <button type="button" onClick={onStart}>
          Start playing
        </button>
        <button type="button" onClick={onGuidedTour}>
          Take a guided tour
        </button>
      </div>
    </section>
  );
}

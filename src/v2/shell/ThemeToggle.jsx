const ORDER = ["system", "light", "dark"];

const META = {
  system: { glyph: "🖥️", label: "Auto" },
  light: { glyph: "☀️", label: "Light" },
  dark: { glyph: "🌙", label: "Dark" },
};

export function ThemeToggle({ theme = "system", onToggle }) {
  const current = META[theme] ? theme : "system";
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
  const meta = META[current];
  return (
    <button
      type="button"
      className="v2-theme-toggle"
      onClick={() => onToggle?.(next)}
      aria-pressed={current !== "system"}
      aria-label={`Theme: ${meta.label}. Switch to ${META[next].label}`}
      title={`Theme: ${meta.label}`}
    >
      <span aria-hidden="true">{meta.glyph}</span>
      <span>{meta.label}</span>
    </button>
  );
}

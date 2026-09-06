const OPTIONS = [
  {
    id: 'kid',
    title: 'Kid-friendly',
    hint: 'Roomy spacing, read-aloud friendly.',
  },
  {
    id: 'standard',
    title: 'Standard',
    hint: 'Default text and move speed.',
  },
  {
    id: 'senior',
    title: 'Senior',
    hint: 'Bigger text for easy reading.',
  },
];

export function CmDisplaySettings({ value, onChange, onSpeak }) {
  function handleSpeak() {
    if (typeof onSpeak === 'function') {
      onSpeak();
    }
  }

  return (
    <div className="cm-display-panel">
      <div role="radiogroup" aria-label="Display mode">
        {OPTIONS.map((opt) => (
          <label
            key={opt.id}
            className="cm-display-radio cm-focus-ring"
            style={{ minHeight: 48, minWidth: 48, display: 'flex', alignItems: 'center', gap: 12 }}
          >
            <input
              type="radio"
              name="cm-display-mode"
              value={opt.id}
              checked={value === opt.id}
              onChange={() => {
                if (typeof onChange === 'function') onChange(opt.id);
              }}
              style={{ width: 24, height: 24, minWidth: 48, minHeight: 48 }}
            />
            <span>
              <span style={{ display: 'block', fontWeight: 600 }}>{opt.title}</span>
              <span style={{ display: 'block' }}>{opt.hint}</span>
            </span>
          </label>
        ))}
      </div>
      <p style={{ margin: '8px 0 0' }}>Slower moves give extra time to follow each step.</p>
      <button
        type="button"
        className="cm-display-demo cm-focus-ring"
        onClick={handleSpeak}
        style={{ minHeight: 48, minWidth: 48 }}
      >
        Read aloud: hear this demo
      </button>
    </div>
  );
}

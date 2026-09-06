import { nextLessonId } from '../utils/cmProgressStore.js';

const DEFAULT_PATH = [
  'start',
  'mate1',
  'open-habits',
  'tactics',
  'endgames',
  'repertoire',
  'middlegame',
  'classics',
  'playbook',
];

export function CmNextStep({ completedIds, onGo }) {
  const done = Array.isArray(completedIds) ? completedIds : [];
  const storeNext = nextLessonId(DEFAULT_PATH);
  const propNext = DEFAULT_PATH.find((id) => !done.includes(id)) ?? null;
  const nextId = done.length > 0 ? propNext : (storeNext ?? propNext);

  return (
    <section className="cm-next-card" aria-label="Your next step">
      <h3>Your next step</h3>
      {nextId ? (
        <p>
          Up next: <strong>{nextId}</strong>. Small steps each day build skill.
        </p>
      ) : (
        <p>Path complete. Print your recap and pick a new goal.</p>
      )}
      {nextId ? (
        <button type="button" onClick={() => { if (onGo) onGo(nextId); }}>
          Continue: {nextId}
        </button>
      ) : null}
      <div className="cm-recap-print">
        <p>My takeaway: ________________________________________</p>
        <p>Certificate: this study note marks one more lesson finished.</p>
      </div>
    </section>
  );
}

import { useMemo } from 'react';
import { elementHistory, summary, timeline, type Problem } from '../model/analysis';
import { addElement, moveElement, removeElement, updateElement, updateSettings } from '../model/edits';
import { BEAT_KINDS, type ElementKind, type Settings } from '../model/types';
import { useEditor, useProject } from '../store';
import { ELEMENT_LABEL, KIND_COLOR, KIND_LABEL, duration } from '../theme';
import { NumberInput, TextInput } from './fields';

export function ElementsPanel() {
  const project = useProject();
  const edit = useEditor((s) => s.edit);
  const history = useMemo(() => elementHistory(project), [project]);
  const { start } = useMemo(() => timeline(project), [project]);

  return (
    <section className="panel">
      <h2>
        Elements
        <button onClick={() => edit((p) => addElement(p))}>+ Element</button>
      </h2>
      <p className="muted note">Mechanics, enemies and tools the game introduces. Each one is a column in the beat chart.</p>
      {project.elements.map((el, n) => {
        const seen = history.get(el.id)?.appearances ?? [];
        const taught = seen.find((a) => a.use === 'teach');
        return (
          <div className="element" key={el.id}>
            <div className="element-row">
              <TextInput
                aria-label="Element name"
                value={el.name}
                onChange={(name) => edit((p) => updateElement(p, el.id, { name }), `element-name-${el.id}`)}
              />
              <select aria-label="Element kind" value={el.kind} onChange={(e) => edit((p) => updateElement(p, el.id, { kind: e.target.value as ElementKind }))}>
                {(Object.keys(ELEMENT_LABEL) as ElementKind[]).map((k) => (
                  <option key={k} value={k}>
                    {ELEMENT_LABEL[k]}
                  </option>
                ))}
              </select>
              <button className="icon" aria-label="Move column left" disabled={n === 0} onClick={() => edit((p) => moveElement(p, el.id, -1))}>
                ←
              </button>
              <button
                className="icon"
                aria-label="Move column right"
                disabled={n === project.elements.length - 1}
                onClick={() => edit((p) => moveElement(p, el.id, 1))}
              >
                →
              </button>
              <button
                className="icon danger"
                aria-label={`Delete ${el.name}`}
                title="Delete it and its cells (undoable)"
                onClick={() => edit((p) => removeElement(p, el.id))}
              >
                ×
              </button>
            </div>
            <span className="muted note">
              {seen.length === 0
                ? 'Not in any beat yet'
                : `${taught ? `Taught at ${duration(start[taught.index])}` : 'Never taught'} · in ${seen.length} ${seen.length === 1 ? 'beat' : 'beats'}`}
            </span>
          </div>
        );
      })}
    </section>
  );
}

const SETTINGS: { key: keyof Settings; label: string; hint: string }[] = [
  { key: 'restAtMost', label: 'Breather at intensity ≤', hint: 'Beats this calm count as a rest' },
  { key: 'maxMinutesWithoutRest', label: 'Max minutes without a breather', hint: 'Longer intense stretches are flagged' },
  { key: 'maxNewPerBeat', label: 'Max new elements per beat', hint: 'More teaching than this in one beat is flagged' },
  { key: 'maxGapMinutes', label: 'Max minutes an element goes unused', hint: 'Players start forgetting after this' },
  { key: 'flatBeats', label: 'Beats at one intensity = flat', hint: 'This many in a row is flagged' },
  { key: 'sameKindBeats', label: 'Same kind of beat in a row', hint: 'This many of one type back to back is flagged' },
];

export function SettingsPanel() {
  const settings = useProject().settings;
  const edit = useEditor((s) => s.edit);
  return (
    <section className="panel">
      <h2>Pacing rules</h2>
      <div className="settings">
        {SETTINGS.map((s) => (
          <label key={s.key} title={s.hint}>
            <span>{s.label}</span>
            <NumberInput
              className="short"
              min={0}
              step={1}
              value={settings[s.key] ?? 3}
              onChange={(v) => edit((p) => updateSettings(p, { [s.key]: v }), `setting-${s.key}`)}
            />
          </label>
        ))}
      </div>
    </section>
  );
}

export function SummaryPanel() {
  const project = useProject();
  const s = useMemo(() => summary(project), [project]);
  const longest = Math.max(1, ...Object.values(s.byKind));

  return (
    <section className="panel">
      <h2>Summary</h2>
      <div className="tiles">
        <div className="tile">
          <span className="muted">Play time</span>
          <strong>{duration(s.minutes)}</strong>
        </div>
        <div className="tile">
          <span className="muted">Avg intensity</span>
          <strong>{s.averageIntensity.toFixed(1)}</strong>
        </div>
        <div className="tile">
          <span className="muted">Breathers</span>
          <strong>{Math.round(s.restShare * 100)}%</strong>
        </div>
      </div>
      <h3>Acts</h3>
      <ul className="plain">
        {s.acts.map((a) => (
          <li key={`${a.name}-${a.first}`}>
            <span>{a.name || 'No act'}</span>
            <span className="muted">
              beats {a.first + 1}–{a.last + 1} · {duration(a.minutes)}
            </span>
          </li>
        ))}
      </ul>
      <h3>Time by beat type</h3>
      <div className="kind-bars">
        {BEAT_KINDS.map((k) => (
          <div className="kind-bar" key={k}>
            <span className="kind-name">{KIND_LABEL[k]}</span>
            <span className="bar-track">
              {s.byKind[k] > 0 && <span className="bar" style={{ width: `${(s.byKind[k] / longest) * 100}%`, background: KIND_COLOR[k] }} />}
            </span>
            <span className="bar-value">{s.byKind[k] ? duration(s.byKind[k]) : '—'}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProblemsPanel({ problems }: { problems: Problem[] }) {
  const select = useEditor((s) => s.select);
  return (
    <section className="panel">
      <h2>Pacing check</h2>
      {problems.length === 0 ? (
        <p className="status-row">
          <span className="status-icon good" aria-hidden>
            ✓
          </span>
          No problems found.
        </p>
      ) : (
        <ul className="problems">
          {problems.map((p, n) => (
            <li key={n} className="status-row">
              <span className={`status-icon ${p.level}`} aria-hidden>
                {p.level === 'error' ? '✕' : '!'}
              </span>
              <span className="sr-only">{p.level === 'error' ? 'Error:' : 'Warning:'}</span>
              {p.beatId ? (
                <button className="link" onClick={() => select(p.beatId!)}>
                  {p.message}
                </button>
              ) : (
                <span>{p.message}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

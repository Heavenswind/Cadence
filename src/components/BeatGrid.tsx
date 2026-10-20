import { useEffect, useRef } from 'react';
import { addBeat, cycleUse, moveBeat, removeBeat, updateBeat } from '../model/edits';
import { BEAT_KINDS, type Beat, type BeatKind, type Project } from '../model/types';
import { useEditor, useProject } from '../store';
import { KIND_COLOR, KIND_LABEL, USE_COLOR } from '../theme';
import { NumberInput, TextInput } from './fields';

function BeatRow({ project, beat, index, newAct }: { project: Project; beat: Beat; index: number; newAct: boolean }) {
  const edit = useEditor((s) => s.edit);
  const select = useEditor((s) => s.select);
  const selected = useEditor((s) => s.selectedId === beat.id);
  const row = useRef<HTMLTableRowElement>(null);
  const set = (patch: Partial<Beat>, key?: string) => edit((p) => updateBeat(p, beat.id, patch), key && `${key}-${beat.id}`);

  // Selecting a beat on the chart scrolls its row into view.
  useEffect(() => {
    if (selected) row.current?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  return (
    <tr ref={row} className={`${selected ? 'selected' : ''}${newAct ? ' new-act' : ''}`} onFocus={() => select(beat.id)} onClick={() => select(beat.id)}>
      <td className="num muted">{index + 1}</td>
      <td>
        <TextInput className="act" aria-label="Act" value={beat.act} onChange={(act) => set({ act }, 'act')} />
      </td>
      <td>
        <TextInput className="title" aria-label="Beat title" value={beat.title} onChange={(title) => set({ title }, 'title')} />
      </td>
      <td>
        <span className="kind-select">
          <i className="kind-dot" style={{ background: KIND_COLOR[beat.kind] }} aria-hidden />
          <select aria-label="Beat type" value={beat.kind} onChange={(e) => set({ kind: e.target.value as BeatKind })}>
            {BEAT_KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </span>
      </td>
      <td>
        <NumberInput className="short" aria-label="Minutes" min={0} value={beat.minutes} onChange={(minutes) => set({ minutes }, 'minutes')} />
      </td>
      <td>
        <select aria-label="Intensity" className="intensity" value={beat.intensity} onChange={(e) => set({ intensity: Number(e.target.value) })}>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
          {![1, 2, 3, 4, 5].includes(beat.intensity) && <option value={beat.intensity}>{beat.intensity}</option>}
        </select>
      </td>
      {project.elements.map((el) => {
        const use = beat.uses[el.id];
        return (
          <td key={el.id} className="use-cell">
            <button
              className={`use ${use ?? 'none'}`}
              style={use ? { background: USE_COLOR[use].fill, color: USE_COLOR[use].ink, borderColor: USE_COLOR[use].fill } : undefined}
              aria-label={`${el.name} in ${beat.title || 'this beat'}: ${use ?? 'not used'}. Click to change.`}
              title="Click: teach → test → twist → none"
              onClick={() => edit((p) => cycleUse(p, beat.id, el.id))}
            >
              {use ?? ''}
            </button>
          </td>
        );
      })}
      <td>
        <TextInput className="setting" aria-label="Setting" value={beat.setting} onChange={(setting) => set({ setting }, 'setting')} />
      </td>
      <td>
        <TextInput className="story" aria-label="Story beat" value={beat.story} onChange={(story) => set({ story }, 'story')} />
      </td>
      <td className="row-actions">
        <button className="icon" aria-label="Move up" disabled={index === 0} onClick={() => edit((p) => moveBeat(p, beat.id, -1))}>
          ↑
        </button>
        <button
          className="icon"
          aria-label="Move down"
          disabled={index === project.beats.length - 1}
          onClick={() => edit((p) => moveBeat(p, beat.id, 1))}
        >
          ↓
        </button>
        <button
          className="icon"
          aria-label="Insert a beat after this one"
          title="Insert a beat after this one"
          onClick={(e) => {
            e.stopPropagation();
            const { project: next, id } = addBeat(useEditor.getState().history.present, beat.id);
            edit(() => next);
            select(id);
          }}
        >
          +
        </button>
        <button className="icon danger" aria-label="Delete beat" onClick={() => edit((p) => removeBeat(p, beat.id))}>
          ×
        </button>
      </td>
    </tr>
  );
}

export function BeatGrid() {
  const project = useProject();
  const edit = useEditor((s) => s.edit);
  const select = useEditor((s) => s.select);

  return (
    <section className="card">
      <div className="card-head">
        <h2>Beat chart</h2>
        <span className="legend" aria-hidden>
          {(['teach', 'test', 'twist'] as const).map((u) => (
            <span key={u} className="use-key" style={{ background: USE_COLOR[u].fill, color: USE_COLOR[u].ink }}>
              {u}
            </span>
          ))}
          <span className="muted">click a cell to cycle</span>
        </span>
      </div>
      <div className="grid-scroll">
        <table className="beats">
          <thead>
            <tr>
              <th className="num">#</th>
              <th>Act</th>
              <th>Beat</th>
              <th>Type</th>
              <th>Min</th>
              <th title="1 calm … 5 peak">Int.</th>
              {project.elements.map((el) => (
                <th key={el.id} className="element-head" title={el.name}>
                  {el.name}
                </th>
              ))}
              <th>Setting</th>
              <th>Story</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {project.beats.map((b, i) => (
              <BeatRow key={b.id} project={project} beat={b} index={i} newAct={i > 0 && project.beats[i - 1].act !== b.act} />
            ))}
          </tbody>
        </table>
      </div>
      <button
        className="add-beat"
        onClick={() => {
          const { project: next, id } = addBeat(useEditor.getState().history.present);
          edit(() => next);
          select(id);
        }}
      >
        + Beat
      </button>
    </section>
  );
}

// Immutable edits the UI applies through the store. Each returns a new project.

import { newBeat, uid } from './project';
import { USES, type Beat, type Element, type Project, type Settings, type Use } from './types';

/** "New beat", then "New beat 2", "New beat 3"… */
export function uniqueName(base: string, taken: string[]): string {
  const names = new Set(taken);
  if (!names.has(base)) return base;
  let n = 2;
  while (names.has(`${base} ${n}`)) n++;
  return `${base} ${n}`;
}

function move<T>(list: T[], from: number, by: -1 | 1): T[] {
  const to = from + by;
  if (from < 0 || to < 0 || to >= list.length) return list;
  const out = [...list];
  [out[from], out[to]] = [out[to], out[from]];
  return out;
}

/** Inserts a beat after `afterId` (or at the end), in the same act as the beat before it. */
export function addBeat(p: Project, afterId?: string | null): { project: Project; id: string } {
  const at = afterId ? p.beats.findIndex((b) => b.id === afterId) : p.beats.length - 1;
  const before = p.beats[at];
  const beat = newBeat(uniqueName('New beat', p.beats.map((b) => b.title)), before?.act ?? '');
  const beats = [...p.beats];
  beats.splice(at + 1, 0, beat);
  return { project: { ...p, beats }, id: beat.id };
}

export function updateBeat(p: Project, id: string, patch: Partial<Omit<Beat, 'id'>>): Project {
  return { ...p, beats: p.beats.map((b) => (b.id === id ? { ...b, ...patch } : b)) };
}

export function removeBeat(p: Project, id: string): Project {
  return { ...p, beats: p.beats.filter((b) => b.id !== id) };
}

export function moveBeat(p: Project, id: string, by: -1 | 1): Project {
  const beats = move(p.beats, p.beats.findIndex((b) => b.id === id), by);
  return beats === p.beats ? p : { ...p, beats };
}

export function setUse(p: Project, beatId: string, elementId: string, use: Use | null): Project {
  return {
    ...p,
    beats: p.beats.map((b) => {
      if (b.id !== beatId) return b;
      const uses = { ...b.uses };
      if (use) uses[elementId] = use;
      else delete uses[elementId];
      return { ...b, uses };
    }),
  };
}

/** Clicking a cell: nothing → teach → test → twist → nothing. */
export function cycleUse(p: Project, beatId: string, elementId: string): Project {
  const current = p.beats.find((b) => b.id === beatId)?.uses[elementId];
  const next = current === undefined ? USES[0] : (USES[USES.indexOf(current) + 1] ?? null);
  return setUse(p, beatId, elementId, next);
}

export function addElement(p: Project, kind: Element['kind'] = 'mechanic'): Project {
  const element: Element = { id: uid(), name: uniqueName(`New ${kind}`, p.elements.map((e) => e.name)), kind };
  return { ...p, elements: [...p.elements, element] };
}

export function updateElement(p: Project, id: string, patch: Partial<Omit<Element, 'id'>>): Project {
  return { ...p, elements: p.elements.map((e) => (e.id === id ? { ...e, ...patch } : e)) };
}

/** Removes the element and its cells in every beat. */
export function removeElement(p: Project, id: string): Project {
  return {
    ...p,
    elements: p.elements.filter((e) => e.id !== id),
    beats: p.beats.map((b) => {
      if (!(id in b.uses)) return b;
      const uses = { ...b.uses };
      delete uses[id];
      return { ...b, uses };
    }),
  };
}

export function moveElement(p: Project, id: string, by: -1 | 1): Project {
  const elements = move(p.elements, p.elements.findIndex((e) => e.id === id), by);
  return elements === p.elements ? p : { ...p, elements };
}

export function updateSettings(p: Project, patch: Partial<Settings>): Project {
  return { ...p, settings: { ...p.settings, ...patch } };
}

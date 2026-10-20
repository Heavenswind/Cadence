import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { commit, historyOf, redo, replace, undo, type History } from './model/history';
import { assertProject, sampleProject } from './model/project';
import type { Project } from './model/types';

/** Edits with the same merge key this close together become one undo step (typing a title, nudging a number). */
const MERGE_MS = 1000;

interface EditorState {
  history: History<Project>;
  selectedId: string | null;
  lastMerge: { key: string; at: number } | null;

  /** Applies an edit as its own undo step, or folds it into the previous one when `mergeKey` matches. */
  edit: (fn: (p: Project) => Project, mergeKey?: string) => void;
  undo: () => void;
  redo: () => void;
  /** Replaces the whole project (New, Sample, Open) as one undo step. */
  load: (p: Project) => void;
  select: (id: string | null) => void;
}

export const useEditor = create<EditorState>()(
  persist(
    (set) => ({
      history: historyOf(sampleProject()),
      selectedId: null,
      lastMerge: null,

      edit: (fn, mergeKey) =>
        set((s) => {
          const next = fn(s.history.present);
          const now = Date.now();
          const merge = mergeKey && s.lastMerge?.key === mergeKey && now - s.lastMerge.at < MERGE_MS;
          return {
            history: merge ? replace(s.history, next) : commit(s.history, next),
            lastMerge: mergeKey ? { key: mergeKey, at: now } : null,
          };
        }),
      undo: () => set((s) => ({ history: undo(s.history), lastMerge: null })),
      redo: () => set((s) => ({ history: redo(s.history), lastMerge: null })),
      load: (p) => set((s) => ({ history: commit(s.history, p), selectedId: null, lastMerge: null })),
      select: (selectedId) => set({ selectedId }),
    }),
    {
      name: 'cadence.autosave',
      partialize: (s) => ({ project: s.history.present }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as { project?: unknown };
        try {
          assertProject(p.project);
          return { ...current, history: historyOf(p.project) };
        } catch {
          return current; // Missing or corrupt autosave: start from the sample.
        }
      },
    },
  ),
);

export const useProject = () => useEditor((s) => s.history.present);

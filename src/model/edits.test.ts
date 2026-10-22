import { describe, expect, it } from 'vitest';
import { problems } from './analysis';
import { addBeat, addElement, cycleUse, duplicateBeat, moveBeat, moveElement, removeElement, setUse, uniqueName } from './edits';
import { commit, historyOf, undo } from './history';
import { sampleProject } from './project';

describe('beat edits', () => {
  it('inserts a beat after the given one, in its act', () => {
    const { project, id } = addBeat(sampleProject(), 'b6');
    expect(project.beats.map((b) => b.id).slice(5, 8)).toEqual(['b6', id, 'b7']);
    expect(project.beats[6]).toMatchObject({ title: 'New beat', act: 'Act 1' });
    const end = addBeat(project);
    expect(end.project.beats.at(-1)!.id).toBe(end.id);
    expect(end.project.beats.at(-1)!.title).toBe('New beat 2');
  });

  it('duplicates a beat right after itself, with a fresh id and a numbered title', () => {
    const p = sampleProject();
    p.beats[1] = { ...p.beats[1], notes: 'tighten the chase' };
    const { project, id } = duplicateBeat(p, 'b2');
    expect(project.beats.map((b) => b.id).slice(1, 4)).toEqual(['b2', id, 'b3']);
    const copy = project.beats[2];
    expect(copy).toMatchObject({ title: 'Rooftops 2', act: 'Act 1', kind: 'explore', minutes: 12, notes: 'tighten the chase' });
    expect(copy.uses).toEqual(p.beats[1].uses);
    expect(copy.uses).not.toBe(project.beats[1].uses);
    expect(duplicateBeat(p, 'nope').project).toBe(p);
  });

  it('moves beats and leaves the ends alone', () => {
    const p = sampleProject();
    expect(moveBeat(p, 'b2', -1).beats.slice(0, 2).map((b) => b.id)).toEqual(['b2', 'b1']);
    expect(moveBeat(p, 'b1', -1)).toBe(p);
    expect(moveBeat(p, 'b16', 1)).toBe(p);
  });

  it('cycles a cell through teach, test, twist and back to empty', () => {
    let p = sampleProject();
    const seen: (string | undefined)[] = [];
    for (let i = 0; i < 4; i++) {
      p = cycleUse(p, 'b16', 'grapple');
      seen.push(p.beats[15].uses.grapple);
    }
    expect(seen).toEqual(['teach', 'test', 'twist', undefined]);
    expect('grapple' in p.beats[15].uses).toBe(false);
    expect(setUse(p, 'b1', 'jump', null).beats[0].uses).toEqual({});
  });
});

describe('element edits', () => {
  it('names new elements by kind', () => {
    expect(uniqueName('New enemy', ['New enemy'])).toBe('New enemy 2');
    expect(addElement(sampleProject(), 'enemy').elements.at(-1)!.name).toBe('New enemy');
  });

  it('removes an element and its cells, keeping the chart valid', () => {
    const p = removeElement(sampleProject(), 'moth');
    expect(p.beats.some((b) => 'moth' in b.uses)).toBe(false);
    expect(problems(p)).toEqual([]);
  });

  it('reorders element columns', () => {
    expect(moveElement(sampleProject(), 'lantern', -1).elements.slice(0, 2).map((e) => e.id)).toEqual(['lantern', 'jump']);
  });
});

describe('history', () => {
  it('undoes an edit', () => {
    const a = sampleProject();
    expect(undo(commit(historyOf(a), removeElement(a, 'jump'))).present).toBe(a);
  });
});

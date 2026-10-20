import { describe, expect, it } from 'vitest';
import { assertProject, emptyProject, newBeat, sampleProject } from './project';

const roundTrip = <T>(x: T): T => JSON.parse(JSON.stringify(x));

describe('project files', () => {
  it('accepts the sample and an empty project after a JSON round trip', () => {
    expect(() => assertProject(roundTrip(sampleProject()))).not.toThrow();
    expect(() => assertProject(roundTrip(emptyProject()))).not.toThrow();
  });

  it('only uses elements the sample defines', () => {
    const p = sampleProject();
    const ids = new Set(p.elements.map((e) => e.id));
    for (const b of p.beats) for (const id of Object.keys(b.uses)) expect(ids.has(id)).toBe(true);
  });

  it('gives new beats their own ids and sensible defaults', () => {
    const a = newBeat();
    const b = newBeat('Boss', 'Act 3');
    expect(a.id).not.toBe(b.id);
    expect(b).toMatchObject({ title: 'Boss', act: 'Act 3', minutes: 10, intensity: 2, uses: {} });
  });

  it('rejects other files and names the bad field', () => {
    expect(() => assertProject({ format: 'questline' })).toThrow('format');
    const p = roundTrip(sampleProject());
    (p.beats[2].uses as Record<string, string>).moth = 'master';
    expect(() => assertProject(p)).toThrow('beats[2].uses.moth must be teach, test or twist');
    const q = roundTrip(sampleProject());
    (q.beats[0] as { kind: string }).kind = 'cutscene';
    expect(() => assertProject(q)).toThrow('beats[0].kind');
    const r = roundTrip(sampleProject()) as { settings?: unknown };
    delete r.settings;
    expect(() => assertProject(r)).toThrow('settings is missing');
  });
});

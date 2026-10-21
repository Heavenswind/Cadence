import { describe, expect, it } from 'vitest';
import { acts, elementHistory, problems, summary, timeline, toCsv } from './analysis';
import { emptyProject, newBeat, sampleProject } from './project';
import type { Beat, Project } from './types';

const beat = (p: Project, id: string): Beat => p.beats.find((b) => b.id === id)!;
const messages = (p: Project) => problems(p).map((x) => `${x.level}: ${x.message}`);

describe('timeline and summary', () => {
  it('places beats end to end', () => {
    const t = timeline(sampleProject());
    expect(t.start.slice(0, 4)).toEqual([0, 5, 17, 27]);
    expect(t.end[15]).toBe(178);
    expect(t.total).toBe(178);
  });

  it('groups consecutive beats into acts', () => {
    expect(acts(sampleProject()).map((a) => [a.name, a.first, a.last, a.minutes])).toEqual([
      ['Act 1', 0, 5, 54],
      ['Act 2', 6, 11, 70],
      ['Act 3', 12, 15, 54],
    ]);
    const p = sampleProject();
    p.beats[3].act = 'Interlude';
    expect(acts(p).map((a) => a.name)).toEqual(['Act 1', 'Interlude', 'Act 1', 'Act 2', 'Act 3']);
  });

  it('weights intensity by play time and measures breathers', () => {
    const p = emptyProject();
    p.beats = [
      { ...newBeat('Long calm'), minutes: 30, intensity: 1, kind: 'explore' },
      { ...newBeat('Short fight'), minutes: 10, intensity: 5, kind: 'combat' },
    ];
    const s = summary(p);
    expect(s.minutes).toBe(40);
    expect(s.averageIntensity).toBe(2);
    expect(s.restShare).toBe(0.75);
    expect(s.byKind).toMatchObject({ explore: 30, combat: 10, boss: 0 });
  });

  it('tracks where each element appears', () => {
    expect(elementHistory(sampleProject()).get('grapple')!.appearances).toEqual([
      { index: 9, use: 'teach' },
      { index: 10, use: 'test' },
      { index: 12, use: 'twist' },
      { index: 13, use: 'test' },
      { index: 14, use: 'test' },
    ]);
  });
});

describe('pacing checks', () => {
  it('finds nothing wrong with the sample', () => {
    expect(messages(sampleProject())).toEqual([]);
  });

  it('catches elements used before they are taught, or twisted before they are tested', () => {
    const p = sampleProject();
    delete beat(p, 'b10').uses.grapple;
    beat(p, 'b2').uses.jump = 'twist';
    expect(messages(p)).toEqual([
      'warning: “Jump” gets a twist in “Rooftops” before the player has tested it.',
      'warning: “Grapple” is first used in “Canopy chase” (test) without being taught.',
    ]);
  });

  it('catches elements taught once and dropped, never used, or forgotten', () => {
    const p = sampleProject();
    p.elements.push({ id: 'dash', name: 'Dash', kind: 'mechanic' }, { id: 'bat', name: 'Bat', kind: 'enemy' });
    beat(p, 'b16').uses.dash = 'teach';
    delete beat(p, 'b11').uses.moth;
    expect(messages(p)).toEqual([
      'warning: “Moth” goes unused for 58 min, from “Shade ambush” to “Spiral climb”.',
      'warning: “Dash” is taught in “Dawn” and never used again.',
      'warning: “Bat” never appears in any beat.',
    ]);
  });

  it('flags beats that introduce too much at once', () => {
    const p = sampleProject();
    beat(p, 'b1').uses = { jump: 'teach', lantern: 'teach', moth: 'teach' };
    expect(messages(p)).toContain('warning: “Waking up” introduces 3 elements at once (Jump, Lantern light, Moth).');
  });

  it('flags long stretches without a breather, including at the end', () => {
    const p = sampleProject();
    beat(p, 'b13').intensity = 3;
    beat(p, 'b16').intensity = 3;
    expect(messages(p)).toEqual([
      'warning: 54 min without a breather, from “Tower base” to “Dawn”.',
      'warning: Boss “The Warden” has no breather before or after it.',
    ]);
  });

  it('flags the same kind of beat too many times in a row', () => {
    const p = sampleProject();
    beat(p, 'b7').kind = 'puzzle';
    beat(p, 'b8').kind = 'puzzle';
    expect(messages(p)).toEqual(['warning: 3 puzzle beats in a row, from “Into the woods” to “Hollow tree”.']);
    p.settings.sameKindBeats = 4;
    expect(messages(p)).toEqual([]);
    // Older files don't have the setting; 3 is assumed.
    delete p.settings.sameKindBeats;
    expect(messages(p)).toHaveLength(1);
  });

  it('flags a boss with no breather on either side', () => {
    const p = sampleProject();
    beat(p, 'b16').intensity = 3;
    expect(messages(p)).toEqual(['warning: Boss “The Warden” has no breather before or after it.']);
    beat(p, 'b14').intensity = 2;
    expect(messages(p)).toEqual([]);
  });

  it('flags flat intensity', () => {
    const p = sampleProject();
    for (const id of ['b7', 'b8', 'b9', 'b10']) beat(p, id).intensity = 2;
    expect(messages(p)).toEqual(['warning: Intensity stays at 2 for 4 beats, from “Into the woods” to “Grapple shrine”.']);
  });

  it('reports bad data as errors, first', () => {
    const p = sampleProject();
    beat(p, 'b3').intensity = 7;
    beat(p, 'b4').minutes = -5;
    p.elements = p.elements.filter((e) => e.id !== 'moth');
    const out = messages(p);
    expect(out.slice(0, 3)).toEqual([
      'error: “First moths”: intensity must be a whole number from 1 to 5.',
      'error: “First moths” uses an element that no longer exists.',
      'error: “Old well”: minutes cannot be negative.',
    ]);
  });
});

describe('CSV export', () => {
  it('writes one row per beat and one column per element, quoting where needed', () => {
    const p = sampleProject();
    beat(p, 'b1').story = 'She says "hello", then leaves';
    const lines = toCsv(p).trimEnd().split('\n');
    expect(lines).toHaveLength(17);
    expect(lines[0]).toBe('Act,Beat,Kind,Starts at (min),Minutes,Intensity,Setting,Story,Jump,Lantern light,Moth,Wall jump,Shade,Grapple');
    expect(lines[1]).toBe('Act 1,Waking up,story,0,5,1,Village,"She says ""hello"", then leaves",teach,,,,,');
    expect(lines[3]).toBe('Act 1,First moths,combat,17,10,3,Village square,Moths swarm toward the light.,test,test,teach,,,');
  });
});

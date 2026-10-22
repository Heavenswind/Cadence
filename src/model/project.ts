import { BEAT_KINDS, USES, type Beat, type BeatKind, type Element, type Project, type Settings, type Use } from './types';

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function defaultSettings(): Settings {
  return { restAtMost: 2, maxMinutesWithoutRest: 45, maxNewPerBeat: 2, maxGapMinutes: 45, flatBeats: 4, sameKindBeats: 3 };
}

export function newBeat(title = 'New beat', act = ''): Beat {
  return { id: uid(), title, act, kind: 'explore', minutes: 10, intensity: 2, setting: '', story: '', uses: {} };
}

export function emptyProject(): Project {
  return { format: 'cadence', version: 1, name: 'Untitled', elements: [], beats: [newBeat('Opening', 'Act 1')], settings: defaultSettings() };
}

/**
 * Lantern: a short three-act platformer. Mira finds a lantern whose light reveals hidden platforms,
 * then climbs through the woods to a tower. Every element is taught, tested and twisted in order.
 */
export function sampleProject(): Project {
  const el = (id: string, name: string, kind: Element['kind']): Element => ({ id, name, kind });
  const beat = (
    id: string,
    act: string,
    title: string,
    kind: BeatKind,
    minutes: number,
    intensity: number,
    setting: string,
    story: string,
    uses: Record<string, Use> = {},
  ): Beat => ({ id, title, act, kind, minutes, intensity, setting, story, uses });

  return {
    format: 'cadence',
    version: 1,
    name: 'Lantern',
    elements: [
      el('jump', 'Jump', 'mechanic'),
      el('lantern', 'Lantern light', 'tool'),
      el('moth', 'Moth', 'enemy'),
      el('walljump', 'Wall jump', 'mechanic'),
      el('shade', 'Shade', 'enemy'),
      el('grapple', 'Grapple', 'tool'),
    ],
    beats: [
      beat('b1', 'Act 1', 'Waking up', 'story', 5, 1, 'Village', 'Mira finds the lantern in the attic.', { jump: 'teach' }),
      beat('b2', 'Act 1', 'Rooftops', 'explore', 12, 2, 'Village', '', { jump: 'test', lantern: 'teach' }),
      beat('b3', 'Act 1', 'First moths', 'combat', 10, 3, 'Village square', 'Moths swarm toward the light.', {
        jump: 'test',
        lantern: 'test',
        moth: 'teach',
      }),
      beat('b4', 'Act 1', 'Old well', 'puzzle', 12, 2, 'Village well', '', { lantern: 'twist' }),
      beat('b5', 'Act 1', 'The mill fire', 'combat', 10, 4, 'Mill', 'The mill burns; Tobi is trapped inside.', {
        jump: 'twist',
        moth: 'test',
      }),
      beat('b6', 'Act 1', 'Campfire', 'rest', 5, 1, 'Village edge', 'Mira and Tobi decide to follow the moths.'),
      beat('b7', 'Act 2', 'Into the woods', 'explore', 15, 2, 'Eastwood', '', { walljump: 'teach' }),
      beat('b8', 'Act 2', 'Shade ambush', 'combat', 12, 4, 'Eastwood', 'Shades appear where the light fails.', {
        walljump: 'test',
        moth: 'test',
        shade: 'teach',
      }),
      beat('b9', 'Act 2', 'Hollow tree', 'puzzle', 15, 2, 'Great oak', '', { walljump: 'twist', lantern: 'test' }),
      beat('b10', 'Act 2', 'Grapple shrine', 'explore', 10, 2, 'Shrine', 'An old shrine holds a grappling hook.', { grapple: 'teach' }),
      beat('b11', 'Act 2', 'Canopy chase', 'combat', 12, 4, 'Canopy', 'The shades chase Tobi into the treetops.', {
        grapple: 'test',
        shade: 'test',
        moth: 'test',
      }),
      beat('b12', 'Act 2', 'Woodcutter’s hut', 'rest', 6, 1, 'Hut', 'The woodcutter tells them about the tower.'),
      beat('b13', 'Act 3', 'Tower base', 'puzzle', 15, 2, 'Tower', '', { grapple: 'twist', lantern: 'twist' }),
      beat('b14', 'Act 3', 'Spiral climb', 'combat', 18, 4, 'Tower', '', {
        walljump: 'test',
        grapple: 'test',
        shade: 'twist',
        moth: 'test',
      }),
      beat('b15', 'Act 3', 'The Warden', 'boss', 15, 5, 'Tower top', 'The Warden guards the last light.', { lantern: 'test', grapple: 'test' }),
      beat('b16', 'Act 3', 'Dawn', 'story', 6, 1, 'Tower top', 'The sun rises over Eastwood.'),
    ],
    settings: defaultSettings(),
  };
}

class FileError extends Error {}

function check(ok: boolean, path: string, what: string): asserts ok {
  if (!ok) throw new FileError(`Not a Cadence project: ${path} ${what}.`);
}

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;

/** Throws a readable error unless `data` has the shape of a project file. Semantic issues are left to `problems`. */
export function assertProject(data: unknown): asserts data is Project {
  check(isObject(data) && data.format === 'cadence', 'format', 'is not "cadence"');
  const p = data as unknown as Project;
  check(p.version === 1, 'version', `${String(p.version)} is not supported`);
  check(typeof p.name === 'string', 'name', 'is missing');
  check(Array.isArray(p.elements), 'elements', 'is not a list');
  p.elements.forEach((e, n) => {
    check(isObject(e) && typeof e.id === 'string' && typeof e.name === 'string', `elements[${n}]`, 'needs an id and a name');
    check(e.kind === 'mechanic' || e.kind === 'enemy' || e.kind === 'tool', `elements[${n}].kind`, 'must be mechanic, enemy or tool');
  });
  check(Array.isArray(p.beats), 'beats', 'is not a list');
  p.beats.forEach((b, n) => {
    const at = `beats[${n}]`;
    check(isObject(b) && typeof b.id === 'string' && typeof b.title === 'string', at, 'needs an id and a title');
    check(BEAT_KINDS.includes(b.kind), `${at}.kind`, `must be one of ${BEAT_KINDS.join(', ')}`);
    for (const key of ['act', 'setting', 'story'] as const) check(typeof b[key] === 'string', `${at}.${key}`, 'is not text');
    check(b.notes === undefined || typeof b.notes === 'string', `${at}.notes`, 'is not text');
    for (const key of ['minutes', 'intensity'] as const) check(typeof b[key] === 'number', `${at}.${key}`, 'is not a number');
    check(isObject(b.uses), `${at}.uses`, 'is missing');
    for (const [id, use] of Object.entries(b.uses)) check(USES.includes(use), `${at}.uses.${id}`, 'must be teach, test or twist');
  });
  const s = p.settings;
  check(isObject(s), 'settings', 'is missing');
  for (const key of ['restAtMost', 'maxMinutesWithoutRest', 'maxNewPerBeat', 'maxGapMinutes', 'flatBeats'] as const)
    check(typeof s[key] === 'number', `settings.${key}`, 'is not a number');
  // Added later; older files don't have it.
  if (s.sameKindBeats !== undefined) check(typeof s.sameKindBeats === 'number', 'settings.sameKindBeats', 'is not a number');
}

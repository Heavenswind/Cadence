// What the beat chart says about pacing: where each beat sits in time, how each element is
// introduced and reinforced, and where the flow breaks the project's own rules.

import { BEAT_KINDS, type BeatKind, type Project, type Use } from './types';

export interface Timeline {
  /** Minute each beat starts and ends at, in play order. */
  start: number[];
  end: number[];
  total: number;
}

export function timeline(p: Project): Timeline {
  const start: number[] = [];
  const end: number[] = [];
  let t = 0;
  for (const b of p.beats) {
    start.push(t);
    t += Math.max(0, b.minutes);
    end.push(t);
  }
  return { start, end, total: t };
}

export interface Act {
  name: string;
  /** Index of the first and last beat in the act. */
  first: number;
  last: number;
  minutes: number;
}

/** Consecutive beats with the same act label. */
export function acts(p: Project): Act[] {
  const out: Act[] = [];
  p.beats.forEach((b, i) => {
    const current = out[out.length - 1];
    if (current && current.name === b.act) {
      current.last = i;
      current.minutes += Math.max(0, b.minutes);
    } else {
      out.push({ name: b.act, first: i, last: i, minutes: Math.max(0, b.minutes) });
    }
  });
  return out;
}

export interface ElementHistory {
  /** Beat indexes where the element appears, with how it's used there. */
  appearances: { index: number; use: Use }[];
}

export function elementHistory(p: Project): Map<string, ElementHistory> {
  const out = new Map(p.elements.map((e) => [e.id, { appearances: [] as ElementHistory['appearances'] }]));
  p.beats.forEach((b, index) => {
    for (const [id, use] of Object.entries(b.uses)) out.get(id)?.appearances.push({ index, use });
  });
  return out;
}

export interface Summary {
  minutes: number;
  /** Intensity averaged over play time, not over beats. */
  averageIntensity: number;
  /** Share of play time at breather intensity. */
  restShare: number;
  byKind: Record<BeatKind, number>;
  acts: Act[];
}

export function summary(p: Project): Summary {
  const { total } = timeline(p);
  const byKind = Object.fromEntries(BEAT_KINDS.map((k) => [k, 0])) as Record<BeatKind, number>;
  let weighted = 0;
  let rest = 0;
  for (const b of p.beats) {
    const m = Math.max(0, b.minutes);
    byKind[b.kind] += m;
    weighted += m * b.intensity;
    if (b.intensity <= p.settings.restAtMost) rest += m;
  }
  return {
    minutes: total,
    averageIntensity: total > 0 ? weighted / total : 0,
    restShare: total > 0 ? rest / total : 0,
    byKind,
    acts: acts(p),
  };
}

export interface Problem {
  level: 'error' | 'warning';
  message: string;
  /** The beat to highlight when the problem is clicked. */
  beatId?: string;
}

const quote = (s: string) => `“${s}”`;
const minutes = (m: number) => `${Math.round(m)} min`;

/** Pacing problems, errors first. Thresholds come from the project's settings. */
export function problems(p: Project): Problem[] {
  const errors: Problem[] = [];
  const warnings: Problem[] = [];
  const s = p.settings;
  const { start, end } = timeline(p);
  const elements = new Map(p.elements.map((e) => [e.id, e]));
  const beatName = (i: number) => quote(p.beats[i].title || `Beat ${i + 1}`);

  // Data that would make the numbers meaningless.
  p.beats.forEach((b, i) => {
    if (!(b.minutes >= 0)) errors.push({ level: 'error', message: `${beatName(i)}: minutes cannot be negative.`, beatId: b.id });
    if (!Number.isInteger(b.intensity) || b.intensity < 1 || b.intensity > 5)
      errors.push({ level: 'error', message: `${beatName(i)}: intensity must be a whole number from 1 to 5.`, beatId: b.id });
    if (Object.keys(b.uses).some((id) => !elements.has(id)))
      errors.push({ level: 'error', message: `${beatName(i)} uses an element that no longer exists.`, beatId: b.id });
  });
  for (const key of ['maxMinutesWithoutRest', 'maxNewPerBeat', 'maxGapMinutes', 'flatBeats'] as const)
    if (!(s[key] >= 0)) errors.push({ level: 'error', message: 'Settings cannot be negative.' });
  if (s.sameKindBeats !== undefined && !(s.sameKindBeats >= 0))
    errors.push({ level: 'error', message: 'Settings cannot be negative.' });

  // Teach → test → twist, and keeping elements fresh.
  for (const [id, history] of elementHistory(p)) {
    const name = quote(elements.get(id)!.name);
    const seen = history.appearances;
    if (seen.length === 0) {
      warnings.push({ level: 'warning', message: `${name} never appears in any beat.` });
      continue;
    }
    const first = seen[0];
    if (first.use !== 'teach') {
      warnings.push({
        level: 'warning',
        message: `${name} is first used in ${beatName(first.index)} (${first.use}) without being taught.`,
        beatId: p.beats[first.index].id,
      });
    } else {
      const firstTest = seen.find((a) => a.use === 'test');
      const earlyTwist = seen.find((a) => a.use === 'twist' && (!firstTest || a.index < firstTest.index));
      if (earlyTwist)
        warnings.push({
          level: 'warning',
          message: `${name} gets a twist in ${beatName(earlyTwist.index)} before the player has tested it.`,
          beatId: p.beats[earlyTwist.index].id,
        });
      if (seen.length === 1)
        warnings.push({
          level: 'warning',
          message: `${name} is taught in ${beatName(first.index)} and never used again.`,
          beatId: p.beats[first.index].id,
        });
    }
    for (let k = 1; k < seen.length; k++) {
      const gap = start[seen[k].index] - end[seen[k - 1].index];
      if (gap > s.maxGapMinutes)
        warnings.push({
          level: 'warning',
          message: `${name} goes unused for ${minutes(gap)}, from ${beatName(seen[k - 1].index)} to ${beatName(seen[k].index)}.`,
          beatId: p.beats[seen[k].index].id,
        });
    }
  }

  // Beats that introduce too much at once.
  p.beats.forEach((b, i) => {
    const taught = Object.entries(b.uses).filter(([, use]) => use === 'teach').map(([id]) => elements.get(id)?.name ?? '?');
    if (taught.length > s.maxNewPerBeat)
      warnings.push({
        level: 'warning',
        message: `${beatName(i)} introduces ${taught.length} elements at once (${taught.join(', ')}).`,
        beatId: b.id,
      });
  });

  // Stretches without a breather.
  let runStart = -1;
  const closeRun = (last: number) => {
    if (runStart < 0) return;
    const length = end[last] - start[runStart];
    if (length > s.maxMinutesWithoutRest)
      warnings.push({
        level: 'warning',
        message: `${minutes(length)} without a breather, from ${beatName(runStart)} to ${beatName(last)}.`,
        beatId: p.beats[runStart].id,
      });
    runStart = -1;
  };
  p.beats.forEach((b, i) => {
    if (b.intensity > s.restAtMost) {
      if (runStart < 0) runStart = i;
    } else closeRun(i - 1);
  });
  closeRun(p.beats.length - 1);

  // Flat intensity.
  let flatStart = 0;
  for (let i = 1; i <= p.beats.length; i++) {
    if (i < p.beats.length && p.beats[i].intensity === p.beats[flatStart].intensity) continue;
    const count = i - flatStart;
    if (s.flatBeats > 1 && count >= s.flatBeats)
      warnings.push({
        level: 'warning',
        message: `Intensity stays at ${p.beats[flatStart].intensity} for ${count} beats, from ${beatName(flatStart)} to ${beatName(i - 1)}.`,
        beatId: p.beats[flatStart].id,
      });
    flatStart = i;
  }

  // The same kind of beat too many times in a row (four puzzles back to back).
  const sameKind = s.sameKindBeats ?? 3;
  let kindStart = 0;
  for (let i = 1; i <= p.beats.length; i++) {
    if (i < p.beats.length && p.beats[i].kind === p.beats[kindStart].kind) continue;
    const count = i - kindStart;
    if (sameKind > 1 && count >= sameKind)
      warnings.push({
        level: 'warning',
        message: `${count} ${p.beats[kindStart].kind} beats in a row, from ${beatName(kindStart)} to ${beatName(i - 1)}.`,
        beatId: p.beats[kindStart].id,
      });
    kindStart = i;
  }

  // Boss fights with no relief on either side. Ending the game on a boss is a fine climax.
  p.beats.forEach((b, i) => {
    if (b.kind !== 'boss') return;
    const calmBefore = i > 0 && p.beats[i - 1].intensity <= s.restAtMost;
    const after = p.beats[i + 1];
    const calmAfter = !after || after.intensity <= s.restAtMost;
    if (!calmBefore && !calmAfter)
      warnings.push({ level: 'warning', message: `Boss ${beatName(i)} has no breather before or after it.`, beatId: b.id });
  });

  return [...errors, ...warnings];
}

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** The beat chart as a spreadsheet: one row per beat, one column per element. */
export function toCsv(p: Project): string {
  const { start } = timeline(p);
  const header = ['Act', 'Beat', 'Kind', 'Starts at (min)', 'Minutes', 'Intensity', 'Setting', 'Story', ...p.elements.map((e) => e.name)];
  const rows = p.beats.map((b, i) => [b.act, b.title, b.kind, start[i], b.minutes, b.intensity, b.setting, b.story, ...p.elements.map((e) => b.uses[e.id] ?? '')]);
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n') + '\n';
}

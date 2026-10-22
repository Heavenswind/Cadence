// A beat chart: the game cut into beats (levels or sections) in play order, with how long each takes,
// how intense it is, and how it uses each of the game's elements (mechanics, enemies, tools).
// Plain JSON, so it can sit next to the design doc and be read by other tools.

export type BeatKind = 'story' | 'explore' | 'puzzle' | 'combat' | 'boss' | 'rest';

export const BEAT_KINDS: BeatKind[] = ['story', 'explore', 'puzzle', 'combat', 'boss', 'rest'];

export type ElementKind = 'mechanic' | 'enemy' | 'tool';

/** Something the game introduces and builds on: double jump, a new enemy, the grappling hook. */
export interface Element {
  id: string;
  name: string;
  kind: ElementKind;
}

/**
 * How a beat uses an element, in the classic level design order:
 * teach (introduce it safely), test (use it with stakes), twist (combine it or change the context).
 */
export type Use = 'teach' | 'test' | 'twist';

export const USES: Use[] = ['teach', 'test', 'twist'];

export interface Beat {
  id: string;
  title: string;
  /** Act or chapter label; consecutive beats with the same label form one act. */
  act: string;
  kind: BeatKind;
  /** Rough minutes of play. */
  minutes: number;
  /** 1 (calm) to 5 (peak). */
  intensity: number;
  setting: string;
  /** What happens in the story here. */
  story: string;
  /** Working notes for the designer (reminders, cut ideas). Older files leave it out. */
  notes?: string;
  /** Element id → how this beat uses it. Elements a beat doesn't feature are left out. */
  uses: Record<string, Use>;
}

/** Thresholds for the pacing checks; every game wants different ones. */
export interface Settings {
  /** Beats at or below this intensity count as a breather. */
  restAtMost: number;
  /** Longest stretch of play allowed without a breather. */
  maxMinutesWithoutRest: number;
  /** Most elements a single beat should introduce. */
  maxNewPerBeat: number;
  /** Longest an element may go unused before players start forgetting it. */
  maxGapMinutes: number;
  /** This many beats in a row at the same intensity reads as flat. */
  flatBeats: number;
  /** This many beats of the same kind in a row reads as repetitive. Older files leave it out; 3 is assumed. */
  sameKindBeats?: number;
}

export interface Project {
  format: 'cadence';
  version: 1;
  name: string;
  elements: Element[];
  beats: Beat[];
  settings: Settings;
}

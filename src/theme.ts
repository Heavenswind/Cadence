// Colours validated with the dataviz palette checker against the panel colour (#1e2128).
// Beat types always show their name next to the colour, so colour is never the only cue.

import type { BeatKind, ElementKind, Use } from './model/types';

export const KIND_LABEL: Record<BeatKind, string> = {
  story: 'Story',
  explore: 'Exploration',
  puzzle: 'Puzzle',
  combat: 'Combat',
  boss: 'Boss',
  rest: 'Rest',
};

/** Fixed categorical order; it passes the neighbour colour-blindness checks. */
export const KIND_COLOR: Record<BeatKind, string> = {
  story: '#3987e5',
  explore: '#d95926',
  puzzle: '#199e70',
  combat: '#c98500',
  boss: '#d55181',
  rest: '#008300',
};

/** One hue, darker to lighter as the use builds: teach → test → twist. */
export const USE_COLOR: Record<Use, { fill: string; ink: string }> = {
  teach: { fill: '#5a4cc4', ink: '#ffffff' },
  test: { fill: '#7a6fe0', ink: '#14121f' },
  twist: { fill: '#a79ff0', ink: '#14121f' },
};

export const ELEMENT_LABEL: Record<ElementKind, string> = { mechanic: 'Mechanic', enemy: 'Enemy', tool: 'Tool' };

export function duration(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 60) return `${m} min`;
  return m % 60 === 0 ? `${m / 60} h` : `${Math.floor(m / 60)} h ${m % 60} min`;
}

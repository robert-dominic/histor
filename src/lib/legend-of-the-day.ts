// src/lib/legend-of-the-day.ts
// The footer's line of personality (landing v2 brief, 4): "Today's legend: the warm breakfast. It never happened."
// A random legend file from the open cases, picked on each visit. Pure: the caller passes the random number.
import type { Case } from '@/types/case';

export interface LegendOfTheDay {
  /** The legend, lower-cased to sit in a sentence, e.g. "the warm breakfast". */
  legend: string;
  /** The case it comes from, e.g. "The Mary Celeste". */
  caseTitle: string;
}

const lowerFirst = (text: string) => (/^[A-Z][a-z]/.test(text) ? text.charAt(0).toLowerCase() + text.slice(1) : text);

/** Every legend file across `cases`, in order. */
export function legendsOf(cases: Case[]): LegendOfTheDay[] {
  return cases.flatMap(entry => entry.evidence.filter(file => file.status === 'legend').map(file => ({ legend: lowerFirst(file.title), caseTitle: entry.title })));
}

/** One of them, by `random` (0 up to, not including, 1); null when there are none. */
export function pickLegend(cases: Case[], random: number): LegendOfTheDay | null {
  const all = legendsOf(cases);
  return all.length === 0 ? null : all[Math.min(all.length - 1, Math.floor(random * all.length))];
}

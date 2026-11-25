// src/lib/ghost-lines.ts
// Ghost text from the files on the floor (dread pass, 3): a file breathes out a short line of its own text, a phrase
// from its detail, rising like smoke and dissolving. Every file on the floor can, opened or sealed, so it never gives
// away a status. The phrase and the rhythm, pure, so they can be tested.
import { parseRefs } from '@/lib/parse-refs';

/** The rhythm, to tune: a new line every 4 to 8s, from a random floor file, at most 2 at once, each living 3 to 5s. */
export const GHOST = {
  everyMs: [4000, 8000],
  max: 2,
  lifeSeconds: [3, 5],
  /** How far a line rises, and drifts sideways (either way), in px. */
  rise: 70,
  drift: 36,
  /** How visible it gets at its fullest: faint. */
  peak: 0.5,
  /** A phrase's words: at least, and at most. */
  words: [3, 8],
} as const;

/** The plain text of a paragraph: {{ref:id|label}} read as its label. */
function plain(text: string): string {
  return parseRefs(text)
    .map(segment => (segment.kind === 'text' ? segment.text : segment.label))
    .join('');
}

/**
 * A short phrase from a file's detail: one of its clauses (split at stops, semicolons, colons, commas and dashes) of
 * 3 or more words, cut to at most 8, chosen by `random`. Null when the detail has nothing long enough.
 */
export function ghostPhrase(detail: readonly string[], random: () => number = Math.random): string | null {
  const [least, most] = GHOST.words;
  const clauses = detail
    .flatMap(paragraph => plain(paragraph).split(/[.;:,!?—–()]+/))
    .map(clause => clause.trim().split(/\s+/).filter(Boolean))
    .filter(words => words.length >= least);
  if (clauses.length === 0) {
    return null;
  }
  const words = clauses[Math.floor(random() * clauses.length) % clauses.length];
  const start = words.length > most ? Math.floor(random() * (words.length - most + 1)) : 0;
  return words.slice(start, start + most).join(' ');
}

/** A number between `low` and `high`, from `random`. */
export function between([low, high]: readonly [number, number], random: () => number = Math.random): number {
  return low + random() * (high - low);
}

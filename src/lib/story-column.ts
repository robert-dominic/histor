// src/lib/story-column.ts
// The text column of a story scene: the chapter's sentences stacked in order, moving up as the reader scrolls.
// This file decides how much of the scrubbed timeline, and so how much scroll, each sentence gets. Pure.
// One second of the timeline is `pxPerSecond()` pixels of scroll (use-story-player.ts), so a sentence's scroll
// distance is proportional to its reading time.
import { parseRefs } from '@/lib/parse-refs';
import { WORDS_PER_MINUTE, beatWords } from '@/lib/story-beats';

/** The constants of the column, in one place. */
export const COLUMN = {
  /** Reading pace. */
  wordsPerMinute: WORDS_PER_MINUTE,
  /** A generous minimum per sentence, in seconds of timeline, however short the sentence. */
  minSeconds: 3.2,
  /** Lines of text visible at a time. */
  visibleLines: 3.5,
  /** ScrollTrigger `scrub` smoothing in seconds: the text glides instead of jumping. */
  scrub: 1.2,
} as const;

/**
 * How the story's scroll feels, in one place, to be tuned by feel (story-dread 1.2). On a trackpad the column moved
 * too fast, so:
 *   `pxPerSecond`: pixels of scroll for one second of the story's timeline, as a share of the screen's height,
 *   within limits. One sentence's scroll is its seconds (at least `COLUMN.minSeconds`) times this, so doubling it
 *   doubles every sentence's distance, the minimum included. Was 0.15 of the screen, 80 to 140px; now about twice
 *   that. "Play the story" scrolls at the same rate, so its reading pace does not change.
 *   `wheelMultiplier`: Lenis's wheel multiplier while the story is on the page (1 elsewhere). Below 1, each wheel or
 *   trackpad flick moves the page less.
 */
export const SCROLL_FEEL = {
  pxPerSecond: { share: 0.3, min: 160, max: 280 },
  wheelMultiplier: 0.8,
} as const;

/** Lines of height the column adds when a sentence is too long to fit the band (see `columnLines`). */
const LONG_SENTENCE = { characters: 150, extraLines: 2 } as const;

/** Seconds of the scrubbed timeline that a sentence gets: its reading time, and at least `COLUMN.minSeconds`. */
export function sentenceSeconds(sentence: string): number {
  return Math.max(COLUMN.minSeconds, (beatWords(sentence) / COLUMN.wordsPerMinute) * 60);
}

export interface ColumnSlot {
  /** Where the sentence starts, in seconds from the start of the column. */
  start: number;
  /** How long it gets. */
  seconds: number;
}

/** Each sentence starts where the one before it ends. */
export function columnPlan(sentences: readonly string[]): ColumnSlot[] {
  let start = 0;
  return sentences.map(sentence => {
    const seconds = sentenceSeconds(sentence);
    const slot = { start, seconds };
    start += seconds;
    return slot;
  });
}

/** The whole column's length in seconds. */
export function columnSeconds(sentences: readonly string[]): number {
  return columnPlan(sentences).reduce((total, slot) => total + slot.seconds, 0);
}

/**
 * How tall a scene's column is, in lines of its own text size: the visible band, plus one line for the soft mask
 * at the top. A scene with a very long sentence gets two lines more, so that sentence can still be read whole.
 */
export function columnLines(sentences: readonly string[]): number {
  const longest = Math.max(0, ...sentences.map(sentence => sentenceLength(sentence)));
  return COLUMN.visibleLines + 1 + (longest > LONG_SENTENCE.characters ? LONG_SENTENCE.extraLines : 0);
}

/** Characters a reader sees in a sentence: markup shown as its label. */
function sentenceLength(sentence: string): number {
  return parseRefs(sentence)
    .map(segment => (segment.kind === 'text' ? segment.text : segment.label))
    .join('').length;
}

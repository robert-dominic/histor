// src/lib/story-column.ts
// The text column of a story scene: the chapter's sentences stacked in order, moving up as the reader scrolls.
// This file decides how much of the scrubbed timeline, and so how much scroll, each sentence gets. Pure.
// One second of the timeline is `pxPerSecond()` pixels of scroll (use-story-player.ts), so a sentence's scroll
// distance is proportional to its reading time.
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

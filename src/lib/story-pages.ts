// src/lib/story-pages.ts
// Story v3: one page per chapter, written by the pen (night-run brief). The pace of the story, in one place, to be
// tuned by feel. Timeline seconds are seconds of scroll: one of them is `pxPerSecond()` pixels.
import { parseRefs } from '@/lib/parse-refs';

export const STORY_PACE = {
  /** The pen writes at about 3× reading pace (240 words a minute), so it leads the eye. */
  penWordsPerMinute: 720,
  /** No page's body takes longer than this to write, in seconds; a long one is written a whole word at a time. */
  maxWriteSeconds: 6,
  /** Above this many letters a second, the pen writes whole words instead. */
  maxLettersPerSecond: 80,
  /** The chapter heading is written in about this long, in seconds. */
  headingSeconds: 1.6,
  /** The kicker is typed at this many letters a second. */
  kickerRate: 40,
  /** Before a weighted phrase the pen pauses this long (seconds), then writes it this many times slower. */
  weightedBreath: 0.35,
  weightedSlowdown: 1.5,
  /** Scrolling onward this far into a page (timeline seconds) finishes its writing at once. */
  skipAfter: 0.25,
  /** The hold before a hook: how much scroll the written page holds, in timeline seconds, before the hook begins. */
  pageHold: 3,
  /** The hook hold: how long the hook line holds, whole, before it decays, in timeline seconds. */
  hookHold: 4,
  /** Reading pace, for the time a reader is given to read: words a minute, and the least time for anything. */
  readWordsPerMinute: 240,
  readAtLeast: 1.6,
  /**
   * Pixels of scroll for one second of the story's timeline, as a share of the screen's height, within limits.
   * "Play the story" scrolls at the same rate, so its pace does not change when this does.
   */
  pxPerSecond: { share: 0.3, min: 160, max: 280 },
  /** Lenis's wheel multiplier while the story is on the page (1 elsewhere): below 1 a flick moves the page less. */
  wheelMultiplier: 0.8,
  /** ScrollTrigger `scrub` smoothing in seconds: the scrubbed parts glide instead of jumping. */
  scrub: 1.2,
} as const;

/** Seconds a reader needs for `text` (markup read as its label): its words at reading pace, and at least the least. */
export function readingSeconds(text: string): number {
  const plain = parseRefs(text)
    .map(segment => (segment.kind === 'text' ? segment.text : segment.label))
    .join('');
  const words = plain.split(/\s+/).filter(word => word !== '').length;
  return Math.max(STORY_PACE.readAtLeast, (words / STORY_PACE.readWordsPerMinute) * 60);
}

export interface PenPlan {
  /** What the pen writes one at a time. */
  unit: 'letter' | 'word';
  /** Units a second. */
  rate: number;
  /** How long the writing takes, in seconds. */
  seconds: number;
}

/**
 * How the pen writes a page body of `letters` letters in `words` words: at its steady pace, but never for longer than
 * `maxWriteSeconds`; letter by letter unless that would be faster than `maxLettersPerSecond`, then word by word.
 */
export function penPlan(letters: number, words: number): PenPlan {
  if (letters <= 0 || words <= 0) {
    return { unit: 'letter', rate: STORY_PACE.maxLettersPerSecond, seconds: 0 };
  }
  const natural = words / (STORY_PACE.penWordsPerMinute / 60);
  const seconds = Math.min(natural, STORY_PACE.maxWriteSeconds);
  const letterRate = letters / seconds;
  return letterRate <= STORY_PACE.maxLettersPerSecond
    ? { unit: 'letter', rate: letterRate, seconds }
    : { unit: 'word', rate: words / seconds, seconds };
}

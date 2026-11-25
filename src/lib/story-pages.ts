// src/lib/story-pages.ts
// The story in steps (story-steps brief): one gesture, one step; each chapter's page is written by the pen. The pace
// of the story, in one place, to be tuned by feel. Every value is in real seconds unless it says otherwise.
import { parseRefs } from '@/lib/parse-refs';

/** The story's pace: every timing to tune by feel, in one place. */
export const STORY_PACE = {
  // ---- Writing speed: the pen.
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

  // ---- Gestures: one gesture, one step.
  /** Wheel events closer together than this (ms) are one gesture: a flick and its trackpad momentum. */
  gestureGapMs: 220,
  /** How far a wheel, a finger or a pointer must move (px) before it counts as a gesture (GSAP Observer). */
  gestureTolerance: 10,

  // ---- The steps' own animations. Input is ignored while one plays.
  /** The next chapter's image cross-dissolves in over the last. Going back is quicker. */
  dissolve: 1,
  backDissolve: 0.5,
  /**
   * Going back plays every step's entrance too (review-fixes brief, 3): the page re-written by the pen, the hook
   * snapping in, the crew list written again, a line of the question played in. This many times faster than forward.
   */
  backSpeed: 1.5,
  /** A jump from the progress rail: a quick dissolve. */
  jumpDissolve: 0.35,
  /** Before a hook, the pen un-writes the crew list's names over this long (and writes them again, going back). */
  unwrite: 1.4,
  /** The breath before a hook: the page has dimmed away; the image darkens and the camera creeps closer. */
  breath: 0.7,
  /** The hook line snaps in whole, its letters settling from out of line over this long. */
  hookIn: 0.8,
  /** Leaving a hook, its letters decay one at a time over this long, then the next image dissolves in. */
  hookDecay: 1,
  /** Each line of the central question plays in over this long. */
  questionPhrase: 0.6,
  /** One scroll reveals the whole question (the fix list): each line starts this long after the one before. */
  questionLineGap: 0.5,
  /** A step with nothing to animate (the fork's own modal) still settles after this long, so a burst cannot slip by. */
  settleAtLeast: 0.05,

  // ---- Slow motion that never holds up a step.
  /** The camera's slow push in and pan across a page. */
  cameraDrift: 18,
  /** The chart draws the stretch of the voyage that ends in a chapter over this long, once its page is on screen. */
  chartDraw: 2.4,

  // ---- "Play the story": how long it holds each step before it moves on.
  /**
   * Once a page is written, it waits for the rest of its reading time (the page read at `readWordsPerMinute`, less
   * the time the pen took), and at least this long, in seconds.
   */
  playHoldAtLeast: 2,
  /** Reading pace, for the time a reader is given to read: words a minute, and the least time for anything. */
  readWordsPerMinute: 240,
  readAtLeast: 1.6,
  /** A hook is held this long. */
  hookHold: 2.4,
  /** The whole question is held this long before the fork. */
  beforeFork: 2.4,
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

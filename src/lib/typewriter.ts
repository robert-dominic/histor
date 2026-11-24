// src/lib/typewriter.ts
// The app's typewriter (review-fixes brief, 8). Every line that types itself in the app's voice (Special Elite) goes
// through here: the kickers, the years, the fork's prompt, the stamps' notes, the verdict's lines and the rank card,
// the guide, the hints. Each letter appears whole, one at a time, and says so (`type-key`): the sound answers with a
// short mechanical key click (throttled, src/lib/sound). A longer line (over `TYPEWRITER.dingAfter` characters) ends
// with the carriage-return ding (`type-return`). Pen-written text keeps the pen's scratch (quill-writing.ts): typed
// text gets the typewriter, written text gets the pen.
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { emitStoryEvent } from '@/lib/story-events';

gsap.registerPlugin(SplitText);

export const TYPEWRITER = {
  /** Letters a second, where a line has no pace of its own. */
  rate: 30,
  /** A line longer than this many characters ends with the carriage-return ding. */
  dingAfter: 40,
} as const;

const KEY = { type: 'type-key' } as const;
const RETURN = { type: 'type-return' } as const;

/**
 * Adds the typing of `letters` to `timeline`, from `at`, at `rate` letters a second: each letter appears whole, with
 * a key's click; a line of more than `TYPEWRITER.dingAfter` characters (`length`, the line's own length with its
 * spaces; the letters' count by default) ends with the ding. Returns when the typing ends.
 */
export function typeLetters(
  timeline: gsap.core.Timeline,
  letters: readonly HTMLElement[],
  at: number,
  rate: number = TYPEWRITER.rate,
  length: number = letters.length
): number {
  letters.forEach((letter, index) => {
    const when = at + index / rate;
    timeline.set(letter, { opacity: 1 }, when);
    timeline.call(emitStoryEvent, [KEY], when);
  });
  const end = at + letters.length / rate;
  if (letters.length > 0 && length > TYPEWRITER.dingAfter) {
    timeline.call(emitStoryEvent, [RETURN], end);
  }
  return end;
}

/**
 * Splits `element` into letters, hides them, and types them on `timeline` from `at`. Returns the split (to revert
 * when the animation is torn down) and when the typing ends. Null for no element.
 */
export function typeElement(
  timeline: gsap.core.Timeline,
  element: HTMLElement | null | undefined,
  at: number,
  rate: number = TYPEWRITER.rate
): { split: SplitText; end: number } | null {
  if (element == null) {
    return null;
  }
  const length = (element.textContent ?? '').trim().length;
  const split = SplitText.create(element, { type: 'words,chars', aria: 'none' });
  const letters = split.chars as HTMLElement[];
  gsap.set(letters, { opacity: 0 });
  return { split, end: typeLetters(timeline, letters, at, rate, length) };
}

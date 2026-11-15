// src/lib/quill-writing.ts
// The quill writer: writes a block of text letter by letter, with a quill that follows the last letter.
// Shared by the legend intro (the myth and the case title) and the story (chapter headings).
// The quill itself is drawn by src/components/Quill.tsx.

import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

/** Timings in seconds. */
export const QUILL = {
  /** Letters written per second. */
  rate: 16,
  /** How long one letter takes to soak in. */
  inkDuration: 0.28,
  /** One back-and-forth of the quill's tilt while it writes. */
  sway: 0.16,
} as const;

/**
 * Splits a block of text into letters and hides them, ready to be written.
 * Call `revert()` on the result when the animation is torn down.
 */
export function splitForQuill(block: HTMLElement): SplitText {
  const split = SplitText.create(block, { type: 'words,chars', aria: 'none' });
  gsap.set(split.chars, { opacity: 0 });
  return split;
}

export interface QuillWriter {
  /**
   * Adds the writing of `letters` to `timeline`, starting at `at` seconds.
   * @returns how long the writing takes, in seconds
   */
  write: (timeline: gsap.core.Timeline, letters: HTMLElement[], at: number, rate?: number) => number;
  /** Puts the quill away at once, for when the writing is cut short. */
  hide: () => void;
}

/**
 * @param point - the zero-sized element that is moved to the letter being written. It must be a direct child
 *   of the positioned element that the text sits in.
 * @param body - the drawing of the quill inside `point`. Its nib sits exactly on the point.
 */
export function createQuillWriter(point: HTMLElement, body: HTMLElement): QuillWriter {
  // The quill follows the last written letter. quickTo smooths the hop from one letter to the next.
  const quillX = gsap.quickTo(point, 'x', { duration: 0.09, ease: 'power2.out' });
  const quillY = gsap.quickTo(point, 'y', { duration: 0.09, ease: 'power2.out' });

  const moveQuill = (letter: HTMLElement, jump: boolean) => {
    const stage = point.parentElement;
    if (stage === null) {
      return;
    }
    const box = letter.getBoundingClientRect();
    const origin = stage.getBoundingClientRect();
    const x = box.right - origin.left;
    const y = box.bottom - origin.top - box.height * 0.18;
    // The first letter of a line is a jump, not a glide across the page.
    quillX(x, jump ? x : undefined);
    quillY(y, jump ? y : undefined);
  };

  return {
    write(timeline, letters, at, rate = QUILL.rate) {
      const duration = letters.length / rate;

      // Each letter soaks in like ink. The blur is only applied while a letter is being written.
      letters.forEach((letter, index) => {
        const letterAt = at + index / rate;
        timeline.call(moveQuill, [letter, index === 0], letterAt);
        timeline.fromTo(
          letter,
          { opacity: 0, filter: 'blur(1px)' },
          {
            opacity: 1,
            filter: 'blur(0px)',
            duration: QUILL.inkDuration,
            ease: 'none',
            clearProps: 'filter',
            immediateRender: false,
          },
          letterAt
        );
      });

      // The quill comes down, tilts a little as it writes, and lifts away at the end of the line.
      const sways = Math.max(1, Math.floor(duration / QUILL.sway));
      timeline.fromTo(body, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.2 }, at);
      timeline.fromTo(
        body,
        { rotation: -3 },
        { rotation: 5, duration: QUILL.sway, ease: 'sine.inOut', repeat: sways - 1, yoyo: true },
        at
      );
      timeline.to(
        body,
        { opacity: 0, y: -18, rotation: -12, duration: 0.3 },
        at + Math.max(duration, sways * QUILL.sway) + 0.05
      );

      return duration;
    },
    hide() {
      gsap.set(body, { opacity: 0 });
    },
  };
}

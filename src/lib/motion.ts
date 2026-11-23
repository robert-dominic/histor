// src/lib/motion.ts
// The one file of motion. Every GSAP tween takes its ease and duration from here (motion.md).
// Tokens are named by what the thing does, not by how it looks.
import gsap from 'gsap';
import { hashUnit } from '@/lib/desk';

/** The four duration steps, in seconds. The scale for delays, holds and staggers. */
export const STEP = { fast: 0.2, base: 0.45, slow: 0.9, scene: 1.2 } as const;

export type TokenName =
  | 'ink.in'
  | 'ink.out'
  | 'paper.lift'
  | 'paper.move'
  | 'paper.land'
  | 'stamp.hit'
  | 'hover'
  | 'layout'
  | 'scene'
  | 'ghost'
  | 'story.weighted'
  | 'story.breath'
  | 'story.hook'
  | 'story.decay';

export interface MotionToken {
  ease: string;
  /** Seconds. For `ghost` this is the middle of the 2 to 4s range; use `ghostDuration` for a per-element value. */
  duration: number;
  /** `ink.in` only: how far the text rises while it fades in, in px. */
  y?: number;
}

/** The story's moments: a weighted phrase, the breath before a hook, the hook's snap and its decay. */

/** The tokens, with their starting values (to be tuned by eye). Exits are quicker than entrances. */
export const MOTION: Record<TokenName, MotionToken> = {
  /** Text and ink arriving: a small rise and a fade. */
  'ink.in': { ease: 'power3.out', duration: 0.9, y: 10 },
  /** Anything leaving. */
  'ink.out': { ease: 'power2.in', duration: 0.45 },
  /** A paper lifting off the table, or a card sliding up. */
  'paper.lift': { ease: 'power2.out', duration: 0.35 },
  /** A paper travelling across the screen. */
  'paper.move': { ease: 'power3.inOut', duration: 0.6 },
  /** A paper coming to rest, with a small overshoot. */
  'paper.land': { ease: 'back.out(1.15)', duration: 0.5 },
  /** The press of a stamp: a hard drop. `stampHit` follows it with a settle. */
  'stamp.hit': { ease: 'expo.in', duration: 0.16 },
  /** Hover and focus feedback. Mirrored in CSS as --motion-hover-ease and --motion-hover-duration. */
  hover: { ease: 'power2.out', duration: 0.2 },
  /** Things changing place or size (used with Flip). */
  layout: { ease: 'power2.inOut', duration: 0.5 },
  /** Camera moves and scene changes. */
  scene: { ease: 'sine.inOut', duration: 1.2 },
  /** Ghost ink drifting and flickering: slow and irregular. */
  ghost: { ease: 'sine.inOut', duration: 3 },
  /** A weighted phrase landing on its own after a breath: it drops into its held space and settles, slightly
   * brighter than the words around it. No line is drawn under it. */
  'story.weighted': { ease: 'power4.out', duration: 0.7 },
  /** The breath before a hook: the page has dimmed away; the image darkens further and the camera creeps closer, and
   * nothing new appears. */
  'story.breath': { ease: 'sine.inOut', duration: 2.4 },
  /** A hook snapping in on a timer: its letters start a little out of line and settle into place, staggered over
   * `STORY_PACE.hookIn`. `duration` is one letter's settle. */
  'story.hook': { ease: 'back.out(2.2)', duration: 0.45 },
  /** A hook leaving: its letters go one at a time, in a random order, like ink drying away. `duration` is one
   * letter's fade. */
  'story.decay': { ease: 'power1.in', duration: 0.35 },
};

/** How far text rises, in px, while it fades in (`ink.in`). */
export const INK_RISE = MOTION['ink.in'].y ?? 0;

/** A quick exit for small things (a menu, a slip, a panel): the `ink.out` ease over half a fast step. */
export const QUICK_OUT = { ease: MOTION['ink.out'].ease, duration: STEP.fast / 2 } as const;

/** The ease and duration of a token, to spread into a tween: `gsap.to(el, { ...tween('hover'), opacity: 1 })`. */
export function tween(name: TokenName): { ease: string; duration: number } {
  const { ease, duration } = MOTION[name];
  return { ease, duration };
}

/** `ghost`: a duration between 2 and 4s, irregular between elements but the same for the same key. */
export function ghostDuration(key: string): number {
  return 2 + hashUnit(key, 'ghost') * 2;
}

/**
 * `stamp.hit`: a stamp pressed onto paper. A hard drop (it grows in from the middle and presses a little past
 * flat), then a small settle back to flat. The timeline plays at once; callers may pause it.
 * Reduced motion: a plain fade.
 */
export function stampHit(
  target: gsap.TweenTarget,
  options: { reduced?: boolean } = {},
): gsap.core.Timeline {
  const tl = gsap.timeline();
  if (options.reduced) {
    return tl.fromTo(target, { opacity: 0 }, { opacity: 1, ...tween('hover') });
  }
  return tl
    .fromTo(
      target,
      { opacity: 0, scale: 1.15, clipPath: 'inset(0% 50% 0% 50%)' },
      { opacity: 1, scale: 0.97, clipPath: 'inset(0% 0% 0% 0%)', ...tween('stamp.hit') },
    )
    .to(target, { scale: 1, ease: 'power2.out', duration: STEP.fast });
}

/** Linear: only for constant motion and scroll-scrubbed timelines (motion.md). */
export const LINEAR = 'none';

/** Media queries for gsap.matchMedia(): every animation gets a full and a reduced version. */
export const MOTION_QUERIES = {
  full: '(prefers-reduced-motion: no-preference)',
  reduced: '(prefers-reduced-motion: reduce)',
} as const;

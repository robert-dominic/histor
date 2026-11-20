// src/lib/motion.ts
// The one file of motion. Every GSAP tween takes its ease and duration from here (motion.md).
// Tokens are named by what the thing does, not by how it looks.
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { hashUnit } from '@/lib/desk';

gsap.registerPlugin(CustomEase);

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
  | 'ghost';

export interface MotionToken {
  ease: string;
  /** Seconds. For `ghost` this is the middle of the 2 to 4s range; use `ghostDuration` for a per-element value. */
  duration: number;
  /** `ink.in` only: how far the text rises while it fades in, in px. */
  y?: number;
}

/** The ten tokens, with their starting values (to be tuned by eye). Exits are quicker than entrances. */
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
};

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

/** Media queries for gsap.matchMedia(): every animation gets a full and a reduced version. */
export const MOTION_QUERIES = {
  full: '(prefers-reduced-motion: no-preference)',
  reduced: '(prefers-reduced-motion: reduce)',
} as const;

// The old custom eases. They go in task 4, once nothing imports them.
/** GSAP ease names. Pass one as the `ease` of a tween. */
export const EASE = {
  /** For anything appearing or responding. */
  out: 'histor-out',
  /** For things moving across the screen. */
  inOut: 'histor-in-out',
  /** For panels and file screens sliding in. */
  drawer: 'histor-drawer',
} as const;
CustomEase.create(EASE.out, '0.23, 1, 0.32, 1');
CustomEase.create(EASE.inOut, '0.77, 0, 0.175, 1');
CustomEase.create(EASE.drawer, '0.32, 0.72, 0, 1');

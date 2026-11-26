// src/lib/motion.ts
// The one file of motion. Every GSAP tween takes its ease and duration from here (motion.md).
// Tokens are named by what the thing does, not by how it looks.
import gsap from 'gsap';
import { hashUnit } from '@/lib/desk';
import { emitStoryEvent } from '@/lib/story-events';

const STAMP_HIT = { type: 'stamp-hit' } as const;

/** The four duration steps, in seconds. The scale for delays, holds and staggers. */
export const STEP = { fast: 0.2, base: 0.45, slow: 0.9, scene: 1.2 } as const;

export type TokenName =
  | 'ink.in'
  | 'ink.out'
  | 'paper.lift'
  | 'paper.move'
  | 'paper.land'
  | 'stamp.hit'
  | 'stamp.shake'
  | 'stamp.spread'
  | 'hover'
  | 'layout'
  | 'scene'
  | 'ghost'
  | 'story.weighted'
  | 'story.breath'
  | 'story.hook'
  | 'story.decay'
  | 'dread.rise'
  | 'dread.lid'
  | 'dread.blink'
  | 'dread.gaze'
  | 'dread.flicker'
  | 'dread.twitch'
  | 'dread.drift'
  | 'dread.cut'
  | 'dread.progress'
  | 'landing.wordmark'
  | 'landing.pull'
  | 'landing.blur'
  | 'landing.dock'
  | 'landing.dockRise'
  | 'landing.swing'
  | 'landing.write'
  | 'landing.musicIn'
  | 'landing.musicOut'
  | 'landing.tilt'
  | 'landing.tiltRelease'
  | 'landing.stage';

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
  /** A record's stamp landing heavy: the folder gives a tiny shake (about 2px). `duration` is the whole shake. */
  'stamp.shake': { ease: 'power1.inOut', duration: 0.14 },
  /** The ink of a stamp spreading slightly into the paper as it settles. */
  'stamp.spread': { ease: 'power2.out', duration: 0.6 },
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
  // ---- The dread pass: rare, quiet, slow. Reduced motion: none of these play.
  /** A ghost line breathing out of a file: rising and drifting like smoke, dissolving (3 to 5s; this is the middle). */
  'dread.rise': { ease: 'sine.out', duration: 4 },
  /** The eye's lid opening, slowly; and closing. */
  'dread.lid': { ease: 'power2.inOut', duration: 1.4 },
  /** The eye's one blink. */
  'dread.blink': { ease: 'power2.inOut', duration: 0.18 },
  /** The pupil following the cursor: heavy, a little behind. */
  'dread.gaze': { ease: 'power3.out', duration: 0.7 },
  /** One stutter of the lamp's light (a legend landing; the lantern over a known legend). */
  'dread.flicker': { ease: 'sine.inOut', duration: 0.09 },
  /** A legend file's tiny shiver on the floor or the board. */
  'dread.twitch': { ease: 'power1.inOut', duration: 0.07 },
  /** The shadow drifting across the deck: constant, slow. */
  'dread.drift': { ease: 'none', duration: 7 },
  /** The one jump scare: the cut to black. */
  'dread.cut': { ease: 'power4.in', duration: 0.08 },
  /** The preloader's progress line, catching up with what has loaded. */
  'dread.progress': { ease: 'power2.out', duration: 0.4 },
  // ---- The landing page (landing v2 brief).
  /** The wordmark fading in on the black, and the picture's detail fading in behind it. */
  'landing.wordmark': { ease: 'power2.out', duration: 0.9 },
  /** The opening's camera pulling back: the detail sharpens and settles into its frame. */
  'landing.pull': { ease: 'power3.inOut', duration: 1.9 },
  /** Text coming into focus (from blur and transparent to sharp); going out is `ink.out`. */
  'landing.blur': { ease: 'power2.out', duration: 0.7 },
  /** The wordmark docking into the header: its sideways move and its shrink (about 0.8s, on its own path). */
  'landing.dock': { ease: 'power3.inOut', duration: 0.8 },
  /** ...and its rise, which runs ahead of the sideways move, so the path is a curve, not a diagonal. */
  'landing.dockRise': { ease: 'power2.out', duration: 0.8 },
  /** A frame swinging like a painting on a wire: it settles from its slight lean with one soft sway back. */
  'landing.swing': { ease: 'back.out(1.4)', duration: 1.5 },
  /** One letter of a frame's title being written (staggered by about a fifth of a second over four). */
  'landing.write': { ease: 'power1.out', duration: 0.14 },
  /** The landing music fading in when started, and one track crossfading into the next (about 3s). */
  'landing.musicIn': { ease: 'sine.inOut', duration: 3 },
  /** ...and fading out when stopped (about 1.5s). */
  'landing.musicOut': { ease: 'sine.inOut', duration: 1.5 },
  /** A frame following the cursor in 3D: about 0.6s, power3.out (used with gsap.quickTo). */
  'landing.tilt': { ease: 'power3.out', duration: 0.6 },
  /** ...and easing back flat when the cursor leaves: no spring, no jitter. */
  'landing.tiltRelease': { ease: 'power3.out', duration: 0.8 },
  /** One case giving way to the next: the frames travelling; one gesture's move, a Lenis scroll with this ease. */
  'landing.stage': { ease: 'power3.inOut', duration: 1.1 },
};

/** How blurred landing text is while it is out of focus, in px. Text lines only, never a large layer. */
export const LANDING_BLUR = 10;

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
  // Every stamp is heard as it presses in (sound-files brief, 2), whatever it stamps.
  const tl = gsap.timeline();
  if (options.reduced) {
    return tl.call(emitStoryEvent, [STAMP_HIT], 0).fromTo(target, { opacity: 0 }, { opacity: 1, ...tween('hover') }, 0);
  }
  tl.call(emitStoryEvent, [STAMP_HIT], MOTION['stamp.hit'].duration);
  return tl
    .fromTo(
      target,
      { opacity: 0, scale: 1.15, clipPath: 'inset(0% 50% 0% 50%)' },
      { opacity: 1, scale: 0.97, clipPath: 'inset(0% 0% 0% 0%)', ...tween('stamp.hit') },
      0,
    )
    .to(target, { scale: 1, ease: 'power2.out', duration: STEP.fast }, MOTION['stamp.hit'].duration);
}

/** Linear: only for constant motion and scroll-scrubbed timelines (motion.md). */
export const LINEAR = 'none';

/** Media queries for gsap.matchMedia(): every animation gets a full and a reduced version. */
export const MOTION_QUERIES = {
  full: '(prefers-reduced-motion: no-preference)',
  reduced: '(prefers-reduced-motion: reduce)',
} as const;

/** How long the landing's scroll must have been still on a case before its words come back, in seconds. */
export const LANDING_SETTLE = 0.15;

/**
 * The scrubbed landing timeline's own units (landing fixes brief): one move of the frames is one unit of the
 * timeline, which the scroll position maps to; the rest are shares of it.
 */
export const SCRUB = { move: 1, fadeOut: 0.4, peekOut: 0.08, peekIn: 0.2 } as const;

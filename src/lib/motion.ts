// src/lib/motion.ts
// Easing tokens for GSAP. The same curves exist as CSS tokens in src/index.css (motion.md, section 2).

import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';

gsap.registerPlugin(CustomEase);

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

/** Media queries for gsap.matchMedia(): every animation gets a full and a reduced version. */
export const MOTION_QUERIES = {
  full: '(prefers-reduced-motion: no-preference)',
  reduced: '(prefers-reduced-motion: reduce)',
} as const;

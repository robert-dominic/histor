// src/lib/lamp.ts
// The lamp's flicker (dread pass, 2 and 5): as if something passed between the lamp and the desk. The dip layer
// (Lamp.tsx) darkens and stutters, then the light comes back. `long` is a Legend stamp landing (about a second); short
// is the lantern passing over an opened legend file. Reduced motion, or no lamp on screen: nothing.
import gsap from 'gsap';
import { MOTION_QUERIES, tween } from '@/lib/motion';

/** How dark each stutter gets (the dip layer's opacity), short and long. */
export const LAMP_FLICKER = {
  short: [0.16, 0.04, 0.12, 0],
  long: [0.32, 0.12, 0.38, 0.18, 0.3, 0.08, 0.22, 0],
} as const;

export function lampFlicker(length: 'short' | 'long' = 'short'): gsap.core.Timeline | null {
  const dip = document.querySelector<HTMLElement>('[data-desk="lamp-dip"]');
  if (dip === null || typeof window.matchMedia !== 'function' || window.matchMedia(MOTION_QUERIES.reduced).matches) {
    return null;
  }
  gsap.killTweensOf(dip);
  const timeline = gsap.timeline();
  for (const level of LAMP_FLICKER[length]) {
    timeline.to(dip, { opacity: level, ...tween('dread.flicker') });
  }
  return timeline;
}

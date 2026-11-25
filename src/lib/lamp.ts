// src/lib/lamp.ts
// The lamp's flicker (dread pass, 5): as a Legend stamp lands, as if something passed between the lamp and the desk.
// The dip layer (Lamp.tsx) darkens and stutters for about a second, then the light comes back. Reduced motion, or no
// lamp on screen: nothing.
import gsap from 'gsap';
import { MOTION_QUERIES, tween } from '@/lib/motion';

/** How dark each stutter gets (the dip layer's opacity), in turn. */
export const LAMP_FLICKER = [0.32, 0.12, 0.38, 0.18, 0.3, 0.08, 0.22, 0] as const;

export function lampFlicker(): gsap.core.Timeline | null {
  const dip = document.querySelector<HTMLElement>('[data-desk="lamp-dip"]');
  if (dip === null || typeof window.matchMedia !== 'function' || window.matchMedia(MOTION_QUERIES.reduced).matches) {
    return null;
  }
  gsap.killTweensOf(dip);
  const timeline = gsap.timeline();
  for (const level of LAMP_FLICKER) {
    timeline.to(dip, { opacity: level, ...tween('dread.flicker') });
  }
  return timeline;
}

/** A known legend's shiver (dread pass, 5), to tune: every 10 to 20s, one file; how far it turns and shifts at most. */
export const TWITCH = {
  everyMs: [10000, 20000],
  turn: 1.4,
  shift: 1.2,
} as const;

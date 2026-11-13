// src/lib/use-reduced-motion.ts
// Tells a component whether the visitor asked for reduced motion. For choosing what to render
// (for example a still image instead of a video). Animations use gsap.matchMedia() instead.

import { useSyncExternalStore } from 'react';
import { MOTION_QUERIES } from '@/lib/motion';

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }
  const query = window.matchMedia(MOTION_QUERIES.reduced);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function getSnapshot(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(MOTION_QUERIES.reduced).matches;
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

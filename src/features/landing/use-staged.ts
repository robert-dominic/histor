// src/features/landing/use-staged.ts
// Whether the landing page is the stage (landing-stage.ts): at full motion, on a laptop and on a phone alike (mobile
// pass: a swipe drives the same scroll-linked frames as the wheel). Under reduced motion the sections are a plain
// stack that scrolls.
import { MOTION_QUERIES } from '@/lib/motion';
import { useMediaQuery } from '@/lib/use-media-query';

export function useStaged(): boolean {
  return useMediaQuery(MOTION_QUERIES.full);
}

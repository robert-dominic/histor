// src/features/landing/use-staged.ts
// Whether the landing page is a stage of steps (landing v2 brief, 2): a laptop-sized screen at full motion. On a
// phone, or under reduced motion, the same sections are a plain stack that scrolls.
import { MOTION_QUERIES } from '@/lib/motion';
import { DESKTOP_QUERY, useMediaQuery } from '@/lib/use-media-query';

export function useStaged(): boolean {
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const full = useMediaQuery(MOTION_QUERIES.full);
  return desktop && full;
}

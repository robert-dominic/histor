// src/lib/frame-shapes.ts
// The landing page's frame shapes (landing v3 brief): the frame is always the biggest thing on screen, about 60% of
// the screen's height. A landscape frame reaches up to about 60% of the width; a portrait or square one fills the
// same height.
import type { FrameShape } from '@/cases';

/**
 * Each shape's proportions, its height on a laptop, and its height on the phone's stage (mobile pass): still the
 * biggest thing on screen, about 40% of the screen's height, a landscape frame reaching about 85% of the width.
 */
export const FRAME_SHAPES: Record<FrameShape, { ratio: string; height: string; phone: string }> = {
  landscape: { ratio: '4 / 3', height: 'min(60svh, 45vw)', phone: 'min(40svh, 64vw)' },
  portrait: { ratio: '3 / 4', height: 'min(60svh, 60vw)', phone: 'min(44svh, 100vw)' },
  square: { ratio: '1 / 1', height: 'min(60svh, 55vw)', phone: 'min(40svh, 80vw)' },
};

/** The main painting (the first case): a wider frame, 3 to 2, still about 60% of the screen's height. */
export const FEATURED_SHAPE = { ratio: '3 / 2', height: 'min(60svh, 40vw)', phone: 'min(40svh, 57vw)' } as const;

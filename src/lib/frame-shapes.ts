// src/lib/frame-shapes.ts
// The landing page's frame shapes (landing v3 brief): the frame is always the biggest thing on screen, about 60% of
// the screen's height. A landscape frame reaches up to about 60% of the width; a portrait or square one fills the
// same height.
import type { FrameShape } from '@/cases';

/** Each shape's proportions, and its height on a laptop. */
export const FRAME_SHAPES: Record<FrameShape, { ratio: string; height: string }> = {
  landscape: { ratio: '4 / 3', height: 'min(60svh, 45vw)' },
  portrait: { ratio: '3 / 4', height: 'min(60svh, 60vw)' },
  square: { ratio: '1 / 1', height: 'min(60svh, 55vw)' },
};

/** The main painting (the first case): a wider frame, 3 to 2, still about 60% of the screen's height. */
export const FEATURED_SHAPE = { ratio: '3 / 2', height: 'min(60svh, 40vw)' } as const;

// src/lib/frame-shapes.ts
// The landing page's frame shapes (landing brief, 3): the frames are not all the same size or shape.
import type { FrameShape } from '@/cases';

/** Each shape's proportions, and its height on a laptop (each fits the screen with room for the words below). */
export const FRAME_SHAPES: Record<FrameShape, { ratio: string; height: string }> = {
  landscape: { ratio: '4 / 3', height: 'min(52svh, 33vw)' },
  portrait: { ratio: '3 / 4', height: 'min(54svh, 42vw)' },
  square: { ratio: '1 / 1', height: 'min(50svh, 36vw)' },
  wide: { ratio: '2.2 / 1', height: 'min(36svh, 24vw)' },
};

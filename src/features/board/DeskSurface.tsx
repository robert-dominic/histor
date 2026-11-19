// src/features/board/DeskSurface.tsx
// The desk itself: a dark, night-toned surface with a hint of old wood grain and a strong vignette.
// Made only with CSS gradients and an SVG noise filter: no image files. The page's own grain lies over it.

import { useId } from 'react';

export default function DeskSurface() {
  const noiseId = useId().replace(/:/g, '');
  return (
    <div aria-hidden="true" data-desk="surface" className="desk-surface pointer-events-none fixed inset-0 -z-10">
      {/* Fine noise in the wood. */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.16] mix-blend-soft-light" preserveAspectRatio="none">
        <filter id={noiseId}>
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.42" numOctaves="3" seed="7" />
          <feColorMatrix values="0 0 0 0 0.8  0 0 0 0 0.62  0 0 0 0 0.4  0 0 0 0.9 0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${noiseId})`} />
      </svg>
      <div className="desk-vignette absolute inset-0" />
    </div>
  );
}

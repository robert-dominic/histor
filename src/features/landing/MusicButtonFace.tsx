// src/features/landing/MusicButtonFace.tsx
// What the landing's music button looks like (landing fixes brief), like estheet.com's:
// - off (the default): a music note with a small slash through it (muted);
// - playing: small moving equaliser bars, with a thin circular progress ring around the button that fills as the
//   current track plays and starts again on the next track.
// The ring is a drawn line (`stroke-dashoffset`), written straight to the element from the music's own clock
// (use-landing-music.ts), never through React state. The bars are constant motion (CSS keyframes, effects.css); under
// reduced motion they stand still at different heights.
import type { Ref } from 'react';
import { MusicOffIcon } from '@/components/icons';
import { RING } from '@/features/landing/music-ring';

interface MusicButtonFaceProps {
  playing: boolean;
  /** The progress circle, so the music's clock can fill it. */
  ringRef: Ref<SVGCircleElement>;
}

export default function MusicButtonFace({ playing, ringRef }: MusicButtonFaceProps) {
  return (
    <>
      <svg aria-hidden="true" viewBox="0 0 40 40" data-music="ring" className="pointer-events-none absolute inset-0 size-full -rotate-90">
        <circle cx="20" cy="20" r={RING.radius} fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" />
        <circle
          ref={ringRef}
          data-music="progress"
          cx="20"
          cy="20"
          r={RING.radius}
          fill="none"
          stroke="var(--color-brass)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray={RING.circumference}
          strokeDashoffset={RING.circumference}
        />
      </svg>
      {playing ? (
        <span aria-hidden="true" data-music="bars" className="flex h-4 items-end gap-[2.5px]">
          {[0, 1, 2, 3].map(bar => (
            <span key={bar} className="eq-bar block h-full w-[2px] rounded-full bg-current" />
          ))}
        </span>
      ) : (
        <span aria-hidden="true" data-music="muted">
          <MusicOffIcon />
        </span>
      )}
    </>
  );
}

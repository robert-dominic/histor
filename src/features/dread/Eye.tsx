// src/features/dread/Eye.tsx
// The eye (dread pass, 4 and 8), drawn in SVG: heavy-lidded and realistic-ish, in muted tones, never cartoonish. A
// sclera that is not white, a dark grey-blue iris with a black pupil and a faint wet highlight, a heavy upper lid with
// its crease, a lower lid. It starts closed; whoever shows it moves the lids (`[data-eye="upper"]`, `[data-eye="lower"]`)
// and the gaze (`[data-eye="gaze"]`). Decorative: hidden from screen readers.
import { useId } from 'react';


export default function Eye({ className = '' }: { className?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg aria-hidden="true" viewBox="0 0 200 100" className={className} data-eye="svg">
      <defs>
        <clipPath id={`eye-${id}`}>
          <path d="M8 52 C46 10 154 10 192 52 C154 88 46 88 8 52 Z" />
        </clipPath>
        <radialGradient id={`sclera-${id}`} cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#b8b2a2" />
          <stop offset="70%" stopColor="#8f8a7d" />
          <stop offset="100%" stopColor="#4c4840" />
        </radialGradient>
        <radialGradient id={`iris-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#2b3338" />
          <stop offset="55%" stopColor="#48545b" />
          <stop offset="100%" stopColor="#1d2226" />
        </radialGradient>
      </defs>
      <g clipPath={`url(#eye-${id})`}>
        <rect x="0" y="0" width="200" height="100" fill={`url(#sclera-${id})`} />
        <g data-eye="gaze">
          <circle cx="100" cy="52" r="25" fill={`url(#iris-${id})`} />
          <circle cx="100" cy="52" r="10" fill="#0b0d0e" />
          <ellipse cx="92" cy="44" rx="4.5" ry="3" fill="#e6e1d3" opacity="0.35" />
        </g>
        {/* The lids: closed until moved. */}
        <path data-eye="upper" d="M-10 -80 H210 V52 C154 66 46 66 -10 52 Z" fill="#26221e" />
        <path data-eye="lower" d="M-10 52 C46 62 154 62 210 52 V180 H-10 Z" fill="#221e1b" />
      </g>
      {/* The crease above the eye, and the faint line under it. */}
      <path d="M14 40 C52 4 148 4 186 40" fill="none" stroke="#4c4840" strokeWidth="2" opacity="0.6" />
      <path d="M24 64 C62 84 138 84 176 64" fill="none" stroke="#4c4840" strokeWidth="1.2" opacity="0.35" />
    </svg>
  );
}

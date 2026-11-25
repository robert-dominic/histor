// src/features/dread/Face.tsx
// A face without flesh (the fix list; it was the eye of dread pass, 4 and 8): only hollow eyes and a nose, in the
// dark. Two sockets, dark voids with the faintest pale rim, each with a dim point of light far inside that can look
// to one side (`[data-face="gaze"]`); a nasal hollow below them. The sockets and their lights are one group
// (`[data-face="eyes"]`) that can close, narrowing to a slit about the eyes' line (quick fixes, 3). Nothing else: no skin, no mouth, no outline of a head.
// About 120px tall where it appears in the app; the jump scare draws it at about 30% of the screen's height.
// Decorative: hidden from screen readers.
import { useId } from 'react';

export default function Face({ className = '' }: { className?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg aria-hidden="true" viewBox="0 0 100 120" className={className} data-face="svg">
      <defs>
        <radialGradient id={`socket-${id}`} cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#000000" />
          <stop offset="70%" stopColor="#030405" />
          <stop offset="100%" stopColor="#1a1f22" stopOpacity="0.85" />
        </radialGradient>
        <radialGradient id={`rim-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="72%" stopColor="#a8c3d3" stopOpacity="0" />
          <stop offset="92%" stopColor="#a8c3d3" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#a8c3d3" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* The eyes: a faint pale rim, then the void; they close about their own line. */}
      <g data-face="eyes">
        <ellipse cx="29" cy="44" rx="17" ry="14" fill={`url(#rim-${id})`} />
        <ellipse cx="71" cy="44" rx="17" ry="14" fill={`url(#rim-${id})`} />
        <ellipse cx="29" cy="45" rx="14" ry="11.5" fill={`url(#socket-${id})`} transform="rotate(-6 29 45)" />
        <ellipse cx="71" cy="45" rx="14" ry="11.5" fill={`url(#socket-${id})`} transform="rotate(6 71 45)" />
        {/* Far inside each, a dim point of light: where it looks. */}
        <g data-face="gaze">
          <circle cx="29" cy="46" r="1.8" fill="#e6e1d3" opacity="0.55" />
          <circle cx="71" cy="46" r="1.8" fill="#e6e1d3" opacity="0.55" />
        </g>
      </g>
      {/* The nasal hollow. */}
      <path d="M50 64 C46 72 43 80 44 86 C46 88 48 87 50 85 C52 87 54 88 56 86 C57 80 54 72 50 64 Z" fill="#020303" stroke="#a8c3d3" strokeOpacity="0.1" strokeWidth="1" />
    </svg>
  );
}

// src/features/board/WaxSeal.tsx
// The wax seal on the desk, once enough files are open: "Close the case", a link to the verdict. It presses in
// when it first appears (scale 1.4 to 1, as wax is pressed), and emits `seal` when it is used.
// Reduced motion: it fades in.
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import SealMark from '@/features/board/SealMark';
import { MOTION_QUERIES, tween } from '@/lib/motion';
import { emitStoryEvent } from '@/lib/story-events';

gsap.registerPlugin(useGSAP);

interface WaxSealProps {
  to: string;
}

export default function WaxSeal({ to }: WaxSealProps) {
  const rootRef = useRef<HTMLAnchorElement>(null);
  useGSAP(
    () => {
      if (typeof window.matchMedia !== 'function') {
        return;
      }
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES, context => {
        const reduced = context.conditions?.reduced === true;
        gsap.fromTo(
          '[data-seal="mark"]',
          reduced ? { opacity: 0 } : { opacity: 0, scale: 1.4, rotation: -8 },
          { opacity: 1, scale: 1, rotation: 0, ...tween('paper.lift') }
        );
      });
    },
    { scope: rootRef }
  );
  return (
    <Link
      ref={rootRef}
      to={to}
      data-seal="desk"
      onClick={() => emitStoryEvent({ type: 'seal', where: 'desk' })}
      className="group/seal flex items-center gap-3 rounded-sm outline-offset-4 focus-visible:outline-2 focus-visible:outline-brass"
    >
      <SealMark className="size-16 drop-shadow-[0_3px_6px_rgba(0,0,0,0.6)] transition-[scale] duration-150 ease-out group-active/seal:scale-[0.97] lg:size-20" />
      <span className="font-voice text-sm tracking-[0.14em] text-night-ink uppercase underline decoration-brass/60 underline-offset-4">
        Close the case
      </span>
    </Link>
  );
}

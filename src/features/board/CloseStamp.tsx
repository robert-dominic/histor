// src/features/board/CloseStamp.tsx
// "Close the case", once enough files are open: a rubber ink stamp in the top bar, like the header's UNSOLVED tag
// (a rectangular rust-ink frame around typed capitals), and a link to the verdict. It thunks in when it first
// appears (`stamp.hit`), and emits `seal` when it is used. No logo mark: a real one comes later.
// Reduced motion: it fades in.
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { MOTION_QUERIES, stampHit } from '@/lib/motion';
import { emitStoryEvent } from '@/lib/story-events';

gsap.registerPlugin(useGSAP);

export default function CloseStamp({ to }: { to: string }) {
  const rootRef = useRef<HTMLAnchorElement>(null);
  useGSAP(
    () => {
      if (typeof window.matchMedia !== 'function') {
        return;
      }
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES, context => {
        stampHit('[data-seal="mark"]', { reduced: context.conditions?.reduced === true });
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
      className="group/seal rounded-sm outline-offset-4 focus-visible:outline-2 focus-visible:outline-brass"
    >
      <span
        data-seal="mark"
        className="rubber-stamp rubber-stamp-night text-[0.9375rem] transition-[scale,color] duration-150 ease-out group-hover/seal:text-night-ink group-active/seal:scale-[0.97]"
      >
        Close the case
      </span>
    </Link>
  );
}

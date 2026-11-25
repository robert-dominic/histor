// src/features/landing/FrameActions.tsx
// What a frame does when pressed (landing brief, 4).
// - An open case: a short transition (the frame scales up, the screen fades to black), then its page.
// - A sealed case: a small plaque card rises beside the frame (the shared Popover) with its title, years, subline and
//   "Sealed — case file in preparation."; Escape or a click outside closes it; heard as the modal sound.
// Both tilt toward the cursor on hover (use-frame-tilt.ts).
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import Popover from '@/components/Popover';
import type { Exhibit } from '@/cases';
import { useFrameTilt } from '@/features/landing/use-frame-tilt';
import { MOTION_QUERIES, tween } from '@/lib/motion';
import { emitStoryEvent } from '@/lib/story-events';

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-brass';

/** The black the screen fades to before an open case: one per page (Landing.tsx). */
function blackout(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-landing="blackout"]');
}

export function OpenFrame({ exhibit, children }: { exhibit: Exhibit; children: ReactNode }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const navigate = useNavigate();
  useFrameTilt(ref);
  const href = `/case/${exhibit.id}`;
  return (
    <Link
      ref={ref}
      to={href}
      aria-label={`Open the case: ${exhibit.title}`}
      data-exhibit-part="open"
      onClick={event => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || typeof window.matchMedia !== 'function') {
          return;
        }
        event.preventDefault();
        const reduced = window.matchMedia(MOTION_QUERIES.reduced).matches;
        const frame = ref.current?.querySelector('.haunted-frame');
        const black = blackout();
        const timeline = gsap.timeline({ data: 'landing-enter', onComplete: () => navigate(href) });
        if (!reduced && frame != null) {
          timeline.to(frame, { scale: 1.08, rotationX: 0, rotationY: 0, ...tween('paper.move') }, 0);
        }
        if (black !== null) {
          timeline.fromTo(black, { opacity: 0, visibility: 'visible' }, { opacity: 1, ...tween('paper.move') }, 0);
        }
      }}
      className={`block rounded-[2px] ${FOCUS}`}
    >
      {children}
    </Link>
  );
}

export function SealedFrame({ exhibit, children }: { exhibit: Exhibit; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  useFrameTilt(buttonRef);

  const toggle = (next: boolean) => {
    setOpen(next);
    emitStoryEvent({ type: 'popover', open: next });
  };

  // Escape, or a press outside, closes it.
  useEffect(() => {
    if (!open) {
      return;
    }
    const close = () => {
      setOpen(false);
      emitStoryEvent({ type: 'popover', open: false });
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
        buttonRef.current?.focus();
      }
    };
    const outside = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || rootRef.current?.contains(event.target) !== true) {
        close();
      }
    };
    document.addEventListener('keydown', key);
    document.addEventListener('pointerdown', outside);
    return () => {
      document.removeEventListener('keydown', key);
      document.removeEventListener('pointerdown', outside);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`${exhibit.title}: sealed`}
        aria-expanded={open}
        aria-controls={id}
        data-exhibit-part="sealed"
        data-ui-sound="off"
        onClick={() => toggle(!open)}
        className={`block w-full cursor-pointer rounded-[2px] text-left lg:w-auto ${FOCUS}`}
      >
        {children}
      </button>
      <Popover
        open={open}
        id={id}
        role="dialog"
        aria-label={`${exhibit.title}, sealed`}
        data-exhibit-part="plaque"
        className="top-[calc(100%+0.75rem)] left-0 w-full max-w-sm lg:top-0 lg:left-[calc(100%+2.75rem)] lg:w-72"
      >
        <p className="font-record text-[1.25rem] leading-tight text-ink italic">{exhibit.title}</p>
        <p className="mt-1 font-voice text-[0.6875rem] tracking-[0.18em] text-ink/70 uppercase">{exhibit.years}</p>
        <p className="mt-3 font-record text-[0.9375rem] leading-snug text-ink/85">{exhibit.subline}</p>
        <p className="mt-3 font-voice text-[0.75rem] text-rust">Sealed — case file in preparation.</p>
      </Popover>
    </div>
  );
}

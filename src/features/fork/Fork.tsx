// src/features/fork/Fork.tsx
// The closing modal, over the story's last chapter. Once the reader scrolls on from it (or "Play the story" has held
// on it), it rises and settles over a darkened backdrop (`paper.lift`, then `paper.land`). The app types its bold
// line, then the lines under it come in and one large button opens the case files. The focus stays inside while it
// is open; Escape, or scrolling back up, closes it and returns to the chapter. Reduced motion: it appears without
// animation. Everything shown comes from props.

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import { MOTION_QUERIES, QUICK_OUT, STEP, tween } from '@/lib/motion';
import { emitStoryEvent } from '@/lib/story-events';
import type { Fork as ForkData } from '@/types/case';
import { typeLetters } from '@/lib/typewriter';

gsap.registerPlugin(useGSAP, SplitText);

/** Letters the typewriter types per second, the same rate as the legend intro's debunk. */
const TYPE_RATE = 30;

const CHOICE_CLASSES =
  'inline-flex min-h-14 min-w-[14rem] items-center justify-center rounded-sm px-8 font-voice text-base tracking-[0.14em] uppercase transition-[scale,background-color,color] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brass active:scale-[0.97]';

/** What can take the focus inside the modal. */
const TAB_STOPS = 'a[href], button:not(:disabled), [tabindex="0"]';

export interface ForkProps {
  fork: ForkData;
  /** Where "Open the case files" goes. */
  filesHref: string;
  open: boolean;
  /** Escape: close it and go back to the question. */
  onClose: () => void;
}

export default function Fork({ fork, filesHref, open, onClose }: ForkProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  // Drawn while open, and until it has finished leaving.
  const [drawn, setDrawn] = useState(open);
  if (open && !drawn) {
    setDrawn(true);
  }
  const shown = drawn || open;

  // The focus goes into it when it opens. Its sound: a paper slide in, and out.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) {
      panelRef.current?.focus({ preventScroll: true });
    }
    if (open !== wasOpen.current) {
      emitStoryEvent({ type: 'modal', name: 'fork', open });
      wasOpen.current = open;
    }
  }, [open]);

  // Opening: it rises and settles, then the prompt is typed and the choices come. Closing: a quick fade.
  useGSAP(
    () => {
      const root = rootRef.current;
      if (root === null) {
        return;
      }
      const canQuery = typeof window.matchMedia === 'function';
      const reduced = !canQuery || window.matchMedia(MOTION_QUERIES.reduced).matches;
      if (!open) {
        if (drawn && !reduced) {
          gsap.to(root, { opacity: 0, ...QUICK_OUT, onComplete: () => setDrawn(false) });
        } else if (drawn) {
          setDrawn(false);
        }
        return;
      }
      gsap.set(root, { opacity: 1 });
      if (reduced) {
        return;
      }
      const timeline = gsap.timeline();
      timeline.fromTo('[data-fork="backdrop"]', { opacity: 0 }, { opacity: 1, ...tween('paper.lift') }, 0);
      timeline.fromTo(panelRef.current, { opacity: 0, y: 48 }, { opacity: 1, y: -6, ...tween('paper.lift') }, 0);
      timeline.to(panelRef.current, { y: 0, ...tween('paper.land') });
      const prompt = root.querySelector<HTMLElement>('[data-fork="prompt"]');
      let split: SplitText | null = null;
      if (prompt !== null) {
        split = SplitText.create(prompt, { type: 'words,chars', aria: 'none' });
        const letters = split.chars as HTMLElement[];
        gsap.set(letters, { opacity: 0 });
        typeLetters(timeline, letters, timeline.duration(), TYPE_RATE, (prompt.textContent ?? '').trim().length);
      }
      // The lines under it come in one after another, then the button (no sound: the click is the button's own).
      const lines = root.querySelectorAll<HTMLElement>('[data-fork="line"]');
      timeline.fromTo(lines, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, ...tween('paper.lift'), stagger: STEP.base }, `>+=${STEP.fast}`);
      timeline.fromTo('[data-fork="choices"]', { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, ...tween('paper.lift') }, `>+=${STEP.fast}`);
      return () => split?.revert();
    },
    { scope: rootRef, dependencies: [open], revertOnUpdate: true }
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab' || panelRef.current === null) {
      return;
    }
    // The focus stays inside.
    const stops = [...panelRef.current.querySelectorAll<HTMLElement>(TAB_STOPS)];
    if (stops.length === 0) {
      event.preventDefault();
      return;
    }
    const first = stops[0];
    const last = stops[stops.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (!shown) {
    return null;
  }
  return (
    <div ref={rootRef} data-fork="modal" className="fixed inset-0 z-[55] grid place-items-center px-4" onKeyDown={handleKeyDown}>
      <div aria-hidden="true" data-fork="backdrop" className="absolute inset-0 bg-black/80" />
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="What next"
        tabIndex={-1}
        data-fork="root"
        data-lenis-prevent
        className="thin-scroll relative max-h-[calc(100svh-2rem)] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-[2px] border border-night-ink/15 bg-night px-6 pt-10 pb-10 text-center text-night-ink shadow-2xl shadow-black/70 outline-none sm:px-12"
      >
        <p className="mx-auto max-w-[34rem] font-voice text-[clamp(1.125rem,1rem+0.5vw,1.4375rem)] leading-[1.6] font-bold text-pretty">
          <span className="sr-only">{fork.prompt}</span>
          <span aria-hidden="true" data-fork="prompt">
            {fork.prompt}
          </span>
        </p>

        {fork.body !== undefined && (
          <div className="mx-auto mt-7 flex max-w-[34rem] flex-col gap-4 font-record text-[clamp(1.0625rem,1rem+0.3vw,1.25rem)] leading-[1.65] text-night-ink/90">
            {fork.body.map((paragraph, index) => (
              <p key={index} data-fork="line" className="whitespace-pre-line text-pretty">
                {paragraph}
              </p>
            ))}
          </div>
        )}
        <div data-fork="choices" className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link to={filesHref} className={`${CHOICE_CLASSES} border border-brass bg-brass text-night hover:bg-transparent hover:text-brass`}>
            {fork.investigateLabel}
          </Link>
        </div>
      </section>
    </div>
  );
}

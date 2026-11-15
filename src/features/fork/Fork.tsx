// src/features/fork/Fork.tsx
// The fork, after the central question, still at full night. The app types its prompt, then offers two ways on:
// open the case files, or stop here. Stopping shows where historians stand, with two quiet ways out.
// Everything shown comes from props.

import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import { EASE, MOTION_QUERIES } from '@/lib/motion';
import type { Fork as ForkData } from '@/types/case';

gsap.registerPlugin(useGSAP, SplitText);

/** Letters the typewriter types per second, the same rate as the legend intro's debunk. */
const TYPE_RATE = 30;

const CHOICE_CLASSES =
  'inline-flex min-h-11 items-center justify-center rounded-sm px-6 font-voice text-sm tracking-[0.14em] uppercase transition-[scale,background-color,color] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brass active:scale-[0.97]';
const QUIET_LINK_CLASSES =
  'inline-flex min-h-11 items-center font-voice text-sm tracking-[0.1em] text-ghost-night underline underline-offset-4 transition-[color] duration-150 ease-out hover:text-night-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass';

interface ForkProps {
  fork: ForkData;
  /** Shown to the reader who stops here. */
  historiansSummary: string[];
  /** Where "Open the case files" goes. */
  filesHref: string;
}

export default function Fork({ fork, historiansSummary, filesHref }: ForkProps) {
  const rootRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLDivElement>(null);
  const [stopped, setStopped] = useState(false);

  // The prompt is typed once, when the fork comes into view. Without a way to watch for that, or to honour
  // reduced motion, everything is simply shown.
  useGSAP(
    () => {
      if (typeof window.matchMedia !== 'function' || typeof IntersectionObserver !== 'function') {
        return;
      }
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES, context => {
        const reduced = context.conditions?.reduced === true;
        const prompt = gsap.utils.toArray<HTMLElement>('[data-fork="prompt"]')[0];
        const choices = '[data-fork="choices"]';
        const timeline = gsap.timeline({ paused: true, defaults: { ease: EASE.out } });
        let split: SplitText | null = null;

        if (reduced) {
          timeline.fromTo(prompt, { opacity: 0 }, { opacity: 1, duration: 0.5 });
        } else {
          split = SplitText.create(prompt, { type: 'words,chars', aria: 'none' });
          const letters = split.chars as HTMLElement[];
          gsap.set(letters, { opacity: 0 });
          letters.forEach((letter, index) => timeline.set(letter, { opacity: 1 }, index / TYPE_RATE));
        }
        // Hidden with visibility as well, so the buttons cannot be focused before they are shown.
        timeline.fromTo(
          choices,
          reduced ? { autoAlpha: 0 } : { autoAlpha: 0, y: 8 },
          { autoAlpha: 1, y: 0, duration: 0.4 },
          '>+=0.3'
        );

        const observer = new IntersectionObserver(
          entries => {
            if (entries.some(entry => entry.isIntersecting)) {
              timeline.play();
              observer.disconnect();
            }
          },
          { threshold: 0.5 }
        );
        if (rootRef.current !== null) {
          observer.observe(rootRef.current);
        }
        return () => {
          observer.disconnect();
          split?.revert();
        };
      });
    },
    { scope: rootRef }
  );

  // Stopping here: where historians stand fades in, and the focus moves to it.
  useGSAP(
    () => {
      if (!stopped) {
        return;
      }
      closeRef.current?.focus({ preventScroll: true });
      if (typeof window.matchMedia !== 'function') {
        return;
      }
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES, context => {
        const reduced = context.conditions?.reduced === true;
        gsap.fromTo(
          closeRef.current,
          reduced ? { opacity: 0 } : { opacity: 0, y: 8 },
          { opacity: 1, y: 0, duration: 0.5, ease: EASE.out }
        );
      });
    },
    { scope: rootRef, dependencies: [stopped] }
  );

  return (
    <section
      ref={rootRef}
      data-fork="root"
      aria-label="What next"
      className="relative z-10 flex min-h-[70svh] flex-col items-center justify-center bg-night px-6 pt-8 pb-[14svh] text-center"
    >
      <p className="max-w-[34rem] font-voice text-[clamp(1.0625rem,0.95rem+0.5vw,1.375rem)] leading-[1.6] text-pretty text-night-ink">
        <span className="sr-only">{fork.prompt}</span>
        <span aria-hidden="true" data-fork="prompt">
          {fork.prompt}
        </span>
      </p>

      {stopped ? (
        <div ref={closeRef} tabIndex={-1} data-fork="close" className="mt-10 max-w-[38rem] outline-none">
          <div className="flex flex-col gap-4 font-record text-[clamp(1.0625rem,1rem+0.3vw,1.25rem)] leading-[1.65] text-night-ink">
            {historiansSummary.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
          <nav aria-label="After the story" className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-1">
            <Link to={filesHref} className={QUIET_LINK_CLASSES}>
              Open the case files anyway
            </Link>
            <Link to="/" className={QUIET_LINK_CLASSES}>
              Back to all cases
            </Link>
          </nav>
        </div>
      ) : (
        <div data-fork="choices" className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
          <Link to={filesHref} className={`${CHOICE_CLASSES} border border-brass text-brass hover:bg-brass hover:text-night`}>
            {fork.investigateLabel}
          </Link>
          <button
            type="button"
            onClick={() => setStopped(true)}
            className={`${CHOICE_CLASSES} text-ghost-night hover:text-night-ink`}
          >
            {fork.leaveLabel}
          </button>
        </div>
      )}
    </section>
  );
}

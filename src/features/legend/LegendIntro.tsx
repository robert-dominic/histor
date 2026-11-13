// src/features/legend/LegendIntro.tsx
// The legend intro: a quill writes the famous myth, a stamp lands on it, and a typewriter answers.
// The quill is the legend's voice; the typewriter is the app's voice.
// Everything shown comes from props. Nothing about any one case is written in this file.

import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import { EASE, MOTION_QUERIES } from '@/lib/motion';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import type { CaseTheme, LegendIntro as LegendIntroData } from '@/types/case';

gsap.registerPlugin(useGSAP, SplitText);

/** Timings in seconds for the full version. */
const FULL = {
  start: 0.5,
  /** Letters the quill writes per second. */
  quillRate: 16,
  /** How long one letter takes to soak in. */
  inkDuration: 0.28,
  pauseBetweenLines: 0.6,
  /** Time to finish reading the last line before the stamp. */
  holdBeforeStamp: 1.5,
  stampDuration: 0.18,
  pauseBeforeTyping: 0.8,
  /** Letters the typewriter types per second. */
  typeRate: 30,
  caretLinger: 0.6,
  pauseBeforeContinue: 0.3,
  continueDuration: 0.4,
} as const;

/** Reduced motion: the same order and beats, with whole lines fading in. No quill, no typing, no movement. */
const REDUCED = {
  start: 0.2,
  lineGap: 0.8,
  lineDuration: 0.5,
  pauseBeforeStamp: 0.5,
  stampDuration: 0.2,
  pauseBeforeDebunk: 0.6,
  debunkDuration: 0.5,
  pauseBeforeContinue: 0.4,
  continueDuration: 0.3,
} as const;

/** How far the myth dims once the stamp has landed on it. At 50% the lines still reach 3:1 on night. */
const DIMMED_OPACITY = 0.5;

/** One back-and-forth of the quill's tilt while it writes, in seconds. */
const QUILL_SWAY = 0.16;

interface LegendIntroProps {
  /** The myth, the stamp text and the debunk, from the case data. */
  legendIntro: LegendIntroData;
  /** Optional illustration video behind the text. */
  video?: CaseTheme['legendVideo'];
  /** True for a visitor who has seen this intro before: open at the end state, with no animation. */
  startAtEnd?: boolean;
  /** Called once when the end state is first reached, by playing through or by Skip. */
  onEnded?: () => void;
  /** Called when the visitor presses Continue. */
  onDone: () => void;
}

export default function LegendIntro({ legendIntro, video, startAtEnd = false, onEnded, onDone }: LegendIntroProps) {
  const rootRef = useRef<HTMLElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  // Only the value at mount counts: an intro that has started keeps playing.
  const [startedAtEnd] = useState(startAtEnd);
  const endedRef = useRef(startedAtEnd);
  const onEndedRef = useRef(onEnded);
  // True once every beat has played, or the visitor skipped to the end.
  const [ended, setEnded] = useState(startedAtEnd);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  const markEnded = useCallback(() => {
    if (endedRef.current) {
      return;
    }
    endedRef.current = true;
    setEnded(true);
    onEndedRef.current?.();
  }, []);

  // A returning visitor lands on the end state, so Continue is the one thing left to do.
  useEffect(() => {
    if (startedAtEnd) {
      continueRef.current?.focus({ preventScroll: true });
    }
  }, [startedAtEnd]);

  useGSAP(
    () => {
      // Without matchMedia there is no way to honour a reduced-motion request, so nothing is animated:
      // everything is simply shown.
      if (typeof window.matchMedia !== 'function') {
        markEnded();
        return;
      }

      const mm = gsap.matchMedia();

      mm.add(MOTION_QUERIES, context => {
        const reduced = context.conditions?.reduced === true;
        const select = (name: string) => gsap.utils.toArray<HTMLElement>(`[data-legend="${name}"]`);

        const lines = select('line');
        const myth = select('myth');
        const stamp = select('stamp');
        const debunk = select('debunk');
        const next = select('continue');

        const timeline = gsap.timeline({ defaults: { ease: EASE.out }, onComplete: markEnded });
        const splits: SplitText[] = [];

        if (reduced) {
          // Whole lines fade in, one after another.
          lines.forEach((line, index) => {
            timeline.fromTo(
              line,
              { opacity: 0 },
              { opacity: 1, duration: REDUCED.lineDuration },
              REDUCED.start + index * REDUCED.lineGap
            );
          });

          timeline.addLabel('stamp', `>+=${REDUCED.pauseBeforeStamp}`);
          timeline.fromTo(stamp, { opacity: 0 }, { opacity: 1, duration: REDUCED.stampDuration }, 'stamp');
          timeline.to(myth, { opacity: DIMMED_OPACITY, duration: 0.3 }, 'stamp');

          timeline.fromTo(
            debunk,
            { opacity: 0 },
            { opacity: 1, duration: REDUCED.debunkDuration },
            `stamp+=${REDUCED.stampDuration + REDUCED.pauseBeforeDebunk}`
          );

          timeline.fromTo(
            next,
            { autoAlpha: 0 },
            { autoAlpha: 1, duration: REDUCED.continueDuration },
            `>+=${REDUCED.pauseBeforeContinue}`
          );
        } else {
          const stage = select('stage')[0];
          const quill = select('quill')[0];
          const quillBody = select('quill-body')[0];
          const caret = select('caret')[0];

          // The quill follows the last written letter. quickTo smooths the hop from one letter to the next.
          const quillX = gsap.quickTo(quill, 'x', { duration: 0.09, ease: 'power2.out' });
          const quillY = gsap.quickTo(quill, 'y', { duration: 0.09, ease: 'power2.out' });
          const moveQuill = (letter: HTMLElement, jump: boolean) => {
            const box = letter.getBoundingClientRect();
            const origin = stage.getBoundingClientRect();
            const x = box.right - origin.left;
            const y = box.bottom - origin.top - box.height * 0.18;
            // The first letter of a line is a jump, not a glide across the page.
            quillX(x, jump ? x : undefined);
            quillY(y, jump ? y : undefined);
          };

          // 1. The myth, written letter by letter. Each letter soaks in like ink.
          let cursor: number = FULL.start;
          lines.forEach(line => {
            const split = SplitText.create(line, { type: 'words,chars', aria: 'none' });
            splits.push(split);
            const letters = split.chars as HTMLElement[];
            const lineStart = cursor;
            const lineDuration = letters.length / FULL.quillRate;
            // Hide every letter in one pass. The blur is only applied while a letter is being written.
            gsap.set(letters, { opacity: 0 });

            letters.forEach((letter, index) => {
              const at = lineStart + index / FULL.quillRate;
              timeline.call(moveQuill, [letter, index === 0], at);
              timeline.fromTo(
                letter,
                { opacity: 0, filter: 'blur(1px)' },
                {
                  opacity: 1,
                  filter: 'blur(0px)',
                  duration: FULL.inkDuration,
                  ease: 'none',
                  clearProps: 'filter',
                  immediateRender: false,
                },
                at
              );
            });

            // The quill comes down, tilts a little as it writes, and lifts away at the end of the line.
            const sways = Math.max(1, Math.floor(lineDuration / QUILL_SWAY));
            timeline.fromTo(quillBody, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.2 }, lineStart);
            timeline.fromTo(
              quillBody,
              { rotation: -3 },
              { rotation: 5, duration: QUILL_SWAY, ease: 'sine.inOut', repeat: sways - 1, yoyo: true },
              lineStart
            );
            timeline.to(
              quillBody,
              { opacity: 0, y: -18, rotation: -12, duration: 0.3 },
              lineStart + Math.max(lineDuration, sways * QUILL_SWAY) + 0.05
            );

            cursor = lineStart + lineDuration + FULL.pauseBetweenLines;
          });

          // 2. The stamp lands, fast, and the myth dims behind it.
          const stampAt = cursor - FULL.pauseBetweenLines + FULL.holdBeforeStamp;
          timeline.fromTo(
            stamp,
            { opacity: 0, scale: 1.15 },
            { opacity: 1, scale: 1, duration: FULL.stampDuration },
            stampAt
          );
          timeline.to(myth, { opacity: DIMMED_OPACITY, duration: 0.3 }, stampAt);

          // 3. The debunk, typed. Letters appear whole, one at a time, with a caret after the last one.
          debunk.forEach(block => {
            const split = SplitText.create(block, { type: 'words,chars', aria: 'none' });
            splits.push(split);
            const letters = split.chars as HTMLElement[];
            const origin = block.parentElement as HTMLElement;
            const moveCaret = (letter: HTMLElement, before: boolean) => {
              const box = letter.getBoundingClientRect();
              const from = origin.getBoundingClientRect();
              gsap.set(caret, { x: (before ? box.left : box.right) - from.left, y: box.bottom - from.top });
            };

            gsap.set(letters, { opacity: 0 });
            const typeStart = stampAt + FULL.stampDuration + FULL.pauseBeforeTyping;
            if (letters.length > 0) {
              timeline.call(moveCaret, [letters[0], true], typeStart - 0.4);
            }
            timeline.set(caret, { opacity: 1 }, typeStart - 0.4);
            // The caret blinks while it waits and is solid while letters are being typed.
            const setTyping = (typing: boolean) => caret.setAttribute('data-typing', String(typing));
            const typeEnd = typeStart + letters.length / FULL.typeRate;
            timeline.call(setTyping, [true], typeStart);
            letters.forEach((letter, index) => {
              const at = typeStart + index / FULL.typeRate;
              timeline.set(letter, { opacity: 1 }, at);
              timeline.call(moveCaret, [letter, false], at);
            });
            timeline.call(setTyping, [false], typeEnd);
            timeline.set(caret, { opacity: 0 }, typeEnd + FULL.caretLinger);
          });

          // 4. Continue. Hidden with visibility as well as opacity, so it cannot be focused before it is shown.
          timeline.fromTo(
            next,
            { autoAlpha: 0, y: 8 },
            { autoAlpha: 1, y: 0, duration: FULL.continueDuration },
            `>+=${FULL.pauseBeforeContinue}`
          );
        }

        // Already ended (a returning visitor, or the motion setting changed afterwards): show the end state at once.
        // Callbacks are suppressed, so the quill and the caret stay hidden.
        if (endedRef.current) {
          timeline.progress(1, true);
        }

        timelineRef.current = timeline;
        return () => {
          timelineRef.current = null;
          splits.forEach(split => split.revert());
        };
      });
    },
    { scope: rootRef, dependencies: [legendIntro, markEnded] }
  );

  /** Skip: jump straight to the end state, so everything can still be read. */
  const handleSkip = () => {
    // Suppress callbacks: the quill and the caret must not be moved by letters that were skipped.
    timelineRef.current?.progress(1, true);
    markEnded();
    // Skip is about to leave the screen. Hand its focus to Continue.
    continueRef.current?.focus({ preventScroll: true });
  };

  const showVideo = video !== undefined && !reducedMotion;

  return (
    <section
      ref={rootRef}
      aria-label="The legend"
      data-ended={ended}
      className="relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-night px-5 pt-14 pb-20 text-center sm:px-10 sm:py-16"
    >
      {video !== undefined && (
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          {showVideo ? (
            <video
              className="h-full w-full object-cover"
              src={video.src}
              poster={video.poster}
              muted
              autoPlay
              loop
              playsInline
              disablePictureInPicture
              preload="auto"
              tabIndex={-1}
            />
          ) : (
            <img className="h-full w-full object-cover" src={video.poster} alt="" />
          )}
          {/* Dark overlay: keeps the text readable whatever the frame behind it shows. */}
          <div className="absolute inset-0 bg-night/78" />
        </div>
      )}

      {!ended && (
        <button
          type="button"
          onClick={handleSkip}
          className="absolute top-3 right-3 min-h-11 px-3 font-voice text-xs tracking-[0.14em] text-ghost-night/85 uppercase transition-[scale,color] duration-150 ease-out hover:text-night-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass active:scale-[0.97] sm:top-5 sm:right-5"
        >
          Skip
        </button>
      )}

      <div data-legend="stage" className="relative w-full max-w-4xl">
        <div data-legend="myth" className="flex flex-col gap-3 sm:gap-4">
          {legendIntro.lines.map((line, index) => (
            <p
              key={index}
              className="font-legend text-[clamp(1.75rem,min(1.1rem+3.2vw,6.2vh),4rem)] leading-[1.08] text-balance text-ghost-night"
            >
              {/* Screen readers get the whole line at once; the copy the quill writes is for the eyes only. */}
              <span className="sr-only">{line}</span>
              <span aria-hidden="true" data-legend="line">
                {line}
              </span>
            </p>
          ))}
        </div>

        {/* The quill. This zero-sized point is moved to the letter being written; the nib sits exactly on it. */}
        <div data-legend="quill" aria-hidden="true" className="pointer-events-none absolute top-0 left-0 h-0 w-0">
          <svg
            data-legend="quill-body"
            viewBox="0 0 48 48"
            fill="none"
            className="absolute bottom-0 left-0 h-[clamp(2.75rem,5.5vw,4.25rem)] w-auto origin-bottom-left text-night-ink opacity-0"
          >
            {/* Vane */}
            <path
              d="M45 2C33 4 22 11 16 22c-2 4-3 8-3 11l4-3c-1 3-1 5 0 7 9-3 17-10 22-19 3-5 5-11 6-16Z"
              fill="currentColor"
              fillOpacity="0.9"
            />
            {/* Splits in the vane */}
            <path d="M29 12l-3 6M36 10l-4 9M24 20l-2 6" stroke="var(--color-night)" strokeWidth="0.9" strokeLinecap="round" />
            {/* Shaft */}
            <path d="M41 6C30 16 18 29 8 40" stroke="var(--color-night)" strokeWidth="1" strokeLinecap="round" />
            {/* Nib */}
            <path d="M13 34L1.5 46.5l2.2-9.2Z" fill="currentColor" />
            <path d="M8 40L2 46" stroke="var(--color-night)" strokeWidth="0.8" strokeLinecap="round" />
          </svg>
        </div>

        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <p
            data-legend="stamp"
            className="max-w-[94%] -rotate-6 rounded-[0.14em] border-[0.16em] border-rust-night bg-night/80 px-[0.55em] pt-[0.4em] pb-[0.26em] font-voice text-[clamp(1.2rem,0.85rem+2vw,2.75rem)] leading-[1.15] tracking-[0.06em] text-balance text-rust-night uppercase"
          >
            <strong className="font-normal">{legendIntro.stamp}</strong>
          </p>
        </div>
      </div>

      <p className="relative mt-6 max-w-[40rem] font-voice text-[clamp(0.9375rem,0.9rem+0.25vw,1.125rem)] leading-[1.7] text-pretty text-night-ink sm:mt-12">
        <span className="sr-only">{legendIntro.debunk}</span>
        <span aria-hidden="true" data-legend="debunk">
          {legendIntro.debunk}
        </span>
        {/* The typewriter's caret. Moved to the last typed letter. It blinks when idle and is solid while typing. */}
        <span
          data-legend="caret"
          data-typing="false"
          aria-hidden="true"
          className="group pointer-events-none absolute top-0 left-0 opacity-0"
        >
          <span className="block h-[1.15em] w-[0.5em] -translate-y-full animate-caret bg-night-ink/85 group-data-[typing=true]:animate-none" />
        </span>
      </p>

      {/* GSAP animates this wrapper, not the button, so the button keeps its own press feedback. */}
      <div data-legend="continue" className="mt-6 sm:mt-10">
        <button
          ref={continueRef}
          type="button"
          onClick={onDone}
          className="min-h-11 border border-night-ink/60 px-7 pt-3.5 pb-3 font-voice text-sm tracking-[0.14em] text-night-ink uppercase transition-[scale,background-color,color] duration-150 ease-out hover:bg-night-ink hover:text-night focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brass active:scale-[0.97]"
        >
          Continue
        </button>
      </div>

      {video !== undefined && (
        <p className="absolute right-4 bottom-3 left-4 text-left font-voice text-[0.6875rem] leading-snug tracking-[0.06em] text-ghost-night/70 sm:bottom-5 sm:left-6">
          <span className="tracking-[0.14em] uppercase">Illustration</span>
          <span aria-hidden="true"> · </span>
          <span data-legend="credit">{video.credit}</span>
        </p>
      )}
    </section>
  );
}

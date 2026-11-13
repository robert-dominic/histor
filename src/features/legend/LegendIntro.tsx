// src/features/legend/LegendIntro.tsx
// The legend intro: the famous myth told line by line, then stamped as not in the record.
// Everything shown comes from props. Nothing about any one case is written in this file.

import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { EASE, MOTION_QUERIES } from '@/lib/motion';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import type { CaseTheme, LegendIntro as LegendIntroData } from '@/types/case';

gsap.registerPlugin(useGSAP);

/**
 * Splits the debunk into its first sentence and the rest, so the first sentence can land on its own beat.
 * An ellipsis ("Well... that") does not end a sentence: a sentence ends at . ! or ? followed by a capital letter.
 */
function splitFirstSentence(text: string): { first: string; rest: string } {
  const match = /^(.*?[.!?])\s+(?=\p{Lu})/su.exec(text);
  if (!match) {
    return { first: text, rest: '' };
  }
  return { first: match[1], rest: text.slice(match[0].length) };
}

/** Timings in seconds. The reduced version keeps the same order and beats, shorter and without movement. */
const TIMING = {
  full: {
    start: 0.5,
    lineGap: 1.0,
    lineDuration: 0.9,
    pauseBeforeStamp: 0.9,
    stampDuration: 0.18,
    pauseBeforeDebunk: 0.9,
    voiceDuration: 0.6,
    voiceBeat: 1.3,
    restDuration: 0.7,
    pauseBeforeContinue: 0.5,
    continueDuration: 0.4,
  },
  reduced: {
    start: 0.2,
    lineGap: 0.8,
    lineDuration: 0.5,
    pauseBeforeStamp: 0.5,
    stampDuration: 0.2,
    pauseBeforeDebunk: 0.6,
    voiceDuration: 0.4,
    voiceBeat: 0.9,
    restDuration: 0.4,
    pauseBeforeContinue: 0.3,
    continueDuration: 0.3,
  },
} as const;

/** How far the myth dims once the stamp has landed on it. */
const DIMMED_OPACITY = 0.4;

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

  const { first: voiceLine, rest: debunkRest } = splitFirstSentence(legendIntro.debunk);

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
        const t = reduced ? TIMING.reduced : TIMING.full;

        const lines = gsap.utils.toArray<HTMLElement>('[data-legend="line"]');
        const myth = gsap.utils.toArray<HTMLElement>('[data-legend="myth"]');
        const stamp = gsap.utils.toArray<HTMLElement>('[data-legend="stamp"]');
        const voice = gsap.utils.toArray<HTMLElement>('[data-legend="voice"]');
        const rest = gsap.utils.toArray<HTMLElement>('[data-legend="rest"]');
        const next = gsap.utils.toArray<HTMLElement>('[data-legend="continue"]');

        const timeline = gsap.timeline({ defaults: { ease: EASE.out }, onComplete: markEnded });

        // 1. The myth, line by line. Earlier lines stay on screen.
        lines.forEach((line, index) => {
          timeline.fromTo(
            line,
            reduced ? { opacity: 0 } : { opacity: 0, y: 16, filter: 'blur(2px)' },
            reduced
              ? { opacity: 1, duration: t.lineDuration }
              : { opacity: 1, y: 0, filter: 'blur(0px)', duration: t.lineDuration, clearProps: 'filter' },
            t.start + index * t.lineGap
          );
        });

        // 2. The stamp lands, fast, and the myth dims behind it.
        timeline.addLabel('stamp', `>+=${t.pauseBeforeStamp}`);
        timeline.fromTo(
          stamp,
          reduced ? { opacity: 0 } : { opacity: 0, scale: 1.15 },
          reduced ? { opacity: 1, duration: t.stampDuration } : { opacity: 1, scale: 1, duration: t.stampDuration },
          'stamp'
        );
        timeline.to(myth, { opacity: DIMMED_OPACITY, duration: 0.3 }, 'stamp');

        // 3. The debunk. Its first sentence is the app speaking, so it gets a beat to itself.
        timeline.addLabel('voice', `stamp+=${t.stampDuration + t.pauseBeforeDebunk}`);
        timeline.fromTo(
          voice,
          reduced ? { opacity: 0 } : { opacity: 0, y: 8 },
          reduced ? { opacity: 1, duration: t.voiceDuration } : { opacity: 1, y: 0, duration: t.voiceDuration },
          'voice'
        );
        if (rest.length > 0) {
          timeline.fromTo(rest, { opacity: 0 }, { opacity: 1, duration: t.restDuration }, `voice+=${t.voiceBeat}`);
        }

        // 4. Continue. Hidden with visibility as well as opacity, so it cannot be focused before it is shown.
        timeline.fromTo(
          next,
          reduced ? { autoAlpha: 0 } : { autoAlpha: 0, y: 8 },
          reduced
            ? { autoAlpha: 1, duration: t.continueDuration }
            : { autoAlpha: 1, y: 0, duration: t.continueDuration },
          `>+=${t.pauseBeforeContinue}`
        );

        // Already ended (a returning visitor, or the motion setting changed afterwards): show the end state at once.
        if (endedRef.current) {
          timeline.progress(1);
        }

        timelineRef.current = timeline;
        return () => {
          timelineRef.current = null;
        };
      });
    },
    { scope: rootRef, dependencies: [legendIntro, markEnded] }
  );

  /** Skip: jump straight to the end state, so everything can still be read. */
  const handleSkip = () => {
    timelineRef.current?.progress(1);
    markEnded();
    // Skip is about to leave the screen. Hand its focus to Continue.
    continueRef.current?.focus({ preventScroll: true });
  };

  const showVideo = video !== undefined && !reducedMotion;
  const showPoster = video !== undefined && reducedMotion;

  return (
    <section
      ref={rootRef}
      aria-label="The legend"
      data-ended={ended}
      className="relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-night px-5 py-14 text-center sm:px-10 sm:py-16"
    >
      {(showVideo || showPoster) && (
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
            <img className="h-full w-full object-cover" src={video?.poster} alt="" />
          )}
          {/* Dark overlay: keeps the text readable whatever the frame behind it shows. */}
          <div className="absolute inset-0 bg-night/78" />
        </div>
      )}

      {!ended && (
        <button
          type="button"
          onClick={handleSkip}
          className="absolute top-3 right-3 min-h-11 px-3 font-stamp text-xs tracking-[0.14em] text-ghost-night/85 uppercase transition-[scale,color] duration-150 ease-out hover:text-night-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass active:scale-[0.97] sm:top-5 sm:right-5"
        >
          Skip
        </button>
      )}

      <div className="relative w-full max-w-4xl">
        <div data-legend="myth" className="flex flex-col gap-3 sm:gap-4">
          {legendIntro.lines.map((line, index) => (
            <p
              key={index}
              data-legend="line"
              className="font-legend text-[clamp(1.75rem,min(1.1rem+3.2vw,6.2vh),4rem)] leading-[1.08] text-balance text-ghost-night"
            >
              {line}
            </p>
          ))}
        </div>

        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <p
            data-legend="stamp"
            className="max-w-[92%] -rotate-6 rounded-[0.14em] border-[0.16em] border-rust-night bg-night/80 px-[0.55em] pt-[0.34em] pb-[0.22em] font-stamp text-[clamp(1.35rem,0.9rem+2.6vw,3.25rem)] leading-none tracking-[0.08em] text-rust-night uppercase"
          >
            <strong className="font-normal">{legendIntro.stamp}</strong>
          </p>
        </div>
      </div>

      <p className="mt-8 max-w-[38rem] font-record text-[clamp(1.0625rem,1rem+0.35vw,1.3125rem)] leading-relaxed text-pretty text-night-ink sm:mt-12">
        <span data-legend="voice" className="inline-block">
          {voiceLine}
        </span>
        {debunkRest !== '' && <span data-legend="rest"> {debunkRest}</span>}
      </p>

      {/* GSAP animates this wrapper, not the button, so the button keeps its own press feedback. */}
      <div data-legend="continue" className="mt-8 sm:mt-10">
        <button
          ref={continueRef}
          type="button"
          onClick={onDone}
          className="min-h-11 border border-night-ink/60 px-7 pt-3.5 pb-3 font-stamp text-sm tracking-[0.14em] text-night-ink uppercase transition-[scale,background-color,color] duration-150 ease-out hover:bg-night-ink hover:text-night focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brass active:scale-[0.97]"
      >
          Continue
        </button>
      </div>

      {(showVideo || showPoster) && (
        <p className="absolute bottom-3 left-4 font-stamp text-[0.6875rem] tracking-[0.14em] text-ghost-night/70 uppercase sm:bottom-5 sm:left-6">
          Illustration
        </p>
      )}
    </section>
  );
}

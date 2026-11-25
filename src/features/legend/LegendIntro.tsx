// src/features/legend/LegendIntro.tsx
// The legend intro: a quill writes the famous myth, a stamp lands on it, and a typewriter answers. It ends on a
// scroll cue that leads into the story.
// The quill is the legend's voice; the typewriter is the app's voice.
// Everything shown comes from props. Nothing about any one case is written in this file.

import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import CreditInfo from '@/components/CreditInfo';
import SoundHint from '@/features/legend/SoundHint';
import Quill from '@/components/Quill';
import { MOTION, MOTION_QUERIES, STEP, stampHit } from '@/lib/motion';
import { createQuillWriter, splitForQuill } from '@/lib/quill-writing';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import type { CaseTheme, LegendIntro as LegendIntroData } from '@/types/case';
import { typeLetters } from '@/lib/typewriter';

gsap.registerPlugin(useGSAP, SplitText);

/** A stamp's press and settle (motion.ts `stampHit`): the press, then STEP.fast. */
const STAMP_SECONDS = MOTION['stamp.hit'].duration + STEP.fast;

/** Timings in seconds for the full version. */
const FULL = {
  start: 0.5,
  pauseBetweenLines: 0.6,
  /** Time to finish reading the last line before the stamp. */
  holdBeforeStamp: 1.5,
  stampDuration: STAMP_SECONDS,
  pauseBeforeTyping: 0.8,
  /** Letters the typewriter types per second. */
  typeRate: 30,
  caretLinger: 0.6,
  pauseBeforeContinue: 0.3,
  continueDuration: STEP.base,
} as const;

/** Reduced motion: the same order and beats, with whole lines fading in. No quill, no typing, no movement. */
const REDUCED = {
  start: 0.2,
  lineGap: 0.8,
  lineDuration: STEP.base,
  pauseBeforeStamp: 0.5,
  stampDuration: STEP.fast,
  pauseBeforeDebunk: 0.6,
  debunkDuration: STEP.base,
  pauseBeforeContinue: 0.4,
  continueDuration: STEP.base,
} as const;

/** How far the myth dims once the stamp has landed on it. At 50% the lines still reach 3:1 on night. */
const DIMMED_OPACITY = 0.5;

interface LegendIntroProps {
  /** The myth, the stamp text and the debunk, from the case data. */
  legendIntro: LegendIntroData;
  /** Optional illustration video behind the text. */
  video?: CaseTheme['legendVideo'];
  /** True for a visitor who has seen this intro before: open at the end state, with no animation. */
  startAtEnd?: boolean;
  /** Called once when the end state is first reached, by playing through or by Skip. */
  onEnded?: () => void;
  /** Called when the visitor presses the scroll cue at the end. */
  onDone: () => void;
}

export default function LegendIntro({
  legendIntro,
  video,
  startAtEnd = false,
  onEnded,
  onDone,
}: LegendIntroProps) {
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

  // A returning visitor lands on the end state, so the scroll cue is the one thing left to do.
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
        const timeline = gsap.timeline({ defaults: { ease: MOTION['ink.in'].ease }, onComplete: markEnded });
        const splits: SplitText[] = [];

        if (reduced) {
          // The myth: whole lines fade in, one after another.
          const mythStart: number = REDUCED.start;

          lines.forEach((line, index) => {
            timeline.fromTo(
              line,
              { opacity: 0 },
              { opacity: 1, duration: REDUCED.lineDuration },
              mythStart + index * REDUCED.lineGap
            );
          });

          timeline.addLabel('stamp', `>+=${REDUCED.pauseBeforeStamp}`);
          timeline.fromTo(stamp, { opacity: 0 }, { opacity: 1, duration: REDUCED.stampDuration }, 'stamp');
          timeline.to(myth, { opacity: DIMMED_OPACITY, duration: STEP.base }, 'stamp');

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
          const caret = select('caret')[0];
          const quill = createQuillWriter(select('quill')[0], select('quill-body')[0], { hand: 'legend' });

          let cursor: number = FULL.start;

          // 1. The myth, written letter by letter.
          lines.forEach(line => {
            const split = splitForQuill(line);
            splits.push(split);
            const lineDuration = quill.write(timeline, split.chars as HTMLElement[], cursor);
            cursor += lineDuration + FULL.pauseBetweenLines;
          });

          // 2. The stamp lands, fast, and the myth dims behind it.
          const stampAt = cursor - FULL.pauseBetweenLines + FULL.holdBeforeStamp;
          timeline.add(stampHit(stamp), stampAt);
          timeline.to(myth, { opacity: DIMMED_OPACITY, duration: STEP.base }, stampAt);

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
            typeLetters(timeline, letters, typeStart, FULL.typeRate, (block.textContent ?? '').trim().length);
            letters.forEach((letter, index) => timeline.call(moveCaret, [letter, false], typeStart + index / FULL.typeRate));
            timeline.call(setTyping, [false], typeEnd);
            timeline.set(caret, { opacity: 0 }, typeEnd + FULL.caretLinger);
          });

          // 4. The scroll cue. Hidden with visibility as well as opacity, so it cannot be focused before it is shown.
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
    // Skip is about to leave the screen. Hand its focus to the scroll cue.
    continueRef.current?.focus({ preventScroll: true });
  };

  const showVideo = video !== undefined && !reducedMotion;

  return (
    <section
      ref={rootRef}
      aria-label="The legend"
      data-ended={ended}
      // On a laptop, an editorial layout (ui-pass brief, 8): the legend left-aligned in the left 55%, starting a little
      // below the top third; the image bleeding off the right edge, partly behind the text; the stamp crooked over the
      // last line toward the right; the scroll cue bottom left. On a phone, stacked and centred as before.
      className="relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-night px-5 pt-14 pb-20 text-center sm:px-10 sm:py-16 lg:items-start lg:justify-start lg:px-[6vw] lg:pt-[36svh] lg:pb-36 lg:text-left"
    >
      {video !== undefined && (
        <div aria-hidden="true" data-legend="media" className="absolute inset-0 -z-10 lg:left-[35%]">
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
          {/* Dark overlay: keeps the text readable whatever the frame behind it shows. On a laptop it darkens toward the
              text's side, where the text overlaps it, and lets the image breathe on the right. */}
          <div className="absolute inset-0 bg-night/78 lg:bg-transparent lg:bg-[linear-gradient(to_right,var(--color-night)_0%,color-mix(in_srgb,var(--color-night)_92%,transparent)_34%,color-mix(in_srgb,var(--color-night)_60%,transparent)_70%,color-mix(in_srgb,var(--color-night)_45%,transparent)_100%)]" />
        </div>
      )}

      {!ended && (
        <button
          type="button"
          onClick={handleSkip}
          className="absolute top-[calc(var(--case-header)+0.25rem)] right-2 min-h-11 px-3 font-voice text-xs tracking-[0.14em] text-ghost-night/85 uppercase transition-[scale,color] duration-150 ease-out hover:text-night-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass active:scale-[0.97] sm:right-4"
        >
          Skip
        </button>
      )}

      <div data-legend="stage" className="relative w-full max-w-4xl lg:max-w-[49vw]">
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

        {/* The quill. Its point is moved to the letter being written. */}
        <Quill attribute="data-legend" />

        <div className="pointer-events-none absolute inset-0 grid place-items-center lg:place-items-end lg:translate-x-[18%] lg:translate-y-[30%]">
          <p
            data-legend="stamp"
            className="max-w-[94%] -rotate-6 rounded-[0.14em] border-[0.16em] border-rust-night bg-night/80 px-[0.55em] pt-[0.4em] pb-[0.26em] font-voice text-[clamp(1.2rem,0.85rem+2vw,2.75rem)] leading-[1.15] tracking-[0.06em] text-balance text-rust-night uppercase"
          >
            <strong className="font-normal">{legendIntro.stamp}</strong>
          </p>
        </div>
      </div>

      <p className="relative mt-6 max-w-[40rem] font-voice lg:max-w-[min(40rem,49vw)] text-[clamp(0.9375rem,0.9rem+0.25vw,1.125rem)] leading-[1.7] text-pretty text-night-ink sm:mt-12">
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

      {/* The scroll cue. GSAP animates this wrapper, not the button, so the button keeps its own press feedback. */}
      <div data-legend="continue" className="mt-6 sm:mt-10 lg:absolute lg:bottom-12 lg:left-[6vw] lg:mt-0">
        <button
          ref={continueRef}
          type="button"
          onClick={onDone}
          className="group flex min-h-11 flex-col items-center gap-2 px-4 pt-2 pb-1 lg:items-start lg:px-0 font-voice text-sm tracking-[0.14em] text-night-ink uppercase transition-[scale,color] duration-150 ease-out hover:text-brass focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brass active:scale-[0.97]"
        >
          <span>See what really happened</span>
          <svg
            aria-hidden="true"
            viewBox="0 0 16 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-4 animate-cue motion-reduce:animate-none"
          >
            <path d="M8 1v17M2 12l6 6 6-6" />
          </svg>
        </button>
      </div>

      {/* Until the sound is unlocked: a quiet hint at the foot (review-fixes brief, 6). */}
      <SoundHint />

      {/* Always visible: the video is an illustration. The full credit is behind the ⓘ, as on the chapter images. */}
      {video !== undefined && (
        <>
          <p
            data-legend="illustration"
            className="absolute bottom-3 left-4 font-voice text-[0.6875rem] leading-snug tracking-[0.14em] text-ghost-night/70 uppercase sm:bottom-5 sm:left-6"
          >
            Illustration
          </p>
          <CreditInfo
            credit={video.credit}
            attribute="data-legend"
            placement="above"
            className="right-0 bottom-0 sm:right-2 sm:bottom-2"
          />
        </>
      )}
    </section>
  );
}

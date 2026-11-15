// src/features/legend/LegendIntro.tsx
// The legend intro: a title card, then a quill writes the famous myth, a stamp lands on it, and a typewriter
// answers. It ends on a scroll cue that leads into the story.
// When the page has a case header (components/CaseHeader.tsx), the title card's title shrinks and docks into it.
// The quill is the legend's voice; the typewriter is the app's voice.
// Everything shown comes from props. Nothing about any one case is written in this file.

import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import CreditInfo from '@/components/CreditInfo';
import Quill from '@/components/Quill';
import { EASE, MOTION_QUERIES } from '@/lib/motion';
import { createQuillWriter, splitForQuill } from '@/lib/quill-writing';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import type { CaseTheme, LegendIntro as LegendIntroData } from '@/types/case';

gsap.registerPlugin(useGSAP, SplitText);

/** Timings in seconds for the full version. */
const FULL = {
  start: 0.5,
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

/** The title card, the first beat: about three seconds, then it gives way to the myth. Seconds. */
const TITLE = {
  start: 0.4,
  pauseBeforeYears: 0.15,
  yearsDuration: 0.4,
  pauseBeforeStamp: 0.35,
  stampDuration: 0.18,
  /** When the card starts to leave, counted from the start of the intro. */
  leaveAt: 3,
  leaveDuration: 0.4,
  /** The title's flight up into the case header, and the crossfade once it has landed. */
  dockDuration: 0.65,
  landDuration: 0.25,
} as const;

const TITLE_REDUCED = {
  start: 0.2,
  titleDuration: 0.5,
  yearsAt: 0.7,
  stampAt: 1.2,
  leaveAt: 2.8,
  leaveDuration: 0.4,
} as const;

/** What the title card shows. The page builds it from the case data. */
export interface TitleCard {
  title: string;
  /** e.g. "1872 – 1873". */
  years: string;
  /** Shows the UNSOLVED stamp. */
  unsolved: boolean;
}

interface LegendIntroProps {
  /** The myth, the stamp text and the debunk, from the case data. */
  legendIntro: LegendIntroData;
  /** Optional first beat: the case title, its years and the UNSOLVED stamp. Skip covers it too. */
  titleCard?: TitleCard;
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
  titleCard,
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
        const card = select('title-card');
        const title = select('title');
        const years = select('years');
        const unsolved = select('unsolved');
        const hasTitleCard = card.length > 0;
        // The case header is outside this component, fixed to the top of the page. Hidden until the title docks.
        const headerBar = document.querySelector<HTMLElement>('[data-case-header="bar"]');
        const headerTitle = document.querySelector<HTMLElement>('[data-case-header="title"]');
        const docks = hasTitleCard && headerBar !== null && headerTitle !== null;
        if (docks) {
          gsap.set(headerBar, { opacity: 0 });
        }

        const timeline = gsap.timeline({ defaults: { ease: EASE.out }, onComplete: markEnded });
        const splits: SplitText[] = [];

        if (reduced) {
          // 0. The title card: the title, the years and the stamp fade in, then the card fades away.
          let mythStart: number = REDUCED.start;
          if (hasTitleCard) {
            timeline.fromTo(title, { opacity: 0 }, { opacity: 1, duration: TITLE_REDUCED.titleDuration }, TITLE_REDUCED.start);
            timeline.fromTo(years, { opacity: 0 }, { opacity: 1, duration: 0.4 }, TITLE_REDUCED.yearsAt);
            timeline.fromTo(unsolved, { opacity: 0 }, { opacity: 1, duration: 0.2 }, TITLE_REDUCED.stampAt);
            timeline.to(card, { opacity: 0, duration: TITLE_REDUCED.leaveDuration }, TITLE_REDUCED.leaveAt);
            // No flight: the card fades away and the header fades in.
            if (docks) {
              timeline.to(headerBar, { opacity: 1, duration: TITLE_REDUCED.leaveDuration }, TITLE_REDUCED.leaveAt);
            }
            mythStart = TITLE_REDUCED.leaveAt + TITLE_REDUCED.leaveDuration + REDUCED.start;
          }

          // Whole lines fade in, one after another.
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
          const caret = select('caret')[0];
          const quill = createQuillWriter(select('quill')[0], select('quill-body')[0]);

          // 0. The title card: the quill writes the title, the years follow, the stamp lands,
          // and the card gives way to the myth.
          let cursor: number = FULL.start;
          if (hasTitleCard) {
            let at: number = TITLE.start;
            title.forEach(block => {
              const split = splitForQuill(block);
              splits.push(split);
              at += quill.write(timeline, split.chars as HTMLElement[], at);
            });
            at += TITLE.pauseBeforeYears;
            timeline.fromTo(years, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: TITLE.yearsDuration }, at);
            at += TITLE.yearsDuration + TITLE.pauseBeforeStamp;
            timeline.fromTo(
              unsolved,
              { opacity: 0, scale: 1.15 },
              { opacity: 1, scale: 1, duration: TITLE.stampDuration },
              at
            );
            // A long title is still given time to be read before the card leaves.
            const leaveAt = Math.max(TITLE.leaveAt, at + TITLE.stampDuration + 0.8);
            if (docks && title.length > 0) {
              // The title shrinks and flies up to where the header's title is. The years and the stamp stay behind
              // and fade. Once it has landed, the header fades in over it and the card goes: the two titles are
              // then the same size in the same place, so the swap cannot be seen.
              const big = title[0];
              const flight = () => {
                const from = big.getBoundingClientRect();
                const to = headerTitle.getBoundingClientRect();
                return { x: to.left - from.left, y: to.top - from.top, scale: from.width > 0 ? to.width / from.width : 1 };
              };
              timeline.to([...years, ...unsolved], { opacity: 0, duration: 0.25 }, leaveAt);
              timeline.to(
                big,
                {
                  x: () => flight().x,
                  y: () => flight().y,
                  scale: () => flight().scale,
                  duration: TITLE.dockDuration,
                  ease: EASE.inOut,
                },
                leaveAt
              );
              const landAt = leaveAt + TITLE.dockDuration;
              timeline.to(headerBar, { opacity: 1, duration: TITLE.landDuration }, landAt);
              timeline.to(card, { opacity: 0, duration: TITLE.landDuration }, landAt);
              cursor = landAt + TITLE.landDuration + 0.3;
            } else {
              timeline.to(card, { opacity: 0, duration: TITLE.leaveDuration }, leaveAt);
              cursor = leaveAt + TITLE.leaveDuration + FULL.start;
            }
          }

          // 1. The myth, written letter by letter.
          lines.forEach(line => {
            const split = splitForQuill(line);
            splits.push(split);
            const lineDuration = quill.write(timeline, split.chars as HTMLElement[], cursor);
            cursor += lineDuration + FULL.pauseBetweenLines;
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
    { scope: rootRef, dependencies: [legendIntro, titleCard?.title, titleCard?.years, titleCard?.unsolved, markEnded] }
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
          className="absolute top-[calc(var(--case-header)+0.25rem)] right-2 min-h-11 px-3 font-voice text-xs tracking-[0.14em] text-ghost-night/85 uppercase transition-[scale,color] duration-150 ease-out hover:text-night-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass active:scale-[0.97] sm:right-4"
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

        {/* The quill. Its point is moved to the letter being written. */}
        <Quill attribute="data-legend" />

        {/* The title card: the first beat. It lies over the empty page, then gives way to the myth: its title docks
            into the case header, which is the page's real heading, so the card itself is hidden from screen readers. */}
        {titleCard !== undefined && (
          <div
            data-legend="title-card"
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 sm:gap-4 ${ended ? 'opacity-0' : ''}`}
          >
            <p className="font-legend text-[clamp(2.75rem,1.6rem+5.6vw,6rem)] leading-none whitespace-nowrap text-night-ink">
              <span data-legend="title" className="inline-block origin-top-left">
                {titleCard.title}
              </span>
            </p>
            <p
              data-legend="years"
              className="font-voice text-[clamp(0.875rem,0.8rem+0.4vw,1.125rem)] tracking-[0.22em] text-ghost-night tabular-nums"
            >
              {titleCard.years}
            </p>
            {titleCard.unsolved && (
              <p
                data-legend="unsolved"
                className="mt-1 -rotate-3 rounded-[0.14em] border-[0.14em] border-rust-night px-[0.6em] pt-[0.45em] pb-[0.3em] font-voice text-[clamp(0.75rem,0.7rem+0.3vw,0.9375rem)] leading-none tracking-[0.2em] text-rust-night uppercase"
              >
                Unsolved
              </p>
            )}
          </div>
        )}

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

      {/* The scroll cue. GSAP animates this wrapper, not the button, so the button keeps its own press feedback. */}
      <div data-legend="continue" className="mt-6 sm:mt-10">
        <button
          ref={continueRef}
          type="button"
          onClick={onDone}
          className="group flex min-h-11 flex-col items-center gap-2 px-4 pt-2 pb-1 font-voice text-sm tracking-[0.14em] text-night-ink uppercase transition-[scale,color] duration-150 ease-out hover:text-brass focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brass active:scale-[0.97]"
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

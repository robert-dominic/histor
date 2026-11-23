// src/features/story/PlayChoice.tsx
// How to hear the story: a modal over a darkened screen, after the legend intro, each time the reader goes on from
// it into the story. The pen writes the case's title, one short line, then two big choices: "Play the story" or
// "Read at my pace". The reader must choose: the story does not start until they do, and Escape means "Read at my
// pace". The focus stays inside while it is open and goes back where it was afterwards.
// A small "Sound on" switch under the choices, ticked unless the sound was turned off before (polish brief, B1): the
// choice's click is the gesture that starts the sound.
// Reduced motion: it simply appears, with no writing and no movement.
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import Quill from '@/components/Quill';
import { MOTION_QUERIES, QUICK_OUT, tween } from '@/lib/motion';
import { createQuillWriter, splitForQuill } from '@/lib/quill-writing';
import { pauseSmoothScroll, resumeSmoothScroll } from '@/lib/smooth-scroll';
import { sound } from '@/lib/sound';
import { STORY_PACE } from '@/lib/story-pages';

gsap.registerPlugin(useGSAP);

export type PlayMode = 'play' | 'read';

interface PlayChoiceProps {
  /** The case's title, written by the pen. */
  title: string;
  onChoose: (mode: PlayMode) => void;
}

const CHOICE_CLASSES =
  'inline-flex min-h-14 min-w-[14rem] items-center justify-center rounded-sm px-8 font-voice text-base tracking-[0.14em] uppercase transition-[scale,background-color,color] duration-(--motion-hover-duration) ease-(--motion-hover-ease) focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brass active:scale-[0.97]';

export default function PlayChoice({ title, onChoose }: PlayChoiceProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const playRef = useRef<HTMLButtonElement>(null);
  const readRef = useRef<HTMLButtonElement>(null);
  const soundRef = useRef<HTMLInputElement>(null);
  const choosingRef = useRef(false);
  const [soundOn, setSoundOn] = useState(() => sound.enabled);

  // While it is open the page does not scroll: the story starts only once the reader has chosen. The focus goes
  // into it, and back where it was when it closes.
  useEffect(() => {
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const html = document.documentElement;
    const overflow = html.style.overflow;
    html.style.overflow = 'hidden';
    pauseSmoothScroll();
    playRef.current?.focus({ preventScroll: true });
    return () => {
      html.style.overflow = overflow;
      resumeSmoothScroll();
      before?.focus?.({ preventScroll: true });
    };
  }, []);

  useGSAP(
    () => {
      if (typeof window.matchMedia !== 'function') {
        return;
      }
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES, context => {
        if (context.conditions?.reduced === true) {
          return;
        }
        const timeline = gsap.timeline();
        timeline.fromTo('[data-choice="backdrop"]', { opacity: 0 }, { opacity: 1, ...tween('paper.lift') }, 0);
        timeline.fromTo(panelRef.current, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, ...tween('paper.lift') }, 0);
        const heading = rootRef.current?.querySelector<HTMLElement>('[data-choice="title"]');
        const point = rootRef.current?.querySelector<HTMLElement>('[data-choice="quill"]');
        const body = rootRef.current?.querySelector<HTMLElement>('[data-choice="quill-body"]');
        if (heading != null && point != null && body != null) {
          const split = splitForQuill(heading);
          const letters = split.chars as HTMLElement[];
          createQuillWriter(point, body).write(timeline, letters, tween('paper.lift').duration, letters.length / STORY_PACE.headingSeconds);
          return () => split.revert();
        }
      });
    },
    { scope: rootRef }
  );

  /** The choice is made: the modal leaves quickly, then the story starts. */
  const choose = (mode: PlayMode) => {
    if (choosingRef.current) {
      return;
    }
    choosingRef.current = true;
    // This click (or key) is the gesture that may start the sound.
    sound.setEnabled(soundOn);
    sound.unlock();
    const root = rootRef.current;
    if (root === null || typeof window.matchMedia !== 'function' || window.matchMedia(MOTION_QUERIES.reduced).matches) {
      onChoose(mode);
      return;
    }
    gsap.to(root, { opacity: 0, ...QUICK_OUT, onComplete: () => onChoose(mode) });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      choose('read');
      return;
    }
    if (event.key !== 'Tab') {
      return;
    }
    // The focus stays on the two choices and the sound switch.
    event.preventDefault();
    const stops = [playRef, readRef, soundRef].map(ref => ref.current).filter((element): element is HTMLButtonElement | HTMLInputElement => element !== null);
    const here = stops.indexOf(document.activeElement as HTMLButtonElement);
    stops[(here + (event.shiftKey ? stops.length - 1 : 1)) % stops.length]?.focus();
  };

  return (
    <div ref={rootRef} data-choice="root" className="fixed inset-0 z-[60] grid place-items-center px-4" onKeyDown={handleKeyDown}>
      <div aria-hidden="true" data-choice="backdrop" className="absolute inset-0 bg-night/88" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="play-choice-title"
        data-choice="panel"
        className="relative w-full max-w-2xl rounded-[2px] border border-night-ink/15 bg-night px-6 pt-10 pb-9 text-center text-night-ink shadow-2xl shadow-black/70 sm:px-12 sm:pt-12 sm:pb-11"
      >
        <h2 id="play-choice-title" className="font-legend text-[clamp(2.5rem,1.8rem+3vw,4.25rem)] leading-none">
          <span className="sr-only">{title}</span>
          <span aria-hidden="true" className="relative inline-block">
            <span data-choice="title">{title}</span>
            <Quill attribute="data-choice" sizeClassName="h-[clamp(2.5rem,4vw,3.5rem)]" />
          </span>
        </h2>
        <p className="mx-auto mt-5 max-w-[30rem] font-record text-[1.1875rem] leading-normal text-night-ink/90">
          The real story, as the record tells it. Let it play, or read it at your own pace.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button
            ref={playRef}
            type="button"
            data-story-control=""
            onClick={() => choose('play')}
            className={`${CHOICE_CLASSES} border border-brass bg-brass text-night hover:bg-transparent hover:text-brass`}
          >
            Play the story
          </button>
          <button
            ref={readRef}
            type="button"
            data-story-control=""
            onClick={() => choose('read')}
            className={`${CHOICE_CLASSES} border border-night-ink/40 text-night-ink hover:border-night-ink`}
          >
            Read at my pace
          </button>
        </div>
        <label data-choice="sound" className="mt-7 inline-flex cursor-pointer items-center gap-2.5 font-voice text-[0.8125rem] tracking-[0.12em] text-night-ink/80 uppercase">
          <input
            ref={soundRef}
            type="checkbox"
            role="switch"
            data-story-control=""
            checked={soundOn}
            onChange={event => setSoundOn(event.target.checked)}
            className="peer sr-only"
          />
          {/* The switch: a small track with a knob, brass when on. */}
          <span
            aria-hidden="true"
            className="relative h-4 w-7 rounded-full border border-night-ink/40 transition-colors duration-150 ease-out peer-checked:border-brass peer-checked:bg-brass/30 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brass after:absolute after:top-[2px] after:left-[2px] after:size-2.5 after:rounded-full after:bg-night-ink/70 after:transition-[translate,background-color] after:duration-150 after:ease-out peer-checked:after:translate-x-3 peer-checked:after:bg-brass"
          />
          Sound on
        </label>
      </div>
    </div>
  );
}

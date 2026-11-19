// src/features/story/StoryStart.tsx
// The start of the story: a first-use hint in the app's voice, and the choice to let the story play itself or
// read at one's own pace. The hint goes after the reader's first scroll.
// Under reduced motion there is nothing to play, so the hint only says to scroll.

import { useEffect, useRef, useState } from 'react';
import type { StoryPlayer } from '@/features/story/use-story-player';

const TONE_CLASSES =
  'text-ink group-data-[tone=black]/sky:text-black group-data-[tone=white]/sky:text-white group-data-[tone=night-ink]/sky:text-night-ink';

const CHOICE_CLASSES =
  'inline-flex min-h-11 items-center justify-center rounded-sm px-6 font-voice text-sm tracking-[0.14em] uppercase transition-[scale,background-color,color,border-color] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brass active:scale-[0.97]';

/** Keys that scroll the page. */
const SCROLL_KEYS = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Home', 'End']);

interface StoryStartProps {
  /** Null under reduced motion: no play option. */
  player: StoryPlayer | null;
  /** "Read at my pace": goes to the first scene. */
  onRead: () => void;
}

export default function StoryStart({ player, onRead }: StoryStartProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [hintGone, setHintGone] = useState(false);

  // The hint goes after the first scroll the reader makes once the start is on screen. The scroll that brought
  // them here (the intro's scroll cue) does not count.
  useEffect(() => {
    const root = rootRef.current;
    if (hintGone || root === null || typeof IntersectionObserver !== 'function') {
      return;
    }
    const dismiss = () => setHintGone(true);
    const onKey = (event: KeyboardEvent) => SCROLL_KEYS.has(event.key) && dismiss();
    const listen = () => {
      window.addEventListener('wheel', dismiss, { passive: true });
      window.addEventListener('touchmove', dismiss, { passive: true });
      window.addEventListener('keydown', onKey);
    };
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          listen();
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(root);
    return () => {
      observer.disconnect();
      window.removeEventListener('wheel', dismiss);
      window.removeEventListener('touchmove', dismiss);
      window.removeEventListener('keydown', onKey);
    };
  }, [hintGone]);

  return (
    <div
      ref={rootRef}
      data-story="start"
      className={`flex min-h-[80svh] flex-col items-center justify-center gap-8 bg-[var(--story-sky)] px-6 pt-[calc(var(--case-header)+2rem)] pb-12 text-center ${TONE_CLASSES}`}
    >
      <p
        data-story="hint"
        data-gone={hintGone}
        aria-hidden={hintGone}
        className="font-voice text-[0.9375rem] tracking-[0.04em] transition-opacity duration-300 ease-out data-[gone=true]:opacity-0"
      >
        {player === null ? 'Scroll to read.' : 'Scroll, or press play.'}
      </p>
      {player !== null && (
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
          <button
            type="button"
            data-story-control=""
            onClick={() => {
              setHintGone(true);
              player.play();
            }}
            className={`${CHOICE_CLASSES} border border-current hover:bg-ink hover:text-paper group-data-[tone=night-ink]/sky:hover:bg-night-ink group-data-[tone=night-ink]/sky:hover:text-night`}
          >
            Play the story
          </button>
          <button
            type="button"
            data-story-control=""
            onClick={() => {
              setHintGone(true);
              onRead();
            }}
            className={`${CHOICE_CLASSES} underline underline-offset-4 opacity-85 hover:opacity-100`}
          >
            Read at my pace
          </button>
        </div>
      )}
    </div>
  );
}

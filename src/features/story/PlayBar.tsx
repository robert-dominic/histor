// src/features/story/PlayBar.tsx
// The autoplay bar (music brief, 5), the story's one play control: a clear bar at the bottom centre, shown while the
// story is on screen (Story.tsx sets `data-visible`, and moves its progress line, the whole story's, through GSAP).
// Playing: "▶ Playing — click or press Space to pause". Paused: "❚❚ Paused — press Space to continue". A click on it,
// or Space, plays and pauses (Space not while a modal or a text field has the focus, nor on another button, which
// Space presses). It fades to faint after a few seconds without the mouse moving, and comes back as soon as it moves.
// Under 768px it is a small round play/pause icon at the side of the screen (below the image's ⓘ), never over the
// text: the words and the progress line are a laptop's.

import { useEffect, useState } from 'react';
import type { StoryPlayer } from '@/features/story/use-step-player';

/** How long without the mouse moving before the bar goes faint, in ms. */
const IDLE_AFTER_MS = 3000;

/** True when Space belongs to something else: a text field, a button or link (Space presses it), or a modal. */
function spaceIsTaken(target: EventTarget | null): boolean {
  if (document.querySelector('[role="dialog"][aria-modal="true"]') !== null) {
    return true;
  }
  const element = target instanceof Element ? target : null;
  if (element === null) {
    return false;
  }
  if (element.closest('[data-story="play-control"]') !== null) {
    // The bar itself: Space presses it, which toggles.
    return true;
  }
  return element.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], button, a[href], [role="button"]') !== null;
}

export default function PlayBar({ player }: { player: StoryPlayer }) {
  const [idle, setIdle] = useState(false);
  const { toggle, playing } = player;

  // Faint after a while without the mouse moving; back at once when it moves (or the state changes).
  useEffect(() => {
    let timer = window.setTimeout(() => setIdle(true), IDLE_AFTER_MS);
    const wake = () => {
      setIdle(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), IDLE_AFTER_MS);
    };
    window.addEventListener('pointermove', wake, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointermove', wake);
    };
  }, [playing]);

  // Space plays and pauses, once the story is on screen.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== ' ' || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || spaceIsTaken(event.target)) {
        return;
      }
      const bar = document.querySelector<HTMLElement>('[data-story="play-control"]');
      if (bar?.dataset.visible !== 'true') {
        return;
      }
      event.preventDefault();
      setIdle(false);
      toggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);

  return (
    <button
      type="button"
      data-story-control=""
      data-story="play-control"
      data-visible="false"
      data-idle={String(idle)}
      aria-label={playing ? 'Pause the story' : 'Play the story'}
      aria-pressed={playing}
      onClick={toggle}
      // Phones (under 768px): a small round play/pause at the side, below the image's ⓘ, never over the text.
      className="max-md:grid max-md:size-10 max-md:place-items-center max-md:rounded-full max-md:p-0! max-md:top-[calc(var(--case-header)+3.25rem)] max-md:right-3 max-md:bottom-auto! max-md:left-auto! max-md:translate-x-0! fixed bottom-[max(0.875rem,env(safe-area-inset-bottom))] left-1/2 z-30 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 overflow-hidden rounded-sm border border-night-ink/25 bg-night/85 px-4 pt-2.5 pb-3 text-night-ink shadow-lg shadow-black/40 backdrop-blur-sm transition-[opacity,visibility,color,border-color] duration-500 ease-out hover:border-night-ink/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass data-[idle=true]:opacity-30 data-[idle=true]:hover:opacity-100 data-[visible=false]:invisible data-[visible=false]:opacity-0 sm:bottom-5"
    >
      <span data-story="play-state" className="flex items-center gap-2.5 max-md:gap-0 font-voice text-[0.75rem] tracking-[0.08em] whitespace-nowrap sm:text-[0.8125rem]">
        <span aria-hidden="true" className="w-3 text-center text-brass">
          {playing ? '▶' : '❚❚'}
        </span>
        <span data-story="play-words" className="max-md:hidden">
          {playing ? 'Playing — click or press Space to pause' : 'Paused — press Space to continue'}
        </span>
      </span>
      {/* The whole story's progress: a thin line along the bottom, moved by Story.tsx (not on the phone's small button). */}
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[2px] bg-night-ink/10 max-md:hidden">
        <span data-story="play-progress" className="block h-full origin-left scale-x-0 bg-brass/80" />
      </span>
    </button>
  );
}

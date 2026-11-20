// src/features/story/use-story-player.ts
// "Play the story": scrolls the page by itself at reading pace, down to the fork, and stops there.
// The story's timeline is laid out so that one second of it takes `pxPerSecond()` pixels of scroll, so a steady
// scroll at that speed shows every beat for as long as its reading time.
// Any wheel, touch, key or scrollbar input pauses it at once. Nothing about the scroll is kept in React state.

import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { LINEAR } from '@/lib/motion';

gsap.registerPlugin(ScrollToPlugin);

/** Pixels of scroll for one second of the story's timeline. Proportional to the screen, within limits. */
export function pxPerSecond(): number {
  const height = typeof window === 'undefined' ? 800 : window.innerHeight;
  return Math.min(140, Math.max(80, height * 0.15));
}

/** Where playing stops: the fork, just below the case header, or else the end of the page. */
function stopAt(): number {
  const fork = document.querySelector<HTMLElement>('[data-fork="root"]');
  const header = document.querySelector<HTMLElement>('[data-case-header="bar"]')?.offsetHeight ?? 0;
  const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  if (fork === null) {
    return max;
  }
  return Math.min(max, Math.max(0, fork.getBoundingClientRect().top + window.scrollY - header));
}

/** Keys that scroll the page, or that a reader presses to take over. Tab and modifier keys do not pause. */
function isTakeOverKey(event: KeyboardEvent): boolean {
  return !['Tab', 'Shift', 'Control', 'Alt', 'Meta'].includes(event.key);
}

export interface StoryPlayer {
  playing: boolean;
  play: () => void;
  pause: () => void;
  toggle: () => void;
}

/** @param enabled - false under reduced motion: there is then nothing to play. */
export function useStoryPlayer(enabled: boolean): StoryPlayer {
  const [playing, setPlaying] = useState(false);
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  const pause = useCallback(() => {
    tweenRef.current?.kill();
    tweenRef.current = null;
    setPlaying(false);
  }, []);

  const play = useCallback(() => {
    if (!enabled) {
      return;
    }
    const from = window.scrollY;
    const to = stopAt();
    tweenRef.current?.kill();
    if (to - from < 2) {
      tweenRef.current = null;
      setPlaying(false);
      return;
    }
    tweenRef.current = gsap.to(window, {
      // autoKill: a scroll that did not come from this tween (the scrollbar, say) stops it.
      scrollTo: { y: to, autoKill: true, onAutoKill: pause },
      duration: (to - from) / pxPerSecond(),
      ease: LINEAR,
      onComplete: () => {
        tweenRef.current = null;
        setPlaying(false);
      },
    });
    setPlaying(true);
  }, [enabled, pause]);

  const toggle = useCallback(() => (tweenRef.current === null ? play() : pause()), [play, pause]);

  // While playing, the reader's own input takes over at once.
  useEffect(() => {
    if (!playing) {
      return;
    }
    // A press on the controls themselves is theirs to handle.
    const onControl = (target: EventTarget | null) =>
      target instanceof Element && target.closest('[data-story-control]') !== null;
    const stop = (event: Event) => {
      if (!onControl(event.target)) {
        pause();
      }
    };
    const stopOnKey = (event: KeyboardEvent) => {
      if (isTakeOverKey(event) && !onControl(event.target)) {
        pause();
      }
    };
    // A press in the scrollbar gutter: to the right of the page's own width.
    const stopOnScrollbar = (event: PointerEvent) => {
      if (event.clientX >= document.documentElement.clientWidth) {
        pause();
      }
    };
    const options = { passive: true, capture: true } as const;
    window.addEventListener('wheel', stop, options);
    window.addEventListener('touchstart', stop, options);
    window.addEventListener('keydown', stopOnKey, true);
    window.addEventListener('pointerdown', stopOnScrollbar, options);
    return () => {
      window.removeEventListener('wheel', stop, options);
      window.removeEventListener('touchstart', stop, options);
      window.removeEventListener('keydown', stopOnKey, true);
      window.removeEventListener('pointerdown', stopOnScrollbar, options);
    };
  }, [playing, pause]);

  // Leaving the page stops it.
  useEffect(
    () => () => {
      tweenRef.current?.kill();
    },
    []
  );

  return { playing, play, pause, toggle };
}

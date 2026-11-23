// src/features/story/use-story-player.ts
// "Play the story": scrolls the page by itself, stop by stop. The story gives it a plan (`PlayStep[]`): scroll to
// each chapter's page at the story's own pace (one second of its timeline takes `pxPerSecond()` pixels, so the hooks
// between pages pass at their own time), wait there until the pen has written the page, give the reader time to
// read it, then move on; at the end, the central question, a hold, and the fork.
// Without a plan it scrolls at that pace down to the fork. Any wheel, touch, key or scrollbar input pauses it at
// once. Nothing about the scroll is kept in React state.

import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { LINEAR } from '@/lib/motion';
import { pauseSmoothScroll, resumeSmoothScroll } from '@/lib/smooth-scroll';
import { STORY_PACE } from '@/lib/story-pages';

gsap.registerPlugin(ScrollToPlugin);

/** Pixels of scroll for one second of the story's timeline. Proportional to the screen, within limits (STORY_PACE). */
export function pxPerSecond(): number {
  const height = typeof window === 'undefined' ? 800 : window.innerHeight;
  const { share, min, max } = STORY_PACE.pxPerSecond;
  return Math.min(max, Math.max(min, height * share));
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

/** One stop of "Play the story". */
export interface PlayStep {
  /** Where to scroll to, in px from the top of the page. */
  y: number;
  /** Something to wait for once there (the pen finishing a page). */
  waitFor?: () => Promise<void>;
  /** Seconds to hold once there, after `waitFor`. */
  hold?: number;
  /** Called once there, after the hold (opening the fork). */
  then?: () => void;
}

export interface StoryPlayer {
  playing: boolean;
  play: () => void;
  pause: () => void;
  toggle: () => void;
}

/**
 * @param enabled - false under reduced motion: there is then nothing to play.
 * @param plan - the stops to play through, worked out when play is pressed; without it, one stop at the fork.
 */
export function useStoryPlayer(enabled: boolean, plan?: () => PlayStep[]): StoryPlayer {
  const [playing, setPlaying] = useState(false);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  /** Changes with every play and pause: a run whose number is old stops at its next step. */
  const runRef = useRef(0);
  /** True while a run is under way, scrolling or waiting at a stop. */
  const runningRef = useRef(false);
  const planRef = useRef(plan);
  useEffect(() => {
    planRef.current = plan;
  });

  const pause = useCallback(() => {
    runRef.current += 1;
    runningRef.current = false;
    tweenRef.current?.kill();
    tweenRef.current = null;
    resumeSmoothScroll();
    setPlaying(false);
  }, []);

  const play = useCallback(() => {
    if (!enabled) {
      return;
    }
    const planned: PlayStep[] = (planRef.current?.() ?? []).filter(step => Number.isFinite(step.y));
    const steps: PlayStep[] = planned.length > 0 ? planned : [{ y: stopAt() }];
    // The stops still ahead: those below the page's place now (a stop just here still waits for its page).
    const ahead = steps.filter(step => step.y >= window.scrollY - 1);
    const moves = ahead.some(step => step.y - window.scrollY >= 2);
    const waits = ahead.some(step => step.waitFor !== undefined || (step.hold ?? 0) > 0 || step.then !== undefined);
    if (!moves && !waits) {
      setPlaying(false);
      return;
    }
    const run = ++runRef.current;
    runningRef.current = true;
    const live = () => runRef.current === run;
    // Smooth scrolling steps aside while the story scrolls itself; the reader's first input gives it back.
    pauseSmoothScroll();
    setPlaying(true);
    const scrollTo = (y: number) =>
      new Promise<void>(resolve => {
        const from = window.scrollY;
        if (y - from < 2) {
          resolve();
          return;
        }
        tweenRef.current = gsap.to(window, {
          // autoKill: a scroll that did not come from this tween (the scrollbar, say) stops it.
          scrollTo: { y, autoKill: true, onAutoKill: pause },
          duration: (y - from) / pxPerSecond(),
          ease: LINEAR,
          onComplete: () => {
            tweenRef.current = null;
            resolve();
          },
        });
      });
    const hold = (seconds: number) => new Promise<void>(resolve => gsap.delayedCall(seconds, resolve));
    void (async () => {
      for (const step of ahead) {
        await scrollTo(step.y);
        if (!live()) {
          return;
        }
        if (step.waitFor !== undefined) {
          await step.waitFor();
          if (!live()) {
            return;
          }
        }
        if (step.hold !== undefined && step.hold > 0) {
          await hold(step.hold);
          if (!live()) {
            return;
          }
        }
        step.then?.();
      }
      if (live()) {
        runningRef.current = false;
        resumeSmoothScroll();
        setPlaying(false);
      }
    })();
  }, [enabled, pause]);

  const toggle = useCallback(() => (runningRef.current ? pause() : play()), [play, pause]);

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
      resumeSmoothScroll();
    },
    []
  );

  return { playing, play, pause, toggle };
}

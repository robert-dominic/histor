// src/features/story/use-step-player.ts
// "Play the story", in steps: it waits for the step on screen to be ready (the pen to finish a page), holds it for
// its time (STORY_PACE), then moves one step on, until the fork. Any wheel, touch, pointer or key input pauses it at
// once; the floating control plays and pauses it. Nothing about the story's place is kept in React state.

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import gsap from 'gsap';
import { unlockedSoundWith } from '@/lib/sound';

/** What the player drives: the story's steps (Story.tsx). */
export interface StepDriver {
  /** Waits until the step on screen is ready, then says how long to hold it, in seconds; null at the end. */
  ready: () => Promise<number | null>;
  /** Moves one step on; resolves once that step's animation is done. False when there is nowhere to go. */
  next: () => Promise<boolean>;
}

export interface StoryPlayer {
  playing: boolean;
  play: () => void;
  pause: () => void;
  toggle: () => void;
}

/** Keys a reader presses to take over. Tab and modifier keys on their own do not pause; Space is the play bar's own. */
function isTakeOverKey(event: KeyboardEvent): boolean {
  return !['Tab', 'Shift', 'Control', 'Alt', 'Meta', ' '].includes(event.key);
}

/**
 * @param enabled - false under reduced motion: there is then nothing to play.
 * @param driver - the story's steps, once they are built.
 */
export function useStepPlayer(enabled: boolean, driver: RefObject<StepDriver | null>): StoryPlayer {
  const [playing, setPlaying] = useState(false);
  /** Changes with every play and pause: a run whose number is old stops at its next step. */
  const runRef = useRef(0);
  const runningRef = useRef(false);
  const holdRef = useRef<gsap.core.Tween | null>(null);

  const pause = useCallback(() => {
    runRef.current += 1;
    runningRef.current = false;
    holdRef.current?.kill();
    holdRef.current = null;
    setPlaying(false);
  }, []);

  const play = useCallback(() => {
    const steps = driver.current;
    if (!enabled || steps === null) {
      return;
    }
    const run = ++runRef.current;
    const live = () => runRef.current === run;
    runningRef.current = true;
    setPlaying(true);
    const hold = (seconds: number) =>
      new Promise<void>(resolve => {
        holdRef.current = gsap.delayedCall(seconds, resolve);
      });
    void (async () => {
      for (;;) {
        const seconds = await steps.ready();
        if (!live() || seconds === null) {
          break;
        }
        await hold(seconds);
        if (!live() || !(await steps.next()) || !live()) {
          break;
        }
      }
      if (live()) {
        runningRef.current = false;
        setPlaying(false);
      }
    })();
  }, [enabled, driver]);

  const toggle = useCallback(() => (runningRef.current ? pause() : play()), [play, pause]);

  // While playing, the reader's own input takes over at once.
  useEffect(() => {
    if (!playing) {
      return;
    }
    // A press on the controls themselves is theirs to handle.
    const onControl = (target: EventTarget | null) =>
      target instanceof Element && target.closest('[data-story-control]') !== null;
    // The click or key that unlocks the sound is for the sound, not a take-over: the story plays on, now heard
    // (two fixes, 2). The same gesture's other events (a touch's touchstart after its pointerdown) count too.
    const forSound = (event: Event) => unlockedSoundWith(event);
    const stop = (event: Event) => {
      if (!onControl(event.target) && !forSound(event)) {
        pause();
      }
    };
    const stopOnKey = (event: KeyboardEvent) => {
      if (isTakeOverKey(event) && !onControl(event.target) && !forSound(event)) {
        pause();
      }
    };
    const options = { passive: true, capture: true } as const;
    window.addEventListener('wheel', stop, options);
    window.addEventListener('touchstart', stop, options);
    window.addEventListener('pointerdown', stop, options);
    window.addEventListener('keydown', stopOnKey, true);
    return () => {
      window.removeEventListener('wheel', stop, options);
      window.removeEventListener('touchstart', stop, options);
      window.removeEventListener('pointerdown', stop, options);
      window.removeEventListener('keydown', stopOnKey, true);
    };
  }, [playing, pause]);

  // Leaving the page stops it.
  useEffect(
    () => () => {
      runRef.current += 1;
      holdRef.current?.kill();
    },
    []
  );

  return { playing, play, pause, toggle };
}

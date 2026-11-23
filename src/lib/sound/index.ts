// src/lib/sound/index.ts
// The app's sound: one engine, listening to the story's and the desk's events (story-events.ts) and answering them
// from the table (sound-map.ts). Started once by the app (startSound). Nothing sounds before the first gesture, or
// while the player has turned the sound off; it fades out while the tab is hidden.

import { useSyncExternalStore } from 'react';
import { Ambience } from '@/lib/sound/ambience';
import { SoundEngine } from '@/lib/sound/engine';
import { SOUND } from '@/lib/sound/levels';
import { freshMemory, soundFor, type SoundCue, type SoundRow } from '@/lib/sound/sound-map';
import { VOICES, vary, type Voice } from '@/lib/sound/voices';
import { onStoryEvent, type StoryEvent } from '@/lib/story-events';
import type { AmbienceLayer } from '@/types/case';

/** The one engine. */
export const sound = new SoundEngine();

/** Plays one cue on the effects bus, if a voice is free. */
export function playCue(engine: SoundEngine, cue: SoundCue): void {
  const ctx = engine.context;
  const out = engine.bus('effects');
  const voice = (VOICES as Record<string, Voice | undefined>)[cue.sound];
  if (ctx === null || out === null || voice === undefined || !engine.voice(voice.seconds + (cue.delay ?? 0))) {
    return;
  }
  voice.play(ctx, out, { at: ctx.currentTime + 0.005 + (cue.delay ?? 0), gain: cue.gain ?? 1, pitch: (cue.pitch ?? 1) * vary(0.015) });
}

/** Does what a row says. */
export function playRow(engine: SoundEngine, row: SoundRow): void {
  if (row.duck !== undefined) {
    engine.duck(row.duck);
  }
  row.cues?.forEach(cue => playCue(engine, cue));
}

/**
 * Connects the engine to the page: the first gesture starts it, the tab's visibility fades it, and every event is
 * answered from the table. Returns a function that disconnects it all.
 */
export function startSound(engine: SoundEngine = sound): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }
  const memory = freshMemory();
  // The ambience: the layers of the place the player is in, started once the sound is, stopped once it is off (after
  // the master has faded, so nothing clicks).
  const ambience = new Ambience();
  const ambienceBus = () => engine.bus('ambience');
  let stopTimer: ReturnType<typeof setTimeout> | null = null;
  // "Away" waits a moment: going from one page of a case to another sends "away" then the new place at once, and the
  // layers both share should play on unbroken.
  let awayTimer: ReturnType<typeof setTimeout> | null = null;
  const stopStart = engine.onStart(ctx => {
    if (stopTimer !== null) {
      clearTimeout(stopTimer);
      stopTimer = null;
    }
    ambience.restart(ctx, ambienceBus());
  });
  const stopChange = engine.subscribe(() => {
    if (!engine.running && stopTimer === null) {
      stopTimer = setTimeout(() => {
        stopTimer = null;
        if (!engine.running) {
          ambience.stopAll();
        }
      }, (SOUND.toggleFade + 0.1) * 1000);
    }
  });
  const place = (event: Extract<StoryEvent, { type: 'place' }>) => {
    if (awayTimer !== null) {
      clearTimeout(awayTimer);
      awayTimer = null;
    }
    const layers: readonly AmbienceLayer[] = event.place === 'away' ? [] : (event.ambience?.[event.place] ?? []);
    const apply = () => {
      if (event.place === 'desk') {
        ambience.setDarkness(null, 0);
      }
      ambience.set(engine.context, ambienceBus(), layers);
    };
    if (event.place === 'away') {
      awayTimer = setTimeout(apply, 50);
    } else {
      apply();
    }
  };
  const gesture = () => engine.unlock();
  const visibility = () => engine.setHidden(document.visibilityState === 'hidden');
  const options = { capture: true, passive: true } as const;
  window.addEventListener('pointerdown', gesture, options);
  window.addEventListener('keydown', gesture, options);
  document.addEventListener('visibilitychange', visibility);
  const stop = onStoryEvent(event => {
    // Where the player is, and how dark the story is, are kept even before the sound starts.
    if (event.type === 'place') {
      place(event);
      return;
    }
    if (event.type === 'chapter-enter' && event.depth !== undefined) {
      ambience.setDarkness(engine.context, event.depth);
    }
    if (!engine.running) {
      return;
    }
    const row = soundFor(event, memory);
    if (row !== null) {
      playRow(engine, row);
    }
  });
  return () => {
    window.removeEventListener('pointerdown', gesture, options);
    window.removeEventListener('keydown', gesture, options);
    document.removeEventListener('visibilitychange', visibility);
    stop();
    stopStart();
    stopChange();
    [stopTimer, awayTimer].forEach(timer => timer !== null && clearTimeout(timer));
    ambience.stopAll();
  };
}

/** For the sound toggle: whether the sound is on, and a way to turn it on or off (from a gesture). */
export function useSound(engine: SoundEngine = sound): { enabled: boolean; setEnabled: (on: boolean) => void } {
  const enabled = useSyncExternalStore(
    listener => engine.subscribe(listener),
    () => engine.enabled,
    () => engine.enabled
  );
  return { enabled, setEnabled: on => engine.setEnabled(on) };
}

// src/lib/sound/index.ts
// The app's sound: one engine, listening to the story's and the desk's events (story-events.ts) and answering them
// from the table (sound-map.ts). Started once by the app (startSound). Nothing sounds before the first gesture, or
// while the player has turned the sound off; it fades out while the tab is hidden.

import { useSyncExternalStore } from 'react';
import { SoundEngine } from '@/lib/sound/engine';
import { freshMemory, soundFor, type SoundCue, type SoundRow } from '@/lib/sound/sound-map';
import { VOICES, vary, type Voice } from '@/lib/sound/voices';
import { onStoryEvent } from '@/lib/story-events';

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
  const gesture = () => engine.unlock();
  const visibility = () => engine.setHidden(document.visibilityState === 'hidden');
  const options = { capture: true, passive: true } as const;
  window.addEventListener('pointerdown', gesture, options);
  window.addEventListener('keydown', gesture, options);
  document.addEventListener('visibilitychange', visibility);
  const stop = onStoryEvent(event => {
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

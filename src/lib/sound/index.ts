// src/lib/sound/index.ts
// The app's sound: one engine, listening to the story's and the desk's events (story-events.ts) and answering them
// from the table (sound-map.ts). Started once by the app (startSound). Nothing sounds before the first gesture; the
// music and the effects each follow their own control; everything fades out while the tab is hidden.

import { useSyncExternalStore } from 'react';
import { Ambience } from '@/lib/sound/ambience';
import { SoundEngine, type Channel } from '@/lib/sound/engine';
import { Narrator } from '@/lib/sound/narration';
import { MOTION_QUERIES } from '@/lib/motion';
import { SOUND } from '@/lib/sound/levels';
import { Score } from '@/lib/sound/score';
import { freshMemory, soundFor, type SoundCue, type SoundRow } from '@/lib/sound/sound-map';
import { VOICES, drone, vary, type Voice } from '@/lib/sound/voices';
import { onStoryEvent, type StoryEvent } from '@/lib/story-events';
import type { AmbienceLayer } from '@/types/case';

/** The one engine. */
export const sound = new SoundEngine();

/** The one narrator: a chapter or the question read aloud (narration.ts). */
export const narrator = new Narrator(sound);

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

/** The hook's drone, while it plays: how to fade it out. */
let stopDrone: ((release: number) => void) | null = null;

/** Does what a row says. */
export function playRow(engine: SoundEngine, row: SoundRow): void {
  if (row.duck !== undefined) {
    engine.duck(row.duck);
  }
  if (row.drone === 'out' && stopDrone !== null) {
    stopDrone(SOUND.drone.release);
    stopDrone = null;
  }
  if ((row.drone === 'in' || row.drone === 'low') && stopDrone === null) {
    const ctx = engine.context;
    const out = engine.bus('effects');
    if (ctx !== null && out !== null) {
      stopDrone = drone(ctx, out, row.drone === 'in' ? SOUND.drone.level : SOUND.drone.low);
    }
  }
  row.cues?.forEach(cue => playCue(engine, cue));
}

/** Silences the drone at once, faded (the sound is off, or the place has changed). */
function dropDrone(): void {
  stopDrone?.(SOUND.toggleFade);
  stopDrone = null;
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
  // The score: its mood follows the story, the desk, the hooks and the question.
  const score = new Score();
  const scoreBus = () => engine.bus('score');
  let stopTimer: ReturnType<typeof setTimeout> | null = null;
  // "Away" waits a moment: going from one page of a case to another sends "away" then the new place at once, and the
  // layers both share should play on unbroken.
  let awayTimer: ReturnType<typeof setTimeout> | null = null;
  const stopStart = engine.onStart((ctx, channel) => {
    if (channel === 'effects') {
      return;
    }
    if (stopTimer !== null) {
      clearTimeout(stopTimer);
      stopTimer = null;
    }
    ambience.restart(ctx, ambienceBus());
    score.restart(ctx, scoreBus());
  });
  const stopChange = engine.subscribe(() => {
    // The effects off: the drone goes (faded) at once.
    if (!engine.playing('effects')) {
      dropDrone();
    }
    // The music off: its generated layers stop once its gate has faded, so nothing clicks.
    if (!engine.playing('music') && stopTimer === null) {
      stopTimer = setTimeout(() => {
        stopTimer = null;
        if (!engine.playing('music')) {
          ambience.stopAll();
          score.stop();
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
    if (event.place === 'story') {
      // Each visit to the story plays its cues once.
      memory.cues = event.ambience?.cues ?? [];
      memory.played = new Set();
    }
    const apply = () => {
      if (event.place === 'desk') {
        ambience.setDarkness(null, 0);
      }
      ambience.set(engine.context, ambienceBus(), layers);
      score.set(engine.context, scoreBus(), event.place);
    };
    if (event.place !== 'story') {
      dropDrone();
    }
    if (event.place === 'away') {
      awayTimer = setTimeout(apply, 50);
    } else {
      apply();
    }
  };
  // Any first gesture starts the sound; under reduced motion nothing starts by itself (polish brief, B6): only the
  // player's own choice does (the header's toggle, or the play modal's "Sound on").
  const gesture = () => {
    if (typeof window.matchMedia === 'function' && window.matchMedia(MOTION_QUERIES.reduced).matches) {
      return;
    }
    engine.unlock();
  };
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
    if (event.type === 'chapter-enter') {
      if (event.depth !== undefined) {
        ambience.setDarkness(engine.context, event.depth);
      }
      score.set(engine.context, scoreBus(), 'story', event.depth);
    }
    if (event.type === 'hook') {
      score.set(engine.context, scoreBus(), 'hook');
    }
    if (event.type === 'question-line') {
      score.set(engine.context, scoreBus(), 'question');
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
    score.stop();
  };
}

/** For a sound control: whether its channel is on, its volume, and ways to change them (from a gesture). */
export function useSoundChannel(
  channel: Channel,
  engine: SoundEngine = sound
): { on: boolean; volume: number; setOn: (on: boolean) => void; setVolume: (volume: number) => void } {
  const on = useSyncExternalStore(
    listener => engine.subscribe(listener),
    () => engine.isOn(channel),
    () => engine.isOn(channel)
  );
  const volume = useSyncExternalStore(
    listener => engine.subscribe(listener),
    () => engine.volume(channel),
    () => engine.volume(channel)
  );
  return {
    on,
    volume,
    // On but not started yet (reduced motion waits for a choice): pressing it starts the sound rather than muting it.
    setOn: next => {
      if (!next && engine.isOn(channel) && !engine.running && engine.unlock()) {
        return;
      }
      engine.setOn(channel, next);
    },
    setVolume: next => engine.setVolume(channel, next),
  };
}

// src/lib/sound/index.ts
// The app's sound: one engine, listening to the story's and the desk's events (story-events.ts) and answering them
// from the table (sound-map.ts). Started once by the app (startSound). Nothing sounds before the first gesture; the
// music and the effects each follow their own control; everything fades out while the tab is hidden.

import { useSyncExternalStore } from 'react';
import { Ambience } from '@/lib/sound/ambience';
import { SoundEngine, type Channel } from '@/lib/sound/engine';
import { Narrator } from '@/lib/sound/narration';
import { MOTION_QUERIES } from '@/lib/motion';
import { AMBIENCE_ENABLED, SOUND } from '@/lib/sound/levels';
import { MusicPlayer } from '@/lib/sound/music';
import { isSample, playSample, samples } from '@/lib/sound/samples';
import { Score } from '@/lib/sound/score';
import { freshMemory, soundFor, type SoundCue, type SoundRow } from '@/lib/sound/sound-map';
import { VOICES, drone, vary, type Voice } from '@/lib/sound/voices';
import { emitStoryEvent, lastPlaceEvent, onStoryEvent, type StoryEvent } from '@/lib/story-events';
import type { AmbienceLayer } from '@/types/case';

/** The one engine. */
export const sound = new SoundEngine();

/** The one narrator: a chapter or the question read aloud (narration.ts). */
export const narrator = new Narrator(sound);

/** Plays one cue on the effects bus, if a voice is free: a sound file, or a generated recipe. */
export function playCue(engine: SoundEngine, cue: SoundCue): void {
  if (isSample(cue.sound)) {
    playSample(engine, { ...cue, sound: cue.sound });
    return;
  }
  const ctx = engine.context;
  const out = engine.bus('effects');
  const voice = (VOICES as Record<string, Voice | undefined>)[cue.sound];
  if (ctx === null || out === null || voice === undefined || !engine.voice(voice.seconds + (cue.delay ?? 0))) {
    return;
  }
  voice.play(ctx, out, { at: ctx.currentTime + 0.005 + (cue.delay ?? 0), gain: cue.gain ?? 1, pitch: (cue.pitch ?? 1) * vary(0.015) });
}

/** The music player of the running app (for the dev page and tests). */
let musicNow: MusicPlayer | null = null;
export function currentMusic(): MusicPlayer | null {
  return musicNow;
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
export function startSound(engine: SoundEngine = sound, setup: { createAudio?: (src: string) => HTMLAudioElement | null; generated?: boolean } = {}): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }
  const memory = freshMemory();
  // The generated ambience and score play only when brought back (AMBIENCE_ENABLED; tests pass `generated`).
  const generated = setup.generated ?? AMBIENCE_ENABLED;
  // The music: the place's playlist, streamed (music.ts). It pauses where it is when turned off, and resumes there.
  const music = new MusicPlayer(engine, setup.createAudio);
  musicNow = music;
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
    // The sound files load once the sound has started (sound-files brief, 2).
    void samples.load(ctx);
    if (channel === 'effects') {
      return;
    }
    if (stopTimer !== null) {
      clearTimeout(stopTimer);
      stopTimer = null;
    }
    if (engine.playing('music')) {
      music.resume();
    }
    if (generated) {
      ambience.restart(ctx, ambienceBus());
      score.restart(ctx, scoreBus());
    }
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
          music.pause();
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
      music.setPlace(event.place, event.playlists);
      if (generated) {
        ambience.set(engine.context, ambienceBus(), layers);
        score.set(engine.context, scoreBus(), event.place);
      }
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
  // The tab hidden: everything fades, then the music pauses where it is; shown again, it carries on.
  let hiddenTimer: ReturnType<typeof setTimeout> | null = null;
  // The interface's sounds (music brief, 4): one listener for every button and link, so no component has to ask.
  // A toggle (a switch, a checkbox, a pressed button) clicks; anything else ticks. An element marked
  // data-ui-sound="off" (or inside one) has a sound of its own already.
  const press = (event: MouseEvent) => {
    const target = event.target instanceof Element ? event.target : null;
    const control = target?.closest<HTMLElement>('button, a[href], [role="button"], [role="switch"], [role="menuitem"], [role="menuitemradio"], input[type="checkbox"]');
    if (control == null || control.closest('[data-ui-sound="off"]') !== null || (control as HTMLButtonElement).disabled === true) {
      return;
    }
    const toggle = control.matches('[role="switch"], input[type="checkbox"], [aria-pressed]');
    emitStoryEvent({ type: toggle ? 'ui-toggle' : 'ui-click' });
  };
  document.addEventListener('click', press, true);
  const visibility = () => {
    const hidden = document.visibilityState === 'hidden';
    engine.setHidden(hidden);
    if (hiddenTimer !== null) {
      clearTimeout(hiddenTimer);
      hiddenTimer = null;
    }
    if (hidden) {
      hiddenTimer = setTimeout(() => music.pause(), SOUND.hiddenFade * 1000);
    } else if (engine.playing('music')) {
      music.resume();
    }
  };
  const options = { capture: true, passive: true } as const;
  // The first click or key anywhere unlocks the sound (review-fixes brief, 6). A touch's pointerdown is not a user
  // activation in every browser, so its click (and touchend) are heard too.
  const gestures = ['pointerdown', 'keydown', 'click', 'touchend'] as const;
  gestures.forEach(type => window.addEventListener(type, gesture, options));
  document.addEventListener('visibilitychange', visibility);
  // The bug of review-fixes brief, 6: the case page says "story" before this listener exists (its effect runs before
  // the app's), so the story's playlist never started; only the desk's, said later, did. Where the player already is
  // is picked up now.
  const already = lastPlaceEvent();
  if (already !== null && already.place !== 'away') {
    place(already);
  }
  const stop = onStoryEvent(event => {
    // Where the player is, and how dark the story is, are kept even before the sound starts.
    if (event.type === 'place') {
      place(event);
      return;
    }
    if (generated) {
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
    gestures.forEach(type => window.removeEventListener(type, gesture, options));
    document.removeEventListener('visibilitychange', visibility);
    document.removeEventListener('click', press, true);
    stop();
    stopStart();
    stopChange();
    [stopTimer, awayTimer, hiddenTimer].forEach(timer => timer !== null && clearTimeout(timer));
    ambience.stopAll();
    score.stop();
    music.stop();
    if (musicNow === music) {
      musicNow = null;
    }
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

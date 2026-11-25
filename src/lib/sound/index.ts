// src/lib/sound/index.ts
// The app's sound: one engine, listening to the story's and the desk's events (story-events.ts) and answering them
// from the table (sound-map.ts) with real sound files (samples.ts; sound-files brief, 2). Nothing is generated any
// more, and the music is off (sound-files brief, 3): one control, Sound, for the effects and the narrator's voice.
// The playlist player (music.ts) and the case's playlists are kept in the repo, unused. Started once by the app
// (startSound). Nothing sounds before the first gesture; everything fades out while the tab is hidden.

import { useSyncExternalStore } from 'react';
import { SoundEngine, type Channel } from '@/lib/sound/engine';
import { Narrator } from '@/lib/sound/narration';
import { MOTION_QUERIES } from '@/lib/motion';
import { MIX } from '@/lib/sound/levels';
import { Loops } from '@/lib/sound/loops';
import { playSample, samples } from '@/lib/sound/samples';
import { playScratch } from '@/lib/sound/scratch';
import { freshMemory, soundFor, type SoundCue, type SoundRow } from '@/lib/sound/sound-map';
import { emitStoryEvent, lastPlaceEvent, onStoryEvent, type StoryEvent } from '@/lib/story-events';

/** How often the desk checks whether it has been too quiet, in ms. */
const QUIET_CHECK_MS = 5000;

/** The one engine. */
export const sound = new SoundEngine();

/** The one narrator: a chapter or the question read aloud (narration.ts). */
export const narrator = new Narrator(sound);

/** While set, nothing is played (the legend intro is silent: the fix list). The loops still keep up. */
let silenced = false;
/** The gesture that unlocked the sound, while it is still being handled (two fixes, 2). */
let unlockingEvent: Event | null = null;

/** How long after the unlocking event the same gesture's other events (a touch's touchstart) still count, in ms. */
const SAME_GESTURE_MS = 100;

/**
 * True for the click, touch or key that has just unlocked the sound: it was for the sound ("Click anywhere for
 * sound"), so "Play the story" does not take it as the reader taking over (use-step-player.ts).
 */
export function unlockedSoundWith(event: Event): boolean {
  if (unlockingEvent === null) {
    return false;
  }
  const after = event.timeStamp - unlockingEvent.timeStamp;
  return event === unlockingEvent || (after >= 0 && after < SAME_GESTURE_MS);
}

export function silenceSound(on: boolean): void {
  silenced = on;
}

/** Plays one cue: its sound file on the effects bus, if a voice is free. */
export function playCue(engine: SoundEngine, cue: SoundCue): void {
  if (cue.sound === 'scratch') {
    playScratch(engine, cue);
    return;
  }
  playSample(engine, { ...cue, sound: cue.sound });
}

/** Does what a row says: ducks what sits under it, and plays its cues. */
export function playRow(engine: SoundEngine, row: SoundRow): void {
  if (row.duck !== undefined) {
    engine.duck(row.duck);
  }
  row.cues?.forEach(cue => playCue(engine, cue));
}

/**
 * Connects the engine to the page: the first gesture starts it (and loads the files), the tab's visibility fades it,
 * and every event is answered from the table. Returns a function that disconnects it all.
 */
export function startSound(engine: SoundEngine = sound): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }
  const memory = freshMemory();
  // The held sounds: the room tone, the question, the heartbeat, the murmur (loops.ts).
  const loops = new Loops(engine);
  const stopStart = engine.onStart(ctx => {
    // Once the files are in, the loops of where the player already is begin.
    void samples.load(ctx).then(() => loops.sync());
  });
  // Too quiet for too long on the desk (dread pass, 7): after `MIX.quietMs` without input, a distant creak, at most once
  // every `MIX.creakEveryMs`. A check every few seconds; nothing else runs.
  let where: 'story' | 'desk' | 'verdict' | 'away' = 'away';
  let lastInput = Date.now();
  let lastCreak = Number.NEGATIVE_INFINITY;
  const noteInput = () => {
    lastInput = Date.now();
  };
  const quietCheck = setInterval(() => {
    const now = Date.now();
    if (where === 'desk' && engine.running && now - lastInput >= MIX.quietMs && now - lastCreak >= MIX.creakEveryMs) {
      lastCreak = now;
      emitStoryEvent({ type: 'quiet' });
    }
  }, QUIET_CHECK_MS);
  const place = (event: Extract<StoryEvent, { type: 'place' }>) => {
    loops.hear(event);
    where = event.place;
    noteInput();
    if (event.place === 'story') {
      // Each visit to the story starts its memory afresh.
      memory.cues = event.ambience?.cues ?? [];
      memory.played = new Set();
    }
  };
  // Any first gesture starts the sound; under reduced motion nothing starts by itself (polish brief, B6): only the
  // player's own choice does (the header's toggle, or the play modal's switch).
  const gesture = (event: Event) => {
    if (typeof window.matchMedia === 'function' && window.matchMedia(MOTION_QUERIES.reduced).matches) {
      return;
    }
    const locked = engine.enabled && !engine.running;
    engine.unlock();
    if (locked && engine.running) {
      unlockingEvent = event;
    }
  };
  // The interface's sounds (music brief, 4): one listener for every button and link, so no component has to ask.
  // An element marked data-ui-sound="off" (or inside one) has a sound of its own already.
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
  // The tab hidden: everything fades, and comes back when it returns.
  const visibility = () => engine.setHidden(document.visibilityState === 'hidden');
  const options = { capture: true, passive: true } as const;
  // The first click or key anywhere unlocks the sound (review-fixes brief, 6). A touch's pointerdown is not a user
  // activation in every browser, so its click (and touchend) are heard too.
  const gestures = ['pointerdown', 'keydown', 'click', 'touchend'] as const;
  gestures.forEach(type => window.addEventListener(type, gesture, options));
  const inputs = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
  inputs.forEach(type => window.addEventListener(type, noteInput, options));
  document.addEventListener('visibilitychange', visibility);
  // The case page says where the player is before this listener exists (review-fixes brief, 6): picked up now.
  const already = lastPlaceEvent();
  if (already !== null && already.place !== 'away') {
    place(already);
  }
  const stop = onStoryEvent(event => {
    if (event.type === 'place') {
      place(event);
      return;
    }
    // The loops keep up with the moments even before the sound starts, so they are right once it does.
    loops.hear(event);
    if (!engine.running || silenced) {
      return;
    }
    const row = soundFor(event, memory);
    if (row !== null) {
      playRow(engine, row);
    }
  });
  return () => {
    gestures.forEach(type => window.removeEventListener(type, gesture, options));
    inputs.forEach(type => window.removeEventListener(type, noteInput, options));
    clearInterval(quietCheck);
    document.removeEventListener('visibilitychange', visibility);
    document.removeEventListener('click', press, true);
    stop();
    stopStart();
    loops.kill();
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

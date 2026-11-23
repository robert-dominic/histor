// src/lib/sound/narration.ts
// Narration, ready for recordings (polish brief, B5): a chapter, or the central question, read aloud. One clip at a
// time, through an <audio> element (the one place the app plays a file: a voice cannot be generated). While it plays,
// the ambience and the score duck under the voice. It follows the sound toggle: with the sound off, no voice.
// "Play the story" plays a chapter's clip as its page is written and waits for it (Story.tsx); "Read at my pace"
// plays it only when the reader presses "Listen". No case has recordings yet: everything works without them.

import { useSyncExternalStore } from 'react';
import type { SoundEngine } from '@/lib/sound/engine';
import { NARRATION } from '@/lib/sound/levels';

export class Narrator {
  private readonly engine: SoundEngine;
  private readonly createAudio: (src: string) => HTMLAudioElement | null;
  private audio: HTMLAudioElement | null = null;
  private source: string | null = null;
  private done: Promise<void> | null = null;
  private finish: (() => void) | null = null;
  private readonly listeners = new Set<() => void>();

  constructor(engine: SoundEngine, createAudio?: (src: string) => HTMLAudioElement | null) {
    this.engine = engine;
    this.createAudio = createAudio ?? (src => (typeof Audio === 'undefined' ? null : new Audio(src)));
  }

  /** The clip playing now, or null. */
  get playing(): string | null {
    return this.source;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private changed(): void {
    this.listeners.forEach(listener => listener());
  }

  /**
   * Plays `src` (from a gesture, or from "Play the story", which began with one). Resolves when it ends, fails, or is
   * stopped; at once when the sound is off. The clip already playing is not restarted: its promise is returned.
   */
  play(src: string): Promise<void> {
    if (this.source === src && this.done !== null) {
      return this.done;
    }
    this.stop();
    if (!this.engine.enabled) {
      return Promise.resolve();
    }
    const audio = this.createAudio(src);
    if (audio === null) {
      return Promise.resolve();
    }
    this.engine.unlock();
    this.engine.duck('voice', 0);
    audio.volume = NARRATION.volume;
    this.audio = audio;
    this.source = src;
    this.done = new Promise<void>(resolve => {
      const end = () => {
        if (this.audio !== audio) {
          return;
        }
        audio.removeEventListener('ended', end);
        audio.removeEventListener('error', end);
        audio.pause();
        this.audio = null;
        this.source = null;
        this.done = null;
        this.finish = null;
        this.engine.release();
        this.changed();
        resolve();
      };
      this.finish = end;
      audio.addEventListener('ended', end);
      audio.addEventListener('error', end);
      void Promise.resolve(audio.play()).catch(end);
    });
    this.changed();
    return this.done;
  }

  /** The promise of `src` while it plays, or null. */
  current(src: string): Promise<void> | null {
    return this.source === src ? this.done : null;
  }

  /** Stops the clip playing, if any. */
  stop(): void {
    this.finish?.();
  }
}

/** For a "Listen" button: the clip playing now (or null). */
export function useNarration(narrator: Narrator): string | null {
  return useSyncExternalStore(
    listener => narrator.subscribe(listener),
    () => narrator.playing,
    () => null
  );
}

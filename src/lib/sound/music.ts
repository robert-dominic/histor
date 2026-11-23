// src/lib/sound/music.ts
// The music (music brief, 2): real tracks, a playlist per place (the story's, and the desk's for the desk, the verdict
// and the report), from the case's theme (`CaseTheme.playlists`). It shuffles, never plays the same track twice in a
// row, crossfades over about 3 seconds from one track to the next, and loops the playlist for ever. Moving between
// places crossfades to the other playlist.
// Tracks stream: an <audio> with preload="none", routed into the music bus. Only the current track and the next one
// load. Turning the music off pauses the track where it is; turning it back on resumes it there, never from the start.

import type { SoundEngine } from '@/lib/sound/engine';
import { glide } from '@/lib/sound/engine';
import { MUSIC } from '@/lib/sound/levels';
import type { Track } from '@/types/case';

export type MusicPlace = 'story' | 'desk' | 'away';

interface Slot {
  track: Track;
  audio: HTMLAudioElement;
  /** Its own level, for the crossfades (made once the sound has started). */
  gain: GainNode | null;
  source: MediaElementAudioSourceNode | null;
  /** On its way out. */
  leaving: boolean;
}

/** A shuffled pick from `tracks`, never `last` when there is another to play. */
export function pickNext(tracks: readonly Track[], last: Track | null, random: () => number = Math.random): Track | null {
  if (tracks.length === 0) {
    return null;
  }
  const choices = tracks.length > 1 && last !== null ? tracks.filter(track => track.src !== last.src) : tracks;
  return choices[Math.floor(random() * choices.length) % choices.length];
}

export class MusicPlayer {
  private readonly engine: SoundEngine;
  private readonly createAudio: (src: string) => HTMLAudioElement | null;
  private playlists: { story?: Track[]; desk?: Track[] } = {};
  private placeNow: MusicPlace = 'away';
  private current: Slot | null = null;
  /** The track after the current one, loading (only it and the current one ever load). */
  private upcoming: Slot | null = null;
  private last: Track | null = null;
  private paused = true;
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  constructor(engine: SoundEngine, createAudio?: (src: string) => HTMLAudioElement | null) {
    this.engine = engine;
    this.createAudio =
      createAudio ??
      (src => {
        if (typeof Audio === 'undefined') {
          return null;
        }
        const audio = new Audio();
        audio.preload = 'none';
        audio.src = src;
        return audio;
      });
  }

  /** The track playing now (or paused where it stopped), for tests and the dev page. */
  get track(): Track | null {
    return this.current?.track ?? null;
  }

  get place(): MusicPlace {
    return this.placeNow;
  }

  private get tracks(): Track[] {
    return this.placeNow === 'away' ? [] : (this.playlists[this.placeNow] ?? []);
  }

  private level(): number {
    return this.placeNow === 'away' ? 0 : MUSIC.level[this.placeNow];
  }

  private later(seconds: number, run: () => void): void {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      run();
    }, seconds * 1000);
    this.timers.add(timer);
  }

  /** Where the player is, and the case's playlists. A new place crossfades to its own playlist. */
  setPlace(place: MusicPlace, playlists: { story?: Track[]; desk?: Track[] } | undefined): void {
    const moved = place !== this.placeNow;
    this.playlists = playlists ?? {};
    this.placeNow = place;
    if (!moved && this.current !== null) {
      return;
    }
    this.dropUpcoming();
    if (this.current !== null) {
      this.fadeOut(this.current);
      this.current = null;
    }
    this.last = null;
    if (!this.paused) {
      this.next();
    }
  }

  /** The music can be heard: start, or resume the track where it stopped. */
  resume(): void {
    this.paused = false;
    if (this.current === null) {
      this.next();
      return;
    }
    const slot = this.current;
    const ctx = this.engine.context;
    // Made before the sound could start: its level comes up now.
    if (slot.gain === null) {
      this.connect(slot);
      if (ctx !== null && slot.gain !== null) {
        glide((slot.gain as GainNode).gain, this.level(), MUSIC.crossfade, ctx.currentTime);
      }
    }
    // Where it stopped: the element keeps its place, so play() carries on from there.
    void Promise.resolve(slot.audio.play()).catch(() => undefined);
  }

  /** The music is off (its gate has faded) or the tab is hidden: the track pauses where it is. */
  pause(): void {
    this.paused = true;
    this.current?.audio.pause();
    this.upcoming?.audio.pause();
  }

  /** Stops everything (the page is left). */
  stop(): void {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    [this.current, this.upcoming].forEach(slot => slot !== null && this.release(slot));
    this.current = null;
    this.upcoming = null;
    this.paused = true;
  }

  private slot(track: Track): Slot | null {
    const audio = this.createAudio(track.src);
    if (audio === null) {
      return null;
    }
    audio.preload = 'none';
    return { track, audio, gain: null, source: null, leaving: false };
  }

  /** Routes a slot's <audio> into the music bus, through its own gain (once). */
  private connect(slot: Slot): void {
    const ctx = this.engine.context;
    const bus = this.engine.nodes?.bus.music ?? null;
    if (ctx === null || bus === null || slot.gain !== null) {
      return;
    }
    try {
      slot.source = ctx.createMediaElementSource(slot.audio);
    } catch {
      return;
    }
    slot.gain = ctx.createGain();
    slot.gain.gain.value = 0;
    slot.source.connect(slot.gain).connect(bus);
  }

  private load(slot: Slot): void {
    if (slot.audio.preload !== 'auto') {
      slot.audio.preload = 'auto';
      slot.audio.load?.();
    }
  }

  /** On to the next track of this place: crossfaded in over the one playing (if any). */
  private next(): void {
    const ctx = this.engine.context;
    const track = this.upcoming?.track ?? pickNext(this.tracks, this.last);
    if (track === null) {
      return;
    }
    const slot = this.upcoming ?? this.slot(track);
    this.upcoming = null;
    if (slot === null) {
      return;
    }
    const leaving = this.current;
    this.current = slot;
    this.last = track;
    this.connect(slot);
    if (ctx !== null && slot.gain !== null) {
      glide(slot.gain.gain, this.level(), MUSIC.crossfade, ctx.currentTime);
    }
    if (leaving !== null) {
      this.fadeOut(leaving);
    }
    const audio = slot.audio;
    const onTime = () => {
      if (this.current !== slot || slot.leaving) {
        return;
      }
      // The next track starts loading a little in; the crossfade starts before this one ends.
      if (audio.currentTime >= MUSIC.preloadAfter && this.upcoming === null) {
        const after = pickNext(this.tracks, track);
        this.upcoming = after === null ? null : this.slot(after);
        if (this.upcoming !== null) {
          this.load(this.upcoming);
        }
      }
      if (Number.isFinite(audio.duration) && audio.duration > 0 && audio.duration - audio.currentTime <= MUSIC.crossfade) {
        audio.removeEventListener('timeupdate', onTime);
        this.next();
      }
    };
    const onEnded = () => {
      audio.removeEventListener('ended', onEnded);
      if (this.current === slot) {
        this.next();
      }
    };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnded);
    if (!this.paused) {
      void Promise.resolve(audio.play()).catch(() => undefined);
    }
  }

  private fadeOut(slot: Slot): void {
    slot.leaving = true;
    const ctx = this.engine.context;
    if (ctx !== null && slot.gain !== null) {
      glide(slot.gain.gain, 0, MUSIC.crossfade, ctx.currentTime);
      this.later(MUSIC.crossfade + 0.1, () => this.release(slot));
    } else {
      this.release(slot);
    }
  }

  private dropUpcoming(): void {
    if (this.upcoming !== null) {
      this.release(this.upcoming);
      this.upcoming = null;
    }
  }

  private release(slot: Slot): void {
    slot.audio.pause();
    slot.source?.disconnect();
    slot.gain?.disconnect();
  }
}

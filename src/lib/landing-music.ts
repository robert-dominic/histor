// src/lib/landing-music.ts
// The landing page's music (landing v3 brief): the story playlist from the case's music.ts, played as a quiet
// background bed. Off until the header's music button is clicked; no volume control, the level is set here, in one
// constant. It fades in over about 3s when started, out over 1.5s when stopped, and crossfades smoothly from one track
// to the next (a shuffled playlist that never repeats the last track and loops for ever). Tracks stream through an
// <audio> element, one or two at a time. It is its own small player, not the case's sound engine: the landing has no
// sound bus, and nothing here ever starts by itself.
import gsap from 'gsap';
import { tween } from '@/lib/motion';
import { pickNext } from '@/lib/sound/music';
import type { Track } from '@/types/case';

/** How loud the landing music is: a quiet bed, never loud or distracting. */
export const LANDING_MUSIC_VOLUME = 0.15;

/** The artist in a credit such as "Universfield (Pixabay)": the credit without its source. */
export function artistOf(credit: string): string {
  return credit.replace(/\s*\(Pixabay\)\s*$/, '').trim();
}

/** What the music button's tooltip says: "Play music", or the track playing, e.g. "Deep Sea · Universfield". */
export function musicTip(track: Track | null, playing: boolean): string {
  return playing && track !== null ? `${track.title} · ${artistOf(track.credit)}` : 'Play music';
}

interface Slot {
  track: Track;
  audio: HTMLAudioElement;
  leaving: boolean;
  onTime: () => void;
  onEnded: () => void;
}

export class LandingMusic {
  private readonly tracks: readonly Track[];
  private readonly createAudio: (src: string) => HTMLAudioElement | null;
  private readonly random: () => number;
  private current: Slot | null = null;
  private last: Track | null = null;
  private on = false;
  private readonly listeners = new Set<() => void>();
  private readonly onVisibility = () => {
    if (!this.on || this.current === null) {
      return;
    }
    if (document.hidden) {
      this.current.audio.pause();
    } else {
      void Promise.resolve(this.current.audio.play()).catch(() => undefined);
    }
  };

  constructor(tracks: readonly Track[], createAudio?: (src: string) => HTMLAudioElement | null, random: () => number = Math.random) {
    this.tracks = tracks;
    this.random = random;
    this.createAudio =
      createAudio ??
      (src => {
        if (typeof Audio === 'undefined') {
          return null;
        }
        const audio = new Audio();
        audio.preload = 'auto';
        audio.src = src;
        return audio;
      });
  }

  get playing(): boolean {
    return this.on;
  }

  /** The track playing now (or fading out). */
  get track(): Track | null {
    return this.current?.track ?? null;
  }

  /** How far through the current track it is, 0 to 1 (0 when nothing plays): the button's ring fills with it. */
  progress(): number {
    const audio = this.current?.audio;
    if (audio === undefined || !Number.isFinite(audio.duration) || audio.duration <= 0) {
      return 0;
    }
    return Math.min(Math.max(audio.currentTime / audio.duration, 0), 1);
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  }

  private emit(): void {
    this.listeners.forEach(listener => listener());
  }

  /** Starts the music: a track fades in over about 3s. A track still fading out comes back up. */
  start(): void {
    if (this.on || this.tracks.length === 0) {
      return;
    }
    this.on = true;
    document.addEventListener('visibilitychange', this.onVisibility);
    if (this.current !== null && !this.current.leaving) {
      const { audio } = this.current;
      gsap.to(audio, { volume: LANDING_MUSIC_VOLUME, ...tween('landing.musicIn'), overwrite: true });
      void Promise.resolve(audio.play()).catch(() => undefined);
    } else {
      this.next();
    }
    this.emit();
  }

  /** Stops the music: it fades out over 1.5s, then the track pauses where it is. */
  stop(): void {
    if (!this.on) {
      return;
    }
    this.on = false;
    document.removeEventListener('visibilitychange', this.onVisibility);
    const slot = this.current;
    if (slot !== null) {
      gsap.to(slot.audio, {
        volume: 0,
        ...tween('landing.musicOut'),
        overwrite: true,
        onComplete: () => {
          if (!this.on) {
            slot.audio.pause();
          }
        },
      });
    }
    this.emit();
  }

  /** Leaves for good (the page is left): fades out, then lets everything go. */
  destroy(): void {
    this.stop();
    const slot = this.current;
    this.current = null;
    if (slot !== null) {
      this.detach(slot);
      gsap.delayedCall(tween('landing.musicOut').duration + 0.1, () => slot.audio.pause());
    }
    this.listeners.clear();
  }

  private detach(slot: Slot): void {
    slot.audio.removeEventListener('timeupdate', slot.onTime);
    slot.audio.removeEventListener('ended', slot.onEnded);
  }

  /** On to the next track, crossfaded in over the one playing (if any). */
  private next(): void {
    const track = pickNext(this.tracks, this.last, this.random);
    if (track === null) {
      return;
    }
    const audio = this.createAudio(track.src);
    if (audio === null) {
      return;
    }
    const fade = tween('landing.musicIn');
    const leaving = this.current;
    const slot: Slot = {
      track,
      audio,
      leaving: false,
      onTime: () => {
        // The crossfade starts as the track nears its end.
        if (this.current === slot && this.on && Number.isFinite(audio.duration) && audio.duration > 0 && audio.duration - audio.currentTime <= fade.duration) {
          audio.removeEventListener('timeupdate', slot.onTime);
          this.next();
        }
      },
      onEnded: () => {
        if (this.current === slot && this.on) {
          this.next();
        }
      },
    };
    audio.volume = 0;
    this.current = slot;
    this.last = track;
    audio.addEventListener('timeupdate', slot.onTime);
    audio.addEventListener('ended', slot.onEnded);
    void Promise.resolve(audio.play()).catch(() => undefined);
    gsap.to(audio, { volume: LANDING_MUSIC_VOLUME, ...fade, overwrite: true });
    if (leaving !== null) {
      leaving.leaving = true;
      this.detach(leaving);
      gsap.to(leaving.audio, { volume: 0, ...fade, overwrite: true, onComplete: () => leaving.audio.pause() });
    }
    this.emit();
  }
}

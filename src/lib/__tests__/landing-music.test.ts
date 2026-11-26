// @vitest-environment jsdom
// src/lib/__tests__/landing-music.test.ts
// The landing music (landing v3 brief): the story playlist, a quiet bed (one constant), off until started, fading in
// over about 3s and out over 1.5s, crossfading between tracks.
import gsap from 'gsap';
import { afterEach, describe, expect, test, vi } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import { LANDING_PLAYLIST } from '@/landing/music';
import { LANDING_MUSIC_VOLUME, LandingMusic, artistOf, musicTip } from '@/lib/landing-music';

class FakeAudio {
  volume = 1;
  currentTime = 0;
  duration = 100;
  paused = true;
  preload = '';
  readonly listeners = new Map<string, Set<() => void>>();
  readonly src: string;
  constructor(src: string) {
    this.src = src;
  }
  play() {
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
  addEventListener(type: string, listener: () => void) {
    this.listeners.set(type, (this.listeners.get(type) ?? new Set()).add(listener));
  }
  removeEventListener(type: string, listener: () => void) {
    this.listeners.get(type)?.delete(listener);
  }
  emit(type: string) {
    this.listeners.get(type)?.forEach(listener => listener());
  }
}

const made: FakeAudio[] = [];
const make = () => new LandingMusic(LANDING_PLAYLIST, src => {
  const audio = new FakeAudio(src);
  made.push(audio);
  return audio as unknown as HTMLAudioElement;
});
afterEach(() => {
  made.length = 0;
  gsap.globalTimeline.clear();
});

describe('the landing music', () => {
  test('the story playlist from the case\'s music.ts, at about 15%, in one constant', () => {
    expect(LANDING_PLAYLIST).toEqual(maryCeleste.theme.playlists!.story);
    expect(LANDING_PLAYLIST.length).toBeGreaterThan(1);
    expect(LANDING_MUSIC_VOLUME).toBe(0.15);
  });

  test('off until started: nothing is created or played by itself', () => {
    const music = make();
    expect(music.playing).toBe(false);
    expect(made).toHaveLength(0);
  });

  test('starting fades a track in to the quiet level over about 3s', () => {
    const music = make();
    music.start();
    expect(music.playing).toBe(true);
    expect(made).toHaveLength(1);
    expect(made[0].volume).toBe(0);
    expect(made[0].paused).toBe(false);
    const fade = gsap.getTweensOf(made[0])[0];
    expect(fade.vars.volume).toBe(LANDING_MUSIC_VOLUME);
    expect(fade.duration()).toBe(3);
    fade.progress(1);
    expect(made[0].volume).toBeCloseTo(0.15, 5);
  });

  test('stopping fades out over 1.5s, then pauses where it is; starting again brings it back', () => {
    const music = make();
    music.start();
    gsap.getTweensOf(made[0])[0].progress(1);
    music.stop();
    expect(music.playing).toBe(false);
    const out = gsap.getTweensOf(made[0])[0];
    expect(out.vars.volume).toBe(0);
    expect(out.duration()).toBe(1.5);
    expect(made[0].paused).toBe(false);
    out.progress(1);
    expect(made[0].paused).toBe(true);
    music.start();
    expect(made).toHaveLength(1);
    expect(made[0].paused).toBe(false);
    expect(gsap.getTweensOf(made[0])[0].vars.volume).toBe(LANDING_MUSIC_VOLUME);
  });

  test('near the end of a track the next one crossfades in over it, never the same track twice in a row', () => {
    const music = make();
    music.start();
    gsap.getTweensOf(made[0])[0].progress(1);
    made[0].currentTime = 98;
    made[0].emit('timeupdate');
    expect(made).toHaveLength(2);
    expect(made[1].src).not.toBe(made[0].src);
    expect(gsap.getTweensOf(made[1])[0].vars.volume).toBe(LANDING_MUSIC_VOLUME);
    const leaving = gsap.getTweensOf(made[0])[0];
    expect(leaving.vars.volume).toBe(0);
    expect(leaving.duration()).toBe(3);
    leaving.progress(1);
    expect(made[0].paused).toBe(true);
    expect(music.track!.src).toBe(made[1].src);
  });

  test('progress: how far through the current track, and 0 again for the next one', () => {
    const music = make();
    expect(music.progress()).toBe(0);
    music.start();
    made[0].duration = 200;
    made[0].currentTime = 50;
    expect(music.progress()).toBe(0.25);
    made[0].currentTime = 198;
    made[0].emit('timeupdate');
    expect(music.track!.src).toBe(made[1].src);
    expect(music.progress()).toBe(0);
  });

  test('the tooltip: "Play music", then the track playing with its artist', () => {
    expect(artistOf('Universfield (Pixabay)')).toBe('Universfield');
    expect(artistOf('Leberch (Nikita Kondrashev) (Pixabay)')).toBe('Leberch (Nikita Kondrashev)');
    const deepSea = LANDING_PLAYLIST.find(track => track.title === 'Deep Sea')!;
    expect(musicTip(deepSea, true)).toBe('Deep Sea · Universfield');
    expect(musicTip(deepSea, false)).toBe('Play music');
    expect(musicTip(null, true)).toBe('Play music');
  });

  test('the page being left fades it out and lets go', () => {
    const music = make();
    music.start();
    gsap.getTweensOf(made[0])[0].progress(1);
    const spy = vi.spyOn(made[0], 'pause');
    music.destroy();
    expect(gsap.getTweensOf(made[0])[0].vars.volume).toBe(0);
    gsap.getTweensOf(made[0])[0].progress(1);
    expect(spy).toHaveBeenCalled();
  });
});

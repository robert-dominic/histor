// @vitest-environment jsdom
// src/lib/sound/__tests__/music.test.ts
// The music is off (sound-files brief, 3): nothing plays it and there is no Music control. Its player (music.ts) is
// kept, unused, for when it comes back, and still does what it did (music brief, 2), driven here by hand with fake
// <audio> elements and a fake AudioContext: a shuffled playlist per place, never the same track twice in a row,
// crossfaded, streamed (only the current and the next load), and resumed where it stopped.
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { startSound } from '@/lib/sound';
import { SoundEngine } from '@/lib/sound/engine';
import { MUSIC, MUSIC_ENABLED } from '@/lib/sound/levels';
import { MusicPlayer, pickNext } from '@/lib/sound/music';
import { emitStoryEvent } from '@/lib/story-events';
import type { Track } from '@/types/case';
import { type FakeGain, fakeContextMaker } from '@/test/fake-audio';

class FakeTrack extends EventTarget {
  preload = '';
  src = '';
  currentTime = 0;
  duration = 120;
  paused = true;
  plays = 0;
  loads = 0;
  play() {
    this.paused = false;
    this.plays += 1;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
  load() {
    this.loads += 1;
  }
  /** Plays on to `time` seconds. */
  at(time: number) {
    this.currentTime = time;
    this.dispatchEvent(new Event('timeupdate'));
  }
}

const track = (name: string): Track => ({ src: `/audio/music/test/${name}.mp3`, title: name, credit: 'Pixabay' });
const playlists = { story: [track('s1'), track('s2'), track('s3')], desk: [track('d1'), track('d2')] };

function setUp() {
  const maker = fakeContextMaker();
  const engine = new SoundEngine({ createContext: maker.create });
  const audios: FakeTrack[] = [];
  const music = new MusicPlayer(engine, src => {
    const audio = new FakeTrack();
    audio.src = src;
    audios.push(audio);
    return audio as unknown as HTMLAudioElement;
  });
  // What startSound did while the music played: it starts with the sound.
  const stopStart = engine.onStart(() => engine.playing('music') && music.resume());
  const stop = () => {
    stopStart();
    music.stop();
  };
  return { engine, audios, stop, made: maker.made, music };
}
const playing = (audios: FakeTrack[]) => audios.filter(audio => !audio.paused);

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe('the music is off', () => {
  test('MUSIC_ENABLED is false: the app plays no music, whatever the place and its playlists', () => {
    expect(MUSIC_ENABLED).toBe(false);
    const maker = fakeContextMaker();
    const engine = new SoundEngine({ createContext: maker.create });
    const stop = startSound(engine);
    emitStoryEvent({ type: 'place', place: 'story', playlists });
    engine.unlock();
    emitStoryEvent({ type: 'place', place: 'desk', playlists });
    expect(maker.made[0].nodes.filter(node => node.kind === 'media')).toHaveLength(0);
    stop();
    emitStoryEvent({ type: 'place', place: 'away' });
  });
});

describe('the kept player: the playlist', () => {
  test('shuffled, never the same track twice in a row (one track simply repeats)', () => {
    let last: Track | null = null;
    for (let i = 0; i < 200; i += 1) {
      const next: Track = pickNext(playlists.story, last)!;
      expect(next.src).not.toBe(last?.src);
      last = next;
    }
    expect(pickNext([track('only')], track('only'))?.title).toBe('only');
    expect(pickNext([], null)).toBeNull();
  });

  test('no playlist: no music, and nothing breaks', () => {
    const { engine, audios, stop, music } = setUp();
    music.setPlace('story', undefined);
    engine.unlock();
    expect(audios).toHaveLength(0);
    stop();
  });

  test('a place\'s playlist, streamed into the music bus, after the first gesture only', () => {
    const { engine, audios, stop, made, music } = setUp();
    music.setPlace('story', playlists);
    expect(playing(audios)).toHaveLength(0);
    engine.unlock();
    expect(playing(audios)).toHaveLength(1);
    const audio = playing(audios)[0];
    expect(playlists.story.map(entry => entry.src)).toContain(audio.src);
    expect(audio.preload).toBe('none');
    const media = made[0].nodes.find(node => node.kind === 'media')!;
    const gain = media.connections[0] as FakeGain;
    expect(gain.connections).toContain(engine.nodes!.bus.music);
    expect(gain.gain.target).toBe(MUSIC.level.story);
    stop();
  });

  test('only the current track and the next one load; near the end it crossfades into the next, another track', () => {
    const { engine, audios, stop, music } = setUp();
    music.setPlace('story', playlists);
    engine.unlock();
    const first = audios[0];
    first.at(MUSIC.preloadAfter + 1);
    expect(audios).toHaveLength(2);
    const second = audios[1];
    expect(second.preload).toBe('auto');
    expect(second.src).not.toBe(first.src);
    first.at(first.duration - MUSIC.crossfade + 0.1);
    expect(second.paused).toBe(false);
    vi.advanceTimersByTime((MUSIC.crossfade + 0.2) * 1000);
    expect(first.paused).toBe(true);
    stop();
  });

  test('it loops for ever, and moving between places crossfades to the other playlist', () => {
    const { engine, audios, stop, music } = setUp();
    music.setPlace('desk', playlists);
    engine.unlock();
    audios[0].duration = Number.NaN;
    audios[0].dispatchEvent(new Event('ended'));
    expect(playing(audios).some(audio => audio !== audios[0])).toBe(true);
    music.setPlace('story', playlists);
    const story = audios[audios.length - 1];
    expect(playlists.story.map(entry => entry.src)).toContain(story.src);
    stop();
  });

  test('paused and resumed, it carries on from where it stopped: never a restart', () => {
    const { engine, audios, stop, music } = setUp();
    music.setPlace('story', playlists);
    engine.unlock();
    const audio = audios[0];
    audio.at(42);
    music.pause();
    expect(audio.paused).toBe(true);
    music.resume();
    expect(audio.paused).toBe(false);
    expect(audio.currentTime).toBe(42);
    stop();
  });
});

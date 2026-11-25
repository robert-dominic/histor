// @vitest-environment jsdom
// src/lib/sound/__tests__/music.test.ts
// The music (music brief, 2), with fake <audio> elements and a fake AudioContext: a shuffled playlist per place,
// never the same track twice in a row, crossfaded, streamed (only the current and the next load), and resumed where it
// stopped when the music comes back on. The generated ambience and score no longer play.
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import { startSound } from '@/lib/sound';
import { SoundEngine } from '@/lib/sound/engine';
import { AMBIENCE_ENABLED, MUSIC, SOUND } from '@/lib/sound/levels';
import { pickNext } from '@/lib/sound/music';
import { emitStoryEvent } from '@/lib/story-events';
import type { Track } from '@/types/case';
import { type FakeGain, fakeContextMaker, loadFakeSamples } from '@/test/fake-audio';
import { SAMPLE_NAMES, samples } from '@/lib/sound/samples';

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
  const stop = startSound(engine, {
    createAudio: src => {
      const audio = new FakeTrack();
      audio.src = src;
      audios.push(audio);
      return audio as unknown as HTMLAudioElement;
    },
  });
  return { engine, audios, stop, made: maker.made };
}
const playing = (audios: FakeTrack[]) => audios.filter(audio => !audio.paused);

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe('the playlist', () => {
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

  test('the bug of review-fixes 6: the story said before the sound listens (the page\'s effect runs first) still plays', () => {
    emitStoryEvent({ type: 'place', place: 'story', playlists });
    const { engine, audios, stop } = setUp();
    expect(playing(audios)).toHaveLength(0);
    // The first click anywhere: the story's playlist starts.
    window.dispatchEvent(new MouseEvent('click'));
    expect(engine.running).toBe(true);
    expect(playing(audios)).toHaveLength(1);
    expect(playlists.story.map(entry => entry.src)).toContain(playing(audios)[0].src);
    stop();
    emitStoryEvent({ type: 'place', place: 'away' });
  });

  test('the first key press anywhere unlocks it too', () => {
    const { engine, stop } = setUp();
    emitStoryEvent({ type: 'place', place: 'story', playlists });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(engine.running).toBe(true);
    stop();
    emitStoryEvent({ type: 'place', place: 'away' });
  });

  test('no playlist: no music, and nothing breaks', () => {
    const { engine, audios, stop } = setUp();
    emitStoryEvent({ type: 'place', place: 'story' });
    engine.unlock();
    expect(audios).toHaveLength(0);
    stop();
  });

  test('the story\'s playlist in the story, streamed into the music bus, after the first gesture only', () => {
    const { engine, audios, stop, made } = setUp();
    emitStoryEvent({ type: 'place', place: 'story', playlists });
    expect(playing(audios)).toHaveLength(0);
    engine.unlock();
    expect(playing(audios)).toHaveLength(1);
    const audio = playing(audios)[0];
    expect(playlists.story.map(entry => entry.src)).toContain(audio.src);
    // Streamed: nothing preloads; it loads as it plays.
    expect(audio.preload).toBe('none');
    // Routed through its own gain into the music bus, faded in to the story's level.
    const media = made[0].nodes.find(node => node.kind === 'media')!;
    const gain = media.connections[0] as FakeGain;
    expect(gain.connections).toContain(engine.nodes!.bus.music);
    expect(gain.gain.target).toBe(MUSIC.level.story);
    stop();
  });

  test('only the current track and the next one load; near the end it crossfades into the next, another track', () => {
    const { engine, audios, stop } = setUp();
    emitStoryEvent({ type: 'place', place: 'story', playlists });
    engine.unlock();
    const first = audios[0];
    first.at(MUSIC.preloadAfter + 1);
    expect(audios).toHaveLength(2);
    const second = audios[1];
    expect(second.preload).toBe('auto');
    expect(second.src).not.toBe(first.src);
    first.at(first.duration - MUSIC.crossfade + 0.1);
    expect(second.paused).toBe(false);
    // Both play through the crossfade; then the first stops.
    expect(first.paused).toBe(false);
    vi.advanceTimersByTime((MUSIC.crossfade + 0.2) * 1000);
    expect(first.paused).toBe(true);
    // Still only two elements: the one after is made only once this one is a little in.
    expect(audios).toHaveLength(2);
    second.at(MUSIC.preloadAfter + 1);
    expect(audios).toHaveLength(3);
    expect(audios[2].src).not.toBe(second.src);
    stop();
  });

  test('it loops for ever: a track that simply ends goes on to another', () => {
    const { engine, audios, stop } = setUp();
    emitStoryEvent({ type: 'place', place: 'desk', playlists });
    engine.unlock();
    audios[0].duration = Number.NaN;
    audios[0].dispatchEvent(new Event('ended'));
    expect(playing(audios).some(audio => audio !== audios[0])).toBe(true);
    stop();
  });

  test('moving between places crossfades to the other playlist; the desk a little quieter', () => {
    const { engine, audios, stop, made } = setUp();
    emitStoryEvent({ type: 'place', place: 'story', playlists });
    engine.unlock();
    const story = audios[0];
    emitStoryEvent({ type: 'place', place: 'away' });
    emitStoryEvent({ type: 'place', place: 'desk', playlists });
    vi.advanceTimersByTime(100);
    const desk = audios[audios.length - 1];
    expect(playlists.desk.map(entry => entry.src)).toContain(desk.src);
    expect(desk.paused).toBe(false);
    const gains = made[0].nodes.filter(node => node.kind === 'media').map(node => node.connections[0] as FakeGain);
    expect(gains[0].gain.target).toBe(0);
    expect(gains[gains.length - 1].gain.target).toBe(MUSIC.level.desk);
    expect(MUSIC.level.desk).toBeLessThan(MUSIC.level.story);
    vi.advanceTimersByTime((MUSIC.crossfade + 0.2) * 1000);
    expect(story.paused).toBe(true);
    stop();
  });

  test('turning the music off and on resumes the same track from where it stopped: never a restart', () => {
    const { engine, audios, stop } = setUp();
    emitStoryEvent({ type: 'place', place: 'story', playlists });
    engine.unlock();
    const audio = audios[0];
    audio.at(42);
    engine.setOn('music', false);
    vi.advanceTimersByTime((SOUND.toggleFade + 0.2) * 1000);
    expect(audio.paused).toBe(true);
    engine.setOn('music', true);
    expect(audio.paused).toBe(false);
    expect(audio.currentTime).toBe(42);
    expect(audios.filter(entry => !entry.paused)).toEqual([audio]);
    stop();
  });

  test('a music track made before the sound could start is faded up when it does', () => {
    localStorage.setItem('histor:music', '0');
    const { engine, audios, stop } = setUp();
    emitStoryEvent({ type: 'place', place: 'story', playlists });
    engine.unlock();
    expect(audios).toHaveLength(0);
    engine.setOn('music', true);
    expect(playing(audios)).toHaveLength(1);
    stop();
  });
});

describe('levels', () => {
  test('under the narrator the music ducks to about 12%; under hooks and stamps, gently', () => {
    expect(SOUND.duck.voice.to).toBeCloseTo(0.12, 2);
    expect(SOUND.duck.hook.to).toBeGreaterThan(0.3);
    expect(SOUND.duck.stamp.to).toBeGreaterThan(0.3);
    expect(SOUND.bus.music).toBeLessThan(SOUND.bus.effects);
  });
});

describe('the generated score and the sea and wind no longer play', () => {
  test('kept behind AMBIENCE_ENABLED, off', () => {
    expect(AMBIENCE_ENABLED).toBe(false);
    const { engine, stop, made } = setUp();
    emitStoryEvent({ type: 'place', place: 'story', ambience: maryCeleste.theme.ambience, playlists });
    engine.unlock();
    emitStoryEvent({ type: 'chapter-enter', chapter: 's-one', direction: 'forward', depth: 0 });
    // No looping noise (the sea, the wind) and no pad oscillators running on the music side.
    expect(made[0].started.filter(source => source.kind === 'buffer' && source.loop)).toHaveLength(0);
    expect(made[0].started.filter(source => source.kind === 'oscillator' && source.stoppedAt === null)).toHaveLength(0);
    stop();
  });

  test('the effects stay: a chapter appearing is heard', () => {
    loadFakeSamples(samples, SAMPLE_NAMES);
    const { engine, stop, made } = setUp();
    emitStoryEvent({ type: 'place', place: 'story', ambience: maryCeleste.theme.ambience });
    engine.unlock();
    const before = made[0].started.length;
    emitStoryEvent({ type: 'chapter-enter', chapter: 's-voyage', direction: 'forward' });
    expect(made[0].started.length - before).toBeGreaterThan(0);
    stop();
  });
});

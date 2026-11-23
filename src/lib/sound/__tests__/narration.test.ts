// @vitest-environment jsdom
// src/lib/sound/__tests__/narration.test.ts
// The narrator (polish brief, B5), with a fake <audio> and a fake AudioContext: one clip at a time, the ambience and
// the score ducked under the voice until it ends, nothing with the sound off.
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { SoundEngine } from '@/lib/sound/engine';
import { NARRATION, SOUND, SOUND_KEYS } from '@/lib/sound/levels';
import { Narrator } from '@/lib/sound/narration';
import { type FakeGain, fakeContextMaker } from '@/test/fake-audio';

class FakeAudio extends EventTarget {
  volume = 1;
  paused = true;
  readonly src: string;
  constructor(src: string) {
    super();
    this.src = src;
  }
  play() {
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
  end() {
    this.dispatchEvent(new Event('ended'));
  }
}

function setUp() {
  const maker = fakeContextMaker();
  const engine = new SoundEngine({ createContext: maker.create });
  const clips: FakeAudio[] = [];
  const narrator = new Narrator(engine, src => {
    const clip = new FakeAudio(src);
    clips.push(clip);
    return clip as unknown as HTMLAudioElement;
  });
  return { engine, narrator, clips, made: maker.made };
}
const duckOf = (engine: SoundEngine, made: ReturnType<typeof fakeContextMaker>['made']) => {
  void made;
  return (engine.nodes!.duck as unknown as FakeGain).gain.target;
};

beforeEach(() => localStorage.clear());

describe('the narrator', () => {
  test('its volume is the effects\' volume; turning the effects off stops the voice', () => {
    const { engine, narrator, clips } = setUp();
    void narrator.play('/a.mp3');
    engine.setVolume('effects', 0.5);
    expect(clips[0].volume).toBeCloseTo(NARRATION.volume * 0.5);
    engine.setOn('music', false);
    expect(narrator.playing).toBe('/a.mp3');
    engine.setOn('effects', false);
    expect(narrator.playing).toBeNull();
  });

  test('plays a clip; the ambience and the score duck under the voice until it ends; then it resolves', async () => {
    const { engine, narrator, clips, made } = setUp();
    const done = vi.fn();
    void narrator.play('/a.mp3').then(done);
    expect(clips).toHaveLength(1);
    expect(clips[0].paused).toBe(false);
    expect(clips[0].volume).toBeCloseTo(NARRATION.volume * SOUND.defaultVolume);
    expect(narrator.playing).toBe('/a.mp3');
    expect(duckOf(engine, made)).toBe(SOUND.duck.voice.to);
    clips[0].end();
    await Promise.resolve();
    expect(done).toHaveBeenCalled();
    expect(narrator.playing).toBeNull();
    expect(duckOf(engine, made)).toBe(1);
  });

  test('one clip at a time: the same clip is not restarted; another stops the first', async () => {
    const { narrator, clips } = setUp();
    const first = narrator.play('/a.mp3');
    expect(narrator.play('/a.mp3')).toBe(first);
    expect(narrator.current('/a.mp3')).toBe(first);
    expect(clips).toHaveLength(1);
    void narrator.play('/b.mp3');
    await first;
    expect(clips[0].paused).toBe(true);
    expect(narrator.playing).toBe('/b.mp3');
    narrator.stop();
    expect(narrator.playing).toBeNull();
  });

  test('with the effects off, no voice: it resolves at once (the music control does not matter)', async () => {
    localStorage.setItem(SOUND_KEYS.effects, '0');
    const { narrator, clips } = setUp();
    await narrator.play('/a.mp3');
    expect(clips).toHaveLength(0);
  });

  test('a clip that fails to load ends quietly', async () => {
    const { narrator, clips } = setUp();
    const done = narrator.play('/missing.mp3');
    clips[0].dispatchEvent(new Event('error'));
    await expect(done).resolves.toBeUndefined();
    expect(narrator.playing).toBeNull();
  });
});

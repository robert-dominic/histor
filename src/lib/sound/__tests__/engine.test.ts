// @vitest-environment jsdom
// src/lib/sound/__tests__/engine.test.ts
// The sound engine (polish brief, B1; music brief, 1), on a fake AudioContext: no sound before a gesture, music and
// effects each on or off with a volume, remembered; the music side ducking, the cap on voices, the tab's visibility,
// and the table from events to sounds.
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { SoundEngine } from '@/lib/sound/engine';
import { startSound } from '@/lib/sound';
import { SOUND, SOUND_KEYS } from '@/lib/sound/levels';
import { SOUND_TABLE, freshMemory, soundFor } from '@/lib/sound/sound-map';
import { emitStoryEvent } from '@/lib/story-events';
import { type FakeGain, fakeContextMaker } from '@/test/fake-audio';

function engineWithFake() {
  const maker = fakeContextMaker();
  const engine = new SoundEngine({ createContext: maker.create });
  return { engine, made: maker.made };
}
/** The engine's gains, by name. */
function gains(engine: SoundEngine) {
  const graph = engine.nodes!;
  const as = (node: GainNode) => node as unknown as FakeGain;
  return {
    master: as(graph.master),
    music: as(graph.gate.music),
    effectsGate: as(graph.gate.effects),
    duck: as(graph.duck),
    musicBus: as(graph.bus.music),
    ambience: as(graph.bus.ambience),
    score: as(graph.bus.score),
    effects: as(graph.bus.effects),
  };
}

beforeEach(() => localStorage.clear());
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('no sound before a gesture', () => {
  test('the context is made only by unlock (a gesture), never before', () => {
    const { engine, made } = engineWithFake();
    expect(made).toHaveLength(0);
    expect(engine.running).toBe(false);
    expect(engine.bus('effects')).toBeNull();
    expect(engine.voice(1)).toBe(false);
    expect(engine.unlock()).toBe(true);
    expect(made).toHaveLength(1);
    expect(made[0].resumes).toBe(1);
    expect(engine.running).toBe(true);
    // One context, however many gestures.
    engine.unlock();
    expect(made).toHaveLength(1);
  });

  test('connected to the page: events before the first gesture make nothing; the first pointer or key starts it', () => {
    const { engine, made } = engineWithFake();
    const stop = startSound(engine);
    emitStoryEvent({ type: 'stamp:record', evidence: 'e1' });
    expect(made).toHaveLength(0);
    window.dispatchEvent(new Event('pointerdown'));
    expect(made).toHaveLength(1);
    stop();
  });

  test('with music and effects both off, a gesture starts nothing', () => {
    localStorage.setItem(SOUND_KEYS.music, '0');
    localStorage.setItem(SOUND_KEYS.effects, '0');
    const { engine, made } = engineWithFake();
    expect(engine.enabled).toBe(false);
    expect(engine.unlock()).toBe(false);
    expect(made).toHaveLength(0);
  });

  test('a browser without Web Audio: nothing happens, nothing breaks', () => {
    const engine = new SoundEngine({ createContext: () => null });
    expect(engine.unlock()).toBe(false);
    expect(() => engine.duck('stamp')).not.toThrow();
  });
});

describe('two controls: music and effects, each on or off with a volume, remembered', () => {
  test('both on by default; each is kept apart, in histor:music and histor:effects, and read back next time', () => {
    const first = engineWithFake().engine;
    expect([first.isOn('music'), first.isOn('effects')]).toEqual([true, true]);
    first.setOn('music', false);
    expect(localStorage.getItem(SOUND_KEYS.music)).toBe('0');
    expect(localStorage.getItem(SOUND_KEYS.effects)).toBeNull();
    const second = new SoundEngine();
    expect([second.isOn('music'), second.isOn('effects')]).toEqual([false, true]);
    second.setOn('effects', false);
    second.setOn('music', true);
    const third = new SoundEngine();
    expect([third.isOn('music'), third.isOn('effects')]).toEqual([true, false]);
  });

  test('the old single switch, off, is read as both off until a new choice is made', () => {
    localStorage.setItem(SOUND_KEYS.legacy, '0');
    const engine = new SoundEngine();
    expect([engine.isOn('music'), engine.isOn('effects')]).toEqual([false, false]);
  });

  test('each volume is remembered, kept between 0 and 1, and sets its gate', () => {
    const { engine } = engineWithFake();
    expect(engine.volume('music')).toBe(SOUND.defaultVolume);
    engine.unlock();
    engine.setVolume('music', 0.3);
    engine.setVolume('effects', 7);
    expect(localStorage.getItem(SOUND_KEYS.musicVolume)).toBe('0.3');
    expect(new SoundEngine().volume('music')).toBe(0.3);
    expect(new SoundEngine().volume('effects')).toBe(1);
    expect(gains(engine).music.gain.target).toBe(0.3);
    expect(gains(engine).effectsGate.gain.target).toBe(1);
  });

  test('music off fades only the music; effects off fades only the effects (and the cues stop); no clicks', () => {
    const { engine } = engineWithFake();
    engine.unlock();
    const g = gains(engine);
    const heard = vi.fn();
    engine.subscribe(heard);
    engine.setOn('music', false);
    expect(g.music.gain.target).toBe(0);
    expect(g.music.gain.events.some(event => event.kind === 'linear')).toBe(true);
    expect(g.effectsGate.gain.target).toBe(SOUND.defaultVolume);
    expect(engine.bus('music')).toBeNull();
    expect(engine.bus('effects')).not.toBeNull();
    engine.setOn('effects', false);
    expect(g.effectsGate.gain.target).toBe(0);
    expect(engine.voice(1)).toBe(false);
    expect(engine.running).toBe(false);
    engine.setOn('music', true);
    expect(g.music.gain.target).toBe(SOUND.defaultVolume);
    expect(heard).toHaveBeenCalledTimes(3);
  });

  test('a channel coming back on tells the listeners which one', () => {
    const { engine } = engineWithFake();
    const started = vi.fn();
    engine.onStart(started);
    engine.unlock();
    expect(started).toHaveBeenLastCalledWith(expect.anything(), null);
    engine.setOn('music', false);
    engine.setOn('music', true);
    expect(started).toHaveBeenLastCalledWith(expect.anything(), 'music');
  });

  test('storage that fails: on, and nothing breaks', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const engine = new SoundEngine({ createContext: () => null });
    expect(engine.enabled).toBe(true);
    expect(() => engine.setOn('music', false)).not.toThrow();
    expect(() => engine.setVolume('effects', 0.2)).not.toThrow();
  });
});

describe('buses and ducking', () => {
  test('master, then the music side (through a duck and the music gate) and the effects (through theirs)', () => {
    const { engine, made } = engineWithFake();
    engine.unlock();
    const ctx = made[0];
    const g = gains(engine);
    expect(g.master.connections).toContain(ctx.destination);
    for (const bus of [g.musicBus, g.ambience, g.score]) {
      expect(bus.connections).toContain(g.duck);
    }
    expect(g.duck.connections).toContain(g.music);
    expect(g.music.connections).toContain(g.master);
    expect(g.effects.connections).toContain(g.effectsGate);
    expect(g.effectsGate.connections).toContain(g.master);
    expect(g.musicBus.gain.value).toBe(SOUND.bus.music);
    expect(g.ambience.gain.value).toBe(SOUND.bus.ambience);
    expect(g.score.gain.value).toBe(SOUND.bus.score);
    expect(g.effects.gain.value).toBe(SOUND.bus.effects);
  });

  test('the music side dips under a stamp and comes back after its hold; the effects never dip', () => {
    vi.useFakeTimers();
    const { engine } = engineWithFake();
    engine.unlock();
    const g = gains(engine);
    engine.duck('stamp');
    expect(g.duck.gain.target).toBe(SOUND.duck.stamp.to);
    expect(g.effects.gain.events).toHaveLength(0);
    expect(engine.ducked).toBe(SOUND.duck.stamp.to);
    vi.advanceTimersByTime(SOUND.duck.stamp.hold * 1000);
    expect(g.duck.gain.target).toBe(1);
  });

  test('overlapping ducks: the deepest dip, until the latest end', () => {
    vi.useFakeTimers();
    const { engine } = engineWithFake();
    engine.unlock();
    const g = gains(engine);
    engine.duck('hook');
    engine.duck('stamp');
    expect(g.duck.gain.target).toBe(Math.min(SOUND.duck.hook.to, SOUND.duck.stamp.to));
    vi.advanceTimersByTime(SOUND.duck.stamp.hold * 1000);
    expect(g.duck.gain.target).not.toBe(1);
    vi.advanceTimersByTime((SOUND.duck.hook.hold - SOUND.duck.stamp.hold) * 1000);
    expect(g.duck.gain.target).toBe(1);
  });

  test('the voice ducks until released', () => {
    vi.useFakeTimers();
    const { engine } = engineWithFake();
    engine.unlock();
    const g = gains(engine);
    engine.duck('voice', 0);
    vi.advanceTimersByTime(60_000);
    expect(g.duck.gain.target).toBe(SOUND.duck.voice.to);
    engine.release();
    expect(g.duck.gain.target).toBe(1);
  });
});

describe('quality', () => {
  test('never more voices at once than the cap; a voice frees its place when it ends', () => {
    const { engine, made } = engineWithFake();
    engine.unlock();
    for (let i = 0; i < SOUND.maxVoices; i += 1) {
      expect(engine.voice(1)).toBe(true);
    }
    expect(engine.voice(1)).toBe(false);
    expect(engine.voices).toBe(SOUND.maxVoices);
    made[0].advance(1.01);
    expect(engine.voices).toBe(0);
    expect(engine.voice(1)).toBe(true);
  });

  test('the tab hidden: everything fades out; shown again: back in', () => {
    const { engine } = engineWithFake();
    const stop = startSound(engine);
    engine.unlock();
    const { master } = gains(engine);
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(master.gain.target).toBe(0);
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(master.gain.target).toBeCloseTo(SOUND.master);
    stop();
  });
});

describe('the table from events to sounds', () => {
  test('a hook going forward ducks the ambience; stepping back onto one, no duck', () => {
    expect(soundFor({ type: 'hook', chapter: 'c', direction: 'forward' }, freshMemory())?.duck).toBe('hook');
    expect(soundFor({ type: 'hook', chapter: 'c', direction: 'backward' }, freshMemory())?.duck).toBeUndefined();
  });

  test('every stamp ducks the ambience', () => {
    for (const type of ['stamp:record', 'stamp:disputed', 'stamp:legend'] as const) {
      expect(soundFor({ type, evidence: 'e' }, freshMemory())?.duck).toBe('stamp');
    }
  });

  test('a moment with no row is silent', () => {
    expect(soundFor({ type: 'pile-hover' }, freshMemory())).toBeNull();
    expect(Object.keys(SOUND_TABLE).length).toBeGreaterThan(0);
  });

  test('connected: a stamp, after a gesture, ducks the ambience', () => {
    const { engine } = engineWithFake();
    const stop = startSound(engine);
    window.dispatchEvent(new Event('keydown'));
    emitStoryEvent({ type: 'stamp:legend', evidence: 'e1' });
    expect(gains(engine).duck.gain.target).toBe(SOUND.duck.stamp.to);
    stop();
  });
});

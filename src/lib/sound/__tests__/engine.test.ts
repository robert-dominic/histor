// @vitest-environment jsdom
// src/lib/sound/__tests__/engine.test.ts
// The sound engine (polish brief, B1), on a fake AudioContext: no sound before a gesture, the choice remembered,
// the ambience and the score ducking, the cap on voices, the tab's visibility, and the table from events to sounds.
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { SoundEngine } from '@/lib/sound/engine';
import { startSound } from '@/lib/sound';
import { SOUND, SOUND_STORAGE_KEY } from '@/lib/sound/levels';
import { SOUND_TABLE, freshMemory, soundFor } from '@/lib/sound/sound-map';
import { emitStoryEvent } from '@/lib/story-events';
import { FakeAudioContext, type FakeGain, fakeContextMaker } from '@/test/fake-audio';

function engineWithFake() {
  const maker = fakeContextMaker();
  const engine = new SoundEngine({ createContext: maker.create });
  return { engine, made: maker.made };
}
/** The engine's gains, in the order it builds them: master, then the two ducks, then the three buses. */
function gains(ctx: FakeAudioContext) {
  const [master, duckAmbience, duckScore, ambience, score, effects] = ctx.nodes.filter(node => node.kind === 'gain') as FakeGain[];
  return { master, duckAmbience, duckScore, ambience, score, effects };
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

  test('with the sound off, a gesture starts nothing', () => {
    localStorage.setItem(SOUND_STORAGE_KEY, '0');
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

describe('on and off, remembered', () => {
  test('on by default; turning it off is kept in histor:sound, and read back next time', () => {
    const first = engineWithFake().engine;
    expect(first.enabled).toBe(true);
    first.setEnabled(false);
    expect(localStorage.getItem(SOUND_STORAGE_KEY)).toBe('0');
    expect(new SoundEngine().enabled).toBe(false);
    first.setEnabled(true);
    expect(localStorage.getItem(SOUND_STORAGE_KEY)).toBe('1');
    expect(new SoundEngine().enabled).toBe(true);
  });

  test('off fades the master out (no click); on fades it back; a listener hears each change', () => {
    const { engine, made } = engineWithFake();
    engine.unlock();
    const { master } = gains(made[0]);
    expect(master.gain.target).toBeCloseTo(SOUND.master);
    const heard = vi.fn();
    engine.subscribe(heard);
    engine.setEnabled(false);
    expect(master.gain.target).toBe(0);
    expect(master.gain.events.some(event => event.kind === 'linear')).toBe(true);
    expect(engine.running).toBe(false);
    engine.setEnabled(true);
    expect(master.gain.target).toBeCloseTo(SOUND.master);
    expect(heard).toHaveBeenCalledTimes(2);
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
    expect(() => engine.setEnabled(false)).not.toThrow();
  });
});

describe('buses and ducking', () => {
  test('master, then ambience and score (each through a duck) and effects, at their levels', () => {
    const { engine, made } = engineWithFake();
    engine.unlock();
    const ctx = made[0];
    const g = gains(ctx);
    expect(g.master.connections).toContain(ctx.destination);
    expect(g.ambience.connections).toContain(g.duckAmbience);
    expect(g.score.connections).toContain(g.duckScore);
    expect(g.duckAmbience.connections).toContain(g.master);
    expect(g.effects.connections).toContain(g.master);
    expect(g.ambience.gain.value).toBe(SOUND.bus.ambience);
    expect(g.score.gain.value).toBe(SOUND.bus.score);
    expect(g.effects.gain.value).toBe(SOUND.bus.effects);
  });

  test('the ambience and the score dip under a stamp and come back after its hold; the effects never dip', () => {
    vi.useFakeTimers();
    const { engine, made } = engineWithFake();
    engine.unlock();
    const g = gains(made[0]);
    engine.duck('stamp');
    expect(g.duckAmbience.gain.target).toBe(SOUND.duck.stamp.to);
    expect(g.duckScore.gain.target).toBe(SOUND.duck.stamp.to);
    expect(g.effects.gain.events).toHaveLength(0);
    expect(engine.ducked).toBe(SOUND.duck.stamp.to);
    vi.advanceTimersByTime(SOUND.duck.stamp.hold * 1000);
    expect(g.duckAmbience.gain.target).toBe(1);
  });

  test('overlapping ducks: the deepest dip, until the latest end', () => {
    vi.useFakeTimers();
    const { engine, made } = engineWithFake();
    engine.unlock();
    const g = gains(made[0]);
    engine.duck('hook');
    engine.duck('stamp');
    expect(g.duckAmbience.gain.target).toBe(Math.min(SOUND.duck.hook.to, SOUND.duck.stamp.to));
    vi.advanceTimersByTime(SOUND.duck.stamp.hold * 1000);
    expect(g.duckAmbience.gain.target).not.toBe(1);
    vi.advanceTimersByTime((SOUND.duck.hook.hold - SOUND.duck.stamp.hold) * 1000);
    expect(g.duckAmbience.gain.target).toBe(1);
  });

  test('the voice ducks until released', () => {
    vi.useFakeTimers();
    const { engine, made } = engineWithFake();
    engine.unlock();
    const g = gains(made[0]);
    engine.duck('voice', 0);
    vi.advanceTimersByTime(60_000);
    expect(g.duckAmbience.gain.target).toBe(SOUND.duck.voice.to);
    engine.release();
    expect(g.duckAmbience.gain.target).toBe(1);
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
    const { engine, made } = engineWithFake();
    const stop = startSound(engine);
    engine.unlock();
    const { master } = gains(made[0]);
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
    const { engine, made } = engineWithFake();
    const stop = startSound(engine);
    window.dispatchEvent(new Event('keydown'));
    emitStoryEvent({ type: 'stamp:legend', evidence: 'e1' });
    expect(gains(made[0]).duckAmbience.gain.target).toBe(SOUND.duck.stamp.to);
    stop();
  });
});

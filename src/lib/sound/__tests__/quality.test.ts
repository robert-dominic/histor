// @vitest-environment jsdom
// src/lib/sound/__tests__/quality.test.ts
// The quality bar (polish brief, B6): nothing loud or sudden but the stamps, a modest master, no clicks, a cap on
// voices, long-running ambience, and under reduced motion nothing that starts by itself.
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import { startSound, useSoundChannel } from '@/lib/sound';
import { SoundEngine } from '@/lib/sound/engine';
import { SOUND } from '@/lib/sound/levels';
import { VOICES } from '@/lib/sound/voices';
import { emitStoryEvent } from '@/lib/story-events';
import { loadFakeSamples, FakeAudioContext, type FakeGain, fakeContextMaker } from '@/test/fake-audio';
import { SAMPLE_NAMES, samples } from '@/lib/sound/samples';
import { stubMatchMedia } from '@/test/match-media';
import { renderHook } from '@testing-library/react';

/** The loudest point of a recipe: the highest level any of its envelopes reaches. */
function peakOf(name: keyof typeof VOICES): number {
  const ctx = new FakeAudioContext();
  VOICES[name].play(ctx as unknown as AudioContext, ctx.createGain() as unknown as AudioNode, { at: 0, gain: 1, pitch: 1 });
  return Math.max(
    ...ctx.nodes
      .filter(node => node.kind === 'gain')
      .flatMap(node => (node as FakeGain).gain.events.filter(event => event.kind !== 'cancel').map(event => event.value))
  );
}

beforeEach(() => {
  localStorage.clear();
  stubMatchMedia();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('nothing loud or sudden except the stamps', () => {
  test('the heavy stamp is the loudest sound; everything else sits well under it', () => {
    const stamp = peakOf('thud-heavy');
    const names = Object.keys(VOICES) as (keyof typeof VOICES)[];
    for (const name of names.filter(name => !name.startsWith('thud'))) {
      expect(peakOf(name), name).toBeLessThanOrEqual(stamp * 0.7);
    }
    expect(Math.max(...names.map(peakOf))).toBe(stamp);
  });

  test('a modest master, and quiet buses: the score quietest of all', () => {
    expect(SOUND.master).toBeLessThanOrEqual(0.6);
    expect(SOUND.bus.score).toBeLessThan(SOUND.bus.ambience);
    expect(SOUND.bus.ambience).toBeLessThan(SOUND.bus.effects);
  });

  test('the ambience fades in from silence: no layer starts at once', () => {
    const maker = fakeContextMaker();
    const engine = new SoundEngine({ createContext: maker.create });
    const stop = startSound(engine, { generated: true });
    emitStoryEvent({ type: 'place', place: 'story', ambience: maryCeleste.theme.ambience });
    engine.unlock();
    const ctx = maker.made[0];
    const ambienceBus = engine.nodes!.bus.ambience as unknown as (typeof ctx.nodes)[number];
    const layers = ctx.nodes.filter(node => node.kind === 'gain' && node.connections.includes(ambienceBus)) as FakeGain[];
    expect(layers.length).toBe(3);
    for (const layer of layers) {
      expect(layer.gain.value).toBe(0);
      expect(layer.gain.events.some(event => event.kind === 'linear' && event.value > 0 && event.time >= 2)).toBe(true);
    }
    stop();
  });
});

describe('CPU', () => {
  test('a flood of moments never plays more voices at once than the cap', () => {
    const maker = fakeContextMaker();
    const engine = new SoundEngine({ createContext: maker.create });
    const stop = startSound(engine, { generated: true });
    loadFakeSamples(samples, SAMPLE_NAMES);
    engine.unlock();
    for (let i = 0; i < 40; i += 1) {
      emitStoryEvent({ type: 'stamp-hit' });
    }
    expect(engine.voices).toBe(SOUND.maxVoices);
    stop();
  });
});

describe('reduced motion: sound still works, but nothing starts by itself', () => {
  test('a gesture alone does not start it; the player\'s own choice does', () => {
    stubMatchMedia({ reducedMotion: true });
    const maker = fakeContextMaker();
    const engine = new SoundEngine({ createContext: maker.create });
    const stop = startSound(engine, { generated: true });
    window.dispatchEvent(new Event('pointerdown'));
    window.dispatchEvent(new Event('keydown'));
    expect(maker.made).toHaveLength(0);
    // The header's toggle, pressed while on but not yet started: it starts the sound (it does not mute it).
    const { result } = renderHook(() => useSoundChannel('effects', engine));
    result.current.setOn(false);
    expect(maker.made).toHaveLength(1);
    expect(engine.enabled).toBe(true);
    expect(engine.running).toBe(true);
    stop();
  });

  test('with full motion, the first gesture starts it', () => {
    const maker = fakeContextMaker();
    const engine = new SoundEngine({ createContext: maker.create });
    const stop = startSound(engine, { generated: true });
    window.dispatchEvent(new Event('pointerdown'));
    expect(maker.made).toHaveLength(1);
    stop();
  });
});

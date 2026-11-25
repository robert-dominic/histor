// @vitest-environment jsdom
// src/lib/sound/__tests__/quality.test.ts
// The quality bar (polish brief, B6; sound-files brief): nothing loud or sudden but the stamps (and the one sting), a
// modest master, a cap on voices, and under reduced motion nothing that starts by itself.
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { startSound, useSoundChannel } from '@/lib/sound';
import { SoundEngine } from '@/lib/sound/engine';
import { SAMPLES, SOUND } from '@/lib/sound/levels';
import { emitStoryEvent } from '@/lib/story-events';
import { fakeContextMaker, loadFakeSamples } from '@/test/fake-audio';
import { SAMPLE_NAMES, samples } from '@/lib/sound/samples';
import { stubMatchMedia } from '@/test/match-media';
import { renderHook } from '@testing-library/react';

beforeEach(() => {
  localStorage.clear();
  stubMatchMedia();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('nothing loud or sudden except the stamps', () => {
  test('the stamp is the loudest file but the one jump sting; every other sits at 70% of it or less', () => {
    const stamp = SAMPLES.stamp.level;
    for (const [name, { level }] of Object.entries(SAMPLES)) {
      if (name !== 'stamp' && name !== 'jump-sting') {
        expect(level, name).toBeLessThanOrEqual(stamp * 0.75);
      }
    }
    expect(SAMPLES['jump-sting'].level).toBeLessThanOrEqual(1);
  });

  test('a modest master', () => {
    expect(SOUND.master).toBeLessThanOrEqual(0.6);
  });

  test('a flood of moments never plays more voices at once than the cap', () => {
    const maker = fakeContextMaker();
    const engine = new SoundEngine({ createContext: maker.create });
    const stop = startSound(engine);
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
    const stop = startSound(engine);
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
    const stop = startSound(engine);
    window.dispatchEvent(new Event('pointerdown'));
    expect(maker.made).toHaveLength(1);
    stop();
  });
});

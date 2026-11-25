// @vitest-environment jsdom
// src/lib/sound/__tests__/dread-sounds.test.ts
// The creepier sound layer, kept under control (dread pass, 7): every sound has a category; one dread sound at a
// time, at least 6s apart (the jump sting excepted); ui and paper sounds have their own cooldowns; the heartbeat at
// the verdict quickens the longer the hover; too quiet on the desk brings a distant creak, at most every 90s; the
// music on the desk at half its story level.
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { startSound } from '@/lib/sound';
import { SoundEngine } from '@/lib/sound/engine';
import { MIX, MUSIC, SAMPLES } from '@/lib/sound/levels';
import { SAMPLE_NAMES, mixerAllows, samples } from '@/lib/sound/samples';
import { emitStoryEvent, onStoryEvent } from '@/lib/story-events';
import { type FakeAudioContext, type FakeParam, type FakeSource, fakeContextMaker, loadFakeSamples } from '@/test/fake-audio';

function setUp() {
  loadFakeSamples(samples, SAMPLE_NAMES);
  const maker = fakeContextMaker();
  const engine = new SoundEngine({ createContext: maker.create });
  const stop = startSound(engine);
  engine.unlock();
  return { engine, stop, ctx: maker.made[0] as FakeAudioContext };
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => {
  emitStoryEvent({ type: 'place', place: 'away' });
  vi.useRealTimers();
});

describe('the mixer', () => {
  test('every sound has a category: ui, paper, dread, ambience or music', () => {
    for (const { category } of Object.values(SAMPLES)) {
      expect(['ui', 'paper', 'dread', 'ambience', 'music']).toContain(category);
    }
    expect(SAMPLES.eye.category).toBe('dread');
    expect(SAMPLES.click.category).toBe('ui');
    expect(SAMPLES.pin.category).toBe('paper');
  });

  test('one dread sound at a time, at least 6s apart; the jump sting always plays', () => {
    const { ctx } = setUp();
    const raw = ctx as unknown as BaseAudioContext;
    expect(mixerAllows(raw, 'dread-1', 4000)).toBe(true);
    ctx.advance(2);
    expect(mixerAllows(raw, 'eye', 1000)).toBe(false);
    ctx.advance(4.5);
    expect(mixerAllows(raw, 'creak', 1000)).toBe(true);
    expect(mixerAllows(raw, 'jump-sting', 4000)).toBe(true);
    expect(MIX.dreadGapMs).toBeGreaterThanOrEqual(6000);
  });

  test('a ui or paper sound waits its own cooldown', () => {
    const { ctx } = setUp();
    const raw = ctx as unknown as BaseAudioContext;
    expect(mixerAllows(raw, 'click', 200)).toBe(true);
    expect(mixerAllows(raw, 'click', 200)).toBe(false);
    ctx.advance(SAMPLES.click.cooldownMs / 1000 + 0.01);
    expect(mixerAllows(raw, 'click', 200)).toBe(true);
    // Another sound is not held up by it.
    expect(mixerAllows(raw, 'pin', 200)).toBe(true);
  });
});

describe('the verdict\'s heartbeat', () => {
  test('it quickens, slowly, the longer the hover; and stops', () => {
    const { ctx, stop } = setUp();
    emitStoryEvent({ type: 'place', place: 'desk' });
    emitStoryEvent({ type: 'heartbeat', on: true });
    const beat = ctx.started.filter(source => source.loop).at(-1) as FakeSource;
    const rate = beat.playbackRate as unknown as FakeParam;
    expect(rate.events.some(event => event.kind === 'linear' && event.value === MIX.heartbeat.quickenTo)).toBe(true);
    emitStoryEvent({ type: 'heartbeat', on: false });
    vi.advanceTimersByTime(1000);
    expect(beat.stoppedAt).not.toBeNull();
    stop();
  });
});

describe('too quiet for too long', () => {
  test('25s without input on the desk: a distant creak; at most once every 90s; never away from the desk', () => {
    const { stop } = setUp();
    const quiet: number[] = [];
    const listen = onStoryEvent(event => event.type === 'quiet' && quiet.push(Date.now()));
    emitStoryEvent({ type: 'place', place: 'story' });
    vi.advanceTimersByTime(MIX.quietMs * 2);
    expect(quiet).toHaveLength(0);
    emitStoryEvent({ type: 'place', place: 'desk' });
    vi.advanceTimersByTime(MIX.quietMs - 6000);
    expect(quiet).toHaveLength(0);
    vi.advanceTimersByTime(12000);
    expect(quiet).toHaveLength(1);
    vi.advanceTimersByTime(MIX.creakEveryMs - 20000);
    expect(quiet).toHaveLength(1);
    vi.advanceTimersByTime(30000);
    expect(quiet).toHaveLength(2);
    // An input resets the quiet.
    window.dispatchEvent(new Event('pointermove'));
    vi.advanceTimersByTime(MIX.quietMs - 6000);
    expect(quiet).toHaveLength(2);
    listen();
    stop();
  });
});

describe('the music on the desk', () => {
  test('about half its story level (kept for when music comes back)', () => {
    expect(MUSIC.level.desk).toBeCloseTo(MUSIC.level.story / 2, 2);
  });
});

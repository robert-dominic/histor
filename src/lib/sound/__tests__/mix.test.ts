// @vitest-environment jsdom
// src/lib/sound/__tests__/mix.test.ts
// The mix: one thing in focus (sound-files brief, 4). Every file plays through its tier; a higher tier dips the ones
// below while it plays, the voice for as long as it speaks; the room tone is low on the desk and drops under the
// murmur; the question's loop fades in under the question and out as the fork opens; the heartbeat fades over 0.5s.
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { startSound } from '@/lib/sound';
import { SoundEngine } from '@/lib/sound/engine';
import { MIX, SAMPLES, TIERS } from '@/lib/sound/levels';
import { mix } from '@/lib/sound/mix';
import { SAMPLE_NAMES, samples } from '@/lib/sound/samples';
import { emitStoryEvent } from '@/lib/story-events';
import { type FakeGain, type FakeSource, fakeContextMaker, loadFakeSamples } from '@/test/fake-audio';

function setUp() {
  loadFakeSamples(samples, SAMPLE_NAMES);
  const maker = fakeContextMaker();
  const engine = new SoundEngine({ createContext: maker.create });
  const stop = startSound(engine);
  engine.unlock();
  return { engine, stop, ctx: maker.made[0] };
}
/** The loops playing now, by the file they play. */
const loopsOn = (ctx: ReturnType<typeof setUp>['ctx']) =>
  ctx.started.filter(source => source.loop && source.stoppedAt === null).map(source => source.buffer);
const target = (tier: (typeof TIERS)[number]) => (mix.gain(tier) as unknown as FakeGain).gain.target;

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => {
  emitStoryEvent({ type: 'place', place: 'away' });
  vi.useRealTimers();
});

describe('the priority order', () => {
  test('voice > stamp > dread > question > file > writing > ui > loops, and every file has a tier in it', () => {
    expect([...TIERS]).toEqual(['voice', 'stamp', 'dread', 'question', 'file', 'writing', 'ui', 'loop']);
    expect(SAMPLES.stamp.tier).toBe('stamp');
    expect(SAMPLES['jump-sting'].tier).toBe('dread');
    expect(SAMPLES['dread-1'].tier).toBe('dread');
    expect(SAMPLES.pin.tier).toBe('file');
    expect(SAMPLES['typewriter-ding'].tier).toBe('writing');
    expect(SAMPLES.click.tier).toBe('ui');
    expect(SAMPLES['room-tone'].tier).toBe('loop');
  });

  test('a stamp dips everything below it while it plays, and they come back after; nothing above it moves', () => {
    const { engine, stop } = setUp();
    emitStoryEvent({ type: 'stamp-hit' });
    for (const tier of ['dread', 'file', 'writing', 'ui', 'loop'] as const) {
      expect(target(tier), tier).toBe(MIX.focusDuck);
    }
    expect(target('voice')).toBe(1);
    // As it ends, they come back.
    (engine.context as unknown as { advance: (seconds: number) => void }).advance(1);
    vi.advanceTimersByTime(1000);
    expect(target('file')).toBe(1);
    stop();
  });

  test('a click dips only the loops', () => {
    const { stop } = setUp();
    emitStoryEvent({ type: 'ui-click' });
    expect(target('loop')).toBe(MIX.focusDuck);
    expect(target('writing')).toBe(1);
    stop();
  });

  test('the voice holds every file down for as long as it speaks', () => {
    const { engine, stop } = setUp();
    mix.focus(engine, 'voice', Number.POSITIVE_INFINITY);
    expect(target('stamp')).toBe(MIX.focusDuck);
    vi.advanceTimersByTime(60_000);
    expect(target('stamp')).toBe(MIX.focusDuck);
    mix.end(engine, 'voice');
    expect(target('stamp')).toBe(1);
    stop();
  });
});

describe('the loops', () => {
  test('the room tone plays very low on the desk, and drops under the murmur while ghost text is on screen', () => {
    const { ctx, stop } = setUp();
    emitStoryEvent({ type: 'place', place: 'desk' });
    const room = ctx.started.find(source => source.loop)! as FakeSource;
    const roomGain = room.connections[0] as FakeGain;
    expect(roomGain.gain.target).toBeCloseTo(SAMPLES['room-tone'].level * MIX.roomTone.level);
    emitStoryEvent({ type: 'ghosts', count: 1 });
    expect(roomGain.gain.target).toBeCloseTo(SAMPLES['room-tone'].level * MIX.roomTone.underMurmur);
    expect(loopsOn(ctx)).toHaveLength(2);
    const murmurGain = ctx.started.filter(source => source.loop).at(-1)!.connections[0] as FakeGain;
    const one = murmurGain.gain.target;
    emitStoryEvent({ type: 'ghosts', count: 2 });
    expect(murmurGain.gain.target).toBeGreaterThan(one);
    emitStoryEvent({ type: 'ghosts', count: 0 });
    expect(murmurGain.gain.target).toBe(0);
    expect(roomGain.gain.target).toBeCloseTo(SAMPLES['room-tone'].level * MIX.roomTone.level);
    stop();
  });

  test('the question fades in under the question and out as the fork opens; back if the fork closes on it', () => {
    const { ctx, stop } = setUp();
    emitStoryEvent({ type: 'place', place: 'story' });
    emitStoryEvent({ type: 'question-line', index: 0, direction: 'forward' });
    const question = ctx.started.find(source => source.loop)!;
    const gain = question.connections[0] as FakeGain;
    expect(gain.gain.target).toBeCloseTo(SAMPLES.question.level);
    emitStoryEvent({ type: 'modal', name: 'fork', open: true });
    expect(gain.gain.target).toBe(0);
    emitStoryEvent({ type: 'modal', name: 'fork', open: false });
    expect(gain.gain.target).toBeCloseTo(SAMPLES.question.level);
    stop();
  });

  test('the heartbeat fades in and out over about half a second', () => {
    expect(MIX.heartbeat.fade).toBe(0.5);
    const { ctx, stop } = setUp();
    emitStoryEvent({ type: 'place', place: 'desk' });
    emitStoryEvent({ type: 'heartbeat', on: true });
    const beat = ctx.started.filter(source => source.loop).at(-1)!;
    const gain = beat.connections[0] as FakeGain;
    expect(gain.gain.target).toBeCloseTo(SAMPLES.heartbeat.level);
    emitStoryEvent({ type: 'heartbeat', on: false });
    expect(gain.gain.target).toBe(0);
    vi.advanceTimersByTime(600);
    expect(beat.stoppedAt).not.toBeNull();
    stop();
  });
});

describe('the hook screen\'s sea and wind', () => {
  test('they play under the hook screen in the story, fade out as it ends, and never at the desk', () => {
    const { ctx, stop } = setUp();
    emitStoryEvent({ type: 'place', place: 'story' });
    expect(ctx.started.filter(source => source.loop)).toHaveLength(0);
    emitStoryEvent({ type: 'hook-screen', on: true });
    const noises = ctx.started.filter(source => source.loop);
    expect(noises).toHaveLength(2);
    emitStoryEvent({ type: 'hook-screen', on: false });
    vi.advanceTimersByTime(MIX.hookAmbience.fadeOut * 1000 + 300);
    expect(noises.every(source => source.stoppedAt !== null)).toBe(true);
    // Said again at the desk, where it does not belong: nothing starts.
    emitStoryEvent({ type: 'place', place: 'desk' });
    const before = ctx.started.length;
    emitStoryEvent({ type: 'hook-screen', on: true });
    expect(ctx.started.length).toBe(before);
    stop();
  });
});

describe('the room tone (the fix list)', () => {
  test('on the desk only: not on the verdict or the report', () => {
    const { ctx, stop } = setUp();
    emitStoryEvent({ type: 'place', place: 'desk' });
    const room = ctx.started.find(source => source.loop)!;
    const gain = room.connections[0] as FakeGain;
    expect(gain.gain.target).toBeGreaterThan(0);
    emitStoryEvent({ type: 'place', place: 'verdict' });
    expect(gain.gain.target).toBe(0);
    stop();
  });

  test('its 16s loop is seamless: each pass starts as the last fades, and the two cross over', () => {
    const { ctx, stop } = setUp();
    samples.set('room-tone', { duration: 16, length: 128000, numberOfChannels: 2, sampleRate: 8000 } as AudioBuffer);
    emitStoryEvent({ type: 'place', place: 'desk' });
    const first = ctx.started.at(-1)!;
    expect(first.loop).toBe(false);
    expect(first.stoppedAt).toBeCloseTo(16.05, 2);
    // A moment before the seam, the next pass is made, to start as the first begins to fade.
    ctx.advance(16 - MIX.roomTone.crossfade - 1);
    vi.advanceTimersByTime((16 - MIX.roomTone.crossfade - 1) * 1000 + 10);
    const second = ctx.started.at(-1)!;
    expect(second).not.toBe(first);
    expect(second.startedAt).toBeCloseTo(16 - MIX.roomTone.crossfade, 5);
    const firstFade = (first.connections[0] as FakeGain).gain.events.filter(event => event.kind === 'linear');
    const secondFade = (second.connections[0] as FakeGain).gain.events.filter(event => event.kind === 'linear');
    // The first fades out over the crossfade while the second fades in over it.
    expect(firstFade.at(-1)).toMatchObject({ value: 0, time: 16 });
    expect(secondFade[0]).toMatchObject({ value: 1, time: 16 });
    samples.set('room-tone', { duration: 0.5, length: 4000, numberOfChannels: 1, sampleRate: 8000 } as AudioBuffer);
    stop();
  });
});

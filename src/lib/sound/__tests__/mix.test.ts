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
    expect(SAMPLES['question-pulse'].tier).toBe('question');
    expect(SAMPLES.pin.tier).toBe('file');
    expect(SAMPLES['typewriter-key'].tier).toBe('writing');
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

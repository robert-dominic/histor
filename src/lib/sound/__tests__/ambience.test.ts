// @vitest-environment jsdom
// src/lib/sound/__tests__/ambience.test.ts
// The case's ambience (polish brief, B2), on a fake AudioContext: the layers of the place the player is in, from
// the case's theme; silence without one; the story's darkness; the timber's creaks; nothing before a gesture.
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import { startSound } from '@/lib/sound';
import { Ambience, layerLevel } from '@/lib/sound/ambience';
import { SoundEngine } from '@/lib/sound/engine';
import { AMBIENCE, SOUND } from '@/lib/sound/levels';
import { emitStoryEvent } from '@/lib/story-events';
import { FakeAudioContext, type FakeSource, fakeContextMaker } from '@/test/fake-audio';

const recipe = maryCeleste.theme.ambience!;

function connected() {
  const maker = fakeContextMaker();
  const engine = new SoundEngine({ createContext: maker.create });
  const stop = startSound(engine);
  return { engine, made: maker.made, stop };
}
const sources = (ctx: FakeAudioContext) => ctx.started;
const looping = (ctx: FakeAudioContext) => ctx.started.filter(source => source.kind === 'buffer' && source.loop);

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('the ambience follows the place', () => {
  test('nothing before a gesture; then the story\'s sea, wind and timber', () => {
    const { engine, made, stop } = connected();
    emitStoryEvent({ type: 'place', place: 'story', ambience: recipe });
    expect(made).toHaveLength(0);
    engine.unlock();
    const ctx = made[0];
    // The sea and the wind: looping noise, long-running. The timber has no node until it creaks.
    expect(looping(ctx)).toHaveLength(2);
    stop();
  });

  test('a few long-running nodes: nothing new is made while it plays, but for the occasional creak or gust', () => {
    const { engine, made, stop } = connected();
    emitStoryEvent({ type: 'place', place: 'story', ambience: recipe });
    engine.unlock();
    const ctx = made[0];
    const before = ctx.nodes.length;
    vi.advanceTimersByTime(7_000);
    expect(ctx.nodes.length).toBe(before);
    stop();
  });

  test('the timber creaks now and then, every 8 to 20 seconds: a short, resonant pulse with an envelope', () => {
    const { engine, made, stop } = connected();
    emitStoryEvent({ type: 'place', place: 'story', ambience: recipe });
    engine.unlock();
    const ctx = made[0];
    vi.advanceTimersByTime(AMBIENCE.timber.every[1] * 1000 + 10);
    const creaks = sources(ctx).filter(source => source.kind === 'oscillator' && source.type === 'sawtooth');
    expect(creaks.length).toBeGreaterThanOrEqual(1);
    expect((creaks[0] as FakeSource).stoppedAt).not.toBeNull();
    stop();
  });

  test('at the desk: a room tone, a lamp\'s hum and the sea far away; the story\'s layers fade out', () => {
    const { engine, made, stop } = connected();
    emitStoryEvent({ type: 'place', place: 'story', ambience: recipe });
    engine.unlock();
    const ctx = made[0];
    const storyLoops = looping(ctx);
    emitStoryEvent({ type: 'place', place: 'away' });
    emitStoryEvent({ type: 'place', place: 'desk', ambience: recipe });
    vi.advanceTimersByTime((AMBIENCE.fadeOut + 0.5) * 1000);
    expect(storyLoops.every(source => source.stoppedAt !== null)).toBe(true);
    // Room tone and distant sea loop; the lamp hums on two oscillators.
    expect(looping(ctx).filter(source => source.stoppedAt === null)).toHaveLength(2);
    const hums = sources(ctx).filter(source => source.kind === 'oscillator' && source.frequency.value === 60);
    expect(hums).toHaveLength(1);
    stop();
  });

  test('a case without an ambience is silent; leaving the case fades it all out', () => {
    const { engine, made, stop } = connected();
    emitStoryEvent({ type: 'place', place: 'story' });
    engine.unlock();
    expect(looping(made[0])).toHaveLength(0);
    emitStoryEvent({ type: 'place', place: 'story', ambience: recipe });
    expect(looping(made[0])).toHaveLength(2);
    emitStoryEvent({ type: 'place', place: 'away' });
    vi.advanceTimersByTime((AMBIENCE.fadeOut + 0.5) * 1000);
    expect(looping(made[0]).every(source => source.stoppedAt !== null)).toBe(true);
    stop();
  });

  test('turning the sound off stops the layers once the master has faded; on again, they start again', () => {
    const { engine, made, stop } = connected();
    emitStoryEvent({ type: 'place', place: 'story', ambience: recipe });
    engine.unlock();
    const first = looping(made[0]);
    engine.setEnabled(false);
    expect(first.every(source => source.stoppedAt === null)).toBe(true);
    vi.advanceTimersByTime((SOUND.toggleFade + 0.2) * 1000);
    expect(first.every(source => source.stoppedAt !== null)).toBe(true);
    engine.setEnabled(true);
    expect(looping(made[0]).filter(source => source.stoppedAt === null)).toHaveLength(2);
    stop();
  });
});

describe('day into night', () => {
  test('as the story darkens, the sea gets lower and the wind louder', () => {
    expect(layerLevel('sea', 1)).toBeLessThan(layerLevel('sea', 0));
    expect(layerLevel('wind', 1)).toBeGreaterThan(layerLevel('wind', 0));
    expect(layerLevel('lamp-hum', 1)).toBe(layerLevel('lamp-hum', 0));
  });

  test('a chapter\'s depth moves the layers that are playing', () => {
    const maker = fakeContextMaker();
    const ctx = maker.create();
    const ambience = new Ambience();
    const out = ctx.createGain();
    ambience.set(ctx, out, ['sea', 'wind']);
    ambience.setDarkness(ctx, 1);
    const layerGains = (ctx as unknown as FakeAudioContext).nodes.filter(node => node.kind === 'gain' && node.connections.includes(out)) as unknown as { gain: { target: number } }[];
    expect(layerGains.map(gain => gain.gain.target)).toEqual([layerLevel('sea', 1), layerLevel('wind', 1)]);
    ambience.stopAll();
  });
});

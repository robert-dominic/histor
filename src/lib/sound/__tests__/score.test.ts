// @vitest-environment jsdom
// src/lib/sound/__tests__/score.test.ts
// The score (polish brief, B2b), on a fake AudioContext: a quiet pad of long minor chords on its own bus, darker as
// the story goes on, thinned to the drone at a hook, almost nothing at the question, a single low tone at the desk.
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { startSound } from '@/lib/sound';
import { SoundEngine } from '@/lib/sound/engine';
import { SCORE, SOUND } from '@/lib/sound/levels';
import { Score } from '@/lib/sound/score';
import { emitStoryEvent } from '@/lib/story-events';
import { type FakeAudioContext, type FakeGain, type FakeSource, fakeContextMaker } from '@/test/fake-audio';

function scoreOn() {
  const maker = fakeContextMaker();
  const ctx = maker.create();
  const bus = ctx.createGain();
  const fake = ctx as unknown as FakeAudioContext;
  return { score: new Score(), ctx, bus, fake };
}
/** The pad's own level: the gain connected to the bus. */
const padLevel = (fake: FakeAudioContext, bus: AudioNode) =>
  (fake.nodes.find(node => node.kind === 'gain' && node.connections.includes(bus)) as FakeGain).gain.target;
/** The oscillators, and how loud each voice is heading. */
const oscillators = (fake: FakeAudioContext) => fake.started.filter(source => source.kind === 'oscillator') as FakeSource[];
const voiceLevels = (fake: FakeAudioContext) =>
  oscillators(fake).map(osc => (osc.connections[0] as FakeGain).gain.target);

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe('the score', () => {
  test('a pad of soft, detuned oscillators through a low-pass: long-running, made once', () => {
    const { score, ctx, bus, fake } = scoreOn();
    score.set(ctx, bus, 'story', 0);
    expect(oscillators(fake)).toHaveLength(2 * SCORE.voices.length);
    const filter = fake.nodes.find(node => node.kind === 'filter') as unknown as { type: string };
    expect(filter.type).toBe('lowpass');
    // Two roots detuned against each other.
    expect(oscillators(fake).slice(0, 2).map(osc => osc.detune.value)).toEqual([-SCORE.detune, SCORE.detune]);
    const made = fake.nodes.length;
    vi.advanceTimersByTime(60_000);
    expect(fake.nodes.length).toBe(made);
    score.stop();
  });

  test('a minor chord, changing rarely: every 10 to 20 seconds', () => {
    const { score, ctx, bus } = scoreOn();
    score.set(ctx, bus, 'story', 0);
    const first = score.notes;
    // Minor: a minor third and a fifth above the root.
    expect([first[1] - first[0], first[2] - first[0]]).toEqual([3, 7]);
    vi.advanceTimersByTime(SCORE.change[0] * 1000 - 100);
    expect(score.notes).toEqual(first);
    vi.advanceTimersByTime((SCORE.change[1] - SCORE.change[0]) * 1000 + 200);
    expect(score.notes).not.toEqual(first);
    score.stop();
  });

  test('each chapter a little darker: lower chords', () => {
    const { score, ctx, bus } = scoreOn();
    score.set(ctx, bus, 'story', 0);
    const day = score.notes;
    score.set(ctx, bus, 'story', 1);
    expect(score.notes.map((note, index) => day[index] - note)).toEqual([SCORE.darkSemitones, SCORE.darkSemitones, SCORE.darkSemitones]);
    score.stop();
  });

  test('a hook thins it to the drone: only the roots', () => {
    const { score, ctx, bus, fake } = scoreOn();
    score.set(ctx, bus, 'hook');
    const levels = voiceLevels(fake).slice(0, SCORE.voices.length);
    expect(levels).toEqual([SCORE.voices[0], SCORE.voices[1], 0, 0]);
    score.stop();
  });

  test('the question drops it to almost nothing', () => {
    const { score, ctx, bus, fake } = scoreOn();
    score.set(ctx, bus, 'question');
    expect(padLevel(fake, bus)).toBe(SCORE.mood.question);
    expect(SCORE.mood.question).toBeLessThan(0.2);
    score.stop();
  });

  test('at the desk: a single low held tone that moves rarely', () => {
    const { score, ctx, bus, fake } = scoreOn();
    score.set(ctx, bus, 'desk');
    expect(score.notes).toHaveLength(1);
    expect(score.notes[0]).toBeLessThan(40);
    expect(voiceLevels(fake).slice(0, SCORE.voices.length)).toEqual([SCORE.voices[0], 0, 0, 0]);
    const tone = score.notes;
    vi.advanceTimersByTime(SCORE.deskChange[0] * 1000 - 100);
    expect(score.notes).toEqual(tone);
    score.stop();
  });
});

describe('connected to the story', () => {
  test('its own bus with its own level, under the effects; it follows the place, the hooks and the question', () => {
    const maker = fakeContextMaker();
    const engine = new SoundEngine({ createContext: maker.create });
    const stop = startSound(engine);
    emitStoryEvent({ type: 'place', place: 'story' });
    engine.unlock();
    const fake = maker.made[0];
    const scoreBus = fake.nodes.filter(node => node.kind === 'gain')[4] as FakeGain;
    expect(scoreBus.gain.value).toBe(SOUND.bus.score);
    expect(SOUND.bus.score).toBeLessThan(SOUND.bus.effects);
    expect(padLevel(fake, scoreBus as unknown as AudioNode)).toBe(SCORE.mood.story);
    emitStoryEvent({ type: 'hook', chapter: 'c', direction: 'forward' });
    expect(padLevel(fake, scoreBus as unknown as AudioNode)).toBe(SCORE.mood.hook);
    emitStoryEvent({ type: 'question-line', index: 0, direction: 'forward' });
    expect(padLevel(fake, scoreBus as unknown as AudioNode)).toBe(SCORE.mood.question);
    emitStoryEvent({ type: 'place', place: 'away' });
    vi.advanceTimersByTime(100);
    expect(padLevel(fake, scoreBus as unknown as AudioNode)).toBe(0);
    stop();
  });
});

// @vitest-environment jsdom
// src/lib/sound/__tests__/story-sounds.test.ts
// The story's sounds (polish brief, B3): the table's rows, the pen's throttle, the ship's bell once, the hook's
// drone, and every recipe shaped by an envelope (no clicks).
import { beforeEach, describe, expect, test, vi } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import { startSound } from '@/lib/sound';
import { SoundEngine } from '@/lib/sound/engine';
import { SOUND } from '@/lib/sound/levels';
import { freshMemory, soundFor, type SoundRow } from '@/lib/sound/sound-map';
import { DREAD_POOL, VOICES } from '@/lib/sound/voices';
import { HOOK_SOUNDS } from '@/types/case';
import { emitStoryEvent, type StoryEvent } from '@/lib/story-events';
import { FakeAudioContext, type FakeGain, fakeContextMaker } from '@/test/fake-audio';

const sounds = (row: SoundRow | null) => row?.cues?.map(cue => cue.sound) ?? [];

beforeEach(() => {
  localStorage.clear();
  vi.useRealTimers();
});

describe('the story\'s rows', () => {
  test('a chapter enters: a soft low swell; going back, no swell', () => {
    expect(sounds(soundFor({ type: 'chapter-enter', chapter: 's-one', direction: 'forward' }, freshMemory()))).toEqual(['swell']);
    expect(sounds(soundFor({ type: 'chapter-enter', chapter: 's-one', direction: 'backward' }, freshMemory()))).toEqual([]);
  });

  test('the pen: a faint scratch, throttled to about 12 a second, however fast it writes', () => {
    const memory = freshMemory();
    const pen: StoryEvent = { type: 'pen' };
    expect(sounds(soundFor(pen, memory, 1000))).toEqual(['scratch']);
    expect(soundFor(pen, memory, 1020)).toBeNull();
    expect(soundFor(pen, memory, 1000 + 1000 / SOUND.penTicksPerSecond - 1)).toBeNull();
    expect(sounds(soundFor(pen, memory, 1000 + Math.ceil(1000 / SOUND.penTicksPerSecond)))).toEqual(['scratch']);
    // A second of fast writing (a letter every 10ms): at most 12 scratches.
    const quick = freshMemory();
    const ticks = Array.from({ length: 100 }, (_, index) => soundFor(pen, quick, 5000 + index * 10)).filter(row => row !== null);
    expect(ticks.length).toBeLessThanOrEqual(SOUND.penTicksPerSecond);
  });

  test('a hook arrives: a deep drone fades in under it, one dread sound from the pool, and the ambience ducks', () => {
    const row = soundFor({ type: 'hook', chapter: 'c', direction: 'forward' }, freshMemory());
    expect(row).toMatchObject({ duck: 'hook', drone: 'in' });
    expect(Object.values(DREAD_POOL)).toContain(row!.cues![0].sound);
  });

  test('the dread pool (review-fixes 7): six distinct sounds, each hook a different one from the last', () => {
    expect(new Set(Object.values(DREAD_POOL)).size).toBe(6);
    expect(Object.keys(DREAD_POOL).sort()).toEqual([...HOOK_SOUNDS].sort());
    const memory = freshMemory();
    let last: string | null = null;
    const heard = new Set<string>();
    for (let i = 0; i < 300; i += 1) {
      const sound = soundFor({ type: 'hook', chapter: 'c', direction: 'forward' }, memory)!.cues![0].sound;
      expect(sound).not.toBe(last);
      heard.add(sound);
      last = sound;
    }
    expect(heard.size).toBe(6);
  });

  test("a chapter's own hook sound wins over the pool, forward and back", () => {
    const memory = freshMemory();
    expect(soundFor({ type: 'hook', chapter: 'c', direction: 'forward', sound: 'thunder' }, memory)!.cues).toEqual([{ sound: 'dread-thunder' }]);
    expect(soundFor({ type: 'hook', chapter: 'c', direction: 'backward', sound: 'scrape' }, memory)!.cues).toEqual([{ sound: 'dread-scrape' }]);
    // The pool's next pick is not the one just heard.
    memory.random = () => 0;
    expect(soundFor({ type: 'hook', chapter: 'd', direction: 'forward' }, memory)!.cues![0].sound).not.toBe('dread-scrape');
  });

  test('the hook decays: a soft reversed whoosh, and the drone goes', () => {
    expect(soundFor({ type: 'hook-out', chapter: 'c', direction: 'forward' }, freshMemory())).toEqual({ cues: [{ sound: 'whoosh' }], drone: 'out' });
  });

  test('names un-writing: a breathy hiss each, falling in pitch', () => {
    const pitches = [0, 1, 2, 3].map(order => soundFor({ type: 'roll-call-out', chapter: 'c', name: 'n', order, direction: 'forward' }, freshMemory())!.cues![0]);
    expect(pitches.every(cue => cue.sound === 'hiss')).toBe(true);
    const values = pitches.map(cue => cue.pitch!);
    expect([...values].sort((a, b) => b - a)).toEqual(values);
    expect(values[3]).toBeLessThan(values[0]);
  });

  test('the ship\'s bell: once, when its chapter (s-found) enters, after the swell', () => {
    const memory = freshMemory();
    memory.cues = maryCeleste.theme.ambience!.cues!;
    const enter = (chapter: string) => soundFor({ type: 'chapter-enter', chapter, direction: 'forward' }, memory);
    expect(sounds(enter('s-voyage'))).toEqual(['swell']);
    const found = enter('s-found')!;
    expect(sounds(found)).toEqual(['swell', 'bell']);
    expect(found.cues![1].delay).toBe(SOUND.bellAfter);
    expect(sounds(enter('s-found'))).toEqual(['swell']);
  });

  test('the question: the drone stays low and still; each line a faint, low pulse', () => {
    expect(soundFor({ type: 'question-line', index: 0, direction: 'forward' }, freshMemory())).toEqual({ drone: 'low', cues: [{ sound: 'pulse' }] });
  });

  test('the fork\'s modal: a paper slide in; closing, out', () => {
    expect(sounds(soundFor({ type: 'modal', name: 'fork', open: true }, freshMemory()))).toEqual(['paper-slide']);
    expect(sounds(soundFor({ type: 'modal', name: 'fork', open: false }, freshMemory()))).toEqual(['slide-out']);
  });
});

describe('every recipe', () => {
  test.each(Object.keys(VOICES))('%s: shaped by an envelope from silence to silence, and every source stops', name => {
    const ctx = new FakeAudioContext();
    const out = ctx.createGain();
    VOICES[name as keyof typeof VOICES].play(ctx as unknown as AudioContext, out as unknown as AudioNode, { at: 0, gain: 1, pitch: 1 });
    const envelopes = ctx.nodes.filter(node => node.kind === 'gain' && (node as FakeGain).gain.events.length > 0) as FakeGain[];
    expect(envelopes.length).toBeGreaterThan(0);
    for (const amp of envelopes) {
      const values = amp.gain.events.filter(event => event.kind !== 'cancel');
      expect(values[0].value).toBeLessThanOrEqual(0.001);
      expect(values[values.length - 1].value).toBeLessThanOrEqual(0.001);
      // A real attack: never a jump straight to the peak.
      expect(values[1].time).toBeGreaterThan(values[0].time);
    }
    expect(ctx.started.length).toBeGreaterThan(0);
    expect(ctx.started.every(source => source.stoppedAt !== null)).toBe(true);
  });
});

describe('connected', () => {
  function connected() {
    const maker = fakeContextMaker();
    const engine = new SoundEngine({ createContext: maker.create });
    const stop = startSound(engine);
    engine.unlock();
    return { ctx: maker.made[0], stop };
  }

  test('a burst of pen letters makes one scratch, not one per letter', () => {
    const { ctx, stop } = connected();
    const before = ctx.started.length;
    for (let i = 0; i < 30; i += 1) {
      emitStoryEvent({ type: 'pen' });
    }
    expect(ctx.started.length - before).toBe(1);
    stop();
  });

  test('the drone fades in at a hook and out when it decays', () => {
    const { ctx, stop } = connected();
    emitStoryEvent({ type: 'hook', chapter: 'c', direction: 'forward' });
    const drone = ctx.started.filter(source => source.kind === 'oscillator' && source.frequency.value > 30 && source.frequency.value < 45);
    expect(drone).toHaveLength(2);
    expect(drone.every(osc => osc.stoppedAt === null)).toBe(true);
    // A second hook event while it plays does not start another.
    emitStoryEvent({ type: 'hook', chapter: 'c', direction: 'backward' });
    expect(ctx.started.filter(source => source.kind === 'oscillator' && source.frequency.value > 30 && source.frequency.value < 45)).toHaveLength(2);
    emitStoryEvent({ type: 'hook-out', chapter: 'c', direction: 'forward' });
    expect(drone.every(osc => osc.stoppedAt !== null && osc.stoppedAt >= SOUND.drone.release)).toBe(true);
    stop();
  });
});

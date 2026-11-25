// @vitest-environment jsdom
// src/lib/sound/__tests__/sound-files.test.ts
// The sound files (sound-files brief, 2): every moment plays its file, from the table; the pen and the typewriter
// are throttled and vary a little each time; the hooks pick from the dread pool without repeating; the files the
// import writes are the files the sound knows.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { startSound } from '@/lib/sound';
import { SoundEngine } from '@/lib/sound/engine';
import { SAMPLES, SOUND } from '@/lib/sound/levels';
import { SAMPLE_NAMES, SAMPLES_VARY, playSample, samples } from '@/lib/sound/samples';
import { freshMemory, soundFor, type SoundRow } from '@/lib/sound/sound-map';
import { SFX_FILES, sfxFfmpegArgs, sfxFilters } from '@/lib/sfx-import';
import { emitStoryEvent, type StoryEvent } from '@/lib/story-events';
import { HOOK_SOUNDS } from '@/types/case';
import { type FakeGain, type FakeSource, fakeContextMaker, loadFakeSamples } from '@/test/fake-audio';

const sounds = (row: SoundRow | null) => row?.cues?.map(cue => cue.sound) ?? [];
const one = (event: StoryEvent) => sounds(soundFor(event, freshMemory(), 1000));

afterEach(() => emitStoryEvent({ type: 'place', place: 'away' }));

describe('the files', () => {
  test('the import writes exactly the files the sound plays, and every one has a level in the tune table', () => {
    expect(SFX_FILES.map(file => file.name)).toEqual([...SAMPLE_NAMES]);
    expect(Object.keys(SAMPLES).sort()).toEqual([...SAMPLE_NAMES].sort());
    const written = readdirSync(join(process.cwd(), 'public', 'audio', 'sfx')).sort();
    expect(written).toEqual(SAMPLE_NAMES.map(name => `${name}.mp3`).sort());
  });

  test('converted to 96 kbps MP3, mono for effects and stereo for loops, leading silence trimmed, loudness matched', () => {
    const effect = sfxFfmpegArgs({ name: 'click', kind: 'effect' }, 'in.wav', 'out.mp3');
    expect(effect).toEqual(expect.arrayContaining(['-b:a', '96k', '-ac', '1', '-c:a', 'libmp3lame']));
    expect(sfxFfmpegArgs({ name: 'question', kind: 'loop' }, 'in.wav', 'out.mp3')).toEqual(expect.arrayContaining(['-ac', '2']));
    const filters = sfxFilters({ name: 'click', kind: 'effect' });
    expect(filters[0]).toMatch(/^silenceremove=start_periods=1/);
    expect(filters.some(filter => filter.startsWith('loudnorm='))).toBe(true);
  });

  test('pen-legend is the pen slowed to about 75% and pitched down a little', () => {
    const legend = SFX_FILES.find(file => file.name === 'pen-legend')!;
    expect(legend.from).toBe('pen');
    const filters = sfxFilters(legend);
    const rate = Number(/asetrate=(\d+)/.exec(filters.join(','))![1]) / 44100;
    const tempo = Number(/atempo=([\d.]+)/.exec(filters.join(','))![1]);
    expect(rate).toBeLessThan(1);
    expect(rate * tempo).toBeCloseTo(0.75, 2);
  });
});

describe('every moment plays its file', () => {
  test('the story: a chapter, the pen (the legend\'s own slower), the typewriter, a hook, the question, the modals', () => {
    expect(one({ type: 'chapter-enter', chapter: 'c', direction: 'forward' })).toContain('chapter');
    expect(one({ type: 'pen' })).toEqual(['pen']);
    expect(one({ type: 'pen', hand: 'legend' })).toEqual(['pen-legend']);
    expect(one({ type: 'type-key' })).toEqual(['typewriter-key']);
    expect(one({ type: 'type-return' })).toEqual(['typewriter-ding']);
    expect(HOOK_SOUNDS).toContain(one({ type: 'hook', chapter: 'c', direction: 'forward' })[0]);
    expect(one({ type: 'question-line', index: 0, direction: 'forward' })).toEqual(['question-pulse']);
    expect(one({ type: 'modal', name: 'fork', open: true })).toEqual(['modal']);
    expect(one({ type: 'guide', open: true })).toEqual(['modal']);
    expect(one({ type: 'popover', open: true })).toEqual(['modal']);
  });

  test('the desk: picking up, opening, pinning, dropping; every stamp; the rank; every button', () => {
    expect(one({ type: 'folder-lift' })).toEqual(['file-pickup']);
    expect(one({ type: 'flip', evidence: 'e', direction: 'open' })).toEqual(['file-open']);
    expect(one({ type: 'pin', evidence: 'e', target: 't' })).toEqual(['pin']);
    expect(one({ type: 'folder-land' })).toEqual(['file-drop']);
    expect(one({ type: 'stamp-hit' })).toEqual(['stamp']);
    expect(one({ type: 'rank', rank: 'historian' })).toEqual(['typewriter-ding']);
    expect(one({ type: 'ui-click' })).toEqual(['click']);
    expect(one({ type: 'ui-toggle' })).toEqual(['click']);
    // The stamps' own moments only duck the rest: the stamp itself is heard once, from stamp-hit.
    expect(soundFor({ type: 'stamp:record', evidence: 'e' }, freshMemory())?.duck).toBe('stamp');
    expect(one({ type: 'stamp:legend', evidence: 'e' })).toEqual([]);
  });

  test('the pen and the typewriter are throttled: never a machine-gun of repeats', () => {
    const memory = freshMemory();
    const pens = Array.from({ length: 100 }, (_, index) => soundFor({ type: 'pen' }, memory, 5000 + index * 10)).filter(row => row !== null);
    expect(pens.length).toBeLessThanOrEqual(SOUND.penTicksPerSecond);
    const keys = Array.from({ length: 100 }, (_, index) => soundFor({ type: 'type-key' }, memory, 9000 + index * 10)).filter(row => row !== null);
    expect(keys.length).toBeLessThanOrEqual(SOUND.typeKeysPerSecond);
  });

  test('the hooks pick from the four dread files, never the same twice running; a chapter\'s own wins', () => {
    const memory = freshMemory();
    let last = '';
    const heard = new Set<string>();
    for (let i = 0; i < 200; i += 1) {
      const sound = sounds(soundFor({ type: 'hook', chapter: 'c', direction: 'forward' }, memory))[0];
      expect(sound).not.toBe(last);
      heard.add(sound);
      last = sound;
    }
    expect([...heard].sort()).toEqual([...HOOK_SOUNDS]);
    expect(sounds(soundFor({ type: 'hook', chapter: 'c', direction: 'forward', sound: 'dread-3' }, memory))).toEqual(['dread-3']);
  });
});

describe('playing a file', () => {
  test('through its tier of the mix into the effects bus, at its tune-table level; a repeated sound varies its pitch and level a little', () => {
    loadFakeSamples(samples, SAMPLE_NAMES);
    const maker = fakeContextMaker();
    const engine = new SoundEngine({ createContext: maker.create });
    const stop = startSound(engine);
    engine.unlock();
    const ctx = maker.made[0];
    const rates: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      ctx.advance(1);
      playSample(engine, { sound: 'typewriter-key' });
      const source = ctx.started.at(-1) as FakeSource;
      rates.push(source.playbackRate.value);
      const amp = source.connections[0] as FakeGain;
      // Through its tier of the mix, into the effects bus.
      expect((amp.connections[0] as FakeGain).connections).toContain(engine.nodes!.bus.effects);
      expect(amp.gain.value).toBeGreaterThan(SAMPLES['typewriter-key'].level * (1 - SAMPLES_VARY.level) - 1e-9);
      expect(amp.gain.value).toBeLessThan(SAMPLES['typewriter-key'].level * (1 + SAMPLES_VARY.level) + 1e-9);
    }
    expect(new Set(rates).size).toBeGreaterThan(1);
    ctx.advance(1);
    emitStoryEvent({ type: 'stamp-hit' });
    const stamp = ctx.started.at(-1) as FakeSource;
    expect(stamp.playbackRate.value).toBe(1);
    expect((stamp.connections[0] as FakeGain).gain.value).toBe(SAMPLES.stamp.level);
    stop();
  });
});

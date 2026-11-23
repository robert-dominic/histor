// @vitest-environment jsdom
// src/lib/sound/__tests__/desk-sounds.test.ts
// The desk's sounds (polish brief, B4): the table's rows, and the events the desk sends.
import { describe, expect, test } from 'vitest';
import { MOTION } from '@/lib/motion';
import { freshMemory, soundFor, type SoundRow } from '@/lib/sound/sound-map';
import { VOICES } from '@/lib/sound/voices';
import type { StoryEvent } from '@/lib/story-events';
import { FakeAudioContext } from '@/test/fake-audio';

const row = (event: StoryEvent) => soundFor(event, freshMemory());
const sounds = (value: SoundRow | null) => value?.cues?.map(cue => cue.sound) ?? [];

describe('the desk\'s rows', () => {
  test('picking up a folder: a paper lift; letting it go: a soft thud', () => {
    expect(sounds(row({ type: 'folder-lift' }))).toEqual(['paper-lift']);
    expect(sounds(row({ type: 'folder-land' }))).toEqual(['thud-soft']);
  });

  test('opening a folder: the cover flipping (a swish and a soft thud)', () => {
    expect(sounds(row({ type: 'flip', evidence: 'e', direction: 'open' }))).toEqual(['cover-flip']);
  });

  test('pinning: a small metallic tick, with a faint string creak', () => {
    expect(sounds(row({ type: 'pin', evidence: 'e', target: 't' }))).toEqual(['pin-tick']);
  });

  test('stamp:record: a heavy, solid thud; disputed: a lighter thud and a pen scratch; legend: a thud, then the music box', () => {
    expect(row({ type: 'stamp:record', evidence: 'e' })).toEqual({ duck: 'stamp', cues: [{ sound: 'thud-heavy' }] });
    const disputed = row({ type: 'stamp:disputed', evidence: 'e' })!;
    expect(sounds(disputed)).toEqual(['thud', 'pen-stroke']);
    expect(disputed.cues![0].gain).toBeLessThan(1);
    expect(VOICES.thud.seconds).toBeLessThan(VOICES['thud-heavy'].seconds);
    const legend = row({ type: 'stamp:legend', evidence: 'e' })!;
    expect(sounds(legend)).toEqual(['thud', 'music-box']);
    expect(legend.cues![1].delay).toBeGreaterThan(0);
    // Whatever the stamp, the ambience ducks under it.
    expect([disputed.duck, legend.duck]).toEqual(['stamp', 'stamp']);
  });

  test('a faint whisper under "You almost believed this."', () => {
    expect(sounds(row({ type: 'legend-pen', evidence: 'e' }))).toEqual(['whisper']);
  });

  test('the close-the-case stamp appears: a thud as it lands; the verdict\'s "Chosen": a heavy thud as it lands', () => {
    const close = row({ type: 'close-stamp' })!;
    expect(sounds(close)).toEqual(['thud']);
    expect(close.cues![0].delay).toBe(MOTION['stamp.hit'].duration);
    expect(sounds(row({ type: 'seal', where: 'verdict' }))).toEqual(['thud-heavy']);
    // Pressing "Close the case" itself is the link to the verdict: no sound of its own.
    expect(row({ type: 'seal', where: 'desk' })).toBeNull();
  });

  test('the rank revealed: a single typewriter bell', () => {
    expect(sounds(row({ type: 'rank', rank: 'historian' }))).toEqual(['ding']);
  });

  test('the music box: a phrase falling in pitch, each note detuned and sagging a little', () => {
    const ctx = new FakeAudioContext();
    VOICES['music-box'].play(ctx as unknown as AudioContext, ctx.createGain() as unknown as AudioNode, { at: 0, gain: 1, pitch: 1 });
    const notes = ctx.started.filter(source => source.type === 'triangle');
    const starts = notes.map(note => note.frequency.events[0].value);
    expect(starts.length).toBeGreaterThan(3);
    expect([...starts].sort((a, b) => b - a)).toEqual(starts);
    expect(notes.every(note => note.detune.value !== 0)).toBe(true);
    expect(notes.every(note => note.frequency.events.some(event => event.kind === 'exponential' && event.value < note.frequency.events[0].value))).toBe(true);
  });
});

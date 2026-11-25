// @vitest-environment jsdom
// src/lib/__tests__/typewriter.test.ts
// The typewriter (review-fixes brief, 8): typed text in the app's voice sounds a key for each letter (the sound
// throttles to about 14 a second) and a longer line (over 40 characters) ends with the carriage-return ding.
import gsap from 'gsap';
import { describe, expect, test } from 'vitest';
import { freshMemory, soundFor } from '@/lib/sound/sound-map';
import { SOUND } from '@/lib/sound/levels';
import { onStoryEvent, type StoryEvent } from '@/lib/story-events';
import { TYPEWRITER, typeElement, typeLetters } from '@/lib/typewriter';

function lettersOf(text: string) {
  return [...text].map(char => {
    const span = document.createElement('span');
    span.textContent = char;
    span.style.opacity = '0';
    return span;
  });
}
function played(run: () => void) {
  const events: StoryEvent['type'][] = [];
  const stop = onStoryEvent(event => events.push(event.type));
  try {
    run();
  } finally {
    stop();
  }
  return events;
}

describe('typeLetters', () => {
  test('each letter appears whole, with a key; a short line has no ding', () => {
    const letters = lettersOf('Written down.');
    const timeline = gsap.timeline({ paused: true });
    const end = typeLetters(timeline, letters, 0.5, 20);
    expect(end).toBeCloseTo(0.5 + letters.length / 20, 6);
    const events = played(() => timeline.progress(1));
    expect(events.filter(type => type === 'type-key')).toHaveLength(letters.length);
    expect(events).not.toContain('type-return');
    expect(letters.every(letter => letter.style.opacity === '1')).toBe(true);
  });

  test(`a line over ${TYPEWRITER.dingAfter} characters ends with the carriage-return ding`, () => {
    const line = 'Most people stop here. Want to see what the evidence says?';
    expect(line.length).toBeGreaterThan(TYPEWRITER.dingAfter);
    const timeline = gsap.timeline({ paused: true });
    typeLetters(timeline, lettersOf(line.replace(/\s/g, '')), 0, 30, line.length);
    const events = played(() => timeline.progress(1));
    expect(events.at(-1)).toBe('type-return');
    expect(events.filter(type => type === 'type-return')).toHaveLength(1);
  });

  test('typeElement splits an element, hides its letters and types them', () => {
    const p = document.createElement('p');
    p.textContent = 'Historians argue over this one.';
    document.body.append(p);
    const timeline = gsap.timeline({ paused: true });
    const typed = typeElement(timeline, p, 0)!;
    expect(p.querySelectorAll('div, span').length).toBeGreaterThan(0);
    timeline.progress(1);
    typed.split.revert();
    expect(p.textContent).toBe('Historians argue over this one.');
    p.remove();
  });
});

describe('the typewriter in the event table', () => {
  test('a key click for each letter, never more than about 14 a second', () => {
    const memory = freshMemory();
    const keys = Array.from({ length: 100 }, (_, index) => soundFor({ type: 'type-key' }, memory, 1000 + index * 10)).filter(row => row !== null);
    expect(keys.length).toBeLessThanOrEqual(SOUND.typeKeysPerSecond);
    expect(keys.length).toBeGreaterThanOrEqual(SOUND.typeKeysPerSecond - 1);
    expect(keys[0]).toEqual({ cues: [{ sound: 'typewriter-key' }] });
  });

  test('the carriage return: its ding', () => {
    expect(soundFor({ type: 'type-return' }, freshMemory())).toEqual({ cues: [{ sound: 'typewriter-ding' }] });
  });

  test('written text keeps the pen', () => {
    expect(soundFor({ type: 'pen' }, freshMemory(), 1000)).toEqual({ cues: [{ sound: 'scratch', pitch: 1 }] });
  });
});

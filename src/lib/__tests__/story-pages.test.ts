// src/lib/__tests__/story-pages.test.ts
import * as fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import { parseRefs } from '@/lib/parse-refs';
import { STORY_PACE, penPlan, readingSeconds } from '@/lib/story-pages';

const plain = (text: string) => parseRefs(text).map(segment => (segment.kind === 'text' ? segment.text : segment.label)).join('');

describe('STORY_PACE: one object to tune', () => {
  test('writing speed, the hold before a hook, the hook hold and the auto-play reading time are all here', () => {
    expect(STORY_PACE.penWordsPerMinute).toBeGreaterThan(STORY_PACE.readWordsPerMinute);
    for (const key of ['pageHold', 'hookHold', 'playHoldAtLeast', 'readWordsPerMinute', 'hookDecay', 'dissolve'] as const) {
      expect(STORY_PACE[key], key).toBeGreaterThan(0);
    }
  });

  test('a hook snaps in whole in about 0.8s and a question phrase in about 0.6s, on timers', () => {
    expect(STORY_PACE.hookIn).toBeCloseTo(0.8, 5);
    expect(STORY_PACE.questionPhrase).toBeCloseTo(0.6, 5);
    expect('hookWordEvery' in STORY_PACE).toBe(false);
  });
});

describe('STORY_PACE: the scroll', () => {
  test('about twice the old scroll per second of story (0.15 of the screen, 80 to 140px), and a wheel at 0.8', () => {
    expect(STORY_PACE.pxPerSecond).toEqual({ share: 0.3, min: 160, max: 280 });
    expect(STORY_PACE.wheelMultiplier).toBe(0.8);
  });
});

describe('readingSeconds', () => {
  test('words at 240 a minute, a reference read as its label, and never less than the least', () => {
    expect(readingSeconds('Short.')).toBe(STORY_PACE.readAtLeast);
    const long = Array.from({ length: 24 }, () => 'word').join(' ');
    expect(readingSeconds(long)).toBeCloseTo(6, 6);
    expect(readingSeconds(`{{ref:a|Two words}} ${Array.from({ length: 22 }, () => 'w').join(' ')}`)).toBeCloseTo(6, 6);
  });
});

describe('penPlan', () => {
  test('a short page is written letter by letter at about 3× reading pace', () => {
    const plan = penPlan(60, 12);
    expect(plan.unit).toBe('letter');
    expect(plan.seconds).toBeCloseTo(12 / (STORY_PACE.penWordsPerMinute / 60), 6);
  });

  test('no page takes longer than the most, and a long one is written a word at a time', () => {
    const plan = penPlan(2400, 400);
    expect(plan.seconds).toBe(STORY_PACE.maxWriteSeconds);
    expect(plan.unit).toBe('word');
    expect(plan.rate).toBeCloseTo(400 / STORY_PACE.maxWriteSeconds, 6);
  });

  test('always within the limits', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 5000 }), fc.integer({ min: 1, max: 900 }), (letters, words) => {
        const plan = penPlan(letters, words);
        expect(plan.seconds).toBeLessThanOrEqual(STORY_PACE.maxWriteSeconds);
        if (plan.unit === 'letter') {
          expect(plan.rate).toBeLessThanOrEqual(STORY_PACE.maxLettersPerSecond + 1e-9);
        }
      })
    );
  });

  test('every Mary Celeste page is written in about 10 seconds or less, heading included', () => {
    for (const section of maryCeleste.story) {
      const text = section.body.map(plain).join(' ');
      const plan = penPlan(text.replace(/\s/g, '').length, text.split(/\s+/).filter(Boolean).length);
      expect(plan.seconds + STORY_PACE.headingSeconds).toBeLessThanOrEqual(10);
    }
  });
});

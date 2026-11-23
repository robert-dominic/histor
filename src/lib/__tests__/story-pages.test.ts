// src/lib/__tests__/story-pages.test.ts
import * as fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import { parseRefs } from '@/lib/parse-refs';
import { STORY_PACE, penPlan } from '@/lib/story-pages';

const plain = (text: string) => parseRefs(text).map(segment => (segment.kind === 'text' ? segment.text : segment.label)).join('');

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

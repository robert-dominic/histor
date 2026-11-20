// src/lib/__tests__/story-column.property.test.ts
// Property 5 of .kiro/specs/fix-pack: sentences get their reading time.
import * as fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import { COLUMN, columnPlan, sentenceSeconds } from '@/lib/story-column';

/** Words of 1 to 8 letters, joined by single spaces, ending in a full stop. Plain text, no references. */
const sentence = fc
  .array(fc.stringMatching(/^[a-z]{1,8}$/), { minLength: 1, maxLength: 120 })
  .map(list => `${list.join(' ')}.`);

describe('Property 5: sentences get their reading time', () => {
  /**
   * Feature: fix-pack, Property 5: sentences get their reading time
   * **Validates: Requirements 8.5**
   */
  test('sentenceSeconds is max(minSeconds, words / 240 × 60)', () => {
    fc.assert(
      fc.property(sentence, text => {
        const words = text.split(' ').length;
        expect(sentenceSeconds(text)).toBeCloseTo(Math.max(COLUMN.minSeconds, (words / 240) * 60), 9);
      }),
      { numRuns: 200 }
    );
  });

  /**
   * Feature: fix-pack, Property 5: sentences get their reading time
   * **Validates: Requirements 8.5**
   */
  test('columnPlan starts each sentence where the one before ends, in order, with no gap or overlap', () => {
    fc.assert(
      fc.property(fc.array(sentence, { maxLength: 30 }), sentences => {
        const plan = columnPlan(sentences);
        expect(plan).toHaveLength(sentences.length);
        let expectedStart = 0;
        plan.forEach((slot, index) => {
          expect(slot.start).toBeCloseTo(expectedStart, 9);
          expect(slot.seconds).toBeCloseTo(sentenceSeconds(sentences[index]), 9);
          expectedStart = slot.start + slot.seconds;
        });
      }),
      { numRuns: 200 }
    );
  });

  /**
   * Feature: fix-pack, Property 5: sentences get their reading time
   * **Validates: Requirements 8.5**
   */
  test('a longer sentence never gets less time than a shorter one', () => {
    fc.assert(
      fc.property(sentence, sentence, (a, b) => {
        const wordsA = a.split(' ').length;
        const wordsB = b.split(' ').length;
        if (wordsA <= wordsB) {
          expect(sentenceSeconds(a)).toBeLessThanOrEqual(sentenceSeconds(b) + 1e-9);
        }
      }),
      { numRuns: 200 }
    );
  });
});

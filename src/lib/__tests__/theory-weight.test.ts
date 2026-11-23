// src/lib/__tests__/theory-weight.test.ts
import { describe, expect, test } from 'vitest';
import { THEORY_WEIGHT, theoryWeights } from '@/lib/theory-weight';

const counts = (entries: Record<string, number>) => new Map(Object.entries(entries));

describe('theoryWeights: the board answers back', () => {
  test('nothing pinned and few files opened: every theory is normal', () => {
    expect([...theoryWeights(counts({ a: 0, b: 0 }), 3).values()]).toEqual(['normal', 'normal']);
  });

  test('3 or more pinned grows heavier; the theory with the most pins is the heaviest', () => {
    const weights = theoryWeights(counts({ a: 3, b: 5, c: 2 }), 10);
    expect(weights.get('a')).toBe('heavy');
    expect(weights.get('b')).toBe('heaviest');
    expect(weights.get('c')).toBe('normal');
  });

  test('a tie for the most: each of them is the heaviest', () => {
    const weights = theoryWeights(counts({ a: 4, b: 4 }), 8);
    expect(weights.get('a')).toBe('heaviest');
    expect(weights.get('b')).toBe('heaviest');
  });

  test('the most pins, but fewer than 3: not heavy at all', () => {
    expect(theoryWeights(counts({ a: 2, b: 1 }), 3).get('a')).toBe('normal');
  });

  test('nothing pinned, once 4 or more files are opened: forgotten; it recovers the moment something is pinned', () => {
    expect(theoryWeights(counts({ a: 0, b: 1 }), THEORY_WEIGHT.forgottenAfterOpened - 1).get('a')).toBe('normal');
    expect(theoryWeights(counts({ a: 0, b: 1 }), THEORY_WEIGHT.forgottenAfterOpened).get('a')).toBe('forgotten');
    expect(theoryWeights(counts({ a: 1, b: 1 }), 9).get('a')).toBe('normal');
  });
});

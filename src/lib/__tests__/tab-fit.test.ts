// src/lib/__tests__/tab-fit.test.ts
import { describe, expect, test } from 'vitest';
import { MIN_TAB_OVERLAP, MIN_TAB_VISIBLE, tabOverlap } from '@/lib/tab-fit';

describe('tabOverlap', () => {
  test('with room to spare, tabs overlap by the usual gap', () => {
    expect(tabOverlap(3, 40, 400)).toBe(MIN_TAB_OVERLAP);
  });

  test('zero or one tab never needs more', () => {
    expect(tabOverlap(0, 40, 10)).toBe(MIN_TAB_OVERLAP);
    expect(tabOverlap(1, 40, 10)).toBe(MIN_TAB_OVERLAP);
  });

  test('tabs that do not fit overlap just enough to', () => {
    // 10 tabs of 40px = 400px; 280px available: 9 overlaps share 120px.
    const overlap = tabOverlap(10, 40, 280);
    expect(overlap).toBeCloseTo(120 / 9, 6);
    expect(10 * 40 - 9 * overlap).toBeCloseTo(280, 6);
  });

  test('a tab never hides so much that its title is lost', () => {
    const overlap = tabOverlap(30, 40, 50);
    expect(overlap).toBe(40 - MIN_TAB_VISIBLE);
  });

  test('ignores a tab with no height (nothing laid out yet)', () => {
    expect(tabOverlap(5, 0, 100)).toBe(MIN_TAB_OVERLAP);
  });
});

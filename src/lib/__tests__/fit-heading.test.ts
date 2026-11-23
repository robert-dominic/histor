// src/lib/__tests__/fit-heading.test.ts
import * as fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import { HEADING_MIN_PX, PAGE_FIT, fitHeading, fitPageWidth } from '@/lib/fit-heading';

describe('fitHeading: a chapter heading on one line', () => {
  test('a heading that fits keeps its design size, and the panel stays as it is', () => {
    expect(fitHeading(300, 400, 60)).toEqual({ fontPx: 60, widenPx: 0 });
  });

  test('a heading too wide shrinks until it just fits', () => {
    const fit = fitHeading(600, 400, 60);
    expect(fit.fontPx).toBeCloseTo(40, 1);
    expect(fit.fontPx).toBeLessThanOrEqual(40);
    expect(fit.widenPx).toBe(0);
  });

  test('never below the minimum: there, the panel widens by what is still missing', () => {
    const fit = fitHeading(1200, 300, 60);
    expect(fit.fontPx).toBe(HEADING_MIN_PX);
    // At 24px the text is 1200 * 24 / 60 = 480px wide: 180px more than the 300 it has.
    expect(fit.widenPx).toBe(180);
  });

  test('nothing to measure (no layout): the design size, unchanged', () => {
    expect(fitHeading(0, 0, 60)).toEqual({ fontPx: 60, widenPx: 0 });
    expect(fitHeading(100, 200, Number.NaN).widenPx).toBe(0);
  });

  test('always one line: the fitted text is never wider than the room it has (plus any widening)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 10, max: 5000, noNaN: true }),
        fc.double({ min: 10, max: 2000, noNaN: true }),
        fc.double({ min: 24, max: 80, noNaN: true }),
        (natural, available, design) => {
          const { fontPx, widenPx } = fitHeading(natural, available, design);
          expect(fontPx).toBeLessThanOrEqual(design);
          expect(fontPx).toBeGreaterThanOrEqual(Math.min(HEADING_MIN_PX, design));
          expect((natural * fontPx) / design).toBeLessThanOrEqual(available + widenPx + 1e-6);
        }
      )
    );
  });
});

describe('fitPageWidth: a long page fits by widening its panel, never by shrinking its text', () => {
  // A page whose height falls as its column widens: 1200px tall at its design width, 1px shorter for every px wider.
  const pageFits = (room: number) => (widen: number) => 1200 - widen <= room;

  test('a short page keeps its width', () => {
    expect(fitPageWidth(pageFits(2000), 0, 230)).toBe(0);
  });

  test('a long page widens just enough to fit', () => {
    const widen = fitPageWidth(pageFits(1100), 0, 230);
    expect(widen).toBeGreaterThanOrEqual(100);
    expect(widen).toBeLessThanOrEqual(100 + PAGE_FIT.precisionPx);
    expect(pageFits(1100)(widen)).toBe(true);
  });

  test('never wider than the most it may grow, even when the page still does not fit', () => {
    expect(fitPageWidth(pageFits(400), 0, 230)).toBe(230);
  });

  test('the panel grows from today’s width up to about 58% of the screen', () => {
    expect(PAGE_FIT.baseShare).toBe(0.42);
    expect(PAGE_FIT.maxShare).toBeCloseTo(0.58, 2);
  });

  test('any monotonic page: the answer fits, and a little less would not', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 400 }), fc.integer({ min: 1, max: 400 }), (need, max) => {
        const fits = (widen: number) => widen >= need;
        const widen = fitPageWidth(fits, 0, max);
        if (need > max) {
          expect(widen).toBe(max);
        } else {
          expect(fits(widen)).toBe(true);
          expect(widen - need).toBeLessThanOrEqual(PAGE_FIT.precisionPx + 1);
        }
      })
    );
  });
});

// src/lib/__tests__/fit-heading.test.ts
import * as fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import { HEADING_MIN_PX, fitHeading } from '@/lib/fit-heading';

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

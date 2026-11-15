// src/lib/__tests__/day-night.test.ts
// Day into night: the background steps evenly from ash to night, and body text keeps 4.5:1 at every step.
// The contrast is worked out from the real colour tokens in src/index.css.
/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import {
  dayNightStep,
  imageGrade,
  INK_UNTIL,
  NIGHT_INK_FROM,
  nightProgress,
  skyColour,
  textTone,
  TONE_FLIP,
  type TextTone,
} from '@/lib/day-night';

const css = readFileSync(fileURLToPath(new URL('../../index.css', import.meta.url)), 'utf8');

type Rgb = [number, number, number];

/** Reads a colour token such as `ash` from the @theme block. */
function token(name: string): Rgb {
  const hex = new RegExp(`--color-${name}:\\s*#([0-9a-f]{6})`, 'i').exec(css)?.[1];
  if (hex === undefined) {
    throw new Error(`Token --color-${name} not found in src/index.css`);
  }
  return [0, 2, 4].map(start => parseInt(hex.slice(start, start + 2), 16)) as Rgb;
}

/** WCAG relative luminance. */
function luminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map(channel => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio. */
function contrast(a: Rgb, b: Rgb): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

const ash = token('ash');
const night = token('night');
const ink = token('ink');
const nightInk = token('night-ink');

/** The colour that `color-mix(in srgb, ash, night <mix>)` gives. */
const background = (mix: number): Rgb => ash.map((channel, index) => channel + (night[index] - channel) * mix) as Rgb;

describe('skyColour', () => {
  test('mixes the ash and night tokens, rounded to a tenth of a percent and kept between 0 and 100%', () => {
    expect(skyColour(0)).toBe('color-mix(in srgb, var(--color-ash), var(--color-night) 0%)');
    expect(skyColour(0.12345)).toBe('color-mix(in srgb, var(--color-ash), var(--color-night) 12.3%)');
    expect(skyColour(1)).toBe('color-mix(in srgb, var(--color-ash), var(--color-night) 100%)');
    expect(skyColour(-0.2)).toBe(skyColour(0));
    expect(skyColour(1.4)).toBe(skyColour(1));
  });
});

describe('dayNightStep', () => {
  test('the first chapter is ash and the last is night', () => {
    expect(dayNightStep(0, 6)).toMatchObject({ mix: 0, dark: false });
    expect(dayNightStep(5, 6)).toMatchObject({ mix: 1, dark: true });
  });

  test('the background is a mix of the ash and night tokens, never a raw colour', () => {
    expect(dayNightStep(0, 6).background).toBe('color-mix(in srgb, var(--color-ash), var(--color-night) 0%)');
    expect(dayNightStep(1, 6).background).toBe('color-mix(in srgb, var(--color-ash), var(--color-night) 20%)');
    expect(dayNightStep(5, 6).background).toBe('color-mix(in srgb, var(--color-ash), var(--color-night) 100%)');
  });

  test('a story of one chapter stays in daylight', () => {
    expect(dayNightStep(0, 1)).toMatchObject({ mix: 0, dark: false });
  });

  test('the steps only ever get darker', () => {
    for (let count = 2; count <= 12; count++) {
      const mixes = Array.from({ length: count }, (_, index) => dayNightStep(index, count).mix);
      expect(mixes.every((mix, index) => index === 0 || mix >= mixes[index - 1])).toBe(true);
    }
  });

  test('the steps are even, except where an even step would leave body text below 4.5:1', () => {
    for (let count = 2; count <= 12; count++) {
      for (let index = 0; index < count; index++) {
        const even = nightProgress(index, count);
        const { mix } = dayNightStep(index, count);
        if (even <= INK_UNTIL || even >= NIGHT_INK_FROM) {
          expect(mix).toBe(even);
        } else {
          expect([INK_UNTIL, NIGHT_INK_FROM]).toContain(mix);
        }
      }
    }
  });

  test('the band that is skipped is real: ink and night-ink both fall below 4.5:1 in the middle of it', () => {
    const middle = background((INK_UNTIL + NIGHT_INK_FROM) / 2);

    expect(contrast(ink, middle)).toBeLessThan(4.5);
    expect(contrast(nightInk, middle)).toBeLessThan(4.5);
  });

  test('ink reaches 4.5:1 up to the edge of its range, and night-ink from the edge of its range', () => {
    expect(contrast(ink, background(INK_UNTIL))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(nightInk, background(NIGHT_INK_FROM))).toBeGreaterThanOrEqual(4.5);
  });

  test('body text reaches 4.5:1 at every step, for a story of any length up to twelve chapters', () => {
    for (let count = 1; count <= 12; count++) {
      for (let index = 0; index < count; index++) {
        const step = dayNightStep(index, count);
        expect(contrast(step.dark ? nightInk : ink, background(step.mix))).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  test('the Mary Celeste: every chapter keeps 4.5:1', () => {
    const count = maryCeleste.story.length;
    const ratios = maryCeleste.story.map((_, index) => {
      const step = dayNightStep(index, count);
      return contrast(step.dark ? nightInk : ink, background(step.mix));
    });

    expect(ratios).toHaveLength(6);
    expect(Math.min(...ratios)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('textTone: body text follows the background through a transition', () => {
  const colours: Record<TextTone, Rgb> = { ink, 'night-ink': nightInk, black: [0, 0, 0], white: [255, 255, 255] };

  test('it is ink in daylight and night-ink at night', () => {
    expect(textTone(0)).toBe('ink');
    expect(textTone(INK_UNTIL)).toBe('ink');
    expect(textTone(NIGHT_INK_FROM)).toBe('night-ink');
    expect(textTone(1)).toBe('night-ink');
  });

  test('inside the band it is black on the lighter side and white on the darker side', () => {
    expect(textTone(INK_UNTIL + 0.01)).toBe('black');
    expect(textTone(TONE_FLIP - 0.001)).toBe('black');
    expect(textTone(TONE_FLIP)).toBe('white');
    expect(textTone(NIGHT_INK_FROM - 0.01)).toBe('white');
  });

  test('body text never drops below 4.5:1, at any point between ash and night', () => {
    let lowest = Infinity;
    for (let step = 0; step <= 10000; step++) {
      const mix = step / 10000;
      lowest = Math.min(lowest, contrast(colours[textTone(mix)], background(mix)));
    }

    expect(lowest).toBeGreaterThanOrEqual(4.5);
  });

  test('every chapter of the Mary Celeste rests on ink or night-ink, never on the in-between colours', () => {
    const count = maryCeleste.story.length;
    const tones = maryCeleste.story.map((_, index) => textTone(dayNightStep(index, count).mix));

    expect(tones).toEqual(['ink', 'ink', 'ink', 'night-ink', 'night-ink', 'night-ink']);
  });
});

describe('imageGrade', () => {
  test('brightness goes from 1 at the first chapter to 0.55 at the last', () => {
    expect(imageGrade(0, 6).filter).toContain('brightness(1)');
    expect(imageGrade(5, 6).filter).toContain('brightness(0.55)');
  });

  test('every chapter is desaturated and slightly sepia', () => {
    for (let index = 0; index < 6; index++) {
      const { filter } = imageGrade(index, 6);
      const saturate = Number(/saturate\(([\d.]+)\)/.exec(filter)?.[1]);
      const sepia = Number(/sepia\(([\d.]+)\)/.exec(filter)?.[1]);
      expect(saturate).toBeLessThan(1);
      expect(sepia).toBeGreaterThan(0);
      expect(sepia).toBeLessThanOrEqual(0.2);
    }
  });

  test('the cold tint grows with every chapter', () => {
    const tints = Array.from({ length: 6 }, (_, index) => imageGrade(index, 6).tint);

    expect(tints.every((tint, index) => index === 0 || tint > tints[index - 1])).toBe(true);
  });
});

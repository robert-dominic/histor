// src/features/board/__tests__/lamp-contrast.test.ts
// The lamp must not hide files (desk-fixes item 3): far from the lamp, under its full ambient shadow, every folder's
// number and label still reads at 4.5:1 or more. The colours come from the tokens in index.css and the shadow's
// strength from effects.css, so changing either is checked here.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const css = (file: string) => readFileSync(resolve(__dirname, '../../..', file), 'utf8');
const tokens = css('index.css');
const effects = css('styles/effects.css');

type Rgb = [number, number, number];
function token(name: string): Rgb {
  const match = tokens.match(new RegExp(`--color-${name}:\\s*#([0-9a-f]{6})`, 'i'));
  if (match === null) {
    throw new Error(`no token ${name}`);
  }
  const hex = match[1];
  return [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16)) as Rgb;
}
/** color-mix(in srgb, a, b t): `t` of b over a. */
const mix = (a: Rgb, b: Rgb, t: number): Rgb => a.map((value, index) => value * (1 - t) + b[index] * t) as Rgb;
const luminance = (rgb: Rgb) => {
  const [r, g, b] = rgb.map(value => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: Rgb, b: Rgb) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** The ambient shadow outside the lamp's pool: night at this share. */
function shadowShare(): number {
  const rule = effects.slice(effects.indexOf('.desk-lamp-shadow'));
  const match = rule.match(/color-mix\(in srgb, var\(--color-night\) (\d+)%, transparent\)/);
  if (match === null) {
    throw new Error('no lamp shadow');
  }
  return Number(match[1]) / 100;
}

describe('the lamp never hides a file', () => {
  const night = token('night');
  const ink = token('ink');
  const paper = token('paper');
  // .desk-manila: paper with 22% brass. The label: paper at 80% over the manila.
  const manila = mix(paper, token('brass'), 0.22);
  const label = mix(manila, paper, 0.8);
  const dim = (rgb: Rgb) => mix(rgb, night, shadowShare());

  test('the ambient shadow is light: far from the lamp the desk is only dimmed', () => {
    expect(shadowShare()).toBeLessThanOrEqual(0.4);
  });

  test("a folder's typed label reads at 4.5:1 anywhere on the floor", () => {
    expect(contrast(dim(ink), dim(label))).toBeGreaterThanOrEqual(4.5);
  });

  test("a folder's number on its manila tab reads at 4.5:1 anywhere on the floor", () => {
    expect(contrast(dim(ink), dim(manila))).toBeGreaterThanOrEqual(4.5);
  });
});

describe('the light over the board (dread pass, 2)', () => {
  const night = token('night');
  /** The shade of the layer over the board, the top bar and the floor's label. */
  const overShare = () => {
    const rule = effects.slice(effects.indexOf('.desk-lamp-shadow-over'));
    return Number(rule.match(/color-mix\(in srgb, var\(--color-night\) (\d+)%, transparent\)/)![1]) / 100;
  };
  const dim = (rgb: Rgb) => mix(rgb, night, overShare());

  test('gentler than the floor\'s shade', () => {
    expect(overShare()).toBeLessThan(shadowShare());
  });

  test('a theory\'s chalk still reads at 4.5:1 on its slate, far from the lamp', () => {
    expect(contrast(dim(token('chalk')), dim(token('slate')))).toBeGreaterThanOrEqual(4.5);
  });

  test('the top bar\'s quiet labels (night ink at 65% on night) still read at 4.5:1', () => {
    const label = mix(night, token('night-ink'), 0.65);
    expect(contrast(dim(label), dim(night))).toBeGreaterThanOrEqual(4.5);
  });
});

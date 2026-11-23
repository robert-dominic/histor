// @vitest-environment jsdom
// src/features/board/__tests__/Slate.test.tsx
// Theories look different from files (desk-fixes item 6): on the desktop desk each theory is a slate card written in
// chalk, at 7:1 or more, with its title in Grenze Gotisch and its claim in Old Standard TT at 16px or more. The
// files stay manila. On the phone desk the notes stay paper.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import TheoryNote from '@/features/board/TheoryNote';

const tokens = readFileSync(resolve(__dirname, '../../../index.css'), 'utf8');
type Rgb = [number, number, number];
const token = (name: string): Rgb => {
  const hex = tokens.match(new RegExp(`--color-${name}:\\s*#([0-9a-f]{6})`, 'i'))![1];
  return [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16)) as Rgb;
};
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
const THEORY = maryCeleste.theories[0];

afterEach(cleanup);

describe('slate theories', () => {
  test('slate and chalk are tokens, and chalk on slate reads at 7:1 or more', () => {
    expect(contrast(token('slate'), token('chalk'))).toBeGreaterThanOrEqual(7);
  });

  test('on the desktop desk a theory is a slate card in chalk: the title in Grenze Gotisch, the claim at 16px', () => {
    render(<TheoryNote theory={THEORY} fitted />);
    const paper = document.querySelector<HTMLElement>('[data-board="paper"]')!;
    expect(paper.dataset.surface).toBe('slate');
    expect(paper.className).toContain('desk-slate');
    expect(paper.className).toContain('text-chalk');
    expect(paper.className).not.toContain('desk-note');
    expect(paper.querySelector('h3')?.className).toContain('font-legend');
    const claim = paper.querySelector<HTMLElement>('[data-board="claim"]')!;
    expect(claim.className).toContain('font-record');
    expect(claim.className).toContain('text-[1rem]');
    expect(claim.className).toContain('text-chalk');
  });

  test('the phone desk keeps its paper notes', () => {
    render(<TheoryNote theory={THEORY} />);
    expect(document.querySelector<HTMLElement>('[data-board="paper"]')!.dataset.surface).toBe('paper');
  });
});

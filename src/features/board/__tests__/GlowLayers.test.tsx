// @vitest-environment jsdom
// src/features/board/__tests__/GlowLayers.test.tsx
// Performance rule (motion.md): hover and drop glows are a layer whose opacity changes. Nothing transitions
// `filter` or `box-shadow`.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import SetAsideTray from '@/features/board/SetAsideTray';
import TheoryCard from '@/features/board/TheoryCard';
import TheoryNote from '@/features/board/TheoryNote';
import type { DeskLayout } from '@/lib/desk';

afterEach(cleanup);

const theory = maryCeleste.theories[0];

describe('glow layers', () => {
  test('a theory note lights up through a layer whose opacity changes', () => {
    const { container } = render(<TheoryNote theory={theory} />);
    const glow = container.querySelector('[data-board="glow"]') as HTMLElement;
    expect(glow.getAttribute('aria-hidden')).toBe('true');
    expect(glow.className).toContain('opacity-0');
    expect(glow.className).toContain('group-data-[drop-hot=true]/note:opacity-100');
    expect(glow.className).toContain('transition-opacity');
    const paper = container.querySelector('[data-board="paper"]') as HTMLElement;
    expect(paper.className).not.toMatch(/brightness|transition-\[filter\]/);
  });

  test('the set-aside tray lights up the same way', () => {
    const layout = { folders: [], aside: [] } as unknown as DeskLayout;
    const slips = { open: null, onToggle: vi.fn(), readings: new Map() } as never;
    const { container } = render(<SetAsideTray layout={layout} filesHref="/case/x/files" slips={slips} />);
    const glow = container.querySelector('[data-board="glow"]') as HTMLElement;
    expect(glow.className).toContain('group-data-[drop-hot=true]/tray:opacity-100');
    expect(container.querySelector('section')?.className).not.toMatch(/brightness|transition-\[filter\]/);
  });

  test('an open claim on a compact theory card is marked by a layer, not a shadow', () => {
    const { container } = render(
      <TheoryCard theory={theory} pinnedCount={0} compact expanded claimId="claim" onToggle={() => undefined} />
    );
    const mark = container.querySelector('[data-board="expanded-mark"]') as HTMLElement;
    expect(mark.getAttribute('data-on')).toBe('true');
    expect(container.querySelector('button')?.className).not.toContain('box-shadow');
  });
});

describe('no transition on filter or box-shadow', () => {
  const sources = (dir: string): string[] =>
    readdirSync(dir).flatMap(name => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) {
        return name === '__tests__' ? [] : sources(path);
      }
      return /\.(tsx|ts|css)$/.test(name) ? [path] : [];
    });

  test('no class or rule transitions filter or box-shadow', () => {
    const offenders = sources(join(process.cwd(), 'src')).flatMap(path =>
      readFileSync(path, 'utf8')
        .split('\n')
        .map((line, index) => ({ line, number: index + 1 }))
        .filter(({ line }) => /transition(?:-property)?\s*:[^;]*(filter|box-shadow)|transition-\[[^\]]*(filter|box-shadow)/.test(line))
        .map(({ line, number }) => `${path}:${number}: ${line.trim().slice(0, 100)}`)
    );
    expect(offenders).toEqual([]);
  });
});

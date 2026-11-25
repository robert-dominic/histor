// @vitest-environment jsdom
// src/lib/__tests__/materials.test.tsx
// Materials (dread pass, 1): a seeded torn edge and marks per file, the case's materials validated and written to the
// page, and the preloader shown once per page load, gone within about three seconds.
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import MaterialsScope from '@/app/MaterialsScope';
import maryCeleste from '@/cases/mary-celeste/case';
import Preloader from '@/features/dread/Preloader';
import { DECKLES, deckleOf, paperMarks } from '@/lib/materials';
import { PRELOAD_MAX_MS, forgetPreloader } from '@/lib/preloader';
import { validateCase } from '@/lib/validate-case';
import { stubMatchMedia } from '@/test/match-media';
import type { Case } from '@/types/case';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('torn edges and marks', () => {
  test('a seeded pick per file: the same every time, and every mask used across the case', () => {
    const ids = maryCeleste.evidence.map(evidence => evidence.id);
    expect(ids.map(deckleOf)).toEqual(ids.map(deckleOf));
    expect(new Set(ids.map(deckleOf)).size).toBe(DECKLES);
    expect(ids.some(id => paperMarks(id).ring !== null)).toBe(true);
    expect(ids.some(id => paperMarks(id).curl)).toBe(true);
    expect(ids.some(id => paperMarks(id).ring === null && !paperMarks(id).curl)).toBe(true);
  });
});

describe('the case\'s materials', () => {
  test('the Mary Celeste brings sailcloth and salt; anything unknown is an error', () => {
    expect(maryCeleste.theme.materials).toEqual({ board: 'sailcloth', stains: 'salt' });
    expect(validateCase(maryCeleste)).toEqual([]);
    const bad = { ...maryCeleste, theme: { ...maryCeleste.theme, materials: { board: 'velvet' } } } as unknown as Case;
    expect(validateCase(bad)).toContain('Field theme.materials.board: Must be one of sailcloth');
  });

  test('written to the page while the case is open, and gone after', () => {
    const { unmount } = render(<MaterialsScope materials={{ board: 'sailcloth', stains: 'salt' }}>x</MaterialsScope>);
    expect(document.documentElement.dataset.materialBoard).toBe('sailcloth');
    expect(document.documentElement.dataset.materialStains).toBe('salt');
    unmount();
    expect(document.documentElement.dataset.materialBoard).toBeUndefined();
  });
});

describe('the preloader', () => {
  test('"Recovering the files…" once per page load, never taking a click, gone within about three seconds', () => {
    stubMatchMedia();
    forgetPreloader();
    vi.useFakeTimers();
    const { container, unmount } = render(<Preloader images={[]} />);
    const screen = container.querySelector<HTMLElement>('[data-preloader]')!;
    expect(screen.textContent).toContain('Recovering the files…');
    expect(screen.getAttribute('aria-hidden')).toBe('true');
    expect(screen.className).toContain('pointer-events-none');
    act(() => {
      vi.advanceTimersByTime(PRELOAD_MAX_MS + 10);
    });
    unmount();
    // Not again on this page load.
    const again = render(<Preloader images={[]} />);
    expect(again.container.querySelector('[data-preloader]')).toBeNull();
  });
});

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

describe('the loading screens (landing v2 brief, 5)', () => {
  test('the desk\'s "Recovering the files…": once per page load, never taking a click, gone within about three seconds', () => {
    stubMatchMedia();
    forgetPreloader();
    vi.useFakeTimers();
    const { container, unmount } = render(<Preloader label="Recovering the files…" once images={[]} />);
    const screen = container.querySelector<HTMLElement>('[data-preloader]')!;
    expect(screen.textContent).toContain('Recovering the files…');
    expect(screen.getAttribute('aria-hidden')).toBe('true');
    expect(screen.className).toContain('pointer-events-none');
    // The Histor mark, where the ship's bell was (quick fixes, 4).
    expect(screen.querySelectorAll('svg')).toHaveLength(1);
    expect(screen.querySelector('svg')!.hasAttribute('data-histor-mark')).toBe(true);
    act(() => {
      vi.advanceTimersByTime(PRELOAD_MAX_MS + 10);
    });
    unmount();
    // Not again on this page load.
    const again = render(<Preloader label="Recovering the files…" once images={[]} />);
    expect(again.container.querySelector('[data-preloader]')).toBeNull();
  });

  test('the story\'s "Opening the case…" only shows if loading takes longer than about 400ms', async () => {
    stubMatchMedia();
    forgetPreloader();
    vi.useFakeTimers();
    // Quick: everything is in before 400ms, so there is no loader at all.
    const quick = render(<Preloader label="Opening the case…" showAfterMs={400} images={[]} />);
    expect(quick.container.querySelector('[data-preloader]')).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(450);
    });
    expect(quick.container.querySelector('[data-preloader]')).toBeNull();
    quick.unmount();
    // Slow: an image that never arrives holds it past 400ms, and the loader shows.
    vi.stubGlobal('Image', class { onload: (() => void) | null = null; onerror: (() => void) | null = null; set src(_value: string) {} });
    const slow = render(<Preloader label="Opening the case…" showAfterMs={400} images={['/slow.webp']} />);
    expect(slow.container.querySelector('[data-preloader]')).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(410);
    });
    expect(slow.container.querySelector('[data-preloader]')!.textContent).toContain('Opening the case…');
    // And it is every time, not once per page load.
    slow.unmount();
    const again = render(<Preloader label="Opening the case…" showAfterMs={400} images={['/slow.webp']} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(410);
    });
    expect(again.container.querySelector('[data-preloader]')).not.toBeNull();
    vi.unstubAllGlobals();
  });
});

describe('the apparition data (dread pass, 6)', () => {
  test('s-aboard names a figure, a direction and a delay; anything else is an error', () => {
    expect(maryCeleste.story.find(section => section.id === 's-aboard')?.apparition).toEqual({ silhouette: 'figure', direction: 'right-to-left', delay: 1.6 });
    const bad = { ...maryCeleste, story: maryCeleste.story.map((section, i) => (i === 0 ? { ...section, apparition: { silhouette: 'ghost', direction: 'up', delay: -1 } } : section)) } as unknown as Case;
    const errors = validateCase(bad);
    expect(errors).toContain('Field story[0].apparition.silhouette: Must be one of figure');
    expect(errors).toContain('Field story[0].apparition.direction: Must be left-to-right or right-to-left');
    expect(errors).toContain('Field story[0].apparition.delay: Must be a number of seconds, 0 or more');
  });
});

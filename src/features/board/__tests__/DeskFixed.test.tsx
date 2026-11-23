// @vitest-environment jsdom
// src/features/board/__tests__/DeskFixed.test.tsx
// The desktop desk is one fixed screen: a grid of a fixed-height header, board (about 46%) and floor (about 54%), a
// page that never scrolls, and pinned files in tidy piles. Below 1024px the phone desk scrolls as before.
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { InvestigationProvider } from '@/app/InvestigationProvider';
import maryCeleste from '@/cases/mary-celeste/case';
import Desk from '@/features/board/Desk';
import { setLenis } from '@/lib/smooth-scroll';
import { stubMatchMedia } from '@/test/match-media';

const KEY = `histor:case:${maryCeleste.id}`;

function renderDesk() {
  return render(
    <MemoryRouter initialEntries={[`/case/${maryCeleste.id}/files`]}>
      <InvestigationProvider caseData={maryCeleste}>
        <Routes>
          <Route path="/case/:id/files" element={<Desk />} />
        </Routes>
      </InvestigationProvider>
    </MemoryRouter>
  );
}

const desk = () => document.querySelector('main[data-page="case"]') as HTMLElement;

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  setLenis(null);
  vi.unstubAllGlobals();
  document.documentElement.style.overflow = '';
});

describe('the desktop desk', () => {
  beforeEach(() => stubMatchMedia({ desktop: true }));

  test('is one screen: a grid of a fixed-height header, the board and a roomier floor, with nothing that scrolls', () => {
    renderDesk();
    expect(desk().dataset.desk).toBe('fixed');
    for (const name of ['h-svh', 'grid', 'overflow-hidden', 'grid-rows-[3.5rem_minmax(0,60fr)_minmax(0,40fr)]']) {
      expect(desk().className).toContain(name);
    }
    expect(desk().querySelector('[data-desk="board-row"]')).not.toBeNull();
    expect(desk().querySelector('[data-desk="floor-row"]')).not.toBeNull();
  });

  test('the page itself does not scroll while the desk is there, and scrolls again when it leaves', () => {
    const { unmount } = renderDesk();
    expect(document.documentElement.style.overflow).toBe('hidden');
    unmount();
    expect(document.documentElement.style.overflow).toBe('');
  });

  test('smooth scrolling stops while the desk is there and starts again after', () => {
    const lenis = { stop: vi.fn(), start: vi.fn() };
    setLenis(lenis as never);
    const { unmount } = renderDesk();
    expect(lenis.stop).toHaveBeenCalledTimes(1);
    unmount();
    expect(lenis.start).toHaveBeenCalledTimes(1);
  });

  test('the header holds the title, and no count of opened files; the board and the tray are in their rows', () => {
    renderDesk();
    const header = desk().querySelector('header') as HTMLElement;
    expect(header.textContent).toContain('The case files');
    expect(header.querySelector('[data-board="progress"]')).toBeNull();
    expect(header.textContent).not.toContain('files opened');
    const board = desk().querySelector('[data-desk="board-row"] [data-board="board"]') as HTMLElement;
    expect(board.dataset.fitted).toBe('true');
    expect(board.querySelectorAll('[data-board="theory"]')).toHaveLength(maryCeleste.theories.length);
    const tray = desk().querySelector('[data-desk="floor-row"] [data-board="aside"]') as HTMLElement;
    expect(tray.dataset.fitted).toBe('true');
  });

  test('the wax seal simply appears in the header once enough files are open, and presses in', () => {
    const opened = maryCeleste.evidence.slice(0, maryCeleste.closeThreshold).map(item => item.id);
    localStorage.setItem(KEY, JSON.stringify({ opened: opened.slice(0, -1), pins: {}, verdict: null }));
    renderDesk();
    expect(desk().querySelector('header [data-seal="desk"]')).toBeNull();
    cleanup();
    localStorage.setItem(KEY, JSON.stringify({ opened, pins: {}, verdict: null }));
    renderDesk();
    const seal = desk().querySelector<HTMLElement>('header [data-seal="desk"]')!;
    expect(seal.textContent).toContain('Close the case');
    expect(desk().querySelector('header')?.textContent).not.toContain('You can close the case');
  });

  test('two quiet labels: "Theories" above the board and "Case files · 23" over the floor, from the data', () => {
    renderDesk();
    const theories = desk().querySelector<HTMLElement>('[data-desk="board-row"] [data-board="label"]')!;
    expect(theories.textContent).toBe('Theories');
    const evidence = desk().querySelector<HTMLElement>('[data-desk="floor-row"] [data-desk="floor-label"]')!;
    expect(evidence.textContent).toBe(`Case files · ${maryCeleste.evidence.length}`);
    for (const label of [theories, evidence]) {
      expect(label.className).toContain('font-voice');
      expect(label.className).toContain('text-night-ink/65');
      expect(label.tagName).not.toBe('H2');
    }
    // The floor label has its own line: it lies outside the floor, so it never covers a folder.
    expect(desk().querySelector('[data-board="floor"]')?.contains(evidence)).toBe(false);
  });

  test('the tray is labelled "None of them", as in the report', () => {
    renderDesk();
    expect(screen.getByRole('heading', { name: 'None of them' })).toBeDefined();
    expect(screen.queryByText('Set aside')).toBeNull();
  });

  test('pinned files are always in view: a cascade of strips under the theory, scrolling inside itself; the board never grows', () => {
    const all = maryCeleste.evidence.map(item => item.id);
    localStorage.setItem(
      KEY,
      JSON.stringify({ opened: all, pins: Object.fromEntries(all.map(id => [id, maryCeleste.theories[0].id])), verdict: null })
    );
    renderDesk();
    const board = desk().querySelector('[data-board="board"]') as HTMLElement;
    const cascade = board.querySelector<HTMLElement>(`[data-board="cascade"][data-theory-id="${maryCeleste.theories[0].id}"]`)!;
    const strips = [...cascade.querySelectorAll<HTMLElement>('[data-board="tab"]')];
    expect(strips).toHaveLength(all.length);
    // Every strip shows its number and label; nothing is hidden to hover over.
    expect(strips.every(strip => strip.closest('[hidden]') === null)).toBe(true);
    expect(strips[0].textContent).toContain(maryCeleste.evidence[0].title);
    expect(board.querySelector('[data-board="pile-panel"]')).toBeNull();
    // Slightly overlapping, and scrolling inside itself.
    expect(cascade.querySelector('[data-board="tabs"]')?.className).toContain('[&>li+li]:-mt-2.5');
    const scroller = cascade.querySelector<HTMLElement>('[data-board="cascade-scroll"]')!;
    expect(scroller.className).toContain('overflow-y-auto');
    expect(scroller.className).toContain('thin-scroll');
    expect(cascade.className).toContain('min-h-0');
  });
});

describe('the phone desk', () => {
  beforeEach(() => stubMatchMedia());

  test('scrolls as before, and the page keeps its own scroll', () => {
    renderDesk();
    expect(desk().dataset.desk).toBe('scrolling');
    expect(desk().className.split(' ')).not.toContain('h-svh');
    expect(desk().className).toContain('min-h-svh');
    expect(document.documentElement.style.overflow).toBe('');
    expect(desk().querySelector('[data-desk="board-row"]')).toBeNull();
  });

  test('the tray says "None of them" here too', () => {
    renderDesk();
    expect(screen.getByRole('heading', { name: 'None of them' })).toBeDefined();
  });
});

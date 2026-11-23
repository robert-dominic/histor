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
    for (const name of ['h-svh', 'grid', 'overflow-hidden', 'grid-rows-[3.5rem_minmax(0,46fr)_minmax(0,54fr)]']) {
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

  test('the header holds the title and the progress line; the board and the tray are in their rows', () => {
    renderDesk();
    const header = desk().querySelector('header') as HTMLElement;
    expect(header.textContent).toContain('The case files');
    expect(header.querySelector('[data-board="progress"]')?.textContent).toContain(
      `0 of ${maryCeleste.evidence.length} files opened.`
    );
    const board = desk().querySelector('[data-desk="board-row"] [data-board="board"]') as HTMLElement;
    expect(board.dataset.fitted).toBe('true');
    expect(board.querySelectorAll('[data-board="theory"]')).toHaveLength(maryCeleste.theories.length);
    const tray = desk().querySelector('[data-desk="floor-row"] [data-board="aside"]') as HTMLElement;
    expect(tray.dataset.fitted).toBe('true');
  });

  test('the tray is labelled "None of them", as in the report', () => {
    renderDesk();
    expect(screen.getByRole('heading', { name: 'None of them' })).toBeDefined();
    expect(screen.queryByText('Set aside')).toBeNull();
  });

  test('the files pinned to a theory lie in one pile under its note, not a column: the board never grows', () => {
    const six = maryCeleste.evidence.slice(0, 6).map(item => item.id);
    localStorage.setItem(
      KEY,
      JSON.stringify({ opened: six, pins: Object.fromEntries(six.map(id => [id, maryCeleste.theories[0].id])), verdict: null })
    );
    renderDesk();
    const board = desk().querySelector('[data-board="board"]') as HTMLElement;
    expect(board.querySelectorAll('[data-board="pile"]')).toHaveLength(1);
    // The tabs are only in the pile's panel, closed until it is opened.
    const panel = board.querySelector<HTMLElement>('[data-board="pile-panel"]')!;
    expect(panel.hidden).toBe(true);
    expect(panel.querySelectorAll('[data-board="tab"]')).toHaveLength(6);
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

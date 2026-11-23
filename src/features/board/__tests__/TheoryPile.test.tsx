// @vitest-environment jsdom
// src/features/board/__tests__/TheoryPile.test.tsx
// Stacks under a theory (desk-fixes item 4): the files pinned to a theory lie in one tidy pile under its note, with
// at most four edges, the top file's label and a count badge. Clicking (or hovering) it opens a panel of its files
// over the board, which scrolls when long; from there a file opens, or is dragged out. The pile never grows.
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import TheoryPile from '@/features/board/TheoryPile';
import { PILE_EDGES, carryOut } from '@/features/board/pile';
import type { DeskSlips } from '@/features/board/TheoryBoard';
import { stubMatchMedia } from '@/test/match-media';

const CASE = maryCeleste;
const THEORY = CASE.theories[0];
const numberOf = new Map(CASE.evidence.map((evidence, index) => [evidence.id, String(index + 1).padStart(2, '0')]));
const slips = (open: string | null = null): DeskSlips => ({ readings: new Map(), open, onToggle: vi.fn(), fresh: null });

function renderPile(count: number, open: string | null = null) {
  return render(
    <MemoryRouter>
      <TheoryPile
        theoryId={THEORY.id}
        theoryTitle={THEORY.title}
        files={CASE.evidence.slice(0, count)}
        numberOf={numberOf}
        filesHref={`/case/${CASE.id}/files`}
        slips={slips(open)}
      />
    </MemoryRouter>
  );
}
const pile = () => document.querySelector<HTMLElement>('[data-board="pile"]')!;
const button = () => document.querySelector<HTMLElement>('[data-board="pile-button"]')!;
const panel = () => document.querySelector<HTMLElement>('[data-board="pile-panel"]')!;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('the pile under a theory', () => {
  test('all 23 files pinned to one theory: one pile of the same size, four edges, the top label and "×23"', () => {
    renderPile(23);
    expect(document.querySelectorAll('[data-board="pile-edge"]')).toHaveLength(PILE_EDGES - 1);
    const top = document.querySelector<HTMLElement>('[data-board="pile-top"]')!;
    expect(top.dataset.evidenceId).toBe(CASE.evidence[22].id);
    expect(top.textContent).toContain(CASE.evidence[22].title);
    expect(document.querySelector('[data-board="pile-count"]')?.textContent).toBe('×23');
    // One fixed height, whatever the count: the board never grows.
    expect(button().className).toContain('h-[3.25rem]');
    expect(panel().hidden).toBe(true);
  });

  test('a few files show one edge each, and one file has no badge', () => {
    renderPile(2);
    expect(document.querySelectorAll('[data-board="pile-edge"]')).toHaveLength(1);
    cleanup();
    renderPile(1);
    expect(document.querySelectorAll('[data-board="pile-edge"]')).toHaveLength(0);
    expect(document.querySelector('[data-board="pile-count"]')).toBeNull();
  });

  test('says what it is to a screen reader, and that it opens a panel', () => {
    renderPile(7);
    expect(button().textContent).toContain(`7 files pinned to ${THEORY.title}`);
    expect(button().getAttribute('aria-expanded')).toBe('false');
    expect(button().getAttribute('aria-controls')).toBe(panel().id);
  });

  test('a click opens the panel of its files, which scrolls when long, over the board', () => {
    renderPile(23);
    fireEvent.click(button());
    expect(button().getAttribute('aria-expanded')).toBe('true');
    expect(panel().hidden).toBe(false);
    expect(panel().querySelectorAll('[data-board="tab"]')).toHaveLength(23);
    expect(panel().className).toContain('overflow-y-auto');
    expect(panel().className).toContain('absolute');
    expect(panel().hasAttribute('data-lenis-prevent')).toBe(true);
  });

  test("in the panel, a file's tab shows its slip, which links to the file", () => {
    stubMatchMedia({ desktop: true });
    renderPile(5, CASE.evidence[1].id);
    const tab = panel().querySelector<HTMLElement>(`[data-board="tab"][data-evidence-id="${CASE.evidence[1].id}"]`)!;
    expect(tab.querySelector('[data-board="slip"] a')?.getAttribute('href')).toBe(`/case/${CASE.id}/files/${CASE.evidence[1].id}`);
  });

  test('Escape closes the panel and the focus goes back to the pile', () => {
    renderPile(5);
    fireEvent.click(button());
    fireEvent.keyDown(panel(), { key: 'Escape' });
    expect(button().getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(button());
  });

  test('with a mouse it opens on hover, and closes a moment after the pointer leaves', () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query.includes('hover: hover') || query.includes('no-preference'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );
    renderPile(5);
    fireEvent.pointerEnter(pile());
    expect(button().getAttribute('aria-expanded')).toBe('true');
    fireEvent.pointerLeave(pile());
    expect(button().getAttribute('aria-expanded')).toBe('true');
    act(() => {
      vi.runAllTimers();
    });
    expect(button().getAttribute('aria-expanded')).toBe('false');
  });

  test('a tab carried out of the panel is not clipped by it, and the rest of the panel fades until it is let go', () => {
    renderPile(9);
    fireEvent.click(button());
    panel().scrollTop = 40;
    const tab = panel().querySelector<HTMLElement>('[data-board="tab"]')!;
    carryOut(tab, true);
    expect(panel().dataset.carrying).toBe('true');
    expect(tab.dataset.carried).toBe('true');
    expect(panel().querySelector<HTMLElement>('[data-board="tabs"]')!.style.translate).toBe('0 -40px');
    carryOut(tab, false);
    expect(panel().dataset.carrying).toBeUndefined();
    expect(panel().querySelector<HTMLElement>('[data-board="tabs"]')!.style.translate).toBe('');
  });

  test('the slip of a file just pinned here opens the panel by itself', () => {
    stubMatchMedia({ desktop: true });
    renderPile(5, CASE.evidence[2].id);
    expect(panel().hidden).toBe(false);
    expect(button().getAttribute('aria-expanded')).toBe('true');
  });
});

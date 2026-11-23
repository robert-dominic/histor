// @vitest-environment jsdom
// src/features/board/__tests__/TheoryCascade.test.tsx
// Pinned files are always visible (night-run 2.1): a cascade of strips under the theory, scrolling inside itself.
import { cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import TheoryCascade from '@/features/board/TheoryCascade';
import { carryOut } from '@/features/board/pile';

const THEORY = maryCeleste.theories[0];
const numberOf = new Map(maryCeleste.evidence.map((evidence, index) => [evidence.id, String(index + 1).padStart(2, '0')]));

function renderCascade(count: number) {
  return render(
    <MemoryRouter>
      <TheoryCascade
        theoryId={THEORY.id}
        theoryTitle={THEORY.title}
        files={maryCeleste.evidence.slice(0, count)}
        numberOf={numberOf}
        filesHref="/case/mary-celeste/files"
        slips={{ readings: new Map(), open: null, onToggle: vi.fn(), fresh: null }}
      />
    </MemoryRouter>
  );
}

afterEach(cleanup);

describe('TheoryCascade', () => {
  test('one strip per file, in order, each with its number and label, all in view', () => {
    const { container } = renderCascade(5);
    const strips = [...container.querySelectorAll<HTMLElement>('[data-board="tab"]')];
    expect(strips.map(strip => strip.dataset.evidenceId)).toEqual(maryCeleste.evidence.slice(0, 5).map(item => item.id));
    expect(strips[2].textContent).toContain('03');
    expect(strips[2].textContent).toContain(maryCeleste.evidence[2].title);
  });

  test('every strip shows its full label, wrapping to a second line if needed, never cut off', () => {
    const { container } = renderCascade(maryCeleste.evidence.length);
    const labels = [...container.querySelectorAll<HTMLElement>('[data-board="tab-label"]')];
    expect(labels.map(label => label.textContent)).toEqual(maryCeleste.evidence.map(item => item.title));
    for (const label of labels) {
      expect(label.className).not.toMatch(/truncate|line-clamp|text-ellipsis|whitespace-nowrap|overflow-hidden/);
      expect(label.className).toContain('break-words');
    }
  });

  test('the cascade scrolls only when its pile is taller than the room under its theory', () => {
    const { container } = renderCascade(3);
    const scroll = container.querySelector<HTMLElement>('[data-board="cascade-scroll"]')!;
    // `auto`: no scrollbar until the strips overflow the space left (flex-1 under the theory).
    expect(scroll.className).toContain('overflow-y-auto');
    expect(scroll.className).not.toContain('overflow-y-scroll');
    expect(scroll.className).toContain('flex-1');
  });

  test('nothing pinned, no cascade; its thread pin stays at the top, outside what scrolls', () => {
    expect(renderCascade(0).container.querySelector('[data-board="cascade"]')).toBeNull();
    cleanup();
    const { container } = renderCascade(3);
    const pin = container.querySelector('[data-board="cascade-pin"]')!;
    expect(container.querySelector('[data-board="cascade-scroll"]')?.contains(pin)).toBe(false);
  });

  test('a strip carried out of a scrolled cascade is not clipped, and the list keeps its place', () => {
    const { container } = renderCascade(12);
    const scroller = container.querySelector<HTMLElement>('[data-board="cascade-scroll"]')!;
    scroller.scrollTop = 30;
    const strip = container.querySelector<HTMLElement>('[data-board="tab"]')!;
    carryOut(strip, true);
    expect(scroller.dataset.carrying).toBe('true');
    expect(container.querySelector<HTMLElement>('[data-board="tabs"]')!.style.translate).toBe('0 -30px');
    carryOut(strip, false);
    expect(scroller.dataset.carrying).toBeUndefined();
  });
});

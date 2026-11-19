// @vitest-environment jsdom
// src/features/board/__tests__/Lamp.test.tsx
// Task 5 of .kiro/specs/desk: the lamp follows the mouse, or under reduced motion is a still, centred light.
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import gsap from 'gsap';
import Lamp from '@/features/board/Lamp';

/** A matchMedia stand-in that answers each query from a map. */
function stubMedia(answers: Record<string, boolean>) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: answers[query] ?? false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
    }))
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const lamp = () => document.querySelector<HTMLElement>('[data-desk="lamp"]')!;

describe('Lamp', () => {
  test('reduced motion: a still light at the centre, with no pointer listener and no ticker', () => {
    stubMedia({ '(prefers-reduced-motion: reduce)': true, '(hover: hover) and (pointer: fine)': true });
    const listen = vi.spyOn(window, 'addEventListener');
    const tick = vi.spyOn(gsap.ticker, 'add');

    render(<Lamp />);

    expect(lamp().dataset.lamp).toBe('still');
    expect(lamp().style.getPropertyValue('--lamp-x')).toBe('50vw');
    expect(lamp().style.getPropertyValue('--lamp-y')).toBe('45vh');
    expect(listen.mock.calls.some(([type]) => type === 'pointermove' || type === 'pointerdown')).toBe(false);
    expect(tick).not.toHaveBeenCalled();
  });

  test('a fine pointer: the light follows the mouse, through CSS variables on one overlay', () => {
    stubMedia({ '(prefers-reduced-motion: no-preference)': true, '(hover: hover) and (pointer: fine)': true });
    const tick = vi.spyOn(gsap.ticker, 'add');

    render(<Lamp />);

    expect(lamp().dataset.lamp).toBe('follow');
    expect(lamp().style.getPropertyValue('--lamp-r')).toBe('420px');
    expect(tick).toHaveBeenCalledTimes(1);
    fireEvent.pointerMove(window, { clientX: 300, clientY: 200 });
    // Run the ticker callback by hand: the light moves toward the pointer.
    const before = parseFloat(lamp().style.getPropertyValue('--lamp-x'));
    (tick.mock.calls[0][0] as () => void)();
    const after = parseFloat(lamp().style.getPropertyValue('--lamp-x'));
    expect(Math.abs(after - 300)).toBeLessThan(Math.abs(before - 300));
    expect(lamp().getAttribute('aria-hidden')).toBe('true');
  });

  test('touch: the light rests, and moves to the last tap', () => {
    stubMedia({ '(prefers-reduced-motion: no-preference)': true });
    render(<Lamp />);

    expect(lamp().dataset.lamp).toBe('rest');
    expect(lamp().style.getPropertyValue('--lamp-r')).toBe('260px');
  });
});

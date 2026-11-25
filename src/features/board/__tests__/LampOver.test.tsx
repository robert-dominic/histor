// @vitest-environment jsdom
// src/features/board/__tests__/LampOver.test.tsx
// The lamp lights the board too (dread pass, 2): a layer over it with the same pool, and a dip layer for the flicker.
import { act, cleanup, render } from '@testing-library/react';
import gsap from 'gsap';
import { afterEach, describe, expect, test, vi } from 'vitest';
import Lamp from '@/features/board/Lamp';
import { DESKTOP_QUERY } from '@/lib/use-media-query';

function stubMedia({ fine = true, desktop = true, reduced = false } = {}) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches:
        (query.includes('pointer: fine') && fine) ||
        (query === DESKTOP_QUERY && desktop) ||
        (query.includes('prefers-reduced-motion: reduce') ? reduced : query.includes('no-preference') ? !reduced : false),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
      onchange: null,
    }))
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('the lamp lights the board too', () => {
  test('a second layer over the board (z-22), and a dip layer for the flicker', () => {
    stubMedia();
    render(<Lamp />);
    const under = document.querySelector<HTMLElement>('[data-desk="lamp"]')!;
    const over = document.querySelector<HTMLElement>('[data-desk="lamp-over"]')!;
    expect(under.className).toContain('z-20');
    expect(over.className).toContain('z-[22]');
    expect(over.querySelector('.desk-lamp-warmth')).not.toBeNull();
    expect(document.querySelector('[data-desk="lamp-dip"]')).not.toBeNull();
    // Both follow the same light.
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 300, clientY: 200 }));
    act(() => {
      for (let i = 0; i < 60; i += 1) {
        gsap.ticker.tick();
      }
    });
    expect(over.style.getPropertyValue('--lamp-x')).toBe(under.style.getPropertyValue('--lamp-x'));
  });
});

// @vitest-environment jsdom
// src/features/dread/__tests__/LanternCursor.test.tsx
// The lantern cursor and the lamp (dread pass, 2): the lamp lights the board too (a layer over it); the lantern takes
// over the cursor only on a desktop with a fine pointer and full motion, says what a press would do, hides in text
// fields, and flickers the lamp over an opened legend.
import { act, cleanup, render } from '@testing-library/react';
import gsap from 'gsap';
import { afterEach, describe, expect, test, vi } from 'vitest';
import Lamp from '@/features/board/Lamp';
import LanternCursor from '@/features/dread/LanternCursor';
import { lanternWord } from '@/lib/lantern';
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
  document.body.innerHTML = '';
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

describe('the lantern', () => {
  test('its word: Open over a file, Read over a portal name, Drag while carrying, Pin over a theory while carrying', () => {
    document.body.innerHTML = `
      <div data-board="folder"><a href="#" id="file">File</a></div>
      <button data-portal-trigger id="name">the captain</button>
      <div data-drop-target="t-one" id="theory"></div>`;
    expect(lanternWord(document.getElementById('file'), false)).toBe('Open');
    expect(lanternWord(document.getElementById('name'), false)).toBe('Read');
    expect(lanternWord(document.body, false)).toBe('');
    expect(lanternWord(document.body, true)).toBe('Drag');
    document.getElementById('theory')!.setAttribute('data-drop-hot', 'true');
    expect(lanternWord(document.body, true)).toBe('Pin');
  });

  test('only on a desktop with a fine pointer and full motion; the system cursor is hidden while it is on', () => {
    stubMedia({ reduced: true });
    const first = render(<LanternCursor />);
    expect(document.querySelector('[data-lantern]')).toBeNull();
    first.unmount();
    vi.unstubAllGlobals();
    stubMedia({ fine: false });
    const second = render(<LanternCursor />);
    expect(document.querySelector('[data-lantern]')).toBeNull();
    second.unmount();
    vi.unstubAllGlobals();
    stubMedia();
    const { unmount } = render(<LanternCursor />);
    expect(document.querySelector('[data-lantern]')).not.toBeNull();
    expect(document.documentElement.dataset.lantern).toBe('on');
    unmount();
    expect(document.documentElement.dataset.lantern).toBeUndefined();
  });

  test('it hides in a text field (the system cursor comes back), and says "Open" over a file', () => {
    stubMedia();
    // A frame at once (and 0: no frame left pending).
    vi.stubGlobal('requestAnimationFrame', (run: FrameRequestCallback) => {
      run(0);
      return 0;
    });
    render(
      <>
        <LanternCursor />
        <input id="field" />
        <div data-board="folder" id="folder" />
      </>
    );
    const lantern = document.querySelector<HTMLElement>('[data-lantern=""]')!;
    document.getElementById('field')!.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse', clientX: 10, clientY: 10 }));
    expect(lantern.dataset.hidden).toBe('true');
    document.getElementById('folder')!.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse', clientX: 40, clientY: 40 }));
    expect(lantern.dataset.hidden).toBe('false');
    expect(lantern.querySelector('[data-lantern="word"]')!.textContent).toBe('Open');
    expect(lantern.style.transform).toBe('translate3d(40px, 40px, 0)');
  });
});

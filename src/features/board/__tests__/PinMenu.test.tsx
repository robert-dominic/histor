// @vitest-environment jsdom
// src/features/board/__tests__/PinMenu.test.tsx
// The Pin menu is a popover over the file: it takes no layout space, opens and closes with an animation, lists
// "Back to the floor" for a pinned file on a desktop, and keeps its keyboard behaviour.
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import gsap from 'gsap';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import App from '@/App';
import maryCeleste from '@/cases/mary-celeste/case';
import PinMenu from '@/features/board/PinMenu';
import { forgetShownThisLoad } from '@/features/board/hints';
import { continuePastGate, resetPhoneGate } from '@/lib/phone-gate';
import { DESKTOP_QUERY } from '@/lib/use-media-query';
import { stubMatchMedia } from '@/test/match-media';

vi.setConfig({ testTimeout: 15_000 });
const CASE = maryCeleste;
const BASE = `/case/${CASE.id}`;
const KEY = `histor:case:${CASE.id}`;

/** The menu, shown or not (a hidden menu is not in the accessibility tree). */
const menu = () => document.querySelector<HTMLElement>('[role="menu"]')!;
const button = () => screen.getByRole('button', { name: 'Pin to…' });
const finish = (element: Element) => gsap.getTweensOf(element).forEach(tween => tween.progress(1));

describe('PinMenu as a popover', () => {
  beforeEach(() => stubMatchMedia());
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('floats over the file: absolutely placed, anchored to its button, and it takes no layout space', () => {
    const { container } = render(<PinMenu theories={CASE.theories} current={undefined} onPin={() => undefined} />);
    const wrapper = container.querySelector('[data-file="pin-menu"]') as HTMLElement;
    expect(wrapper.className).toContain('relative');
    expect(menu().className).toContain('absolute');
    const before = wrapper.outerHTML.replace(/<ul[\s\S]*<\/ul>/, '');
    fireEvent.click(button());
    // Opening changes only the menu: the button and its wrapper stay as they were.
    expect(wrapper.outerHTML.replace(/<ul[\s\S]*<\/ul>/, '').replace('aria-expanded="true"', 'aria-expanded="false"')).toBe(before);
  });

  test('opens with an animation: a short scale and fade (hover), then its items', () => {
    render(<PinMenu theories={CASE.theories} current={undefined} onPin={() => undefined} />);
    expect(menu().hidden).toBe(true);
    fireEvent.click(button());
    expect(menu().hidden).toBe(false);
    const tweens = gsap.getTweensOf(menu());
    expect(tweens.length).toBeGreaterThan(0);
    expect(tweens[0].vars.ease).toBe('power2.out');
    expect(tweens[0].vars.duration).toBe(0.2);
    expect(gsap.getTweensOf(within(menu()).getAllByRole('menuitemradio')[0]).length).toBeGreaterThan(0);
  });

  test('closes with an animation that is quicker than the opening, and is hidden when it ends', () => {
    render(<PinMenu theories={CASE.theories} current={undefined} onPin={() => undefined} />);
    fireEvent.click(button());
    finish(menu());
    fireEvent.click(button());
    expect(menu().hidden).toBe(false);
    const closing = gsap.getTweensOf(menu())[0];
    expect(closing.vars.duration as number).toBeLessThan(0.2);
    expect(closing.vars.ease).toBe('power2.in');
    closing.progress(1);
    expect(menu().hidden).toBe(true);
  });

  test('opens downward when there is room, and upward when there is not', () => {
    render(
      <div data-file="grip">
        <PinMenu theories={CASE.theories} current={undefined} onPin={() => undefined} />
      </div>
    );
    fireEvent.click(button());
    expect(menu().dataset.placement).toBe('down');
    fireEvent.click(button());
    finish(menu());
    // A folder with no room below the button, and room above it.
    const grip = document.querySelector('[data-file="grip"]') as HTMLElement;
    const wrapper = document.querySelector('[data-file="pin-menu"]') as HTMLElement;
    grip.getBoundingClientRect = () => ({ top: 0, bottom: 400 }) as DOMRect;
    wrapper.getBoundingClientRect = () => ({ top: 350, bottom: 390 }) as DOMRect;
    Object.defineProperty(menu(), 'offsetHeight', { configurable: true, value: 300 });
    fireEvent.click(button());
    expect(menu().dataset.placement).toBe('up');
  });

  test('"Back to the floor" is listed for a pinned file when it can be unpinned, and for no other', () => {
    const { rerender } = render(
      <PinMenu theories={CASE.theories} current={CASE.theories[0].id} onPin={() => undefined} onUnpin={() => undefined} />
    );
    fireEvent.click(button());
    const labels = within(menu()).getAllByRole('menuitemradio').map(item => item.textContent!.replace('✓', ''));
    expect(labels).toEqual([...CASE.theories.map(theory => theory.title), 'None of them', 'Back to the floor']);
    rerender(<PinMenu theories={CASE.theories} current={undefined} onPin={() => undefined} onUnpin={() => undefined} />);
    expect(within(menu()).queryByRole('menuitemradio', { name: 'Back to the floor' })).toBeNull();
    rerender(<PinMenu theories={CASE.theories} current={CASE.theories[0].id} onPin={() => undefined} />);
    expect(within(menu()).queryByRole('menuitemradio', { name: 'Back to the floor' })).toBeNull();
  });

  test('a set-aside file lists it too, and choosing it calls unpin, not pin', () => {
    const onPin = vi.fn();
    const onUnpin = vi.fn();
    render(<PinMenu theories={CASE.theories} current="none" onPin={onPin} onUnpin={onUnpin} />);
    fireEvent.click(button());
    fireEvent.click(within(menu()).getByRole('menuitemradio', { name: 'Back to the floor' }));
    expect(onUnpin).toHaveBeenCalledTimes(1);
    expect(onPin).not.toHaveBeenCalled();
    // "Back to the floor" is never the checked item.
    expect(within(menu()).getByRole('menuitemradio', { name: 'None of them' }).getAttribute('aria-checked')).toBe('true');
    expect(within(menu()).getByRole('menuitemradio', { name: 'Back to the floor' }).getAttribute('aria-checked')).toBe('false');
  });

  test('keeps its keyboard behaviour: arrows, Home and End, Escape back to the button', () => {
    render(<PinMenu theories={CASE.theories} current={CASE.theories[0].id} onPin={() => undefined} onUnpin={() => undefined} />);
    fireEvent.keyDown(button(), { key: 'ArrowDown' });
    const items = within(menu()).getAllByRole('menuitemradio');
    fireEvent.keyDown(menu(), { key: 'End' });
    expect(document.activeElement).toBe(items[items.length - 1]);
    fireEvent.keyDown(menu(), { key: 'Home' });
    expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(menu(), { key: 'Escape' });
    expect(document.activeElement).toBe(button());
  });

  test('reduced motion: it only fades, with no scale', () => {
    vi.unstubAllGlobals();
    stubMatchMedia({ reducedMotion: true });
    render(<PinMenu theories={CASE.theories} current={undefined} onPin={() => undefined} />);
    fireEvent.click(button());
    const tween = gsap.getTweensOf(menu())[0];
    expect(tween.vars.scale).toBeUndefined();
    expect(tween.vars.opacity).toBe(1);
  });
});

describe('in the open file, on a desktop', () => {
  function stubDesktop() {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query === DESKTOP_QUERY || query.includes('hover: hover') || query.includes('no-preference'),
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
  beforeEach(() => {
    continuePastGate();
    localStorage.clear();
  // The guide opens on every arrival; these tests are about the desk under it.
  localStorage.setItem('histor:desk-guide-off:mary-celeste', '1');
    localStorage.setItem(`histor:desk-hints:${CASE.id}`, '1');
    forgetShownThisLoad();
    stubDesktop();
  });
  afterEach(() => {
    resetPhoneGate();
    cleanup();
    vi.unstubAllGlobals();
    window.history.pushState({}, '', '/');
    document.documentElement.style.overflow = '';
  });
  const openFile = (id: string) => {
    window.history.pushState({}, '', `${BASE}/files/${id}`);
    return render(<App />);
  };

  test('opening the menu does not move the file: the frame and its document are untouched', () => {
    openFile('e-lifeboat');
    const frame = document.querySelector('[data-file="folder"]') as HTMLElement;
    const styleBefore = frame.getAttribute('style');
    const classBefore = frame.className;
    fireEvent.click(button());
    expect(frame.getAttribute('style')).toBe(styleBefore);
    expect(frame.className).toBe(classBefore);
    expect(document.querySelector('[data-file="grip"]')?.scrollTop).toBe(0);
  });

  test('"Back to the floor" unpins the file and it lies on the floor again, still opened', () => {
    localStorage.setItem(KEY, JSON.stringify({ opened: ['e-lifeboat'], pins: { 'e-lifeboat': CASE.theories[0].id }, verdict: null }));
    openFile('e-lifeboat');
    fireEvent.click(button());
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Back to the floor' }));
    const saved = JSON.parse(localStorage.getItem(KEY)!);
    expect(saved.pins).toEqual({});
    expect(saved.opened).toEqual(['e-lifeboat']);
    // Closing the file, the folder is on the floor with its stamp.
    fireEvent.keyDown(window, { key: 'Escape' });
    const folder = document.querySelector('[data-board="floor"] [data-evidence-id="e-lifeboat"]');
    expect(folder).not.toBeNull();
    expect(folder?.querySelector('[data-stamp]')).not.toBeNull();
  });

  test('a file that is not pinned has no "Back to the floor"', () => {
    openFile('e-sword');
    fireEvent.click(button());
    expect(screen.queryByRole('menuitemradio', { name: 'Back to the floor' })).toBeNull();
  });
});

describe('on a phone', () => {
  beforeEach(() => {
    continuePastGate();
    localStorage.clear();
  // The guide opens on every arrival; these tests are about the desk under it.
  localStorage.setItem('histor:desk-guide-off:mary-celeste', '1');
    localStorage.setItem(`histor:desk-hints:${CASE.id}`, '1');
    stubMatchMedia();
  });
  afterEach(() => {
    resetPhoneGate();
    cleanup();
    vi.unstubAllGlobals();
    window.history.pushState({}, '', '/');
  });

  test('the menu is the one it was: the theories and "None of them", with no "Back to the floor"', () => {
    localStorage.setItem(KEY, JSON.stringify({ opened: ['e-lifeboat'], pins: { 'e-lifeboat': CASE.theories[0].id }, verdict: null }));
    window.history.pushState({}, '', `${BASE}/files/e-lifeboat`);
    render(<App />);
    fireEvent.click(button());
    const labels = within(menu()).getAllByRole('menuitemradio').map(item => item.textContent!.replace('✓', ''));
    expect(labels).toEqual([...CASE.theories.map(theory => theory.title), 'None of them']);
  });
});

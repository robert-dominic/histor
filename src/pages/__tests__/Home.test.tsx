// @vitest-environment jsdom
// src/pages/__tests__/Home.test.tsx
// "/" is the landing page (landing brief): one section per case, in the registry's order; the opening wordmark docks
// into the header, which then offers "Start investigating" (and Music, when the landing has tracks).
import { act, cleanup, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import gsap from 'gsap';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { exhibits } from '@/cases';
import { OPENING_WAIT_MS } from '@/features/landing/Opening';
import { useLandingMusic } from '@/features/landing/use-landing-music';
import Home from '@/pages/Home';
import { stubMatchMedia } from '@/test/match-media';

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  );
}
/** Ends every tween now running, so the docking lands. */
const settle = () => act(() => gsap.globalTimeline.getChildren(false, true, true).forEach(child => child.progress(1)));

beforeEach(() => stubMatchMedia());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.documentElement.style.overflow = '';
});

describe('the landing page: one section per case', () => {
  test('every exhibit, in order, as a list item with its title', () => {
    renderHome();
    const items = within(screen.getByRole('list', { name: 'The cases' })).getAllByRole('listitem');
    expect(items).toHaveLength(exhibits.length);
    exhibits.forEach((exhibit, index) => expect(items[index].textContent).toContain(exhibit.title));
  });
});

describe('the opening (landing brief, 2)', () => {
  test('black, the wordmark large in the centre; the page does not scroll until it docks', () => {
    renderHome();
    const opening = document.querySelector<HTMLElement>('[data-landing="opening"]')!;
    expect(opening.querySelector('[data-landing="opening-black"]')!.className).toContain('bg-black');
    expect(opening.querySelector('img')!.getAttribute('src')).toBe('/brand/histor-logo-cream.svg');
    expect(document.documentElement.style.overflow).toBe('hidden');
    expect(document.querySelector('main')!.dataset.docked).toBe('false');
  });

  test('after about 1.5s it rises and shrinks into the header; then the header shows its actions', () => {
    vi.useFakeTimers();
    renderHome();
    act(() => {
      vi.advanceTimersByTime(OPENING_WAIT_MS + 10);
    });
    expect(document.querySelector('main')!.dataset.docked).toBe('true');
    const mark = document.querySelector('[data-landing="opening-mark"]')!;
    expect(gsap.getTweensOf(mark)[0].vars).toMatchObject({ transformOrigin: '0 0', ease: 'sine.inOut' });
    settle();
    expect(document.querySelector('[data-landing="opening"]')).toBeNull();
    expect(document.documentElement.style.overflow).toBe('');
    expect(document.querySelector<HTMLElement>('[data-landing="header-mark"]')!.style.opacity).toBe('1');
  });

  test('the first scroll docks it at once', () => {
    renderHome();
    act(() => {
      fireEvent.wheel(window, { deltaY: 40 });
    });
    expect(document.querySelector('main')!.dataset.docked).toBe('true');
  });

  test('reduced motion: nothing moves; the black fades and the header\'s wordmark fades in', () => {
    vi.unstubAllGlobals();
    stubMatchMedia({ reducedMotion: true });
    renderHome();
    act(() => {
      fireEvent.keyDown(window, { key: 'ArrowDown' });
    });
    expect(gsap.getTweensOf(document.querySelector('[data-landing="opening-mark"]'))).toHaveLength(0);
    expect(gsap.getTweensOf(document.querySelector('[data-landing="opening"]'))[0].vars.opacity).toBe(0);
  });
});

describe('the header (landing brief, 2)', () => {
  test('the wordmark links to "/"; "Start investigating" goes to the first open case; no Music without tracks', () => {
    renderHome();
    const header = document.querySelector<HTMLElement>('[data-landing="header"]')!;
    expect(within(header).getByRole('link', { name: 'Histor, back to the top' }).getAttribute('href')).toBe('/');
    expect(within(header).getByRole('link', { name: 'Start investigating' }).getAttribute('href')).toBe('/case/mary-celeste');
    expect(within(header).queryByRole('button', { name: 'Music' })).toBeNull();
  });

  test('the Music pill is there once the landing has tracks', () => {
    expect(renderHook(() => useLandingMusic([])).result.current.available).toBe(false);
    expect(renderHook(() => useLandingMusic([{ src: '/a.mp3', title: 'A', credit: 'B' }])).result.current.available).toBe(true);
  });
});

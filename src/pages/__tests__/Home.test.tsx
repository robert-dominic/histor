// @vitest-environment jsdom
// src/pages/__tests__/Home.test.tsx
// "/" is the landing page (landing brief): one section per case, in the registry's order; the opening wordmark docks
// into the header, which then offers "Start investigating" (and Music, when the landing has tracks).
import { act, cleanup, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import gsap from 'gsap';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { exhibits } from '@/cases';
import { FRAME_SHAPES } from '@/lib/frame-shapes';
import { OPENING_WAIT_MS } from '@/features/landing/Opening';
import { useLandingMusic } from '@/features/landing/use-landing-music';
import { FRAME_TILT } from '@/features/landing/use-frame-tilt';
import { freshMemory, soundFor } from '@/lib/sound/sound-map';
import { onStoryEvent, type StoryEvent } from '@/lib/story-events';
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

describe('one section per case (landing brief, 3)', () => {
  test('each: its frame in its own shape, the title in italic with its years or "Sealed", the headline and subline', () => {
    renderHome();
    for (const exhibit of exhibits) {
      const section = document.getElementById(`exhibit-${exhibit.id}`)!;
      const title = within(section).getByRole('heading', { level: 2, name: exhibit.title });
      expect(title.className).toContain('italic');
      expect(title.nextElementSibling!.textContent).toBe(exhibit.status === 'open' ? exhibit.years : 'Sealed');
      expect(section.querySelector('[data-exhibit-part="headline"]')!.textContent).toBe(exhibit.headline);
      expect(section.querySelector('[data-exhibit-part="subline"]')!.textContent).toBe(exhibit.subline);
      const frame = section.querySelector<HTMLElement>(':scope [data-exhibit-part="rise"] .haunted-frame')!;
      expect(frame.dataset.frame).toBe(exhibit.frame);
      expect(frame.style.aspectRatio).toBe(FRAME_SHAPES[exhibit.frame].ratio);
    }
    expect(new Set(exhibits.map(exhibit => exhibit.frame)).size).toBeGreaterThan(2);
  });

  test('an open case shows its image; a sealed one a dark veil with a brass plaque, "Sealed"', () => {
    renderHome();
    const open = document.getElementById('exhibit-mary-celeste')!;
    expect(open.querySelector('[data-exhibit-part="rise"] .haunted-frame img')!.getAttribute('src')).toBe(exhibits[0].frameImage!.src);
    expect(open.querySelector('[data-exhibit-part="rise"] .haunted-frame img')!.getAttribute('loading')).toBe('lazy');
    const sealed = document.getElementById('exhibit-roanoke')!;
    const veil = sealed.querySelector('[data-exhibit-part="rise"] [data-frame-part="veil"]')!;
    expect(veil.className).toContain('frame-veil');
    expect(veil.querySelector('.frame-plaque')!.textContent).toBe('Sealed');
  });

  test('the "Scroll" cue on the first section only; the next frame peeks in on every section but the last', () => {
    renderHome();
    const sections = exhibits.map(exhibit => document.getElementById(`exhibit-${exhibit.id}`)!);
    expect(sections.map(section => section.querySelector('[data-exhibit-part="cue"]') !== null)).toEqual(sections.map((_, index) => index === 0));
    sections.forEach((section, index) => {
      const peek = section.querySelector('[data-exhibit-part="peek"] .haunted-frame');
      expect(peek?.getAttribute('data-frame') ?? null).toBe(exhibits[index + 1]?.frame ?? null);
    });
  });

  test('the frames are haunted, not shiny: no bright, polished gold anywhere in their styles', () => {
    const css = readFileSync(resolve(__dirname, '../../styles/effects.css'), 'utf8');
    const frames = css.slice(css.indexOf("/* ---- The landing page's frames"), css.indexOf('/* The scroll cue'));
    // Every warm colour in them is dull: its brightest channel stays low.
    const warm = (r: number, b: number) => r - b > 20;
    for (const [, r, g, b] of frames.matchAll(/rgb\((\d+) (\d+) (\d+)/g)) {
      if (warm(Number(r), Number(b))) {
        expect(Math.max(Number(r), Number(g))).toBeLessThanOrEqual(180);
      }
    }
    for (const [hex] of frames.matchAll(/#[0-9a-f]{6}/gi)) {
      const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
      if (warm(r, b)) {
        expect(Math.max(r, g), hex).toBeLessThanOrEqual(0x70);
      }
    }
  });
});

describe('hover and click (landing brief, 4)', () => {
  test('an open case: the frame scales up and the screen fades to black, then the case', () => {
    let path = '';
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/case/:id" element={<Probe onPath={value => (path = value)} />} />
        </Routes>
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('link', { name: 'Open the case: The Mary Celeste' }));
    const enter = gsap.globalTimeline.getChildren(false, false, true).find(child => child.data === 'landing-enter') as gsap.core.Timeline;
    const frame = document.querySelector('[data-exhibit-part="open"] .haunted-frame');
    expect(gsap.getTweensOf(frame).some(tween => tween.vars.scale === 1.08)).toBe(true);
    expect(gsap.getTweensOf(document.querySelector('[data-landing="blackout"]'))[0].vars.opacity).toBe(1);
    expect(path).toBe('');
    act(() => {
      enter.progress(1);
    });
    expect(path).toBe('/case/mary-celeste');
  });

  test('a sealed case: a plaque card beside the frame, heard as the modal sound; Escape or a click outside closes it', () => {
    const heard: StoryEvent[] = [];
    const stop = onStoryEvent(event => heard.push(event));
    renderHome();
    const button = screen.getByRole('button', { name: 'The Lost Colony of Roanoke: sealed' });
    fireEvent.click(button);
    const plaque = screen.getByRole('dialog', { name: 'The Lost Colony of Roanoke, sealed' });
    expect(plaque.textContent).toContain('1587 – 1590');
    expect(plaque.textContent).toContain(exhibits[2].subline);
    expect(plaque.textContent).toContain('Sealed — case file in preparation.');
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(soundFor(heard.at(-1)!, freshMemory())).toEqual({ cues: [{ sound: 'modal', gain: 0.7 }] });
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });
    expect(button.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(button);
    act(() => {
      fireEvent.pointerDown(document.body);
    });
    expect(button.getAttribute('aria-expanded')).toBe('false');
    stop();
  });

  test('hover: the frame tilts toward the cursor, at most ±5°, and a dull glint moves across the gilt; a veil stirs', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: !query.includes('prefers-reduced-motion: reduce'), media: query, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined }));
    renderHome();
    const button = screen.getByRole('button', { name: 'The Lost Colony of Roanoke: sealed' });
    const frame = button.querySelector<HTMLElement>('.haunted-frame')!;
    frame.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0, toJSON: () => ({}) });
    act(() => {
      fireEvent.pointerEnter(button, { pointerType: 'mouse' });
      fireEvent.pointerMove(button, { pointerType: 'mouse', clientX: 200, clientY: 0 });
    });
    // At the frame's right edge: turned toward it, as far as it goes.
    act(() => {
      gsap.getTweensOf(frame).forEach(tween => tween.progress(1));
    });
    expect(Number(gsap.getProperty(frame, 'rotationY'))).toBeCloseTo(FRAME_TILT, 0);
    expect(Math.abs(Number(gsap.getProperty(frame, 'rotationX')))).toBeLessThanOrEqual(FRAME_TILT);
    expect(gsap.getTweensOf(button.querySelector('[data-frame-part="glint"]')).length).toBeGreaterThan(0);
    expect(gsap.getTweensOf(button.querySelector('[data-frame-part="veil"]')).some(tween => tween.vars.rotation !== undefined)).toBe(true);
  });
});

function Probe({ onPath }: { onPath: (path: string) => void }) {
  const location = useLocation();
  onPath(location.pathname);
  return null;
}

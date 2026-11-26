// @vitest-environment jsdom
// src/pages/__tests__/Home.test.tsx
// "/" is the landing page (landing brief): one section per case, in the registry's order; the opening wordmark docks
// into the header, which then offers the music button.
import { act, cleanup, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import gsap from 'gsap';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { exhibits } from '@/cases';
import { FEATURED_SHAPE, FRAME_SHAPES } from '@/lib/frame-shapes';
import * as smoothScroll from '@/lib/smooth-scroll';
import { LANDING_DESCRIPTION, LANDING_TITLE } from '@/lib/landing-meta';
import { OPENING_IMAGE_WAIT_MS } from '@/features/landing/Opening';
import { useLandingMusic } from '@/features/landing/use-landing-music';
import { FRAME_TILT } from '@/features/landing/use-frame-tilt';
import { RING } from '@/features/landing/music-ring';
import { LANDING_PLAYLIST } from '@/landing/music';
import { LANDING_MUSIC_VOLUME, LandingMusic } from '@/lib/landing-music';
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

describe('the opening (landing v2 brief, 1)', () => {
  /** An Image that loads at once, as the browser's would. */
  const loadingImages = () =>
    vi.stubGlobal(
      'Image',
      class {
        naturalWidth = 1200;
        naturalHeight = 900;
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        set src(_value: string) {
          queueMicrotask(() => this.onload?.());
        }
      }
    );

  test('black, the wordmark in the centre, the first case\'s picture behind it; the page does not scroll until it is over', () => {
    renderHome();
    const opening = document.querySelector<HTMLElement>('[data-landing="opening"]')!;
    expect(opening.querySelector('[data-landing="opening-black"]')!.className).toContain('bg-black');
    expect(opening.querySelector('img[data-landing="opening-mark"]')!.getAttribute('src')).toBe('/brand/histor-logo-cream.svg');
    // The detail is the first case's own frame image, with a soft copy that cross-fades to the sharp one.
    const detail = opening.querySelector('[data-landing="opening-detail"]')!;
    expect(detail.querySelector('img')!.getAttribute('src')).toBe(exhibits[0].frameImage!.src);
    expect(detail.querySelector('[data-landing="opening-soft"]')).not.toBeNull();
    expect(document.documentElement.style.overflow).toBe('hidden');
    expect(document.querySelector('main')!.dataset.docked).toBe('false');
    expect(document.querySelector('main')!.dataset.ready).toBe('false');
  });

  test('the wordmark fades in; then it docks, the frame comes in and the words and the rail follow', async () => {
    vi.useFakeTimers();
    loadingImages();
    renderHome();
    const mark = document.querySelector('[data-landing="opening-mark"]')!;
    expect(gsap.getTweensOf(mark)[0].vars).toMatchObject({ opacity: 1, ease: 'power2.out' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    const main = document.querySelector('main')!;
    const detail = document.querySelector<HTMLElement>('[data-landing="opening-detail"]')!;
    // Only transform and opacity move on the picture: no blur on a large layer.
    for (const child of gsap.getTweensOf([detail, detail.firstElementChild, document.querySelector('[data-landing="opening-soft"]')])) {
      expect(Object.keys(child.vars).filter(key => key.toLowerCase().includes('filter'))).toEqual([]);
    }
    act(() => {
      settle();
    });
    expect(main.dataset.docked).toBe('true');
    expect(main.dataset.settled).toBe('true');
    expect(main.dataset.ready).toBe('true');
    expect(document.querySelector('[data-landing="opening"]')).toBeNull();
    expect(document.documentElement.style.overflow).toBe('');
    expect(document.querySelector<HTMLElement>('[data-landing="header-mark"]')!.style.opacity).toBe('1');
  });

  test('the wordmark docks on its own timing, before the picture has settled into its frame (landing v3 brief)', async () => {
    vi.useFakeTimers();
    renderHome();
    const main = document.querySelector('main')!;
    // The picture is still loading (it never does here); the wordmark has gone to the header regardless.
    const markTimeline = gsap.getTweensOf(document.querySelector('[data-landing="opening-mark"]'))[0].parent!;
    act(() => {
      markTimeline.seek(1, false);
    });
    expect(main.dataset.docked).toBe('true');
    expect(main.dataset.settled).toBe('false');
    expect(main.dataset.ready).toBe('false');
  });

  test('a picture that never loads does not hold the opening: the wordmark still docks', async () => {
    vi.useFakeTimers();
    renderHome();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(OPENING_IMAGE_WAIT_MS + 10);
    });
    act(() => {
      settle();
    });
    expect(document.querySelector('main')!.dataset.docked).toBe('true');
    expect(document.querySelector('[data-landing="opening"]')).toBeNull();
  });

  test('a scroll, a key or a click skips to the end at once', () => {
    for (const skip of [() => fireEvent.wheel(window, { deltaY: 40 }), () => fireEvent.keyDown(window, { key: 'ArrowDown' }), () => fireEvent.pointerDown(window)]) {
      renderHome();
      act(() => {
        skip();
      });
      const main = document.querySelector('main')!;
      expect(main.dataset.docked).toBe('true');
      expect(main.dataset.ready).toBe('true');
      expect(document.querySelector('[data-landing="opening"]')).toBeNull();
      expect(document.documentElement.style.overflow).toBe('');
      cleanup();
    }
  });

  test('reduced motion: straight to the end state, with a fade only', () => {
    vi.unstubAllGlobals();
    stubMatchMedia({ reducedMotion: true });
    renderHome();
    const main = document.querySelector('main')!;
    expect(main.dataset.docked).toBe('true');
    expect(main.dataset.settled).toBe('true');
    expect(gsap.getTweensOf(document.querySelector('[data-landing="opening-mark"]'))).toHaveLength(0);
    expect(gsap.getTweensOf(document.querySelector('[data-landing="opening"]'))[0].vars).toMatchObject({ opacity: 0 });
    act(() => {
      settle();
    });
    expect(main.dataset.ready).toBe('true');
  });
});

describe('the header (landing v3 brief)', () => {
  test('the wordmark links to "/"; only the music button on the right: no "Walk the archive", no "Start investigating"', () => {
    renderHome();
    const header = document.querySelector<HTMLElement>('[data-landing="header"]')!;
    expect(within(header).getByRole('link', { name: 'Histor, back to the top' }).getAttribute('href')).toBe('/');
    expect(within(header).queryByText('Start investigating')).toBeNull();
    expect(within(header).queryByText('Walk the archive')).toBeNull();
    expect(screen.queryByRole('dialog', { name: 'The archive' })).toBeNull();
    expect(document.querySelector('[data-landing="archive"]')).toBeNull();
    expect([...header.querySelectorAll('button')].map(button => button.getAttribute('data-landing'))).toEqual(['music']);
  });

  test('pressing the wordmark scrolls softly back to the first case, without leaving the page', () => {
    const to = vi.spyOn(smoothScroll, 'scrollToY').mockImplementation(() => undefined);
    renderHome();
    const link = document.querySelector<HTMLAnchorElement>('[data-landing="header"] a[aria-label="Histor, back to the top"]')!;
    const allowed = fireEvent.click(link);
    // The click is handled (not a navigation), and the scroll is soft: a tween's ease and duration, not a jump.
    expect(allowed).toBe(false);
    expect(to).toHaveBeenCalledTimes(1);
    expect(to.mock.calls[0][0]).toBe(0);
    expect(typeof to.mock.calls[0][1]!.ease).toBe('string');
    expect(to.mock.calls[0][1]!.duration).toBeGreaterThan(0.5);
  });

  test('the music button is there, off until clicked, its tooltip "Play music" in the shared tooltip style', () => {
    renderHome();
    const button = document.querySelector<HTMLButtonElement>('[data-landing="music"]')!;
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.getAttribute('aria-label')).toBe('Play music');
    const tooltip = button.parentElement!.querySelector<HTMLElement>('[data-tooltip]')!;
    expect(tooltip.textContent).toBe('Play music');
    expect(tooltip.className).toContain('desk-slip');
  });

  test('off: a music note with a small slash (muted), the ring empty', () => {
    renderHome();
    const button = document.querySelector<HTMLButtonElement>('[data-landing="music"]')!;
    const face = button.querySelector('[data-music="muted"]')!;
    expect(face.querySelectorAll('path').length).toBe(2);
    expect(face.innerHTML).toContain('M4 4l16 16');
    expect(button.querySelector('[data-music="bars"]')).toBeNull();
    const progress = button.querySelector<SVGCircleElement>('[data-music="progress"]')!;
    expect(Number(progress.style.strokeDashoffset || progress.getAttribute('stroke-dashoffset'))).toBeCloseTo(RING.circumference, 3);
  });

  test('playing: moving equaliser bars, a thin ring that fills as the track plays, and the track and artist in the tooltip', () => {
    vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    renderHome();
    const button = document.querySelector<HTMLButtonElement>('[data-landing="music"]')!;
    const tooltip = () => button.parentElement!.querySelector<HTMLElement>('[data-tooltip]')!;
    expect(tooltip().textContent).toBe('Play music');
    const progress = vi.spyOn(LandingMusic.prototype, 'progress').mockReturnValue(0.25);
    act(() => {
      fireEvent.click(button);
    });
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.querySelector('[data-music="muted"]')).toBeNull();
    expect(button.querySelectorAll('[data-music="bars"] .eq-bar')).toHaveLength(4);
    // The tooltip: the track's title and its artist, e.g. "Deep Sea · Universfield".
    const text = tooltip().textContent!;
    const track = LANDING_PLAYLIST.find(each => text.startsWith(`${each.title} · `))!;
    expect(track).toBeDefined();
    expect(text).toBe(`${track.title} · ${track.credit.replace(/\s*\(Pixabay\)$/, '')}`);
    // The ring fills with the track and starts again on the next one.
    act(() => {
      gsap.ticker.tick();
    });
    const ring = button.querySelector<SVGCircleElement>('[data-music="progress"]')!;
    expect(Number(ring.style.strokeDashoffset)).toBeCloseTo(RING.circumference * 0.75, 3);
    progress.mockReturnValue(0);
    act(() => {
      gsap.ticker.tick();
    });
    expect(Number(ring.style.strokeDashoffset)).toBeCloseTo(RING.circumference, 3);
    // And off again: the slash is back.
    act(() => {
      fireEvent.click(button);
    });
    expect(button.querySelector('[data-music="muted"]')).not.toBeNull();
    expect(tooltip().textContent).toBe('Play music');
    expect(LANDING_MUSIC_VOLUME).toBe(0.15);
  });

  test('the equaliser bars are constant motion that stands still under reduced motion', () => {
    const css = readFileSync(resolve(__dirname, '../../styles/effects.css'), 'utf8');
    expect(css).toMatch(/@keyframes eq-bar/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.eq-bar \{ animation: none/);
  });

  test('the music button is there once the landing has tracks', () => {
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
      expect(frame.style.aspectRatio).toBe((exhibit.featured ? FEATURED_SHAPE : FRAME_SHAPES[exhibit.frame]).ratio);
    }
    expect(new Set(exhibits.map(exhibit => exhibit.frame)).size).toBeGreaterThan(2);
  });

  test('the first frame is the main painting: wider, with a thicker, heavier moulding than the rest', () => {
    renderHome();
    const frames = exhibits.map(exhibit => document.querySelector<HTMLElement>(`#exhibit-${exhibit.id} [data-exhibit-part="rise"] .haunted-frame`)!);
    expect(frames.map(frame => frame.dataset.featured)).toEqual(['true', 'false', 'false', 'false', 'false', 'false']);
    expect(exhibits.map(exhibit => exhibit.featured)).toEqual([true, false, false, false, false, false]);
    const ratio = (text: string) => text.split('/').map(Number).reduce((a, b) => a / b);
    expect(ratio(FEATURED_SHAPE.ratio)).toBeGreaterThan(ratio(FRAME_SHAPES.landscape.ratio));
    const css = readFileSync(resolve(__dirname, '../../styles/effects.css'), 'utf8');
    const plain = css.match(/\.haunted-frame \{[^}]*padding: clamp\((\d+)px, ([\d.]+)%, (\d+)px\)/)!;
    const heavy = css.match(/\.haunted-frame\[data-featured='true'\] \{\s*padding: clamp\((\d+)px, ([\d.]+)%, (\d+)px\)/)!;
    expect(Number(heavy[3])).toBeGreaterThan(Number(plain[3]));
    expect(Number(heavy[2])).toBeGreaterThan(Number(plain[2]));
    const steps = (rule: string) => (rule.match(/inset 0 0 0 \d+px/g) ?? []).length;
    const featuredShadow = css.slice(css.indexOf("[data-featured='true'] {"), css.indexOf("/* Rot from the edges"));
    expect(steps(featuredShadow)).toBeGreaterThan(steps(css.slice(css.indexOf('.haunted-frame {'), css.indexOf('/* The main painting'))));
  });

  test('every case shows its picture in its frame: an open case one of its own, a sealed case a period picture; no veils', () => {
    renderHome();
    const open = document.getElementById('exhibit-mary-celeste')!;
    expect(open.querySelector('[data-exhibit-part="rise"] .haunted-frame img')!.getAttribute('src')).toBe(exhibits[0].frameImage!.src);
    expect(open.querySelector('[data-exhibit-part="rise"] .haunted-frame img')!.getAttribute('loading')).toBe('lazy');
    for (const exhibit of exhibits.filter(each => each.status === 'sealed')) {
      const section = document.getElementById(`exhibit-${exhibit.id}`)!;
      const img = section.querySelector<HTMLImageElement>('[data-exhibit-part="rise"] .haunted-frame img')!;
      expect(img.getAttribute('src'), exhibit.id).toBe(exhibit.frameImage!.src);
      expect(img.getAttribute('src'), exhibit.id).toMatch(/\.webp$/);
      expect(section.querySelector('[data-frame-part="veil"]')).toBeNull();
      // Still sealed: the small "Sealed" under the title, and the plaque on a press.
      expect(within(section).getByRole('heading', { level: 2 }).nextElementSibling!.textContent).toBe('Sealed');
      expect(section.querySelector(`button[aria-label="${exhibit.title}: sealed"]`)).not.toBeNull();
    }
  });

  test('the sealed pictures are the owner\'s, in the repo as WebP under 300 KB each', () => {
    const files = ['ripper', 'cooper', 'princes', 'dancing', 'earhart'];
    for (const name of files) {
      const size = readFileSync(resolve(__dirname, `../../landing/images/${name}.webp`)).length;
      expect(size, name).toBeLessThanOrEqual(300 * 1024);
    }
    expect(exhibits.filter(each => each.status === 'sealed').map(each => each.frameImage!.credit)).toEqual([
      'The Nemesis of Neglect, John Tenniel, Punch, 1888',
      'The ransom bills found in 1980, FBI photograph',
      'The Children of Edward, Paul Delaroche, 1830',
      'The Dancing Mania, engraving by Hendrik Hondius after Pieter Bruegel, 1642',
      'Amelia Earhart, NASA archive photograph',
    ]);
  });

  test('the "Scroll" cue on the first section only; each case has exactly one frame, and no copy of another case\'s', () => {
    renderHome();
    const sections = exhibits.map(exhibit => document.getElementById(`exhibit-${exhibit.id}`)!);
    expect(sections.map(section => section.querySelector('[data-exhibit-part="cue"]') !== null)).toEqual(sections.map((_, index) => index === 0));
    sections.forEach((section, index) => {
      const frames = section.querySelectorAll('.haunted-frame');
      expect(frames).toHaveLength(1);
      expect(frames[0].getAttribute('data-frame')).toBe(exhibits[index].frame);
    });
    expect(document.querySelector('[data-exhibit-part="peek"]')).toBeNull();
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
    const button = screen.getByRole('button', { name: 'D. B. Cooper: sealed' });
    fireEvent.click(button);
    const plaque = screen.getByRole('dialog', { name: 'D. B. Cooper, sealed' });
    expect(plaque.textContent).toContain('1971');
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

  test('hover: the frame tilts around its centre toward the cursor (up to about 8°, perspective about 1200px), lifts toward the viewer and shifts; its shadow goes the other way; the glint follows the cursor; it eases back flat', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: !query.includes('prefers-reduced-motion: reduce'), media: query, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined }));
    renderHome();
    const button = document.querySelector<HTMLButtonElement>('button[aria-label="D. B. Cooper: sealed"]')!;
    const frame = button.querySelector<HTMLElement>('.haunted-frame')!;
    const shadow = button.closest('[data-exhibit-part="rise"]')!.querySelector<HTMLElement>('.haunted-frame-shadow')!;
    const glint = button.querySelector<HTMLElement>('[data-frame-part="glint"]')!;
    // The cursor is measured against the box that does not move: the link around the frame, not the tilted frame.
    button.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0, toJSON: () => ({}) });
    Object.defineProperty(frame, 'offsetWidth', { value: 200 });
    Object.defineProperty(frame, 'offsetHeight', { value: 100 });
    act(() => {
      fireEvent.pointerEnter(button, { pointerType: 'mouse' });
      fireEvent.pointerMove(button, { pointerType: 'mouse', clientX: 200, clientY: 0 });
    });
    act(() => {
      gsap.getTweensOf([frame, shadow, glint]).forEach(tween => tween.progress(1));
    });
    expect(FRAME_TILT).toBe(8);
    // At the frame's top right corner: turned toward it as far as it goes, with its own perspective.
    expect(Number(gsap.getProperty(frame, 'rotationY'))).toBeCloseTo(FRAME_TILT, 0);
    expect(Number(gsap.getProperty(frame, 'rotationX'))).toBeCloseTo(FRAME_TILT, 0);
    expect(Number(gsap.getProperty(frame, 'transformPerspective'))).toBe(1200);
    expect(Number(gsap.getProperty(frame, 'z'))).toBeGreaterThan(0);
    expect(gsap.getTweensOf(frame).every(tween => tween.duration() === 0.6)).toBe(true);
    // Shifted toward the cursor; the shadow the opposite way.
    expect(Number(gsap.getProperty(frame, 'x'))).toBeGreaterThan(0);
    expect(Number(gsap.getProperty(frame, 'y'))).toBeLessThan(0);
    expect(Number(gsap.getProperty(shadow, 'x'))).toBeLessThan(0);
    expect(Number(gsap.getProperty(shadow, 'y'))).toBeGreaterThan(0);
    // The glint is where the cursor is.
    expect(Number(gsap.getProperty(glint, 'x'))).toBeCloseTo(200, 0);
    expect(Number(gsap.getProperty(glint, 'y'))).toBeCloseTo(0, 0);
    // The cursor leaves: back to flat, easing out.
    act(() => {
      fireEvent.pointerLeave(button, { pointerType: 'mouse' });
    });
    const back = gsap.getTweensOf(frame).find(tween => tween.vars.rotationX === 0)!;
    expect(back.vars.ease).toBe('power3.out');
    act(() => {
      back.progress(1);
    });
    expect(Number(gsap.getProperty(frame, 'rotationY'))).toBe(0);
    expect(Number(gsap.getProperty(frame, 'x'))).toBe(0);
    expect(Number(gsap.getProperty(frame, 'z'))).toBe(0);
  });
});

function Probe({ onPath }: { onPath: (path: string) => void }) {
  const location = useLocation();
  onPath(location.pathname);
  return null;
}

describe('the progress rail and the end (landing brief, 5)', () => {
  test('one tick per case on the left, the first current; a tick goes to its case', () => {
    const to = vi.spyOn(smoothScroll, 'scrollToY').mockImplementation(() => undefined);
    renderHome();
    const rail = screen.getByRole('navigation', { name: 'Cases', hidden: true });
    const ticks = within(rail).getAllByRole('button', { hidden: true });
    expect(ticks.map(tick => tick.getAttribute('aria-label'))).toEqual(exhibits.map(exhibit => `Go to ${exhibit.title}`));
    expect(ticks[0].getAttribute('aria-current')).toBe('true');
    expect(ticks.slice(1).every(tick => tick.getAttribute('aria-current') === null)).toBe(true);
    fireEvent.click(ticks[3]);
    expect(to).toHaveBeenCalledTimes(1);
  });

  test('no "more cases" section: the last case is followed directly by the footer', () => {
    renderHome();
    expect(screen.queryByText('More cases are being recovered.')).toBeNull();
    expect(document.querySelector('[data-landing="end"]')).toBeNull();
    const cases = screen.getByRole('list', { name: 'The cases' });
    const footer = screen.getByRole('contentinfo');
    expect(cases.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(document.querySelector('[data-landing="track"]')!.nextElementSibling).toBe(footer);
  });
});

/** A matchMedia that answers compound queries part by part: a screen `desktop` wide or not, motion reduced or not. */
function stubMedia({ desktop, reduced = false }: { desktop: boolean; reduced?: boolean }) {
  const part = (query: string): boolean => {
    const q = query.trim();
    if (q.startsWith('not all and ')) {
      return !part(q.slice('not all and '.length));
    }
    if (q.includes(' and ')) {
      return q.split(' and ').every(part);
    }
    if (q.includes('min-width: 1024px')) return desktop;
    if (q.includes('prefers-reduced-motion: reduce')) return reduced;
    if (q.includes('prefers-reduced-motion: no-preference')) return !reduced;
    return q.includes('hover: hover') || q.includes('pointer: fine');
  };
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: part(query), media: query, onchange: null, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false }));
}

describe('phones and reduced motion (landing brief, 6)', () => {
  test('a phone: the same pieces stacked, simple fades; no rising; tall frames narrower', () => {
    vi.unstubAllGlobals();
    stubMedia({ desktop: false });
    renderHome();
    const section = document.getElementById('exhibit-jack-the-ripper')!;
    const rise = section.querySelector('[data-exhibit-part="rise"]')!;
    // Fades only: nothing set to rise from below.
    expect(gsap.getProperty(rise, 'y')).toBe(0);
    expect(section.querySelector('[data-exhibit-part="rise"] .haunted-frame')!.className).toContain('max-lg:w-[72%]');
    // The header keeps the wordmark and the music button.
    const header = document.querySelector<HTMLElement>('[data-landing="header"]')!;
    expect(header.querySelector('[data-landing="music"]')).not.toBeNull();
  });

  test('a laptop at full motion: the stage; reduced motion: a plain stack, fades only', () => {
    vi.unstubAllGlobals();
    stubMedia({ desktop: true });
    const { unmount } = renderHome();
    const ripper = () => document.getElementById(`exhibit-${exhibits[2].id}`)!;
    // The stage: only the case on screen is there; the others wait, hidden.
    expect(document.querySelector('main')!.dataset.staged).toBe('true');
    // A tall track (a screen of scroll for each case) holding a sticky stage. (The case after the next one waits, hidden.)
    expect(document.querySelector<HTMLElement>('[data-landing="track"]')!.style.height).toBe(`${exhibits.length * 100}svh`);
    expect(document.querySelector('[data-landing="stage"]')!.className).toContain('sticky');
    expect(ripper().style.visibility).toBe('hidden');
    unmount();
    vi.unstubAllGlobals();
    stubMedia({ desktop: true, reduced: true });
    renderHome();
    expect(document.querySelector('main')!.dataset.staged).toBe('false');
    expect(gsap.getProperty(ripper().querySelector('[data-exhibit-part="rise"]'), 'y')).toBe(0);
  });
});

describe('performance and meta (landing brief, 7)', () => {
  test('the title "Histor: Legend or history? You decide.", with a matching description, in index.html and on the page', () => {
    const html = readFileSync(resolve(__dirname, '../../../index.html'), 'utf8');
    expect(html).toContain(`<title>${LANDING_TITLE}</title>`);
    expect(html).toContain(`<meta name="description" content="${LANDING_DESCRIPTION}" />`);
    document.title = 'Something else';
    renderHome();
    expect(document.title).toBe(LANDING_TITLE);
  });

  test('frame images load lazily and decode off the main thread, as WebP; nothing keeps a permanent will-change', () => {
    renderHome();
    const images = [...document.querySelectorAll<HTMLImageElement>('.haunted-frame img')];
    expect(images.length).toBeGreaterThan(0);
    for (const image of images) {
      expect(image.getAttribute('loading')).toBe('lazy');
      expect(image.getAttribute('decoding')).toBe('async');
      expect(image.getAttribute('src')).toMatch(/\.webp$/);
    }
    expect(document.querySelector('[data-page="landing"] [class*="will-change"]')).toBeNull();
  });
});

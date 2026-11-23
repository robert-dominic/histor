// @vitest-environment jsdom
// src/features/story/__tests__/StoryOpening.test.tsx
// The opening shows the case's title, years, UNSOLVED stamp and teaser from its data. It has no image of its own:
// in the cinematic story it lies over the first chapter's scene; on its own screen (reduced motion) it is night,
// and the title docks into the case header once, when the reader scrolls.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import gsap from 'gsap';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import CaseHeader from '@/components/CaseHeader';
import { DOCK_AT, dockTitle, undockTitle, watchForDock } from '@/features/story/dock-title';
import StoryOpening from '@/features/story/StoryOpening';
import { stubMatchMedia } from '@/test/match-media';

/** Test data, not history. */
const card = { title: 'Test Case', years: '1900 – 1901', unsolved: true, teaser: 'A test teaser.' };

const one = (container: HTMLElement, name: string) =>
  container.querySelector(`[data-opening="${name}"]`) as HTMLElement;

function renderOpening(props: Partial<Parameters<typeof StoryOpening>[0]> = {}) {
  return render(<StoryOpening card={card} {...props} />);
}

beforeEach(() => stubMatchMedia());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('StoryOpening: content', () => {
  test('shows the title, the years, the UNSOLVED stamp and the teaser from its data', () => {
    const { container } = renderOpening();
    expect(one(container, 'title').textContent).toBe(card.title);
    expect(one(container, 'years').textContent).toBe(card.years);
    expect(one(container, 'stamp').textContent).toBe('Unsolved');
    expect(one(container, 'stamp').className).toContain('uppercase');
    expect(one(container, 'teaser').textContent).toBe(card.teaser);
  });

  test('has no stamp for a case that is not marked unsolved', () => {
    const { container } = renderOpening({ card: { ...card, unsolved: false } });
    expect(container.querySelector('[data-opening="stamp"]')).toBeNull();
  });

  test('on its own it is a full screen at night, with no image: one image, chapter 1\'s', () => {
    const { container } = renderOpening();
    const section = container.querySelector('[data-story="opening"]') as HTMLElement;
    expect(section.className).toContain('h-svh');
    expect(section.className).toContain('bg-night');
    expect(container.querySelector('img')).toBeNull();
    expect(screen.queryByRole('button', { name: /credit/i })).toBeNull();
  });

  test('as an overlay it lies over the first scene and lets every tap through to it', () => {
    const { container } = renderOpening({ overlay: true });
    const section = container.querySelector('[data-story="opening"]') as HTMLElement;
    expect(section.dataset.overlay).toBe('true');
    expect(section.className).toContain('absolute');
    expect(section.className).toContain('pointer-events-none');
    expect(section.className).not.toContain('bg-night');
    expect(container.querySelector('img')).toBeNull();
  });

  test('as an overlay it never docks its own title: the story does', () => {
    const { container } = render(
      <>
        <CaseHeader title={card.title} years={card.years} unsolved startHidden />
        <StoryOpening card={card} overlay />
      </>
    );
    const bar = container.querySelector('[data-case-header="bar"]') as HTMLElement;
    const opening = container.querySelector('[data-story="opening"]') as HTMLElement;
    opening.getBoundingClientRect = () => ({ top: -400, height: 800, left: 0, width: 0 }) as DOMRect;
    fireEvent.scroll(window);
    expect(gsap.getTweensOf(bar)).toHaveLength(0);
  });

  test('the title, years and stamp are decoration: the case header is the page heading', () => {
    const { container } = renderOpening();
    expect(one(container, 'title').closest('[aria-hidden="true"]')).not.toBeNull();
    expect(one(container, 'teaser').closest('[aria-hidden="true"]')).toBeNull();
  });

  test('the title is split into letters for the quill, and the stamp starts hidden', () => {
    const { container } = renderOpening();
    const letters = [...one(container, 'title').querySelectorAll<HTMLElement>('*')].filter(el => el.children.length === 0);
    expect(letters.map(letter => letter.textContent).join('')).toBe(card.title.replace(/\s/g, ''));
    expect(one(container, 'stamp').style.opacity).toBe('0');
  });

  test('the years type in one character at a time, spaces kept, each appearing whole, and all whole at rest', () => {
    const { container } = renderOpening();
    const chars = [...one(container, 'years').querySelectorAll<HTMLElement>('[data-opening="year-char"]')];
    // Every character of the text, spaces and the dash included, and nothing else.
    expect(chars.map(char => char.textContent).join('')).toBe(card.years);
    expect(chars).toHaveLength([...card.years].length);
    // Plain inline spans: nothing is laid out again, so no letter can overlap another.
    expect(chars.every(char => char.className === '' && char.style.display === '')).toBe(true);
    expect(chars.every(char => char.style.opacity === '0')).toBe(true);
    const sets = chars.map(char => gsap.getTweensOf(char).find(tween => tween.vars.opacity === 1)!);
    // Each one appears at once (no fade), one after another.
    expect(sets.every(tween => tween.duration() === 0)).toBe(true);
    for (let index = 1; index < sets.length; index += 1) {
      expect(sets[index].startTime()).toBeGreaterThan(sets[index - 1].startTime());
    }
    // The parent never fades: nothing is left half visible.
    expect(gsap.getTweensOf(one(container, 'years'))).toHaveLength(0);
    (sets[0].parent as gsap.core.Timeline).progress(1);
    expect(chars.every(char => char.style.opacity === '')).toBe(true);
  });

  test('reduced motion: the title is not split, and everything fades in', () => {
    vi.unstubAllGlobals();
    stubMatchMedia({ reducedMotion: true });
    const { container } = renderOpening();
    expect(one(container, 'title').children).toHaveLength(0);
    expect(one(container, 'title').style.opacity).toBe('0');
    expect(one(container, 'cue').textContent).toContain('Scroll to read');
  });

  test('without matchMedia everything is simply shown', () => {
    vi.unstubAllGlobals();
    const { container } = renderOpening();
    expect(one(container, 'title').style.opacity).toBe('');
    expect(one(container, 'teaser').style.opacity).toBe('');
  });
});

describe('watchForDock', () => {
  /** An opening scene `height` tall whose top is at `top` in the viewport. */
  function sceneAt(top: number, height = 800): HTMLElement {
    const element = document.createElement('section');
    element.getBoundingClientRect = () => ({ top, height, bottom: top + height }) as DOMRect;
    return element;
  }

  test('calls onDock once, when the scene has scrolled 15% out of view', () => {
    const scene = sceneAt(0);
    const onDock = vi.fn();
    const stop = watchForDock(scene, onDock);
    expect(onDock).not.toHaveBeenCalled();
    scene.getBoundingClientRect = () => ({ top: -(800 * DOCK_AT) + 20, height: 800 }) as DOMRect;
    fireEvent.scroll(window);
    expect(onDock).not.toHaveBeenCalled();
    scene.getBoundingClientRect = () => ({ top: -(800 * DOCK_AT), height: 800 }) as DOMRect;
    fireEvent.scroll(window);
    fireEvent.scroll(window);
    fireEvent.scroll(window);
    expect(onDock).toHaveBeenCalledTimes(1);
    stop();
  });

  test('docks at once when the page opens already scrolled past the scene', () => {
    const onDock = vi.fn();
    watchForDock(sceneAt(-800), onDock)();
    expect(onDock).toHaveBeenCalledTimes(1);
  });

  test('stops listening when asked', () => {
    const scene = sceneAt(0);
    const onDock = vi.fn();
    watchForDock(scene, onDock)();
    scene.getBoundingClientRect = () => ({ top: -800, height: 800 }) as DOMRect;
    fireEvent.scroll(window);
    expect(onDock).not.toHaveBeenCalled();
  });
});

describe('StoryOpening: docking', () => {
  test('undockTitle takes the title back out of the header: the header fades out, the big title fades in', () => {
    const { container } = render(
      <>
        <CaseHeader title={card.title} years={card.years} startHidden />
        <span id="big" style={{ opacity: 0 }}>
          {card.title}
        </span>
      </>
    );
    const bar = container.querySelector('[data-case-header="bar"]') as HTMLElement;
    const big = container.querySelector('#big') as HTMLElement;
    undockTitle(big);
    expect(gsap.getTweensOf(bar)[0].vars.opacity).toBe(0);
    expect(gsap.getTweensOf(big)[0].vars.opacity).toBe(1);
  });

  test('docks the title into the header once, when the reader scrolls', () => {
    const { container } = render(
      <>
        <CaseHeader title={card.title} years={card.years} unsolved startHidden />
        <StoryOpening card={card} />
      </>
    );
    const bar = container.querySelector('[data-case-header="bar"]') as HTMLElement;
    const opening = container.querySelector('[data-story="opening"]') as HTMLElement;
    expect(bar.style.opacity).toBe('0');
    opening.getBoundingClientRect = () => ({ top: -400, height: 800, left: 0, width: 0 }) as DOMRect;
    expect(gsap.getTweensOf(bar)).toHaveLength(0);
    fireEvent.scroll(window);
    fireEvent.scroll(window);
    // No layout in jsdom (zero width): the title does not fly, the header fades in, and only once.
    expect(document.querySelectorAll('body > [aria-hidden="true"]').length).toBe(0);
    expect(gsap.getTweensOf(bar)).toHaveLength(1);
  });

  test('dockTitle under reduced motion fades the header in and moves nothing', () => {
    const { container } = render(
      <>
        <CaseHeader title={card.title} years={card.years} startHidden />
        <span id="big">{card.title}</span>
      </>
    );
    const bar = container.querySelector('[data-case-header="bar"]') as HTMLElement;
    const big = container.querySelector('#big') as HTMLElement;
    dockTitle(big, { reduced: true });
    expect(document.body.querySelectorAll('[style*="position: fixed"]')).toHaveLength(0);
    expect(big.style.opacity).toBe('');
    expect(bar).toBeDefined();
  });

  test('dockTitle with layout flies a fixed copy and hides the big title', () => {
    const { container } = render(
      <>
        <CaseHeader title={card.title} years={card.years} startHidden />
        <span id="big">{card.title}</span>
      </>
    );
    const big = container.querySelector('#big') as HTMLElement;
    const target = container.querySelector('[data-case-header="title"]') as HTMLElement;
    big.getBoundingClientRect = () => ({ left: 100, top: 300, width: 400, height: 60 }) as DOMRect;
    target.getBoundingClientRect = () => ({ left: 16, top: 6, width: 100, height: 20 }) as DOMRect;
    dockTitle(big, { reduced: false });
    const copy = document.body.querySelector('body > span[aria-hidden="true"]') as HTMLElement;
    expect(copy).not.toBeNull();
    expect(copy.style.position).toBe('fixed');
    expect(copy.style.left).toBe('100px');
    expect(copy.style.top).toBe('300px');
    expect(big.style.opacity).toBe('0');
  });
});

// @vitest-environment jsdom
// src/features/landing/__tests__/landing-stage.test.ts
// The landing stage (landing v2 brief, 2): one gesture moves exactly one case, with a lock while it moves; the old
// words blur out and the new ones in; the frame leaves up and to the left; after the last case the page is let go.
import { act } from '@testing-library/react';
import gsap from 'gsap';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createLandingStage, poseOver, STAGE_AWAY, STAGE_HELD_ATTRIBUTE, type StageHandle } from '@/features/landing/landing-stage';
import * as smoothScroll from '@/lib/smooth-scroll';

const settle = () => act(() => gsap.globalTimeline.getChildren(false, true, true).forEach(child => child.progress(1)));
const press = (key: string) => act(() => void window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })));

function build(count = 3) {
  document.body.innerHTML = '';
  const root = document.createElement('div');
  const sections = Array.from({ length: count }, (_, index) => {
    const section = document.createElement('li');
    section.id = `exhibit-${index}`;
    section.innerHTML = `<div data-exhibit-part="anchor"><div class="haunted-frame"></div></div><div data-exhibit-part="title">T${index}</div><div data-exhibit-part="words">W${index}</div>${
      index < count - 1 ? '<div data-exhibit-part="peek"><div class="haunted-frame"></div></div>' : ''
    }`;
    root.appendChild(section);
    return section;
  });
  document.body.appendChild(root);
  return { root, sections };
}

let stage: StageHandle;
let changes: number[];
let sections: HTMLElement[];
const make = (count = 3, start = 0) => {
  const built = build(count);
  sections = built.sections;
  changes = [];
  stage = createLandingStage({ root: built.root, sections, start, shown: false, onChange: index => changes.push(index) });
};
const part = (index: number, name: string) => sections[index].querySelector<HTMLElement>(`[data-exhibit-part="${name}"]`)!;

beforeEach(() => {
  vi.spyOn(smoothScroll, 'holdSmoothScroll').mockImplementation(() => undefined);
  vi.spyOn(smoothScroll, 'releaseSmoothScroll').mockImplementation(() => undefined);
});
afterEach(() => {
  stage?.destroy();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('the landing stage', () => {
  test('only the case on screen is there; its frame and words wait for the opening', () => {
    make();
    expect(sections.map(section => section.style.visibility)).toEqual(['visible', 'hidden', 'hidden']);
    expect(part(0, 'anchor').style.opacity).toBe('0');
    expect(part(0, 'words').style.opacity).toBe('0');
    stage.showFrame();
    settle();
    expect(part(0, 'anchor').style.opacity).toBe('1');
  });

  test('nothing moves before the opening is over; then one gesture is one case', () => {
    make();
    press('ArrowDown');
    expect(changes).toEqual([]);
    stage.ready();
    settle();
    expect(document.documentElement.getAttribute(STAGE_HELD_ATTRIBUTE)).toBe('held');
    press('ArrowDown');
    expect(changes).toEqual([1]);
    // While it moves, another gesture is swallowed.
    press('ArrowDown');
    press('ArrowDown');
    expect(changes).toEqual([1]);
    settle();
    expect(sections.map(section => section.style.visibility)).toEqual(['hidden', 'visible', 'hidden']);
    press('ArrowDown');
    expect(changes).toEqual([1, 2]);
    settle();
    press('ArrowUp');
    expect(changes).toEqual([1, 2, 1]);
  });

  test('forward: the frame scales up and leaves up and to the left; the peeking one rises into the centre; the words blur out and in', () => {
    make();
    stage.ready();
    settle();
    press('ArrowDown');
    const leaving = gsap.getTweensOf(part(0, 'anchor')).find(tween => tween.vars.scale === STAGE_AWAY.scale)!;
    expect(leaving.vars.x as number).toBeLessThan(0);
    expect(leaving.vars.y as number).toBeLessThan(0);
    expect(gsap.getTweensOf(part(1, 'anchor')).some(tween => tween.vars.scale === 1 && tween.vars.x === 0 && tween.vars.y === 0)).toBe(true);
    // Text only when the frame is still: the old words go at once, the new ones come only after the frame has landed.
    const out = gsap.getTweensOf(part(0, 'words'))[0];
    expect(String(out.vars.filter)).toContain('blur');
    expect(out.startTime()).toBe(0);
    expect(out.duration()).toBeLessThanOrEqual(0.3);
    const frameLands = Math.max(...gsap.getTweensOf(part(1, 'anchor')).map(tween => tween.startTime() + tween.duration()));
    const wordsIn = gsap.getTweensOf(part(1, 'words')).find(tween => tween.vars.filter === 'blur(0px)')!;
    expect(wordsIn.startTime()).toBeGreaterThanOrEqual(frameLands - 0.001);
    // Only transform and opacity (and the text's blur) are ever written to the frames.
    const keys = gsap.getTweensOf([part(0, 'anchor'), part(1, 'anchor')]).flatMap(tween => Object.keys(tween.vars));
    expect(keys.filter(key => ['width', 'height', 'top', 'left', 'margin', 'padding', 'filter'].includes(key))).toEqual([]);
    settle();
  });

  test('keys: PageDown, Space and Home and End; Space on a button is the button\'s', () => {
    make(4);
    stage.ready();
    settle();
    press('PageDown');
    settle();
    press(' ');
    settle();
    expect(stage.current()).toBe(2);
    press('Home');
    expect(stage.current()).toBe(0);
    settle();
    press('End');
    expect(stage.current()).toBe(3);
    settle();
    const button = document.createElement('button');
    document.body.appendChild(button);
    act(() => void button.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })));
    expect(stage.current()).toBe(3);
  });

  test('a rail jump is one move, either way', () => {
    make(5);
    stage.ready();
    settle();
    stage.go(3);
    expect(changes).toEqual([3]);
    settle();
    stage.go(1);
    expect(changes).toEqual([3, 1]);
  });

  test('after the last case the next gesture lets go of the page and scrolls on to the footer', () => {
    const scroll = vi.spyOn(smoothScroll, 'scrollToY').mockImplementation(() => undefined);
    make(2);
    stage.ready();
    settle();
    press('ArrowDown');
    settle();
    expect(scroll).not.toHaveBeenCalled();
    press('ArrowDown');
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(stage.released()).toBe(true);
    expect(document.documentElement.hasAttribute(STAGE_HELD_ATTRIBUTE)).toBe(false);
    // Scrolling back to the top takes the stage again, at the last case.
    vi.spyOn(smoothScroll, 'jumpToY').mockImplementation(() => undefined);
    Object.defineProperty(window, 'scrollY', { value: 600, configurable: true });
    act(() => void window.dispatchEvent(new Event('scroll')));
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
    act(() => void window.dispatchEvent(new Event('scroll')));
    expect(stage.released()).toBe(false);
    expect(stage.current()).toBe(1);
    expect(document.documentElement.getAttribute(STAGE_HELD_ATTRIBUTE)).toBe('held');
  });

  test('poseOver puts a frame over a target rectangle', () => {
    const pose = poseOver({ left: 100, top: 100, width: 400, height: 300 }, { left: 800, top: 600, width: 200, height: 150 });
    expect(pose).toEqual({ x: 600, y: 425, scale: 0.5 });
  });
});

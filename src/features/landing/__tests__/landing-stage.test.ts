// @vitest-environment jsdom
// src/features/landing/__tests__/landing-stage.test.ts
// The landing stage (landing timing fix): one gesture, one committed move of about 0.6s with exact timings; the
// momentum filter; one animation per frame; the words never wait for the move; only the case in hand can be pressed.
import { act } from '@testing-library/react';
import gsap from 'gsap';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createGestureGate, createLandingStage, LANDING_MOVE_EVENT, LANDING_GESTURE, LANDING_LERP, MOVE_GRACE_MS, peekRect, poseOver, STAGE_AWAY, type StageHandle } from '@/features/landing/landing-stage';
import { LANDING_MOVE, MOTION } from '@/lib/motion';
import * as smoothScroll from '@/lib/smooth-scroll';
import { stubMatchMedia } from '@/test/match-media';

let stage: StageHandle | undefined;
let changes: number[];
let sections: HTMLElement[];
let track: HTMLElement;
const setY = (y: number) => Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
const press = (key: string) => act(() => void window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })));
const wheel = (deltaY: number, timeStamp: number) => {
  const event = new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true });
  Object.defineProperty(event, 'timeStamp', { value: timeStamp });
  act(() => void document.body.dispatchEvent(event));
  return event;
};
const touch = (type: 'touchstart' | 'touchmove', clientY: number) => {
  const event = new Event(type, { bubbles: true, cancelable: true }) as TouchEvent;
  Object.defineProperty(event, 'touches', { value: [{ clientY }] });
  act(() => void document.body.dispatchEvent(event));
  return event;
};
/** Plays the running move to its end. */
const finish = () => act(() => void stage!.timeline()?.progress(1));
const part = (index: number, name: string) => {
  if (name === 'name' || name === 'years') {
    return sections[index].querySelector<HTMLElement>(name === 'name' ? '[data-exhibit-part="title"] h2' : '[data-exhibit-part="title"] p')!;
  }
  return sections[index].querySelector<HTMLElement>(`[data-exhibit-part="${name}"]`)!;
};
/** The tween of the running move on `target`. */
const tweenOn = (target: Element) => stage!.timeline()!.getChildren(true, true, false).find(child => (child as gsap.core.Tween).targets().includes(target)) as gsap.core.Tween;

/** Cases on a track 100px a case. */
function make(count = 4, start = 0) {
  stage?.destroy();
  stage = undefined;
  gsap.globalTimeline.clear();
  setY(0);
  document.body.innerHTML = '';
  track = document.createElement('div');
  const root = document.createElement('div');
  sections = Array.from({ length: count }, (_, index) => {
    const section = document.createElement('li');
    section.dataset.exhibit = String(index);
    section.innerHTML = `<div data-exhibit-part="place"><div data-exhibit-part="anchor"><div data-exhibit-part="rise"><span data-frame-part="tilt"><div class="haunted-frame"></div></span></div></div><div data-exhibit-part="title"><h2>Case title ${index}</h2><p>1872</p></div></div><div data-exhibit-part="words">W${index}</div>`;
    section.querySelector<HTMLElement>('[data-exhibit-part="anchor"]')!.getBoundingClientRect = () =>
      ({ left: 200, top: 150, width: 400, height: 300, right: 600, bottom: 450, x: 200, y: 150, toJSON: () => ({}) }) as DOMRect;
    root.appendChild(section);
    return section;
  });
  track.appendChild(root);
  document.body.appendChild(track);
  Object.defineProperty(track, 'offsetHeight', { value: count * 100, configurable: true });
  track.getBoundingClientRect = () => ({ top: -window.scrollY, bottom: count * 100 - window.scrollY, left: 0, right: 0, width: 0, height: count * 100, x: 0, y: -window.scrollY, toJSON: () => ({}) });
  Object.defineProperty(root, 'offsetHeight', { value: 100, configurable: true });
  changes = [];
  stage = createLandingStage({ track, stage: root, sections, start, shown: false, onChange: index => changes.push(index) });
}

beforeEach(() => {
  stubMatchMedia();
  setY(0);
  vi.spyOn(smoothScroll, 'setSmoothLerp').mockImplementation(() => undefined);
  vi.spyOn(smoothScroll, 'scrollToY').mockImplementation(() => undefined);
  vi.spyOn(smoothScroll, 'jumpToY').mockImplementation(y => setY(y));
});
afterEach(() => {
  stage?.destroy();
  stage = undefined;
  gsap.globalTimeline.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('one committed move, with these numbers', () => {
  test('the leaving frame: up and left off the screen to about 1.3x, 0.4s, power2.in', () => {
    make();
    stage!.ready();
    wheel(80, 1000);
    const leave = tweenOn(part(0, 'anchor'));
    expect(leave.startTime()).toBe(0);
    expect(leave.duration()).toBe(0.4);
    expect(leave.vars.ease).toBe('power2.in');
    expect(leave.vars.scale).toBe(1.3);
    expect(leave.vars.x as number).toBeLessThan(0);
    expect(leave.vars.y as number).toBeLessThan(0);
    expect(STAGE_AWAY.scale).toBe(1.3);
  });

  test('the arriving frame: from the preview spot to the centre at full size, 0.55s, expo.out; the next preview rises into the corner over the same 0.55s', () => {
    make();
    stage!.ready();
    const atPeek = poseOver({ left: 200, top: 150, width: 400, height: 300 }, peekRect({ width: 400, height: 300 }));
    // At rest, case 1's own frame is the preview.
    expect(Number(gsap.getProperty(part(1, 'anchor'), 'x'))).toBeCloseTo(atPeek.x, 3);
    wheel(80, 1000);
    const arrive = tweenOn(part(1, 'anchor'));
    expect([arrive.startTime(), arrive.duration(), arrive.vars.ease]).toEqual([0, 0.55, 'expo.out']);
    expect(arrive.vars).toMatchObject({ x: 0, y: 0, scale: 1 });
    const next = tweenOn(part(2, 'anchor'));
    expect([next.startTime(), next.duration(), next.vars.ease]).toEqual([0, 0.55, 'expo.out']);
    expect(Number(next.vars.x)).toBeCloseTo(atPeek.x, 3);
    expect(sections[2].style.visibility).toBe('visible');
    finish();
    expect(Number(gsap.getProperty(part(1, 'anchor'), 'scale'))).toBe(1);
    expect(sections.map(section => section.style.visibility)).toEqual(['hidden', 'visible', 'visible', 'hidden']);
  });

  test('the old words fade out in 0.15s at the start; the new headline and subline fade in with a small rise from 0.25s to 0.6s; the title writes in from 0.35s to 0.75s', () => {
    make();
    stage!.ready();
    act(() => void gsap.globalTimeline.getChildren(false, true, true).forEach(child => child.progress(1)));
    expect(stage!.wordsFor()).toBe(0);
    wheel(80, 1000);
    const tl = stage!.timeline()!;
    const out = tweenOn(part(0, 'words'));
    expect([out.startTime(), out.duration(), out.vars.opacity]).toEqual([0, 0.15, 0]);
    expect(tweenOn(part(0, 'title')).duration()).toBe(0.15);
    const words = tweenOn(part(1, 'words'));
    expect(words.startTime()).toBe(0.25);
    expect(words.startTime() + words.duration()).toBeCloseTo(0.6, 5);
    expect(words.vars).toMatchObject({ opacity: 1, y: 0 });
    expect(Number(gsap.getProperty(part(1, 'words'), 'y'))).toBeGreaterThan(0);
    const letters = [...part(1, 'name').querySelectorAll('div')];
    expect(letters.length).toBe('Case title 1'.replace(/ /g, '').length);
    const writing = tweenOn(letters[0]);
    expect(writing.startTime()).toBeCloseTo(0.35, 5);
    expect(writing.endTime()).toBeCloseTo(0.75, 5);
    expect(stage!.wordsFor()).toBe(1);
    // Never waiting for the move to settle: the headline is readable while the frames still travel.
    tl.time(0.5);
    expect(Number(gsap.getProperty(part(1, 'words'), 'opacity'))).toBeGreaterThan(0.6);
    expect(Number(gsap.getProperty(part(1, 'anchor'), 'scale'))).toBeLessThan(1);
    finish();
    expect(part(1, 'name').textContent).toBe('Case title 1');
    expect(part(1, 'name').querySelector('div')).toBeNull();
  });

  test('the whole move: about 0.6s, and input counts again at 0.6s while the title is still writing', () => {
    make();
    stage!.ready();
    wheel(80, 1000);
    const tl = stage!.timeline()!;
    expect(tl.duration()).toBeCloseTo(0.75, 5);
    act(() => void tl.time(0.59));
    expect(stage!.moving()).toBe(true);
    act(() => void tl.time(0.61));
    expect(stage!.moving()).toBe(false);
    // A new gesture now: the next move.
    wheel(80, 3000);
    expect(changes).toEqual([1, 2]);
  });

  test('backward: the other way round, each frame with one tween', () => {
    make(4, 2);
    stage!.ready();
    wheel(-80, 1000);
    expect(changes).toEqual([1]);
    const toPeek = tweenOn(part(2, 'anchor'));
    expect(toPeek.vars.ease).toBe('expo.out');
    const back = tweenOn(part(1, 'anchor'));
    expect(back.vars).toMatchObject({ x: 0, y: 0, scale: 1, ease: 'expo.out' });
    finish();
    expect(sections.map(section => section.style.visibility)).toEqual(['hidden', 'visible', 'visible', 'hidden']);
  });

  test('one animation per frame: each frame has one tween in a move, overwriting what was there; the tilt wrapper is never touched', () => {
    make();
    stage!.ready();
    wheel(80, 1000);
    for (const index of [0, 1, 2]) {
      const tweens = gsap.getTweensOf(part(index, 'anchor'));
      expect(tweens, String(index)).toHaveLength(1);
      expect(tweens[0].vars.overwrite).toBe('auto');
    }
    expect(gsap.getTweensOf(sections.map(section => section.querySelector('[data-frame-part="tilt"]')!))).toHaveLength(0);
    expect(gsap.getTweensOf(sections.map(section => part(sections.indexOf(section), 'rise')))).toHaveLength(0);
    // A jump while a move runs ends that one first: still one tween per frame.
    stage!.go(3);
    for (const index of [0, 1, 2, 3]) {
      expect(gsap.getTweensOf(part(index, 'anchor')).length, String(index)).toBeLessThanOrEqual(1);
    }
  });

  test('no elastic or back eases anywhere on the landing', () => {
    const landing = Object.entries(MOTION).filter(([name]) => name.startsWith('landing.'));
    expect(landing.filter(([, token]) => /elastic|back/.test(token.ease))).toEqual([]);
    for (const file of ['landing-stage.ts', 'use-frame-tilt.ts', 'FrameActions.tsx', 'Opening.tsx', 'Landing.tsx', 'ExhibitSection.tsx']) {
      const source = readFileSync(resolve(__dirname, '..', file), 'utf8');
      expect(source, file).not.toMatch(/['"](elastic|back)\.|paper\.land|story\.hook/);
    }
    expect(LANDING_MOVE).toMatchObject({ wordsAt: 0.25, titleFrom: 0.35, titleTo: 0.75, unlockAt: 0.6, leaveScale: 1.3 });
  });
});

describe('one case per gesture', () => {
  test('a wheel gesture is taken before Lenis and moves one case; Lenis follows softly in the footer', () => {
    make();
    stage!.ready();
    const lenisSaw = vi.fn();
    window.addEventListener('wheel', lenisSaw);
    const event = wheel(80, 1000);
    window.removeEventListener('wheel', lenisSaw);
    expect(event.defaultPrevented).toBe(true);
    expect(lenisSaw).not.toHaveBeenCalled();
    expect(changes).toEqual([1]);
    expect(LANDING_LERP).toBe(0.08);
  });

  test('a hard flick and its long trailing momentum move only one case', () => {
    make(6);
    stage!.ready();
    let t = 1000;
    for (let i = 0; i < 20; i += 1, t += 16) {
      wheel(900, t);
    }
    finish();
    for (let size = 300; size > 0.5; size *= 0.9, t += 40) {
      expect(wheel(size, t).defaultPrevented).toBe(true);
    }
    expect(changes).toEqual([1]);
    wheel(80, t + 1500);
    expect(changes).toEqual([1, 2]);
  });

  test('momentum is told apart from a new gesture', () => {
    const gate = createGestureGate();
    expect(gate.note(0, 600)).toBe(true);
    expect(gate.note(LANDING_GESTURE.gapMs + 50, 200)).toBe(false);
    expect(gate.note(2 * LANDING_GESTURE.gapMs + 100, 400)).toBe(true);
    expect(gate.note(5000, 10)).toBe(true);
  });

  test('a swipe moves one case per touch, once it means it', () => {
    make();
    stage!.ready();
    touch('touchstart', 500);
    expect(touch('touchmove', 496).defaultPrevented).toBe(true);
    expect(changes).toEqual([]);
    touch('touchmove', 400);
    touch('touchmove', 100);
    expect(changes).toEqual([1]);
    finish();
    touch('touchstart', 500);
    touch('touchmove', 400);
    expect(changes).toEqual([1, 2]);
  });

  test('keys: one case each, ignored while a move runs; Home and End to the ends; the rail jumps', () => {
    make(5);
    stage!.ready();
    press('ArrowDown');
    press('ArrowDown');
    expect(changes).toEqual([1]);
    finish();
    press('PageDown');
    finish();
    press('PageUp');
    finish();
    press('End');
    finish();
    press('Home');
    finish();
    expect(changes).toEqual([1, 2, 1, 4, 0]);
    stage!.go(3);
    expect(changes.at(-1)).toBe(3);
  });

  test('nothing moves before the opening is over; a dialog keeps its own wheel', () => {
    make(3);
    press('ArrowDown');
    wheel(80, 1000);
    expect(changes).toEqual([]);
    stage!.ready();
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    document.body.appendChild(dialog);
    const event = new WheelEvent('wheel', { deltaY: 80, bubbles: true, cancelable: true });
    dialog.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  test('past the last case the next gesture is Lenis\'s, into the footer; up from the top of the footer, back to the last case', () => {
    make(3, 2);
    stage!.ready();
    expect(wheel(80, 1000).defaultPrevented).toBe(false);
    setY(900);
    expect(wheel(-80, 3000).defaultPrevented).toBe(false);
    setY(230);
    expect(wheel(-80, 5000).defaultPrevented).toBe(true);
    expect(vi.mocked(smoothScroll.scrollToY).mock.calls.map(call => call[0])).toEqual([200]);
  });

  test('a move that is cut short never locks the page', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    make();
    stage!.ready();
    press('ArrowDown');
    stage!.timeline()!.kill();
    expect(stage!.moving()).toBe(true);
    act(() => void vi.advanceTimersByTime(600 + MOVE_GRACE_MS + 10));
    expect(stage!.moving()).toBe(false);
  });

  test('a page opened at a case in the address starts there', () => {
    make(4, 2);
    expect(smoothScroll.jumpToY).toHaveBeenCalledWith(200);
    expect(sections.map(section => section.getAttribute('data-current'))).toEqual(['false', 'false', 'true', 'false']);
  });
});

describe('a move tells the page as it starts', () => {
  test('every move (a gesture, a key, the rail) sends the move event at its start', () => {
    make(5);
    stage!.ready();
    const heard: { from: number; to: number }[] = [];
    const listener = (event: Event) => heard.push((event as CustomEvent).detail);
    window.addEventListener(LANDING_MOVE_EVENT, listener);
    wheel(80, 1000);
    expect(heard).toEqual([{ from: 0, to: 1 }]);
    finish();
    press('ArrowDown');
    finish();
    stage!.go(0);
    window.removeEventListener(LANDING_MOVE_EVENT, listener);
    expect(heard.map(each => each.to)).toEqual([1, 2, 0]);
  });
});

describe('only the case in hand can be pressed', () => {
  test('a press on the peeking frame does nothing; the one in hand keeps its own; the marks follow a move', () => {
    make(3);
    stage!.ready();
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    act(() => void part(1, 'anchor').dispatchEvent(event));
    expect(event.defaultPrevented).toBe(true);
    expect(changes).toEqual([]);
    const own = new MouseEvent('click', { bubbles: true, cancelable: true });
    act(() => void part(0, 'anchor').dispatchEvent(own));
    expect(own.defaultPrevented).toBe(false);
    press('ArrowDown');
    expect(sections.map(section => section.getAttribute('data-current'))).toEqual(['false', 'true', 'false']);
  });
});

describe('peekRect', () => {
  test('the bottom right, a quarter of the screen high, keeping the frame\'s own shape, part of it below the edge', () => {
    const rect = peekRect({ width: 400, height: 300 }, { width: 1440, height: 900 });
    expect(rect.height).toBeCloseTo(900 * 0.26, 5);
    expect(rect.width / rect.height).toBeCloseTo(4 / 3, 5);
    expect(rect.left + rect.width).toBeCloseTo(1440 * 0.96, 5);
    expect(rect.top + rect.height).toBeGreaterThan(900);
  });
});

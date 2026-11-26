// @vitest-environment jsdom
// src/features/landing/__tests__/landing-stage.test.ts
// The landing stage (landing fixes brief): free, silky scrolling; one timeline scrubbed by the scroll with a label at
// every case; a soft snap that never blocks; the words only once the scroll has settled on a case, gone as soon as it
// starts again; the frames hang from a wire.
import { act } from '@testing-library/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createGestureGate, createLandingStage, FRAME_SWING, LANDING_GESTURE, LANDING_LERP, MOVE_GRACE_MS, peekRect, poseOver, STAGE_AWAY, type StageHandle } from '@/features/landing/landing-stage';
import * as smoothScroll from '@/lib/smooth-scroll';
import { stubMatchMedia } from '@/test/match-media';

/** Runs every tween and delayed call now. */
const settle = () =>
  act(() => {
    // Callbacks on, and again for whatever a callback starts.
    for (let pass = 0; pass < 4; pass += 1) {
      gsap.globalTimeline.getChildren(false, true, true).forEach(child => child.progress(1, false));
    }
  });
const press = (key: string, init: KeyboardEventInit = {}) => act(() => void window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })));

let stage: StageHandle;
let changes: number[];
let sections: HTMLElement[];
let track: HTMLElement;
const setY = (y: number) => Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
/** Every scroll the stage has asked for, by its target. */
const moves = () => vi.mocked(smoothScroll.scrollToY).mock.calls.map(call => call[0]);
/** The last move lands: the page is there, and Lenis says it is done. */
const land = () => {
  const call = vi.mocked(smoothScroll.scrollToY).mock.calls.at(-1)!;
  setY(call[0]);
  stage.update(call[0] / 100);
  act(() => call[1]!.onComplete!());
};
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
const part = (index: number, name: string) => {
  if (name === 'name' || name === 'years') {
    return sections[index].querySelector<HTMLElement>(name === 'name' ? '[data-exhibit-part="title"] h2' : '[data-exhibit-part="title"] p')!;
  }
  return sections[index].querySelector<HTMLElement>(`[data-exhibit-part="${name}"]`)!;
};

/** Three or more cases on a track 100px a case: the scroll maths is simple. */
function make(count = 4, start = 0, shown = false) {
  document.body.innerHTML = '';
  track = document.createElement('div');
  const root = document.createElement('div');
  sections = Array.from({ length: count }, (_, index) => {
    const section = document.createElement('li');
    section.id = `exhibit-${index}`;
    section.dataset.exhibit = String(index);
    section.innerHTML = `<div data-exhibit-part="place"><div data-exhibit-part="anchor"><div data-exhibit-part="rise"><div class="haunted-frame"></div></div></div><div data-exhibit-part="title"><h2>Case title ${index}</h2><p>1872</p></div></div><div data-exhibit-part="words">W${index}</div>`;
    // Every frame rests in the same place on the stage: 400 by 300, a little left of centre.
    section.querySelector<HTMLElement>('[data-exhibit-part="anchor"]')!.getBoundingClientRect = () =>
      ({ left: 200, top: 150, width: 400, height: 300, right: 600, bottom: 450, x: 200, y: 150, toJSON: () => ({}) }) as DOMRect;
    root.appendChild(section);
    return section;
  });
  track.appendChild(root);
  document.body.appendChild(track);
  Object.defineProperty(track, 'offsetHeight', { value: count * 100, configurable: true });
  // The track starts at the top of the page: on screen, it moves up as the page scrolls.
  track.getBoundingClientRect = () => ({ top: -window.scrollY, bottom: count * 100 - window.scrollY, left: 0, right: 0, width: 0, height: count * 100, x: 0, y: -window.scrollY, toJSON: () => ({}) });
  Object.defineProperty(root, 'offsetHeight', { value: 100, configurable: true });
  changes = [];
  stage = createLandingStage({ track, stage: root, sections, start, shown, onChange: index => changes.push(index) });
}

beforeEach(() => {
  stubMatchMedia();
  setY(0);
  vi.spyOn(smoothScroll, 'setSmoothLerp').mockImplementation(() => undefined);
  vi.spyOn(smoothScroll, 'scrollToY').mockImplementation(() => undefined);
  vi.spyOn(smoothScroll, 'jumpToY').mockImplementation(() => undefined);
});
afterEach(() => {
  stage?.destroy();
  ScrollTrigger.getAll().forEach(trigger => trigger.kill());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('the landing stage: smooth scrolling', () => {
  test('Lenis follows the wheel softly (a lerp of about 0.08) while the landing is there, and lets go after', () => {
    make();
    expect(LANDING_LERP).toBe(0.08);
    expect(smoothScroll.setSmoothLerp).toHaveBeenCalledWith(LANDING_LERP);
    stage.destroy();
    expect(smoothScroll.setSmoothLerp).toHaveBeenLastCalledWith(null);
  });

  test('one timeline, scrubbed by the scroll: a unit for each move and a label at every case', () => {
    make(4);
    const timeline = stage.timeline()!;
    expect(timeline.duration()).toBe(3);
    expect([0, 1, 2, 3].map(index => timeline.labels[`case${index}`])).toEqual([0, 1, 2, 3]);
    const trigger = ScrollTrigger.getAll().find(each => each.trigger === track)!;
    expect(trigger.vars.scrub).toBe(true);
    expect(trigger.animation).toBe(timeline);
  });

  test('the scrub timeline has a label at every case, and no snap of its own', () => {
    make(4);
    const trigger = ScrollTrigger.getAll().find(each => each.trigger === track)!;
    expect(trigger.vars.scrub).toBe(true);
    expect(trigger.vars.snap).toBeUndefined();
  });

  test('each move: the frame scales up and leaves up and to the left, the next rises from its peek into the centre', () => {
    make(3);
    const timeline = stage.timeline()!;
    const leaving = gsap.getTweensOf(part(0, 'anchor')).find(tween => tween.vars.scale === STAGE_AWAY.scale)!;
    expect(leaving.vars.x as number).toBeLessThan(0);
    expect(leaving.vars.y as number).toBeLessThan(0);
    expect(leaving.startTime()).toBe(0);
    const arriving = gsap.getTweensOf(part(1, 'anchor')).find(tween => tween.vars.scale === 1 && tween.vars.x === 0)!;
    expect(arriving.startTime()).toBe(0);
    expect(arriving.duration()).toBe(1);
    // Only transform and opacity are ever written to the frames.
    const keys = gsap.getTweensOf([part(0, 'anchor'), part(1, 'anchor'), part(2, 'anchor'), part(0, 'rise'), part(1, 'rise')]).flatMap(tween => Object.keys(tween.vars));
    expect(keys.filter(key => ['width', 'height', 'top', 'left', 'margin', 'padding', 'filter'].includes(key))).toEqual([]);
    // Scrubbed: at rest the case in hand and the next one (peeking) are drawn; the one after comes up during the move.
    timeline.time(0);
    expect(sections.map(section => section.style.visibility)).toEqual(['visible', 'visible', 'hidden']);
    timeline.time(0.5);
    expect(sections.map(section => section.style.visibility)).toEqual(['visible', 'visible', 'visible']);
    timeline.time(1);
    expect(sections.map(section => section.style.visibility)).toEqual(['hidden', 'visible', 'visible']);
    timeline.time(2);
    expect(sections.map(section => section.style.visibility)).toEqual(['hidden', 'hidden', 'visible']);
    timeline.time(0);
    expect(sections.map(section => section.style.visibility)).toEqual(['visible', 'visible', 'hidden']);
  });

  test('no stand-in frames: the next case peeking at the bottom right is its own frame, travelling into the centre and back', () => {
    make(4);
    // Nothing in any section stands in for another case's frame.
    expect(document.querySelector('[data-exhibit-part="peek"]')).toBeNull();
    const timeline = stage.timeline()!;
    const pose = (index: number) => ({
      x: Number(gsap.getProperty(part(index, 'anchor'), 'x')),
      y: Number(gsap.getProperty(part(index, 'anchor'), 'y')),
      scale: Number(gsap.getProperty(part(index, 'anchor'), 'scale')),
      opacity: Number(gsap.getProperty(part(index, 'anchor'), 'opacity')),
    });
    const near = (actual: ReturnType<typeof pose>, expected: { x: number; y: number; scale: number; opacity?: number }) => {
      expect(actual.x).toBeCloseTo(expected.x, 0);
      expect(actual.y).toBeCloseTo(expected.y, 0);
      expect(actual.scale).toBeCloseTo(expected.scale, 3);
      if (expected.opacity !== undefined) {
        expect(actual.opacity).toBe(expected.opacity);
      }
    };
    const atPeek = poseOver({ left: 200, top: 150, width: 400, height: 300 }, peekRect({ width: 400, height: 300 }));
    // At rest on case 0: case 1's own frame sits small at the bottom right, partly below the edge.
    timeline.time(0);
    near(pose(1), { ...atPeek, opacity: 1 });
    expect(atPeek.x).toBeGreaterThan(0);
    expect(atPeek.y).toBeGreaterThan(0);
    expect(atPeek.scale).toBeLessThan(1);
    // Half-way, it is on its way (neither at its peek nor at rest): one element, moving continuously.
    timeline.time(0.5);
    const half = pose(1);
    expect(half.scale).toBeGreaterThan(atPeek.scale);
    expect(half.scale).toBeLessThan(1);
    expect(half.x).toBeLessThan(atPeek.x);
    expect(half.opacity).toBe(1);
    // Landed: in the centre; case 2's own frame has come up into the peek.
    timeline.time(1);
    near(pose(1), { x: 0, y: 0, scale: 1 });
    near(pose(2), { ...atPeek, opacity: 1 });
    // Scrolled back: it travels back down to its peek, and case 2 goes back below.
    timeline.time(0.5);
    expect(pose(1).scale).toBeCloseTo(half.scale, 5);
    timeline.time(0);
    near(pose(1), atPeek);
    expect(sections[2].style.visibility).toBe('hidden');
  });

  test('pressing the frame peeking in brings it in (one move), rather than opening it there', () => {
    make(3);
    stage.ready();
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    act(() => void part(1, 'anchor').dispatchEvent(event));
    expect(event.defaultPrevented).toBe(true);
    expect(moves()).toEqual([100]);
  });

  test('the frames swing like a painting on a wire: a lean on the way, one soft sway back as the new one settles', () => {
    make(3);
    expect(FRAME_SWING).toBeGreaterThanOrEqual(1);
    expect(FRAME_SWING).toBeLessThanOrEqual(2);
    expect(part(0, 'rise').style.transformOrigin).toContain('0%');
    const leaving = gsap.getTweensOf(part(0, 'rise'))[0];
    expect(leaving.vars.rotation).toBe(-FRAME_SWING);
    const settling = gsap.getTweensOf(part(1, 'rise')).find(tween => tween.vars.rotation === 0)!;
    expect(settling.vars.ease).toBe('back.out(1.4)');
    const timeline = stage.timeline()!;
    timeline.time(1);
    expect(Number(gsap.getProperty(part(1, 'rise'), 'rotation'))).toBeCloseTo(0, 3);
    timeline.time(0.01);
    expect(Number(gsap.getProperty(part(1, 'rise'), 'rotation'))).toBeGreaterThan(FRAME_SWING - 0.5);
  });

  test('the case nearest the scroll is the current one; a fast scroll passes several', () => {
    make(5);
    stage.update(0.4);
    stage.update(3.6);
    stage.update(4);
    expect(changes).toEqual([4]);
    stage.update(2.2);
    expect(changes).toEqual([4, 2]);
  });
});

describe('the words: only once the scroll has settled on a case', () => {
  test('nothing shows before the opening is over', () => {
    make(3);
    stage.update(0);
    settle();
    expect(stage.wordsFor()).toBeNull();
    expect(part(0, 'words').style.opacity).toBe('0');
    expect(part(0, 'place').style.opacity).toBe('0');
    stage.showFrame();
    settle();
    expect(part(0, 'place').style.opacity).toBe('1');
    stage.ready();
    settle();
    expect(stage.wordsFor()).toBe(0);
  });

  test('they leave as soon as scrolling starts, and come back only after it has stopped on a case', () => {
    make(4);
    stage.ready();
    settle();
    expect(stage.wordsFor()).toBe(0);
    expect(part(0, 'words').style.opacity).toBe('1');
    // The scroll starts: gone at once, and nothing comes back while it keeps going.
    stage.update(0.3);
    expect(stage.wordsFor()).toBeNull();
    const out = gsap.getTweensOf(part(0, 'words')).find(tween => tween.vars.opacity === 0)!;
    expect(out.duration()).toBeLessThanOrEqual(0.3);
    stage.update(1.2);
    stage.update(1.7);
    expect(stage.wordsFor()).toBeNull();
    // Still moving (the snap's own ease counts): the wait starts over.
    stage.update(1.95);
    stage.update(2);
    expect(stage.wordsFor()).toBeNull();
    settle();
    expect(stage.wordsFor()).toBe(2);
    // Between two cases, even when still: no words.
    stage.update(2.5);
    settle();
    expect(stage.wordsFor()).toBeNull();
  });

  test('the headline and subline blur in; the title is written in letter by letter, its years fading in after', () => {
    make(3);
    stage.ready();
    stage.update(1);
    act(() => {
      gsap.globalTimeline.getChildren(false, true, true).forEach(child => child.progress(1, false));
    });
    expect(stage.wordsFor()).toBe(1);
    const blurIn = gsap.getTweensOf(part(1, 'words')).find(tween => tween.vars.filter === 'blur(0px)')!;
    expect(blurIn).toBeDefined();
    const writing = gsap.getTweensOf([...part(1, 'name').querySelectorAll('div')])[0];
    expect(writing.vars.stagger as number).toBeGreaterThan(0);
    settle();
    const letters = [...part(1, 'name').querySelectorAll<HTMLElement>('div, span')].filter(element => element.textContent!.length === 1);
    // (already played by settle(): the split is undone once the writing has finished)
    expect(letters.length).toBe(0);
    expect(part(1, 'name').textContent).toBe('Case title 1');
    expect(part(1, 'years').style.opacity).toBe('1');
  });

  test('the title is split into letters while it is being written, and each letter comes in one after another', () => {
    make(3);
    stage.ready();
    stage.update(1);
    // The scroll has been still for a moment: the writing starts, letter by letter.
    act(() => {
      gsap.globalTimeline.getChildren(false, true, true).forEach(child => child.progress(1, false));
    });
    expect(stage.wordsFor()).toBe(1);
    expect(part(1, 'name').querySelectorAll('div').length).toBeGreaterThan(5);
    // A scroll again while it writes: it is undone at once.
    stage.update(1.4);
    expect(stage.wordsFor()).toBeNull();
    expect(part(1, 'name').textContent).toBe('Case title 1');
    expect(part(1, 'name').querySelector('div')).toBeNull();
  });
});

describe('one case per gesture', () => {
  test('one wheel gesture moves one case, as a smooth Lenis scroll with the stage\'s easing; it is taken before Lenis', () => {
    make(4);
    stage.ready();
    const lenisSaw = vi.fn();
    window.addEventListener('wheel', lenisSaw);
    const event = wheel(80, 1000);
    window.removeEventListener('wheel', lenisSaw);
    expect(event.defaultPrevented).toBe(true);
    expect(lenisSaw).not.toHaveBeenCalled();
    expect(moves()).toEqual([100]);
    expect(vi.mocked(smoothScroll.scrollToY).mock.calls[0][1]).toMatchObject({ ease: 'power3.inOut', duration: 1.1 });
    expect(stage.moving()).toBe(true);
  });

  test('while a move runs, input is ignored; its trailing momentum never moves a second case', () => {
    make(5);
    stage.ready();
    wheel(120, 1000);
    // The flick goes on, hard, and its momentum trails after the case has landed: all one gesture.
    for (let t = 1040; t < 1600; t += 40) {
      wheel(300, t);
    }
    land();
    for (let t = 1600; t < 2400; t += 60) {
      wheel(20, t);
    }
    expect(moves()).toEqual([100]);
    // A new gesture, after a pause, once the case has settled: one more case.
    wheel(60, 3400);
    expect(moves()).toEqual([100, 200]);
  });

  test('momentum is told apart from a new gesture: a dying tail with a gap in it is still the same gesture', () => {
    const gate = createGestureGate();
    gate.note(0, 600);
    expect(gate.take(true)).toBe(true);
    // A pause longer than the gap, but the tail is weaker: still the same flick.
    gate.note(LANDING_GESTURE.gapMs + 50, 200);
    expect(gate.take(true)).toBe(false);
    // A harder push after a gap: a new gesture.
    gate.note(2 * LANDING_GESTURE.gapMs + 100, 400);
    expect(gate.take(true)).toBe(true);
    // A long quiet: always a new gesture, however soft.
    gate.note(5000, 10);
    expect(gate.take(true)).toBe(true);
  });

  test('a hard flick still moves only one case', () => {
    make(6);
    stage.ready();
    for (let t = 0; t < 900; t += 16) {
      wheel(900, 5000 + t);
    }
    expect(moves()).toEqual([100]);
  });

  test('a new gesture that starts while the move is still running is spent, even once the case has landed', () => {
    make(4);
    stage.ready();
    wheel(80, 1000);
    wheel(120, 1500);
    land();
    wheel(80, 1560);
    wheel(80, 1620);
    expect(moves()).toEqual([100]);
    wheel(80, 2600);
    expect(moves()).toEqual([100, 200]);
  });

  test('going back: one gesture, one case', () => {
    make(4, 2);
    stage.ready();
    setY(200);
    stage.update(2);
    wheel(-80, 1000);
    expect(moves()).toEqual([100]);
  });

  test('a swipe moves one case per touch, and only once it means it', () => {
    make(4);
    stage.ready();
    touch('touchstart', 500);
    expect(touch('touchmove', 496).defaultPrevented).toBe(true);
    expect(moves()).toEqual([]);
    touch('touchmove', 400);
    touch('touchmove', 200);
    expect(moves()).toEqual([100]);
    land();
    touch('touchmove', 100);
    expect(moves()).toEqual([100]);
    touch('touchstart', 500);
    touch('touchmove', 400);
    expect(moves()).toEqual([100, 200]);
  });

  test('arrows, Page keys and Space go one case; while it moves they are ignored; Home and End jump to the ends', () => {
    make(4);
    stage.ready();
    press('ArrowDown');
    press('ArrowDown');
    press('PageDown');
    expect(moves()).toEqual([100]);
    land();
    press(' ');
    expect(moves()).toEqual([100, 200]);
    land();
    press('PageUp');
    expect(moves()).toEqual([100, 200, 100]);
    land();
    press('End');
    expect(moves().at(-1)).toBe(300);
    land();
    press('Home');
    expect(moves().at(-1)).toBe(0);
  });

  test('Space on a button is the button\'s; nothing moves before the opening is over; a dialog keeps its own wheel', () => {
    make(3);
    press('ArrowDown');
    wheel(80, 1000);
    expect(moves()).toEqual([]);
    stage.ready();
    const button = document.createElement('button');
    document.body.appendChild(button);
    act(() => void button.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })));
    expect(moves()).toEqual([]);
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    document.body.appendChild(dialog);
    const event = new WheelEvent('wheel', { deltaY: 80, bubbles: true, cancelable: true });
    dialog.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(moves()).toEqual([]);
  });

  test('the rail and the wordmark jump straight to their case, in one move', () => {
    make(6);
    stage.ready();
    stage.go(4);
    expect(moves()).toEqual([400]);
    land();
    stage.go(0);
    expect(moves()).toEqual([400, 0]);
  });

  test('past the last case the next gesture goes to Lenis, into the footer; scrolling up from the top of the footer goes back to the last case', () => {
    make(3, 2);
    stage.ready();
    setY(200);
    stage.update(2);
    // Down from the last case: not the stage's, so Lenis scrolls on.
    const down = wheel(80, 1000);
    expect(down.defaultPrevented).toBe(false);
    expect(moves()).toEqual([]);
    // Deep in the footer, up: still the page's.
    setY(900);
    expect(wheel(-80, 2000).defaultPrevented).toBe(false);
    // Near its top, a scroll up that would cross back into the cases: one move, back to the last case.
    setY(230);
    expect(wheel(-80, 3000).defaultPrevented).toBe(true);
    expect(moves()).toEqual([200]);
    // The rest of that gesture, still far down the page as the move begins, is swallowed too: never Lenis's.
    setY(260);
    expect(wheel(-80, 3040).defaultPrevented).toBe(true);
    expect(moves()).toEqual([200]);
  });

  test('anything else that brings the page up out of the footer (a key, the scrollbar) goes back to the last case', () => {
    make(3, 2);
    stage.ready();
    setY(600);
    act(() => void window.dispatchEvent(new Event('scroll')));
    setY(150);
    act(() => void window.dispatchEvent(new Event('scroll')));
    expect(moves()).toEqual([200]);
  });

  test('a move that is cut short never locks the page: it counts as landed after its own time', () => {
    vi.useFakeTimers();
    make(4);
    stage.ready();
    wheel(80, 1000);
    expect(stage.moving()).toBe(true);
    vi.advanceTimersByTime(1100 + MOVE_GRACE_MS + 10);
    expect(stage.moving()).toBe(false);
    vi.useRealTimers();
  });

  test('the words go as a move starts', () => {
    make(3);
    stage.ready();
    settle();
    expect(stage.wordsFor()).toBe(0);
    wheel(80, 1000);
    expect(stage.wordsFor()).toBeNull();
  });

  test('a page opened at a case in the address starts there', () => {
    make(4, 2);
    expect(smoothScroll.jumpToY).toHaveBeenCalledWith(200);
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

describe('poseOver', () => {
  test('puts a frame over a target rectangle', () => {
    expect(poseOver({ left: 100, top: 100, width: 400, height: 300 }, { left: 800, top: 600, width: 200, height: 150 })).toEqual({ x: 600, y: 425, scale: 0.5 });
  });
});

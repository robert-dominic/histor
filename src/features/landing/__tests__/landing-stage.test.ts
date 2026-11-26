// @vitest-environment jsdom
// src/features/landing/__tests__/landing-stage!.test.ts
// The landing stage: one timeline scrubbed by the scroll with a label at every case; one case per gesture, the frames
// following the hand while it moves and settling when it lets go; the words only once a case has settled, gone as
// soon as the frames move again; the frames hang from a wire.
import { act } from '@testing-library/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createGestureGate, createLandingStage, FRAME_SWING, LANDING_DRAG, LANDING_GESTURE, LANDING_LERP, MOVE_GRACE_MS, peekRect, poseOver, settleTarget, STAGE_AWAY, type StageHandle } from '@/features/landing/landing-stage';
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

let stage: StageHandle | undefined;
let changes: number[];
let sections: HTMLElement[];
let track: HTMLElement;
const setY = (y: number) => Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
/** How far the hand goes for one case, in px. */
const reach = () => window.innerHeight * LANDING_DRAG.perCase;
/** Lets the wheel be quiet long enough for the gesture to be let go. */
const quiet = () => act(() => void vi.advanceTimersByTime(LANDING_DRAG.quietMs + 10));
/** Where the frames are, and the case the page is on. */
const place = () => stage!.place();
const wheel = (deltaY: number, timeStamp: number) => {
  const event = new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true });
  Object.defineProperty(event, 'timeStamp', { value: timeStamp });
  act(() => void document.body.dispatchEvent(event));
  return event;
};
const touch = (type: 'touchstart' | 'touchmove' | 'touchend', clientY: number) => {
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
  stage?.destroy();
  stage = undefined;
  gsap.globalTimeline.clear();
  setY(0);
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
  stage = undefined;
  stage = createLandingStage({ track, stage: root, sections, start, shown, onChange: index => changes.push(index) });
}

beforeEach(() => {
  stubMatchMedia();
  setY(0);
  vi.spyOn(smoothScroll, 'setSmoothLerp').mockImplementation(() => undefined);
  vi.spyOn(smoothScroll, 'scrollToY').mockImplementation(() => undefined);
  // The page goes where it is told at once, and the scroll tells the stage (as ScrollTrigger does).
  vi.spyOn(smoothScroll, 'jumpToY').mockImplementation(y => {
    setY(y);
    stage?.update(y / 100);
  });
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
});
afterEach(() => {
  stage?.destroy();
  stage = undefined;
  gsap.globalTimeline.clear();
  vi.useRealTimers();
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
    stage!.destroy();
    expect(smoothScroll.setSmoothLerp).toHaveBeenLastCalledWith(null);
  });

  test('one timeline, scrubbed by the scroll: a unit for each move and a label at every case', () => {
    make(4);
    const timeline = stage!.timeline()!;
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
    const timeline = stage!.timeline()!;
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
    const timeline = stage!.timeline()!;
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

  test('the frames swing like a painting on a wire: a lean on the way, one soft sway back as the new one settles', () => {
    make(3);
    expect(FRAME_SWING).toBeGreaterThanOrEqual(1);
    expect(FRAME_SWING).toBeLessThanOrEqual(2);
    expect(part(0, 'rise').style.transformOrigin).toContain('0%');
    const leaving = gsap.getTweensOf(part(0, 'rise'))[0];
    expect(leaving.vars.rotation).toBe(-FRAME_SWING);
    const settling = gsap.getTweensOf(part(1, 'rise')).find(tween => tween.vars.rotation === 0)!;
    expect(settling.vars.ease).toBe('back.out(1.4)');
    const timeline = stage!.timeline()!;
    timeline.time(1);
    expect(Number(gsap.getProperty(part(1, 'rise'), 'rotation'))).toBeCloseTo(0, 3);
    timeline.time(0.01);
    expect(Number(gsap.getProperty(part(1, 'rise'), 'rotation'))).toBeGreaterThan(FRAME_SWING - 0.5);
  });

  test('the case nearest the scroll is the current one; a fast scroll passes several', () => {
    make(5);
    stage!.update(0.4);
    stage!.update(3.6);
    stage!.update(4);
    expect(changes).toEqual([4]);
    stage!.update(2.2);
    expect(changes).toEqual([4, 2]);
  });
});

describe('the words: only once the scroll has settled on a case', () => {
  test('nothing shows before the opening is over', () => {
    make(3);
    stage!.update(0);
    settle();
    expect(stage!.wordsFor()).toBeNull();
    expect(part(0, 'words').style.opacity).toBe('0');
    expect(part(0, 'place').style.opacity).toBe('0');
    stage!.showFrame();
    settle();
    expect(part(0, 'place').style.opacity).toBe('1');
    stage!.ready();
    settle();
    expect(stage!.wordsFor()).toBe(0);
  });

  test('they leave as soon as scrolling starts, and come back only after it has stopped on a case', () => {
    make(4);
    stage!.ready();
    settle();
    expect(stage!.wordsFor()).toBe(0);
    expect(part(0, 'words').style.opacity).toBe('1');
    // The scroll starts: gone at once, and nothing comes back while it keeps going.
    stage!.update(0.3);
    expect(stage!.wordsFor()).toBeNull();
    const out = gsap.getTweensOf(part(0, 'words')).find(tween => tween.vars.opacity === 0)!;
    expect(out.duration()).toBeLessThanOrEqual(0.3);
    stage!.update(1.2);
    stage!.update(1.7);
    expect(stage!.wordsFor()).toBeNull();
    // Still moving (the snap's own ease counts): the wait starts over.
    stage!.update(1.95);
    stage!.update(2);
    expect(stage!.wordsFor()).toBeNull();
    settle();
    expect(stage!.wordsFor()).toBe(2);
    // Between two cases, even when still: no words.
    stage!.update(2.5);
    settle();
    expect(stage!.wordsFor()).toBeNull();
  });

  test('the headline and subline blur in; the title is written in letter by letter, its years fading in after', () => {
    make(3);
    stage!.ready();
    stage!.update(1);
    act(() => {
      gsap.globalTimeline.getChildren(false, true, true).forEach(child => child.progress(1, false));
    });
    expect(stage!.wordsFor()).toBe(1);
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
    stage!.ready();
    stage!.update(1);
    // The scroll has been still for a moment: the writing starts, letter by letter.
    act(() => {
      gsap.globalTimeline.getChildren(false, true, true).forEach(child => child.progress(1, false));
    });
    expect(stage!.wordsFor()).toBe(1);
    expect(part(1, 'name').querySelectorAll('div').length).toBeGreaterThan(5);
    // A scroll again while it writes: it is undone at once.
    stage!.update(1.4);
    expect(stage!.wordsFor()).toBeNull();
    expect(part(1, 'name').textContent).toBe('Case title 1');
    expect(part(1, 'name').querySelector('div')).toBeNull();
  });
});

describe('one case per gesture, the frames following the hand', () => {
  test('while the wheel turns, the frames follow it directly (a quickTo of about 0.5s), taken before Lenis', () => {
    make(4);
    stage!.ready();
    settle();
    const lenisSaw = vi.fn();
    window.addEventListener('wheel', lenisSaw);
    const event = wheel(30, 1000);
    window.removeEventListener('wheel', lenisSaw);
    expect(event.defaultPrevented).toBe(true);
    expect(lenisSaw).not.toHaveBeenCalled();
    expect(stage!.gesturing()).toBe(true);
    const follow = (gsap.globalTimeline.getChildren(false, true, false) as gsap.core.Tween[]).find(child => Object.prototype.hasOwnProperty.call(child.targets()[0] ?? {}, 'at'))!;
    expect(follow.duration()).toBe(0.5);
    expect(follow.vars.ease).toBe('power3.out');
    settle();
    // Slowly: a little way only, never a jump.
    expect(place()).toBeCloseTo(30 / reach(), 5);
    expect(smoothScroll.scrollToY).not.toHaveBeenCalled();
    // The words left as soon as it moved.
    expect(stage!.wordsFor()).toBeNull();
  });

  test('a slow scroll moves the frames slowly, by as much as the hand moved', () => {
    make(4);
    stage!.ready();
    for (let t = 0; t < 5; t += 1) {
      wheel(10, 1000 + t * 30);
      settle();
      expect(place()).toBeCloseTo((10 * (t + 1)) / reach(), 5);
    }
  });

  test('during a gesture the frames go no more than one case ahead, or one back', () => {
    make(5, 2);
    setY(200);
    stage!.update(2);
    stage!.ready();
    wheel(5000, 1000);
    settle();
    expect(place()).toBe(3);
    wheel(-20000, 1030);
    settle();
    expect(place()).toBe(1);
  });

  test('let go past about 25%: the frames finish the move to the next case, softly (about 1s, power3.out)', () => {
    make(4);
    stage!.ready();
    wheel(reach() * 0.3, 1000);
    settle();
    quiet();
    expect(stage!.gesturing()).toBe(false);
    const finish = gsap.getTweensOf(gsap.globalTimeline.getChildren(false, true, false).map(child => (child as gsap.core.Tween).targets?.()[0]).find(Boolean)!).at(-1)!;
    expect(finish.vars).toMatchObject({ at: 1, ease: 'power3.out' });
    expect(finish.duration()).toBe(1);
    settle();
    expect(place()).toBe(1);
    expect(changes.at(-1)).toBe(1);
  });

  test('let go short of 25%: the frames ease back to the case they left', () => {
    make(4);
    stage!.ready();
    wheel(reach() * 0.2, 1000);
    settle();
    expect(place()).toBeGreaterThan(0.15);
    quiet();
    settle();
    expect(place()).toBe(0);
    // Back the other way too.
    make(4, 2);
    setY(200);
    stage!.update(2);
    stage!.ready();
    wheel(-reach() * 0.2, 1000);
    quiet();
    settle();
    expect(place()).toBe(2);
    wheel(-reach() * 0.4, 2000);
    quiet();
    settle();
    expect(place()).toBe(1);
  });

  test('settleTarget: on past about a quarter of the way, else back', () => {
    expect(LANDING_DRAG.carry).toBe(0.25);
    expect(settleTarget(2, 2.3)).toBe(3);
    expect(settleTarget(2, 2.2)).toBe(2);
    expect(settleTarget(2, 1.7)).toBe(1);
    expect(settleTarget(2, 1.8)).toBe(2);
  });

  test('a hard flick moves only one case, and its trailing momentum never moves a second', () => {
    make(6);
    stage!.ready();
    // The flick, hard, then its momentum dying away.
    let t = 1000;
    for (let i = 0; i < 20; i += 1, t += 16) {
      wheel(900, t);
    }
    for (let size = 300; size > 2; size *= 0.85, t += 16) {
      wheel(size, t);
    }
    settle();
    expect(place()).toBe(1);
    quiet();
    // More momentum, as the frames settle and after: swallowed.
    for (let size = 2; size > 0.3; size *= 0.9, t += 60) {
      const event = wheel(size, t);
      expect(event.defaultPrevented).toBe(true);
    }
    settle();
    expect(place()).toBe(1);
    // A new gesture, once the case has settled: one more.
    wheel(80, t + 1500);
    quiet();
    settle();
    expect(place()).toBe(2);
  });

  test('a new gesture that starts while the frames are still settling is spent, to its end', () => {
    make(4);
    stage!.ready();
    wheel(reach() * 0.5, 1000);
    quiet();
    expect(stage!.moving()).toBe(true);
    // A new push (a gap, harder) while it settles: nothing moves it, now or later.
    wheel(400, 2000);
    wheel(400, 2016);
    settle();
    expect(place()).toBe(1);
    wheel(400, 2032);
    quiet();
    settle();
    expect(place()).toBe(1);
  });

  test('momentum is told apart from a new gesture: a dying tail with a gap in it is still the same gesture', () => {
    const gate = createGestureGate();
    expect(gate.note(0, 600)).toBe(true);
    // A pause longer than the gap, but the tail is weaker: still the same flick.
    expect(gate.note(LANDING_GESTURE.gapMs + 50, 200)).toBe(false);
    // A harder push after a gap: a new gesture.
    expect(gate.note(2 * LANDING_GESTURE.gapMs + 100, 400)).toBe(true);
    // A long quiet: always a new gesture, however soft.
    expect(gate.note(5000, 10)).toBe(true);
  });

  test('a finger: the frames follow it while it is down, and settle when it lifts', () => {
    make(4);
    stage!.ready();
    touch('touchstart', 500);
    expect(touch('touchmove', 496).defaultPrevented).toBe(true);
    expect(stage!.gesturing()).toBe(false);
    touch('touchmove', 480);
    settle();
    expect(stage!.gesturing()).toBe(true);
    expect(place()).toBeCloseTo(20 / reach(), 5);
    touch('touchmove', 500 - reach() * 0.6);
    settle();
    expect(place()).toBeCloseTo(0.6, 3);
    touch('touchend', 0);
    settle();
    expect(place()).toBe(1);
    // A short drag eases back.
    touch('touchstart', 500);
    touch('touchmove', 500 - reach() * 0.15);
    touch('touchend', 0);
    settle();
    expect(place()).toBe(1);
  });

  test('arrows, Page keys and Space play the move (slower and softer: about 1.2s, power3.inOut); ignored while it moves', () => {
    make(4);
    stage!.ready();
    press('ArrowDown');
    const move = gsap.globalTimeline.getChildren(false, true, false).at(-1) as gsap.core.Tween;
    expect(move.vars).toMatchObject({ at: 1, ease: 'power3.inOut' });
    expect(move.duration()).toBe(1.2);
    press('ArrowDown');
    press('PageDown');
    settle();
    expect(place()).toBe(1);
    press(' ');
    settle();
    expect(place()).toBe(2);
    press('PageUp');
    settle();
    expect(place()).toBe(1);
    press('End');
    settle();
    expect(place()).toBe(3);
    press('Home');
    settle();
    expect(place()).toBe(0);
  });

  test('Space on a button is the button\'s; nothing moves before the opening is over; a dialog keeps its own wheel', () => {
    make(3);
    press('ArrowDown');
    wheel(80, 1000);
    settle();
    expect(place()).toBe(0);
    stage!.ready();
    const button = document.createElement('button');
    document.body.appendChild(button);
    act(() => void button.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })));
    settle();
    expect(place()).toBe(0);
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    document.body.appendChild(dialog);
    const event = new WheelEvent('wheel', { deltaY: 80, bubbles: true, cancelable: true });
    dialog.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  test('the rail and the wordmark jump straight to their case, as a move', () => {
    make(6);
    stage!.ready();
    stage!.go(4);
    const move = gsap.globalTimeline.getChildren(false, true, false).at(-1) as gsap.core.Tween;
    expect(move.vars).toMatchObject({ at: 4, ease: 'power3.inOut' });
    settle();
    expect(place()).toBe(4);
    stage!.go(0);
    settle();
    expect(place()).toBe(0);
  });

  test('past the last case the next gesture goes to Lenis, into the footer; scrolling up from the top of the footer goes back to the last case', () => {
    make(3, 2);
    stage!.ready();
    // Down from the last case: not the stage's, so Lenis scrolls on.
    expect(wheel(80, 1000).defaultPrevented).toBe(false);
    expect(stage!.gesturing()).toBe(false);
    // Deep in the footer, up: still the page's.
    setY(900);
    expect(wheel(-80, 3000).defaultPrevented).toBe(false);
    // Near its top, a scroll up that would cross back into the cases: back to the last case, as a move.
    setY(230);
    expect(wheel(-80, 5000).defaultPrevented).toBe(true);
    expect(vi.mocked(smoothScroll.scrollToY).mock.calls.map(call => call[0])).toEqual([200]);
    // The rest of that gesture is swallowed too: never Lenis's.
    expect(wheel(-80, 5040).defaultPrevented).toBe(true);
  });

  test('anything else that brings the page up out of the footer (a key, the scrollbar) goes back to the last case', () => {
    make(3, 2);
    stage!.ready();
    setY(600);
    act(() => void window.dispatchEvent(new Event('scroll')));
    setY(150);
    act(() => void window.dispatchEvent(new Event('scroll')));
    expect(stage!.moving()).toBe(true);
    settle();
    expect(place()).toBe(2);
  });

  test('a move that is cut short never locks the page: it counts as landed after its own time', () => {
    make(4);
    stage!.ready();
    press('ArrowDown');
    expect(stage!.moving()).toBe(true);
    act(() => void vi.advanceTimersByTime(1200 + MOVE_GRACE_MS + 10));
    expect(stage!.moving()).toBe(false);
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

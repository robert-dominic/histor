// @vitest-environment jsdom
// src/features/landing/__tests__/landing-stage.test.ts
// The landing stage (landing fixes brief): free, silky scrolling; one timeline scrubbed by the scroll with a label at
// every case; a soft snap that never blocks; the words only once the scroll has settled on a case, gone as soon as it
// starts again; the frames hang from a wire.
import { act } from '@testing-library/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createLandingStage, FRAME_SWING, LANDING_LERP, poseOver, STAGE_AWAY, type StageHandle } from '@/features/landing/landing-stage';
import { LANDING_SNAP } from '@/lib/motion';
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
    section.innerHTML = `<div data-exhibit-part="place"><div data-exhibit-part="anchor"><div data-exhibit-part="rise"><div class="haunted-frame"></div></div></div><div data-exhibit-part="title"><h2>Case title ${index}</h2><p>1872</p></div></div><div data-exhibit-part="words">W${index}</div>${
      index < count - 1 ? '<div data-exhibit-part="peek"><div class="haunted-frame"></div></div>' : ''
    }`;
    root.appendChild(section);
    return section;
  });
  track.appendChild(root);
  document.body.appendChild(track);
  Object.defineProperty(track, 'offsetHeight', { value: count * 100, configurable: true });
  Object.defineProperty(root, 'offsetHeight', { value: 100, configurable: true });
  changes = [];
  stage = createLandingStage({ track, stage: root, sections, start, shown, onChange: index => changes.push(index) });
}

beforeEach(() => {
  stubMatchMedia();
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

describe('the landing stage: free scrolling', () => {
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

  test('a soft snap: when scrolling stops between two cases it eases to the nearest, after a short delay, 0.4 to 0.8s, power2.inOut', () => {
    make(4);
    stage.ready();
    expect(LANDING_SNAP.delay).toBeLessThanOrEqual(0.3);
    expect([LANDING_SNAP.min, LANDING_SNAP.max]).toEqual([0.4, 0.8]);
    // Stopped a third of the way past case 1: nearest is 1.
    stage.update(1.3);
    expect(smoothScroll.scrollToY).not.toHaveBeenCalled();
    settle();
    expect(smoothScroll.scrollToY).toHaveBeenCalledTimes(1);
    const [target, options] = vi.mocked(smoothScroll.scrollToY).mock.calls[0];
    expect(target).toBe(100);
    expect(options!.ease).toBe('power2.inOut');
    expect(options!.duration).toBeGreaterThanOrEqual(0.4);
    expect(options!.duration).toBeLessThanOrEqual(0.8);
    // Further from a case takes longer; the other way round, to the next.
    vi.mocked(smoothScroll.scrollToY).mockClear();
    stage.update(1.45);
    settle();
    const far = vi.mocked(smoothScroll.scrollToY).mock.calls[0];
    expect(far[1]!.duration).toBeGreaterThan(options!.duration as number);
    vi.mocked(smoothScroll.scrollToY).mockClear();
    stage.update(2.6);
    settle();
    expect(vi.mocked(smoothScroll.scrollToY).mock.calls[0][0]).toBe(300);
  });

  test('the snap never blocks: more scrolling cancels it, and on a case there is nothing to snap', () => {
    make(4);
    stage.ready();
    stage.update(1.3);
    // The scroll goes on before the delay is up: the first wait is dropped, so only the last place is snapped to.
    stage.update(1.6);
    settle();
    expect(smoothScroll.scrollToY).toHaveBeenCalledTimes(1);
    expect(vi.mocked(smoothScroll.scrollToY).mock.calls[0][0]).toBe(200);
    // And once it is on a case, there is nothing to snap: the words come instead.
    vi.mocked(smoothScroll.scrollToY).mockClear();
    stage.update(2);
    settle();
    expect(smoothScroll.scrollToY).not.toHaveBeenCalled();
    expect(stage.wordsFor()).toBe(2);
  });

  test('the scrub timeline has a label at every case, which the snap goes to', () => {
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
    const keys = gsap.getTweensOf([part(0, 'anchor'), part(1, 'anchor'), part(0, 'rise'), part(1, 'rise')]).flatMap(tween => Object.keys(tween.vars));
    expect(keys.filter(key => ['width', 'height', 'top', 'left', 'margin', 'padding', 'filter'].includes(key))).toEqual([]);
    // Scrubbed: the sections show as the timeline passes them.
    timeline.time(0);
    expect(sections.map(section => section.style.visibility)).toEqual(['visible', 'hidden', 'hidden']);
    timeline.time(0.5);
    expect(sections.map(section => section.style.visibility)).toEqual(['visible', 'visible', 'hidden']);
    timeline.time(1);
    expect(sections.map(section => section.style.visibility)).toEqual(['hidden', 'visible', 'hidden']);
    timeline.time(1.5);
    expect(sections.map(section => section.style.visibility)).toEqual(['hidden', 'visible', 'visible']);
    timeline.time(2);
    expect(sections.map(section => section.style.visibility)).toEqual(['hidden', 'hidden', 'visible']);
    // Passing several cases at once is just a later time: back again, the same.
    timeline.time(0);
    expect(sections.map(section => section.style.visibility)).toEqual(['visible', 'hidden', 'hidden']);
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

describe('moving by key and by the rail: soft, and never blocking', () => {
  test('arrows, Page keys and Space go to the next or the previous case; Home and End to the ends', () => {
    make(4);
    stage.ready();
    stage.update(1);
    press('ArrowDown');
    expect(smoothScroll.scrollToY).toHaveBeenLastCalledWith(200, expect.objectContaining({ ease: 'power3.inOut' }));
    press('PageUp');
    expect(smoothScroll.scrollToY).toHaveBeenLastCalledWith(0, expect.anything());
    press('End');
    expect(smoothScroll.scrollToY).toHaveBeenLastCalledWith(300, expect.anything());
    press('Home');
    expect(smoothScroll.scrollToY).toHaveBeenLastCalledWith(0, expect.anything());
  });

  test('Space on a button is the button\'s; keys do nothing before the opening is over', () => {
    make(3);
    press('ArrowDown');
    expect(smoothScroll.scrollToY).not.toHaveBeenCalled();
    stage.ready();
    const button = document.createElement('button');
    document.body.appendChild(button);
    act(() => void button.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })));
    expect(smoothScroll.scrollToY).not.toHaveBeenCalled();
  });

  test('nothing is locked: every request goes through, one after another', () => {
    make(5);
    stage.ready();
    stage.go(3);
    stage.go(1);
    stage.go(4);
    expect(smoothScroll.scrollToY).toHaveBeenCalledTimes(3);
    expect(vi.mocked(smoothScroll.scrollToY).mock.calls.map(call => call[0])).toEqual([300, 100, 400]);
  });

  test('a page opened at a case in the address starts there', () => {
    make(4, 2);
    expect(smoothScroll.jumpToY).toHaveBeenCalledWith(200);
  });
});

describe('poseOver', () => {
  test('puts a frame over a target rectangle', () => {
    expect(poseOver({ left: 100, top: 100, width: 400, height: 300 }, { left: 800, top: 600, width: 200, height: 150 })).toEqual({ x: 600, y: 425, scale: 0.5 });
  });
});

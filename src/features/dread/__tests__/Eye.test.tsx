// @vitest-environment jsdom
// src/features/dread/__tests__/Eye.test.tsx
// The eye (dread pass, 4): rare (never in the first 30s of activity, then 60 to 120s apart), only in a safe zone that
// is on screen and holds no text or control; it opens, follows, blinks, closes, with its sound; never under reduced
// motion. Zones come from the case data (validated) and the desk.
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import EyeWatcher from '@/features/dread/EyeWatcher';
import gsap from 'gsap';
import { EYE, FACE_GLANCE, boxIsClear, eyeDue, nextEyeAt } from '@/lib/eye-watch';
import { onStoryEvent, type StoryEvent } from '@/lib/story-events';
import { validateCase } from '@/lib/validate-case';
import { stubMatchMedia } from '@/test/match-media';
import type { Case } from '@/types/case';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

/** A zone on screen, with nothing under it but itself. */
function zone() {
  const element = document.createElement('span');
  element.dataset.eyeZone = 'desk';
  document.body.append(element);
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(new DOMRect(20, 300, 160, 160));
  return element;
}
/** Seconds of activity: a pointer moving every second. */
function beActive(seconds: number) {
  for (let i = 0; i < seconds; i += 1) {
    window.dispatchEvent(new Event('pointermove'));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
  }
}

describe('when', () => {
  test('never in the first 30 seconds of activity, then 60 to 120 seconds apart', () => {
    expect(eyeDue(EYE.firstAfter - 1, 0)).toBe(false);
    expect(eyeDue(EYE.firstAfter, 0)).toBe(true);
    for (let i = 0; i < 50; i += 1) {
      const next = nextEyeAt(100);
      expect(next).toBeGreaterThanOrEqual(160);
      expect(next).toBeLessThanOrEqual(220);
    }
    expect(eyeDue(150, nextEyeAt(100, () => 0))).toBe(false);
  });

  test('never over text or a control', () => {
    const text = document.createElement('p');
    text.textContent = 'Something to read';
    const button = document.createElement('button');
    const empty = document.createElement('div');
    const box = new DOMRect(0, 0, 100, 50);
    vi.stubGlobal('document', Object.assign(document, { elementsFromPoint: () => [empty] }));
    expect(boxIsClear(box, () => false)).toBe(true);
    (document as unknown as { elementsFromPoint: () => Element[] }).elementsFromPoint = () => [empty, text];
    expect(boxIsClear(box, () => false)).toBe(false);
    (document as unknown as { elementsFromPoint: () => Element[] }).elementsFromPoint = () => [button];
    expect(boxIsClear(box, () => false)).toBe(false);
  });
});

describe('the eye', () => {
  test('a face without flesh, about 120px tall, in a clear dark zone after 30s of activity, with its sound (the fix list)', () => {
    stubMatchMedia();
    const element = zone();
    (document as unknown as { elementsFromPoint: () => Element[] }).elementsFromPoint = () => [element];
    const heard: StoryEvent['type'][] = [];
    const stop = onStoryEvent(event => heard.push(event.type));
    render(<EyeWatcher />);
    beActive(EYE.firstAfter - 2);
    expect(document.querySelector('[data-eye-showing]')).toBeNull();
    beActive(3);
    const eye = document.querySelector<HTMLElement>('[data-eye-showing]');
    expect(eye).not.toBeNull();
    expect(heard).toContain('eye');
    expect(eye!.getAttribute('aria-hidden')).toBe('true');
    expect(eye!.className).toContain('pointer-events-none');
    expect(eye!.style.height).toBe(`${EYE.height}px`);
    expect(EYE.height).toBe(120);
    // Hollow eyes and a nose only.
    const face = eye!.querySelector('[data-face="svg"]')!;
    expect(face.querySelectorAll('ellipse').length).toBeGreaterThanOrEqual(2);
    expect(face.querySelector('[data-face="gaze"]')).not.toBeNull();
    // Its eyes move (quick fixes, 3): the lights look left, then right; then the eyes close slowly; then it fades.
    const gaze = face.querySelector('[data-face="gaze"]')!;
    const looks = gsap.getTweensOf(gaze).sort((a, b) => a.startTime() - b.startTime());
    expect(looks.map(look => look.vars.x)).toEqual([-FACE_GLANCE, FACE_GLANCE]);
    const close = gsap.getTweensOf(face.querySelector('[data-face="eyes"]'))[0];
    expect(close.vars).toMatchObject({ scaleY: 0.06, ease: 'power2.inOut', duration: 1.4 });
    expect(close.startTime()).toBeGreaterThan(looks[1].startTime() + looks[1].duration());
    const fades = gsap.getTweensOf(eye).filter(tween => tween.vars.opacity === 0);
    expect(fades.at(-1)!.startTime()).toBeGreaterThanOrEqual(close.startTime() + close.duration() - 1e-6);
    stop();
  });

  test('never under reduced motion', () => {
    stubMatchMedia({ reducedMotion: true });
    const element = zone();
    (document as unknown as { elementsFromPoint: () => Element[] }).elementsFromPoint = () => [element];
    render(<EyeWatcher />);
    beActive(EYE.firstAfter + 130);
    expect(document.querySelector('[data-eye-showing]')).toBeNull();
  });
});

describe('only where it fits', () => {
  test('a zone smaller than the face is never used', () => {
    stubMatchMedia();
    const element = zone();
    vi.mocked(element.getBoundingClientRect).mockReturnValue(new DOMRect(20, 300, 160, 60));
    (document as unknown as { elementsFromPoint: () => Element[] }).elementsFromPoint = () => [element];
    render(<EyeWatcher />);
    beActive(EYE.firstAfter + 5);
    expect(document.querySelector('[data-eye-showing]')).toBeNull();
  });
});

describe('the zones', () => {
  test('the case lists its images\' dark places, validated', () => {
    expect(maryCeleste.story.some(section => (section.eyeZones ?? []).length > 0)).toBe(true);
    expect(validateCase(maryCeleste)).toEqual([]);
    const bad = { ...maryCeleste, story: maryCeleste.story.map((section, i) => (i === 0 ? { ...section, eyeZones: [{ x: 90, y: 0, w: 20, h: 10 }] } : section)) } as Case;
    expect(validateCase(bad)).toContain('Field story[0].eyeZones[0]: Must be { x, y, w, h } in percent, inside the image');
  });
});

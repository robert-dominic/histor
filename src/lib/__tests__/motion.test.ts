// @vitest-environment jsdom
// src/lib/__tests__/motion.test.ts
import gsap from 'gsap';
import { describe, expect, test } from 'vitest';
import { MOTION, STEP, ghostDuration, stampHit, tween, type TokenName } from '@/lib/motion';

const NAMES: TokenName[] = [
  'ink.in',
  'ink.out',
  'paper.lift',
  'paper.move',
  'paper.land',
  'stamp.hit',
  'hover',
  'layout',
  'scene',
  'ghost',
  'story.surface',
  'story.weighted',
  'story.breath',
  'story.hook',
  'story.decay',
];

describe('motion tokens', () => {
  test('every token is present with an ease and a positive duration', () => {
    for (const name of NAMES) {
      expect(MOTION[name].ease, name).toBeTruthy();
      expect(MOTION[name].duration, name).toBeGreaterThan(0);
    }
    expect(Object.keys(MOTION).sort()).toEqual([...NAMES].sort());
  });

  test('starting values match the brief', () => {
    expect(MOTION['ink.in']).toEqual({ ease: 'power3.out', duration: 0.9, y: 10 });
    expect(tween('ink.out')).toEqual({ ease: 'power2.in', duration: 0.45 });
    expect(tween('paper.land')).toEqual({ ease: 'back.out(1.15)', duration: 0.5 });
    expect(tween('stamp.hit')).toEqual({ ease: 'expo.in', duration: 0.16 });
    expect(MOTION.scene.duration).toBeGreaterThanOrEqual(1.2);
  });

  test('the duration steps', () => {
    expect(STEP).toEqual({ fast: 0.2, base: 0.45, slow: 0.9, scene: 1.2 });
  });

  test('exits are quicker than entrances', () => {
    expect(MOTION['ink.out'].duration).toBeLessThan(MOTION['ink.in'].duration);
  });

  test('tween() returns only the ease and the duration', () => {
    expect(Object.keys(tween('ink.in')).sort()).toEqual(['duration', 'ease']);
  });
});

describe('ghostDuration', () => {
  test('is between 2 and 4 seconds, and the same for the same key', () => {
    for (const key of ['a', 'e-galley', 'e-lifeboat', 'legend-paper', '']) {
      const d = ghostDuration(key);
      expect(d).toBeGreaterThanOrEqual(2);
      expect(d).toBeLessThanOrEqual(4);
      expect(ghostDuration(key)).toBe(d);
    }
  });

  test('differs between keys', () => {
    const values = new Set(['a', 'b', 'c', 'd', 'e'].map(ghostDuration));
    expect(values.size).toBeGreaterThan(1);
  });
});

describe('stampHit', () => {
  test('builds a press, then a settle', () => {
    const el = document.createElement('span');
    const tl = stampHit(el);
    tl.pause(0);
    const tweens = tl.getChildren(false);
    expect(tweens).toHaveLength(2);
    expect(tweens[0].duration()).toBeCloseTo(MOTION['stamp.hit'].duration);
    expect(tweens[1].startTime()).toBeCloseTo(MOTION['stamp.hit'].duration);
    tl.progress(1);
    expect(gsap.getProperty(el, 'scale')).toBe(1);
    expect(gsap.getProperty(el, 'opacity')).toBe(1);
  });

  test('reduced motion is one fade with no scale', () => {
    const el = document.createElement('span');
    const tl = stampHit(el, { reduced: true });
    tl.pause(0);
    expect(tl.getChildren(false)).toHaveLength(1);
    tl.progress(1);
    expect(gsap.getProperty(el, 'opacity')).toBe(1);
    expect(gsap.getProperty(el, 'scale')).toBe(1);
  });
});

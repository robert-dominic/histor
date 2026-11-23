// src/features/story/__tests__/story-steps.test.ts
// The story in steps: their order, and one gesture per burst of wheel events.
import { describe, expect, test } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import { buildSteps, createWheelGate, stepName, stepOfTick, tickOf } from '@/features/story/story-steps';

describe('buildSteps', () => {
  test('each chapter its page, then its hook; then the question, one line per step; then the fork', () => {
    const steps = buildSteps([{ hook: 'A hook.' }, {}, { hook: 'Another.' }], 3, true);
    expect(steps.map(stepName)).toEqual(['page-0', 'hook-0', 'page-1', 'page-2', 'hook-2', 'line-0', 'line-1', 'line-2', 'fork']);
  });

  test('no fork, no fork step', () => {
    expect(buildSteps([{}], 1, false).map(stepName)).toEqual(['page-0', 'line-0']);
  });

  test('the Mary Celeste: every chapter has a page and a hook, in the order of the case', () => {
    const steps = buildSteps(maryCeleste.story, 5, true);
    const pages = steps.filter(step => step.kind === 'page');
    expect(pages).toHaveLength(maryCeleste.story.length);
    expect(steps.at(-1)?.kind).toBe('fork');
  });

  test('the rail: one tick per chapter and one for the question; a tick jumps to its page or the first line', () => {
    const steps = buildSteps([{ hook: 'A.' }, { hook: 'B.' }], 2, true);
    expect(steps.map(step => tickOf(step, 2))).toEqual([0, 0, 1, 1, 2, 2, 2]);
    expect(stepOfTick(steps, 1, 2)).toBe(2);
    expect(stepOfTick(steps, 2, 2)).toBe(4);
  });
});

describe('createWheelGate: one gesture, one step', () => {
  test('a burst of 50 wheel events, 8ms apart, moves exactly one step', () => {
    const gate = createWheelGate(220);
    let moved = 0;
    for (let index = 0; index < 50; index += 1) {
      gate.note(index * 8);
      if (gate.take(true)) {
        moved += 1;
      }
    }
    expect(moved).toBe(1);
  });

  test('a long momentum tail keeps the burst alive, however long it lasts', () => {
    const gate = createWheelGate(220);
    let moved = 0;
    for (let time = 0; time < 3000; time += 150) {
      gate.note(time);
      moved += gate.take(true) ? 1 : 0;
    }
    expect(moved).toBe(1);
  });

  test('after a pause longer than the gap, the next flick is a new gesture', () => {
    const gate = createWheelGate(220);
    gate.note(0);
    expect(gate.take(true)).toBe(true);
    gate.note(100);
    expect(gate.take(true)).toBe(false);
    gate.note(500);
    expect(gate.take(true)).toBe(true);
  });

  test('a burst that meets a step still animating is swallowed, tail and all', () => {
    const gate = createWheelGate(220);
    gate.note(0);
    expect(gate.take(false)).toBe(false);
    // The animation has finished, but this is still the same burst.
    gate.note(50);
    expect(gate.take(true)).toBe(false);
  });
});

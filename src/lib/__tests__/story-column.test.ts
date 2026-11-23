// src/lib/__tests__/story-column.test.ts
import { describe, expect, test } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import { COLUMN, columnLines, columnPlan, columnSeconds, sentenceSeconds, SCROLL_FEEL } from '@/lib/story-column';
import { splitIntoBeats } from '@/lib/story-beats';

const words = (count: number) => Array.from({ length: count }, (_, index) => `word${index}`).join(' ') + '.';

describe('COLUMN', () => {
  test('the constants', () => {
    expect(COLUMN.wordsPerMinute).toBe(240);
    expect(COLUMN.minSeconds).toBeGreaterThan(3);
    expect(COLUMN.visibleLines).toBeGreaterThanOrEqual(3);
    expect(COLUMN.visibleLines).toBeLessThanOrEqual(4);
    expect(COLUMN.scrub).toBeGreaterThan(0);
  });
});

describe('SCROLL_FEEL: the story is slower on a trackpad', () => {
  test('about twice the scroll per sentence as before (0.15 of the screen, 80 to 140px), and a wheel at 0.8', () => {
    expect(SCROLL_FEEL.pxPerSecond.share).toBeCloseTo(0.15 * 2, 6);
    expect(SCROLL_FEEL.pxPerSecond.min).toBe(80 * 2);
    expect(SCROLL_FEEL.pxPerSecond.max).toBe(140 * 2);
    expect(SCROLL_FEEL.wheelMultiplier).toBe(0.8);
  });
});

describe('sentenceSeconds', () => {
  test('a short sentence gets the minimum', () => {
    expect(sentenceSeconds('She sailed.')).toBe(COLUMN.minSeconds);
  });

  test('a long sentence gets its reading time at 240 words a minute', () => {
    // 60 words take 15 seconds.
    expect(sentenceSeconds(words(60))).toBeCloseTo(15, 5);
  });

  test('a reference counts as its label, not its markup', () => {
    const plain = words(40);
    const marked = plain.replace('word0', '{{ref:briggs|the captain}}');
    // "the captain" is two words, so the marked sentence is one word longer than the plain one.
    expect(sentenceSeconds(marked)).toBeCloseTo(((40 + 1) / 240) * 60, 5);
  });
});

describe('columnPlan', () => {
  test('an empty column has no slots and no length', () => {
    expect(columnPlan([])).toEqual([]);
    expect(columnSeconds([])).toBe(0);
  });

  test('each sentence starts where the one before it ends', () => {
    const plan = columnPlan(['One.', words(80), 'Three.']);
    expect(plan[0].start).toBe(0);
    expect(plan[1].start).toBeCloseTo(plan[0].seconds, 10);
    expect(plan[2].start).toBeCloseTo(plan[1].start + plan[1].seconds, 10);
    expect(columnSeconds(['One.', words(80), 'Three.'])).toBeCloseTo(plan[2].start + plan[2].seconds, 10);
  });

  test('every chapter of the Mary Celeste gets a plan in the order of its sentences', () => {
    for (const section of maryCeleste.story) {
      const sentences = section.body.flatMap(splitIntoBeats);
      const plan = columnPlan(sentences);
      expect(plan).toHaveLength(sentences.length);
      plan.forEach((slot, index) => {
        expect(slot.seconds).toBe(sentenceSeconds(sentences[index]));
        expect(slot.seconds).toBeGreaterThanOrEqual(COLUMN.minSeconds);
      });
    }
  });
});

describe('columnLines', () => {
  test('the visible band plus one line for the mask', () => {
    expect(columnLines(['One.', 'Two.'])).toBe(COLUMN.visibleLines + 1);
    expect(columnLines([])).toBe(COLUMN.visibleLines + 1);
  });

  test('a very long sentence makes the column two lines taller, so it can be read whole', () => {
    expect(columnLines(['Short.', 'x'.repeat(151)])).toBe(COLUMN.visibleLines + 3);
    expect(columnLines(['x'.repeat(150)])).toBe(COLUMN.visibleLines + 1);
  });

  test('a reference counts as its label', () => {
    const marked = `{{ref:briggs|the captain}} ${'x'.repeat(100)}`;
    expect(columnLines([marked])).toBe(COLUMN.visibleLines + 1);
  });
});

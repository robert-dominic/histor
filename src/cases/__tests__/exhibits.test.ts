// src/cases/__tests__/exhibits.test.ts
// The landing page's exhibits (landing brief, 1): every case in order, with its frame, its words and its status.
// A case is open only if its data exists and validates.
import { describe, expect, test } from 'vitest';
import { caseOpens, exhibits, registry } from '@/cases';
import maryCeleste from '@/cases/mary-celeste/case';

describe('the exhibits', () => {
  test('the six cases, in order, with their years, frames, headlines and sublines', () => {
    expect(exhibits.map(exhibit => [exhibit.title, exhibit.years, exhibit.frame, exhibit.status])).toEqual([
      ['The Mary Celeste', '1872 – 1873', 'landscape', 'open'],
      ['Jack the Ripper', '1888', 'portrait', 'sealed'],
      ['D. B. Cooper', '1971', 'landscape', 'sealed'],
      ['The Princes in the Tower', '1483', 'square', 'sealed'],
      ['The Dancing Plague', '1518', 'portrait', 'sealed'],
      ['Amelia Earhart', '1937', 'landscape', 'sealed'],
    ]);
    expect(exhibits[0]).toMatchObject({
      headline: 'Every legend began as something that happened.',
      subline: 'Histor is for anyone who has ever wondered which part of the story is true.',
    });
    expect(exhibits.map(exhibit => exhibit.id)).toEqual(['mary-celeste', 'jack-the-ripper', 'db-cooper', 'princes-in-the-tower', 'dancing-plague', 'amelia-earhart']);
    expect(exhibits[2]).toMatchObject({
      headline: "He jumped. The money didn't all land.",
      subline: 'A quiet man hijacked a plane, took $200,000 and parachuted into a stormy night. He was never seen again.',
    });
    expect(exhibits[4]).toMatchObject({
      headline: 'Strasbourg danced. Some never stopped.',
      subline: 'In July 1518, a woman began to dance in the street. Within weeks, dozens could not stop. The cure? More music.',
    });
    // Roanoke and the Dyatlov Pass are no longer in the archive.
    expect(exhibits.some(exhibit => /roanoke|dyatlov/i.test(exhibit.id + exhibit.title))).toBe(false);
    for (const exhibit of exhibits) {
      expect(exhibit.teaser.length, exhibit.id).toBeGreaterThan(0);
    }
  });

  test('an open case shows one of its own chapter images; a sealed one a period picture of its own, and no data', () => {
    const open = exhibits[0];
    expect(maryCeleste.story.map(section => section.image)).toContain(open.frameImage);
    expect(open.data).toBe(maryCeleste);
    for (const sealed of exhibits.filter(exhibit => exhibit.status === 'sealed')) {
      expect(sealed.frameImage, sealed.id).toMatchObject({ alt: expect.any(String), credit: expect.any(String) });
      expect(sealed.frameImage!.alt.length).toBeGreaterThan(20);
      expect(sealed.data).toBeUndefined();
    }
  });

  test('a case opens only when its data exists and validates', () => {
    expect(caseOpens(maryCeleste)).toBe(true);
    expect(caseOpens(undefined)).toBe(false);
    expect(caseOpens({ ...maryCeleste, title: '' })).toBe(false);
  });

  test('the registry says the same: open cases carry their data, the rest are sealed', () => {
    expect(registry.map(entry => [entry.id, entry.sealed])).toEqual(exhibits.map(exhibit => [exhibit.id, exhibit.status === 'sealed']));
  });
});

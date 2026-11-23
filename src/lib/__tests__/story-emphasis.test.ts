// src/lib/__tests__/story-emphasis.test.ts
import * as fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import { splitIntoBeats } from '@/lib/story-beats';
import { weightedPieces } from '@/lib/story-emphasis';

describe('weightedPieces', () => {
  test('no phrases: the sentence is one plain piece', () => {
    expect(weightedPieces('She sailed.')).toEqual([{ text: 'She sailed.', weighted: false }]);
  });

  test('a phrase in the middle is cut out, with the plain text kept on both sides', () => {
    expect(weightedPieces('On board: ten people.', ['ten people'])).toEqual([
      { text: 'On board: ', weighted: false },
      { text: 'ten people', weighted: true },
      { text: '.', weighted: false },
    ]);
  });

  test('a whole sentence can be weighted', () => {
    expect(weightedPieces('No one was there.', ['No one was there.'])).toEqual([{ text: 'No one was there.', weighted: true }]);
  });

  test('markup is never cut: a phrase is found in the label, and takes the whole reference', () => {
    const sentence = 'Not the captain. Not little {{ref:sophia|Sophia}}.';
    expect(weightedPieces(sentence, ['Not little Sophia.'])).toEqual([
      { text: 'Not the captain. ', weighted: false },
      { text: 'Not little {{ref:sophia|Sophia}}.', weighted: true },
    ]);
    expect(weightedPieces(sentence, ['little Sop'])[1]).toEqual({ text: 'little {{ref:sophia|Sophia}}', weighted: true });
  });

  test('a phrase that is not there changes nothing; overlapping phrases keep the earlier', () => {
    expect(weightedPieces('One two three.', ['four'])).toEqual([{ text: 'One two three.', weighted: false }]);
    expect(weightedPieces('One two three.', ['two three', 'One two']).filter(piece => piece.weighted)).toEqual([
      { text: 'One two', weighted: true },
    ]);
  });

  test('joining the pieces always gives the sentence back', () => {
    fc.assert(
      fc.property(fc.string(), fc.array(fc.string({ maxLength: 6 }), { maxLength: 3 }), (sentence, phrases) => {
        expect(weightedPieces(sentence, phrases).map(piece => piece.text).join('')).toBe(sentence);
      })
    );
  });

  test('every weighted phrase of the Mary Celeste lands in exactly one sentence of its chapter', () => {
    for (const section of maryCeleste.story) {
      const sentences = section.body.flatMap(splitIntoBeats);
      for (const phrase of section.emphasis ?? []) {
        const found = sentences.filter(sentence => weightedPieces(sentence, [phrase]).some(piece => piece.weighted));
        expect(found, `${section.id}: ${phrase}`).toHaveLength(1);
      }
    }
  });
});

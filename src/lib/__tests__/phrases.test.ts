// src/lib/__tests__/phrases.test.ts
import { describe, expect, test } from 'vitest';
import { splitIntoPhrases } from '@/lib/phrases';

describe('splitIntoPhrases', () => {
  test('splits after commas and keeps the punctuation with its phrase', () => {
    expect(splitIntoPhrases('One part, a second part, and the end?')).toEqual([
      'One part,',
      'a second part,',
      'and the end?',
    ]);
  });

  test('splits after full stops, colons and semicolons too', () => {
    expect(splitIntoPhrases('First. Second: third; fourth!')).toEqual(['First.', 'Second:', 'third;', 'fourth!']);
  });

  test('does not split inside a number or a hyphenated word', () => {
    expect(splitIntoPhrases('There were 1,701 barrels and a two-year-old.')).toEqual([
      'There were 1,701 barrels and a two-year-old.',
    ]);
  });

  test('joining the phrases with spaces gives the text back', () => {
    const text = 'A question, in three parts, asked plainly?';

    expect(splitIntoPhrases(text).join(' ')).toBe(text);
  });

  test('a text without punctuation is one phrase, and an empty text is none', () => {
    expect(splitIntoPhrases('No punctuation here')).toEqual(['No punctuation here']);
    expect(splitIntoPhrases('   ')).toEqual([]);
  });
});

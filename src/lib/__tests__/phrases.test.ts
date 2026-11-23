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

describe('splitQuestion', () => {
  test('splits at the commas and before "and", keeping the punctuation', async () => {
    const { splitQuestion } = await import('@/lib/phrases');
    const maryCeleste = (await import('@/cases/mary-celeste/case')).default;
    expect(splitQuestion(maryCeleste.centralQuestion)).toEqual([
      'Why would Captain Briggs abandon a sound ship,',
      'one he partly owned,',
      'and put his wife,',
      'his two-year-old daughter',
      'and his crew into a small lifeboat in the middle of the Atlantic?',
    ]);
    expect(splitQuestion(maryCeleste.centralQuestion).join(' ')).toBe(maryCeleste.centralQuestion);
  });

  test('a word that only starts with "and" is not split', async () => {
    const { splitQuestion } = await import('@/lib/phrases');
    expect(splitQuestion('Sails andirons anchors')).toEqual(['Sails andirons anchors']);
  });
});

describe('questionLines', () => {
  test('the case\'s own lines, when they give the question back exactly', async () => {
    const { questionLines } = await import('@/lib/phrases');
    const maryCeleste = (await import('@/cases/mary-celeste/case')).default;
    expect(questionLines(maryCeleste.centralQuestion, maryCeleste.centralQuestionLines)).toEqual([
      'Why would Captain Briggs abandon a sound ship,',
      'one he partly owned, and put his wife,',
      'his two-year-old daughter',
      'and his crew into a small lifeboat',
      'in the middle of the Atlantic?',
    ]);
  });

  test('otherwise, the comma split', async () => {
    const { questionLines, splitQuestion } = await import('@/lib/phrases');
    expect(questionLines('One, two and three?')).toEqual(splitQuestion('One, two and three?'));
    expect(questionLines('One, two and three?', ['Not', 'the question'])).toEqual(splitQuestion('One, two and three?'));
  });
});

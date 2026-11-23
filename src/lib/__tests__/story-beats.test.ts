// src/lib/__tests__/story-beats.test.ts
import { describe, expect, test, vi } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import { MIN_BEAT_SECONDS, beatSeconds, beatWords, splitIntoBeats } from '@/lib/story-beats';
import { emitStoryEvent, onStoryEvent } from '@/lib/story-events';

describe('splitIntoBeats', () => {
  test('one sentence per beat', () => {
    expect(splitIntoBeats('Not the captain. Not Sarah. Not little Sophia.')).toEqual([
      'Not the captain.',
      'Not Sarah.',
      'Not little Sophia.',
    ]);
  });

  test('keeps markup whole, and never splits inside it', () => {
    expect(splitIntoBeats('It was {{ref:a|Dr. Who}}. She was {{ref:b|empty}}.')).toEqual([
      'It was {{ref:a|Dr. Who}}.',
      'She was {{ref:b|empty}}.',
    ]);
  });

  test('a quoted sentence ends after its closing quote; "St." is not the end of a sentence', () => {
    expect(splitIntoBeats('Rough notes: "Eastern point of St. Mary\'s bore 6 miles SSW." St. Mary\'s was an island. Land.')).toEqual([
      'Rough notes: "Eastern point of St. Mary\'s bore 6 miles SSW."',
      "St. Mary's was an island.",
      'Land.',
    ]);
  });

  test('numbers with points and questions', () => {
    expect(splitIntoBeats('It held 1,701 barrels. Why? Nobody knows!')).toEqual(['It held 1,701 barrels.', 'Why?', 'Nobody knows!']);
  });

  test('text without an ending is one beat; empty text is none', () => {
    expect(splitIntoBeats('No full stop here')).toEqual(['No full stop here']);
    expect(splitIntoBeats('   ')).toEqual([]);
  });

  test('joining the beats gives back the paragraph, for every paragraph of the Mary Celeste', () => {
    for (const section of maryCeleste.story) {
      for (const paragraph of section.body) {
        expect(splitIntoBeats(paragraph).join(' ')).toBe(paragraph.replace(/\s+/g, ' ').trim());
      }
    }
  });

  test('chapter 1: "On board: ten people." is a beat of its own', () => {
    const beats = maryCeleste.story[0].body.flatMap(splitIntoBeats);
    expect(beats).toContain('On board: ten people.');
  });
});


describe('beat timing', () => {
  test('counts the words a reader sees, with markup as its label', () => {
    expect(beatWords('The {{ref:dei-gratia|Dei Gratia}} found her.')).toBe(5);
  });

  test('240 words a minute, never less than the minimum', () => {
    expect(beatSeconds('Short.')).toBe(MIN_BEAT_SECONDS);
    const sixteenWords = Array.from({ length: 16 }, () => 'word').join(' ');
    expect(beatSeconds(sixteenWords)).toBe(4);
  });
});

describe('story events', () => {
  test('listeners get every event until they stop listening, and a throwing listener changes nothing', () => {
    const heard = vi.fn();
    const stop = onStoryEvent(heard);
    const stopBroken = onStoryEvent(() => {
      throw new Error('broken listener');
    });

    emitStoryEvent({ type: 'hook', chapter: 's-one', direction: 'forward' });
    expect(heard).toHaveBeenCalledWith({ type: 'hook', chapter: 's-one', direction: 'forward' });

    stop();
    stopBroken();
    emitStoryEvent({ type: 'beat', chapter: 's-one', index: 0, direction: 'forward' });
    expect(heard).toHaveBeenCalledTimes(1);
  });
});

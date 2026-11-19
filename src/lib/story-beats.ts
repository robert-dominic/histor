// src/lib/story-beats.ts
// The story is told in beats: one sentence at a time (docs/briefs/story-redesign.md). These helpers split a
// paragraph into its sentences, without breaking {{ref:id|label}} markup, and say how long a beat takes to read.

import { parseRefs } from '@/lib/parse-refs';

/** Words that end in a full stop but do not end a sentence, e.g. "St. Mary's". */
const ABBREVIATIONS = new Set(['st', 'mr', 'mrs', 'dr', 'capt', 'no', 'vol', 'lt']);

/** Closing marks that may follow the end of a sentence: quotes and brackets. */
const CLOSERS = new Set(['"', '\u201d', "'", '\u2019', ')']);

/**
 * Splits a paragraph into sentences. Markup is kept whole: a sentence never ends inside {{ ... }}.
 * A sentence ends at ".", "?" or "!" (plus any closing quotes) followed by a space, unless the word before the
 * full stop is a known abbreviation. Every returned beat is trimmed and non-empty.
 */
export function splitIntoBeats(text: string): string[] {
  const beats: string[] = [];
  let start = 0;
  let depth = 0;

  for (let i = 0; i < text.length; i += 1) {
    if (text.startsWith('{{', i)) {
      depth += 1;
      i += 1;
      continue;
    }
    if (text.startsWith('}}', i) && depth > 0) {
      depth -= 1;
      i += 1;
      continue;
    }
    const char = text[i];
    if (depth > 0 || (char !== '.' && char !== '?' && char !== '!')) {
      continue;
    }
    let end = i + 1;
    while (end < text.length && CLOSERS.has(text[end])) {
      end += 1;
    }
    if (end >= text.length || !/\s/.test(text[end])) {
      continue;
    }
    if (char === '.') {
      const word = /([A-Za-z]+)$/.exec(text.slice(start, i))?.[1]?.toLowerCase();
      if (word !== undefined && ABBREVIATIONS.has(word)) {
        continue;
      }
    }
    beats.push(text.slice(start, end).trim());
    start = end;
    i = end - 1;
  }
  const rest = text.slice(start).trim();
  if (rest !== '') {
    beats.push(rest);
  }
  return beats.filter(beat => beat !== '');
}

/** The words a reader sees in a beat: markup shown as its label. */
export function beatWords(text: string): number {
  const plain = parseRefs(text)
    .map(segment => (segment.kind === 'text' ? segment.text : segment.label))
    .join('');
  return plain.split(/\s+/).filter(word => word !== '').length;
}

/** Reading pace for "Play the story": 240 words a minute. */
export const WORDS_PER_MINUTE = 240;
/** No beat is shown for less than this, however short. Seconds. */
export const MIN_BEAT_SECONDS = 2.5;

/** How long a beat holds when the story plays itself, in seconds. */
export function beatSeconds(text: string): number {
  return Math.max(MIN_BEAT_SECONDS, (beatWords(text) / WORDS_PER_MINUTE) * 60);
}

const NUMBER_WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
];

/**
 * Where a roll call of `count` people comes in: after the first beat that gives their number, in words or
 * figures (for ten people: "ten" or "10"). Without such a beat, after the first one. -1 when there are no beats.
 */
export function rollCallBeatIndex(beats: string[], count: number): number {
  if (beats.length === 0) {
    return -1;
  }
  const words = new Set([String(count), NUMBER_WORDS[count]].filter((word): word is string => word !== undefined));
  const index = beats.findIndex(beat =>
    parseRefs(beat)
      .map(segment => (segment.kind === 'text' ? segment.text : segment.label))
      .join('')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .some(word => words.has(word))
  );
  return index === -1 ? 0 : index;
}

// src/lib/story-emphasis.ts
// The weighted words of a story chapter (`StorySection.emphasis`): which parts of a sentence arrive on their own.
// Pure. A sentence is cut into pieces, plain and weighted, without ever cutting through {{ref:…}} markup, so each
// piece can be rendered with its portals whole. Phrases are found in the sentence's plain text (markup read as its
// label), word for word, as validateCase checks.
import { parseRefs } from '@/lib/parse-refs';

export interface SentencePiece {
  /** Raw text, with any markup whole. */
  text: string;
  weighted: boolean;
}

/**
 * Cuts `sentence` into pieces: every first occurrence of a phrase in it is a weighted piece, the rest plain.
 * Overlapping phrases keep the earlier one. A phrase that ends or starts inside a reference's label takes the whole
 * reference. Joining the pieces' text gives the sentence back.
 */
export function weightedPieces(sentence: string, phrases: readonly string[] = []): SentencePiece[] {
  const segments = parseRefs(sentence);
  // Where each segment lies in the plain text and in the raw text.
  const spans: { plainStart: number; plainEnd: number; rawStart: number; rawEnd: number; ref: boolean }[] = [];
  let plain = '';
  let raw = 0;
  for (const segment of segments) {
    const shown = segment.kind === 'text' ? segment.text : segment.label;
    const written = segment.kind === 'text' ? segment.text : segment.raw;
    spans.push({ plainStart: plain.length, plainEnd: plain.length + shown.length, rawStart: raw, rawEnd: raw + written.length, ref: segment.kind === 'ref' });
    plain += shown;
    raw += written.length;
  }
  /** The raw index for a plain index: inside a reference, its start (or its end, for the end of a range). */
  const rawAt = (index: number, end: boolean) => {
    const span = spans.find(item => (end ? index > item.plainStart && index <= item.plainEnd : index >= item.plainStart && index < item.plainEnd));
    if (span === undefined) {
      return end ? sentence.length : 0;
    }
    if (span.ref) {
      return end ? span.rawEnd : span.rawStart;
    }
    return span.rawStart + (index - span.plainStart);
  };
  const ranges = phrases
    .filter(phrase => phrase.trim() !== '')
    .map(phrase => {
      const at = plain.indexOf(phrase);
      return at === -1 ? null : { start: rawAt(at, false), end: rawAt(at + phrase.length, true) };
    })
    .filter((range): range is { start: number; end: number } => range !== null)
    .sort((a, b) => a.start - b.start);
  const pieces: SentencePiece[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start < cursor) {
      continue;
    }
    if (range.start > cursor) {
      pieces.push({ text: sentence.slice(cursor, range.start), weighted: false });
    }
    pieces.push({ text: sentence.slice(range.start, range.end), weighted: true });
    cursor = range.end;
  }
  if (cursor < sentence.length) {
    pieces.push({ text: sentence.slice(cursor), weighted: false });
  }
  return pieces;
}

// src/lib/phrases.ts
// Splits a sentence into phrases at its punctuation, so it can be shown one phrase at a time.

export function splitIntoPhrases(text: string): string[] {
  return text
    .split(/(?<=[,;:.?!])\s+/)
    .map(phrase => phrase.trim())
    .filter(phrase => phrase !== '');
}

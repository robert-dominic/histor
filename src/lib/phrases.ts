// src/lib/phrases.ts
// Splits a sentence into phrases at its punctuation, so it can be shown one phrase at a time.

export function splitIntoPhrases(text: string): string[] {
  return text
    .split(/(?<=[,;:.?!])\s+/)
    .map(phrase => phrase.trim())
    .filter(phrase => phrase !== '');
}

/**
 * Splits the central question into the phrases it builds by: at its commas, and before each "and" that starts a new
 * part. Punctuation stays with its phrase. Joining the phrases with spaces gives the text back.
 */
export function splitQuestion(text: string): string[] {
  return text
    .split(/(?<=,)\s+/)
    .flatMap(part => part.split(/\s+(?=and\b)/))
    .map(phrase => phrase.trim())
    .filter(phrase => phrase !== '');
}

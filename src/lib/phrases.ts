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

/**
 * The lines the central question is shown in, one per step: the case's own (`Case.centralQuestionLines`) when they
 * give the question back exactly, joined with single spaces; otherwise it is split at its commas and before "and".
 */
export function questionLines(question: string, lines?: readonly string[]): string[] {
  if (lines !== undefined && lines.length > 0 && lines.join(' ') === question) {
    return [...lines];
  }
  return splitQuestion(question);
}

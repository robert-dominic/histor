// src/lib/signature-letters.ts
// The signature's letters (ui-pass brief, 5): from one name to the next, what is kept, what leaves and what is new, so
// the pen on the card adds and never rewrites (src/features/verdict/CardSignature.tsx). Pure.

/** One letter of the signature: kept from before, new (for the pen), or leaving (fading out). */
export interface Letter {
  id: number;
  char: string;
  state: 'kept' | 'new' | 'leaving';
}

let nextId = 0;
export const lettersOf = (text: string, state: Letter['state']): Letter[] => [...text].map(char => ({ id: nextId++, char, state }));

/**
 * The letters of `next`, from the letters on the card now: the same start and end are kept as they are; the letters
 * between that went away are marked leaving, and the ones that came are new. Letters already leaving stay leaving.
 */
export function diffSignature(now: readonly Letter[], next: string): Letter[] {
  const present = now.filter(letter => letter.state !== 'leaving');
  const chars = [...next];
  let start = 0;
  while (start < present.length && start < chars.length && present[start].char === chars[start]) {
    start += 1;
  }
  let end = 0;
  while (end < present.length - start && end < chars.length - start && present[present.length - 1 - end].char === chars[chars.length - 1 - end]) {
    end += 1;
  }
  const kept = (letter: Letter): Letter => ({ ...letter, state: letter.state === 'new' ? 'new' : 'kept' });
  return [
    ...present.slice(0, start).map(kept),
    ...present.slice(start, present.length - end).map(letter => ({ ...letter, state: 'leaving' as const })),
    ...lettersOf(chars.slice(start, chars.length - end).join(''), 'new'),
    ...present.slice(present.length - end).map(kept),
  ];
}

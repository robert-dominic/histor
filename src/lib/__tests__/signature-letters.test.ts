// src/lib/__tests__/signature-letters.test.ts
// The pen adds, it doesn't rewrite (ui-pass brief, 5): from one name to the next, the letters already on the card
// are kept (the same ones), a deleted letter leaves on its own, and only the new letters are for the pen.
import { describe, expect, test } from 'vitest';
import { diffSignature, lettersOf } from '@/lib/signature-letters';

const text = (letters: { char: string }[]) => letters.map(letter => letter.char).join('');
const settled = (letters: ReturnType<typeof lettersOf>) => letters.filter(l => l.state !== 'leaving').map(l => ({ ...l, state: 'kept' as const }));

describe('diffSignature', () => {
  test('typing on: the letters there are kept (same ids), only the new ones are for the pen', () => {
    const before = lettersOf('Ann', 'kept');
    const after = diffSignature(before, 'Ann Lee');
    expect(text(after)).toBe('Ann Lee');
    expect(after.slice(0, 3).map(l => l.id)).toEqual(before.map(l => l.id));
    expect(after.slice(0, 3).every(l => l.state === 'kept')).toBe(true);
    expect(after.slice(3).every(l => l.state === 'new')).toBe(true);
  });

  test('deleting a letter: just that letter leaves; nothing is written', () => {
    const before = lettersOf('Ann Lee', 'kept');
    const after = diffSignature(before, 'Ann Le');
    expect(after.filter(l => l.state === 'leaving').map(l => l.char)).toEqual(['e']);
    expect(after.some(l => l.state === 'new')).toBe(false);
    expect(text(settled(after))).toBe('Ann Le');
  });

  test('a letter fixed in the middle: the start and the end are kept, only the middle changes', () => {
    const before = lettersOf('Anm Lee', 'kept');
    const after = diffSignature(before, 'Ann Lee');
    expect(after.filter(l => l.state === 'leaving').map(l => l.char)).toEqual(['m']);
    expect(after.filter(l => l.state === 'new').map(l => l.char)).toEqual(['n']);
    expect(text(settled(after))).toBe('Ann Lee');
  });

  test('pasting a whole name into an empty field: the pasted part is written', () => {
    const after = diffSignature([], 'Mary Ann');
    expect(after.every(l => l.state === 'new')).toBe(true);
    expect(text(after)).toBe('Mary Ann');
  });
});

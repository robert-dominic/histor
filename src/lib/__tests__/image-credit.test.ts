// src/lib/__tests__/image-credit.test.ts
import { describe, expect, test } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import { storyImageCredit } from '@/lib/image-credit';

describe('storyImageCredit: the ⓘ says what the image no longer labels', () => {
  test('an illustration\'s credit begins "AI illustration."', () => {
    expect(storyImageCredit({ credit: 'Test credit.', isIllustration: true })).toBe('AI illustration. Test credit.');
  });

  test('not twice (a credit that already says it is kept as it is), and any other image keeps its own credit', () => {
    expect(storyImageCredit({ credit: 'AI illustration. Test.', isIllustration: true })).toBe('AI illustration. Test.');
    expect(storyImageCredit({ credit: 'A deck. An AI illustration made in 2026.', isIllustration: true })).toBe('A deck. An AI illustration made in 2026.');
    expect(storyImageCredit({ credit: 'Test credit.', isIllustration: false })).toBe('Test credit.');
  });

  test('every illustration in the Mary Celeste story says so, once', () => {
    for (const section of maryCeleste.story) {
      if (section.image?.isIllustration) {
        expect(storyImageCredit(section.image).match(/AI illustration/gi)).toHaveLength(1);
      }
    }
  });
});

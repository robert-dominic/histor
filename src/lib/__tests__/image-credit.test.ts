// src/lib/__tests__/image-credit.test.ts
import { describe, expect, test } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import { storyImageCredit } from '@/lib/image-credit';

describe('storyImageCredit: the ⓘ says what the image no longer labels', () => {
  test('an illustration\'s credit begins "AI illustration."', () => {
    expect(storyImageCredit({ credit: 'Test credit.', isIllustration: true })).toBe('AI illustration. Test credit.');
  });

  test('not twice, and any other image keeps its own credit', () => {
    expect(storyImageCredit({ credit: 'AI illustration. Test.', isIllustration: true })).toBe('AI illustration. Test.');
    expect(storyImageCredit({ credit: 'Test credit.', isIllustration: false })).toBe('Test credit.');
  });

  test('every illustration in the Mary Celeste story is credited that way', () => {
    for (const section of maryCeleste.story) {
      if (section.image?.isIllustration) {
        expect(storyImageCredit(section.image)).toMatch(/^AI illustration\. /);
      }
    }
  });
});

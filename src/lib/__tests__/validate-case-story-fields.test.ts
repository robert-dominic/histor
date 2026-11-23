// src/lib/__tests__/validate-case-story-fields.test.ts
// validateCase and the fields added for the story screen (data-foundation requirements 3.13 and 7.28):
// - StorySection.image: when present, its src, alt and credit must be non-empty strings
// - Case.yearEnd: when present, an integer that is not before year
// - Case.unsolved: a plain flag, with nothing to check
// - Case.deskGuideIntro (story-dread 1.5): when present, a non-empty string
import { describe, expect, test } from 'vitest';
import { validateCase } from '@/lib/validate-case';
import type { Case, ImageAsset } from '@/types/case';

const validImage: ImageAsset = { src: '/image.webp', alt: 'Test alt', credit: 'Test credit', isIllustration: false };

/** A minimal valid case. The content is test data, not history. */
function createCase(overrides: Partial<Case> = {}): Case {
  return {
    id: 'test-case',
    title: 'Test case',
    year: 1900,
    teaser: 'Test teaser',
    legendIntro: { lines: ['Test line'], stamp: 'Test stamp', debunk: 'Test debunk' },
    story: [
      { id: 's-one', heading: 'Heading one', body: ['Paragraph one'] },
      { id: 's-two', heading: 'Heading two', body: ['Paragraph two'] },
    ],
    centralQuestion: 'Test question?',
    fork: { prompt: 'Test prompt', investigateLabel: 'Investigate', leaveLabel: 'Leave' },
    theories: [
      { id: 't-one', title: 'Theory one', claim: 'Claim one', standing: 'leading', standingReason: 'Reason one' },
    ],
    evidence: [
      {
        id: 'e-one',
        title: 'Evidence one',
        detail: ['Detail one'],
        sources: ['src-one'],
        reading: { supports: ['t-one'], weakens: [], note: 'Note one' },
        status: 'record',
      },
    ],
    sources: [{ id: 'src-one', title: 'Source one', kind: 'official', citation: 'Test citation' }],
    references: [],
    historiansSummary: ['Test summary'],
    closeThreshold: 1,
    theme: { id: 'test-theme' },
    ...overrides,
  };
}

/** The test case with `image` on its second chapter. */
function withImage(image: unknown): Case {
  const base = createCase();
  return { ...base, story: [base.story[0], { ...base.story[1], image: image as ImageAsset }] };
}

describe('validateCase: StorySection.image', () => {
  test('a story without images is valid', () => {
    expect(validateCase(createCase())).toEqual([]);
  });

  test('a chapter with a complete image is valid', () => {
    expect(validateCase(withImage(validImage))).toEqual([]);
  });

  test('an illustration is valid too', () => {
    expect(validateCase(withImage({ ...validImage, isIllustration: true }))).toEqual([]);
  });

  test.each(['src', 'alt', 'credit'] as const)('reports an empty %s, with the chapter it belongs to', field => {
    expect(validateCase(withImage({ ...validImage, [field]: '' }))).toEqual([
      `Field story[1].image.${field}: Must be a non-empty string`,
    ]);
  });

  test.each(['src', 'alt', 'credit'] as const)('reports a %s that is only whitespace', field => {
    expect(validateCase(withImage({ ...validImage, [field]: '  \t ' }))).toEqual([
      `Field story[1].image.${field}: Must be a non-empty string`,
    ]);
  });

  test.each(['src', 'alt', 'credit'] as const)('reports a missing %s', field => {
    const image: Record<string, unknown> = { ...validImage };
    delete image[field];

    expect(validateCase(withImage(image))).toEqual([`Field story[1].image.${field}: Must be a non-empty string`]);
  });

  test('reports a field that is not a string', () => {
    expect(validateCase(withImage({ ...validImage, alt: 42 }))).toEqual([
      'Field story[1].image.alt: Must be a non-empty string',
    ]);
  });

  test('reports every problem at once, in the order src, alt, credit', () => {
    expect(validateCase(withImage({ src: '', alt: '', credit: '', isIllustration: false }))).toEqual([
      'Field story[1].image.src: Must be a non-empty string',
      'Field story[1].image.alt: Must be a non-empty string',
      'Field story[1].image.credit: Must be a non-empty string',
    ]);
  });

  test('checks every chapter that has an image', () => {
    const base = createCase();
    const broken: Case = {
      ...base,
      story: base.story.map(section => ({ ...section, image: { ...validImage, credit: '' } })),
    };

    expect(validateCase(broken)).toEqual([
      'Field story[0].image.credit: Must be a non-empty string',
      'Field story[1].image.credit: Must be a non-empty string',
    ]);
  });

  test('portal markup is not allowed in the alt text or the credit', () => {
    const errors = validateCase(withImage({ ...validImage, alt: 'A {{ref:thing|thing}}' }));

    expect(errors).toEqual(['Field story[1].image.alt: portal markup is not allowed in this field']);
  });
});

describe('validateCase: yearEnd', () => {
  test('a case without yearEnd is valid', () => {
    expect(validateCase(createCase())).toEqual([]);
  });

  test('a yearEnd after year is valid', () => {
    expect(validateCase(createCase({ year: 1872, yearEnd: 1873 }))).toEqual([]);
  });

  test('a yearEnd equal to year is valid', () => {
    expect(validateCase(createCase({ year: 1872, yearEnd: 1872 }))).toEqual([]);
  });

  test('reports a yearEnd before year', () => {
    expect(validateCase(createCase({ year: 1872, yearEnd: 1871 }))).toEqual([
      'Field yearEnd: Must be an integer not before year',
    ]);
  });

  test.each([1872.5, Number.NaN, Number.POSITIVE_INFINITY])('reports a yearEnd that is not an integer: %s', yearEnd => {
    expect(validateCase(createCase({ year: 1872, yearEnd }))).toEqual([
      'Field yearEnd: Must be an integer not before year',
    ]);
  });

  test('reports a yearEnd that is not a number', () => {
    expect(validateCase(createCase({ year: 1872, yearEnd: '1873' as unknown as number }))).toEqual([
      'Field yearEnd: Must be an integer not before year',
    ]);
  });
});

describe('validateCase: unsolved', () => {
  test.each([true, false])('unsolved: %s is valid', unsolved => {
    expect(validateCase(createCase({ unsolved }))).toEqual([]);
  });
});

describe('validateCase: ImageAsset.caption', () => {
  test('an image without a caption is valid', () => {
    expect(validateCase(withImage(validImage))).toEqual([]);
  });

  test('an image with a caption is valid', () => {
    expect(validateCase(withImage({ ...validImage, caption: 'Test caption, 1900' }))).toEqual([]);
  });

  test.each(['', '   '])('reports an empty caption on a chapter image: "%s"', caption => {
    expect(validateCase(withImage({ ...validImage, caption }))).toEqual([
      'Field story[1].image.caption: Must be a non-empty string',
    ]);
  });

  test('reports a caption that is not a string', () => {
    expect(validateCase(withImage({ ...validImage, caption: 1861 }))).toEqual([
      'Field story[1].image.caption: Must be a non-empty string',
    ]);
  });

  test('reports an empty caption on a reference image', () => {
    const broken = createCase({
      references: [{ id: 'thing', kind: 'term', label: 'Thing', profile: ['A thing.'], image: { ...validImage, caption: '' } }],
    });

    expect(validateCase(broken)).toEqual(['Field references[0].image.caption: Must be a non-empty string']);
  });

  test('reports an empty caption on an evidence image', () => {
    const base = createCase();
    const broken: Case = { ...base, evidence: [{ ...base.evidence[0], image: { ...validImage, caption: ' ' } }] };

    expect(validateCase(broken)).toEqual(['Field evidence[0].image.caption: Must be a non-empty string']);
  });

  test('portal markup is not allowed in a caption', () => {
    expect(validateCase(withImage({ ...validImage, caption: 'A {{ref:thing|thing}}' }))).toEqual([
      'Field story[1].image.caption: portal markup is not allowed in this field',
    ]);
  });
});

describe('validateCase: deskGuideIntro', () => {
  test('may be left out', () => {
    expect(validateCase(createCase())).toEqual([]);
  });

  test('a sentence is valid', () => {
    expect(validateCase(createCase({ deskGuideIntro: 'In 1900 the test case happened.' }))).toEqual([]);
  });

  test.each(['', '   '])('an empty one (%j) is an error', intro => {
    expect(validateCase(createCase({ deskGuideIntro: intro }))).toContain('Field deskGuideIntro: Must be a non-empty string when present');
  });
});

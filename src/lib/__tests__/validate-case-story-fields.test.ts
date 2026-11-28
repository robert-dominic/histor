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
    hook: { lines: ['Test line'], dateline: 'Test dateline' },
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

describe('validateCase: weighted words (StorySection.emphasis, data-foundation 3.16)', () => {
  const withEmphasis = (emphasis: unknown, section: Partial<Case['story'][number]> = {}) =>
    createCase({
      story: [{ id: 's-one', heading: 'Heading one', body: ['Paragraph one, with {{ref:r-one|the captain}} in it.'], hook: 'A test hook.', ...section, emphasis } as Case['story'][number]],
      references: [{ id: 'r-one', kind: 'person', label: 'Test person', profile: ['Test profile'] }],
    });

  test('may be left out', () => {
    expect(validateCase(withEmphasis(undefined))).toEqual([]);
  });

  test('phrases from the body or the hook are valid, with markup read as its label', () => {
    expect(validateCase(withEmphasis(['Paragraph one', 'the captain in it', 'test hook.']))).toEqual([]);
  });

  test('a phrase that is not word for word in the text is an error; the markup itself does not count', () => {
    expect(validateCase(withEmphasis(['paragraph one']))).toContain(
      "Field story[0].emphasis[0]: 'paragraph one' must appear word for word in the section's body or hook"
    );
    expect(validateCase(withEmphasis(['{{ref:r-one|the captain}}']))).toContain(
      "Field story[0].emphasis[0]: '{{ref:r-one|the captain}}' must appear word for word in the section's body or hook"
    );
  });

  test("a phrase from another section's text does not count", () => {
    const caseData = createCase();
    caseData.story[0].emphasis = ['Paragraph two'];
    expect(validateCase(caseData)).toContain(
      "Field story[0].emphasis[0]: 'Paragraph two' must appear word for word in the section's body or hook"
    );
  });

  test('an empty phrase, or something that is not a list, is an error', () => {
    expect(validateCase(withEmphasis(['  ']))).toContain('Field story[0].emphasis[0]: Must be a non-empty string');
    expect(validateCase(withEmphasis('Paragraph one'))).toContain('Field story[0].emphasis: Must be an array');
  });
});

describe('validateCase: weighted parts of the central question (data-foundation 3.17)', () => {
  test('may be left out, and phrases from the question are valid', () => {
    expect(validateCase(createCase())).toEqual([]);
    expect(validateCase(createCase({ centralQuestionEmphasis: ['Test question'] }))).toEqual([]);
  });

  test('a phrase not word for word in the question, an empty phrase, or not a list, is an error', () => {
    expect(validateCase(createCase({ centralQuestionEmphasis: ['test question'] }))).toContain(
      "Field centralQuestionEmphasis[0]: 'test question' must appear word for word in centralQuestion"
    );
    expect(validateCase(createCase({ centralQuestionEmphasis: [' '] }))).toContain(
      'Field centralQuestionEmphasis[0]: Must be a non-empty string'
    );
    expect(validateCase(createCase({ centralQuestionEmphasis: 'Test' as unknown as string[] }))).toContain(
      'Field centralQuestionEmphasis: Must be an array'
    );
  });
});

describe('validateCase: lines of the central question (data-foundation 3.18)', () => {
  const question = createCase().centralQuestion ?? '';
  const words = question.split(' ');

  test('may be left out; lines that give the question back exactly, joined with single spaces, are valid', () => {
    expect(validateCase(createCase())).toEqual([]);
    expect(validateCase(createCase({ centralQuestionLines: [question] }))).toEqual([]);
    if (words.length > 1) {
      expect(validateCase(createCase({ centralQuestionLines: [words[0], words.slice(1).join(' ')] }))).toEqual([]);
    }
  });

  test('lines that do not give the question back exactly are an error', () => {
    expect(validateCase(createCase({ centralQuestionLines: ['Something else entirely'] }))).toContain(
      'Field centralQuestionLines: Joined with single spaces, the lines must equal centralQuestion exactly'
    );
    // A word left out.
    expect(validateCase(createCase({ centralQuestionLines: [words.slice(1).join(' ') || 'x'] }))).toContain(
      'Field centralQuestionLines: Joined with single spaces, the lines must equal centralQuestion exactly'
    );
  });

  test('an empty line, a line with a space at an end, an empty list, or not a list, is an error', () => {
    expect(validateCase(createCase({ centralQuestionLines: [question, ''] }))).toContain(
      'Field centralQuestionLines[1]: Must be a non-empty string with no space at either end'
    );
    expect(validateCase(createCase({ centralQuestionLines: [` ${question}`] }))).toContain(
      'Field centralQuestionLines[0]: Must be a non-empty string with no space at either end'
    );
    expect(validateCase(createCase({ centralQuestionLines: [] }))).toContain('Field centralQuestionLines: Must be a non-empty array');
    expect(validateCase(createCase({ centralQuestionLines: question as unknown as string[] }))).toContain(
      'Field centralQuestionLines: Must be a non-empty array'
    );
  });

  test('the Mary Celeste lines are valid', async () => {
    const maryCeleste = (await import('@/test/story-fixture')).storyFixture;
    expect(maryCeleste.centralQuestionLines).toHaveLength(5);
    expect(validateCase(maryCeleste)).toEqual([]);
  });
});

describe('validateCase: the heading of the roll call\'s slip (data-foundation 3.19)', () => {
  test('may be left out, and a heading on a section with a roll call is valid', async () => {
    expect(validateCase(createCase())).toEqual([]);
    const maryCeleste = (await import('@/test/story-fixture')).storyFixture;
    expect(maryCeleste.story[0].rollCallTitle).toBe('Crew list · Mary Celeste · Nov. 1872');
    expect(validateCase(maryCeleste)).toEqual([]);
  });

  test('an empty heading, or a heading on a section with no roll call, is an error', () => {
    const base = createCase();
    const withTitle = (title: unknown, rollCall?: unknown) =>
      createCase({ story: [{ ...base.story[0], rollCallTitle: title as string, rollCall: rollCall as never }, ...base.story.slice(1)] });
    expect(validateCase(withTitle(' ', [{ name: 'A', role: 'b' }]))).toContain('Field story[0].rollCallTitle: Must be a non-empty string');
    expect(validateCase(withTitle('Crew list'))).toContain('Field story[0].rollCallTitle: The section must have a rollCall');
  });
});

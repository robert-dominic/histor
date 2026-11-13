// src/lib/__tests__/validate-case-legend-video.test.ts
// validateCase and the optional legend video (Requirement 13.5, 13.6):
// when theme.legendVideo is present, its src, poster and credit must be non-empty strings.
import { describe, expect, test } from 'vitest';
import { validateCase } from '@/lib/validate-case';
import type { Case } from '@/types/case';

type LegendVideo = NonNullable<Case['theme']['legendVideo']>;

const validVideo: LegendVideo = { src: '/video.mp4', poster: '/poster.webp', credit: 'Test credit' };

/** A minimal valid case. The content is test data, not history. */
function createCase(legendVideo?: unknown): Case {
  return {
    id: 'test-case',
    title: 'Test case',
    year: 1900,
    teaser: 'Test teaser',
    legendIntro: { lines: ['Test line'], stamp: 'Test stamp', debunk: 'Test debunk' },
    story: [{ id: 's-one', heading: 'Test heading', body: ['Test paragraph'] }],
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
    theme: { id: 'test-theme', ...(legendVideo === undefined ? {} : { legendVideo: legendVideo as LegendVideo }) },
  };
}

const legendVideoErrors = (caseData: Case) =>
  validateCase(caseData).filter(error => error.includes('theme.legendVideo'));

describe('validateCase: theme.legendVideo', () => {
  test('a case without a legend video is valid', () => {
    expect(validateCase(createCase())).toEqual([]);
  });

  test('a case with a complete legend video is valid', () => {
    expect(validateCase(createCase(validVideo))).toEqual([]);
  });

  test.each(['src', 'poster', 'credit'] as const)('reports an empty %s', field => {
    expect(validateCase(createCase({ ...validVideo, [field]: '' }))).toEqual([
      `Field theme.legendVideo.${field}: Must be a non-empty string`,
    ]);
  });

  test.each(['src', 'poster', 'credit'] as const)('reports a %s that is only whitespace', field => {
    expect(validateCase(createCase({ ...validVideo, [field]: '   ' }))).toEqual([
      `Field theme.legendVideo.${field}: Must be a non-empty string`,
    ]);
  });

  test.each(['src', 'poster', 'credit'] as const)('reports a missing %s', field => {
    const video: Record<string, string> = { ...validVideo };
    delete video[field];

    expect(validateCase(createCase(video))).toEqual([`Field theme.legendVideo.${field}: Must be a non-empty string`]);
  });

  test('reports a field that is not a string', () => {
    expect(legendVideoErrors(createCase({ ...validVideo, credit: 42 }))).toEqual([
      'Field theme.legendVideo.credit: Must be a non-empty string',
    ]);
  });

  test('reports every problem at once, in the order src, poster, credit', () => {
    expect(validateCase(createCase({ src: '', poster: '', credit: '' }))).toEqual([
      'Field theme.legendVideo.src: Must be a non-empty string',
      'Field theme.legendVideo.poster: Must be a non-empty string',
      'Field theme.legendVideo.credit: Must be a non-empty string',
    ]);
  });

  test('does not change any other result: the rest of the case is still checked', () => {
    const broken = { ...createCase(validVideo), title: '' };

    expect(validateCase(broken)).toEqual(['Field title: Must be a non-empty string']);
  });
});

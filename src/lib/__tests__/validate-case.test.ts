// src/lib/__tests__/validate-case.test.ts
import { describe, test, expect } from 'vitest';
import { validateCase } from '../validate-case';
import type { Case } from '../../types/case';

// Helper to create a minimal valid case
function createValidCase(overrides?: Partial<Case>): Case {
  return {
    id: 'test-case',
    title: 'Test Case',
    year: 1872,
    teaser: 'A test mystery',
    legendIntro: {
      lines: ['Legend line'],
      stamp: 'Test stamp',
      debunk: 'Test debunk'
    },
    story: [
      {
        id: 's1',
        heading: 'Test Section',
        body: ['Test paragraph']
      }
    ],
    centralQuestion: 'What happened?',
    fork: {
      prompt: 'Continue?',
      investigateLabel: 'Investigate',
      leaveLabel: 'Leave'
    },
    theories: [
      {
        id: 't1',
        title: 'Theory 1',
        claim: 'A claim',
        standing: 'leading',
        standingReason: 'A reason'
      }
    ],
    evidence: [
      {
        id: 'e1',
        title: 'Evidence 1',
        detail: ['Detail'],
        sources: ['src1'],
        reading: {
          supports: [],
          weakens: [],
          note: 'A note'
        },
        status: 'record'
      }
    ],
    sources: [
      {
        id: 'src1',
        title: 'Source 1',
        kind: 'testimony',
        url: 'http://example.com'
      }
    ],
    references: [],
    historiansSummary: ['Summary paragraph'],
    closeThreshold: 1,
    theme: {
      id: 'test-theme'
    },
    ...overrides
  };
}

describe('validateCase - Task 1.1', () => {
  test('returns empty array for valid case', () => {
    const validCase = createValidCase();
    const errors = validateCase(validCase);
    expect(errors).toEqual([]);
  });

  test('detects empty id', () => {
    const invalidCase = createValidCase({ id: '' });
    const errors = validateCase(invalidCase);
    expect(errors).toContain('Field id: Must be a non-empty string');
  });

  test('detects whitespace-only id', () => {
    const invalidCase = createValidCase({ id: '   ' });
    const errors = validateCase(invalidCase);
    expect(errors).toContain('Field id: Must be a non-empty string');
  });

  test('detects empty title', () => {
    const invalidCase = createValidCase({ title: '' });
    const errors = validateCase(invalidCase);
    expect(errors).toContain('Field title: Must be a non-empty string');
  });

  test('detects empty teaser', () => {
    const invalidCase = createValidCase({ teaser: '' });
    const errors = validateCase(invalidCase);
    expect(errors).toContain('Field teaser: Must be a non-empty string');
  });

  test('detects empty centralQuestion', () => {
    const invalidCase = createValidCase({ centralQuestion: '' });
    const errors = validateCase(invalidCase);
    expect(errors).toContain('Field centralQuestion: Must be a non-empty string');
  });

  test('detects zero year', () => {
    const invalidCase = createValidCase({ year: 0 });
    const errors = validateCase(invalidCase);
    expect(errors).toContain('Field year: Must be a positive integer');
  });

  test('detects negative year', () => {
    const invalidCase = createValidCase({ year: -100 });
    const errors = validateCase(invalidCase);
    expect(errors).toContain('Field year: Must be a positive integer');
  });

  test('detects non-integer year', () => {
    const invalidCase = createValidCase({ year: 1872.5 });
    const errors = validateCase(invalidCase);
    expect(errors).toContain('Field year: Must be a positive integer');
  });

  test('detects empty theories array', () => {
    const invalidCase = createValidCase({ theories: [] });
    const errors = validateCase(invalidCase);
    expect(errors).toContain('Field theories: Must contain at least one theory');
  });

  test('detects empty evidence array', () => {
    const invalidCase = createValidCase({ evidence: [] });
    const errors = validateCase(invalidCase);
    expect(errors).toContain('Field evidence: Must contain at least one evidence item');
  });

  test('detects empty sources array', () => {
    const invalidCase = createValidCase({ sources: [] });
    const errors = validateCase(invalidCase);
    expect(errors).toContain('Field sources: Must contain at least one source');
  });

  test('detects empty story array', () => {
    const invalidCase = createValidCase({ story: [] });
    const errors = validateCase(invalidCase);
    expect(errors).toContain('Field story: Must contain at least one section');
  });

  test('detects empty legendIntro.lines array', () => {
    const invalidCase = createValidCase({
      legendIntro: { lines: [], stamp: 'stamp', debunk: 'debunk' }
    });
    const errors = validateCase(invalidCase);
    expect(errors).toContain('Field legendIntro.lines: Must contain at least one line');
  });

  test('detects empty historiansSummary array', () => {
    const invalidCase = createValidCase({ historiansSummary: [] });
    const errors = validateCase(invalidCase);
    expect(errors).toContain('Field historiansSummary: Must contain at least one paragraph');
  });

  test('detects negative closeThreshold', () => {
    const invalidCase = createValidCase({ closeThreshold: -1 });
    const errors = validateCase(invalidCase);
    expect(errors).toContain(
      'Field closeThreshold: Must be a non-negative integer not exceeding evidence array length (1)'
    );
  });

  test('detects closeThreshold exceeding evidence length', () => {
    const invalidCase = createValidCase({ closeThreshold: 5 });
    const errors = validateCase(invalidCase);
    expect(errors).toContain(
      'Field closeThreshold: Must be a non-negative integer not exceeding evidence array length (1)'
    );
  });

  test('detects non-integer closeThreshold', () => {
    const invalidCase = createValidCase({ closeThreshold: 0.5 });
    const errors = validateCase(invalidCase);
    expect(errors).toContain(
      'Field closeThreshold: Must be a non-negative integer not exceeding evidence array length (1)'
    );
  });

  test('accepts closeThreshold of 0', () => {
    const validCase = createValidCase({ closeThreshold: 0 });
    const errors = validateCase(validCase);
    expect(errors).toEqual([]);
  });

  test('accepts closeThreshold equal to evidence length', () => {
    const validCase = createValidCase({
      evidence: [
        {
          id: 'e1',
          title: 'Evidence 1',
          detail: ['Detail 1'],
          sources: ['src1'],
          reading: { supports: [], weakens: [], note: 'Note' },
          status: 'record'
        },
        {
          id: 'e2',
          title: 'Evidence 2',
          detail: ['Detail 2'],
          sources: ['src1'],
          reading: { supports: [], weakens: [], note: 'Note' },
          status: 'record'
        }
      ],
      closeThreshold: 2
    });
    const errors = validateCase(validCase);
    expect(errors).toEqual([]);
  });

  test('collects all errors at once', () => {
    const invalidCase = createValidCase({
      id: '',
      title: '',
      year: 0,
      teaser: '',
      centralQuestion: '',
      theories: [],
      evidence: [],
      sources: [],
      story: [],
      legendIntro: { lines: [], stamp: 'stamp', debunk: 'debunk' },
      historiansSummary: [],
      closeThreshold: -1
    });
    const errors = validateCase(invalidCase);
    expect(errors.length).toBeGreaterThanOrEqual(11); // All violations should be reported
  });
});

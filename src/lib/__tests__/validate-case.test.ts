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

describe('validateCase - Task 2.1 (ID Uniqueness)', () => {
  test('detects duplicate theory IDs', () => {
    const invalidCase = createValidCase({
      theories: [
        {
          id: 't1',
          title: 'Theory 1',
          claim: 'A claim',
          standing: 'leading',
          standingReason: 'A reason'
        },
        {
          id: 't1',
          title: 'Theory 2',
          claim: 'Another claim',
          standing: 'considered',
          standingReason: 'Another reason'
        }
      ]
    });
    const errors = validateCase(invalidCase);
    expect(errors).toContain("Field theories: duplicate ID 't1' found");
  });

  test('detects duplicate evidence IDs', () => {
    const invalidCase = createValidCase({
      evidence: [
        {
          id: 'e1',
          title: 'Evidence 1',
          detail: ['Detail 1'],
          sources: ['src1'],
          reading: { supports: [], weakens: [], note: 'Note 1' },
          status: 'record'
        },
        {
          id: 'e1',
          title: 'Evidence 2',
          detail: ['Detail 2'],
          sources: ['src1'],
          reading: { supports: [], weakens: [], note: 'Note 2' },
          status: 'record'
        }
      ]
    });
    const errors = validateCase(invalidCase);
    expect(errors).toContain("Field evidence: duplicate ID 'e1' found");
  });

  test('detects duplicate source IDs', () => {
    const invalidCase = createValidCase({
      sources: [
        {
          id: 'src1',
          title: 'Source 1',
          kind: 'testimony',
          url: 'http://example.com'
        },
        {
          id: 'src1',
          title: 'Source 2',
          kind: 'official',
          url: 'http://example2.com'
        }
      ]
    });
    const errors = validateCase(invalidCase);
    expect(errors).toContain("Field sources: duplicate ID 'src1' found");
  });

  test('detects duplicate reference IDs', () => {
    const invalidCase = createValidCase({
      references: [
        {
          id: 'ref1',
          kind: 'person',
          label: 'Reference 1',
          profile: ['Profile text']
        },
        {
          id: 'ref1',
          kind: 'place',
          label: 'Reference 2',
          profile: ['Profile text 2']
        }
      ]
    });
    const errors = validateCase(invalidCase);
    expect(errors).toContain("Field references: duplicate ID 'ref1' found");
  });

  test('accepts unique theory IDs', () => {
    const validCase = createValidCase({
      theories: [
        {
          id: 't1',
          title: 'Theory 1',
          claim: 'A claim',
          standing: 'leading',
          standingReason: 'A reason'
        },
        {
          id: 't2',
          title: 'Theory 2',
          claim: 'Another claim',
          standing: 'considered',
          standingReason: 'Another reason'
        }
      ]
    });
    const errors = validateCase(validCase);
    expect(errors).toEqual([]);
  });

  test('accepts unique evidence IDs', () => {
    const validCase = createValidCase({
      evidence: [
        {
          id: 'e1',
          title: 'Evidence 1',
          detail: ['Detail 1'],
          sources: ['src1'],
          reading: { supports: [], weakens: [], note: 'Note 1' },
          status: 'record'
        },
        {
          id: 'e2',
          title: 'Evidence 2',
          detail: ['Detail 2'],
          sources: ['src1'],
          reading: { supports: [], weakens: [], note: 'Note 2' },
          status: 'record'
        }
      ],
      closeThreshold: 2
    });
    const errors = validateCase(validCase);
    expect(errors).toEqual([]);
  });

  test('accepts unique source IDs', () => {
    const validCase = createValidCase({
      sources: [
        {
          id: 'src1',
          title: 'Source 1',
          kind: 'testimony',
          url: 'http://example.com'
        },
        {
          id: 'src2',
          title: 'Source 2',
          kind: 'official',
          url: 'http://example2.com'
        }
      ]
    });
    const errors = validateCase(validCase);
    expect(errors).toEqual([]);
  });

  test('accepts unique reference IDs', () => {
    const validCase = createValidCase({
      references: [
        {
          id: 'ref1',
          kind: 'person',
          label: 'Reference 1',
          profile: ['Profile text']
        },
        {
          id: 'ref2',
          kind: 'place',
          label: 'Reference 2',
          profile: ['Profile text 2']
        }
      ]
    });
    const errors = validateCase(validCase);
    expect(errors).toEqual([]);
  });

  test('detects multiple duplicate IDs in same case', () => {
    const invalidCase = createValidCase({
      theories: [
        { id: 't1', title: 'T1', claim: 'C1', standing: 'leading', standingReason: 'R1' },
        { id: 't1', title: 'T2', claim: 'C2', standing: 'considered', standingReason: 'R2' }
      ],
      evidence: [
        { id: 'e1', title: 'E1', detail: ['D1'], sources: ['src1'], reading: { supports: [], weakens: [], note: 'N1' }, status: 'record' },
        { id: 'e1', title: 'E2', detail: ['D2'], sources: ['src1'], reading: { supports: [], weakens: [], note: 'N2' }, status: 'record' }
      ],
      closeThreshold: 2
    });
    const errors = validateCase(invalidCase);
    expect(errors).toContain("Field theories: duplicate ID 't1' found");
    expect(errors).toContain("Field evidence: duplicate ID 'e1' found");
  });
});

describe('validateCase - Task 2.2 (Referential Integrity)', () => {
  test('detects invalid source reference in evidence.sources', () => {
    const invalidCase = createValidCase({
      evidence: [
        {
          id: 'e1',
          title: 'Evidence 1',
          detail: ['Detail'],
          sources: ['non-existent-source'],
          reading: { supports: [], weakens: [], note: 'Note' },
          status: 'record'
        }
      ]
    });
    const errors = validateCase(invalidCase);
    expect(errors).toContain("Field evidence[0].sources: reference ID 'non-existent-source' not found in sources");
  });

  test('accepts valid source reference in evidence.sources', () => {
    const validCase = createValidCase({
      evidence: [
        {
          id: 'e1',
          title: 'Evidence 1',
          detail: ['Detail'],
          sources: ['src1'],
          reading: { supports: [], weakens: [], note: 'Note' },
          status: 'record'
        }
      ]
    });
    const errors = validateCase(validCase);
    expect(errors).toEqual([]);
  });

  test('detects invalid theory reference in evidence.reading.supports', () => {
    const invalidCase = createValidCase({
      evidence: [
        {
          id: 'e1',
          title: 'Evidence 1',
          detail: ['Detail'],
          sources: ['src1'],
          reading: { supports: ['non-existent-theory'], weakens: [], note: 'Note' },
          status: 'record'
        }
      ]
    });
    const errors = validateCase(invalidCase);
    expect(errors).toContain("Field evidence[0].reading.supports: reference ID 'non-existent-theory' not found in theories");
  });

  test('accepts valid theory reference in evidence.reading.supports', () => {
    const validCase = createValidCase({
      theories: [
        { id: 't1', title: 'Theory 1', claim: 'Claim', standing: 'leading', standingReason: 'Reason' }
      ],
      evidence: [
        {
          id: 'e1',
          title: 'Evidence 1',
          detail: ['Detail'],
          sources: ['src1'],
          reading: { supports: ['t1'], weakens: [], note: 'Note' },
          status: 'record'
        }
      ]
    });
    const errors = validateCase(validCase);
    expect(errors).toEqual([]);
  });

  test('detects invalid theory reference in evidence.reading.weakens', () => {
    const invalidCase = createValidCase({
      evidence: [
        {
          id: 'e1',
          title: 'Evidence 1',
          detail: ['Detail'],
          sources: ['src1'],
          reading: { supports: [], weakens: ['invalid-theory'], note: 'Note' },
          status: 'record'
        }
      ]
    });
    const errors = validateCase(invalidCase);
    expect(errors).toContain("Field evidence[0].reading.weakens: reference ID 'invalid-theory' not found in theories");
  });

  test('accepts valid theory reference in evidence.reading.weakens', () => {
    const validCase = createValidCase({
      theories: [
        { id: 't1', title: 'Theory 1', claim: 'Claim', standing: 'leading', standingReason: 'Reason' }
      ],
      evidence: [
        {
          id: 'e1',
          title: 'Evidence 1',
          detail: ['Detail'],
          sources: ['src1'],
          reading: { supports: [], weakens: ['t1'], note: 'Note' },
          status: 'record'
        }
      ]
    });
    const errors = validateCase(validCase);
    expect(errors).toEqual([]);
  });

  test('detects invalid source reference in reference.sources', () => {
    const invalidCase = createValidCase({
      references: [
        {
          id: 'ref1',
          kind: 'person',
          label: 'Test Reference',
          profile: ['Profile'],
          sources: ['non-existent-source']
        }
      ]
    });
    const errors = validateCase(invalidCase);
    expect(errors).toContain("Field references[0].sources: reference ID 'non-existent-source' not found in sources");
  });

  test('accepts valid source reference in reference.sources', () => {
    const validCase = createValidCase({
      references: [
        {
          id: 'ref1',
          kind: 'person',
          label: 'Test Reference',
          profile: ['Profile'],
          sources: ['src1']
        }
      ]
    });
    const errors = validateCase(validCase);
    expect(errors).toEqual([]);
  });

  test('detects invalid reference ID in story markup', () => {
    const invalidCase = createValidCase({
      story: [
        {
          id: 's1',
          heading: 'Test Section',
          body: ['This mentions {{ref:invalid-ref|Invalid Reference}} in the text']
        }
      ]
    });
    const errors = validateCase(invalidCase);
    expect(errors).toContain("Field story[0].body[0]: reference ID 'invalid-ref' not found in references");
  });

  test('accepts valid reference ID in story markup', () => {
    const validCase = createValidCase({
      references: [
        {
          id: 'ref1',
          kind: 'person',
          label: 'John Doe',
          profile: ['Profile text']
        }
      ],
      story: [
        {
          id: 's1',
          heading: 'Test Section',
          body: ['This mentions {{ref:ref1|John Doe}} in the text']
        }
      ]
    });
    const errors = validateCase(validCase);
    expect(errors).toEqual([]);
  });

  test('detects empty label in story reference markup', () => {
    const invalidCase = createValidCase({
      references: [
        {
          id: 'ref1',
          kind: 'person',
          label: 'John Doe',
          profile: ['Profile text']
        }
      ],
      story: [
        {
          id: 's1',
          heading: 'Test Section',
          body: ['This mentions {{ref:ref1|}} in the text']
        }
      ]
    });
    const errors = validateCase(invalidCase);
    expect(errors).toContain("Field story[0].body[0]: Invalid reference markup - label cannot be empty");
  });

  test('detects whitespace-only label in story reference markup', () => {
    const invalidCase = createValidCase({
      references: [
        {
          id: 'ref1',
          kind: 'person',
          label: 'John Doe',
          profile: ['Profile text']
        }
      ],
      story: [
        {
          id: 's1',
          heading: 'Test Section',
          body: ['This mentions {{ref:ref1|   }} in the text']
        }
      ]
    });
    const errors = validateCase(invalidCase);
    expect(errors).toContain("Field story[0].body[0]: Invalid reference markup - label cannot be empty");
  });

  test('detects multiple invalid references in single paragraph', () => {
    const invalidCase = createValidCase({
      references: [
        {
          id: 'ref1',
          kind: 'person',
          label: 'John',
          profile: ['Profile']
        }
      ],
      story: [
        {
          id: 's1',
          heading: 'Test Section',
          body: ['Text with {{ref:ref1|John}} and {{ref:invalid1|Jane}} and {{ref:invalid2|Bob}}']
        }
      ]
    });
    const errors = validateCase(invalidCase);
    expect(errors).toContain("Field story[0].body[0]: reference ID 'invalid1' not found in references");
    expect(errors).toContain("Field story[0].body[0]: reference ID 'invalid2' not found in references");
  });

  test('detects invalid references across multiple story sections', () => {
    const invalidCase = createValidCase({
      references: [
        {
          id: 'ref1',
          kind: 'person',
          label: 'John',
          profile: ['Profile']
        }
      ],
      story: [
        {
          id: 's1',
          heading: 'Section 1',
          body: ['First section with {{ref:ref1|John}}']
        },
        {
          id: 's2',
          heading: 'Section 2',
          body: ['Second section with {{ref:invalid-ref|Invalid}}']
        }
      ],
      closeThreshold: 2
    });
    const errors = validateCase(invalidCase);
    expect(errors).toContain("Field story[1].body[0]: reference ID 'invalid-ref' not found in references");
  });

  test('accepts multiple valid references across story', () => {
    const validCase = createValidCase({
      references: [
        {
          id: 'ref1',
          kind: 'person',
          label: 'John Doe',
          profile: ['Profile']
        },
        {
          id: 'ref2',
          kind: 'place',
          label: 'Atlantic Ocean',
          profile: ['Profile']
        }
      ],
      story: [
        {
          id: 's1',
          heading: 'Section 1',
          body: ['Text with {{ref:ref1|John Doe}} traveling across {{ref:ref2|Atlantic Ocean}}']
        }
      ]
    });
    const errors = validateCase(validCase);
    expect(errors).toEqual([]);
  });

  test('collects all referential integrity errors together', () => {
    const invalidCase = createValidCase({
      evidence: [
        {
          id: 'e1',
          title: 'Evidence 1',
          detail: ['Detail'],
          sources: ['invalid-source'],
          reading: { supports: ['invalid-theory'], weakens: [], note: 'Note' },
          status: 'record'
        }
      ],
      references: [
        {
          id: 'ref1',
          kind: 'person',
          label: 'John',
          profile: ['Profile'],
          sources: ['another-invalid-source']
        }
      ],
      story: [
        {
          id: 's1',
          heading: 'Section',
          body: ['Text with {{ref:invalid-ref|Invalid}}']
        }
      ]
    });
    const errors = validateCase(invalidCase);
    expect(errors.length).toBeGreaterThanOrEqual(4);
    expect(errors).toContain("Field evidence[0].sources: reference ID 'invalid-source' not found in sources");
    expect(errors).toContain("Field evidence[0].reading.supports: reference ID 'invalid-theory' not found in theories");
    expect(errors).toContain("Field references[0].sources: reference ID 'another-invalid-source' not found in sources");
    expect(errors).toContain("Field story[0].body[0]: reference ID 'invalid-ref' not found in references");
  });
});

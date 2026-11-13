// src/lib/__tests__/validate-case.test.ts
import { describe, test, expect } from 'vitest';
import { validateCase } from '@/lib/validate-case';
import type { Case, Source, SourceKind } from '@/types/case';

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

describe('validateCase - Task 3.1 (Source Validation)', () => {
  test('detects empty source id', () => {
    const invalidCase = createValidCase({
      sources: [
        {
          id: '',
          title: 'Source 1',
          kind: 'testimony',
          url: 'http://example.com'
        }
      ]
    });
    const errors = validateCase(invalidCase);
    expect(errors).toContain('Field sources[0].id: Must be a non-empty string');
  });

  test('detects whitespace-only source id', () => {
    const invalidCase = createValidCase({
      sources: [
        {
          id: '   ',
          title: 'Source 1',
          kind: 'testimony',
          url: 'http://example.com'
        }
      ]
    });
    const errors = validateCase(invalidCase);
    expect(errors).toContain('Field sources[0].id: Must be a non-empty string');
  });

  test('detects empty source title', () => {
    const invalidCase = createValidCase({
      sources: [
        {
          id: 'src1',
          title: '',
          kind: 'testimony',
          url: 'http://example.com'
        }
      ]
    });
    const errors = validateCase(invalidCase);
    expect(errors).toContain('Field sources[0].title: Must be a non-empty string');
  });

  test('detects whitespace-only source title', () => {
    const invalidCase = createValidCase({
      sources: [
        {
          id: 'src1',
          title: '   ',
          kind: 'testimony',
          url: 'http://example.com'
        }
      ]
    });
    const errors = validateCase(invalidCase);
    expect(errors).toContain('Field sources[0].title: Must be a non-empty string');
  });

  test('detects invalid source kind', () => {
    const invalidCase = createValidCase({
      sources: [
        {
          id: 'src1',
          title: 'Source 1',
          kind: 'invalid-kind' as unknown as SourceKind,
          url: 'http://example.com'
        }
      ]
    });
    const errors = validateCase(invalidCase);
    expect(errors).toContain(
      'Field sources[0].kind: Must be one of: testimony, official, secondary, fiction'
    );
  });

  test('accepts valid source kinds', () => {
    const validSourceKinds = ['testimony', 'official', 'secondary', 'fiction'] as const;
    for (const kind of validSourceKinds) {
      const validCase = createValidCase({
        sources: [
          {
            id: 'src1',
            title: 'Source 1',
            kind: kind,
            url: 'http://example.com'
          }
        ]
      });
      const errors = validateCase(validCase);
      expect(errors).toEqual([]);
    }
  });

  test('detects source with neither url nor citation', () => {
    const invalidCase = createValidCase({
      sources: [
        {
          id: 'src1',
          title: 'Source 1',
          kind: 'testimony'
        } as unknown as Source
      ]
    });
    const errors = validateCase(invalidCase);
    expect(errors).toContain(
      'Field sources[0]: Must have either url or citation (or both)'
    );
  });

  test('detects source with empty url and no citation', () => {
    const invalidCase = createValidCase({
      sources: [
        {
          id: 'src1',
          title: 'Source 1',
          kind: 'testimony',
          url: ''
        }
      ]
    });
    const errors = validateCase(invalidCase);
    expect(errors).toContain(
      'Field sources[0]: Must have either url or citation (or both)'
    );
  });

  test('detects source with whitespace-only url and no citation', () => {
    const invalidCase = createValidCase({
      sources: [
        {
          id: 'src1',
          title: 'Source 1',
          kind: 'testimony',
          url: '   '
        }
      ]
    });
    const errors = validateCase(invalidCase);
    expect(errors).toContain(
      'Field sources[0]: Must have either url or citation (or both)'
    );
  });

  test('accepts source with url only', () => {
    const validCase = createValidCase({
      sources: [
        {
          id: 'src1',
          title: 'Source 1',
          kind: 'testimony',
          url: 'http://example.com'
        }
      ]
    });
    const errors = validateCase(validCase);
    expect(errors).toEqual([]);
  });

  test('accepts source with citation only', () => {
    const validCase = createValidCase({
      sources: [
        {
          id: 'src1',
          title: 'Source 1',
          kind: 'testimony',
          citation: 'Some citation text'
        }
      ]
    });
    const errors = validateCase(validCase);
    expect(errors).toEqual([]);
  });

  test('accepts source with both url and citation', () => {
    const validCase = createValidCase({
      sources: [
        {
          id: 'src1',
          title: 'Source 1',
          kind: 'testimony',
          url: 'http://example.com',
          citation: 'Some citation text'
        }
      ]
    });
    const errors = validateCase(validCase);
    expect(errors).toEqual([]);
  });

  test('collects multiple source validation errors', () => {
    const invalidCase = createValidCase({
      sources: [
        {
          id: '',
          title: '',
          kind: 'invalid-kind' as unknown as SourceKind,
          url: ''
        }
      ]
    });
    const errors = validateCase(invalidCase);
    expect(errors).toContain('Field sources[0].id: Must be a non-empty string');
    expect(errors).toContain('Field sources[0].title: Must be a non-empty string');
    expect(errors).toContain(
      'Field sources[0].kind: Must be one of: testimony, official, secondary, fiction'
    );
    expect(errors).toContain(
      'Field sources[0]: Must have either url or citation (or both)'
    );
  });

  test('validates multiple sources independently', () => {
    const invalidCase = createValidCase({
      sources: [
        {
          id: 'src1',
          title: 'Source 1',
          kind: 'testimony',
          url: 'http://example.com'
        },
        {
          id: '',
          title: '',
          kind: 'invalid' as unknown as SourceKind,
          url: ''
        },
        {
          id: 'src3',
          title: 'Source 3',
          kind: 'secondary',
          citation: 'Citation'
        }
      ]
    });
    const errors = validateCase(invalidCase);
    expect(errors).toContain('Field sources[1].id: Must be a non-empty string');
    expect(errors).toContain('Field sources[1].title: Must be a non-empty string');
    expect(errors).toContain(
      'Field sources[1].kind: Must be one of: testimony, official, secondary, fiction'
    );
    expect(errors).toContain(
      'Field sources[1]: Must have either url or citation (or both)'
    );
    // First and third sources should be valid, so no errors for them
    expect(errors).not.toContain('Field sources[0]');
    expect(errors).not.toContain('Field sources[2]');
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

// ===== story-engine 2.2: portal markup checks (Requirements 4.2 to 4.5, 4.11 to 4.13, 6.4 to 6.7) =====

/**
 * A valid case with two story sections, three evidence files (index 2 disputed) and three
 * references (ids 'a', 'c', 'briggs'), so every Markup_Field kind exists at a non-zero index.
 */
function createMarkupCase(): Case {
  return createValidCase({
    story: [
      { id: 's1', heading: 'Section 1', body: ['First paragraph', 'Second paragraph'], hook: 'First hook' },
      { id: 's2', heading: 'Section 2', body: ['Third paragraph', 'Fourth paragraph'], hook: 'Second hook' }
    ],
    evidence: [
      {
        id: 'e1',
        title: 'Evidence 1',
        detail: ['Detail one', 'Detail two'],
        sources: ['src1'],
        reading: { supports: [], weakens: [], note: 'Note' },
        status: 'record'
      },
      {
        id: 'e2',
        title: 'Evidence 2',
        detail: ['Detail one', 'Detail two'],
        sources: ['src1'],
        reading: { supports: [], weakens: [], note: 'Note' },
        status: 'legend',
        origin: 'A later story'
      },
      {
        id: 'e3',
        title: 'Evidence 3',
        detail: ['Detail one', 'Detail two'],
        sources: ['src1'],
        reading: { supports: [], weakens: [], note: 'Note' },
        status: 'disputed',
        dispute: { claim: 'One side', challenge: 'Other side' }
      }
    ],
    references: [
      { id: 'a', kind: 'person', label: 'A', profile: ['Profile one', 'Profile two'] },
      { id: 'c', kind: 'place', label: 'C', profile: ['Profile one', 'Profile two'] },
      { id: 'briggs', kind: 'person', label: 'Briggs', profile: ['Profile one', 'Profile two'] }
    ]
  });
}

type FieldSetter = (c: Case, text: string) => void;

/** One Markup_Field of each kind, at non-zero indexes. */
const markupLocations: Array<[string, FieldSetter]> = [
  ['story[1].body[1]', (c, t) => { c.story[1].body[1] = t; }],
  ['story[1].hook', (c, t) => { c.story[1].hook = t; }],
  ['evidence[2].detail[1]', (c, t) => { c.evidence[2].detail[1] = t; }],
  ['references[1].profile[1]', (c, t) => { c.references[1].profile[1] = t; }]
];

function caseWithField(set: FieldSetter, text: string): Case {
  const c = createMarkupCase();
  set(c, text);
  return c;
}

/** First n code points of s. */
function codePoints(s: string, n: number): string {
  return Array.from(s).slice(0, n).join('');
}

describe('validateCase - story-engine markup fixture', () => {
  test('the markup fixture case is valid on its own', () => {
    expect(validateCase(createMarkupCase())).toEqual([]);
  });

  test('known refs in every Markup_Field kind give no errors', () => {
    const c = createMarkupCase();
    for (const [, set] of markupLocations) set(c, 'See {{ref:a|A}} and {{ref:c|C}}.');
    expect(validateCase(c)).toEqual([]);
  });
});

describe('validateCase - Field_Location for each Markup_Field kind (6.4)', () => {
  test.each(markupLocations)('unknown id in %s is reported at that location', (location, set) => {
    const errors = validateCase(caseWithField(set, 'Text {{ref:ghost|Ghost}} here.'));
    expect(errors).toEqual([`Field ${location}: reference ID 'ghost' not found in references`]);
  });

  test.each(markupLocations)('two unknown ids in %s give one error each', (location, set) => {
    const errors = validateCase(caseWithField(set, '{{ref:ghost|G}} and {{ref:ghost|G}}'));
    expect(errors).toEqual([
      `Field ${location}: reference ID 'ghost' not found in references`,
      `Field ${location}: reference ID 'ghost' not found in references`
    ]);
  });

  test.each(markupLocations)('empty label in %s is reported at that location', (location, set) => {
    const errors = validateCase(caseWithField(set, 'Text {{ref:a|}} here.'));
    expect(errors).toEqual([`Field ${location}: Invalid reference markup - label cannot be empty`]);
  });

  test.each(markupLocations)('whitespace-only label in %s is reported at that location', (location, set) => {
    const errors = validateCase(caseWithField(set, 'Text {{ref:a|  }} here.'));
    expect(errors).toEqual([`Field ${location}: Invalid reference markup - label cannot be empty`]);
  });

  test.each(markupLocations)('unclosed markup in %s is reported at that location', (location, set) => {
    const errors = validateCase(caseWithField(set, 'Text {{ref:a|b'));
    expect(errors).toEqual([`Field ${location}: Invalid reference markup near '{{ref:a|b'`]);
  });

  test.each(markupLocations)('wrong prefix in %s is reported at that location', (location, set) => {
    const errors = validateCase(caseWithField(set, 'Text {{REF:a|b}} here.'));
    expect(errors).toEqual([`Field ${location}: Invalid reference markup near '{{REF:a|b}} here.'`]);
  });
});

describe('validateCase - malformed markup excerpt (4.4)', () => {
  const [location, set] = markupLocations[0];

  test('a long tail is cut to 40 code points', () => {
    const malformed = '{{foo:' + 'y'.repeat(60);
    const errors = validateCase(caseWithField(set, 'Intro ' + malformed));
    expect(errors).toEqual([`Field ${location}: Invalid reference markup near '${malformed.slice(0, 40)}'`]);
  });

  test('an emoji that is the 40th code point is kept whole', () => {
    // '{{foo:' (6) + 33 'y' = 39 code points, then the emoji is the 40th.
    const malformed = '{{foo:' + 'y'.repeat(33) + '😀' + 'tail';
    const errors = validateCase(caseWithField(set, malformed));
    const expected = '{{foo:' + 'y'.repeat(33) + '😀';
    expect(Array.from(expected)).toHaveLength(40);
    expect(errors).toEqual([`Field ${location}: Invalid reference markup near '${expected}'`]);
  });

  test('an emoji that is the 41st code point is dropped, never split', () => {
    const malformed = '{{foo:' + 'y'.repeat(34) + '😀' + 'tail';
    const errors = validateCase(caseWithField(set, malformed));
    expect(errors).toEqual([`Field ${location}: Invalid reference markup near '${'{{foo:' + 'y'.repeat(34)}'`]);
    expect(errors[0]).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/);
  });
});

describe('validateCase - portal markup in Plain_Fields (4.11, 6.5)', () => {
  const plainCases: Array<[string, FieldSetter]> = [
    ['title', (c, t) => { c.title = t; }],
    ['theories[0].claim', (c, t) => { c.theories[0].claim = t; }],
    ['story[1].heading', (c, t) => { c.story[1].heading = t; }],
    [
      'evidence[2].dispute.claim',
      (c, t) => {
        const ev = c.evidence[2];
        if (ev.status !== 'disputed') throw new Error('fixture: evidence[2] must be disputed');
        ev.dispute.claim = t;
      }
    ]
  ];

  test.each(plainCases)('{{ in %s is reported at that path', (path, set) => {
    const errors = validateCase(caseWithField(set, 'Some {{ref:a|A}} text'));
    expect(errors).toEqual([`Field ${path}: portal markup is not allowed in this field`]);
  });

  test.each(plainCases)('several {{ in %s give one error for that path', (path, set) => {
    const errors = validateCase(caseWithField(set, '{{ one {{ two {{{ three'));
    expect(errors).toEqual([`Field ${path}: portal markup is not allowed in this field`]);
  });
});

describe('validateCase - reference id format (4.12, 6.6)', () => {
  function caseWithReferenceId(id: string): Case {
    const c = createMarkupCase();
    c.references.push({ id, kind: 'term', label: 'Extra', profile: ['Profile'] });
    return c;
  }

  test.each(['Briggs', 'dei gratia', 'dei_gratia', ''])("id '%s' is not a valid reference ID", (id) => {
    expect(validateCase(caseWithReferenceId(id))).toEqual([
      `Field references[3].id: '${id}' is not a valid reference ID`
    ]);
  });

  test.each(['dei-gratia', 'e-lifeboat', 'ref1'])("id '%s' gives no error", (id) => {
    expect(validateCase(caseWithReferenceId(id))).toEqual([]);
  });

  test("id 'a{{b' gives both the invalid-id and the markup-not-allowed error", () => {
    expect(validateCase(caseWithReferenceId('a{{b'))).toEqual([
      "Field references[3].id: 'a{{b' is not a valid reference ID",
      'Field references[3].id: portal markup is not allowed in this field'
    ]);
  });
});

describe('validateCase - stray braces (4.13, 6.7)', () => {
  const [L, set] = markupLocations[0];

  test('{{{ref:a|b}} gives one stray-brace error', () => {
    expect(validateCase(caseWithField(set, '{{{ref:a|b}}'))).toEqual([
      `Field ${L}: Stray brace near '{{{ref:a|b}}'`
    ]);
  });

  test('{{ref:a|b}}} gives one stray-brace error', () => {
    expect(validateCase(caseWithField(set, '{{ref:a|b}}}'))).toEqual([
      `Field ${L}: Stray brace near '}'`
    ]);
  });

  test('nested {{ref:a|b {{ref:c|d}}}} gives one malformed error and one stray-brace error for the leftover }}', () => {
    expect(validateCase(caseWithField(set, '{{ref:a|b {{ref:c|d}}}}'))).toEqual([
      `Field ${L}: Invalid reference markup near '{{ref:a|b {{ref:c|d}}}}'`,
      `Field ${L}: Stray brace near '}}'`
    ]);
  });

  test('{{{x gives two overlapping malformed errors and no stray-brace error', () => {
    expect(validateCase(caseWithField(set, '{{{x'))).toEqual([
      `Field ${L}: Invalid reference markup near '{{{x'`,
      `Field ${L}: Invalid reference markup near '{{x'`
    ]);
  });

  test('a lone } in prose gives one stray-brace error', () => {
    expect(validateCase(caseWithField(set, 'The bell rang } twice.'))).toEqual([
      `Field ${L}: Stray brace near '} twice.'`
    ]);
  });

  test('a lone { and a later } in one text segment give exactly one stray-brace error', () => {
    expect(validateCase(caseWithField(set, 'Open { then close } here'))).toEqual([
      `Field ${L}: Stray brace near '{ then close } here'`
    ]);
  });

  test('the stray-brace excerpt is cut to 40 code points', () => {
    const tail = '} ' + '😀'.repeat(10) + 'z'.repeat(50);
    const errors = validateCase(caseWithField(set, 'Prose ' + tail));
    const expected = codePoints(tail, 40);
    expect(Array.from(expected)).toHaveLength(40);
    expect(errors).toEqual([`Field ${L}: Stray brace near '${expected}'`]);
  });

  test('{{ref:a|}} x } gives only the empty-label error and no stray-brace error', () => {
    expect(validateCase(caseWithField(set, '{{ref:a|}} x }'))).toEqual([
      `Field ${L}: Invalid reference markup - label cannot be empty`
    ]);
  });
});

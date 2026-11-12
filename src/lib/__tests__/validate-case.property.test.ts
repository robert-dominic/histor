// src/lib/__tests__/validate-case.property.test.ts
import { describe, test } from 'vitest';
import * as fc from 'fast-check';
import { validateCase } from '../validate-case';
import type {
  Case,
  Theory,
  Evidence,
  Source,
  StorySection,
  LegendIntro,
  CaseTheme,
  SourceKind,
} from '../../types/case';

// ===== Custom Arbitraries =====

/**
 * Generate a non-empty string (avoid pure whitespace)
 */
function nonEmptyString(): fc.Arbitrary<string> {
  return fc
    .string({ minLength: 1 })
    .filter(s => s.trim().length > 0);
}

/**
 * Generate a positive integer (year >= 1)
 */
function positiveInteger(): fc.Arbitrary<number> {
  return fc.integer({ min: 1, max: 2100 });
}

/**
 * Generate a valid source kind
 */
function sourceKindArbitrary(): fc.Arbitrary<SourceKind> {
  return fc.oneof(
    fc.constant('testimony'),
    fc.constant('official'),
    fc.constant('secondary'),
    fc.constant('fiction')
  );
}

/**
 * Generate a valid Source with at least url or citation
 * Each source gets a unique ID
 */
function sourceArbitrary(index: number = 0): fc.Arbitrary<Source> {
  return fc.tuple(
    nonEmptyString(),
    nonEmptyString(),
    sourceKindArbitrary(),
    fc.option(nonEmptyString(), { freq: 2, nil: undefined }),
    fc.option(positiveInteger(), { freq: 1, nil: undefined }),
    fc.boolean()
  ).map(([id, title, kind, author, year, hasUrl]) => {
    const base: any = { id: `source-${index}-${id}`, title, kind, author, year };
    
    if (hasUrl) {
      base.url = 'https://example.com/' + id;
      if (fc.sample(fc.boolean(), 1)[0]) {
        base.citation = 'A citation';
      }
    } else {
      base.citation = 'A citation';
    }
    
    return base as Source;
  });
}

/**
 * Generate a valid Theory
 * Each theory gets a unique ID
 */
function theoryArbitrary(index: number = 0): fc.Arbitrary<Theory> {
  return fc.tuple(
    nonEmptyString(),
    nonEmptyString(),
    nonEmptyString(),
    fc.oneof(
      fc.constant('leading'),
      fc.constant('considered'),
      fc.constant('rejected')
    ),
    nonEmptyString()
  ).map(([id, title, claim, standing, standingReason]) => ({
    id: `theory-${index}-${id}`,
    title,
    claim,
    standing: standing as 'leading' | 'considered' | 'rejected',
    standingReason
  }));
}

/**
 * Generate a valid Evidence item
 * Each evidence gets a unique ID
 */
function evidenceArbitrary(
  availableSourceIds: string[],
  availableTheoryIds: string[],
  index: number = 0
): fc.Arbitrary<Evidence> {
  return fc
    .tuple(
      nonEmptyString(),
      nonEmptyString(),
      fc.array(nonEmptyString(), { minLength: 1 }),
      fc.subarray(availableSourceIds, { minLength: 1 }),
      fc.subarray(availableTheoryIds),
      fc.subarray(availableTheoryIds),
      nonEmptyString(),
      fc.oneof(
        fc.constant('record'),
        fc.constant('disputed'),
        fc.constant('legend')
      )
    )
    .map(
      ([id, title, detail, sources, supports, weakens, note, status]) => {
        const baseEvidence: any = {
          id: `evidence-${index}-${id}`,
          title,
          detail,
          sources: sources.length > 0 ? sources : [availableSourceIds[0]],
          reading: {
            supports,
            weakens,
            note
          }
        };

        if (status === 'disputed') {
          baseEvidence.status = 'disputed';
          baseEvidence.dispute = {
            claim: 'A claim',
            challenge: 'A challenge'
          };
        } else if (status === 'legend') {
          baseEvidence.status = 'legend';
          baseEvidence.origin = 'A legend origin';
        } else {
          baseEvidence.status = 'record';
        }

        return baseEvidence as Evidence;
      }
    );
}

/**
 * Generate a valid StorySection
 * Each section gets a unique ID
 */
function storySectionArbitrary(index: number = 0): fc.Arbitrary<StorySection> {
  return fc.tuple(
    nonEmptyString(),
    fc.option(nonEmptyString(), { freq: 1, nil: undefined }),
    nonEmptyString(),
    fc.array(nonEmptyString(), { minLength: 1 }),
    fc.option(nonEmptyString(), { freq: 1, nil: undefined })
  ).map(([id, kicker, heading, body, hook]) => ({
    id: `section-${index}-${id}`,
    kicker,
    heading,
    body,
    hook
  }));
}

/**
 * Generate a valid LegendIntro
 */
function legendIntroArbitrary(): fc.Arbitrary<LegendIntro> {
  return fc.tuple(
    fc.array(nonEmptyString(), { minLength: 1 }),
    nonEmptyString(),
    nonEmptyString()
  ).map(([lines, stamp, debunk]) => ({
    lines,
    stamp,
    debunk
  }));
}

/**
 * Generate a valid CaseTheme
 */
function caseThemeArbitrary(): fc.Arbitrary<CaseTheme> {
  return nonEmptyString().map(id => ({
    id
  }));
}

/**
 * Generate a completely valid Case with no violations
 */
function validCaseArbitrary(): fc.Arbitrary<Case> {
  return fc
    .tuple(
      nonEmptyString(),
      nonEmptyString(),
      positiveInteger(),
      nonEmptyString(),
      nonEmptyString(),
      fc.array(
        fc.integer({ min: 0, max: 100 }).chain(i => theoryArbitrary(i)),
        { minLength: 1, maxLength: 10 }
      ),
      fc.array(
        fc.integer({ min: 0, max: 100 }).chain(i => sourceArbitrary(i)),
        { minLength: 1, maxLength: 10 }
      ),
      fc.array(
        fc.integer({ min: 0, max: 100 }).chain(i => storySectionArbitrary(i)),
        { minLength: 1, maxLength: 10 }
      ),
      legendIntroArbitrary(),
      caseThemeArbitrary()
    )
    .chain(
      ([
        id,
        title,
        year,
        teaser,
        centralQuestion,
        theories,
        sources,
        story,
        legendIntro,
        theme
      ]) => {
        const sourceIds = sources.map(s => s.id);
        const theoryIds = theories.map(t => t.id);

        return fc
          .tuple(
            fc.array(
              fc.integer({ min: 0, max: 100 }).chain(i => evidenceArbitrary(sourceIds, theoryIds, i)),
              { minLength: 1, maxLength: 10 }
            ),
            fc.array(nonEmptyString(), { minLength: 1, maxLength: 10 })
          )
          .map(([evidence, historiansSummary]) => {
            const validCloseThreshold = fc.sample(
              fc.integer({ min: 0, max: evidence.length }),
              1
            )[0];

            return {
              id: 'case-' + id,
              title,
              year,
              teaser,
              centralQuestion,
              theories,
              evidence,
              sources,
              story,
              legendIntro,
              theme,
              references: [],
              historiansSummary,
              closeThreshold: validCloseThreshold,
              fork: {
                prompt: 'Continue investigating?',
                investigateLabel: 'Investigate',
                leaveLabel: 'Leave'
              }
            } as Case;
          });
      }
    );
}

// ===== Tests =====

describe('validateCase - Property Tests', () => {
  test('Property 8: Validator Accepts Valid Cases', () => {
    // Feature: histor-data-foundation, Property 8: Validator Accepts Valid Cases
    fc.assert(
      fc.property(validCaseArbitrary(), (validCase) => {
        const errors = validateCase(validCase);
        return errors.length === 0;
      }),
      { numRuns: 100 }
    );
  });

  test('Property 9: Validator Detects Duplicate Theory IDs', () => {
    // Feature: histor-data-foundation, Property 9: Validator Detects Duplicate Theory IDs
    fc.assert(
      fc.property(
        validCaseArbitrary(),
        (validCase) => {
          // Only test if we have at least 1 theory
          if (validCase.theories.length < 1) {
            return true;
          }
          
          // Create case with duplicate theory ID
          const duplicateId = validCase.theories[0].id;
          const duplicateTheory = {
            ...validCase.theories[validCase.theories.length - 1],
            id: duplicateId
          };
          
          const caseWithDuplicate = {
            ...validCase,
            theories: [...validCase.theories, duplicateTheory]
          };
          
          const errors = validateCase(caseWithDuplicate);
          return errors.some(
            (err) =>
              err.includes('theories') && err.includes('duplicate ID')
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 10: Validator Detects Duplicate Evidence IDs', () => {
    // Feature: histor-data-foundation, Property 10: Validator Detects Duplicate Evidence IDs
    fc.assert(
      fc.property(
        validCaseArbitrary(),
        (validCase) => {
          // Only test if we have at least 1 evidence item
          if (validCase.evidence.length < 1) {
            return true;
          }
          
          // Create case with duplicate evidence ID
          const duplicateId = validCase.evidence[0].id;
          const duplicateEvidence = {
            ...validCase.evidence[validCase.evidence.length - 1],
            id: duplicateId
          };
          
          const caseWithDuplicate = {
            ...validCase,
            evidence: [...validCase.evidence, duplicateEvidence]
          };
          
          const errors = validateCase(caseWithDuplicate);
          return errors.some(
            (err) =>
              err.includes('evidence') && err.includes('duplicate ID')
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 11: Validator Detects Duplicate Source IDs', () => {
    // Feature: histor-data-foundation, Property 11: Validator Detects Duplicate Source IDs
    fc.assert(
      fc.property(
        validCaseArbitrary(),
        (validCase) => {
          // Only test if we have at least 1 source
          if (validCase.sources.length < 1) {
            return true;
          }
          
          // Create case with duplicate source ID
          const duplicateId = validCase.sources[0].id;
          const duplicateSource = {
            ...validCase.sources[validCase.sources.length - 1],
            id: duplicateId
          };
          
          const caseWithDuplicate = {
            ...validCase,
            sources: [...validCase.sources, duplicateSource]
          };
          
          const errors = validateCase(caseWithDuplicate);
          return errors.some(
            (err) =>
              err.includes('sources') && err.includes('duplicate ID')
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 12: Validator Detects Duplicate Reference IDs', () => {
    // Feature: histor-data-foundation, Property 12: Validator Detects Duplicate Reference IDs
    fc.assert(
      fc.property(
        validCaseArbitrary(),
        (validCase) => {
          // Start with at least 2 references for testing
          const references = [
            {
              id: 'ref-1',
              kind: 'person' as const,
              label: 'Test Person',
              profile: ['Profile']
            },
            {
              id: 'ref-2',
              kind: 'place' as const,
              label: 'Test Place',
              profile: ['Profile']
            }
          ];
          
          // Create case with duplicate reference ID
          const duplicateId = references[0].id;
          const duplicateReference = {
            ...references[1],
            id: duplicateId
          };
          
          const caseWithDuplicate = {
            ...validCase,
            references: [...references, duplicateReference]
          };
          
          const errors = validateCase(caseWithDuplicate);
          return errors.some(
            (err) =>
              err.includes('references') && err.includes('duplicate ID')
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

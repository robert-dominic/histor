// src/lib/__tests__/validate-case.property.test.ts
import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateCase } from '../validate-case';
import type {
  Case,
  Theory,
  Evidence,
  Source,
  StorySection,
  Reference,
  LegendIntro,
  CaseTheme,
  SourceKind,
  EvidenceStatus
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
 */
function sourceArbitrary(): fc.Arbitrary<Source> {
  return fc.tuple(
    nonEmptyString(),
    nonEmptyString(),
    sourceKindArbitrary(),
    fc.option(nonEmptyString(), { freq: 2, nil: undefined }),
    fc.option(positiveInteger(), { freq: 1, nil: undefined }),
    fc.boolean()
  ).map(([id, title, kind, author, year, hasUrl]) => {
    const base: any = { id, title, kind, author, year };
    
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
 */
function theoryArbitrary(): fc.Arbitrary<Theory> {
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
    id: 't-' + id,
    title,
    claim,
    standing: standing as 'leading' | 'considered' | 'rejected',
    standingReason
  }));
}

/**
 * Generate a valid Evidence item
 */
function evidenceArbitrary(
  availableSourceIds: string[],
  availableTheoryIds: string[]
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
          id: 'e-' + id,
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
 */
function storySectionArbitrary(): fc.Arbitrary<StorySection> {
  return fc.tuple(
    nonEmptyString(),
    fc.option(nonEmptyString(), { freq: 1, nil: undefined }),
    nonEmptyString(),
    fc.array(nonEmptyString(), { minLength: 1 }),
    fc.option(nonEmptyString(), { freq: 1, nil: undefined })
  ).map(([id, kicker, heading, body, hook]) => ({
    id,
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
      fc.array(theoryArbitrary(), { minLength: 1 }),
      fc.array(sourceArbitrary(), { minLength: 1 }),
      fc.array(storySectionArbitrary(), { minLength: 1 }),
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
            fc.array(evidenceArbitrary(sourceIds, theoryIds), { minLength: 1 }),
            fc.array(nonEmptyString(), { minLength: 1 })
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
});

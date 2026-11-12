// src/lib/validate-case.ts
import type { Case } from '../types/case';

/**
 * Validates a Case object against all structural and referential integrity constraints.
 * Returns an array of error strings describing validation failures.
 * Returns an empty array if the case is valid.
 *
 * @param caseData The Case object to validate
 * @returns Array of error strings, empty if valid
 */
export function validateCase(caseData: Case): string[] {
  const errors: string[] = [];

  // Validate required string fields are non-empty
  if (!caseData.id || caseData.id.trim() === '') {
    errors.push('Field id: Must be a non-empty string');
  }

  if (!caseData.title || caseData.title.trim() === '') {
    errors.push('Field title: Must be a non-empty string');
  }

  if (!caseData.teaser || caseData.teaser.trim() === '') {
    errors.push('Field teaser: Must be a non-empty string');
  }

  if (!caseData.centralQuestion || caseData.centralQuestion.trim() === '') {
    errors.push('Field centralQuestion: Must be a non-empty string');
  }

  // Validate year is a positive integer
  if (!Number.isInteger(caseData.year) || caseData.year <= 0) {
    errors.push('Field year: Must be a positive integer');
  }

  // Validate non-empty arrays
  if (!Array.isArray(caseData.theories) || caseData.theories.length === 0) {
    errors.push('Field theories: Must contain at least one theory');
  }

  if (!Array.isArray(caseData.evidence) || caseData.evidence.length === 0) {
    errors.push('Field evidence: Must contain at least one evidence item');
  }

  if (!Array.isArray(caseData.sources) || caseData.sources.length === 0) {
    errors.push('Field sources: Must contain at least one source');
  }

  if (!Array.isArray(caseData.story) || caseData.story.length === 0) {
    errors.push('Field story: Must contain at least one section');
  }

  if (!Array.isArray(caseData.legendIntro?.lines) || caseData.legendIntro.lines.length === 0) {
    errors.push('Field legendIntro.lines: Must contain at least one line');
  }

  if (!Array.isArray(caseData.historiansSummary) || caseData.historiansSummary.length === 0) {
    errors.push('Field historiansSummary: Must contain at least one paragraph');
  }

  // Validate closeThreshold
  const evidenceLength = Array.isArray(caseData.evidence) ? caseData.evidence.length : 0;
  if (
    !Number.isInteger(caseData.closeThreshold) ||
    caseData.closeThreshold < 0 ||
    caseData.closeThreshold > evidenceLength
  ) {
    errors.push(
      `Field closeThreshold: Must be a non-negative integer not exceeding evidence array length (${evidenceLength})`
    );
  }

  // Validate theory ID uniqueness
  if (Array.isArray(caseData.theories)) {
    const theoryIds = new Set<string>();
    for (const theory of caseData.theories) {
      if (theoryIds.has(theory.id)) {
        errors.push(`Field theories: duplicate ID '${theory.id}' found`);
      }
      theoryIds.add(theory.id);
    }
  }

  // Validate evidence ID uniqueness
  if (Array.isArray(caseData.evidence)) {
    const evidenceIds = new Set<string>();
    for (const evidence of caseData.evidence) {
      if (evidenceIds.has(evidence.id)) {
        errors.push(`Field evidence: duplicate ID '${evidence.id}' found`);
      }
      evidenceIds.add(evidence.id);
    }
  }

  // Validate source ID uniqueness and source-level constraints
  if (Array.isArray(caseData.sources)) {
    const sourceIds = new Set<string>();
    const validSourceKinds: string[] = ['testimony', 'official', 'secondary', 'fiction'];

    for (let i = 0; i < caseData.sources.length; i++) {
      const source = caseData.sources[i];

      // Check for duplicate IDs
      if (sourceIds.has(source.id)) {
        errors.push(`Field sources: duplicate ID '${source.id}' found`);
      }
      sourceIds.add(source.id);

      // Validate source id is non-empty string (Task 3.1, Requirement 8.3)
      if (!source.id || source.id.trim() === '') {
        errors.push(`Field sources[${i}].id: Must be a non-empty string`);
      }

      // Validate source title is non-empty string (Task 3.1, Requirement 8.4)
      if (!source.title || source.title.trim() === '') {
        errors.push(`Field sources[${i}].title: Must be a non-empty string`);
      }

      // Validate SourceKind is one of the valid kinds (Task 3.1, Requirement 8.2)
      if (!validSourceKinds.includes(source.kind)) {
        errors.push(
          `Field sources[${i}].kind: Must be one of: testimony, official, secondary, fiction`
        );
      }

      // Validate source has url, citation, or both (Task 3.1, Requirement 8.1)
      const hasUrl = source.url && source.url.trim() !== '';
      const hasCitation = source.citation && source.citation.trim() !== '';
      if (!hasUrl && !hasCitation) {
        errors.push(
          `Field sources[${i}]: Must have either url or citation (or both)`
        );
      }
    }
  }

  // Validate reference ID uniqueness
  if (Array.isArray(caseData.references)) {
    const referenceIds = new Set<string>();
    for (const reference of caseData.references) {
      if (referenceIds.has(reference.id)) {
        errors.push(`Field references: duplicate ID '${reference.id}' found`);
      }
      referenceIds.add(reference.id);
    }
  }

  // ===== Referential Integrity Checks =====

  // Build sets of valid IDs for reference validation
  const validSourceIds = new Set<string>();
  if (Array.isArray(caseData.sources)) {
    for (const source of caseData.sources) {
      validSourceIds.add(source.id);
    }
  }

  const validTheoryIds = new Set<string>();
  if (Array.isArray(caseData.theories)) {
    for (const theory of caseData.theories) {
      validTheoryIds.add(theory.id);
    }
  }

  const validReferenceIds = new Set<string>();
  if (Array.isArray(caseData.references)) {
    for (const reference of caseData.references) {
      validReferenceIds.add(reference.id);
    }
  }

  // Validate Evidence.sources references (7.18)
  if (Array.isArray(caseData.evidence)) {
    for (let i = 0; i < caseData.evidence.length; i++) {
      const evidence = caseData.evidence[i];
      if (Array.isArray(evidence.sources)) {
        for (const sourceId of evidence.sources) {
          if (!validSourceIds.has(sourceId)) {
            errors.push(`Field evidence[${i}].sources: reference ID '${sourceId}' not found in sources`);
          }
        }
      }
    }
  }

  // Validate Evidence.reading.supports and reading.weakens references (7.20, 7.21)
  if (Array.isArray(caseData.evidence)) {
    for (let i = 0; i < caseData.evidence.length; i++) {
      const evidence = caseData.evidence[i];
      const reading = evidence.reading;

      if (Array.isArray(reading.supports)) {
        for (const theoryId of reading.supports) {
          if (!validTheoryIds.has(theoryId)) {
            errors.push(`Field evidence[${i}].reading.supports: reference ID '${theoryId}' not found in theories`);
          }
        }
      }

      if (Array.isArray(reading.weakens)) {
        for (const theoryId of reading.weakens) {
          if (!validTheoryIds.has(theoryId)) {
            errors.push(`Field evidence[${i}].reading.weakens: reference ID '${theoryId}' not found in theories`);
          }
        }
      }
    }
  }

  // Validate Reference.sources references (7.19)
  if (Array.isArray(caseData.references)) {
    for (let i = 0; i < caseData.references.length; i++) {
      const reference = caseData.references[i];
      if (Array.isArray(reference.sources)) {
        for (const sourceId of reference.sources) {
          if (!validSourceIds.has(sourceId)) {
            errors.push(`Field references[${i}].sources: reference ID '${sourceId}' not found in sources`);
          }
        }
      }
    }
  }

  // Validate story reference markup {{ref:id|label}} (7.22, 7.23)
  const referenceMarkupRegex = /\{\{ref:(\S+)\|([^}]*)\}\}/g;
  if (Array.isArray(caseData.story)) {
    for (let sectionIndex = 0; sectionIndex < caseData.story.length; sectionIndex++) {
      const section = caseData.story[sectionIndex];
      if (Array.isArray(section.body)) {
        for (let paragraphIndex = 0; paragraphIndex < section.body.length; paragraphIndex++) {
          const paragraph = section.body[paragraphIndex];
          let match;
          while ((match = referenceMarkupRegex.exec(paragraph)) !== null) {
            const refId = match[1];
            const label = match[2];

            // Verify format: id should not contain whitespace (already verified by \S+)
            // Verify label is non-empty (could be whitespace)
            if (!label || label.trim() === '') {
              errors.push(
                `Field story[${sectionIndex}].body[${paragraphIndex}]: Invalid reference markup - label cannot be empty`
              );
            }

            // Verify reference ID exists
            if (!validReferenceIds.has(refId)) {
              errors.push(
                `Field story[${sectionIndex}].body[${paragraphIndex}]: reference ID '${refId}' not found in references`
              );
            }
          }
        }
      }
    }
  }

  return errors;
}

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

  // Validate source ID uniqueness
  if (Array.isArray(caseData.sources)) {
    const sourceIds = new Set<string>();
    for (const source of caseData.sources) {
      if (sourceIds.has(source.id)) {
        errors.push(`Field sources: duplicate ID '${source.id}' found`);
      }
      sourceIds.add(source.id);
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

  return errors;
}

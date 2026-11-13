// src/lib/validate-case.ts
import type { Case } from '@/types/case';
import { isRefId, parseRefs } from '@/lib/parse-refs';

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

  // Validate Evidence-specific constraints (7.18, 10.4)
  if (Array.isArray(caseData.evidence)) {
    for (let i = 0; i < caseData.evidence.length; i++) {
      const evidence = caseData.evidence[i];

      // Check that Evidence.sources is non-empty (NonEmptyArray constraint - 7.18)
      if (!Array.isArray(evidence.sources) || evidence.sources.length === 0) {
        errors.push(`Field evidence[${i}].sources: Must not be empty`);
      }

      // Check legend status specific fields (10.4)
      if (evidence.status === 'legend') {
        const legendEvidence = evidence as { origin?: string };
        if (!legendEvidence.origin || legendEvidence.origin.trim() === '') {
          errors.push(`Field evidence[${i}].origin: Must be a non-empty string`);
        }
      }

      // Check disputed status specific fields (10.4)
      if (evidence.status === 'disputed') {
        const disputedEvidence = evidence as { dispute?: { claim?: string; challenge?: string } };
        if (!disputedEvidence.dispute || !disputedEvidence.dispute.claim || disputedEvidence.dispute.claim.trim() === '') {
          errors.push(`Field evidence[${i}].dispute.claim: Must be a non-empty string`);
        }
        if (!disputedEvidence.dispute || !disputedEvidence.dispute.challenge || disputedEvidence.dispute.challenge.trim() === '') {
          errors.push(`Field evidence[${i}].dispute.challenge: Must be a non-empty string`);
        }
      }

      // Validate reading references
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

  // ===== Portal markup checks {{ref:id|label}} (story-engine 4.1 to 4.13) =====

  // Check A: reference id format (4.12)
  if (Array.isArray(caseData.references)) {
    caseData.references.forEach((ref, i) => {
      if (!isRefId(ref.id)) {
        errors.push(`Field references[${i}].id: '${ref.id}' is not a valid reference ID`);
      }
    });
  }

  // Validate the optional legend video (13.5): when present, src, poster and credit must be non-empty
  const legendVideo: { src?: unknown; poster?: unknown; credit?: unknown } | undefined = caseData.theme?.legendVideo;
  if (legendVideo !== undefined && legendVideo !== null) {
    for (const field of ['src', 'poster', 'credit'] as const) {
      const value = legendVideo[field];
      if (typeof value !== 'string' || value.trim() === '') {
        errors.push(`Field theme.legendVideo.${field}: Must be a non-empty string`);
      }
    }
  }

  // Check B: Markup_Fields (4.1 to 4.7, 4.13)
  const fields = markupFields(caseData);
  for (const field of fields) {
    checkMarkupField(field, validReferenceIds, errors);
  }

  // Check C: '{{' in Plain_Fields (4.11)
  const skip = new Set(fields.map(f => f.location));
  collectPlainMarkupErrors(caseData, '', skip, new WeakSet(), errors);

  return errors;
}

interface MarkupField {
  location: string;
  text: string;
}

/** Matches Malformed_Markup of the form {{ref:<Ref_Id>|<empty or whitespace>}} (4.3). */
const EMPTY_LABEL_MARKUP = /^\{\{ref:[a-z0-9]+(?:-[a-z0-9]+)*\|\s*\}\}/;
const ANY_BRACE = /[{}]/;
const EXCERPT_MAX = 40;

/** First `max` code points of s. Never splits a surrogate pair. */
function excerpt(s: string, max = EXCERPT_MAX): string {
  let out = '';
  let n = 0;
  for (const cp of s) {
    if (n++ === max) break;
    out += cp;
  }
  return out;
}

/**
 * Every Markup_Field of the case, in order: story[i].body[j], story[i].hook,
 * evidence[i].detail[j], references[i].profile[j]. Only string values are returned.
 */
function markupFields(c: Case): MarkupField[] {
  const out: MarkupField[] = [];

  if (Array.isArray(c.story)) {
    c.story.forEach((section, i) => {
      if (Array.isArray(section?.body)) {
        section.body.forEach((text, j) => {
          if (typeof text === 'string') out.push({ location: `story[${i}].body[${j}]`, text });
        });
      }
      if (typeof section?.hook === 'string') {
        out.push({ location: `story[${i}].hook`, text: section.hook });
      }
    });
  }

  if (Array.isArray(c.evidence)) {
    c.evidence.forEach((ev, i) => {
      if (Array.isArray(ev?.detail)) {
        ev.detail.forEach((text, j) => {
          if (typeof text === 'string') out.push({ location: `evidence[${i}].detail[${j}]`, text });
        });
      }
    });
  }

  if (Array.isArray(c.references)) {
    c.references.forEach((ref, i) => {
      if (Array.isArray(ref?.profile)) {
        ref.profile.forEach((text, j) => {
          if (typeof text === 'string') out.push({ location: `references[${i}].profile[${j}]`, text });
        });
      }
    });
  }

  return out;
}

/** Parses one Markup_Field and reports unknown ids, Malformed_Markup and stray braces. */
function checkMarkupField(field: MarkupField, knownIds: Set<string>, errors: string[]): void {
  const { location, text: fieldText } = field;
  let offset = 0;

  for (const seg of parseRefs(fieldText)) {
    if (seg.kind === 'ref') {
      if (!knownIds.has(seg.id)) {
        errors.push(`Field ${location}: reference ID '${seg.id}' not found in references`);
      }
      offset += seg.raw.length;
      continue;
    }

    const t = seg.text;
    let hasDoubleBrace = false;
    for (let p = 0; p < t.length - 1; p++) {
      if (t[p] !== '{' || t[p + 1] !== '{') continue;
      hasDoubleBrace = true;
      const rest = fieldText.slice(offset + p);
      if (EMPTY_LABEL_MARKUP.test(rest)) {
        errors.push(`Field ${location}: Invalid reference markup - label cannot be empty`);
      } else {
        errors.push(`Field ${location}: Invalid reference markup near '${excerpt(rest)}'`);
      }
    }

    if (!hasDoubleBrace) {
      const b = t.search(ANY_BRACE);
      if (b !== -1) {
        errors.push(`Field ${location}: Stray brace near '${excerpt(fieldText.slice(offset + b))}'`);
      }
    }

    offset += t.length;
  }
}

/**
 * Walks every string in the case and reports '{{' in any Plain_Field (4.11).
 * Markup_Field locations in `skip` are not checked here.
 */
function collectPlainMarkupErrors(
  value: unknown,
  path: string,
  skip: Set<string>,
  seen: WeakSet<object>,
  errors: string[]
): void {
  if (typeof value === 'string') {
    if (!skip.has(path) && value.includes('{{')) {
      errors.push(`Field ${path}: portal markup is not allowed in this field`);
    }
    return;
  }
  if (value === null || typeof value !== 'object') return;
  if (seen.has(value)) return;
  seen.add(value);

  if (Array.isArray(value)) {
    value.forEach((item, i) => collectPlainMarkupErrors(item, `${path}[${i}]`, skip, seen, errors));
    return;
  }

  for (const key of Object.keys(value)) {
    const childPath = path === '' ? key : `${path}.${key}`;
    collectPlainMarkupErrors((value as Record<string, unknown>)[key], childPath, skip, seen, errors);
  }
}

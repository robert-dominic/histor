# Implementation Plan: story-engine

## Overview

Build the portal-markup logic layer in TypeScript, in three steps: the parser and serializer (`src/lib/parse-refs.ts`), the `validateCase` extension that uses them (`src/lib/validate-case.ts`), and the validator property tests. A final checkpoint confirms the whole suite, the build and lint are green and that the fixed files are untouched.

Rules for every task:

- Do not change `src/types/case.ts` or anything under `src/cases/` (Requirement 7.2).
- Import `src/` modules with the `@/` alias (Requirement 7.1).
- Before writing any test, use the Context7 power to check the current fast-check and Vitest APIs for the installed versions (fast-check 4.10.2 and Vitest as listed in `package.json` / `node_modules`).
- Every sub-task ends the same way: run `npm test`, `npm run build` and `npm run lint`, fix every error, then write a report with these sections:
  - **What changed**: files and functions added or edited.
  - **Errors hit**: every error seen during the task, including ones that were fixed, and how each was fixed.
  - **Test output**: the real output of `npm test`, `npm run build` and `npm run lint`, pasted, not summarised.
  - **Changed existing assertions and generators**: every changed assertion or test generator in existing test files, with before and after (Requirement 4.9). Write "None" if there are none.
  - **Notes**: assumptions, deviations from the design, open questions.

## Tasks

- [x] 1. Parser and serializer
  - [x] 1.1 Implement `src/lib/parse-refs.ts`
    - Export `TextSegment`, `RefSegment`, `Segment`, `isRefId`, `isRefLabel`, `parseRefs` and `serializeSegments` exactly as in the design section "`src/lib/parse-refs.ts`"
    - Use the hand-written `matchRefAt` scan from the design: `indexOf('{{', i)`, advance by one on a miss so overlapping `{{` is retried, consume and continue after `}}` on a hit, flush pending text only before a ref and at the end
    - Regexes must be non-global and non-sticky; the module imports nothing and has no module-level mutable state
    - Finish with `npm test`, `npm run build`, `npm run lint` and the report described in the Overview
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3.1, 7.1_

  - [x] 1.2 Write parser unit tests and property tests
    - First check the fast-check and Vitest APIs for the installed versions with Context7
    - Create `src/lib/__tests__/parse-refs.test.ts` with the exact expected Segment_List for every malformed form in Requirement 2 (unclosed, missing label, empty id, empty label, whitespace-only label, `{{foo:x|y}}`, `{{REF:x|y}}`, `{{ ref:x|y}}`, ids `Briggs`, `dei gratia`, `dei_gratia`, `{{ref:a|b|c}}`, nested `{{ref:a|b {{ref:c|d}}}}`, extra leading `{{{ref:a|b}}`); `''` gives `[]`; `The {{ref:dei-gratia|Dei Gratia}} found her drifting.` gives text, ref, text; refs at the start, at the end and back to back; `isRefId` and `isRefLabel` on the glossary examples and non-examples
    - Create `src/lib/__tests__/parse-refs.property.test.ts` with one `test` per property, each `fc.assert(..., { numRuns: 100 })` and tagged `// Feature: story-engine, Property N: ...`, using the generators in the design's Testing Strategy table (full Unicode, arbitrary UTF-16 code units including lone surrogates, markup fragments, Ref_Id, Ref_Label):
      - **Property 1: Parser is total** (Validates: Requirements 1.1, 1.2, 5.2)
      - **Property 2: Lossless round trip** (Validates: Requirements 1.4, 1.6, 1.12, 3.1, 3.2, 3.3, 5.3)
      - **Property 3: Text without markup is one segment** (Validates: Requirements 1.8, 5.4)
      - **Property 4: Every Ref_Segment is well formed**, checking the id with a regex written in the test, not `isRefId` (Validates: Requirements 1.3, 1.11, 5.5)
      - **Property 5: Segment list is in normal form** (Validates: Requirements 1.9, 1.10, 5.6)
      - **Property 6: Constructed refs are recovered in order** (Validates: Requirements 1.3, 1.4, 1.5, 5.7)
    - If a property fails, fix `parse-refs.ts` rather than weakening the property, and record the counterexample in the report
    - Finish with `npm test`, `npm run build`, `npm run lint` and the report described in the Overview
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 6.2, 6.3_

- [ ] 2. Validator extension
  - [x] 2.1 Extend `validateCase` in `src/lib/validate-case.ts` and update the existing generator
    - Delete the regex-based block under `// Validate story reference markup {{ref:id|label}} (7.22, 7.23)` and replace it with the parser-based checks; leave every other existing check unchanged
    - Check A (4.12): for each `references[i]` whose id fails `isRefId`, push `Field references[<i>].id: '<id>' is not a valid reference ID`
    - Check B (4.1 to 4.7, 4.13): add `markupFields(c)` returning `{ location, text }` for `story[i].body[j]`, `story[i].hook`, `evidence[i].detail[j]`, `references[i].profile[j]`, guarded with `Array.isArray` / `typeof === 'string'`. Parse each field once and walk segments with a running offset:
      - unknown Ref_Segment id gives `Field <location>: reference ID '<id>' not found in references`, once per occurrence
      - every overlapping `{{` position inside a Text_Segment is one Malformed_Markup occurrence; classify `field.slice(offset + p)` against `/^\{\{ref:[a-z0-9]+(?:-[a-z0-9]+)*\|\s*\}\}/` for the empty-label message, otherwise `Field <location>: Invalid reference markup near '<excerpt>'`
      - a Text_Segment with `{` or `}` but no `{{` gives exactly one `Field <location>: Stray brace near '<excerpt>'` from its first brace
      - `excerpt` cuts at 40 code points with `for...of`
    - Check C (4.11): walk every string in the case recursively (arrays as `path[i]`, object keys as `path.key`, `WeakSet` cycle guard), skip the locations returned by `markupFields`, and push `Field <path>: portal markup is not allowed in this field` once per Plain_Field containing `{{`
    - Emit both the 4.11 and 4.12 errors for a reference id such as `a{{b`, as decided in the design
    - Keep `validateCase` pure: per-call `Set`, `WeakSet` and error array, non-global regexes
    - In `src/lib/__tests__/validate-case.property.test.ts`, change the filter in `nonEmptyString()` to `.filter(s => s.trim().length > 0 && !/[{}]/.test(s))` (design section "Existing test compatibility"); change nothing else in that file and list this generator change in the report
    - Do not edit existing assertions in `src/lib/__tests__/validate-case.test.ts`; the design shows none need changing. If one does fail, stop and report it with the failing output instead of editing it silently
    - Confirm `src/cases/__tests__/registry-validation.test.ts` still passes unchanged
    - Finish with `npm test`, `npm run build`, `npm run lint` and the report described in the Overview
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12, 4.13, 7.1, 7.2_

  - [x] 2.2 Write validator unit tests
    - First check the fast-check and Vitest APIs for the installed versions with Context7
    - Append new `describe` blocks to `src/lib/__tests__/validate-case.test.ts`; leave existing tests untouched
    - Unknown id and Malformed_Markup reported with the right Field_Location for `story[i].body[j]`, `story[i].hook`, `evidence[i].detail[j]` and `references[i].profile[j]` (6.4)
    - Generic malformed message quotes at most 40 code points, tested with a long tail and with an emoji at the cut point (4.4)
    - `{{` in `title`, `theories[0].claim`, `story[1].heading` and `evidence[2].dispute.claim` gives the 4.11 message with that path (6.5)
    - Reference ids `Briggs`, `dei gratia`, `dei_gratia` and `''` give the 4.12 message with index and id; `dei-gratia` gives none (6.6)
    - Reference id `a{{b` gives both the 4.11 and the 4.12 error
    - Stray braces (6.7): the four worked examples from the design table under Check B with their exact error lists (`{{{ref:a|b}}`, `{{ref:a|b}}}`, `{{ref:a|b {{ref:c|d}}}}`, `{{{x`); a lone `}` in prose gives one stray-brace error; a long tail truncates the excerpt to 40 code points; `{{ref:a|}} x }` gives only the empty-label error and no stray-brace error
    - Finish with `npm test`, `npm run build`, `npm run lint` and the report described in the Overview
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.11, 4.12, 4.13, 6.4, 6.5, 6.6, 6.7_

- [ ] 3. Validator property tests
  - [ ] 3.1 Write `src/lib/__tests__/validate-case-refs.property.test.ts`
    - First check the fast-check and Vitest APIs for the installed versions with Context7
    - Build a markup-safe valid case generator in this file (do not reuse the existing one): every string from `fc.string({ minLength: 1 }).filter(s => s.trim().length > 0 && !/[{}]/.test(s))`, reference ids from the Ref_Id generator made unique with `fc.uniqueArray`, `closeThreshold` from `fc.integer` inside `chain` (no `fc.sample`)
    - One `test` per property, each `fc.assert(..., { numRuns: 100 })` and tagged `// Feature: story-engine, Property N: ...`:
      - **Property 7: Validator accepts valid markup in every Markup_Field kind** (Validates: Requirements 4.1, 4.6, 5.8)
      - **Property 8: Unknown ids are reported at their location** (Validates: Requirements 4.1, 4.2, 4.5, 5.9)
      - **Property 9: Malformed markup is reported once with the right message**, using the malformed-fragment generator from the design (Validates: Requirements 4.3, 4.4, 4.5, 4.7)
      - **Property 10: `{{` in any Plain_Field is reported at its path**, picking the target by walking a `structuredClone` of the case and skipping Markup_Field locations; assert only that the expected error is present exactly once (Validates: Requirements 4.11, 5.10)
      - **Property 11: A brace before a valid ref is one stray-brace error**, with `pre` and `post` free of `{` and `}`, asserting the exact single-error list (Validates: Requirements 4.13, 5.11)
    - If a property fails, decide whether the validator or the generator is wrong using the requirements, fix the right one, and record the counterexample in the report
    - Finish with `npm test`, `npm run build`, `npm run lint` and the report described in the Overview
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.11, 4.13, 5.1, 5.8, 5.9, 5.10, 5.11_

- [ ] 4. Final checkpoint
  - Run `npm test`, `npm run build` and `npm run lint` and fix any remaining errors
  - Run `git diff --stat -- src/types/case.ts src/cases/` and confirm it shows no changes (Requirement 7.2)
  - Write the final report in the format described in the Overview, collecting every changed existing assertion and generator from tasks 1 to 3 (Requirement 4.9)
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 4.9, 4.10, 7.2, 7.3_

## Notes

- All tasks are required. None are optional.
- Property tests for each file are grouped in one sub-task per file to keep the plan small; each property is still its own `test` with its own property tag.
- Task 2.1 must change the existing `nonEmptyString()` generator in the same step as the validator change, because the existing Property 8 in `validate-case.property.test.ts` fails on almost every run otherwise (see design, "Existing test compatibility").
- Tasks in the same wave write different files, but they all run the full test suite. If a parallel task's unfinished file causes a failure, note it in the report rather than editing that file.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["2.2", "3.1"] }
  ]
}
```

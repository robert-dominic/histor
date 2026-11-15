# Implementation Plan: case-report

## Overview

Build the case report's logic layer in TypeScript, in three steps: the Report_Builder and its types (`src/lib/case-report.ts`), unit tests against the Mary Celeste case, and property tests. A final checkpoint confirms the whole suite, the build and lint are green, and that the fixed files are untouched.

Rules for every task:

- Do not change `src/types/case.ts`, `src/app/InvestigationProvider.tsx`, or anything under `src/cases/` (Introduction, out of scope).
- Import `src/` modules with the `@/` alias.
- Before writing any test, use the Context7 power to check the current fast-check and Vitest APIs for the installed versions (fast-check 4.10.2, Vitest 5.1.0).
- Every sub-task ends the same way: run `npm test`, `npm run build` and `npm run lint`, fix every error, write a report, then commit only the task's files with a message starting `[kiro]`. Do not push. The report has these sections:
  - **What changed**: files and functions added or edited.
  - **Errors hit**: every error seen during the task, including ones that were fixed, and how each was fixed.
  - **Test output**: the real output of `npm test`, `npm run build` and `npm run lint`, pasted, not summarised.
  - **Commit**: the commit hash and message.
  - **Notes**: assumptions, deviations from the design, open questions.

## Tasks

- [ ] 1. Report_Builder
  - [ ] 1.1 Implement `src/lib/case-report.ts`
    - Export `HistoriansReading`, `VerdictLink`, `ReportVerdict`, `PinReading`, `ReliedOnEntry`, `AgainstVerdictEntry`, `NeverOpenedEntry`, `LegendTrustedEntry`, `TheoryStandingEntry`, `CaseReport` and `buildCaseReport` exactly as in the design section "`src/lib/case-report.ts`"
    - `cleanState` (not exported): build a `Set` of case evidence ids and a `Map` of theories by id; keep `opened` entries only from an array, only strings, only known ids, deduplicated by a `Set`; keep `pins` entries from `Object.entries` only when `pins` is a non-null, non-array object, the key is a known evidence id, and the value is a string that is `"none"` or a known theory id, stored in a `Map`; set `chosen` only when `verdict` is a string naming a known theory. Wrap the whole step in `try/catch` and return an empty investigation on any exception
    - `historiansReading` and `verdictLink`: check `reading.supports` before `reading.weakens`, so `agree` and `supports` win on overlap; for `"none"`, `agree` when `reading.supports` is empty, otherwise `disagree`
    - Fill `pins`, `reliedOn`, `againstVerdict`, `neverOpened` and `legendsTrusted` in one loop over `case.evidence`, as in design Step 3. `againstVerdict` requires the file to be opened and `neverOpened` requires it not to be
    - `neverOpened` entries have no `status` key
    - `verdict` from `chosen` or `null`; `historiansStand.theories` from `case.theories` in order; `historiansStand.summary` as a new copy of `case.historiansSummary`
    - Pure: every returned array and object is new; no mutation of `caseData` or `state`; no clock, randomness, storage or globals; lookups only through `Map` and `Set`, never plain-object indexing by id
    - Finish with `npm test`, `npm run build`, `npm run lint`, the report and a `[kiro]` commit, as described in the Overview
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 8.1, 8.2, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [ ] 1.2 Write unit tests in `src/lib/__tests__/case-report.test.ts`
    - First check the Vitest APIs for the installed version with Context7
    - Use the real Mary Celeste case from `@/cases/mary-celeste/case` and hand-built States; no DOM, so leave the default Node environment
    - The design's worked example (verdict `t-sinking`, opened `[e-water, e-lifeboat]`, the four pins), checking every part of the report with its exact expected value and order
    - A `t-mutiny` verdict with e-cargo-food and e-sword opened: `againstVerdict` is exactly those two; `neverOpened` is e-lifeboat (`supports`), e-findings and e-bow-marks (`weakens`), in case order
    - No verdict, both `null` and an unknown id: `verdict` is `null`; `reliedOn`, `againstVerdict` and `neverOpened` are empty; `pins`, `legendsTrusted` and `historiansStand` are still filled
    - A legend pinned to `"none"` is not in `legendsTrusted`, but is in `pins`
    - Pins to an unknown theory id, on an unknown evidence id, and duplicate or unknown ids in `opened` are all ignored
    - `historiansStand` lists all five theories in case order and the three summary paragraphs unchanged, and the summary array is not the case's own array
    - No `neverOpened` entry has a `status` key
    - Walk the whole report and assert no value anywhere is a number or a boolean (8.1)
    - If a test fails, decide from the requirements whether the code or the test is wrong, fix the right one, and record it in the report
    - Finish with `npm test`, `npm run build`, `npm run lint`, the report and a `[kiro]` commit, as described in the Overview
    - _Requirements: 1.1, 1.2, 2.1, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 3.1, 3.2, 4.1, 4.2, 5.1, 5.2, 5.5, 6.1, 6.3, 7.1, 7.2, 7.3, 8.1, 9.2, 9.3, 10.6_

- [ ] 2. Property tests
  - [ ] 2.1 Write `src/lib/__tests__/case-report.property.test.ts`
    - First check the fast-check and Vitest APIs for the installed versions with Context7
    - Build the generators from the design's Testing Strategy in this file, following `src/app/__tests__/InvestigationProvider.property.test.ts`: prefixed ids from one shared `fc.stringMatching(/^[a-z0-9]{1,8}$/)` (case ids `e-` and `t-`, unknown ids `x-` and `z-`); a case with 1 to 12 unique evidence ids and 1 to 5 unique theory ids, each evidence item with a status from `fc.constantFrom`, `supports` and `weakens` from `fc.subarray(theoryIds)` (overlap allowed), an `origin` for legends and a `dispute` for disputed items; a valid-ish state drawn with `.chain` from the case's own ids mixed with unknown ids and duplicates; and garbage states from `fc.anything()`, for the whole state and for each field
    - One `test` per property, each `fc.assert(fc.property(...))` with the default 100 runs, and tagged `// Feature: case-report, Property N: ...`:
      - **Property 1: Never throws**, on valid-ish and garbage states, and the result has all seven parts (Validates: Requirements 9.1, 10.1)
      - **Property 2: Every pinned legend is listed**: the ids in `legendsTrusted` are exactly the legend files with a Valid_Pin to a theory, each with its target, worked out independently in the test (Validates: Requirements 6.1, 6.2, 10.2)
      - **Property 3: Opened and never opened do not overlap** (Validates: Requirements 5.4, 10.3)
      - **Property 4: Every id belongs to the case**: every evidence id and every theory id (verdict, pin targets other than `"none"`, `legendsTrusted.theoryId`, `historiansStand`) (Validates: Requirements 9.2, 9.4, 10.4)
      - **Property 5: Deterministic and non-mutating**: two calls give `toStrictEqual` reports, and the case and state are `toStrictEqual` to `structuredClone` copies taken before the call (Validates: Requirements 9.6, 10.5)
      - **Property 6: Order of the state does not matter**: a shuffled and duplicated `opened` and re-ordered `pins` keys give a `toStrictEqual` report (Validates: Requirements 9.3, 9.5)
      - **Property 7: The reading rules**: every Pin_Reading's `reading` matches the design's Step 2 table, worked out in the test from `supports` and `weakens` (Validates: Requirements 2.3, 2.4, 2.5, 2.6, 2.7)
    - If a property fails, decide from the requirements whether the code or the generator is wrong, fix the right one, and record the counterexample in the report
    - Finish with `npm test`, `npm run build`, `npm run lint`, the report and a `[kiro]` commit, as described in the Overview
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 3. Final checkpoint
  - Run `npm test`, `npm run build` and `npm run lint` and fix any remaining errors
  - Run `git diff --stat 3f42c47 -- src/types/case.ts src/app/InvestigationProvider.tsx src/cases/` (`3f42c47` is the last commit before this spec) and confirm it shows no changes
  - Write the final report in the format described in the Overview, listing every requirement and the test that covers it
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

## Notes

- All tasks are required. None are optional.
- The unit tests in 1.2 check exact values from the current Mary Celeste data. If that content changes later, these expected values must be updated with it; the property tests in 2.1 do not depend on case content.
- Property tests are grouped in one sub-task because they share one file and one set of generators. Each property is still its own `test` with its own tag.
- Tasks 1.2 and 2.1 write different files and can run in parallel, but both run the full test suite. If the other task's unfinished file causes a failure, note it in the report rather than editing that file.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["3"] }
  ]
}
```

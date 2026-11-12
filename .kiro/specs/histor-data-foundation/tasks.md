# Implementation Plan: Histor Data Foundation

## Overview

This plan implements the core data foundation for Histor: the type system (already present in `src/types/case.ts`), validation logic, case registry with a sample Mary Celeste case, investigation state management with localStorage persistence, and app-level routing and wiring. All tasks build incrementally with tests integrated throughout to validate correctness early.

## Tasks

- [x] 1. Set up validation module and basic structure
  - [x] 1.1 Create `src/lib/validate-case.ts` with `validateCase(caseData: Case): string[]` function
    - Implement validation for required string fields (id, title, teaser, centralQuestion)
    - Implement validation for year (positive integer)
    - Implement validation for non-empty arrays (theories, evidence, sources, story, legendIntro.lines, historiansSummary)
    - Implement validation for closeThreshold (0 ≤ threshold ≤ evidence.length)
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11, 7.12, 7.13_
  
  - [x] 1.2 Write unit tests for basic validation constraints
    - Test non-empty string validation
    - Test year validation (positive integer)
    - Test array length validation
    - Test closeThreshold bounds
    - _Requirements: 7.2-7.13_
  
  - [x] 1.3 Write property test for validator accepting valid cases
    - **Property 8: Validator Accepts Valid Cases**
    - **Validates: Requirements 7.26, 10.1**

- [x] 2. Implement ID uniqueness and referential integrity validation
  - [x] 2.1 Add ID uniqueness checks to validateCase
    - Check theory IDs are unique within theories array
    - Check evidence IDs are unique within evidence array
    - Check source IDs are unique within sources array
    - Check reference IDs are unique within references array
    - _Requirements: 7.14, 7.15, 7.16, 7.17_
  
  - [x] 2.2 Add referential integrity checks to validateCase
    - Verify Evidence.sources references exist in Case.sources
    - Verify Evidence.reading.supports references exist in Case.theories
    - Verify Evidence.reading.weakens references exist in Case.theories
    - Verify Reference.sources references exist in Case.sources
    - Extract and verify {{ref:id|label}} markup in story body paragraphs
    - _Requirements: 7.18, 7.19, 7.20, 7.21, 7.22, 7.23_
  
  - [x] 2.3 Write property tests for duplicate ID detection
    - **Property 9: Validator Detects Duplicate Theory IDs**
    - **Property 10: Validator Detects Duplicate Evidence IDs**
    - **Property 11: Validator Detects Duplicate Source IDs**
    - **Property 12: Validator Detects Duplicate Reference IDs**
    - **Validates: Requirements 7.14, 7.15, 7.16, 7.17, 10.2**
  
  - [x] 2.4 Write property tests for referential integrity
    - **Property 13: Validator Detects Invalid Source References in Evidence**
    - **Property 14: Validator Detects Invalid Theory References in Evidence Reading**
    - **Property 15: Validator Detects Invalid Reference IDs in Story Markup**
    - **Validates: Requirements 7.19, 7.20, 7.21, 7.22, 7.23, 10.3**

- [x] 3. Implement Source and Evidence validation
  - [x] 3.1 Add Source validation to validateCase
    - Verify Source has url, citation, or both
    - Verify SourceKind is one of: testimony, official, secondary, fiction
    - Verify Source id is non-empty string
    - Verify Source title is non-empty string
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [x] 3.2 Add Evidence-specific validation to validateCase
    - Verify Evidence.sources is non-empty (NonEmptyArray constraint)
    - For status='legend', verify origin field is non-empty
    - For status='disputed', verify dispute.claim and dispute.challenge are non-empty
    - _Requirements: 7.18, 10.4_
  
  - [x] 3.3 Write property tests for Source and Evidence validation
    - **Property 18: Source Has URL or Citation**
    - **Property 19: Validator Detects Empty Evidence Sources**
    - **Property 25: Validator Detects Empty Legend Origin**
    - **Property 26: Validator Detects Empty Disputed Evidence Fields**
    - **Validates: Requirements 8.1, 10.4**

- [x] 4. Create case registry with sample content
  - [x] 4.1 Create `src/cases/mary-celeste/case.ts` with minimal valid Case object
    - Include all required fields with "TODO: real content" placeholders
    - Ensure data passes validateCase
    - Include at least one theory, one evidence item, one source, one story section
    - _Requirements: 3.1-3.12, 4.1_
  
  - [x] 4.2 Create `src/cases/index.ts` with registry array and getCaseById function
    - Import mary-celeste case and register as open case (sealed: false)
    - Add one sealed placeholder case entry (id: "jack-the-ripper", sealed: true)
    - Implement getCaseById(id: string): RegistryEntry | undefined
    - Return undefined for null, undefined, empty string, or non-existent IDs
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_
  
  - [x] 4.3 Write unit tests for getCaseById
    - Test lookup with valid ID returns correct entry
    - Test lookup with invalid ID returns undefined
    - Test lookup with null/undefined/empty string returns undefined
    - _Requirements: 4.5, 4.6, 4.7_
  
  - [x] 4.4 Write property tests for registry correctness
    - **Property 1: Registry ID Uniqueness**
    - **Property 2: Registry Lookup Correctness**
    - **Property 3: Registry Lookup Returns Undefined for Non-Existent IDs**
    - **Validates: Requirements 4.2, 4.5, 4.6**

- [x] 5. Implement localStorage persistence
  - [x] 5.1 Create `src/lib/storage.ts` with load and save functions
    - Implement loadInvestigationState(caseId: string, caseData: Case): InvestigationState
    - Implement saveInvestigationState(caseId: string, state: InvestigationState): void
    - Use storage key format: "histor:case:{caseId}"
    - Handle localStorage errors gracefully (return default state, silent save failures)
    - Validate loaded state against caseData (remove invalid evidence/theory IDs)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_
  
  - [x] 5.2 Write unit tests for storage functions with mocked localStorage
    - Test save and load round trip
    - Test load with missing key returns default state
    - Test load with invalid JSON returns default state
    - Test load with localStorage unavailable returns default state
    - Test state validation removes invalid IDs
    - _Requirements: 6.4, 6.5, 6.6, 6.7, 6.8_
  
  - [x] 5.3 Write property tests for storage serialization
    - **Property 16: Investigation State Serialization Round Trip**
    - **Property 17: Storage Manager Handles Invalid JSON Gracefully**
    - **Property 23: Loaded State Validation Removes Invalid Evidence IDs**
    - **Property 24: Loaded State Validation Removes Invalid Theory IDs**
    - **Validates: Requirements 6.6, 6.7, 6.8, 10.7, 10.8**

- [x] 6. Create investigation state management with React context
  - [x] 6.1 Create `src/app/InvestigationProvider.tsx` with context and reducer
    - Define InvestigationContext with state, dispatch, and caseData
    - Implement reducer handling OPEN_EVIDENCE, PIN_EVIDENCE, CLOSE_CASE, REOPEN_CASE
    - Use useReducer with lazy initializer calling loadInvestigationState
    - Add useEffect to save state after each update
    - Implement useInvestigation hook that throws outside provider
    - Enforce business rules: pin validation, close threshold, max array sizes
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 12.1-12.6_
  
  - [x] 6.2 Write unit tests for InvestigationProvider and reducer
    - Test OPEN_EVIDENCE adds ID to opened array
    - Test OPEN_EVIDENCE is idempotent for duplicate IDs
    - Test PIN_EVIDENCE with valid theory ID
    - Test PIN_EVIDENCE with invalid theory ID is rejected
    - Test CLOSE_CASE with valid theory and sufficient opened count
    - Test CLOSE_CASE fails below threshold
    - Test REOPEN_CASE resets state
    - Test max array sizes (100 entries)
    - _Requirements: 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11_
  
  - [x] 6.3 Write property tests for investigation actions
    - **Property 4: Evidence Opening Preserves Order**
    - **Property 5: Evidence Reopening is Idempotent**
    - **Property 6: Valid Pin Storage and Retrieval**
    - **Property 7: Invalid Pin Rejection**
    - **Property 20: REOPEN_CASE Returns Empty State**
    - **Property 21: Close Below Threshold Fails**
    - **Property 22: All Pin Targets Are Valid**
    - **Validates: Requirements 5.5, 5.6, 5.7, 5.8, 10.5, 10.6**

- [ ] 7. Wire up App routing and UI structure
  - [ ] 7.1 Create `src/pages/Home.tsx`
    - Import registry from `src/cases/index.ts`
    - Map over registry entries
    - Render sealed cases as plain text (title, year, teaser) without links
    - Render open cases as clickable links to `/case/{id}`
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [ ] 7.2 Create `src/pages/Case.tsx`
    - Accept case ID from route params
    - Call getCaseById with ID
    - Show "Case not found" with home link for undefined result
    - Show "This case is sealed." for sealed entries
    - For open cases, wrap in InvestigationProvider
    - Call validateCase when `import.meta.env.DEV` is true and log errors
    - Render placeholder content showing case title
    - _Requirements: 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_
  
  - [ ] 7.3 Update `src/App.tsx` to render router
    - Set up React Router with routes for `/` and `/case/:id`
    - Route `/` renders Home page
    - Route `/case/:id` renders Case page
    - Remove all Vite starter code (counter demo)
    - _Requirements: 1.1, 2.1_
  
  - [ ] 7.4 Clean up Vite starter files and update HTML
    - Delete `src/App.css`
    - Delete `src/assets/react.svg`
    - Delete `src/assets/vite.svg`
    - Update `src/index.css` to contain only `@import "tailwindcss";` and empty `@theme {}` block with comment
    - Update `index.html` title to "Histor"
    - Remove Vite favicon link from `index.html`
    - _Requirements: 1.1, 2.1_

- [ ] 8. Final checkpoint and verification
  - Ensure all tests pass (unit tests and property tests)
  - Verify App renders home page with registry entries
  - Verify clicking mary-celeste navigates to case page
  - Verify sealed case shows "This case is sealed."
  - Verify invalid ID shows "Case not found" with home link
  - Run `npm run dev` and manually verify routing works
  - Ask the user if questions arise

## Notes

- All test tasks are required and must be implemented
- Property-based tests use fast-check library with minimum 100 iterations
- Property test files use naming convention `*.property.test.ts`
- Each property test includes comment: `// Feature: histor-data-foundation, Property {N}: {property title}`
- Investigation state maximum sizes: 100 entries for opened array, 100 entries for pins object
- Validation is pure function with no side effects, returns all errors at once
- localStorage failures are handled silently to keep app functional
- Router error handling provides clear user feedback with navigation back to home
- The mary-celeste case is a minimal placeholder that passes validation
- Task 7 wires everything together into a working application

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "4.1"] },
    { "id": 3, "tasks": ["2.2", "2.3", "4.2"] },
    { "id": 4, "tasks": ["2.4", "3.1", "4.3"] },
    { "id": 5, "tasks": ["3.2", "4.4"] },
    { "id": 6, "tasks": ["3.3", "5.1"] },
    { "id": 7, "tasks": ["5.2", "5.3"] },
    { "id": 8, "tasks": ["6.1"] },
    { "id": 9, "tasks": ["6.2", "6.3"] },
    { "id": 10, "tasks": ["7.1", "7.2"] },
    { "id": 11, "tasks": ["7.3", "7.4"] }
  ]
}
```
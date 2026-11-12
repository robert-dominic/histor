# Design Document: Histor Data Foundation

## Overview

The Histor Data Foundation provides the type system, validation logic, case registry, investigation state management, and local storage persistence for the Histor application. This foundation ensures all historical case data is well-structured, that user investigation progress is reliably persisted across sessions, and that the application can route between cases with proper error handling.

The system is built around three core concerns:

1. **Type Safety**: TypeScript types defined in `src/types/case.ts` enforce structural correctness at compile time
2. **Runtime Validation**: A pure validation function checks referential integrity and business rules at runtime
3. **State Persistence**: Investigation state (opened evidence, pins, verdict) is managed through React context and persisted to localStorage

This design keeps case content completely separate from application logic. Cases are TypeScript modules containing typed data, making them easy to add, validate, and maintain without touching feature code.

## Architecture

The data foundation follows a layered architecture:

```
┌─────────────────────────────────────────────────┐
│  Case Pages (features consume case data)        │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│  InvestigationProvider (state + localStorage)   │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│  Case Registry (lookup by id)                   │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│  Case Data Modules (typed TypeScript objects)   │
└─────────────────────────────────────────────────┘
```

**Key architectural decisions:**

- **No modification to existing types**: The type system in `src/types/case.ts` is used as-is
- **Provider at case page level**: `InvestigationProvider` wraps the case page and receives the complete `Case` object
- **Lazy initialization**: Investigation state loads from localStorage using a useReducer lazy initializer on mount
- **Pure validation**: `validateCase` is a pure function that accepts a `Case` and returns an array of error strings
- **Centralized registry**: `src/cases/index.ts` exports all cases with sealed/open status

### Routing Architecture

The router handles three routes:

1. **Home (`/`)**: Displays all registry entries (sealed and open cases)
2. **Case page (`/case/:id`)**: Loads case from registry, validates, displays content
3. **Not found**: Any invalid case ID shows "Case not found" with a return link

### State Management Architecture

Investigation state uses React's `useReducer` with a lazy initializer:

```typescript
const init = (caseId: string): InvestigationState => {
  // Load from localStorage on mount
  return loadInvestigationState(caseId);
};

const [state, dispatch] = useReducer(reducer, caseId, init);
```

This ensures localStorage is only read once on mount, and all subsequent state updates are in-memory with automatic persistence after each action.

## Components and Interfaces

### Registry Module (`src/cases/index.ts`)

**Responsibilities:**
- Export array of all `RegistryEntry` objects
- Provide `getCaseById(id: string): RegistryEntry | undefined` lookup function

**Interface:**
```typescript
export const registry: RegistryEntry[];
export function getCaseById(id: string): RegistryEntry | undefined;
```

**Implementation notes:**
- Cases are imported and wrapped in `RegistryEntry` objects
- Sealed cases have `sealed: true` and no `data` field
- Open cases have `sealed: false` and include full `Case` in `data` field
- Lookup returns `undefined` for null, undefined, empty string, or non-existent IDs

### Validator Module (`src/lib/validate-case.ts`)

**Responsibilities:**
- Accept a `Case` object
- Verify all structural constraints
- Verify all referential integrity constraints
- Return array of error strings (empty if valid)

**Interface:**
```typescript
export function validateCase(caseData: Case): string[];
```

**Validation checks:**
- Non-empty required strings (`id`, `title`, `teaser`, `centralQuestion`)
- Positive integer `year`
- Valid `closeThreshold` (0 ≤ threshold ≤ evidence.length)
- Unique IDs within theories, evidence, sources, references arrays
- Non-empty arrays for theories, evidence, sources, story, legendIntro.lines, historiansSummary
- Source references: every Evidence.sources ID exists in Case.sources
- Theory references: every Reading.supports and Reading.weakens ID exists in Case.theories
- Reference markup: extract `{{ref:id|label}}` from story paragraphs, verify each ID exists in Case.references
- Source requirements: every Source has url, citation, or both
- SourceKind validation: kind is one of 'testimony', 'official', 'secondary', 'fiction'
- NonEmptyArray enforcement: Evidence.sources is validated to contain at least one element
- Legend evidence: status='legend' requires non-empty `origin` field
- Disputed evidence: status='disputed' requires non-empty `dispute.claim` and `dispute.challenge` fields

**Implementation notes:**
- Pure function with no side effects
- Always runs all checks (does not short-circuit)
- Error messages include field path and constraint violated
- Reference markup regex: `/\{\{ref:(\S+)\|([^}]+)\}\}/g`

### Storage Module (`src/lib/storage.ts`)

**Responsibilities:**
- Load investigation state from localStorage
- Save investigation state to localStorage
- Handle localStorage errors gracefully

**Interface:**
```typescript
export function loadInvestigationState(caseId: string, caseData: Case): InvestigationState;
export function saveInvestigationState(caseId: string, state: InvestigationState): void;
```

**Storage key format:**
```
histor:case:<caseId>
```

**Error handling:**
- If localStorage is unavailable: return default state `{opened: [], pins: {}, verdict: null}`
- If key doesn't exist: return default state
- If JSON parse fails: return default state
- If parsed data lacks required fields: return default state
- Save failures are silent (investigation continues in-memory)

**State validation on load:**

After loading state from localStorage, validate it against the case data:
- Drop any `opened` evidence IDs that don't exist in `caseData.evidence`
- Drop any `pins` keys (evidence IDs) that don't exist in `caseData.evidence`
- Drop any `pins` values (theory IDs) that aren't "none" and don't exist in `caseData.theories`
- Set `verdict` to null if it's not a valid theory ID from `caseData.theories`

This ensures corrupted or stale state from old case versions can't break the investigation.

**Implementation notes:**
- Saves complete state object as JSON string
- All localStorage access wrapped in try-catch
- No exceptions thrown to calling code

### Investigation Provider (`src/app/InvestigationProvider.tsx`)

**Responsibilities:**
- Accept `Case` object as prop
- Initialize investigation state from localStorage using lazy initializer
- Provide state and dispatch function via context
- Save state to localStorage after each action
- Enforce business rules on actions (pin validation, close threshold)

**Interface:**
```typescript
interface InvestigationContextValue {
  state: InvestigationState;
  dispatch: React.Dispatch<InvestigationAction>;
  caseData: Case;
}

export const InvestigationContext = React.createContext<InvestigationContextValue | undefined>(undefined);

export function InvestigationProvider({ 
  caseData, 
  children 
}: { 
  caseData: Case; 
  children: React.ReactNode;
}): React.ReactElement;

export function useInvestigation(): InvestigationContextValue;
```

**Reducer logic:**

- `OPEN_EVIDENCE`: Validate evidence ID exists in case evidence, then add it to `opened` array if not already present, respecting max 100 entries
- `PIN_EVIDENCE`: Validate evidence ID exists in case evidence and target is "none" or a theory ID in case theories, then set `pins[evidenceId] = target`, respecting max 100 entries
- `CLOSE_CASE`: Validate theory ID exists and opened.length ≥ closeThreshold, then set `verdict = theoryId`
- `REOPEN_CASE`: Reset state to `{opened: [], pins: {}, verdict: null}`

**Business rule enforcement:**

- Pin target validation: theory ID must exist in `caseData.theories` or be "none"
- Close validation: theory ID must exist in `caseData.theories` AND `opened.length >= caseData.closeThreshold`
- Invalid actions are ignored (state unchanged)
- Maximum array size: 100 entries for `opened`
- Maximum object size: 100 entries for `pins`

**Implementation notes:**
- Uses `useReducer` with lazy initializer: `(caseId) => loadInvestigationState(caseId, caseData)`
- Effect hook saves state after each update: `useEffect(() => { saveInvestigationState(caseData.id, state); }, [state, caseData.id])`
- Provider receives complete `Case` object to validate actions
- Custom hook `useInvestigation` throws if used outside provider

## Data Models

All data models are defined in `src/types/case.ts` and remain unchanged. This section documents their structure and relationships.

### Case Registry Model

```typescript
type RegistryEntry =
  | { id: string; title: string; year: number; teaser: string; sealed: true }
  | { id: string; title: string; year: number; teaser: string; sealed: false; data: Case };
```

Registry entries use a discriminated union on `sealed` to ensure sealed cases never expose data and open cases always include complete case objects.

### Investigation State Model

```typescript
type PinTarget = string | 'none';

interface InvestigationState {
  opened: string[];           // Evidence IDs in order opened, max 100
  pins: Record<string, PinTarget>;  // Evidence ID → Theory ID or "none", max 100
  verdict: string | null;     // Theory ID when case closed, null otherwise
}
```

State tracks three aspects of investigation progress:

1. **Opened evidence**: Ordered array of evidence IDs the user has opened
2. **Pins**: User's theory assignments for each evidence item
3. **Verdict**: Final theory choice when case is closed

### Investigation Actions Model

```typescript
type InvestigationAction =
  | { type: 'OPEN_EVIDENCE'; evidenceId: string }
  | { type: 'PIN_EVIDENCE'; evidenceId: string; target: PinTarget }
  | { type: 'CLOSE_CASE'; theoryId: string }
  | { type: 'REOPEN_CASE' };
```

Actions represent all possible investigation state transitions. The reducer validates each action against the current case data before applying changes.

### Referential Integrity

The case model has several referential constraints:

- `Evidence.sources[i]` → `Case.sources[j].id`
- `Evidence.reading.supports[i]` → `Case.theories[j].id`
- `Evidence.reading.weakens[i]` → `Case.theories[j].id`
- `Reference.sources[i]` → `Case.sources[j].id`
- Story markup `{{ref:id|label}}` → `Case.references[j].id`

The validator verifies all these references exist before a case can be rendered.

### ID Uniqueness Constraints

Within each case, IDs must be unique:

- All theory IDs unique within `Case.theories`
- All evidence IDs unique within `Case.evidence`
- All source IDs unique within `Case.sources`
- All reference IDs unique within `Case.references`

This ensures unambiguous referencing throughout the system.


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Registry ID Uniqueness

*For any* pair of entries in the actual registry from `src/cases/index.ts`, their case IDs SHALL be unique.

**Validates: Requirements 4.2**

### Property 2: Registry Lookup Correctness

*For any* registry and any ID that exists in that registry, `getCaseById(id)` SHALL return the RegistryEntry with matching ID.

**Validates: Requirements 4.5**

### Property 3: Registry Lookup Returns Undefined for Non-Existent IDs

*For any* registry and any ID that does not exist in that registry, `getCaseById(id)` SHALL return `undefined`.

**Validates: Requirements 4.6**

### Property 4: Evidence Opening Preserves Order

*For any* investigation state and any sequence of evidence IDs, opening evidence in sequence SHALL result in the opened array containing those IDs in the same order they were added.

**Validates: Requirements 5.5, 10.5**

### Property 5: Evidence Reopening is Idempotent

*For any* investigation state where an evidence ID already exists in the opened array, opening that evidence again SHALL not modify the opened array.

**Validates: Requirements 5.6**

### Property 6: Valid Pin Storage and Retrieval

*For any* valid theory ID or "none", pinning evidence to that target SHALL result in the pins object containing that evidence-to-target mapping.

**Validates: Requirements 5.7, 10.6**

### Property 7: Invalid Pin Rejection

*For any* theory ID that does not exist in the case's theories array (and is not "none"), attempting to pin evidence to that theory SHALL be rejected and the pins object SHALL remain unchanged.

**Validates: Requirements 5.8**

### Property 8: Validator Accepts Valid Cases

*For any* Case object where all required fields are non-empty, all arrays contain at least required elements, all IDs are unique within their respective arrays, and all ID references point to existing entities, `validateCase` SHALL return an empty error array.

**Validates: Requirements 7.26, 10.1**

### Property 9: Validator Detects Duplicate Theory IDs

*For any* Case object containing two or more Theory objects with the same ID value, `validateCase` SHALL return an error array containing at least one error indicating duplicate theory IDs.

**Validates: Requirements 7.14, 10.2**

### Property 10: Validator Detects Duplicate Evidence IDs

*For any* Case object containing two or more Evidence objects with the same ID value, `validateCase` SHALL return an error array containing at least one error indicating duplicate evidence IDs.

**Validates: Requirements 7.15**

### Property 11: Validator Detects Duplicate Source IDs

*For any* Case object containing two or more Source objects with the same ID value, `validateCase` SHALL return an error array containing at least one error indicating duplicate source IDs.

**Validates: Requirements 7.16**

### Property 12: Validator Detects Duplicate Reference IDs

*For any* Case object containing two or more Reference objects with the same ID value, `validateCase` SHALL return an error array containing at least one error indicating duplicate reference IDs.

**Validates: Requirements 7.17**

### Property 13: Validator Detects Invalid Source References in Evidence

*For any* Case object where an Evidence.sources array contains a source ID that does not exist in Case.sources, `validateCase` SHALL return an error array containing at least one error indicating the invalid source reference.

**Validates: Requirements 7.19, 10.3**

### Property 14: Validator Detects Invalid Theory References in Evidence Reading

*For any* Case object where Evidence.reading.supports or Evidence.reading.weakens contains a theory ID that does not exist in Case.theories, `validateCase` SHALL return an error array containing at least one error indicating the invalid theory reference.

**Validates: Requirements 7.20, 7.21, 10.3**

### Property 15: Validator Detects Invalid Reference IDs in Story Markup

*For any* Case object where story body paragraphs contain `{{ref:id|label}}` markup where the ID does not exist in Case.references, `validateCase` SHALL return an error array containing at least one error indicating the invalid reference.

**Validates: Requirements 7.22, 7.23, 10.3**

### Property 16: Investigation State Serialization Round Trip

*For any* InvestigationState object with opened array, pins object, and verdict value, serializing to JSON then deserializing SHALL produce an InvestigationState with the same opened IDs in the same order, the same pin mappings, and the same verdict value.

**Validates: Requirements 10.7**

### Property 17: Storage Manager Handles Invalid JSON Gracefully

*For any* string that is not valid JSON, `loadInvestigationState` SHALL return the default state `{opened: [], pins: {}, verdict: null}` without throwing an exception.

**Validates: Requirements 6.6, 10.8**

### Property 18: Source Has URL or Citation

*For any* Case object where a Source has neither url nor citation field, `validateCase` SHALL return an error array containing at least one error indicating missing source attribution.

**Validates: Requirements 8.1**

### Property 19: Validator Detects Empty Evidence Sources

*For any* Case object where Evidence.sources is an empty array, `validateCase` SHALL return an error array indicating violation of the NonEmptyArray constraint.

**Validates: Requirements 10.4**

### Property 20: REOPEN_CASE Returns Empty State

*For any* investigation state (regardless of opened evidence, pins, or verdict), dispatching REOPEN_CASE SHALL result in the state `{opened: [], pins: {}, verdict: null}`.

**Validates: Requirements 5.9**

### Property 21: Close Below Threshold Fails

*For any* investigation state where `opened.length < caseData.closeThreshold`, dispatching CLOSE_CASE with any theory ID SHALL leave the verdict as null.

**Validates: Requirements 5.10**

### Property 22: All Pin Targets Are Valid

*For any* sequence of investigation actions applied to an initial state, every pin target in the resulting state SHALL be either "none" or a valid theory ID from `caseData.theories`.

**Validates: Requirements 5.8, 10.9**

### Property 23: Loaded State Validation Removes Invalid Evidence IDs

*For any* investigation state stored in localStorage where the opened array or pins object contains evidence IDs not present in the case, `loadInvestigationState` SHALL return a state with those invalid IDs removed.

**Validates: Requirements 6.7, 10.10**

### Property 24: Loaded State Validation Removes Invalid Theory IDs

*For any* investigation state stored in localStorage where pins values or verdict contain theory IDs not present in the case (and not "none"), `loadInvestigationState` SHALL return a state with those invalid theory references removed or set to null for verdict.

**Validates: Requirements 6.8, 10.10**

### Property 25: Validator Detects Empty Legend Origin

*For any* Case object where Evidence has status='legend' and an empty or missing origin field, `validateCase` SHALL return an error array indicating the missing legend origin.

**Validates: Requirements 7.27**

### Property 26: Validator Detects Empty Disputed Evidence Fields

*For any* Case object where Evidence has status='disputed' and dispute.claim or dispute.challenge is empty, `validateCase` SHALL return an error array indicating the missing dispute fields.

**Validates: Requirements 7.28**

## Error Handling

### Validation Errors

The validation function collects all errors and returns them together rather than failing fast. This allows developers to see all issues at once.

**Error message format:**
```
"Field {path}: {constraint violation description}"
```

**Examples:**
- `"Field theories: Duplicate theory IDs found: t-mutiny"`
- `"Field evidence[2].sources: Source ID 's-999' does not exist in case sources"`
- `"Field story[0].body: Reference ID 'briggs' in markup does not exist in case references"`

### Router Error Handling

**Case not found:**
- Display: "Case not found"
- Action: Show link "Return to home" navigating to `/`

**Sealed case access:**
- Display: "This case is sealed."
- Action: Prevent rendering case content

**Case load failure:**
- Display: "Case could not be loaded"
- Action: Show link "Return to home" navigating to `/`

### Storage Errors

All localStorage errors are handled silently:

- **Save failure**: Investigation continues in-memory only, no user-visible error
- **Load failure**: Initialize with default state `{opened: [], pins: {}, verdict: null}`
- **Parse failure**: Initialize with default state
- **Missing key**: Initialize with default state

This ensures the application remains functional even when localStorage is unavailable (private browsing, quota exceeded, disabled storage).

### Investigation Action Validation Errors

Invalid actions are silently ignored:

- **Pin to invalid theory**: State unchanged, no error message
- **Close with invalid theory**: State unchanged, verdict remains null
- **Close below threshold**: State unchanged, verdict remains null

This design treats validation as a guard rather than throwing errors, keeping the reducer pure and predictable.

## Testing Strategy

### Unit Testing Approach

Use **Vitest** for test execution with the following structure:

```
src/lib/__tests__/
  validate-case.test.ts             # Example-based validation tests
  validate-case.property.test.ts    # Property-based validation tests
  storage.test.ts                   # Storage function tests
src/app/__tests__/
  InvestigationProvider.test.ts     # Provider and reducer tests
src/cases/__tests__/
  registry.test.ts                  # Registry lookup tests
  registry.property.test.ts         # Property-based registry tests
```

### Property-Based Testing with fast-check

Property-based tests will use the [fast-check](https://github.com/dubzzz/fast-check) library, running a minimum of **100 iterations** per property. All property test files use the naming convention `*.property.test.ts` so Vitest discovers and runs them.

**Installation:**
```bash
npm install --save-dev fast-check
```

**Test structure:**
```typescript
import { test } from 'vitest';
import * as fc from 'fast-check';

test('Property 1: Registry ID Uniqueness', () => {
  // Feature: histor-data-foundation, Property 1: Registry ID Uniqueness
  fc.assert(
    fc.property(
      registryArbitrary(), // Generator for random registries
      (registry) => {
        const ids = registry.map(entry => entry.id);
        const uniqueIds = new Set(ids);
        return ids.length === uniqueIds.size;
      }
    ),
    { numRuns: 100 }
  );
});
```

**Each property test MUST:**
- Include a comment with format: `// Feature: histor-data-foundation, Property {N}: {property title}`
- Configure `numRuns: 100` minimum
- Use custom arbitraries for generating Case, RegistryEntry, and InvestigationState objects

### Custom Arbitraries

Property tests require generators for complex types:

**Registry generators:**
```typescript
// Generate valid registry entries
const validRegistryEntryArbitrary = (): fc.Arbitrary<RegistryEntry> => ...

// Generate registries with duplicate IDs (for negative testing)
const registryWithDuplicateIds = (): fc.Arbitrary<RegistryEntry[]> => ...
```

**Case generators:**
```typescript
// Generate completely valid cases
const validCaseArbitrary = (): fc.Arbitrary<Case> => ...

// Generate cases with specific violations
const caseWithDuplicateTheoryIds = (): fc.Arbitrary<Case> => ...
const caseWithInvalidSourceRefs = (): fc.Arbitrary<Case> => ...
const caseWithInvalidStoryRefs = (): fc.Arbitrary<Case> => ...
```

**Investigation state generators:**
```typescript
// Generate valid investigation states
const investigationStateArbitrary = (): fc.Arbitrary<InvestigationState> => ...

// Generate states with specific conditions
const stateWithOpenedEvidence = (evidenceId: string): fc.Arbitrary<InvestigationState> => ...
```

### Example-Based Tests

Use example-based tests for:

- **Specific edge cases**: null/undefined/empty string inputs
- **UI integration**: router behavior, sealed case rendering
- **localStorage mocking**: testing save/load with mocked localStorage
- **Specific validation scenarios**: concrete cases with known violations

### Integration Tests

Integration tests verify:

- Router correctly loads cases from registry
- InvestigationProvider initializes from localStorage
- State changes trigger localStorage saves
- Validation runs before case rendering

### Test Coverage Goals

- **Unit tests**: 100% coverage of pure functions (validator, storage utilities, reducer)
- **Property tests**: All 26 correctness properties implemented
- **Integration tests**: Happy path and error scenarios for routing and state management

### Continuous Integration

Tests run on every commit:
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode during development
```

Property tests should complete in under 10 seconds with 100 iterations per property.

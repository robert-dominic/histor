# Requirements Document

## Introduction

The Histor Data Foundation provides the core data model, type system, validation logic, case registry, and investigation state management for the Histor application. This foundation ensures that all historical case data is well-structured, validated, and that user investigation progress is reliably persisted and retrieved.

## Glossary

- **Case**: A complete historical mystery including story, theories, evidence, sources, and references
- **Registry**: The collection of all available cases, including both open and sealed cases
- **Theory**: A possible explanation for a historical mystery with an assigned standing (leading, considered, or rejected)
- **Evidence**: A piece of historical information with a verified status (record, disputed, or legend)
- **Source**: A documented origin for a claim, requiring either a URL, citation, or both
- **Reference**: A tappable element in the story that opens a portal with additional context
- **Portal**: An overlay panel that provides context for a reference (person, place, term, or ship)
- **Investigation_State**: The user's progress through a case, including opened evidence, pins, and verdict
- **Router**: The application routing system that handles navigation between pages
- **Validator**: The system that verifies Case data integrity against the type contract
- **Storage_Manager**: The system that persists and retrieves investigation state from localStorage

## Requirements

### Requirement 1: Home Page Routing

**User Story:** As a user, I want to navigate to the home page and see available cases, so that I can choose which mystery to investigate.

#### Acceptance Criteria

1. WHEN the Router loads the home page path, THE Router SHALL display all entries from the registry, including both sealed and unsealed cases
2. WHEN the Router displays a sealed case entry, THE Router SHALL render the case title, year, and teaser as visible text without a clickable link or navigation action
3. WHEN the Router displays an unsealed case entry, THE Router SHALL render the case as a clickable element that navigates to `/case/<case-id>` when activated
4. WHEN a user navigates to `/case/<id>` where `<id>` does not match any registry entry id, THE Router SHALL display the text "Case not found" and a clickable link labeled "Return to home" that navigates to the home page
5. WHEN a user navigates to `/case/<id>` where `<id>` matches a registry entry with `sealed: true`, THE Router SHALL display the text "This case is sealed." and prevent access to case content
6. WHEN a user navigates to `/case/<id>` where `<id>` matches a registry entry with `sealed: false`, THE Router SHALL load and display the case content from the registry entry's data property

### Requirement 2: Case Navigation

**User Story:** As a user, I want to navigate to a specific case, so that I can view its content and investigate the mystery.

#### Acceptance Criteria

1. WHEN a user clicks an open case from the home page, THE Router SHALL navigate to `/case/<case-id>`
2. WHEN a user navigates to `/case/<case-id>` where case-id exists in the Registry and sealed is false, THE Router SHALL retrieve that case's data
3. WHEN case data retrieval completes successfully, THE Router SHALL display the case content
4. WHEN a user navigates to `/case/<case-id>` where case-id exists in the Registry and sealed is true, THE Router SHALL display "This case is sealed."
5. IF case data retrieval fails, THEN THE Router SHALL display an error message indicating the case could not be loaded
6. WHEN the Router displays a case, THE Storage_Manager SHALL load the Investigation_State for that case-id
7. WHEN the Router displays a case with existing Investigation_State, THE Router SHALL apply that state to the case view
8. THE Router SHALL preserve the Investigation_State from case load through user actions until the user navigates away from `/case/<case-id>`

### Requirement 3: Type System for Case Data

**User Story:** As a developer, I want a complete TypeScript type system for case data, so that all case content is type-safe and validated at compile time.

#### Acceptance Criteria

1. THE Type_System SHALL define Source interface with id field of type string, title field of type string, and kind field of type SourceKind
2. THE Type_System SHALL define Source as a type requiring either url field of type string, citation field of type string, or both url and citation fields
3. THE Type_System SHALL define ImageAsset interface with src field of type string, alt field of type string, credit field of type string, and isIllustration field of type boolean
4. THE Type_System SHALL define Reference interface with id field of type string, kind field of type ReferenceKind, label field of type string, profile field of type string array, and image field of type optional ImageAsset
5. THE Type_System SHALL define Theory interface with id field of type string, title field of type string, claim field of type string, standing field of type TheoryStanding, and standingReason field of type string
6. THE Type_System SHALL define Evidence interface with id field of type string, title field of type string, detail field of type string array, sources field of type NonEmptyArray<string>, reading field of type Reading, and status field of type EvidenceStatus
7. WHEN Evidence status field equals "disputed", THE Type_System SHALL require dispute field of type object containing claim field of type string and challenge field of type string through discriminated union type
8. WHEN Evidence status field equals "legend", THE Type_System SHALL require origin field of type string through discriminated union type
9. THE Type_System SHALL define StorySection interface with id field of type string, kicker field of type optional string, heading field of type string, body field of type string array, and hook field of type optional string
10. THE Type_System SHALL define Case interface with id field of type string, title field of type string, year field of type number, teaser field of type string, legendIntro field of type LegendIntro, story field of type StorySection array, theories field of type Theory array, evidence field of type Evidence array, sources field of type Source array, references field of type Reference array, and theme field of type CaseTheme
11. THE Type_System SHALL enforce type constraints through TypeScript compile-time type checking such that invalid case data produces TypeScript compiler errors
12. THE Type_System SHALL define NonEmptyArray<T> as a tuple type requiring minimum one element of type T

### Requirement 4: Case Registry

**User Story:** As a developer, I want a case registry system, so that I can manage both open and sealed cases in the application.

#### Acceptance Criteria

1. THE Registry SHALL maintain a list of all cases with id, title, year, and teaser
2. THE Registry SHALL include each case exactly once in the list, identified by unique id
3. WHEN a case is sealed, THE Registry SHALL include a RegistryEntry with sealed set to true and no data field
4. WHEN a case is open, THE Registry SHALL include a RegistryEntry with sealed set to false and the data field containing the full Case object
5. WHEN a lookup is requested with a valid case id, THE Registry SHALL return the corresponding RegistryEntry
6. IF a lookup is requested with an id that does not exist in the Registry, THEN THE Registry SHALL return undefined
7. IF a lookup is requested with null, undefined, or empty string as id, THEN THE Registry SHALL return undefined

### Requirement 5: Investigation State Management

**User Story:** As a user, I want my investigation progress to be saved, so that I can leave and return to continue where I left off.

#### Acceptance Criteria

1. THE Investigation_State SHALL track opened evidence ids in an ordered array with a maximum of 100 entries
2. THE Investigation_State SHALL track pins in an object mapping evidence id to theory id or "none" with a maximum of 100 entries
3. THE Investigation_State SHALL track the verdict as a theory id or null
4. THE Investigation_State SHALL initialize with empty opened array, empty pins object, and null verdict
5. WHEN a user opens evidence, THE Investigation_State SHALL add the evidence id to the end of the opened array
6. IF a user opens evidence that already exists in the opened array, THEN THE Investigation_State SHALL not modify the opened array
7. WHEN a user pins evidence to a valid theory id or "none", THE Investigation_State SHALL record the evidence id and target in the pins object
8. IF a user attempts to pin evidence to an invalid theory id, THEN THE Investigation_State SHALL reject the operation and preserve the existing pin value if any
9. WHEN a user closes the case with a valid theory id, THE Investigation_State SHALL record the theory id as verdict
10. IF a user attempts to close the case with an invalid theory id, THEN THE Investigation_State SHALL reject the operation and leave verdict as null
11. WHEN a user reopens the case, THE Investigation_State SHALL reset opened to empty array, pins to empty object, and verdict to null

### Requirement 6: LocalStorage Persistence

**User Story:** As a user, I want my investigation progress saved in my browser, so that my progress persists across sessions without requiring an account.

#### Acceptance Criteria

1. WHEN an investigation action completes, THE Storage_Manager SHALL serialize the InvestigationState to JSON and save it to localStorage within 100 milliseconds
2. WHEN a case loads, THE Storage_Manager SHALL attempt to load investigation state from localStorage before rendering the investigation interface
3. THE Storage_Manager SHALL use the storage key format "histor-case-{caseId}" where caseId is the Case.id value
4. IF localStorage save operation fails, THEN THE Storage_Manager SHALL allow the investigation to continue with in-memory state only
5. IF localStorage load operation fails due to localStorage being unavailable, THEN THE Storage_Manager SHALL initialize investigation state to {opened: [], pins: {}, verdict: null}
6. IF loaded localStorage data fails JSON parsing, THEN THE Storage_Manager SHALL initialize investigation state to {opened: [], pins: {}, verdict: null}
7. IF loaded localStorage data parses as JSON but does not contain required fields (opened array, pins object, verdict), THEN THE Storage_Manager SHALL initialize investigation state to {opened: [], pins: {}, verdict: null}
8. IF localStorage key for the case does not exist, THEN THE Storage_Manager SHALL initialize investigation state to {opened: [], pins: {}, verdict: null}

### Requirement 7: Case Data Validation

**User Story:** As a developer, I want a validation function for case data, so that I can verify data integrity before rendering a case.

#### Acceptance Criteria

1. THE Validator SHALL accept a Case object as input
2. THE Validator SHALL verify that case.id is a non-empty string
3. THE Validator SHALL verify that case.title is a non-empty string
4. THE Validator SHALL verify that case.year is a positive integer
5. THE Validator SHALL verify that case.teaser is a non-empty string
6. THE Validator SHALL verify that case.legendIntro contains at least one line
7. THE Validator SHALL verify that case.story contains at least one section
8. THE Validator SHALL verify that case.centralQuestion is a non-empty string
9. THE Validator SHALL verify that case.theories contains at least one theory
10. THE Validator SHALL verify that case.evidence contains at least one evidence item
11. THE Validator SHALL verify that case.sources contains at least one source
12. THE Validator SHALL verify that case.historiansSummary contains at least one paragraph
13. THE Validator SHALL verify that case.closeThreshold is a non-negative integer not exceeding the evidence array length
14. THE Validator SHALL verify that all theory ids are unique within the theories array
15. THE Validator SHALL verify that all evidence ids are unique within the evidence array
16. THE Validator SHALL verify that all source ids are unique within the sources array
17. THE Validator SHALL verify that all reference ids are unique within the references array
18. THE Validator SHALL verify that every evidence item lists at least one source id
19. WHEN an evidence item lists a source id, THE Validator SHALL verify that source id exists in the sources array
20. WHEN an evidence reading lists theory ids in supports array, THE Validator SHALL verify each theory id exists in the theories array
21. WHEN an evidence reading lists theory ids in weakens array, THE Validator SHALL verify each theory id exists in the theories array
22. WHEN a story body paragraph contains {{ref: markup, THE Validator SHALL verify the reference id exists in the references array
23. WHEN a story body paragraph contains {{ref: markup, THE Validator SHALL verify the markup follows the pattern {{ref:id|label}} where id contains no whitespace and label is non-empty
24. WHEN a reference lists source ids, THE Validator SHALL verify each source id exists in the sources array
25. IF validation encounters any constraint violation, THEN THE Validator SHALL add a descriptive error message to the results array including the field path and constraint violated
26. IF validation completes with no constraint violations, THEN THE Validator SHALL return an empty array
27. THE Validator SHALL return an array of strings where each string describes one validation error

### Requirement 8: Source Validation

**User Story:** As a content creator, I want sources to be validated, so that every claim has proper attribution.

#### Acceptance Criteria

1. THE Validator SHALL verify that every Source has either a URL or citation
2. THE Validator SHALL verify that Source kind is one of: testimony, official, secondary, fiction
3. THE Validator SHALL verify that Source id is a non-empty string
4. THE Validator SHALL verify that Source title is a non-empty string

### Requirement 9: Reference Validation in Story Text

**User Story:** As a developer, I want story references to be validated, so that all {{ref:id|label}} markup points to valid references.

#### Acceptance Criteria

1. THE Validator SHALL extract all reference markup from story body paragraphs
2. THE Validator SHALL verify that each referenced id exists in the references array
3. WHEN a reference id is invalid, THE Validator SHALL report which story section contains it
4. THE Validator SHALL support the reference markup format: {{ref:<id>|<label>}}

### Requirement 10: Property-Based Testing

**User Story:** As a developer, I want property-based tests for the data foundation, so that edge cases and data invariants are verified across many inputs.

#### Acceptance Criteria

1. WHEN the Validator receives a Case object with all required fields present and all id references valid, THE Validator SHALL return an empty error array
2. WHEN the Validator receives a Case object where two or more Theory objects share the same id value, THE Validator SHALL return an error array containing at least one error indicating duplicate theory ids
3. WHEN the Validator receives a Case object where Evidence.sources, Evidence.reading.supports, Evidence.reading.weakens, or Reference.sources contains an id that does not exist in the Case.sources or Case.theories arrays respectively, THE Validator SHALL return an error array containing at least one error indicating the invalid reference
4. WHEN the Validator receives a Case object where any Evidence object has an empty sources array, THE Validator SHALL return an error array containing at least one error indicating violation of NonEmptyArray constraint
5. WHEN an Investigation_State has an evidence id added to its opened array, THE evidence id SHALL appear in the opened array in the order it was added
6. WHEN evidence is pinned to a theory in an Investigation_State, THEN WHEN that evidence id is used to look up the pin, THE lookup SHALL return the PinTarget value that was assigned
7. WHEN an Investigation_State object is serialized to storage format THEN deserialized back, THE resulting object SHALL have opened array with same ids in same order, pins record with same key-value pairs, and same verdict value as the original
8. WHEN the Storage_Manager attempts to parse localStorage data that is not valid JSON, THE Storage_Manager SHALL return an Investigation_State object with opened as empty array, pins as empty object, and verdict as null, without throwing an exception
9. WHEN the Storage_Manager attempts to read from localStorage and the key does not exist, THE Storage_Manager SHALL return an Investigation_State object with opened as empty array, pins as empty object, and verdict as null, without throwing an exception

### Requirement 11: Non-Empty Array Enforcement

**User Story:** As a developer, I want type-level enforcement that evidence has at least one source, so that sourceless evidence cannot be created.

#### Acceptance Criteria

1. THE Type_System SHALL define NonEmptyArray<T> as [T, ...T[]]
2. THE Evidence type SHALL use NonEmptyArray<string> for the sources field
3. THE Type_System SHALL reject Evidence objects with empty sources arrays at compile time

### Requirement 12: Investigation Actions

**User Story:** As a developer, I want a typed action system for investigation state changes, so that all state mutations are type-safe and explicit.

#### Acceptance Criteria

1. THE Investigation_Actions SHALL define OPEN_EVIDENCE action with evidenceId
2. THE Investigation_Actions SHALL define PIN_EVIDENCE action with evidenceId and target
3. THE Investigation_Actions SHALL define CLOSE_CASE action with theoryId
4. THE Investigation_Actions SHALL define REOPEN_CASE action with no parameters
5. THE Investigation_State_Reducer SHALL handle all four action types
6. THE Investigation_State_Reducer SHALL maintain state immutability

### Requirement 13: Theme Configuration

**User Story:** As a content creator, I want each case to have its own theme with colors and sounds, so that each mystery has a unique atmosphere.

#### Acceptance Criteria

1. THE CaseTheme SHALL include an id that maps to CSS custom properties
2. THE CaseTheme SHALL support optional ambientAudio for looping background sound
3. THE CaseTheme SHALL support optional sound effects for stamp, open, pin, portal, and close actions
4. THE Case SHALL include a theme field of type CaseTheme

### Requirement 14: Legend Intro Structure

**User Story:** As a content creator, I want to structure legend intros with lines, stamp text, and debunk text, so that the legend reveal follows a consistent pattern.

#### Acceptance Criteria

1. THE LegendIntro SHALL include a lines array for the legend narrative
2. THE LegendIntro SHALL include stamp text shown on the visual stamp
3. THE LegendIntro SHALL include debunk text shown after the stamp appears
4. THE Case SHALL include a legendIntro field of type LegendIntro

### Requirement 15: Fork Configuration

**User Story:** As a content creator, I want to configure the fork prompt and button labels, so that each case can use appropriate language for its context.

#### Acceptance Criteria

1. THE Fork SHALL include a prompt string asking if the user wants to continue
2. THE Fork SHALL include an investigateLabel for the button that continues to the board
3. THE Fork SHALL include a leaveLabel for the button that shows the summary
4. THE Case SHALL include a fork field of type Fork

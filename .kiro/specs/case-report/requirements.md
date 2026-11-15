# Requirements Document

## Introduction

When the user closes a case, Histor shows a **case report** (product.md, step 6). The report mirrors the user's reasoning: what they concluded, what they relied on, what they missed, and where historians stand. It is not graded.

This spec covers only the logic layer:

1. A pure function, the Report_Builder, in `src/lib/case-report.ts`, that builds a Case_Report from a case and an investigation state.
2. The report's types, declared in the same file.
3. Unit tests and property-based tests (Vitest + fast-check) in `src/lib/__tests__/`.

Out of scope: any UI, the verdict screen, closing the case, storage, audio, and any change to `src/types/case.ts`, to the investigation reducer, or to case content.

## Glossary

- **Report_Builder**: The pure function exported from `src/lib/case-report.ts` that returns a Case_Report.
- **Case**: A case as typed in `src/types/case.ts`, with its `theories`, `evidence` and `historiansSummary`.
- **State**: The user's investigation, typed as `InvestigationState` in `src/types/case.ts`: `opened` (evidence ids), `pins` (evidence id → theory id or `"none"`) and `verdict` (a theory id or `null`).
- **Case_Report**: The value the Report_Builder returns. Its parts are the Verdict, the Pin_Readings, Relied_On, Against_Verdict, Never_Opened, Legends_Trusted and Historians_Stand.
- **Known_Evidence**: An evidence item whose id appears in `case.evidence`.
- **Known_Theory**: A theory whose id appears in `case.theories`.
- **Opened_Set**: The ids in `state.opened` that belong to Known_Evidence, without duplicates.
- **Valid_Pin**: An entry of `state.pins` whose key is the id of Known_Evidence and whose value is either the id of a Known_Theory or `"none"`.
- **Chosen_Theory**: The Known_Theory whose id equals `state.verdict`. There is no Chosen_Theory when `state.verdict` is `null` or is not the id of a Known_Theory.
- **Linked**: An evidence item is Linked to a theory when the theory's id appears in the item's `reading.supports` or in its `reading.weakens`.
- **Historians_Reading**: For a Valid_Pin, one of three values describing how historians read the pinned file against the user's choice: `agree`, `disagree` or `no-link`. Defined in Requirement 2.
- **Case_Order**: The order in which items appear in `case.evidence` or `case.theories`.

## Requirements

### Requirement 1: The verdict

**User Story:** As a user who has closed the case, I want to see the theory I chose and, for the first time, how historians rate it, so that the reveal is earned.

#### Acceptance Criteria

1. WHEN a Chosen_Theory exists, THE Report_Builder SHALL include a Verdict holding the Chosen_Theory's id, title, claim, standing and standingReason.
2. WHEN no Chosen_Theory exists, THE Report_Builder SHALL set the Verdict to `null` and still return every other part of the Case_Report.

### Requirement 2: How historians read each pin

**User Story:** As a user, I want each file I pinned shown next to how historians read it, so that I can compare my reasoning with theirs, file by file.

#### Acceptance Criteria

1. THE Report_Builder SHALL include one Pin_Reading for every Valid_Pin, and none for any other entry of `state.pins`.
2. Each Pin_Reading SHALL hold the evidence id, title and status, the pin target (a theory id or `"none"`), the Historians_Reading, and the evidence's `reading.note`.
3. WHEN the pin target is a theory id that appears in the evidence's `reading.supports`, THE Report_Builder SHALL set the Historians_Reading to `agree`.
4. WHEN the pin target is a theory id that appears in the evidence's `reading.weakens` and not in its `reading.supports`, THE Report_Builder SHALL set the Historians_Reading to `disagree`.
5. WHEN the pin target is a theory id that appears in neither list, THE Report_Builder SHALL set the Historians_Reading to `no-link`.
6. WHEN the pin target is `"none"` and the evidence's `reading.supports` is empty, THE Report_Builder SHALL set the Historians_Reading to `agree`.
7. WHEN the pin target is `"none"` and the evidence's `reading.supports` is not empty, THE Report_Builder SHALL set the Historians_Reading to `disagree`.
8. THE Report_Builder SHALL list Pin_Readings in the Case_Order of their evidence.

Note on 2.3 and 2.4: if a theory appears in both lists of the same file, `agree` wins. The validator does not forbid this, so the rule must be fixed.

Note on 2.6 and 2.7: "None of them" agrees with historians when they say the file supports no theory. A file that only weakens theories, such as "The inquiry's findings", supports none, so "None of them" agrees.

### Requirement 3: Relied on

**User Story:** As a user, I want to see the files I used to back my verdict, so that I can see what my conclusion rests on.

#### Acceptance Criteria

1. WHEN a Chosen_Theory exists, THE Report_Builder SHALL list in Relied_On every Known_Evidence item that has a Valid_Pin whose target is the Chosen_Theory's id.
2. WHEN no Chosen_Theory exists, THE Report_Builder SHALL return an empty Relied_On.
3. Each Relied_On entry SHALL hold the evidence id, title, status and the Historians_Reading of its pin.

### Requirement 4: Against your verdict

**User Story:** As a user, I want to see the files I read that historians say count against my verdict, so that I face the evidence I may have brushed aside.

#### Acceptance Criteria

1. WHEN a Chosen_Theory exists, THE Report_Builder SHALL list in Against_Verdict every evidence item in the Opened_Set whose `reading.weakens` contains the Chosen_Theory's id.
2. WHEN no Chosen_Theory exists, THE Report_Builder SHALL return an empty Against_Verdict.
3. Each Against_Verdict entry SHALL hold the evidence id, title, status and `reading.note`.

### Requirement 5: Never opened

**User Story:** As a user, I want to know which important files I never opened, so that I can see what my verdict did not take into account.

#### Acceptance Criteria

1. WHEN a Chosen_Theory exists, THE Report_Builder SHALL list in Never_Opened every Known_Evidence item that is not in the Opened_Set and is Linked to the Chosen_Theory.
2. WHEN no Chosen_Theory exists, THE Report_Builder SHALL return an empty Never_Opened.
3. Each Never_Opened entry SHALL hold the evidence id, title, and whether historians say it supports or weakens the Chosen_Theory.
4. THE Report_Builder SHALL never list an evidence id in Never_Opened that is in the Opened_Set.
5. Never_Opened entries SHALL NOT reveal the evidence's status, because status is earned by opening the file (product.md, "Reveal, don't tell").

### Requirement 6: Legends trusted

**User Story:** As a user, I want to know when I backed a theory with a legend, so that I learn which parts of the story were invented ("You trusted a novelist").

#### Acceptance Criteria

1. THE Report_Builder SHALL list in Legends_Trusted every Known_Evidence item with status `legend` that has a Valid_Pin whose target is a theory id (not `"none"`).
2. Each Legends_Trusted entry SHALL hold the evidence id, title, the theory id it was pinned to, and the evidence's `origin`.
3. THE Report_Builder SHALL fill Legends_Trusted whether or not a Chosen_Theory exists.

### Requirement 7: Where historians stand

**User Story:** As a user, I want to see how historians rate every theory, so that I finish knowing what is known and that no one knows for sure.

#### Acceptance Criteria

1. THE Report_Builder SHALL include in Historians_Stand every theory of the case, in Case_Order, with its id, title, standing and standingReason.
2. THE Report_Builder SHALL include the case's `historiansSummary`, unchanged and in order.
3. THE Report_Builder SHALL fill Historians_Stand whether or not a Chosen_Theory exists.

### Requirement 8: A mirror, not a grade

**User Story:** As the product owner, I want the report to reflect the user's reasoning without judging it, so that Histor stays "game-like, never a game" (product.md).

#### Acceptance Criteria

1. THE Case_Report SHALL contain no score, grade, percentage, count of correct answers, or any field that marks the user right or wrong.
2. THE Historians_Reading values SHALL describe how historians read a file against the user's choice, and SHALL be named `agree`, `disagree` and `no-link`.

### Requirement 9: Robust and deterministic

**User Story:** As a developer, I want the Report_Builder to work on any saved state, so that a stale or corrupted investigation never breaks the verdict screen.

#### Acceptance Criteria

1. THE Report_Builder SHALL return a Case_Report without throwing, for every Case that type-checks and for every State, including a State whose fields hold values of the wrong type at runtime.
2. THE Report_Builder SHALL ignore every id in the State that does not belong to the Case: unknown evidence ids in `opened` or in the keys of `pins`, unknown theory ids in the values of `pins`, and an unknown `verdict`.
3. THE Report_Builder SHALL ignore duplicate ids in `state.opened`.
4. Every evidence id and theory id in the Case_Report SHALL belong to the Case.
5. THE Report_Builder SHALL list evidence in every part of the Case_Report in Case_Order, and theories in Case_Order, so that the output does not depend on the order of `state.opened` or of the keys of `state.pins`.
6. THE Report_Builder SHALL be a pure function: it SHALL return equal Case_Reports for equal inputs, SHALL NOT modify the Case or the State, and SHALL read and write no external state.

### Requirement 10: Tests

**User Story:** As a developer, I want the Report_Builder's rules checked by tests, so that they keep holding as cases and states change.

#### Acceptance Criteria

1. Property-based tests with fast-check SHALL check that the Report_Builder never throws on any State, including States with unknown ids and values of the wrong type.
2. A property-based test SHALL check that every legend file pinned to a theory appears in Legends_Trusted.
3. A property-based test SHALL check that no evidence id is in both Never_Opened and the Opened_Set.
4. A property-based test SHALL check that every evidence id and theory id in the Case_Report belongs to the Case.
5. A property-based test SHALL check that equal inputs give equal Case_Reports, and that the inputs are not modified.
6. Unit tests SHALL check each part of the Case_Report against the Mary Celeste case with hand-built States, including a State with no verdict.

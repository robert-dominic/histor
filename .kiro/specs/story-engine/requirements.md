# Requirements Document

## Introduction

Case text in Histor can contain portal markup of the form `{{ref:<referenceId>|<label>}}`, for example `The {{ref:dei-gratia|Dei Gratia}} found her drifting.` The label is what the reader sees. The reference id points to an entry in `case.references`. A later UI spec will turn each ref into a tappable portal.

This spec covers only the logic layer:

1. A pure parser (`src/lib/parse-refs.ts`) that splits any string into an ordered list of text and ref segments, losslessly.
2. An extension of `validateCase` (`src/lib/validate-case.ts`) that uses the parser to check every markup-bearing text field in a case.
3. Property-based and unit tests (Vitest + fast-check) in `src/lib/__tests__/`.

Out of scope: UI, portal panels, story rendering, animation, any change to `src/types/case.ts`, and any change to case content. Segment types are declared in `src/lib/parse-refs.ts`, because `src/types/case.ts` is a fixed contract.

## Glossary

- **Parser**: The pure function exported from `src/lib/parse-refs.ts` that turns a string into a Segment_List.
- **Serializer**: The pure function exported from `src/lib/parse-refs.ts` that turns a Segment_List back into a string by concatenating each segment's Raw_Text.
- **Validator**: The existing `validateCase` function in `src/lib/validate-case.ts`.
- **Segment**: One element of a Segment_List. A Segment is either a Text_Segment or a Ref_Segment.
- **Segment_List**: The ordered array of Segments the Parser returns for one input string.
- **Text_Segment**: A Segment holding a run of plain text, exactly as written in the input.
- **Ref_Segment**: A Segment produced from one Well_Formed_Ref. It holds the reference id, the label, and the Raw_Text of the markup.
- **Raw_Text**: The exact substring of the input that a Segment was produced from. For a Text_Segment this is its text. For a Ref_Segment this is the full markup, from the opening `{{` to the closing `}}` inclusive.
- **Ref_Id**: A string matching the regular expression `^[a-z0-9]+(-[a-z0-9]+)*$`: one or more groups of lowercase ASCII letters and digits, joined by single hyphens. Examples: `briggs`, `dei-gratia`, `e-lifeboat`, `ref1`. Non-examples: `Briggs`, `dei gratia`, `-briggs`, `briggs-`, `dei--gratia`, `dei_gratia`, the empty string.
- **Ref_Label**: A string of one or more characters that contains none of the characters `{`, `}` or `|`, and contains at least one non-whitespace character. Whitespace inside the label, including leading and trailing whitespace, is kept exactly as written.
- **Well_Formed_Ref**: A substring that is exactly `{{ref:` followed by a Ref_Id, followed by `|`, followed by a Ref_Label, followed by `}}`. The prefix `ref:` is case-sensitive and has no whitespace before or after the colon. Nested markup is not allowed, because a Ref_Label cannot contain `{` or `}`.
- **Malformed_Markup**: An occurrence of the two-character sequence `{{` that lies entirely inside a Text_Segment of the Parser's output, meaning the `{{` does not begin a Well_Formed_Ref. Occurrences are counted literally: each position inside a Text_Segment where a `{{` sequence starts is one occurrence, including overlapping positions. For example, a Text_Segment containing `{{{x` holds two occurrences, one at each of its first two positions.
- **Markup_Field**: A case text field that may contain portal markup. The Markup_Fields are: every string in `story[i].body`, `story[i].hook` when present, every string in `evidence[i].detail`, and every string in `references[i].profile`.
- **Field_Location**: The path of a Markup_Field within the case, written as `story[<i>].body[<j>]`, `story[<i>].hook`, `evidence[<i>].detail[<j>]` or `references[<i>].profile[<j>]`, with zero-based indexes.
- **Plain_Field**: Any string field of the case that is not a Markup_Field, including strings inside arrays and nested objects. Examples: `title`, `teaser`, `centralQuestion`, `legendIntro.lines[<j>]`, `theories[<i>].claim`, `story[<i>].heading`, `evidence[<i>].dispute.claim`, `references[<i>].label`, `sources[<i>].citation`.
- **Field_Path**: The path of a Plain_Field within the case, written in the same notation as Field_Location: property names joined by `.`, with zero-based array indexes in square brackets. Examples: `title`, `theories[0].claim`, `story[1].heading`, `evidence[2].dispute.claim`. In Requirement 4, `<path>` stands for the Field_Path.

Note on Plain_Fields: no renderer parses markup in a Plain_Field, so any `{{ref:...}}` written there would reach the reader as raw markup. The Validator therefore rejects `{{` in every Plain_Field.

## Requirements

### Requirement 1: Parse text into segments

**User Story:** As a developer building the story renderer, I want case text split into plain text and refs, so that I can render each ref as a portal trigger without parsing markup myself.

#### Acceptance Criteria

1. THE Parser SHALL accept any JavaScript string as input and return a Segment_List.
2. THE Parser SHALL return a Segment_List without throwing an exception, for every input string.
3. WHEN the input contains a Well_Formed_Ref, THE Parser SHALL emit one Ref_Segment for that Well_Formed_Ref, holding its Ref_Id as the id, its Ref_Label as the label, and the full markup as its Raw_Text.
4. THE Parser SHALL emit Segments in the same order as their Raw_Text appears in the input.
5. THE Parser SHALL scan the input from left to right, and at each position where a Well_Formed_Ref begins, THE Parser SHALL consume that Well_Formed_Ref as one Ref_Segment and continue scanning after its closing `}}`.
6. THE Parser SHALL place every input character that is not part of a consumed Well_Formed_Ref into a Text_Segment, unchanged.
7. WHEN the input is the empty string, THE Parser SHALL return an empty Segment_List.
8. WHEN a non-empty input contains no `{{` sequence, THE Parser SHALL return a Segment_List containing exactly one Text_Segment whose text equals the input.
9. THE Parser SHALL emit only Text_Segments whose text has a length of at least 1 character.
10. THE Parser SHALL merge adjacent plain text into one Text_Segment, so that no two Text_Segments are neighbours in the Segment_List.
11. THE Parser SHALL emit only Ref_Segments whose id is a Ref_Id and whose label is a Ref_Label.
12. THE Parser SHALL be a pure function that returns equal Segment_Lists for equal inputs and reads or writes no external state.

### Requirement 2: Keep malformed markup as plain text

**User Story:** As a content author, I want a typo in markup to show up as visible text rather than vanish or crash the story, so that mistakes are easy to spot and the validator can report them.

#### Acceptance Criteria

1. IF the input contains `{{` with no later `}}` (unclosed markup), THEN THE Parser SHALL keep that `{{` and the characters after it as plain text, exactly as written.
2. IF the input contains `{{ref:<id>}}` with no `|` (missing label), THEN THE Parser SHALL keep that markup as plain text, exactly as written.
3. IF the input contains `{{ref:|<label>}}` (empty id), THEN THE Parser SHALL keep that markup as plain text, exactly as written.
4. IF the input contains `{{ref:<id>|}}` or a label made only of whitespace (empty label), THEN THE Parser SHALL keep that markup as plain text, exactly as written.
5. IF the input contains `{{` followed by a prefix other than exactly `ref:`, such as `{{foo:x|y}}`, `{{REF:x|y}}` or `{{ ref:x|y}}` (wrong prefix), THEN THE Parser SHALL keep that markup as plain text, exactly as written.
6. IF the input contains `{{ref:<id>|<label>}}` where the id is not a Ref_Id, such as `Briggs`, `dei gratia` or `dei_gratia` (invalid id), THEN THE Parser SHALL keep that markup as plain text, exactly as written.
7. IF the input contains `{{ref:<id>|<label>}}` where the label contains `|`, `{` or `}`, such as `{{ref:a|b|c}}` (invalid label), THEN THE Parser SHALL keep that markup as plain text, exactly as written.
8. IF a Well_Formed_Ref appears inside the label position of other markup, such as `{{ref:a|b {{ref:c|d}}}}` (nested markup), THEN THE Parser SHALL emit the inner Well_Formed_Ref as a Ref_Segment and keep the surrounding outer characters as plain text, exactly as written.
9. WHEN extra `{` characters precede a Well_Formed_Ref, such as `{{{ref:a|b}}`, THE Parser SHALL keep the extra leading characters as plain text and emit the Well_Formed_Ref as a Ref_Segment.

### Requirement 3: Lossless round trip

**User Story:** As a developer, I want to rebuild the exact original text from the segments, so that parsing never loses or alters a single character of case content.

#### Acceptance Criteria

1. THE Serializer SHALL return the concatenation of the Raw_Text of every Segment in the Segment_List, in order.
2. FOR ALL input strings, serializing the Parser's Segment_List SHALL produce a string equal to the input (round-trip property).
3. FOR ALL input strings, parsing the Serializer's output of the Parser's Segment_List SHALL produce a Segment_List equal to the first Segment_List (parse, print, parse property).

### Requirement 4: Validate refs in all markup fields

**User Story:** As a content author, I want `validateCase` to check every ref in every text field that can hold markup, so that no portal in a shipped case points to a missing reference.

#### Acceptance Criteria

1. THE Validator SHALL use the Parser to find refs and Malformed_Markup in every Markup_Field of the case.
2. WHEN a Ref_Segment in a Markup_Field has an id that does not match any `id` in `case.references`, THE Validator SHALL add the error `Field <Field_Location>: reference ID '<id>' not found in references`.
3. WHEN a Markup_Field contains Malformed_Markup of the form `{{ref:<Ref_Id>|<label>}}` whose label is empty or only whitespace, THE Validator SHALL add the error `Field <Field_Location>: Invalid reference markup - label cannot be empty`.
4. WHEN a Markup_Field contains any other Malformed_Markup, THE Validator SHALL add an error that starts with `Field <Field_Location>: Invalid reference markup` and quotes the malformed text starting at the offending `{{`, truncated to at most 40 code points.
5. THE Validator SHALL add one error per Malformed_Markup occurrence and one error per unknown Ref_Segment id occurrence.
6. WHEN every Markup_Field contains only Ref_Segments with known ids, no Malformed_Markup, and no Text_Segment containing `{` or `}`, THE Validator SHALL add no markup-related errors, including no stray-brace errors (criterion 4.13).
7. THE Validator SHALL replace the existing regex-based story body ref check with the Parser-based check, so that each markup problem in `story[i].body` produces its error once.
8. THE Validator SHALL remain a pure function of its `Case` argument.
9. THE Validator SHALL keep all non-markup checks unchanged, so that every existing test in `src/lib/__tests__/validate-case.test.ts` and `src/lib/__tests__/validate-case.property.test.ts` passes unchanged, except that assertions which check the error messages of the old regex-based story body ref check may be updated to the message format in criteria 4.2 to 4.4, and existing test generators whose idea of a valid case is invalid under the new rules may be updated (for example, adding a filter so that `nonEmptyString()` in `validate-case.property.test.ts` never yields a string containing `{{`). Every such changed assertion and every such generator change SHALL be listed in the task report.
10. THE Validator SHALL return no errors for every open case in `src/cases/index.ts`, as checked by the existing registry validation test.
11. WHEN any string field of the case that is not a Markup_Field contains `{{`, THE Validator SHALL add the error `Field <path>: portal markup is not allowed in this field`, where `<path>` is the Field_Path of that Plain_Field, once per Plain_Field.
12. WHEN the `id` of `references[<i>]` in `case.references` is not a Ref_Id, THE Validator SHALL add the error `Field references[<i>].id: '<id>' is not a valid reference ID`, naming that reference's index and id, because no markup could ever point to that reference.
13. WHEN a Text_Segment in a Markup_Field contains `{` or `}` but does not contain `{{`, THE Validator SHALL add exactly one error `Field <Field_Location>: Stray brace near '<excerpt>'`, where the excerpt starts at the first `{` or `}` in that Text_Segment and is truncated to at most 40 code points.

Note on criterion 4.13: this check catches `{{{ref:a|b}}`, `{{ref:a|b}}}` and the leftover `}}` after nested markup such as `{{ref:a|b {{ref:c|d}}}}`. Without it, these inputs would pass validation and show a stray brace to readers. A Text_Segment that contains `{{` is already reported under criterion 4.4 and gets no stray-brace error.

### Requirement 5: Property-based tests

**User Story:** As a developer, I want property-based tests for the parser and validator, so that edge cases in arbitrary text are found automatically.

#### Acceptance Criteria

1. THE test suite SHALL place property-based tests in files named `*.property.test.ts` under `src/lib/__tests__/`, written with fast-check and run by Vitest with at least 100 runs per property.
2. THE test suite SHALL include a property that the Parser returns without throwing for arbitrary strings, including full Unicode strings and strings built from markup fragments (`{{`, `}}`, `ref:`, `|`, ids and labels).
3. THE test suite SHALL include a property that serializing the Parser's output equals the input, for the same generators as criterion 5.2.
4. THE test suite SHALL include a property that any non-empty string with no `{{` parses to exactly one Text_Segment equal to the input.
5. THE test suite SHALL include a property that every Ref_Segment has an id matching the Ref_Id pattern and a label satisfying the Ref_Label definition.
6. THE test suite SHALL include a property that no Text_Segment is empty and no two Text_Segments are adjacent.
7. THE test suite SHALL include a property that a string built by joining generated plain text with generated Well_Formed_Refs parses to Ref_Segments with exactly the generated ids and labels, in order.
8. THE test suite SHALL include a property that, for a generated valid case with generated Well_Formed_Refs to known reference ids inserted into each kind of Markup_Field, the Validator returns no errors.
9. THE test suite SHALL include a property that, for a generated valid case with a ref to an unknown id inserted into a generated Markup_Field, the Validator returns an error naming that Field_Location and that id.
10. THE test suite SHALL include a property that, for a generated valid case with `{{` inserted into a generated Plain_Field, the Validator returns the error `Field <path>: portal markup is not allowed in this field` with the Field_Path of that Plain_Field.
11. THE test suite SHALL include a property that, for a generated valid case, inserting `{` directly before a Well_Formed_Ref to a known reference id in a generated Markup_Field produces exactly one stray-brace error (criterion 4.13) for that Field_Location and no other errors. The generated text around the inserted `{` SHALL contain no `{` or `}` characters, so that the inserted `{` cannot join a neighbouring brace.

### Requirement 6: Unit tests for malformed and edge cases

**User Story:** As a developer, I want explicit examples for each malformed form, so that the definition of a Well_Formed_Ref is documented by tests.

#### Acceptance Criteria

1. THE test suite SHALL include unit tests in `src/lib/__tests__/parse-refs.test.ts` showing that each malformed form in Requirement 2 (unclosed, missing label, empty id, empty label, whitespace-only label, wrong prefix, uppercase prefix, space before prefix, invalid id, label containing `|`, nested markup, extra leading `{`) produces the Segment_List stated in that requirement.
2. THE test suite SHALL include unit tests showing that the empty string yields an empty Segment_List, and that `The {{ref:dei-gratia|Dei Gratia}} found her drifting.` yields a Text_Segment, a Ref_Segment with id `dei-gratia` and label `Dei Gratia`, and a Text_Segment, in that order.
3. THE test suite SHALL include unit tests showing that refs at the start, at the end, and back to back with no text between them parse correctly.
4. THE test suite SHALL include unit tests in `src/lib/__tests__/validate-case.test.ts` showing that the Validator reports unknown ids and Malformed_Markup with the correct Field_Location for each Markup_Field kind: `story[i].body[j]`, `story[i].hook`, `evidence[i].detail[j]` and `references[i].profile[j]`.
5. THE test suite SHALL include unit tests in `src/lib/__tests__/validate-case.test.ts` showing that `{{` in a Plain_Field produces the error `Field <path>: portal markup is not allowed in this field` with the correct Field_Path, for at least a top-level field (`title`), a field inside an array item (`theories[0].claim`, `story[1].heading`) and a nested field (`evidence[2].dispute.claim`).
6. THE test suite SHALL include unit tests in `src/lib/__tests__/validate-case.test.ts` showing that a reference whose `id` is not a Ref_Id (for example `Briggs`, `dei gratia`, `dei_gratia` or the empty string) produces the error `Field references[<i>].id: '<id>' is not a valid reference ID` with that reference's index and id, and that a reference whose `id` is a Ref_Id produces no such error.
7. THE test suite SHALL include unit tests in `src/lib/__tests__/validate-case.test.ts` for criterion 4.13 showing that: `{{{ref:a|b}}` produces one stray-brace error; `{{ref:a|b}}}` produces one stray-brace error; the leftover `}}` after nested markup `{{ref:a|b {{ref:c|d}}}}` produces one stray-brace error; a lone `}` in prose produces one stray-brace error; the excerpt is truncated to at most 40 code points; and a Text_Segment that contains both `{{` and a stray `}` produces no stray-brace error.

### Requirement 7: Project conventions and build health

**User Story:** As a maintainer, I want the feature to follow project conventions, so that it fits the codebase and the build stays green.

#### Acceptance Criteria

1. THE Parser and Serializer SHALL live in `src/lib/parse-refs.ts` and be imported with the `@/` alias where other modules import from `src/`.
2. THE feature SHALL leave `src/types/case.ts` and all case content under `src/cases/` unchanged.
3. WHEN the feature is complete, THE project SHALL pass `npm test`, `npm run build` and `npm run lint` with no errors.
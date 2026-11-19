# Requirements Document

## Introduction

This spec turns `docs/briefs/desk.md` into requirements. The brief is the source of truth: nothing here adds to it or drops from it, except Requirement 1, which fixes a flaky test before the work starts, and the review decisions listed under "Decisions" at the end (D1–D8), which settle what the brief left open and change one thing in it (D7).

The desk redesigns how the investigation *looks and feels*: a night desk under one lamp, a pile of sealed files, a dark board of theories, and files you physically open, read and pin.

These stay exactly as they are (brief, introduction):

- the route URLs `/case/:id/files`, `/case/:id/files/:evidenceId`, `/case/:id/verdict` and `/case/:id/report`, exactly as they are, their redirect and "File not found" rules, and their deep links. Opening a file's URL directly shows the desk with that file open (D0);
- the `InvestigationProvider` actions `OPEN_EVIDENCE`, `PIN_EVIDENCE`, `CLOSE_CASE` and `REOPEN_CASE`, and saving per case;
- `buildCaseReport` and all report logic in `src/lib/case-report.ts`;
- `src/types/case.ts` and all case content.

Out of scope: sound (only events are emitted), and any change to the story, the fork, the home page or the legend intro.

## Glossary

- **Desk**: the screen at `/case/:id/files`, and the backdrop of an Open_File.
- **Lamp**: the single overlay of light over the Desk.
- **Board**: the dark felt strip across the top of the Desk that holds the Theory_Notes.
- **Theory_Note**: one theory on the Board, a paper note held by a brass pin.
- **Pile**: the stack of sealed folders on the Desk, lower left.
- **Folder**: one evidence file as a manila folder with a tab.
- **Sealed**: an evidence file that is not in `state.opened`.
- **Hanging_Tab**: a pinned Folder shown as a small tab beneath its Theory_Note.
- **Thread**: the `rust-night` SVG line from a Theory_Note to a Hanging_Tab.
- **Set_Aside_Tray**: the tray on the Desk for files pinned to "None of them".
- **Open_File**: the opened case folder shown at `/case/:id/files/:evidenceId`.
- **In_Hand**: an Open_File closed back into its cover after its reveal, waiting to be pinned.
- **Pin_Menu**: the "Pin to…" button and the menu of the five theories plus "None of them".
- **Historians_Slip**: the small typed slip that shows how historians read a pin (`agree`, `disagree` or `no-link`, plus `reading.note`), from `buildCaseReport`.
- **Wax_Seal**: the rust-night seal with a brass-pressed "H" on the Desk at the close threshold.
- **Desk_Event**: an event sent through `src/lib/story-events.ts`.
- **Deterministic**: the same for the same id on every render, on every device.
- **Reduced_Motion**: `prefers-reduced-motion: reduce`.
- **Phone**: a screen below 640px wide. **Desktop**: from 1024px.

## Requirements

### Requirement 1: Fix the flaky property test first

**User Story:** As a developer, I want the suite to be reliable before the desk work starts, so that every task can end on passing tests.

#### Acceptance Criteria

1. THE generator behind Property 8 in `src/lib/__tests__/validate-case.property.test.ts` SHALL produce ids that are unique within each generated case for every list it generates: sources, evidence, story sections and theories.
2. WHEN Property 8 runs with seed `-1131047925`, THE test SHALL pass.
3. THE fix SHALL change only the generator, not what Property 8 asserts and not `validateCase`.
4. THE test file SHALL pass 20 runs in a row.

### Requirement 2: The desk and the lamp

**User Story:** As a user, I want to feel I am sitting at an investigator's desk at night, so that the investigation feels physical.

#### Acceptance Criteria

1. THE Desk SHALL have a dark, night-toned surface with a hint of old wood grain, made only with CSS gradients and an SVG noise filter, with no image files, plus the existing page grain and a strong vignette.
2. THE Desk SHALL have exactly one Lamp: a warm, brass-tinted pool of light, with everything outside it in shadow at about 25% brightness.
3. ON Desktop, THE Lamp SHALL follow the mouse, with a radius of about 420px.
4. ON a Phone, THE Lamp SHALL rest over the active element and move to the last tap.
5. THE Lamp SHALL be one overlay with a radial-gradient mask driven by CSS variables, set with `gsap.quickSetter` in a requestAnimationFrame loop, with no React re-renders.
6. WHILE Reduced_Motion is on, THE Lamp SHALL be a static soft light, centred.
7. Text under the Lamp SHALL meet the normal contrast rules (4.5:1 body, 3:1 large); only the surroundings fall into shadow.

### Requirement 3: The board of theories

**User Story:** As a user, I want the theories pinned up on a board, so that I can see where my evidence is going.

#### Acceptance Criteria

1. THE Board SHALL be a dark, near-black felt strip across the top of the Desk, slightly textured.
2. THE Board SHALL show the case's 5 theories as Theory_Notes: paper notes with brass pins, each slightly rotated by a Deterministic amount per theory id, showing title and claim.
3. ON a Phone, THE Board SHALL keep the compact row from the last fix: title and pin count. Tapping a theory SHALL show its claim and its pinned files (D3).
4. Files pinned to a theory SHALL hang beneath its Theory_Note as small, overlapping Hanging_Tabs.
5. Each Hanging_Tab SHALL be joined to its Theory_Note by a Thread with a slight natural sag (an SVG path), pinned at both ends.
6. No Theory_Note SHALL show a theory's standing.

### Requirement 4: The pile of files

**User Story:** As a user, I want sealed files in a real pile, so that opening one feels like picking it up.

#### Acceptance Criteria

1. THE Pile SHALL show every Sealed file as a manila Folder, with slight offsets and rotations that are Deterministic per evidence id.
2. Each Folder SHALL have a tab with its number (01 to 23, in case order) and a typed title label.
3. Every Sealed Folder SHALL look the same from outside: no status is shown before opening.
4. ON Desktop, WHEN the pointer is over the Pile, THE Pile SHALL fan out into an arc so every tab is visible, and the Folder under the pointer SHALL lift.
5. ON a Phone, THE Pile SHALL be a horizontal fanned stack the user swipes through, and the centred Folder SHALL lift.
6. Unopened Folders SHALL stay in the Pile. Opened and pinned Folders SHALL move to the Board. Folders pinned to "None of them" SHALL move to the Set_Aside_Tray. A Folder opened but not pinned SHALL go back on top of the Pile, with its status stamp (D1).
7. Near the Pile, a line in the app's voice SHALL give the progress, in the form "4 of 23 files opened. Open 2 more to close the case."

### Requirement 5: Opening a file

**User Story:** As a user, I want to open a file like a real folder, so that reading it feels earned.

#### Acceptance Criteria

1. THE user SHALL open a Folder by clicking it, or by dragging it out of the Pile onto the Desk.
2. WHEN a Folder opens, it SHALL rise from the Pile, fly to the centre and grow (GSAP Flip), then its cover SHALL flip open: a 3D `rotateY` around its left edge, with perspective.
3. THE inside of an Open_File SHALL show, on the left (the inner cover), a manila face with a typed label in the form "HISTOR · CASE FILE 07 · THE GALLEY", and a small index card listing the sources by title, linked.
4. THE inside of an Open_File SHALL show, on the right, the document itself, held by a paper clip.
5. ON a Phone, THE Open_File SHALL fill the screen, with the inner cover's content above the document.
6. THE detail text SHALL be rendered through `parseRefs`, so portals work.
7. WHEN the Folder opens, THE Desk SHALL dispatch `OPEN_EVIDENCE`.
8. WHILE an Open_File is shown, pressing Escape SHALL close it.
9. THE Open_File SHALL keep the "Next file" and "Back to the board" links (D4).

### Requirement 6: The reveal

**User Story:** As a user, I want the paper itself to show what kind of evidence it is, so that I learn to tell record from legend.

#### Acceptance Criteria

1. THE document SHALL first appear as plain paper. After a short beat, the status stamp SHALL land, and the paper SHALL become its status.
2. **Record:** the paper SHALL be crisp, clean official paper with a typed heading, and an embossed `record`-blue seal SHALL press in beside the stamp.
3. **Disputed:** a second sheet SHALL slide in askew over the first; sheet one SHALL be headed "The claim" and sheet two "The challenge"; the claim line SHALL get a wavy `rust` underline and a hand-drawn "?" in the margin, and SHALL NOT be struck through, because disputed is not false (D7); a short note SHALL appear in the margin (Special Elite, small, `rust`): the first full sentence of `dispute.challenge`, never cut mid-sentence (D6); and the stamp SHALL land smudged.
4. **Legend:** the paper SHALL yellow and turn faintly see-through (the Desk shows through), and the ink SHALL start to drift, letters fading and returning in slow waves; a small typed slip SHALL slide out from under it: "Where this came from", with the origin.
5. AT rest, legend text SHALL reach 4.5:1, using `ghost-ink`.

### Requirement 7: Pinning

**User Story:** As a user, I want to pin a file to a theory with my hands, so that my reasoning is something I build.

#### Acceptance Criteria

1. AFTER the stamp, THE app SHALL ask in its voice, "Which theory does this point to?", and the Open_File SHALL close back into its cover (a reverse flip) and stay In_Hand in the centre.
2. ON Desktop, THE user SHALL be able to drag the In_Hand Folder (GSAP Draggable) onto a Theory_Note. While dragging, valid drop targets SHALL brighten under the Lamp.
3. WHEN the Folder is dropped on a Theory_Note, THE Thread SHALL animate from the note to the Folder, the Folder SHALL snap beneath the note, and THE Desk SHALL dispatch `PIN_EVIDENCE` with that theory.
4. WHEN the Folder is dropped on the Set_Aside_Tray, THE Desk SHALL dispatch `PIN_EVIDENCE` with `"none"`.
5. THE Pin_Menu SHALL always be available, listing the 5 theories plus "None of them", and it SHALL be the only way to pin on a Phone or with a keyboard. Dragging SHALL be an enhancement, never required.
6. AFTER pinning, a Historians_Slip SHALL appear clipped to the Folder, using the same agree / disagree / no-link logic as today (`buildCaseReport`). It SHALL open under the theory, on the Folder just pinned, until the user's next action; tapping a pinned Folder SHALL show it again (D2).
7. THE Historians_Slip SHALL stay visible on the Folder when it is reopened.
8. Reopening a pinned Folder SHALL show the user's choice and the Historians_Slip, and SHALL let the user re-pin.

### Requirement 8: Teaching itself

**User Story:** As a first-time user, I want the desk to show me what to do, so that I never need instructions.

#### Acceptance Criteria

1. ON the first visit only, THE app SHALL show hints in its voice, one at a time, next to the right element, in this order: "Open a file from the pile." · hint 2 · "Open six files to close the case."
2. Hint 2 SHALL read "Drag it to the theory you think it points to." on fine-pointer devices, and "Pin it to the theory you think it points to." on touch and when the user is using the keyboard (D5).
3. THE first visit SHALL be remembered in localStorage, read and written in try/catch, so the app works when storage is unavailable.
4. AFTER the hints have been shown once, THE app SHALL NOT show them again on later visits.
5. A small **?** button in a corner SHALL reopen a three-step guide panel at any time.

### Requirement 9: Closing the case and the report

**User Story:** As a user, I want to close the case with a seal and read a typed report, so that the ending feels formal.

#### Acceptance Criteria

1. WHEN `state.opened.length >= closeThreshold`, a Wax_Seal SHALL appear on the Desk: rust-night wax with a brass-pressed "H", labelled "Close the case". Activating it SHALL go to `/verdict`.
2. THE verdict screen SHALL lay the five Theory_Notes on the Desk under the Lamp; the 1.5s hold-to-seal SHALL press a wax seal onto the chosen note. The logic SHALL be the same as today.
3. THE report SHALL be a typed report on paper under the Lamp, with the same seven sections and logic as today, and a stamp for each theory's standing.
4. THE report SHALL keep "Reopen the case" (with the inline confirm) and "Back to all cases".

### Requirement 10: Ready for sound later

**User Story:** As a developer, I want the desk's moments as events, so that sound can be added later without touching the desk code.

#### Acceptance Criteria

1. THE Desk SHALL emit Desk_Events for: pile hover, folder open, flip, stamp, pin and seal, through the same events module as the story (`src/lib/story-events.ts`).
2. Nothing SHALL play sound.

### Requirement 11: Rules

**User Story:** As the product owner, I want the desk to follow the house rules, so that it stays fast, accessible and true to the data.

#### Acceptance Criteria

1. No content SHALL be hard-coded in components: everything SHALL come from the case data.
2. Animations SHALL use only transform, opacity, filter and clip-path, and SHALL keep 60fps. The Lamp SHALL update through CSS variables only.
3. WHILE Reduced_Motion is on: the Lamp SHALL not move, files SHALL crossfade instead of flipping, legend ink SHALL be static ghost ink, and pinning SHALL use buttons instead of dragging.
4. Every Folder, button and Theory_Note SHALL be reachable with Tab and SHALL show a visible focus ring. Enter SHALL open a Folder. The Pin_Menu SHALL work with the arrow keys and Enter. Escape SHALL close an Open_File.
5. THE Desk, Open_File, verdict and report SHALL work at 375px and 1440px wide.

### Requirement 12: Tests

**User Story:** As a developer, I want the desk's behaviour checked by tests, so that it keeps working.

#### Acceptance Criteria

1. THE existing investigation tests SHALL be updated to the new structure.
2. A test SHALL check that the Pile renders 23 Sealed Folders with no status visible.
3. A test SHALL check that opening a Folder dispatches `OPEN_EVIDENCE` and shows the status after the stamp.
4. A test SHALL check that the Pin_Menu pins the file, that it moves to the Board under the right theory, and that "None of them" moves it to the Set_Aside_Tray.
5. A test SHALL check that first-visit hints appear once and not again.
6. A test SHALL check that Reduced_Motion renders without flips or Lamp movement.

### Requirement 13: Done

1. `npm test`, `npm run build` and `npm run lint` SHALL pass.
2. THE desk SHALL be checked in Chrome at 375px and 1440px, including a full investigation to the report, once by drag and once by buttons.
3. THE work SHALL end with a report in the usual format, a `[kiro]` commit, and a push.

## Decisions (from the review)

- **D0. Routes.** The URLs stay exactly as they are. Nesting the file route under the desk route is fine. Opening a file's URL directly shows the desk with that file open.
- **D1. Opened but not pinned:** back on top of the Pile, with its status stamp.
- **D2. The Historians_Slip after pinning:** it opens under the theory, on the Folder just pinned, until the user's next action. Tapping a pinned Folder shows it again.
- **D3. Phones:** tapping a theory shows its claim and its pinned files.
- **D4. Links:** keep "Next file" and "Back to the board".
- **D5. Hint 2:** "Drag it to the theory you think it points to." on fine-pointer devices; "Pin it to the theory you think it points to." on touch and when using the keyboard.
- **D6. The disputed margin note:** the first full sentence of `dispute.challenge`. Never cut mid-sentence.
- **D7. Change from the brief:** do not strike through the disputed claim; disputed is not false. Give the claim line a wavy `rust` underline and a hand-drawn "?" in the margin. (A drawn SVG mark, since design.md has no handwriting face in V1.)
- **D8. Beyond the brief:** Task 1 makes every generated id unique (sources, evidence, story, theories), and runs the file 20 times.

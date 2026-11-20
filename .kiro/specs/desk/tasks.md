# Implementation Plan: desk

## Overview

Build the investigation desk from `docs/briefs/desk.md` in small steps. Task 1 fixes the flaky property test so every later task can end on a green suite. Tasks 2–3 add pure helpers. Tasks 4–14 replace the board screens one piece at a time, each leaving the app working and the suite passing. Task 15 is the final check, in Chrome, and the push.

Rules for every task:

- Read every file in `.kiro/steering/` first.
- Do not change the route URLs, the `InvestigationProvider` actions, `src/lib/case-report.ts`, `src/types/case.ts` or anything under `src/cases/`.
- Import `src/` modules with the `@/` alias. No content hard-coded in components.
- Animate only transform, opacity, filter and clip-path. Every animation has a reduced-motion version.
- Before writing GSAP code or tests, check the current APIs with Context7 (`gsap` 3.15.1: Flip, Draggable, quickSetter, ticker; Vitest 5.1.0; fast-check 4.10.2).
- Every task ends the same way: run `npm test`, `npm run build` and `npm run lint`, fix every error, write a short report (what changed, every error hit including fixed ones, the real test output, notes), and commit only the task's files with a message starting `[kiro]`. Do not push until task 15.
- An existing test that no longer matches the new structure is updated in the task that changes that structure, and listed in the report with before and after.

## Tasks

- [x] 1. Fix the flaky property test 8
  - In `src/lib/__tests__/validate-case.property.test.ts`, change the generator behind Property 8 so every generated id is unique within each case: sources, evidence, story sections and theories, each with `fc.uniqueArray(..., { selector: item => item.id, ... })` instead of `fc.array` (D8)
  - Change nothing Property 8 asserts, and nothing in `validateCase`
  - Confirm the fix: in a temporary run (not committed), pass `seed: -1131047925` to Property 8 and see it pass; then run the file at least 20 times in a row with no failure
  - Finish as described in the Overview; list the generator change, before and after
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Pure desk helpers: `src/lib/desk.ts`
  - `hashUnit(id, salt?)` (FNV-1a, 32-bit, to [0, 1)), `scatter(id, maxDegrees, maxOffset)`, `deskLayout(caseData, state)` and the `FolderPlace` / `DeskLayout` types, as in the design
  - `deskLayout`: Board only if opened and pinned to a known theory; aside tray only if opened and pinned to `"none"`; otherwise the Pile; unknown ids ignored; never throws
  - Unit tests in `src/lib/__tests__/desk.test.ts` against the Mary Celeste case
  - Property tests in `src/lib/__tests__/desk.property.test.ts`: design Properties 1–5, each its own `test`, tagged `// Feature: desk, Property N: ...`
  - _Requirements: 3.2, 4.1, 4.3, 4.6_

- [x] 3. Events and the hints flag
  - Add the six desk events (`pile-hover`, `folder-open`, `flip`, `stamp`, `pin`, `seal`) to the union in `src/lib/story-events.ts`; no new module
  - Add `src/lib/desk-hints.ts` with `hasSeenDeskHints` / `markDeskHintsSeen`, key `histor:desk-hints:<caseId>`, both in try/catch
  - Unit tests: the hints flag round-trips, and works (does not throw) when `localStorage` throws
  - _Requirements: 8.2, 10.1, 10.2_

- [x] 4. Nest the file route under the desk
  - In `src/App.tsx`, make `/case/:id/files/:evidenceId` a child of `/case/:id/files` (the URLs do not change)
  - Rename `Board.tsx` to `Desk.tsx` and render an `<Outlet />` for the open file; the existing board content and the existing opened file keep working inside it for now
  - Opening a file's URL directly shows the desk with that file open (D0)
  - Keep "File not found", the `/verdict` and `/report` redirects, and deep links
  - Update the existing investigation tests only where the structure changed
  - _Requirements: 5.1, 12.1, and the brief's "keep the routes"_

- [x] 5. The desk surface and the lamp
  - Desk surface: night-toned wood grain from CSS gradients and an SVG noise filter, the existing grain, a strong vignette; no image files
  - `Lamp.tsx`: one fixed overlay with a radial-gradient mask on `--lamp-x`, `--lamp-y`, `--lamp-r`, written by `gsap.quickSetter` in a `gsap.ticker` callback; desktop follows the mouse (radius about 420px); phones rest over the focused or last-tapped element; no React state
  - Reduced motion: a static soft light, centred, with no listeners and no ticker
  - Keep text on paper and the progress line at 4.5:1 (lit layers above the shadow)
  - Tests: reduced motion sets fixed lamp variables and attaches no pointer listener
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 11.2, 11.3, 12.6_

- [x] 6. The board of theories
  - `TheoryNote.tsx`: paper note, brass pin, deterministic tilt from `scatter`, title and claim, a drop target attribute, keyboard-reachable; never a standing
  - `HangingTab.tsx` and the updated `Threads.tsx`: pinned files hang beneath their note as small overlapping tabs; each thread sags slightly and has a pin head at both ends
  - Phones: keep the compact row (title and pin count); tapping a theory shows its claim and its pinned files (D3)
  - Placement from `deskLayout`
  - Tests: five notes from the data, no standing shown, pinned files listed under the right note
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 11.1, 11.4_

- [x] 7. The pile, the tray and the progress line
  - `Pile.tsx` and the new `Folder.tsx`: sealed manila folders with a tab (number, typed title), deterministic offsets and rotations, all identical outside; each a link, so Tab and Enter open it
  - Desktop: the pile fans into an arc on hover and the folder under the pointer lifts (GSAP); emit `pile-hover`
  - Phones: a horizontal fanned strip with scroll-snap; the centred folder lifts
  - `SetAsideTray.tsx` for files pinned to "None of them"; opened-but-unpinned files go back on top of the pile with their stamp (D1)
  - The progress line beside the pile: "N of 23 files opened. Open M more to close the case."
  - Tests: the pile renders 23 sealed folders with no status visible (12.2); the progress line; a "None of them" pin puts the file in the tray
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 10.1, 12.2_

- [x] 8. Opening a file: the folder, the flight and the flip
  - `OpenFile.tsx`, `InnerCover.tsx`, `FileDocument.tsx` replace `OpenedFile.tsx`: inner cover with the typed label "HISTOR · CASE FILE NN · TITLE" and the source index card; the document on paper with a paper clip; detail through `PortalText`
  - Flip flight from the pile to the centre (state captured on activation; a deep link scales and fades in instead), then the cover flips open (`rotateY` around the left edge, with perspective); dispatch `OPEN_EVIDENCE` as it opens; emit `flip` and `folder-open`
  - Phones: full screen, inner cover content above the document
  - Escape and "Back to the board" close it and fly the folder back; "Next file" kept (D4); focus trapped while open and returned on close
  - Reduced motion: crossfade, no flight and no flip
  - Tests: opening dispatches `OPEN_EVIDENCE`; the label and index card come from the data; Escape closes; "File not found" still works
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 10.1, 11.3, 11.4, 12.3_

- [x] 9. The reveal: the paper becomes its status
  - Plain paper first; after a short beat the stamp lands (motion.md stamp rule); emit `stamp`
  - Record: crisp paper, typed heading, embossed `record` seal pressing in beside the stamp
  - Disputed: a second sheet slides in askew; "The claim" / "The challenge"; the claim line gets a wavy `rust` underline and a hand-drawn "?" in the margin, never a strike-through (D7); the margin note is the first full sentence of `dispute.challenge` via `firstSentence` (D6); smudged stamp
  - Legend: the paper yellows and turns faintly see-through; ink drifts in slow waves (GSAP, opacity only); at rest `ghost-ink` at 4.5:1; the "Where this came from" slip slides out with the origin
  - Reduced motion: the same end states, faded in; static ghost ink
  - Tests: the status shows after the stamp for each of the three statuses; the disputed claim is underlined, not struck through, and its margin note is a whole sentence; under reduced motion the end state is shown with no drift
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 11.3, 12.3_

- [x] 10. Pinning with the Pin_Menu, and the historians' slip
  - After the stamp, "Which theory does this point to?" and the Pin_Menu below the document; the file stays open until the user pins it (D9). Choosing plays the reverse flip (desktop, full motion), then the folder flies to its place
  - `PinMenu.tsx`: "Pin to…" with a `role="menu"` of the five theories plus "None of them"; arrows, Home/End, Enter/Space, Escape; always rendered
  - `pin(target)`: dispatch `PIN_EVIDENCE`, emit `pin`, return to `/files`; the folder flies to its place under the note or into the tray, the thread draws in, and the historians' slip (from `buildCaseReport`) opens under the theory on the folder just pinned until the next action; tapping a pinned folder shows it again (D2)
  - Reopening a pinned file shows the choice and the slip, and allows re-pinning
  - Tests: the Pin_Menu pins, and the file moves under the right theory; "None of them" moves it to the tray (12.4); the menu works with the keyboard; the slip shows the historians' reading; re-pin
  - _Requirements: 7.1, 7.5, 7.6, 7.7, 7.8, 10.1, 11.4, 12.4_

- [ ] 11. Dragging, as an enhancement
  - Desktop with a fine pointer and full motion only: `Draggable` on the open folder, grabbed by its manila edge; it closes into its cover in the hand as it lifts (D9); `onDrag` tests each `[data-drop-target]` with `hitTest(el, '40%')` and brightens the hit one under the lamp; `onRelease` pins to it, to `"none"` on the tray, or returns the folder to the centre and opens it again
  - Dragging a folder out of the pile onto the desk opens it
  - Not created on touch, coarse pointers or reduced motion; the Pin_Menu always remains
  - Tests: no Draggable under reduced motion or a coarse pointer; a drop handler call with a theory target pins it (handler tested directly)
  - _Requirements: 5.1, 7.2, 7.3, 7.4, 7.5, 11.3_

- [ ] 12. Teaching itself
  - `DeskHints.tsx`: on the first visit only, three hints in the app's voice, one at a time, next to the pile, the Pin_Menu and the progress line; mark them seen after the third
  - Hint 2 reads "Drag it to the theory you think it points to." on fine-pointer devices, and "Pin it to the theory you think it points to." on touch and when using the keyboard (D5)
  - `DeskGuide.tsx`: a small **?** button in a corner opens a three-step guide panel (dialog, focus trapped, Escape closes)
  - Tests: hints appear once and not again with the stored flag (12.5); hint 2's two wordings; the guide opens and closes
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 12.5_

- [ ] 13. The wax seal, the verdict and the report
  - `WaxSeal.tsx` on the desk at the threshold: rust-night wax, brass "H", "Close the case", a link to `/verdict`; emit `seal`
  - Verdict: the five theory notes on the desk under a static lamp; the existing 1.5s hold presses a wax seal onto the chosen note; same logic; reduced motion keeps the plain confirm
  - Report: typed paper under the lamp; the same seven sections, logic and wording; a stamp for each standing; "Reopen the case" with its inline confirm and "Back to all cases"
  - Update the existing closing and report tests to the new structure
  - Tests: the seal is hidden below the threshold and links to `/verdict` at it; the verdict and report tests pass unchanged in what they assert
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 10.1, 12.1_

- [ ] 14. Events and the remaining keyboard and reduced-motion checks
  - Tests with `onStoryEvent`: pile hover, folder open, flip, stamp, pin and seal are each emitted once at their moment
  - Keyboard: Tab reaches every folder, note and button with a visible focus ring; Enter opens; Escape closes
  - Reduced motion: the whole desk renders with no flip, no lamp movement, no drift and no Draggable (12.6)
  - _Requirements: 10.1, 11.3, 11.4, 12.6_

- [ ] 15. Final checkpoint
  - Run `npm test`, `npm run build` and `npm run lint`
  - Run `git diff --stat <commit before task 1> -- src/types/case.ts src/lib/case-report.ts src/cases/ src/app/InvestigationProvider.tsx` and confirm no changes
  - Chrome at 375px and 1440px, against the preview build: a full investigation to the report by drag, and one by buttons; check the lamp, the fan, the flip, the three reveals, the slip, the seal, contrast on lit text, no overflow, no console errors
  - Write the full report in the usual format, commit with `[kiro]`, push
  - _Requirements: 13.1, 13.2, 13.3_

## Notes

- All tasks are required. Run them one at a time, in order.
- The review decisions D0–D8 in `requirements.md` settle every open question; the tasks follow them.
- Task 4 keeps the old board and opened file working inside the new route shape, so the app is usable and the suite passes between tasks 4 and 13.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2"] },
    { "id": 2, "tasks": ["3"] },
    { "id": 3, "tasks": ["4"] },
    { "id": 4, "tasks": ["5"] },
    { "id": 5, "tasks": ["6"] },
    { "id": 6, "tasks": ["7"] },
    { "id": 7, "tasks": ["8"] },
    { "id": 8, "tasks": ["9"] },
    { "id": 9, "tasks": ["10"] },
    { "id": 10, "tasks": ["11"] },
    { "id": 11, "tasks": ["12"] },
    { "id": 12, "tasks": ["13"] },
    { "id": 13, "tasks": ["14"] },
    { "id": 14, "tasks": ["15"] }
  ]
}
```

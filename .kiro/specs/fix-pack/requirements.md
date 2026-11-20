# Requirements Document

## Introduction

This spec turns `docs/briefs/fix-pack.md` into requirements. The brief is the source of truth: nothing here adds to it or drops from it. Where the brief says "approved" (Lenis in 1.4, the unpin action in 3.7), the change is agreed. Where the brief leaves a choice open, the requirement states the working assumption and marks it **(assumption, Q*n*)**; the questions are listed under "Questions and answers" at the end. All nine are now answered, and the requirements below follow the answers.

The pack fixes the feel of the story and the desk: text that blinks, things that snap into place, a desk that scrolls away from you, and an opened file that is tilted and cut off. It is mostly motion and layout, not new features.

These stay unchanged (brief, introduction):

- the routes and URLs;
- `src/types/case.ts`;
- `src/lib/case-report.ts`;
- the case content in `src/cases/`;
- the verdict logic and the report wording;
- `InvestigationProvider`, except for the unpin action approved in Requirement 18.

## Glossary

- **Motion_Token**: one named ease and duration in `src/lib/motion.ts` (`ink.in`, `ink.out`, `paper.lift`, `paper.move`, `paper.land`, `stamp.hit`, `hover`, `layout`, `scene`, `ghost`).
- **Duration_Step**: one of the four duration steps: `fast` 0.2s, `base` 0.45s, `slow` 0.9s, `scene` 1.2s.
- **Lenis**: the smooth-scrolling library `lenis`, the one approved install.
- **Inner_Scroller**: a scrolling area inside the page, such as the open file's document. It scrolls natively, outside Lenis.
- **Opening_Scene**: the full-screen first scene of the story: the first chapter's image, the case title, its years, the UNSOLVED stamp, the teaser and a scroll cue.
- **Play_Card**: the small card at the bottom centre with "Play the story" and "Read at my pace".
- **Text_Column**: the column in the lower part of each story scene that holds the chapter's sentences, stacked in order.
- **Visible_Band**: the part of the Text_Column where sentences are fully shown, about 3 to 4 lines tall, below a soft gradient mask.
- **Portal_Name**: an underlined reference in case text (`{{ref:id|label}}`) that opens a portal card.
- **Desk**: the investigation screen at `/case/:id/files`, with an open file at `/case/:id/files/:evidenceId` shown over it.
- **Board**: the felt strip of theory notes at the top of the Desk.
- **Floor**: the lower part of the Desk on Desktop, where folders lie flat and scattered.
- **Floor_Layout**: the pure function that places the folders on the Floor.
- **Folder**: one evidence file as a manila folder with a tab and a label.
- **Sealed**: a file that is not in `state.opened`.
- **Open_File**: the folder opened in the centre of the Desk.
- **Writing_Reveal**: the first opening of a file: the title written by the Nib, the text settling line by line, then the stamp.
- **Nib**: a small dip-pen nib, about 24px, that writes a file's title. Not the legend's quill.
- **Pin_Menu**: the "Pin to…" button and its floating menu.
- **Set_Aside_Tray**: the tray for files pinned to `"none"`.
- **Drop_Target**: a theory note, the Board outside any note, the Set_Aside_Tray, or the Floor.
- **Unpin**: removing a file's pin or set-aside entry so it goes back to the Floor, still opened.
- **Phone_Gate**: the screen shown instead of the investigation below 1024px wide.
- **Desktop**: a screen 1024px wide or more. **Phone**: narrower than 1024px, for the Phone_Gate only.
- **Reduced_Motion**: `prefers-reduced-motion: reduce`.

## Requirements

### Requirement 1: One file of named motion

**User Story:** As a developer, I want every animation to use named eases and durations from one file, so that the app moves with one consistent feel.

#### Acceptance Criteria

1. THE app SHALL define, in `src/lib/motion.ts`, these Motion_Tokens with these starting values, to be tuned by eye: `ink.in` (`power3.out`, 0.9s, rise 10px, fade in); `ink.out` (`power2.in`, 0.45s); `paper.lift` (`power2.out`, 0.35s); `paper.move` (`power3.inOut`, 0.6s); `paper.land` (`back.out(1.15)`, 0.5s); `stamp.hit` (a hard `expo.in` down over 0.16s, then a small settle); `hover` (`power2.out`, 0.2s); `layout` (Flip, `power2.inOut`, 0.5s); `scene` (`sine.inOut`, 1.2s or more); `ghost` (`sine.inOut`, 2–4s, slow and irregular).
2. THE file SHALL define the Duration_Steps `fast` 0.2, `base` 0.45, `slow` 0.9 and `scene` 1.2. How the token values relate to the steps is open (Q2).
3. Every GSAP tween in the app SHALL take its ease and duration from `src/lib/motion.ts`. No tween SHALL write its own ease or duration.
4. WHERE no named GSAP ease fits, THE ease SHALL be registered once with `CustomEase`.
5. Exits SHALL always be quicker than entrances.

### Requirement 2: No instant visual changes

**User Story:** As a user, I want every change on screen to move smoothly, so that nothing blinks or snaps.

#### Acceptance Criteria

1. Every visible change of state SHALL animate, including menus opening, items moving, slips appearing, threads drawing and files returning.
2. WHEN something changes position or size because of a layout change, THE change SHALL be animated with Flip and the `layout` token.
3. Nothing SHALL snap, and nothing SHALL push something else out of the way without moving smoothly.
4. WHILE Reduced_Motion is on, THE app SHALL keep its current reduced-motion fallbacks.

### Requirement 3: Performance rules

**User Story:** As a user, I want the motion to stay smooth, so that the site never stutters.

#### Acceptance Criteria

1. Animations SHALL change only `transform` and `opacity`, with two exceptions: `filter: blur()` on text lines during a file's Writing_Reveal (never on whole images, and never during scroll), and `stroke-dashoffset` for drawn lines. Existing effects that break it follow the answer to Q3: the stamps' `clip-path`, the quill's letter blur and the hold-to-close fill stay as short, small effects; hover glows and shadows become a layer that fades with `opacity`; the legend paper's `filter` is converted only if it animates; the lamp is unchanged.
2. No large image or full-screen layer SHALL be blurred.
3. `will-change` SHALL be set only while an element animates, and removed afterwards.
4. THE story images SHALL have properly sized WebP versions, so that the camera moves do not stutter.

### Requirement 4: Smooth scrolling (approved: install `lenis`)

**User Story:** As a user, I want the page to scroll smoothly, so that the story glides.

#### Acceptance Criteria

1. THE app SHALL add Lenis for smooth scrolling, synced with ScrollTrigger: Lenis is driven by GSAP's ticker. The setup SHALL be checked with Context7.
2. "Play the story" SHALL work with Lenis, either by scrolling through Lenis or by pausing Lenis while playing, whichever Context7 shows is correct.
3. Inner_Scrollers, including the open file's document, SHALL be excluded from Lenis and scroll natively.
4. WHILE Reduced_Motion is on, Lenis SHALL be off.

### Requirement 5: Motion steering

**User Story:** As a developer, I want the motion rules in the steering, so that every future task follows them.

#### Acceptance Criteria

1. `.kiro/steering/motion.md` SHALL describe the motion system (Requirement 1) and the "no instant visual changes" rule (Requirement 2).

### Requirement 6: The opening scene

**User Story:** As a user, I want the story to open like a film, so that the start feels full rather than empty.

#### Acceptance Criteria

1. THE Opening_Scene SHALL replace the current title section and the "Play the story / Read at my pace" section. It sits after the legend intro and before chapter 1 (Q1).
2. THE Opening_Scene SHALL be full screen: the case's first chapter image under a slow camera push, darkened at the bottom.
3. THE quill SHALL write the case title large, THE years SHALL be typed under it, and THE UNSOLVED stamp SHALL land (`stamp.hit`).
4. THE case teaser SHALL sit under the title, then a quiet scroll cue.
5. WHEN the user scrolls, THE title SHALL dock into the header, as it does now.

### Requirement 7: The play card

**User Story:** As a user, I want a small choice to let the story play or read it myself, without it blocking the page.

#### Acceptance Criteria

1. AFTER the user's first scroll past the Opening_Scene, THE Play_Card SHALL slide up at the bottom centre (`paper.lift`) with "Play the story" and "Read at my pace" and the hint "Scroll, or press play."
2. THE Play_Card SHALL NOT block the page: scrolling SHALL keep working while it is on screen.
3. WHEN the user chooses either option, THE Play_Card SHALL leave (`ink.out`).
4. THE Play_Card SHALL show once per visit, until it is chosen.
5. THE floating play/pause control SHALL stay as it is.

### Requirement 8: Text that stays

**User Story:** As a user, I want the story's sentences to stay on screen while I read them, so that the text no longer blinks one sentence at a time.

#### Acceptance Criteria

1. Each scene SHALL have a Text_Column in its lower part, holding the chapter's sentences stacked in order. It replaces the one-sentence beats.
2. WHEN the user scrolls down, THE Text_Column SHALL move up: new sentences SHALL come into view at the bottom, and older ones SHALL move up and fade out through a soft gradient mask at the top. WHEN the user scrolls back, THE sentences SHALL come back down.
3. About 3 to 4 lines SHALL be visible at a time.
4. Each sentence SHALL ease in (`ink.in`) as it crosses into view, and SHALL stay while it is in the Visible_Band.
5. Each sentence SHALL get a scroll distance proportional to its reading time at 240 words a minute, with a generous minimum. THE scroll SHALL use scrub smoothing so the text glides rather than jumps. THE constants SHALL be kept in one place.
6. THE full text SHALL stay in the DOM for screen readers, as now.

### Requirement 9: Headings at their own pace

**User Story:** As a user, I want each chapter heading written at its own steady pace, so that it reads as handwriting and not as a scrub.

#### Acceptance Criteria

1. Chapter headings SHALL no longer be scrubbed by the scroll.
2. WHEN a scene starts, THE quill SHALL write its heading on a timer of about 2 to 2.5s, whatever the scroll speed.
3. WHEN the user scrolls back above the scene, THE heading SHALL fade out quickly (`ink.out`).

### Requirement 10: Portal names open again

**User Story:** As a user, I want to tap a name in the story and see who it is.

#### Acceptance Criteria

1. WHEN the user clicks a Portal_Name in the story text, THE portrait card SHALL open, as it did before.
2. WHEN a card opens, "Play the story" SHALL pause.

### Requirement 11: The story's other parts stay

**User Story:** As a user, I want the rest of the story to work as it does today.

#### Acceptance Criteria

1. THE roll call, the voyage chart, the hooks with stillness, day into night, the sound events and the reduced-motion version SHALL stay, adapted to the Text_Column where needed.
2. THE story SHALL work on phones as it does now.

### Requirement 12: One fixed desk screen

**User Story:** As a user on a laptop, I want the whole desk on one screen, so that the board never scrolls away from me.

#### Acceptance Criteria

1. ON Desktop, THE Desk SHALL fit the screen exactly and SHALL never scroll.
2. THE Desk SHALL have a compact header, the Board on top (about 55% of the height) and the Floor below (about 45%).
3. THE Board SHALL always be in view, so a file can always be dragged to it.

### Requirement 13: The floor

**User Story:** As a user, I want the files tossed flat on the table, so that I can see every one and pick any.

#### Acceptance Criteria

1. THE 23 sealed Folders SHALL lie flat and scattered on the Floor, seen from above, replacing the fanned arc.
2. Each Folder SHALL have a slight tilt between −8° and 8°. Folders MAY overlap a little, but every Folder's tab and label SHALL stay visible.
3. Positions and tilts SHALL be worked out by a pure Floor_Layout function from the file ids (seeded, so the same every visit) and the Floor size.
4. Property tests SHALL check that every Folder is inside the Floor, that the layout is deterministic, and that no label is covered.
5. WHEN the user hovers a Folder, it SHALL lift slightly: scale, shadow and brought to the top (`hover`).
6. Files opened but not pinned SHALL lie back on the Floor with their status stamp visible.

### Requirement 14: Opening a file

**User Story:** As a user, I want a click to open a file at once, straight and whole, so that I can read it.

#### Acceptance Criteria

1. WHEN the user clicks a Folder, THE file SHALL open at once with the full flight. It SHALL NOT show a mini view first (the current bug, where the full open only happens after a drag).
2. THE Folder SHALL lift, straighten to 0° as it rises (`paper.move`), and open in the centre.
3. THE Open_File SHALL fit the screen: centred, straight, and at most about 86% of the screen height.
4. IF the document is longer than the space, THEN the document SHALL scroll inside the paper with a thin scrollbar, as an Inner_Scroller, while the Folder stays still. THE page SHALL never scroll behind it.
5. WHEN the user presses Escape or clicks outside the file, THE Folder SHALL go back to its place on the Floor or its pinned spot, through `paper.move` and `paper.land`.

### Requirement 15: The writing reveal

**User Story:** As a user, I want a file's first opening to feel like a record being written, so that reading it is a small event.

#### Acceptance Criteria

1. WHEN a file opens for the first time, THE Nib SHALL write its title letter by letter in about 1.2s.
2. THEN the rest of the text SHALL settle in line by line, from a slight blur to sharp, with a fade and a small rise (`ink.in`), staggered and quicker than the title.
3. THEN the status stamp SHALL land, and the paper SHALL take its status treatment (record, disputed, legend) as it does now.
4. WHEN the user clicks the document or presses any key other than Escape during the Writing_Reveal, THE reveal SHALL finish at once. Escape SHALL close the file.
5. Files already read SHALL open instantly, already revealed. Only the first opening SHALL play the reveal.
6. WHILE Reduced_Motion is on, THE text SHALL simply appear.

### Requirement 16: The Pin menu

**User Story:** As a user, I want the Pin menu to float over the file, so that nothing shifts when I open it.

#### Acceptance Criteria

1. "Pin to…" SHALL open a floating menu over the file, anchored to its button. It SHALL take no layout space, so nothing shifts.
2. THE menu SHALL open and close with an animation (`layout` and `hover`).
3. THE menu SHALL list every theory, plus "None of them", plus "Back to the floor" when the file is pinned or set aside, so that a keyboard user can do everything a drag can. On Desktop the option reads "None of them", as in the report (Q5).

### Requirement 17: Drag anything anywhere

**User Story:** As a user with a mouse, I want to move any file anywhere by hand, so that the desk feels physical.

#### Acceptance Criteria

1. A Sealed Folder on the Floor SHALL be draggable.
2. WHEN a Sealed Folder from the Floor is dropped on a theory note, THE file SHALL be pinned to that theory, but the reveal SHALL play first: it opens, the stamp lands, then it flies to the note.
3. WHEN a Folder from the Floor is dropped on the Board outside any note, THE file SHALL open for reading.
4. WHEN a Folder from the Floor is dropped back on the Floor, it SHALL settle where it was dropped. That position is kept for the visit only (Q7).
5. A pinned file SHALL be draggable straight from its note, without opening it: to another theory (re-pin), to the Set_Aside_Tray, or back to the Floor (Unpin).
6. A file in the Set_Aside_Tray SHALL be draggable in the same way as one from the Board.
7. WHILE a dragged Folder is over a theory note, THE Folder SHALL shrink to about 55% and fade slightly so the note's title stays readable, and THE note SHALL light up.
8. WHEN pins change, THE threads SHALL redraw smoothly (`layout`).
9. Drops the brief does not name (a Sealed Folder on the Set_Aside_Tray; an opened, unpinned Folder on a theory) follow Q6.

### Requirement 18: Returning a file to the floor (approved state change)

**User Story:** As a user, I want to take a file back off the board, so that I can change my mind completely.

#### Acceptance Criteria

1. THE investigation state does not support unpinning today (`InvestigationProvider` has `OPEN_EVIDENCE`, `PIN_EVIDENCE`, `CLOSE_CASE` and `REOPEN_CASE`). THE app SHALL add one action, `unpin(evidenceId)`, as approved. Its type lives in the provider, not in `src/types/case.ts` (Q4).
2. `unpin(evidenceId)` SHALL remove the file's pin or set-aside entry. THE file SHALL stay opened.
3. In storage, "unpinned" SHALL mean there is no pin entry, so no migration is needed.
4. Tests SHALL cover the action, and this requirement is its spec line. `buildCaseReport` SHALL be unchanged.

### Requirement 19: The desk's other parts stay

**User Story:** As a user, I want everything else on the desk to keep working.

#### Acceptance Criteria

1. THE lamp, the felt board, the brass pins, the threads, the historians' slip, the first-visit hints and the ? guide, the wax seal "Close the case", the verdict, the report, the desk sound events and the reduced-motion fallbacks SHALL stay.
2. They SHALL be adapted where the new layout needs it, and all their motion SHALL go through the Motion_Tokens.

### Requirement 20: The phone gate

**User Story:** As a user on a phone, I want to be told plainly that the investigation needs a bigger screen, with the choice to go on anyway.

#### Acceptance Criteria

1. ON a screen narrower than 1024px, THE investigation (the fork's investigate link and every desk URL) SHALL show the Phone_Gate instead. The verdict and report URLs count as desk URLs (Q8).
2. THE Phone_Gate SHALL be one on-theme screen: "This case is too big for a small screen." and "Open Histor on a laptop to investigate.", with a "Continue anyway" link under it.
3. "Continue anyway" SHALL be remembered for the session.
4. AFTER "Continue anyway", THE existing phone desk SHALL show, unchanged. Mobile polish comes later.

### Requirement 21: Saving data

**User Story:** As Robert, working on a paid mobile hotspot, I want the build to use as little data as possible.

#### Acceptance Criteria

1. THE build SHALL install nothing except `lenis`, and download nothing else.
2. Context7 SHALL be used only for an API not already checked in the same session.
3. Browser checks SHALL happen once, at the final task.
4. Every browser run SHALL use one Chrome profile with: `--user-data-dir=/tmp/histor-chrome --no-first-run --disable-component-update --disable-background-networking --disable-sync --disable-features=OptimizationGuideModelDownloading,OptimizationHints`.
5. Desktop SHALL be checked at 1440×900 and, with DOM measurements only and no screenshots, at 1366×768. THE Phone_Gate SHALL be checked only at 375×667.
6. DOM measurements SHALL be preferred to screenshots. At most 6 screenshots SHALL be taken in total, and only to confirm something visual.
7. THE build SHALL run in its own session, separate from the spec session.

### Requirement 22: Done

**User Story:** As Robert, I want a clear finish line.

#### Acceptance Criteria

1. `npm test`, `npm run build` and `npm run lint` SHALL all pass.
2. THE final browser check SHALL cover: the story opening and the Play_Card; the Text_Column, scrolling down and back; Portal_Names opening their cards; the Desk fitting the screen with no page scroll at 1440×900 and at 1366×768 (DOM measurements only); a full investigation done by drag only (Floor → theory, Board → another theory, Board → Floor, Board → tray); the Writing_Reveal and skipping it; a long document scrolling inside the paper; the Pin_Menu not moving the file; the Phone_Gate.
3. THE browser SHALL show no console errors.
4. THE steering docs and `docs/content/mary-celeste-scenes.md` SHALL match what was built.
5. Each task SHALL end with a `[kiro]` commit. THE final task SHALL push, and send one final report in the usual format, listing every error hit, including those fixed.

## Questions and answers
All nine questions are answered. Where an answer differs from the working assumption, the requirements, the design and the tasks above follow the answer.
- **Q1. Where the opening scene sits.** *Answer:* the legend intro first, then the Opening_Scene, then the Play_Card as chapter 1 begins. The legend intro loses its title card. The case header stays hidden during the legend intro until the title docks.
- **Q2. Token durations and the steps.** *Answer:* agreed. The tokens keep the brief's starting values; the steps are the scale for every other timing (delays, holds, staggers).
- **Q3. Existing effects outside the performance rule.** *Answer:* do not convert everything.
  - Keep the stamps' `clip-path` reveal, the quill's letter blur and the hold-to-close `clip-path` fill. They are short and small.
  - Convert hover `filter` and `box-shadow` to a shadow layer that fades with `opacity`.
  - Convert the legend paper's `filter` only if it animates.
  - The lamp is unchanged.
- **Q4. The unpin action and `src/types/case.ts`.** *Answer:* agreed. The provider declares `InvestigationAction | { type: 'UNPIN_EVIDENCE'; evidenceId: string }`; `case.ts` stays as it is.
- **Q5. Wording.** *Answer:* keep "None of them" wherever it means "this file points to no theory": the Pin_Menu option and the Set_Aside_Tray label, matching the report. "Set aside" is not used as a label. The first-visit hint and the ? guide say "floor" on Desktop and keep "pile" on the phone desk.
- **Q6. Drops the brief does not name.** *Answer:* agreed. A Sealed Folder dropped on the Set_Aside_Tray plays the reveal, then goes to the tray. An opened, unpinned Folder dropped on a theory is pinned straight away.
- **Q7. Where a dropped position is kept.** *Answer:* agreed. For the visit only, in memory. Nothing new is stored.
- **Q8. Phone gate scope.** *Answer:* agreed. The gate covers `/files`, `/files/:evidenceId`, `/verdict` and `/report`.
- **Q9. CSS hover transitions.** *Answer:* agreed. CSS hover and focus transitions use matching CSS variables for the `hover` token; other CSS transitions are converted only where Requirement 3 needs it.

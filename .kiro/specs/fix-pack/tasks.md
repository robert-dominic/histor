# Implementation Plan: fix-pack

## Overview

Build `docs/briefs/fix-pack.md` in small steps. Tasks 1–7 put the motion system and smooth scrolling in place, so every later task uses them. Tasks 8–14 are the story, tasks 15–26 the desk and the phone gate, task 27 the docs, and task 28 the one browser check and the push.

Rules for every task:

- Run the build in its own session, separate from the spec session (Requirement 21.7).
- Read every file in `.kiro/steering/` first.
- Do not change the routes or URLs, `src/types/case.ts`, `src/lib/case-report.ts`, anything under `src/cases/`, the verdict logic or the report wording. `InvestigationProvider` changes only in task 15.
- Install nothing except `lenis` (task 7). Download nothing.
- Context7: check an API only if it has not been checked earlier in the same build session, and note what was checked in the task report.
- No browser until task 28.
- Every GSAP tween takes its ease and duration from `src/lib/motion.ts` (from task 1 on). Every visible change animates (Requirement 2), and every animation has a reduced-motion version.
- Every task ends the same way: run `npm test`, `npm run build` and `npm run lint`, and fix every error. Write a short report: what changed, every error hit (including fixed ones), the real test output, and notes. Commit only the task's files, with a message starting `[kiro]`. Do not push until task 28.
- An existing test that no longer matches the new structure is updated in the task that changes that structure, and listed in the report with before and after.
- A task that depends on an open question (Q1–Q9 in `requirements.md`) follows the answer if there is one, and otherwise the working assumption, and says which in its report.

## Tasks

- [ ] 1. Motion tokens
  - Rewrite `src/lib/motion.ts`: `STEP`, `MOTION` (the ten Motion_Tokens with the brief's starting values, per Q2), `tween(name)`, `ghostDuration(key)`, `stampHit(target, options)`; register any custom ease once with `CustomEase` (check with Context7); keep `MOTION_QUERIES`; keep the old `EASE` exports for now (removed in task 4)
  - Add `--motion-hover-ease` and `--motion-hover-duration` to the `@theme` block of `src/index.css` (Q9)
  - Unit tests: every token present; durations positive; `ink.out` quicker than `ink.in`; `ghostDuration` within 2–4s and deterministic; `stampHit` builds a press then a settle
  - _Requirements: 1.1, 1.2, 1.4, 1.5_

- [ ] 2. Motion steering
  - Update `.kiro/steering/motion.md`: the token table, the steps, "no tween writes its own ease or duration", "no instant visual changes" (Flip with `layout`), the performance rules, Lenis; replace the old frequency table and ease list so there is one source of truth
  - Bring `.kiro/steering/tech.md` rule 5 in line with Requirement 3
  - Docs only: run the three checks anyway, and commit
  - _Requirements: 5.1_

- [ ] 3. Move the story, legend, fork, portal and shared tweens to the tokens
  - Every tween in `src/features/story/`, `src/features/legend/`, `src/features/fork/`, `src/features/portals/`, `src/components/` and `src/lib/quill-writing.ts` uses `tween(...)` or `STEP`; reduced-motion versions too
  - No change in what is shown or when, other than the new curves and lengths
  - _Requirements: 1.3_

- [ ] 4. Move the desk and verdict tweens to the tokens, and add the audit
  - Same for `src/features/board/` and `src/features/verdict/`
  - Add `src/lib/__tests__/motion-audit.test.ts`: fails on a literal `ease` or `duration` in a GSAP call outside `motion.ts`
  - Remove the old `EASE` exports and their custom eases once nothing imports them
  - _Requirements: 1.3_

- [ ] 5. Performance rules
  - Per Q3: convert the stamps' `clip-path` reveal (`stampHit`, scale and opacity), the hold-to-close fill (a scaled disc), hover glows and shadows (a layer whose opacity changes), the legend paper's `filter` change and the quill's letter blur to `transform` and `opacity`; leave the lamp as it is
  - Blur only on file text lines during the reveal, and never on images or full-screen layers
  - `will-change` only while animating: remove the story image's permanent `will-change-transform`; set and clear it around tweens
  - Tests: the stamp and the hold still reach their end states (existing tests); no permanent `will-change` class on scene images
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 6. Sized story images
  - From the originals in `~/histor-media/`, with the local Pillow (or ffmpeg for the `s-aboard` still), make WebP versions at about 828w and the largest the original allows up to 1920w, each under 300 KB; nothing downloaded
  - Scenes (and the opening scene later) use `srcset` and `sizes`; the credits and labels are unchanged
  - Tests: every scene image has a `srcset` with both widths
  - _Requirements: 3.4_

- [ ] 7. Smooth scrolling with Lenis (approved install)
  - `npm install lenis` (the only install); check its setup with ScrollTrigger and `gsap.ticker`, `scrollTo`, `stop`/`start` and `data-lenis-prevent` with Context7
  - `src/app/SmoothScroll.tsx` around the router in `App.tsx`, and `src/lib/smooth-scroll.ts` (`getLenis`, `scrollToY`, `pauseSmoothScroll`, `resumeSmoothScroll`); off under reduced motion and when the media query changes
  - "Play the story" through Lenis or with Lenis paused, whichever Context7 shows is correct; any input still pauses it
  - Inner_Scrollers marked `data-lenis-prevent`
  - Tests: no Lenis under reduced motion or without matchMedia; one instance under full motion, removed on unmount; the player still plays and pauses
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 8. Portal names open again
  - First a failing test: a click on a Portal_Name in the active scene opens its card and pauses the player
  - Fix: only the active scene takes pointer events (`data-active`, `pointer-events: none` on the others), written where the active scene is already tracked
  - Tests: the click test passes; inactive scenes have `pointer-events: none`
  - _Requirements: 10.1, 10.2_

- [ ] 9. The opening scene
  - Per Q1: `StoryOpening.tsx` at the top of `Story` (in place of `StoryStart`): the first chapter image with a slow camera push and a dark bottom; the quill writes the title, the years are typed, the UNSOLVED stamp lands (`stampHit`), then the teaser and a quiet scroll cue
  - Move the title docking out of `LegendIntro` into `src/features/story/dock-title.ts`; it docks once on scroll, as now
  - Remove the title card from `LegendIntro` (prop, timings, markup); its myth, stamp, debunk and cue stay
  - Reduced motion: no camera; everything fades in; the title docks without moving
  - Update the legend intro and case page tests that expected the title card
  - Tests: the opening shows the title, years, stamp and teaser from the case data; docking is called once on scroll; the legend intro has no title card
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 10. The play card
  - `PlayCard.tsx`: fixed at the bottom centre, outside the layout; slides up (`paper.lift`) after the first scroll past the opening; "Play the story", "Read at my pace", the hint "Scroll, or press play."; either choice sends it away (`ink.out`); once per visit until chosen; not shown under reduced motion
  - Remove `StoryStart.tsx`; `PlayControl` unchanged
  - Tests: hidden at first; shown after the first scroll past the opening; scrolling still works with it shown (not modal, no scroll lock); gone after each choice and not shown again that visit; play calls `player.play`
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 11. Column timing, pure
  - `src/lib/story-column.ts`: `COLUMN` (240 wpm, a generous minimum, visible lines, scrub smoothing), `sentenceSeconds`, `columnPlan`
  - Unit tests and Property 5 in `src/lib/__tests__/story-column.property.test.ts`
  - _Requirements: 8.5_

- [ ] 12. The text column
  - `StoryScene`: `data-story="column"` with a static top mask and the sentences stacked in order, in place of the beats; Portal_Names tappable and out of the Tab order; the full text panel unchanged
  - `Story`: the column moves up by each sentence's height over its `columnPlan` distance, each sentence eases in (`ink.in`) and stays in the Visible_Band; `scrub: COLUMN.scrub`
  - Update the story tests that read the beats
  - Tests: the column holds every sentence in order; about 3–4 lines tall; the full text still in the DOM; the timeline's length matches `columnPlan`
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.6_

- [ ] 13. Headings on a timer
  - Take the kicker and heading out of the scrubbed timeline; on `chapter-enter` forward, a separate tween writes them in about 2.2s; scrolling back above the scene fades them out (`ink.out`)
  - Tests: the heading tween starts on entering a scene and is not part of the stage timeline; it fades on going back; reduced motion shows the heading still
  - _Requirements: 9.1, 9.2, 9.3_

- [ ] 14. The story's other parts, adapted
  - Roll call, hook with stillness, voyage chart, day into night, sound events and the reduced-motion stacked version, adapted to the column (the column leaves before the hook; the roll call sits before the column in chapter 1)
  - The story on phones works as now
  - Tests: the existing story event, roll call, hook, chart and reduced-motion tests pass, updated only where the structure changed; at a phone width the story renders its scenes and column
  - _Requirements: 11.1, 11.2_

- [ ] 15. Unpin (approved state change)
  - Per Q4: `CaseAction` with `UNPIN_EVIDENCE` in `InvestigationProvider.tsx`; the reducer removes the pin or set-aside entry and keeps the file opened; `src/types/case.ts` and storage unchanged
  - Unit tests and Property 6 in `src/app/__tests__/InvestigationProvider.property.test.ts`; `buildCaseReport` tests unchanged and passing
  - _Requirements: 18.1, 18.2, 18.3, 18.4_

- [ ] 16. The phone gate
  - `src/lib/phone-gate.ts` (session flag `histor:phone-gate`, try/catch, memory fallback) and `src/app/PhoneGate.tsx`; `CaseInvestigation` shows it below 1024px unless continued (Q8)
  - The two lines and "Continue anyway"; after it, today's phone desk, unchanged
  - Update the existing investigation, hints and desk event tests so they stub a desktop or set the flag
  - Tests: the gate at a narrow width on `/files`, a file URL, `/verdict` and `/report`; "Continue anyway" shows the phone desk and is remembered for the session; no gate on Desktop; storage throwing still works
  - _Requirements: 20.1, 20.2, 20.3, 20.4_

- [ ] 17. Floor layout, pure
  - `src/lib/floor.ts`: `floorLayout(ids, floor, folder)` (grid with seeded jitter, tilts within ±8°, reading-order z, label check by separating axes, jitter halving, scale fallback)
  - Unit tests against the Mary Celeste ids at 1440×900 floor sizes; Properties 1–4 in `src/lib/__tests__/floor.property.test.ts`
  - _Requirements: 13.2, 13.3, 13.4_

- [ ] 18. One fixed desk screen
  - Desktop composition in `Desk.tsx`: `h-svh` grid, compact header row (title, progress line, hints, wax seal), Board about 55%, Floor about 45%, tray beside the floor; `overflow: hidden` on `html` while mounted on Desktop; Lenis stopped while mounted
  - Hanging tabs and tray tabs compress to fit their row (a CSS variable from one measurement per layout change)
  - Below 1024px: today's phone desk, unchanged
  - Update the desk tests to the new structure
  - Tests: on Desktop the grid rows and `overflow: hidden` are set and removed on leaving; the phone desk renders unchanged below 1024px
  - _Requirements: 12.1, 12.2, 12.3_

- [ ] 19. The floor
  - `Floor.tsx` in place of the fanned `Pile` on Desktop: measures itself, places folders from `floorLayout`, moves them with Flip (`layout`) on change; hover lift (scale, shadow layer, to the top, `hover`) behind the hover media query; opened-but-unpinned files with their stamp
  - Tests: 23 sealed folders with no status; positions from `floorLayout`; an opened, unpinned file on the floor with its stamp; reduced motion places them with no movement
  - _Requirements: 13.1, 13.2, 13.5, 13.6_

- [ ] 20. Opening a file
  - Fix the click bug: a click opens at once with the full flight (no mini view)
  - The folder lifts and straightens to 0° as it flies (`paper.move`); the cover opens flat; the frame is centred and at most 86svh; the document scrolls inside the paper (thin scrollbar, `data-lenis-prevent`); the page never scrolls
  - Closing by Escape, a click outside the file or "Back to the board": back to its floor place or its tab, with `paper.move` then `paper.land`
  - Tests: one click navigates and records one flight; the document is the Inner_Scroller; a click on the backdrop closes; Escape closes
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [ ] 21. The writing reveal
  - `src/components/Nib.tsx`; the title written by the Nib in about 1.2s; the lines settle from blur with `ink.in`, staggered; then `stampHit` and the status treatment as now
  - Skip on a click on the document or any key except Escape; Escape closes; already-read files open revealed; reduced motion simply shows the text
  - Update the reveal tests to the new order
  - Tests: the three statuses still reach their end states; a click skips to the end; a key skips; Escape closes instead; a reopened file shows the end state at once; reduced motion has no Nib and no blur
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

- [ ] 22. The Pin menu as a popover
  - Desktop: an absolutely placed menu anchored to "Pin to…", opening down or up as room allows, with `layout` and `hover`, quicker to close; items: the theories, "Set aside", "Back to the floor" when pinned or set aside (Q5)
  - Phone desk: today's inline menu, unchanged
  - Tests: the menu takes no layout space (the button's container keeps its height when it opens); the items, including "Back to the floor" only when pinned; "Back to the floor" unpins and the file lies on the floor; keyboard behaviour as before
  - _Requirements: 16.1, 16.2, 16.3_

- [ ] 23. Drop rules, pure
  - `dropOutcome(source, target)` and its types in `src/features/board/drag.ts` (Q6 for the unnamed drops)
  - Unit tests for each named case in Requirement 17; Property 7 in `src/features/board/__tests__/drag.property.test.ts`
  - _Requirements: 17.2, 17.3, 17.4, 17.5, 17.6_

- [ ] 24. Drag from the floor
  - `useDeskDrag` for floor folders (fine pointer, Desktop, full motion only; a movement threshold keeps clicks as clicks)
  - Onto a theory: reveal then pin (`pinAfterReveal`); onto the board outside notes: open; onto the floor: settle there for the visit (Q7); over a note: the folder shrinks to about 55% and fades, the note lights
  - Tests: no Draggable under reduced motion or a coarse pointer; each drop handler called directly gives its outcome; after a reveal-then-pin the file is pinned and on its note; a settled folder keeps its spot until reload
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.7_

- [ ] 25. Drag from the board and the tray, and threads that redraw
  - Hanging tabs and tray tabs are draggable without opening: to another theory (re-pin), to the tray, to the floor (unpin); the open file's own drag stays and uses `dropOutcome`
  - Threads: changed threads fade out (`ink.out`), tabs move with Flip (`layout`), new threads draw in (`stroke-dashoffset`)
  - Tests: re-pin, set aside and unpin by calling the drop handlers; the moved tab's thread is redrawn and the others are untouched
  - _Requirements: 17.5, 17.6, 17.8_

- [ ] 26. The desk's other parts, and no instant changes left
  - Adapt the lamp's place, the slips, the hints and the ? guide wording (Q5), the wax seal, the verdict and the report to the new layout, with their motion through the tokens
  - Go through the story, the desk, the verdict and the report for any visible change that still snaps (menus, slips, items moving, files returning) and animate it (Flip with `layout` where size or position changes)
  - Tests: the existing hints, guide, seal, verdict, report and desk event tests pass (updated only where structure changed); the slip appears with a tween, not a snap
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 19.1, 19.2_

- [ ] 27. Docs match what was built
  - Update `.kiro/steering/motion.md`, `design.md`, `product.md` (returning a file to the floor) and `tech.md` where the build changed them, and `docs/content/mary-celeste-scenes.md` (the opening scene, the play card, the text column, headings on a timer)
  - _Requirements: 22.4_

- [ ] 28. Final checkpoint
  - Run `npm test`, `npm run build` and `npm run lint`
  - Run `git diff --stat <commit before task 1> -- src/types/case.ts src/lib/case-report.ts src/cases/` and confirm no changes; confirm `InvestigationProvider.tsx` changed only for unpin
  - The one browser run, against `npm run preview`, with the Chrome flags of Requirement 21.4 (plus the pointer `--blink-settings` for the desktop run), DOM measurements first, at most 6 screenshots:
    - 1440×900: the story opening and the play card; the text column scrolling down and back; Portal_Names opening their cards; the desk with no page scroll; a full investigation by drag only (floor → theory, board → another theory, board → floor, board → tray); the writing reveal and skipping it; a long document scrolling inside the paper; the Pin menu not moving the file; no console errors
    - 375×667: the phone gate
  - Write the final report in the usual format, listing every error hit across the build (including fixed ones); commit with `[kiro]`; push
  - _Requirements: 21.3, 21.4, 21.5, 21.6, 22.1, 22.2, 22.3, 22.5_

## Notes

- All tasks are required. Run them one at a time, in order.
- The open questions Q1–Q9 are at the end of `requirements.md`. Tasks 1, 5, 9, 15, 16, 22, 23, 24 and 26 depend on them.
- Tasks 3 and 4 change curves and lengths only, so the app looks the same between tasks apart from timing.

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
    { "id": 14, "tasks": ["15"] },
    { "id": 15, "tasks": ["16"] },
    { "id": 16, "tasks": ["17"] },
    { "id": 17, "tasks": ["18"] },
    { "id": 18, "tasks": ["19"] },
    { "id": 19, "tasks": ["20"] },
    { "id": 20, "tasks": ["21"] },
    { "id": 21, "tasks": ["22"] },
    { "id": 22, "tasks": ["23"] },
    { "id": 23, "tasks": ["24"] },
    { "id": 24, "tasks": ["25"] },
    { "id": 25, "tasks": ["26"] },
    { "id": 26, "tasks": ["27"] },
    { "id": 27, "tasks": ["28"] }
  ]
}
```

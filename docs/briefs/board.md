# Brief: The investigation (fork, board, case files, verdict, report)

For Kiro (default agent). Read every file in `.kiro/steering/` first. This builds on the case-report spec: use its report function; don't rebuild that logic.

## What this is

After the story, the reader chooses: stop, or investigate. Investigators get a board of theories and 23 sealed case files. They open files, see each one stamped Record, Disputed or Legend, and pin each to the theory they think it supports. After 6 files they can close the case, choose a verdict, and get a case report that mirrors their reasoning. There's no score, no "wrong," and no timer.

Use the existing `InvestigationProvider` actions: `OPEN_EVIDENCE`, `PIN_EVIDENCE`, `CLOSE_CASE`, `REOPEN_CASE`. Progress is already saved per case.

## Routes

- `/case/:id`: story, ending with the fork
- `/case/:id/files`: the board
- `/case/:id/files/:evidenceId`: one opened file
- `/case/:id/verdict`: choose a verdict
- `/case/:id/report`: the case report

Deep links and refresh must work. Unknown evidence ids show a plain "File not found" with a link back to the board. Visiting `/verdict` before the threshold redirects to the board; visiting `/report` without a verdict redirects to the board.

## 1. The fork (end of the story)

After the central question, still at full night: the fork prompt is typed in the app's voice (typewriter, Special Elite), then two buttons appear:
- **Open the case files** → the board
- **I've heard enough** → a short close on the same page: the case's `historiansSummary` (Old Standard TT), then two quiet links: "Open the case files anyway" and "Back to all cases"

## 2. The board

The mood is a night investigation desk: `night` background, paper folders, `brass` light, a soft vignette like a lamp over the desk. No book or page-flip.

**Theories** across the top: 5 cards, each showing its title and one-line claim. No standing is shown (that's revealed only in the report). Each card shows how many files the user has pinned to it.

**Case files** below: 23 folders, numbered 01–23 in case order, each showing its number and title.
- **Unopened:** plain folder, no status.
- **Opened:** a small status stamp on the folder (Record / Disputed / Legend in their status styles) and, if pinned, the theory it points to.

**Threads:** on desktop, a thin `rust` thread (SVG) runs from each pinned folder to its theory card. Threads are decorative (`aria-hidden`); the text label on the folder carries the same information.

**Phones:** theory cards become a horizontal row you can swipe, sticky at the top. Folders become a vertical list. No threads; the "→ theory" label on each folder does the job.

**Progress:** a line in the app's voice, e.g. "4 of 23 files opened. Open 2 more to close the case." Once `opened.length >= closeThreshold`, a **Close the case** button appears.

## 3. An opened file

Opening a folder dispatches `OPEN_EVIDENCE` and shows the file full-screen as an opened folder on paper:
- Number and title (Grenze Gotisch).
- Detail paragraphs (Old Standard TT), rendered through `parseRefs` so portals work here too.
- Sources: small, by title, linked.
- **The stamp:** after a short beat, the status stamps onto the file (motion.md stamp rules):
  - **Record:** crisp `record`-blue ink.
  - **Disputed:** the stamp lands smudged, and the file shows the dispute side by side: "The claim" and "The challenge."
  - **Legend:** the stamp lands, and the detail text turns to faded ghost ink with a faint flicker (≤2px blur). The origin appears below: where the legend came from.
- **The question,** in the app's voice: "Which theory does this point to?" Buttons: the 5 theory titles plus "None of them." Choosing dispatches `PIN_EVIDENCE`.
- **The reveal:** after the user chooses, show how historians read this file: whether they agree, disagree or see no link to the chosen theory, plus `reading.note`. Use the same agree/disagree/no-link logic as the case-report spec.
- Then: **Next file** (the next unopened one) and **Back to the board**. Returning to an already-pinned file shows the user's choice and the reveal, and lets them change their pin.

## 4. Closing the case

**Close the case** → `/verdict`: "Which theory do you believe?" The 5 theory cards, choose one, then **hold to close the case** (a ~1.5s hold that fills like a wax seal; motion.md) → `CLOSE_CASE` → `/report`. Keyboard users can hold Space or Enter. Reduced motion: a plain confirm button.

## 5. The case report

Built entirely from the case-report function. In order, each section with a heading in the app's voice:
1. **Your verdict:** the theory, then its historians' standing revealed with a stamp (Leading / Considered / Rejected) and its reason.
2. **What you relied on:** files pinned to the verdict theory.
3. **Your pins, and what historians say:** every pin, with agree / disagree / no link and the note.
4. **Against your verdict:** opened files that weaken it.
5. **What you never opened:** important files you missed, each a link to open it now.
6. **Legends you trusted:** each with its origin. If any: "You trusted a legend. Happens to the best of us." If none: "Not one legend got past you."
7. **Where historians stand:** every theory with its standing, then `historiansSummary`.

At the bottom: **Reopen the case** (clears the investigation via `REOPEN_CASE`; ask "Are you sure? Your pins will be cleared." inline, never a browser dialog) and **Back to all cases**.

Update the matching voice line in `.kiro/steering/product.md`: replace "You trusted a novelist. Happens to the best of us." with "You trusted a legend. Happens to the best of us."

## Rules

- Fonts, colours, motion and the pointer-cursor rule from steering. Every button and link is keyboard-reachable with a visible focus ring.
- Animate only transform, opacity, filter and clip-path. Reduced motion: same order, fades only.
- No content hard-coded in components; everything comes from the case data.
- Must work at 375px and 1440px.

## Tests

- The board renders 23 folders and 5 theory cards from the data; unopened folders show no status.
- Opening a file marks it opened; choosing a theory pins it and shows the historians' reading.
- Close the case is hidden below the threshold and shown at it; `/verdict` redirects below it.
- The report renders every section from a known state (use a fixed investigation state in the test).
- Reopen clears the state after confirmation.

## Done means

Test, build and lint pass; checked at 375px and 1440px; report in the usual format; commit with [kiro]; push.
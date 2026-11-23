# Brief: Desk fixes (for Claude Code)

Save as `docs/briefs/desk-fixes.md`. These are Robert's notes from playing the desk on desktop after the fix pack. **Desktop only**; don't touch the phone layout. The same ground rules apply as in `docs/briefs/story-dread.md`:
- Read the steering docs first.
- All motion goes through `src/lib/motion.ts`.
- One commit per item, starting `[claude-code]`, with test, build and lint passing at each.
- Install nothing, and skip browser runs.
- Report every error, including the ones you fixed.

## 1. The open file is far too small (bug)
- A clicked file opens as a small, tilted folder in the middle of the screen (about 380px wide), and nothing makes it bigger. The fix-pack spec only set a *maximum* size, so this is the gap.
- **The open folder must be big and straight.** Both covers together should be about 80% of the screen width (at most about 1200px) and up to 86% of the screen height. It sits at exactly 0°.
- **Readable text:** document text is at least 17px and the title at least 28px. A long document scrolls inside the paper.
- Check the flight's end state: the folder must finish at full size with no leftover scale or rotation from the Flip. Add a test for the final size and rotation.

## 2. Pin without opening
- At the moment a file can't be pinned until it's opened. Remove that rule, along with "pinning marks the file opened first".
- **A sealed file can be pinned anywhere** by drag or by the menu. It stays sealed on the board and doesn't count as opened. No reveal is forced.
- `buildCaseReport` already hides the status of unopened files, so the report doesn't change. Check that with a test.

## 3. The floor: every file visible, nothing moves by itself
- **The problem:** files overlap so much that some are hidden or half hidden, and hovering over an empty-looking spot picks up a hidden file. When one file is opened or closed, the others jump to new places.
- **Visible:** lay the 23 folders out in rows across the floor, with small random offsets (up to about ±12px) and tilts (up to about ±6°), so it still looks scattered by hand. **No folder may cover another folder's label.** At most, corners touch. Size the folders to fit the floor at 1366×768 and 1440×900.
- **Stable:** positions are worked out once. Opening, closing, pinning or dragging one file **never moves any other file.**
  - A pinned file leaves a gap on the floor; the others don't close up.
  - A file sent back to the floor returns to its own spot, or to where it was dropped.
- **The player can rearrange:** dragging a file to another spot on the floor moves only that file. Save floor positions in storage under their own key (`histor:case:{caseId}:floor`), so a reload keeps them. This doesn't touch the investigation state.
- **The lamp mustn't hide files.** Right now the files far from the cursor are too dark to read. Raise the ambient light so every label is readable anywhere (at least 4.5:1). The lamp only adds a warm highlight.
- Update `floorLayout` and its property tests: everything is inside the floor, nothing covers a label, the layout is the same every time, and moving one file leaves the others where they were.

## 4. Stacks under a theory
- When many files are pinned to one theory, the stack grows into a tall column that covers the board. If you pin all 23 to one theory, it fills the screen.
- **A tidy pile:** pinned files show as a neat pile under the note. At most four edges are visible, the top file's label shows, and a count badge says "×7".
- **Clicking or hovering on the pile** opens a list of its files in a panel over the board (it scrolls if long). From that list you can open a file or drag it out.
- **The board never grows.** Every pile fits under its note at 1366×768.

## 5. The threads
- The red threads land in the wrong places, sometimes stretch huge for no reason, and with many pins they fan out into an ugly bundle.
- **One thread per theory**, from the note's pin to the top of its pile, with a gentle, consistent sag.
- Measure both ends from the real elements after layout and after every Flip finishes. Re-measure on resize with a `ResizeObserver`. A thread must never point somewhere stale.
- There's no thread for the "None of them" tray.

## 6. Theories look different from files
- Right now the theory notes and the files are the same paper colour, and the notes are hard to read.
- **Make the theories slate cards:** dark slate-grey, like the ship's log slate, with chalk-cream text. That gives the scene more light and contrast, and ties into the story.
  - Add `slate` and `chalk` tokens to `src/index.css`.
  - Keep the Grenze Gotisch title. The claim uses Old Standard TT at 16px or more.
  - Contrast is at least 7:1.
- The files stay manila, so you can tell the two apart at a glance.

## 7. Remove the opened-files count
- Remove "7 of 23 files opened. You can close the case." from the header.
- The wax seal "Close the case" simply appears, with its animation, once the threshold is reached. The guide (`story-dread.md`, item 1.5) explains when the seal appears.
- The first-visit hint line stays.

## Later (not in this brief)
A different cursor for each state (hovering a file, carrying one, reading) belongs to the decoration pass.

## Done means
- Items 1 to 7 are built in order, one commit each.
- The case validates.
- The steering `design.md` describes the slate theories, the floor rules and the piles.
- The report lists every error.
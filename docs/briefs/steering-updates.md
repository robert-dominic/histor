# Proposed steering updates (from Claude Code)

The briefs `desk-fixes.md` and `story-dread.md` ask for the steering docs to describe what was built. Claude Code may not edit `.kiro/` (CLAUDE.md rule 1, and the edit was blocked), so the new text is collected here, ready to paste in. Each block says which file and which part it replaces.

## design.md

### "The desk (desktop)": replace the first paragraph and its first three bullets

On a screen 1024px wide or more the investigation is **one fixed screen** that never scrolls: a compact header of fixed height (the title, the hints, the wax seal), the board of theories on top (about 46% of the rest) and the **floor** below (about 54%), with the tray labelled "None of them" (13rem) beside it. Nothing that comes or goes in the header changes the size of the board or the floor.
- **The floor:** the files lie flat in rows across the table, seen from above, each a little off its spot (up to ±12px) and tilted (up to ±6°), so they still look scattered by hand. **No folder covers another**: each lies inside its own cell, so at most their edges touch and every tab and label shows. Every floor folder has one fixed size (7.75rem by 6rem), drawn as large as fits and never below 75%. Their places come from one pure function (`floorLayout`) of **all** the case's file ids and the floor size, so they are the same every visit.
- **Nothing moves by itself.** Opening, closing, pinning or dragging one file never moves another. A pinned file leaves a gap; a file sent back returns to its own spot or to where it was dropped. A folder the player drops elsewhere on the floor moves alone, and its spot is kept in storage under `histor:case:{caseId}:floor`, apart from the investigation.
- **The lamp never hides a file.** The ambient light is high enough that every label reads at 4.5:1 or more anywhere on the desk; the lamp only adds a warm highlight where it points.
- **An open file** is big, centred and exactly straight: both covers together are 80% of the screen wide (at most 75rem), and the folder is 70% to 86% of the screen high. Document text is at least 17px, the title at least 28px. Its document scrolls inside the paper, with a thin scrollbar.

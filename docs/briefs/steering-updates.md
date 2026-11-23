# Proposed steering updates (from Claude Code)

The briefs `desk-fixes.md` and `story-dread.md` ask for the steering docs to describe what was built. Claude Code may not edit `.kiro/` (CLAUDE.md rule 1, and the edit was blocked), so the new text is collected here, ready to paste in. Each block says which file and which part it replaces.

## design.md

### "The desk (desktop)": replace the first paragraph and its first three bullets

On a screen 1024px wide or more the investigation is **one fixed screen** that never scrolls: a compact header of fixed height (the title, the hints, the wax seal), the board of theories on top (about 46% of the rest) and the **floor** below (about 54%), with the tray labelled "None of them" (13rem) beside it. Nothing that comes or goes in the header changes the size of the board or the floor.
- **The floor:** the files lie flat in rows across the table, seen from above, each a little off its spot (up to ±12px) and tilted (up to ±6°), so they still look scattered by hand. **No folder covers another**: each lies inside its own cell, so at most their edges touch and every tab and label shows. Every floor folder has one fixed size (7.75rem by 6rem), drawn as large as fits and never below 75%. Their places come from one pure function (`floorLayout`) of **all** the case's file ids and the floor size, so they are the same every visit.
- **Nothing moves by itself.** Opening, closing, pinning or dragging one file never moves another. A pinned file leaves a gap; a file sent back returns to its own spot or to where it was dropped. A folder the player drops elsewhere on the floor moves alone, and its spot is kept in storage under `histor:case:{caseId}:floor`, apart from the investigation.
- **The lamp never hides a file.** The ambient light is high enough that every label reads at 4.5:1 or more anywhere on the desk; the lamp only adds a warm highlight where it points.
- **An open file** is big, centred and exactly straight: both covers together are 80% of the screen wide (at most 75rem), and the folder is 70% to 86% of the screen high. Document text is at least 17px, the title at least 28px. Its document scrolls inside the paper, with a thin scrollbar.
- **Piles under a theory.** On the desktop desk, the files pinned to a theory lie in one tidy pile under its note: at most four edges show, the top file's label shows, and a brass badge counts them ("×7"). The pile keeps one height whatever the count, so the board never grows. Clicking it (or hovering, with a mouse) opens a panel of its files over the board, one tab each, which scrolls when long; a tab there shows its historians' slip and a link to the file, and can be dragged out (the panel fades while it is carried). The panel opens by itself to show the slip of a file just pinned, until the next action. The phone layout keeps its list of tabs.
- **Threads.** On the desktop desk there is one thread per theory, from the brass pin at the foot of its note to the pin on the top file of its pile, with the same gentle sag for all (12px). The "None of them" tray has none. Both ends are measured from the real elements after layout, again after every Flip on the desk finishes, and whenever the board, a note or a pile changes size (ResizeObserver), so a thread never points somewhere stale. The phone desk keeps one thread per file.
- **Slate theories.** On the desktop desk each theory is a slate card (`slate`, #2f3a3f), like the ship's log slate, written in chalk (`chalk`, #ece6d6): 9.4:1. The title stays Grenze Gotisch; the claim is Old Standard TT at 16px. The board sits above the lamp's shadow, so the slates keep that contrast anywhere. The files stay manila, so the two can be told apart at a glance. The phone desk keeps paper notes.

### "Colour: the Ash palette": add two rows to the table

| `slate` | #2f3a3f | Theory cards on the desktop desk: the ship's log slate |
| `chalk` | #ece6d6 | Writing on slate (9.4:1) |
- **No count in the desktop header.** The header no longer says how many files are open. The wax seal "Close the case" simply appears there, pressing in, once enough files are open; the desk guide says when. The first-visit hint line stays. (The phone desk keeps its progress line beside the pile.)

### "The story: cinematic scenes": replace the "The opening scene" bullet

- **One opening, on the first scene.** After the legend intro the story opens on chapter 1's own scene: its image, full screen, under its camera. Over it the quill writes the case title large, the years are typed under it one letter at a time, the UNSOLVED stamp lands, then the teaser and a quiet scroll cue. As the reader scrolls, they clear (on their own timer, `ink.out`, never left half faded), the title floats up and docks into the case header (which stays empty until then), and chapter 1's heading and text column begin on the same image. One image, one title. Scrolling back brings the opening back and takes the title out of the header. Under reduced motion the opening is a plain screen at night before chapter 1.

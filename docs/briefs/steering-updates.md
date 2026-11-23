# Steering updates (from Claude Code): applied

These notes were collected while `.kiro/` edits were blocked during `desk-fixes` and `story-dread`. **All of them have now been written into the steering docs** (`design.md`, `motion.md`, `product.md`, `structure.md`), and `night-run` superseded several of them: the piles became always-visible cascades, the story's text column and its entrances became pages written by the pen, and the opening scene and play card were removed. The steering docs are the source of truth; what follows is kept only as history.

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

### "The desk (desktop)": add

- **Labels.** A small label above the board, "Theories", and one over the floor on its own line, "Evidence · {n} files" ({n} from the data). Special Elite, small capitals, in a muted night tone (`night-ink` at 65%, so it still reads on the night desk); quiet, not headings.
- **The guide.** "How to investigate" opens by itself on the first visit to the desk (remembered in storage, `histor:desk-guide:{caseId}`), and the **?** opens it again. Its first sentence is the case's own (`Case.deskGuideIntro`), then the theories, the evidence ("the folders on the floor" on a desktop, "the files below" on a phone), what the stamps mean, how to pin, and when the seal appears.

## motion.md

### "2. The motion tokens": add five rows to the table

| `story.surface` | `power3.out` | 0.9s (its share of the scroll) | A normal sentence rising out of the dark: each word slides up from behind its own mask edge, one after another |
| `story.weighted` | `power4.out` | 0.7s | A weighted phrase landing on its own after a beat of stillness (`STEP.slow`); then a thin rust line grows under it |
| `story.breath` | `sine.inOut` | 2.4s | The breath before a hook: the column has cleared, the image darkens further and the camera creeps closer (to 1.05); nothing new appears |
| `story.hook` | `back.out(2.2)` | 1.1s per word | A hook arriving word by word (one every 0.55s of scroll), slower than anything else; its letters start a little out of line (up to 5px, 7px, 12°, from their position) and snap into place |
| `story.decay` | `power1.in` | 0.35s per letter | A hook leaving: its letters disappear one at a time, in a fixed random order, over 1.8s, like ink drying away |

The story's entrances play on the scrubbed timeline, so their durations are seconds of scroll and scrolling back reverses them. The words and letters are split by React (`StoryWords.tsx`), not measured afterwards, so every portal stays whole. Screen readers get the full text once (the split copies are `aria-hidden`). Under reduced motion everything simply appears.

### "6. GSAP and smooth scrolling": add

- **The story's scroll feel** is one constant, `SCROLL_FEEL` in `src/lib/story-column.ts`: pixels of scroll per second of the timeline (0.3 of the screen, 160 to 280px; twice the old distance per sentence) and Lenis's wheel multiplier on the story page (0.8). Tune both by feel.

### "4. The question and the fork" (product.md) / "The story" (design.md): add

- **The central question is a chokepoint.** A pinned, full-black screen. The question builds phrase by phrase, split at its commas and before "and" (`splitQuestion`), each phrase on its own line, written in with `ink.in`; its weighted parts (`Case.centralQuestionEmphasis`) land like weighted words. Each phrase is a stop: ScrollTrigger snaps to its label (`labelsDirectional`, `story.settle`) once the reader stops, which works with Lenis (Lenis adopts native scrolls while it is not smoothing); the scroll is never locked. The fork only appears once the whole question is on screen, after a hold. "Play the story" reads through it at the same pace. Under reduced motion the question is shown whole, then the fork.

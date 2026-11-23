# Brief: Quick fixes after the night run

Save as `docs/briefs/quick-fixes.md`. These are Robert's notes from playing the night-run build on desktop. The same ground rules as `docs/briefs/night-run.md` apply:
- Don't stop to ask questions; list your choices in the report.
- One commit per item, starting `[claude-code]`.
- All motion goes through `motion.ts` and `STORY_PACE`.
- Install nothing, and skip browser runs.

## 1. Hooks and the question come too slowly
- The hook line currently reveals a word or two per bit of scroll ("Not one of…", scroll, "…them would ever…", scroll). It's far too slow.
- **Hooks:** once the reader reaches the hook, the whole line snaps in on a timer (misaligned letters settling, about 0.8s in total), then holds. Don't scrub it word by word. Shorten the hook's scroll distance to match.
- **The central question:** each phrase plays in on a timer (about 0.6s) as soon as its stop is reached, not letter by letter with the scroll. Keep the snap stops.
- Update `STORY_PACE` and the tests.

## 2. Bug: the play modal never appears
- Robert never saw the "Play the story / Read at my pace" modal. The likely cause: it only opens after the legend intro, which is skipped on return visits.
- **Open it every time the story begins:** after the legend intro, *and* whenever the reader arrives at the story without the intro (a return visit, a reload or a direct link). It shows once per page load, before chapter 1 starts.
- Add a test for the return-visit path.

## 3. The roll call goes on the other side
- In chapter 1, the ten names are packed into the same panel as the chapter text.
- Put the roll call **on the opposite side of the screen** from the text panel, in its own quiet column over the image. The text panel then holds only the chapter's text.

## 4. Headings always fit on one line
- "Everything, except the people" breaks onto two lines. A chapter heading must never wrap.
- Fit each heading to the panel's width: start at the design size and shrink until it fits on one line, with a sensible minimum. If it still won't fit at the minimum, let the panel widen for that chapter.
- Add a test that every heading in the case is set to a single line (`white-space: nowrap` plus the fitting logic).

## 5. No "Illustration" tag on the image
- The visible "Illustration" label on the AI deck still (`s-aboard`) obstructs the scene. Remove the visible label from story images.
- **Honesty stays:** the ⓘ credit must begin "AI illustration." for any image with `isIllustration: true`. Update the steering rule in `design.md` to match.

## 6. A bigger board
- Pinned strips get cut off, so you have to scroll inside them to read a file's name.
- **Give the board more room:** about 60% board and 40% floor, with the floor folders shrunk to fit and every label still fully visible.
- **Strips show their full label**, wrapping to two lines if needed, never cut off. The cascade scrolls only when the pile is taller than the space under its note.
- Check that it fits at 1366×768.

## Done means
Items 1–6 are built, one commit each. Tests, build and lint pass. The steering docs match. One report, then push.
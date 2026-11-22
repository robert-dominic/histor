# Brief: Story dread and UX fixes (for Claude Code)

Save as `docs/briefs/story-dread.md`. These are Robert's notes from playing the build after the fix pack, plus a new rhythm for the story. Build them in order, one commit each.

## Ground rules
- Read `.kiro/steering/` first, especially `motion.md`, `design.md` and `tech.md`. They're the house rules.
- **All motion goes through `src/lib/motion.ts`.** The motion audit test must keep passing. If you need a new kind of movement, add a named token there with a purpose, rather than writing an ease or duration in place.
- Don't change `src/lib/case-report.ts` or the investigation logic. The one approved type change is in section 2.1.
- Each item ends with `npm test`, `npm run build` and `npm run lint` passing, and a commit starting `[claude-code]`.
- **Saving data:** install nothing and download nothing. Skip browser runs: Robert checks the result by eye.
- Report every error you hit, including the ones you fixed, then push at the end and stop.

---

## 1. Fixes

### 1.1 The play card leaves by itself
- The card no longer waits forever for an answer. If the reader keeps scrolling while it's shown (about 60% of a screen past the point where it appeared), it slides away (`ink.out`).
- That counts as "Read at my pace". Scrolling *is* the answer. Clicking either option still works as now.

### 1.2 Slower text on trackpads
On a trackpad (what most people use), the column moves too fast.
- Roughly **double the scroll distance per sentence**, including the minimum.
- Lower Lenis's wheel multiplier on the story page (start at 0.8).
- Keep both values together in one exported constant with a comment, so Robert can tune them by feel.

### 1.3 One opening, not two
- The opening scene and chapter 1 currently show the same painting twice, with a seam between them. The title and years also show in the header *and* in the scene.
- **Merge them into one continuous scene.** The title, years, UNSOLVED stamp and teaser appear over chapter 1's image. As you scroll, the title floats up and docks into the header, and chapter 1's text column begins on the same image.
- One image, one title. The header stays empty until the title docks into it.

### 1.4 The years type in cleanly
"1872 – 1873" currently appears half faded, with letters overlapping. It must type in one character at a time, with nothing overlapping and nothing left half visible at rest.

### 1.5 The desk guide
Replace the guide's text with the following, using the case data for the title, year and counts. Show it **automatically on the first visit to the desk** (remembered in storage), and keep the **?** to reopen it. On desktop it says "floor". In the phone layout, say "the files below" instead.

> **How to investigate**
>
> *In {year} the {title} was found adrift with no one aboard. People have argued about why ever since. Your job is to weigh the evidence and decide what really happened.*
>
> **The theories:** the notes on the board. Each one is an explanation people have given for what happened. Some still stand; some fell apart long ago.
>
> **The evidence:** the folders on the floor. Each one holds a fact, a claim or a story about the ship. Open one to read it.
>
> **What the stamps mean.** Every file you open is stamped:
> - **Record:** written down at the time, like the logbook, sworn testimony and official reports. Solid ground.
> - **Disputed:** the facts are real, but historians argue about what they mean.
> - **Legend:** added later by storytellers. Famous, but it never happened.
>
> **Pin it:** decide which theory the file points to, then drag it onto that note or use "Pin to…". If it fits none, choose "None of them". You can move it any time. After you pin, you'll see what historians think.
>
> **Close the case:** open {closeThreshold} files and a wax seal appears. Choose the theory you believe, and get your case report: where you agreed with the historians, and where you didn't.
>
> *A warning: the most famous details are often the ones that never happened.*

The intro sentence names the Mary Celeste and the ship, so it's case-specific. Put it in the case data if the guide is meant to be generic, or keep it in this case's copy. Ask if it isn't clear where it belongs.

### 1.6 Labels on the desk
- A small label above the board: **"Theories"**.
- A small label over the floor: **"Evidence · {n} files"**, with `{n}` taken from the data.
- Both use Special Elite and the muted tone. They're quiet, not headings.

---

## 2. The story's rhythm

**The problem:** every sentence enters the same way, so calm lines and terrifying ones feel identical, and nothing lands. **The fix:** different entrances for different moments. Add each as a named token in `motion.ts`.

### 2.1 Weighted words (approved type change)
- Add an optional `emphasis?: string[]` to `StorySection` in `src/types/case.ts`.
- Validate it: each phrase must be non-empty and must appear word for word in that section's plain text (the body or the hook, after `{{ref:…}}` markup is resolved to its label). Add a spec line in `.kiro/specs/histor-data-foundation/requirements.md`, and unit tests.
- **The Mary Celeste's phrases.** Check each against the current text in `src/cases/mary-celeste/case.ts`. If one doesn't match exactly, fix the phrase, never the story.
  - `s-voyage`: "ten people", "two-year-old daughter"
  - `s-last-entry`: "last entry", "six miles"
  - `s-found`: "Nine days later", "alone for nine days"
  - `s-aboard`: "No one was there.", "Not little Sophia.", "three and a half feet deep"
  - `s-inquiry`: "not blood", "Not one body was ever found."
  - `s-question`: "why they went"

### 2.2 The four entrances
1. **Normal sentences rise out of the dark.** Each line slides up from behind a mask edge, word by word, like something surfacing from water (`ink.in`). This is the default.
2. **Weighted words arrive alone.** The sentence appears without its weighted phrase, the phrase's space held empty. After a beat of stillness, the phrase lands on its own, and a thin rust line grows under it. Scrolled, not timed, so scrolling back reverses it.
3. **The breath before a hook.**
   - Before each hook, the column clears (`ink.out`), the image darkens further and the camera creeps closer, for a stretch of scroll where nothing new appears.
   - Then the hook arrives word by word, slower than anything else. Its letters start slightly misaligned (small random offsets and rotations) and snap into place.
4. **Endings that decay.** When a hook leaves, its letters disappear unevenly, one at a time in a random order, like ink drying away, instead of fading out together.

Screen readers still get the full text once, as now. Under reduced motion, everything simply appears.

---

## 3. The central question as a chokepoint

The central question ("Why would Captain Briggs abandon a sound ship…") can currently be scrolled straight past. It's the most important line in the app.

- **A pinned, full-black screen.** The question builds **phrase by phrase**, split at its commas and before "and". Each phrase is written in with `ink.in`, and the weighted parts ("his two-year-old daughter", "in the middle of the Atlantic") arrive like weighted words (2.1).
- **Each phrase is a stop.** Use ScrollTrigger's snap to labels (check it with Context7 and make sure it works with Lenis), so the scroll settles on each phrase like a magnet. Never lock the scroll completely.
- The fork ("Investigate" or "Leave") only appears once the whole question is on screen, after a short hold.
- "Play the story" reads through it slowly, stopping on each phrase.
- Under reduced motion, the question is shown whole, then the fork.

---

## Done means
- Items 1.1 to 3 are built and committed one by one, with tests, build and lint passing at each.
- The case still validates with zero errors.
- The steering docs (`motion.md`, `design.md`) describe the new entrances and the chokepoint.
- A final report that lists every error and the speed constants Robert can tune. Push, then stop.
# Brief: Story in steps, plus desk and portal fixes

Save as `docs/briefs/story-steps.md`. These are Robert's notes after the quick-fixes build. The same ground rules as `docs/briefs/night-run.md` apply:
- Don't stop to ask questions; list your choices in the report.
- One commit per item, starting `[claude-code]`.
- All motion goes through `motion.ts` and `STORY_PACE`.
- Install nothing; GSAP's Observer plugin ships with `gsap`, so check its API in the installed source.
- Skip browser runs.

Approved type changes: any optional field on `Case` or `StorySection` you need, validated, with a spec line and tests.

---

## 1. The story becomes steps, not a long page

**Why:** the story is still one long scrolling page. A fast trackpad flick crosses several chapters in half a second, and the animations can't keep up. That causes three bugs:
- the play modal can be scrolled past;
- hook text hitches and sticks on the wrong page (fragments like "een a" left in the centre);
- the pen's writing is skipped, which takes the fun out.

Tuning the speeds won't fix this. Change the structure.

### 1.1 One gesture, one step
- On desktop and touch with full motion, the story is a **fixed full-screen stage** driven by GSAP **Observer** (wheel, touch and pointer). It no longer scrolls as a long page.
- **The steps, in order:**
  1. The play modal (step 0).
  2. For each chapter, its page (the image, and the pen writing the page).
  3. Then that chapter's hook.
  4. Then the central question, one line per step.
  5. Then the fork modal.
- **One gesture moves exactly one step,** however hard the flick. While a step's animation is playing, input is ignored (an `animating` lock), and extra wheel momentum is swallowed. Use a sensible tolerance, so a trackpad's long tail of small wheel events doesn't fire a second step.
- **While the pen is writing,** a forward gesture finishes the writing at once and stays on the page. The *next* gesture moves on. The reader always sees the page complete.
- **Going back** works the same way, one step at a time. Pages that were already written appear written.
- **Hooks:** only the current step's hook can ever be visible. Entering a step hides every other hook and page immediately, so fragments can't stick.
- **Keyboard:** ↓, PageDown and Space go forward; ↑ and PageUp go back; Home goes to the start. These keys work only while no modal or portal card is open.

### 1.2 The progress rail
- A thin rail on the left edge with one tick per chapter, plus one for the question. The current one is lit (brass).
- Hovering a tick shows the chapter's heading.
- Clicking a tick jumps there, with a quick dissolve. The pages before it count as written, with no pen.
- It is on-theme and quiet, and hidden while a modal is open.

### 1.3 The play modal can't be skipped
- Step 0 is the play modal. No gesture moves past it. The story begins only after "Play the story" or "Read at my pace" (Esc means read).
- This covers every path: from the legend intro, on a return visit, after a reload, and from a direct link.

### 1.4 "Play the story"
- It advances the steps on a timer: it waits for the pen, then the reading time (`STORY_PACE`), then moves on.
- Any user gesture pauses it, as now. The floating play/pause control stays.

### 1.5 After the story
- Once the fork modal is answered, normal navigation carries on as now: "Investigate" goes to the desk, and "Leave" does what it does today.
- If any content below the story must stay reachable, release the stage after the fork and scroll normally from there.

### 1.6 Reduced motion and accessibility
- Under reduced motion, keep a normal scrolling page: stacked chapters, pages already written, hooks as plain text, and the modals without animation.
- Screen readers get the whole text in order, as now.
- Lenis isn't used on the story stage; keep it wherever the page still scrolls normally.

### 1.7 Remove what this replaces
Remove the scroll-scrubbed page and hook timelines, the "scroll a quarter second to finish writing" rule and the scroll-distance constants that no longer apply. Update `STORY_PACE` and the tests, including a test that a burst of 50 wheel events moves exactly one step.

---

## 2. The question's line breaks come from the data
- Add `centralQuestionLines?: string[]` to `Case`. Validate that its lines, joined with single spaces, exactly equal `centralQuestion`.
- The question shows one line per step, using these lines when present (otherwise the current comma split).
- The Mary Celeste lines are:
  1. "Why would Captain Briggs abandon a sound ship,"
  2. "one he partly owned, and put his wife,"
  3. "his two-year-old daughter"
  4. "and his crew into a small lifeboat"
  5. "in the middle of the Atlantic?"
- Weighted parts (`centralQuestionEmphasis`) work as now.

## 3. The crew list slip
- In chapter 1, the roll call becomes **a crew list**: a small aged-paper slip pinned at a slight angle on the right side of the scene. It's headed "Crew list · Mary Celeste · Nov. 1872" (from the case data, so it stays reusable).
- The pen writes each name, with the role beside it, in dark ink.
- When the hook comes, the names fade off the slip last to first, leaving the paper empty.
- Paper and ink make it readable whatever the image behind it.
- Add a rule to `design.md`: any text placed over an image must sit on paper or on a dark fade that guarantees at least 4.5:1.

## 4. Portals
- **Bug:** portal names inside an opened file are underlined but don't open. Make them work exactly like the story's.
- **Hover:** on devices with a fine pointer, resting on a portal name for about 0.3s opens its card. Moving onto the card keeps it open, and moving away from both closes it after a short grace period. A click pins it open. Touch and keyboard work as now.
- This applies in the story and inside files.

## 5. Desk
### 5.1 Drop where I drop
- **Bug:** a pinned file dragged back to the floor snaps to an automatic position instead of where it was dropped.
- **The drop point always wins.** The file lands exactly where it was released (clamped inside the floor), and that position is saved. It returns to its original spot only when it's sent back by the menu ("Back to the floor").

### 5.2 Readable floor labels
- At 1366×768, the floor folders shrank to about 64%, and their labels to about 8px. Too small.
- **Floor label text is never below 12px.** Work out the split floor-first: the floor gets the height it needs to show 23 folders at that minimum size, and the board takes the rest (aim for about 55/45, never smaller than the board needs for its notes). Check at 1366×768 and 1440×900.

### 5.3 One "Case files" label
- Remove "THE CASE FILES" from the desk's top bar. Keep "Case files · {n}" over the floor.
- The top bar holds the seal when it's time to close the case.

---

## Done means
- Items 1 to 5 are built, with one commit per numbered item (1.1–1.7 may be grouped where they can't be split).
- Tests, build and lint pass, and the case validates.
- The steering docs match: `design.md`, `motion.md`, `product.md` and the scenes doc.
- One report that lists every choice and the constants to tune. Push.
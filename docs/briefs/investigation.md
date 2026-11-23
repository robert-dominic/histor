# Brief: A more eventful investigation, plus story fixes

Save as `docs/briefs/investigation.md`. The same ground rules as `docs/briefs/story-steps.md` apply:
- Don't stop to ask questions; list your choices in the report.
- One commit per item, starting `[claude-code]`.
- All motion goes through `motion.ts`.
- Install nothing, and skip browser runs.

Approved: optional fields on `Case`, `Theory` or `Evidence` if needed, validated, with spec lines and tests. `buildCaseReport` stays as it is. New scoring goes in its own pure module.

**Why:** the investigation works, but nothing *happens*: open, pin, see what historians think. These items give it moments, a board that answers back, and an ending worth sharing.

---

## 1. Every stamp is a moment
The status reveal is the investigation's heartbeat. It plays on a file's **first** opening only; files already read open quietly, as now.
- **Record:** the stamp lands heavy (`stamp.hit`), with a tiny shake of the folder (about 2px, under 150ms) and the ink spreading slightly as it settles. Under the stamp, a small typed note: "Written down at the time."
- **Disputed:** the stamp lands a little crooked. The second sheet slides in askew, and the "?" is drawn in the margin, as now. Typed note: "Historians argue over this one."
- **Legend:** the stamp lands, then the ink **drains**: the text fades to ghost-ink, the paper yellows and the ink drifts, as now but slower and more visible. Then the pen writes at the bottom of the page: *"You almost believed this."*
- These are app-voice lines, so they go in the shared UI copy, not in the case data. Add them to `product.md`'s voice section.
- Emit a sound event for each kind (`stamp:record`, `stamp:disputed`, `stamp:legend`). Nothing listens yet.
- Under reduced motion, the stamp and the note simply appear.

## 2. The theories answer back
The board should show **your** argument building up. It reacts to the player's pins only; it never reveals what historians think.
- **A theory with 3 or more files pinned** grows heavier: brighter chalk, a soft brass edge, a deeper shadow and a slight lift. The theory with the most pins gets the strongest edge.
- **A theory with nothing pinned, once the player has opened 4 or more files,** goes dim and its corner curls slightly, as if it's being forgotten. It recovers the moment something is pinned to it.
- Changes animate (`layout` or `hover`) and never jump.
- Keep the rules in a small pure function (pins in, weight level out), with tests.

## 3. The verdict becomes a reveal
After the player confirms their theory at the verdict:

### 3.1 The reveal
- The lamp narrows. The typed line reads *"Most historians lean toward…"*, then the theories with `standing: 'leading'` are written in by the pen, one by one.
- Then one line compares them with the player's choice:
  - If the player's theory is a leading one: *"You stand with the historians."*
  - If it's one that was ruled out: *"Historians ruled this one out:"*, followed by that theory's `standingReason`.
  - Otherwise, a neutral line that fits the data.

### 3.2 The rank
- A pure function `caseRank(report)` returns one of three ranks, worked out only from `buildCaseReport`'s output:
  - **Historian:** no legends relied on, and a leading theory chosen.
  - **Investigator:** at most one legend relied on, *or* a leading theory chosen.
  - **Deckhand:** anything else.
- Show it as a typed rank card under the reveal, with one line of app voice per rank (for example, Deckhand: "You trusted the stories. The sea keeps its secrets."). Write the lines, keep them short, and list them in the report.
- Test every branch.

### 3.3 The shareable card
- Render a 1200×630 image on a `<canvas>`, in the site's style (paper, ink, the case title and years). It reads:
  - "I closed the {title} case."
  - The rank.
  - "I trusted {n} legends." (or "I trusted no legends.")
  - `histor.space`
- **"Save the card"** downloads the PNG. **"Share"** uses the Web Share API with the file where the browser supports it, and copies the text otherwise. No uploads, nothing sent anywhere.

### 3.4 The report
The full case report follows below, as now.

## 4. Replace the wax seal with a rubber stamp
- Robert doesn't like the wax seal with the "H". A real logo is coming later. Until then, use **no logo mark** anywhere.
- **"Close the case"** becomes a rubber ink stamp in the same style as the header's UNSOLVED tag: a rectangular rust-ink frame with typed capitals. It thunks into the top bar (`stamp.hit`) once the threshold is reached.
- At the verdict, confirming a theory **stamps** it with the same style ("CHOSEN"), instead of pressing a wax seal.
- Update `design.md`.

## 5. The crew list, in sequence
- **The page step:** the slip **isn't on screen** until the pen reaches the roll call. Then it appears (`paper.lift`, `paper.land`), and the pen writes the names onto it.
- **The hook step:**
  1. The names **un-write** one by one, last to first: the same pen animation played backwards.
  2. Then the empty slip leaves.
  3. **Only then** does "Not one of them would ever be seen again." appear.
- **Stepping back** reverses all of it in order.

## 6. Stepping back into a hook: darkness first
- Going back, the hook text briefly shows over a lit image before the darkness arrives.
- **The order must be symmetric.**
  - Forward: the image darkens, then the text appears.
  - Backward: the text leaves, then the light returns.
  - Entering a hook from either direction: dark first, then text.
- Add a test that checks the order both ways.

---

## Done means
- Items 1 to 6 are built, one commit each.
- Tests, build and lint pass, and the case validates.
- The steering docs match.
- One report with every choice, the rank lines and the constants to tune. Push.
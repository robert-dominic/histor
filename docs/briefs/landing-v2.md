# Brief: Landing page v2 (corrections) and the loading screen

Save as `docs/briefs/landing-v2.md`. **This replaces what `landing.md` built wherever they differ.** Keep everything from that build that still fits (the case registry, the haunted frames, the veils, the sealed plaque, the header pills, the phone layout, the credits and the phone-gate fixes). The same ground rules apply:
- Don't stop to ask; list your choices in the report.
- One commit per item.
- All motion goes through `motion.ts`.
- Check in the browser at 1440px and 375px at the end.

**The reference behaviour comes from estheet.com,** studied frame by frame.

---

## 1. The opening sequence
1. A **black** screen. The **Histor wordmark** fades in, centred.
2. Behind it, a **blurred, zoomed-in detail** of the first case's image fades in (for the Mary Celeste, a close crop of the ship from its frame image).
3. The detail **sharpens and pulls back** (the camera zooming out) until the whole image is visible, then it **settles into its haunted frame** in the first section's position.
4. **At the same time,** the wordmark shrinks and moves to the **top left** to become the header logo, and the header pills fade in on the right.
5. Then the first section's title, headline and subline **blur in** (from blur and transparent to sharp), and the progress rail appears.

The whole opening takes about 3–4s. A scroll or click skips to its end state. Reduced motion skips straight to the end state.

## 2. One scroll, one case (stepped, not free-scrolling)
- The landing page is a **fixed full-screen stage** driven by GSAP Observer, exactly like the story's step engine. **One wheel gesture, swipe or arrow key moves exactly one case,** with an animating lock and momentum swallowed.
- **The transition to the next case:**
  - The current frame **scales up and moves up and to the left, out of view**.
  - The next frame, which was **peeking at the bottom right**, **rises and grows into the centre**.
  - The current headline and subline **blur out**, and the new ones **blur in**.
  - The title beside the frame fades and swaps.
  - Going back plays the same in reverse.
- **The URL hash updates** per case (`/#mary-celeste`, `/#jack-the-ripper`, …), and loading a hash opens at that case.
- **The progress rail** on the left: one tick per case, the current one long and bright. Clicking a tick jumps there.
- **After the last case,** the next scroll releases the stage and the page scrolls normally into the **footer** (item 4). Scrolling back up from the footer re-enters the stage at the last case.

## 3. Remove the "more cases" section
Delete the "More cases are being recovered" section completely. The last case section is followed directly by the footer.

## 4. The footer: big, typographic, with character
The current footer is too plain. Redesign it as a **bold typographic footer**, in the style of rare-days.com and dianas-seafood (huge wordmark lettering spanning the width, with clean columns underneath), in Histor's dark palette:
- **The background** is `night`, with the film grain. A thin rule at the top.
- **The giant wordmark:**
  - **"HISTOR"** set very large, spanning nearly the full width (the logo's letterforms, cream).
  - The H keeps its missing-person crossbar.
  - Running **vertically** at the right edge beside it, in small caps, **"LEGEND OR HISTORY"** (like "SEAFOOD" on Diana's).
- **Below it, columns** separated by a thin rule:
  - **The archive:** the list of cases (open ones as links, sealed ones muted with a small "Sealed").
  - **About:** "Histor separates what really happened from what was added later." Plus Credits, Sources, GitHub, "Built with Kiro".
  - **One line of personality** (like Rare Days' "share this day with…"): "Today's legend: *the warm breakfast on the Mary Celeste.* It never happened." Pick a random legend file from the open cases on each visit.
- **The bottom line:** "© 2026 Histor" on the left, and **"Designed and built by Robert"** on the right (Robert links to `DESIGNER_URL`).
- **Motion:** the giant letters rise in, one by one, when the footer scrolls into view. Links get a drawn underline on hover.
- **Phones:** the wordmark scales to fit the width, the vertical text becomes a line under it, and the columns stack.
- Use this same footer on `/credits` and `/sources`.

## 5. The loading screen goes where it belongs
- **"Recovering the files…"** shows only when entering the **desk** (`/case/{id}/files`), while its assets load.
- **The story** (`/case/{id}`) shows **"Opening the case…"**, and only if loading takes longer than about 400ms. Otherwise there's no loader at all.
- **The landing page** has no loading text. Its opening sequence (item 1) is the intro.

---

## Done means
- Items 1 to 5 are built, one commit each.
- Tests, build and lint pass.
- Checked in the browser at 1440px and 375px.
- One report. Push.
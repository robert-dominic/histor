# Brief: Fix pack (motion system, story v2, desk v2, phone gate)

Save as `docs/briefs/fix-pack.md`. Turn it into one Kiro spec named `fix-pack`. The brief is the source of truth: don't add or drop scope. Where it says "approved", the change is already agreed and needs no question.

Robert played the story and the desk as a judge would. They work, but they don't feel like an award-winning site yet: text blinks, things snap into place, the desk scrolls away from you, and the opened file is tilted and cut off. This pack fixes the feel. It's mostly motion and layout, not new features.

Unchanged: the routes and URLs, `src/types/case.ts`, `src/lib/case-report.ts`, the case content in `src/cases/`, the verdict logic and the report wording. `InvestigationProvider` changes only as approved in section 3.7.

---

## 1. Motion system (applies everywhere)

### 1.1 One file of named motion
Create `src/lib/motion.ts`. Every GSAP tween in the app uses its named eases and durations; no tween writes its own ease or duration again. Register the eases once with `CustomEase` where a named GSAP ease doesn't fit. Check the current API with Context7.

| Name | Purpose | Starting point (tune by eye) |
| --- | --- | --- |
| `ink.in` | text appearing | `power3.out`, 0.9s, rise 10px, fade in |
| `ink.out` | text leaving | `power2.in`, 0.45s (exits are always quicker than entrances) |
| `paper.lift` | picking up a folder or sheet | `power2.out`, 0.35s |
| `paper.move` | a folder travelling | `power3.inOut`, 0.6s |
| `paper.land` | a folder settling | `back.out(1.15)`, 0.5s |
| `stamp.hit` | stamps and wax seals | a hard `expo.in` down (0.16s), then a small settle |
| `hover` | hovers and focus | `power2.out`, 0.2s |
| `layout` | anything that changes position or size | Flip, `power2.inOut`, 0.5s |
| `scene` | story cross-dissolves and camera | `sine.inOut`, 1.2s+ |
| `ghost` | legend ink and other uneasy drift | `sine.inOut`, 2–4s, slow and irregular |

Durations come in steps (`fast` 0.2, `base` 0.45, `slow` 0.9, `scene` 1.2) so timings feel related.

### 1.2 No instant visual changes
Every visible change of state animates: menus opening, items moving, slips appearing, threads drawing, files returning. If something changes position or size because of a layout change, use **Flip** (`layout` ease). Nothing snaps, and nothing pushes something else out of the way without moving smoothly. The only exception is reduced motion, which keeps its current fallbacks.

### 1.3 Performance rules
- Animate `transform` and `opacity`. Allowed exceptions: `filter: blur()` only on text during a file's writing reveal (lines, not whole images, and never during scroll), and `stroke-dashoffset` for drawn lines.
- No blur on large images or full-screen layers.
- Set `will-change` only while an element is animating, then remove it.
- Story images get properly sized WebP versions so the camera moves don't stutter.

### 1.4 Smooth scrolling (approved: install `lenis`)
- Add Lenis for smooth scrolling, synced with ScrollTrigger (Lenis drives GSAP's ticker; check the current setup with Context7).
- "Play the story" must work with it (scroll through Lenis, or pause Lenis while playing, whichever Context7 shows is correct).
- Inner scrolling areas (the open file's document) are excluded from Lenis so they scroll natively.
- Turn Lenis off under reduced motion.

### 1.5 Steering
Add the motion system and the "no instant visual changes" rule to `.kiro/steering/motion.md`, so every future task follows it.

---

## 2. Story v2

### 2.1 The opening scene
Replace the current title section and the "Play the story / Read at my pace" section (it leaves too much empty space).
- A full-screen opening scene: the case's first chapter image with a slow camera push, darkened at the bottom.
- The title is written large by the quill, the years are typed under it, and the **UNSOLVED** stamp lands (`stamp.hit`). The case teaser sits under it, then a quiet scroll cue.
- On scroll, the title docks into the header as it does now.

### 2.2 The play card
- After the first scroll past the opening, a small card slides up at the bottom centre (`paper.lift`): **"Play the story"** and **"Read at my pace"**, with the hint "Scroll, or press play."
- It's a card, not a blocking popup: scrolling keeps working while it's on screen.
- Choosing either option sends it away (`ink.out`). It shows once per visit until chosen. The floating play/pause control stays as it is.

### 2.3 Text that stays (replaces the one-sentence beats)
The beats currently fade in and out one sentence at a time. Instead:
- Each scene has a **text column** in its lower part. The chapter's sentences are stacked in it, in order.
- Scrolling moves the column up. New sentences come into view at the bottom, and older ones move up and fade out through a soft gradient mask at the top. Scrolling back brings them back down.
- About **3 to 4 lines** are visible at a time.
- Each sentence still eases in as it crosses into view (`ink.in`), but it **stays** while it's in the visible band.
- **Slower:** each sentence gets a scroll distance proportional to its reading time (240 words a minute), with a generous minimum. Use scrub smoothing so the text glides rather than jumps. Keep the constants in one place.
- The full text stays in the DOM for screen readers, as now.

### 2.4 Headings at their own pace
Chapter headings ("Ten people set sail" and so on) are no longer scrubbed by the scroll. When a scene starts, the quill writes its heading on a timer (about 2–2.5s), whatever the scroll speed. Scrolling back above the scene fades it out quickly (`ink.out`).

### 2.5 Bug: portal names don't open
The underlined names (portals) in the story text do nothing when clicked. Fix this, so a click opens the portrait card as it did before. Opening a card pauses "Play the story".

### 2.6 Unchanged
The roll call, the voyage chart, the hooks with stillness, day into night, the sound events and the reduced-motion version all stay. Adapt them to the text column where needed.

---

## 3. Desk v2 (desktop)

### 3.1 One fixed screen
On desktop (1024px and wider), the desk fits the screen exactly and **never scrolls**: a compact header, the board on top (about 55%), and the floor of files below (about 45%). The board is always in view, so a file can always be dragged to it.

### 3.2 The floor
Replace the fanned arc. The 23 sealed folders **lie flat and scattered on the floor**, seen from above, like files tossed on a table.
- Each folder has a slight tilt (between −8° and 8°). Folders overlap a little, but every folder's tab and label stays visible.
- Positions and tilts are worked out by a pure function from the file ids (seeded, so it's the same every visit) and the floor size. Test it with property tests: every folder is inside the floor, the layout is deterministic, and no label is covered.
- Hover lifts a folder slightly (scale, shadow, brought to the top, `hover`).
- Files that are opened but not pinned lie back on the floor, with their status stamp visible.

### 3.3 Opening a file
- **Bug:** a click currently shows a mini view first, and the full open only happens after a drag. A click must open the file at once with the full flight.
- The folder lifts, **straightens to 0°** as it rises (`paper.move`), and opens in the centre.
- **The open file fits the screen:** centred, straight, at most about 86% of the screen height. If the document is longer, the **document scrolls inside the paper** (a thin scrollbar, excluded from Lenis), while the folder stays still. The page never scrolls behind it.
- Closing (Esc, or a click outside the file) sends it back to its place on the floor or its pinned spot, through the `paper.move` and `paper.land` eases.

### 3.4 The writing reveal
When a file opens for the first time:
1. The title is **written by a small dip pen** (a new small nib, about 24px; not the big legend quill, because these are records written by people), letter by letter, in about 1.2s.
2. Then the rest of the text **settles in line by line**: from a slight blur to sharp, with a fade and a small rise (`ink.in`), staggered and quicker than the title.
3. Then the status stamp lands, and the paper takes its status treatment as it does now (record, disputed, legend).

Rules:
- **Skip:** a click on the document or any key (except Esc, which closes) finishes the reveal at once.
- **Files already read open instantly**, already revealed. Only the first opening plays the reveal.
- Under reduced motion, the text simply appears.

### 3.5 The Pin menu
"Pin to…" opens as a **floating menu over the file**, anchored to its button. It takes no layout space, so nothing shifts. It opens and closes with an animation (`layout` and `hover`). It lists every theory, plus **"Set aside"** and **"Back to the floor"** (when the file is pinned or set aside), so keyboard users can do everything a drag can.

### 3.6 Drag anything anywhere
- **From the floor:** a sealed file can be dragged.
  - Dropped on a theory, it is pinned, but the reveal still plays first: it opens, the stamp lands, then it flies to the note.
  - Dropped on the board outside any note, it opens for reading.
  - Dropped back on the floor, it settles where it was dropped.
- **From the board:** a pinned file can be dragged straight from its note, without opening it, to another theory (re-pin), to the set-aside tray, or back to the floor (unpin).
- **From the tray:** the same as from the board.
- **While dragging over a note,** the folder shrinks (to about 55%) and fades slightly, so the note's title stays readable. The note lights up.
- Threads redraw smoothly whenever pins change (`layout`).

### 3.7 Returning a file to the floor (approved state change)
If the investigation state already supports unpinning, use that. If not, this change is approved:
- Add one action, `unpin(evidenceId)`. It removes the file's pin or set-aside, and the file stays opened.
- In storage, "unpinned" means there's no pin entry, so no migration is needed.
- Add tests and a spec line. `buildCaseReport` is unchanged.

### 3.8 Unchanged
The lamp, the felt board, the brass pins, the threads, the historians' slip, the first-visit hints and the ? guide, the wax seal "Close the case", the verdict, the report, the desk sound events and the reduced-motion fallbacks. Adapt them where the new layout needs it, and route all their motion through section 1.

---

## 4. Phones

- **The story** works on phones as it does now.
- **The investigation** (the fork's "Investigate" and every desk URL) shows a gate on screens narrower than 1024px. It's one on-theme screen: *"This case is too big for a small screen."* and *"Open Histor on a laptop to investigate."*, with a **"Continue anyway"** link under it, remembered for the session.
- "Continue anyway" shows the existing phone desk unchanged. Mobile polish comes later.

---

## 5. Saving data (Robert works on a paid mobile hotspot)

- **Install nothing** except `lenis`. Download nothing else.
- Use Context7 only for an API you haven't already checked in this session.
- **Browser checks happen once, at the final task.**
  - Use one Chrome profile for every run: `--user-data-dir=/tmp/histor-chrome --no-first-run --disable-component-update --disable-background-networking --disable-sync --disable-features=OptimizationGuideModelDownloading,OptimizationHints`.
  - Check desktop at 1440×900, and check the phone gate only at 375×667.
  - Prefer DOM measurements to screenshots. Take at most **6 screenshots** in total, and only to confirm something visual.
- Keep the build in its own session, separate from the spec session.

## 6. Done means

- `npm test`, `npm run build` and `npm run lint` all pass.
- The final browser check covers:
  - The story opening and the play card.
  - The text column, scrolling down and back.
  - Portal names opening their cards.
  - The desk fitting the screen with no page scroll at 1440×900.
  - A full investigation done by drag only: floor → theory, board → another theory, board → floor, board → tray.
  - The writing reveal and skipping it.
  - A long document scrolling inside the paper.
  - The Pin menu not moving the file.
  - The phone gate.
- No console errors.
- The steering docs and `docs/content/mary-celeste-scenes.md` match what was built.
- Each task ends with a `[kiro]` commit; push at the final task. One final report in the usual format, listing every error hit, including those fixed.
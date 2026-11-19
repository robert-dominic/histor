# Brief: The investigation desk

For Kiro (default agent, Opus). Read every file in `.kiro/steering/` first. Use Context7 for current GSAP docs (Draggable, Flip, quickSetter). This redesigns how the investigation *looks and feels*. Keep the routes, the `InvestigationProvider` actions, `buildCaseReport` and all report logic exactly as they are.

## Why

The board works but feels static. It should feel like sitting at a real investigator's desk at night: a lamp, a pile of sealed files, a dark board of theories, and files you physically open, read and pin.

## 1. The desk and the lamp

- A dark desk surface (night-toned, a hint of old wood grain, made with CSS gradients and an SVG noise filter, with no image files), plus the existing grain and a strong vignette.
- **One lamp.** A warm pool of light (brass-tinted) follows the mouse; everything outside it falls into shadow (around 25% brightness). Radius about 420px on desktop. On phones the light rests over the active element and moves to the last tap. Implement it as one overlay with a radial-gradient mask driven by CSS variables set with `gsap.quickSetter` in rAF, with no React re-renders. Reduced motion: a static soft light, centred.
- Text under the lamp must reach the normal contrast rules; the shadow is only for the surroundings.

## 2. The board of theories (top of the desk)

- A dark board (near-black felt, slightly textured) across the top.
- The 5 theories are **paper notes pinned with brass pins,** each slightly rotated (deterministic per theory id), showing title and claim. On phones, keep the compact row from the last fix (title and pin count, tap for the claim).
- Files pinned to a theory **hang beneath its note** as small overlapping folder tabs, each joined to the note by a `rust-night` thread with a slight natural sag (SVG path), pinned at both ends.

## 3. The pile of files (desk, lower left)

- The 23 sealed folders lie in **a real pile:** manila folders with slight offsets and rotations (deterministic per evidence id). Each has a tab with its number and a typed title label. Outside, every folder looks the same: status is never shown before opening.
- **Hover the pile** (desktop): it fans out into an arc so every tab is visible; the folder under the pointer lifts. **Phones:** the pile becomes a horizontal fanned stack you swipe through; the centred folder lifts.
- Unopened folders stay in the pile. Opened and pinned folders move to the board; folders set aside ("None of them") go to a small **Set aside** tray on the desk. You can see your progress on the desk itself.
- A line in the app's voice near the pile: "4 of 23 files opened. Open 2 more to close the case."

## 4. Opening a file (the flip)

- Click a folder, or drag it out of the pile onto the desk. With **Flip**, it rises from the pile, flies to the centre and grows; then **the cover flips open** (3D rotateY around its left edge, with perspective), revealing the inside of a real case folder:
  - **Left (the inner cover):** manila, with a typed label: "HISTOR · CASE FILE 07 · THE GALLEY", and a small index card listing the sources (titles, linked).
  - **Right:** the document itself, held by a paper clip.
  - On phones the folder opens full-screen, and the inner cover's content sits above the document.
- **The reveal:** the document first appears as plain paper. After a short beat the status stamp lands, and **the paper becomes its status**:
  - **Record:** crisp, clean official paper; typed heading; an embossed `record`-blue seal presses in beside the stamp.
  - **Disputed:** a second sheet slides in askew over the first. Sheet one is headed "The claim", sheet two "The challenge". A line on the claim sheet gets struck through in `rust`, a short note appears in the margin (Special Elite, small, `rust`), and the stamp lands smudged.
  - **Legend:** the paper yellows and turns faintly see-through (the desk shows through), and the ink starts to drift: letters fade and return in slow waves. At rest the text must still reach 4.5:1 (use `ghost-ink`). A small typed slip slides out from under it: "Where this came from", with the origin.
- Detail text still renders through `parseRefs`, so portals work.
- Dispatch `OPEN_EVIDENCE` when the folder opens.

## 5. Pinning

- After the stamp, the app asks in its voice: "Which theory does this point to?" and the folder **closes back into its cover** (reverse flip) and stays "in hand" in the centre.
- **Desktop:** drag it (GSAP Draggable) up onto a theory note. Valid drop targets brighten under the lamp. On drop, the thread animates from the note to the folder, the folder snaps beneath the note, and `PIN_EVIDENCE` is dispatched. Dropping it on the Set aside tray means "None of them."
- **Always also available, and the only way on phones or keyboard:** a "Pin to…" button that lists the 5 theories plus "None of them". Dragging is an enhancement, never required.
- **The historians' reveal:** after pinning, a small typed slip appears clipped to the folder (agree / disagree / no link, plus `reading.note`), using the same logic as today. It stays visible on the folder when you reopen it.
- Re-opening a pinned folder shows the user's choice and the slip, and lets them re-pin.

## 6. Teaching itself

- First visit only (remember in localStorage, in try/catch), the app whispers hints in its voice, one at a time, next to the right element:
  1. "Open a file from the pile."
  2. "Drag it to the theory you think it points to."
  3. "Open six files to close the case."
- A small **?** button in the corner reopens a three-step guide panel at any time.

## 7. Closing the case and the report

- At the threshold, a **wax seal** appears on the desk (rust-night wax with a brass-pressed "H"): "Close the case." Clicking it goes to `/verdict`.
- **Verdict:** the five theory notes laid on the desk under the lamp, and the 1.5s hold-to-seal pressing a wax seal onto the chosen note. Same logic as today.
- **Report:** a typed report on paper under the lamp, same seven sections and logic. Stamps for each theory's standing. Keep "Reopen the case" (inline confirm) and "Back to all cases."

## 8. Ready for sound later

Emit events (pile hover, folder open, flip, stamp, pin, seal) through the same small events module as the story. No sound yet.

## Rules

- No content hard-coded: everything comes from the case data.
- Animate only transform, opacity, filter and clip-path. Keep 60fps: the lamp updates via CSS variables only.
- Reduced motion: no lamp movement, no flips (crossfade instead), no drifting ink (static ghost ink), and buttons instead of dragging.
- Keyboard: every folder, button and theory is reachable with Tab, with a visible focus ring; Enter opens; the "Pin to…" menu works with arrows and Enter; Escape closes an open file.
- Must work at 375px and 1440px.

## Tests

Update the existing investigation tests to the new structure, and add:
- The pile renders 23 sealed folders with no status visible.
- Opening a folder dispatches OPEN_EVIDENCE and shows the status after the stamp.
- "Pin to…" pins the file; it moves to the board under the right theory; "None of them" moves it to Set aside.
- First-visit hints appear once and not again.
- Reduced motion renders without flips or lamp movement.

## Done means

Test, build and lint pass. Checked in Chrome at 375px and 1440px, including a full investigation to the report, by drag and by buttons. Report in the usual format, commit with [kiro], push, stop.
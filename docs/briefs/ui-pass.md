# Brief: UI pass (remove, remember, icons, polish)

Save as `docs/briefs/ui-pass.md`. The same ground rules as before apply:
- Don't stop to ask questions; list your choices in the report.
- One commit per item, starting `[claude-code]`.
- Skip browser runs.
- **Approved:** `npm install @vercel/og` (if the permission prompt appears, wait for Robert to approve it).

**The first rule for this brief:** do only what is asked. Don't add buttons, labels or text that a brief doesn't name. If something seems missing, list it in the report as a suggestion instead of building it.

---

## 1. Remove the "Back to the floor" button
- Remove the "Back to the floor" button from the open file. It wasn't wanted, and it appears before the file has finished opening, in the wrong place.
- **Keep:** dragging an open file back to the floor (now fixed), a click outside the file, and Esc. Those are enough.
- **Keep** "Back to the floor" in the Pin menu for keyboard users (it lives in the menu, not on the file).

## 2. The play modal remembers the choice
- Save the reader's choice ("Play the story" or "Read at my pace", plus the Music and Effects switches) in storage (`histor:story-mode`).
- **Once chosen, the modal never appears again.** Coming back to the story (from the header title, a reload or a direct link) starts at the very beginning of the story with no modal, in the saved mode.
- The reader can still switch at any time: the play/pause bar starts "Play the story", and any scroll reads at their own pace.
- The modal shows only to someone who has never chosen.
- Update the tests.

## 3. The result screen: icons, not text
On the verdict and report screen, the actions should be easy to find without scrolling, and look like a mature product.
- **A small sticky action bar** at the top right of the result screen, visible at all times while the result and report are on screen.
- **Icon buttons:**
  - **Download** the PDF report;
  - **Share** (opens the existing share menu);
  - **Save** the card image;
  - **Copy link**.
- **Every icon button has a tooltip** on hover and on keyboard focus: a small paper label with a short delay (about 400ms) and an `aria-label` with the same words.
  - The tooltips read "Download your case report (PDF)", "Share your result", "Save the card" and "Copy the link" ("Link copied" for a moment after copying).
- Remove the text buttons these replace further down the page. The share menu itself keeps its platform list.
- Draw the icons as line icons in the site's style (an ink stroke, about 1.5px), the same size and in a row.

## 4. Popovers and sliders with life
The sound volume popovers (and the share menu) look flat and dry. Give every popover the same considered style:
- **A paper panel:** a 1px border in the night-ink tone at low opacity, soft deckled edges if cheap, inner padding of at least 14px, and a soft shadow so it lifts off the page.
- **Motion:** it opens with a small rise and fade (`paper.lift`) and closes quicker (`ink.out`).
- **The volume slider:**
  - a styled track (thin, warm);
  - a filled part in brass;
  - a round thumb that grows a little on hover and while dragging;
  - the value as a small typed number beside it.
- Make it one shared `Popover` style used everywhere, so they're all consistent.

## 5. Signing the card: the pen adds, it doesn't rewrite
- Right now every change to the name erases the signature and rewrites it from the start.
- **The pen writes only the new letters,** appended at the end. Deleting a letter removes just that letter (a quick fade). Pasting a whole name writes the pasted part.
- A saved name still appears at once, without the pen.

## 6. A share link that shows the player's own card
- After `@vercel/og` is installed, add `api/og.tsx` as the last report described, and set `OG_CARD_READY = true` in `api/r.ts`.
- Validate the inputs as before.

## 7. A livelier footer
- The footer feels flat. Give it life, in the site's style:
  - A slow, faint fog drifting across it, and the brass rule above it drawing in when it scrolls into view.
  - "Histor" in large type, with the logo from `public/brand/histor-logo-cream.svg`.
  - The line "Legend or history? You decide." typed in as it appears.
  - Its links with a hover underline that draws in.
  - A small "Back to the top" icon button with a tooltip.
- Under reduced motion it's static.

## 8. The opening screen isn't centred
- The legend intro (the first screen of the story) has everything centred. Make it an asymmetric, editorial layout:
  - The written legend text sits left-aligned in the left 55% of the screen, large, starting a little below the top third.
  - The image or video bleeds off the right edge, partly behind the text, darkened toward the text side so the text stays readable.
  - The **Legend** stamp lands at an angle, overlapping the last line of the text, toward the right.
  - "See what really happened" sits bottom left, aligned with the text.
- Keep the same content, the same motion and reduced-motion behaviour, and the same phone layout (stacked).

---

## Done means
- Items 1 to 8 are built, one commit each. Tests, build and lint pass.
- One report. Push.
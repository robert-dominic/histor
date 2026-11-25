# Brief: Review fixes (controls, motion both ways, the desk, sound)

Save as `docs/briefs/review-fixes.md`. The same ground rules as `docs/briefs/music.md` apply:
- Don't stop to ask questions; list your choices in the report.
- One commit per item, starting `[claude-code]`.
- All motion goes through `motion.ts`, and all sound through the event table.
- Install nothing, and skip browser runs.

---

## 1. Toggle switches line up with their labels
- In the play modal, the "Music" and "Effects" switches sit higher than their labels. The same happens in the ? guide.
- Centre each switch and its label vertically on one line (`align-items: center`), with a small consistent gap.
- Check every toggle in the app.

## 2. The header sound controls
**Problems:** clicking an icon mutes it *and* opens its popover, which then stays until you click elsewhere. Hovering the other icon opens a second popover over the first.

**The rules:**
- **A click only toggles** that channel on or off. It never opens the popover.
- **On desktop, hover opens the popover.** Moving the pointer into the popover keeps it open. Leaving both the icon and the popover closes it after a short grace period (about 200ms).
- **Only one popover can be open at a time.** Opening one closes the other at once.
- **Keyboard:** focusing an icon opens its popover, and Esc or Tab away closes it.
- **Touch:** a long press opens it, and a tap elsewhere closes it.

## 3. Animations play both ways, every time
Motion is what gives the UI life, so it must never feel like a one-off.
- **The story:**
  - Stepping **back** plays each step's entrance animation too: the page is re-written by the pen, the hook snaps in, and the crew list writes again.
  - Going back plays about 1.5× faster than going forward.
  - Any gesture finishes the current animation at once, as forward does.
  - Remove the "already written pages appear written" rule.
- **The desk:** every time a file is opened, its full reveal plays: the pen writing the title, the text settling, the stamp moment, and "You almost believed this." for legends.
  - A click or a key still skips it.
  - Remove the "first opening only" rule. Keep track of "opened" for the case logic as before.

## 4. Returning an open file to the floor
- Dragging an open file back to the floor takes three or four tries before it sticks. Opening a file must never force a pin.
- **The drop rules:** a file released anywhere that isn't a theory or the "None of them" tray **goes back to the floor**, landing where it was released (clamped inside the floor). Make the floor's drop area generous: the whole floor, and the board's empty space as well.
- **A clear button:** the open file gets a visible **"Back to the floor"** button. Esc and a click outside the file do the same.
- Add tests for drops on the floor, on the board's empty space and on the edges.

## 5. The case title goes to the story
In the header, "The Mary Celeste" is a link to the start of the case's story (`/case/{id}`, step 0) from anywhere in the case, including the desk, file URLs, the verdict and the report. Give it a hover state and a pointer cursor.

## 6. Music from the first screen
- **Bug:** no music plays on the story pages; it only starts on the desk. Find out why the story playlist doesn't start, and fix it.
- **Sound starts at the legend intro** (the very first screen).
  - Browsers need a click or key press before audio can play, so unlock audio on the **first** click or key press anywhere.
  - Until then, show a small, quiet hint at the bottom of the legend intro: "🔊 Click anywhere for sound". It fades once audio is unlocked.
  - Choosing in the play modal also counts.
- The story playlist then plays from the legend intro through the story. The desk playlist takes over on the desk.

## 7. Different dread for each hook
- Every hook currently uses the same boom, which gets boring.
- **Make a pool of 6 distinct dread sounds**, all generated:
  - A deep boom with a long tail.
  - A rising reversed swell that cuts off.
  - A metallic scrape, like a hull.
  - Distant rolling thunder.
  - Two slow, heavy heartbeat thumps.
  - A low, dissonant cluster swell.
- Each hook picks one, never the same as the last.
- A case can optionally assign a specific sound to a hook (`StorySection.hookSound?`, validated). If it isn't set, the pick comes from the pool.
- Add them all to `/dev/sound`.

## 8. Typed text sounds like a typewriter
- **Every piece of text that types itself** in the app voice (Special Elite) gets a **typewriter** sound. That covers:
  - the kickers;
  - the years;
  - "Most people stop here…" in the fork modal;
  - the stamp notes;
  - the rank card;
  - the guide;
  - hints;
  - any other typed line.
- **The sound:** a short mechanical key click with a tiny random variation, at most about 14 a second. Add a carriage-return "ding" at the end of longer lines (over 40 characters).
- **Pen-written text keeps the pen scratch.** The rule is simple: typed text gets the typewriter, written text gets the pen.
- Add both to the event table and `/dev/sound`.

## 9. A footer
- Add a quiet, on-theme footer to the scrolling pages: the end of the story (after the fork), the report and, later, the home page. The fixed one-screen desk has none.
- **Contents:**
  - "Histor" in Grenze Gotisch, with the line "Legend or history? You decide."
  - Links to the case's sources and credits (music, images), the GitHub repository, and "Built with Kiro".
  - © 2026.
- It uses Special Elite at a small size, the muted tone and a thin rule above, with plenty of space.

## 10. One "Share" button with a menu
- On the result screen, replace the row of platform links with **one "Share" button**.
- It opens a small menu (a popover with paper edges) listing:
  - X, Facebook, LinkedIn, WhatsApp, Reddit, Telegram;
  - "Copy link";
  - "Save the image";
  - and, where the browser supports it, "More…" (the native share sheet with the image file).
- Esc or a click outside closes it. It uses the same popover rules as the header sound controls.

## 11. A share link that shows the card (approved: install `@vercel/og`)
**The goal:** when someone shares their result, the post shows **their card as the preview image**, on X, WhatsApp, LinkedIn and the others.

**How:** social platforms read `og:image` tags from the page they're given, and they don't run JavaScript. So:
- **The share link** is `https://histor.space/r/{caseId}?n={name}&r={rank}&l={legendsTrusted}`, with the values URL-encoded and the name capped at 32 characters.
- **A Vercel serverless function** answers `/r/...` with a tiny HTML page:
  - `og:title`, `og:description` and `og:image` (plus the `twitter:card` tags);
  - an instant redirect for humans (a meta refresh and JS) to `/case/{caseId}`.
- **A second function**, `/api/og`, renders the 1200×630 card image with `@vercel/og` (`ImageResponse`) from the same values, in the same design as the canvas card (fonts embedded from the repo's font files).
- Add a `vercel.json` rewrite for `/r/:path*`. Keep the SPA rewrite working.
- Check the current `@vercel/og` usage for a non-Next.js Vercel project in its installed source or README.
- **Validate the inputs:** the rank must be one of the three, the legend count 0–99 and the name plain text only, so nothing can be injected into the page.
- All share options use this link.
- **A static fallback:** add a default site-wide `og:image` (`public/og-default.png`, the Histor title card) to `index.html`, so a plain `histor.space` link also previews well.

## 12. Download the case report as a PDF (approved: install `jspdf`)
- Under the report, add a **"Download your case report (PDF)"** button.
- It generates a one- or two-page A4 PDF in the site's style (paper colour, typed headings):
  - the case title and years, the date, and the player's name if signed;
  - their chosen theory and the historians' view;
  - their rank;
  - every section of the report, with each file's title, its status (or "Sealed") and what they did with it;
  - the case's sources.
- Embed the site fonts if `jspdf` can do it cleanly. Otherwise, use a close standard font, and say which in the report.
- The file name is `histor-{caseId}-report.pdf`.

---

## Done means
- Items 1 to 12 are built, one commit each.
- Tests, build and lint pass.
- `sound.md` and `motion.md` in the steering docs are updated.
- One report. Push.
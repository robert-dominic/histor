---
inclusion: always
---

# Design

## Typography: three voices

The legend is dramatic, the record is old print, and the app talks like a case clerk with a typewriter. All three fonts load from Google Fonts. Never commit font files.

| Role | Font | Use |
| --- | --- | --- |
| The legend, display | Grenze Gotisch | Legend intro lines, case titles, big moments. Headings only: never set paragraphs in Grenze Gotisch. |
| The record | Old Standard TT | Story text, testimony, evidence files, any long reading |
| The app's voice | Special Elite | Stamps, labels, buttons, prompts, small UI text, the app talking. The legend intro's debunk is the app talking, so it uses Special Elite. |

Confirmed. No handwriting face in V1.

## Colour: the Ash palette

Light grey ash, not black. Most spooky entries are near-black; Histor starts in pale daylight and earns its darkness. Define every colour as a token in the `@theme` block of `src/index.css` and use the tokens, never raw hex values in components.

| Token | Hex | Use |
| --- | --- | --- |
| `ash` | #cfcabb | Day background |
| `paper` | #e2ddcf | Evidence files, cards, raised surfaces in day |
| `ink` | #23211d | Main text in day |
| `muted` | #6c6a62 | Secondary text in day |
| `rust` | #9e3326 | Stamps and warnings on light backgrounds |
| `rust-night` | #d0574a | Stamps and warnings on dark backgrounds (rust is too low-contrast there) |
| `record` | #2b4767 | Record status: official ink |
| `ghost-day` | #8f9ea6 | Ghost ink in day for decoration and large text (stamp borders, faded marks). Too faint for body text on paper (about 2:1) |
| `ghost-ink` | #48545b | Legend body text on paper: faded blue-grey that still reaches 4.5:1 (4.7:1 on a legend's translucent paper, 5.7:1 on paper) |
| `night` | #0d1317 | Night background |
| `night-ink` | #e6e1d3 | Main text at night |
| `ghost-night` | #a8c3d3 | Legend text and ghost ink at night |
| `brass` | #c49a5a | The one warm accent: highlights, focus, small fittings |
| `slate` | #2f3a3f | Theory cards on the desktop desk: the ship's log slate |
| `chalk` | #ece6d6 | Writing on slate (9.4:1) |

Body text must reach 4.5:1 contrast against its background; large display text at least 3:1.

**Text over an image** must sit on paper (ink on a paper slip or card) or on a dark fade that guarantees at least 4.5:1 whatever the image behind it. Never set text straight on an image.

## Day into night

- The **legend intro** happens at night: the myth lives in the dark.
- The **story** begins in ash daylight and darkens gradually as it goes, reaching full night at the central question. Each image's grade darkens chapter by chapter, and the sky colour around and behind the full-screen scenes (and the page's scrollbar gutter) follows the chapter on screen.
- The **board and verdict** sit in night, lit by brass and paper.
- A faint grain over everything; light is scarce but text stays readable.

## The story: cinematic scenes

The story is told like a documentary, one full-screen scene per chapter, **in steps, not as a long page** (`docs/briefs/story-steps.md`).

- **Steps.** Under full motion the story is a fixed, full-screen stage driven by GSAP Observer (wheel, touch, pointer); the page behind it does not scroll and Lenis is held off. The steps, in order: the play modal (step 0), then for each chapter its page, then its hook; then the central question, one line per step; then the fork. **One gesture moves exactly one step**, however hard the flick: wheel events closer than `STORY_PACE.gestureGapMs` are one gesture, and a gesture that meets a step still animating is swallowed, tail and all. While a step's animation plays, input is ignored. Going back works the same way, and **plays every step's entrance too** (review-fixes brief, 3): the page is re-written by the pen, the crew list written again, the hook snaps in, a line of the question plays in; all about 1.5× faster than forward (`STORY_PACE.backSpeed`). Motion is never a one-off. Every step ends by setting its exact state, so only the current step's hook or page can ever be on screen. Keyboard: ↓ and PageDown forward; ↑ and PageUp back; Home to the start; only while no modal or portal card is open. Space plays and pauses the story (the autoplay bar), and is not a step.
- **The progress rail:** a thin rail on the left edge, one tick per chapter and one for the question, the current one lit in brass. Hovering or focusing a tick shows its heading; clicking jumps there with a quick dissolve, the pages before it already written. Hidden while a modal is open.
- **Scene:** the chapter's image fills the screen (`object-fit: cover`, `100svh`) under a slow camera on its own timer (scale 1.0 → 1.12 and a slight pan, each chapter a different way). A dark gradient over the bottom 45% keeps text at 4.5:1. All scenes share one stage; the next image cross-dissolves in over the old one.
- **No opening scene.** The story starts on chapter 1. The case header shows the case's title once the story starts, with a small typed UNSOLVED tag beside the years.
- **The play choice** is a real modal before chapter 1: once per page load, as soon as the story comes up the screen however the reader got there (after the legend intro, a return visit, a reload, a direct link), and each time the intro's scroll cue is pressed: the case title written by the pen, one short line, and two big buttons, "Play the story" and "Read at my pace". The reader must choose (Escape means "Read at my pace"); no gesture moves past it, and the story begins only once they choose; focus is trapped and returns afterwards. "Play the story" advances the steps on a timer: it waits for each page to be written, gives it its reading time, holds each hook and each line of the question, then moves on. Any gesture pauses it. **The autoplay bar** (music brief, 5) is the one play control, replacing the small floating button: a clear bar at the bottom centre, "▶ Playing — click or press Space to pause" while it plays, "❚❚ Paused — press Space to continue" when paused, with a thin line along its foot for the whole story's progress (moved with each step, `scene`). A click on it, or Space, plays and pauses; Space does nothing while a modal or a text field has the focus (or on another button, which Space presses). It fades to faint after 3s without the mouse moving and comes back on any mouse move. The play modal's two small switches set the music and the effects (`sound.md`).
- **A page per chapter, written by the pen.** On one side of the image (the left, about 42% wide; along the bottom on phones) a dark, softly faded panel holds the chapter's page: the kicker typed small, the heading written large and always on one line (it starts at its design size and shrinks to fit the panel, down to 24px; if it still does not fit, the panel widens for that chapter: `src/lib/fit-heading.ts`), then the body in Old Standard TT at 18 to 19px. **A long page fits by widening, never shrinking:** the text size never changes; the panel widens just enough for its page to fit the screen's height, from its design width up to about 58% of the screen (`PAGE_FIT`, `fitPageWidth`), measured after the fonts load and on resize; a short chapter keeps its width. The panel has no edge: on a laptop its darkness is a separate shade (`.story-page-shade`) that reaches past the panel and eases out into the image, with no line where the panel ends and no scrollbar. The panel holds only the chapter's text. A roll call is a **crew list**: a small slip of aged paper (`.story-crew-slip`) pinned at a slight angle on the opposite side of the screen (along the top on phones), headed from the case data (`StorySection.rollCallTitle`, e.g. "Crew list · Mary Celeste · Nov. 1872"); the slip is not on screen until the pen reaches the roll call; then it lifts in and lands (`paper.lift`, `paper.land`), and the pen writes each name with its role beside it, in dark ink. At the hook, in order: the pen un-writes the names, last to first (its own writing played backwards, `STORY_PACE.unwrite`); the empty slip leaves; only then does the hook line appear. Stepping back from the hook: its text leaves, the light returns with the page empty, and the pen writes the page again from the top, crew list and all, 1.5× quicker. The same pen writes it all, on a timer (not scrubbed) at about 3× reading pace, a word at a time for a long page, never more than about 10 seconds. **Every time a page is reached, forward or back, the pen writes it** (no page is ever shown "already written" on arrival). A click on the panel, or any gesture (forward or back), finishes it at once and stays on the page: the next gesture moves on. The reader always sees the page complete. Portal names stay clickable in it. Weighted phrases (`StorySection.emphasis`) are written after a breath, a touch slower, and stay slightly brighter.
- **The hook between chapters** is its own step. Moving on from the page: the crew list's names are un-written last to first and the empty slip leaves, then the panel and the image's corners dim away, the image darkens and the camera creeps closer, the hook line takes the centre of the screen, the whole line snapping in (about 0.8s) with its letters settling into place, and holds. Moving on from the hook: it decays letter by letter, and the next image cross-dissolves in. **Darkness first, both ways:** a hook's text is only ever over the darkened image. Forward, the image darkens, then the text appears; back from a hook, the text leaves, then the light returns; entering a hook from the step after it, the dark comes first (the lit scene fades away) and the text after. Nothing else is on screen while it is there (the chart inset goes quiet too).
- **No red lines in the story.** Weight comes from timing, a breath and slight brightness only, in the chapters and in the central question.
- **The central question is a chokepoint**: one solid black screen over the stage; it builds one line per step (the case's `centralQuestionLines` when it has them, otherwise split at its commas and before "and"), each line playing in (about 0.6s) when its step is reached; its weighted parts (`Case.centralQuestionEmphasis`) land on their own, slightly brighter.
- **The fork is a modal** over the question: the step after the last line (or after "Play the story" has held on the whole question), it rises and settles (`paper.lift`, then `paper.land`) over a darkened backdrop, with the fork's prompt typed and its two large choices. Focus is trapped; Escape or a gesture back closes it and returns to the whole question. No gesture moves past it.
- **Corners:** image labels top-left and the credit ⓘ top-right, below the case header. The voyage chart inset (old-chart look: `paper` lines on `night`) bottom-right, about 160px wide on desktop and 110px on phones. The play/pause control bottom-left.
- **Full text** is always in the DOM for screen readers; the written page is `aria-hidden`. A keyboard user who tabs to a portal sees the full chapter text as a panel.
- **Pace:** every timing of the story is in one object, `STORY_PACE` in `src/lib/story-pages.ts`.
- **Reduced motion:** a normal scrolling page (Lenis off) of plain stacked sections: each chapter's still image with its whole page already written on it, then the hook as plain text, then the question whole and the fork as the reader scrolls on. The modals appear without animation. No steps, camera or auto-play.

## The desk (desktop)

On a screen 1024px wide or more the investigation is **one fixed screen** that never scrolls: a compact header of fixed height (the hints, and the "Close the case" rubber stamp when it is time to close the case; no visible title: the one "Case files · {n}" label is over the floor), the board of theories on top and the **floor** below, split floor-first (`src/lib/desk-split.ts`): the floor gets the height its folders need to lie apart with their labels at 12px or more, and at least 45%; the board takes the rest, never less than 300px (about 55/45; 50/50 at 1366×768), with the tray labelled "None of them" (13rem) beside it. Nothing that comes or goes in the header changes the size of the board or the floor.
- **The floor:** the files lie flat in rows across the table, seen from above, each a little off its spot (up to ±12px) and tilted (up to ±6°). **No folder covers another**: each lies inside its own cell, so every tab and label shows. Every floor folder has one fixed size (7.75rem by 6rem), drawn as large as fits, with every label in view. **A floor label is never below 12px:** labels are 14px at natural size and the folders never shrink below 12/14 of it (`MIN_SCALE`). Their places come from one pure function (`floorLayout`) of all the case's file ids and the floor size, so they are the same every visit.
- **An open file** is big, centred and exactly straight: both covers together are 80% of the screen wide (at most 75rem), and the folder is 70% to 86% of the screen high. Document text is at least 17px, the title at least 28px. Its document scrolls inside the paper, with a thin scrollbar.
- **Nothing moves by itself.** Opening, closing, pinning or dragging one file never moves another. A pinned file leaves a gap; a file sent back returns to its own spot or to where it was dropped. A folder the player drops elsewhere on the floor moves alone, and its spot is kept in storage under `histor:case:{caseId}:floor`, apart from the investigation. **The drop point always wins:** a file dragged to the floor (from the floor, a theory or the tray) lands exactly where it was let go, kept inside the floor, and that spot is saved. Only "Back to the floor" from the Pin menu returns it to its own spot.
- **The lamp never hides a file.** The ambient light is high enough that every label reads at 4.5:1 or more anywhere on the desk; the lamp only adds a warm highlight where it points.
- **Slate theories.** Each theory is a slate card (`slate`), like the ship's log slate, written in chalk (`chalk`): 9.4:1. The title stays Grenze Gotisch; the claim is Old Standard TT at 16px. The board sits above the lamp's shadow. The files stay manila.
- **The theories answer back** to the player's own pins, never to what historians think (`src/lib/theory-weight.ts`): a theory with 3 or more files pinned grows heavier (brighter chalk, a soft brass edge, a deeper shadow and a slight lift), and the one with the most pins has the strongest edge; a theory with nothing pinned, once 4 or more files are opened, goes dim and its corner curls slightly, and recovers the moment something is pinned. Every change is tweened (`layout`); the edge and shadow are a layer whose opacity changes. Dimmed chalk stays above 4.5:1.
- **Pinned files are always in view.** Under each theory they lie as a cascade of strips, each with its number and its full label (wrapping to a second line if needed, never cut off), slightly overlapping like cards laid down one after another. Only when the pile is taller than the space under its theory does the cascade scroll inside itself (a thin scrollbar); the board never grows. Strips can be dragged out (the cascade stops clipping while one is carried) and clicked to show their slip and open the file. Nothing is hidden behind a hover.
- **Threads.** One thread per theory, from the theory's pin to the pin at the top of its cascade (which stays put while it scrolls), with one gentle sag, measured after layout, after every Flip and on resize. The tray has none.
- **Pin without dragging.** A floor file with the focus shows a small "Pin to…", the same floating menu as in the open file; P opens it. A sealed file pinned this way (or by drag) stays sealed.
- **One name for each thing.** Every folder is a **file** and every note is a **theory**, in the guide, hints, labels, buttons and `aria` text. Quiet labels: "Theories" and "Case files · {n}". On the one-screen desk, "Theories" sits in the top bar, on the left, level with the "Close the case" stamp on the right; the board holds only the notes. The top bar is tight (2.5rem), and the height it gives back goes to the board, not the floor (the floor still gets what its labels need at 12px).
- **The guide**, "How to investigate", is the first thing the player sees every time they arrive on the desk, until they close it; after the first visit it offers "Don't show this again" (remembered in storage). The **?** always reopens it. It opens at the top, with the focus on its heading. Its first sentence is the case's `deskGuideIntro`. The header has no count of opened files: the "Close the case" stamp simply appears.
- **No logo mark anywhere** until the real logo comes (no wax seal, no "H"). **"Close the case"** is a rubber ink stamp in the style of the header's UNSOLVED tag (`.rubber-stamp`: a rectangular rust-ink frame around typed capitals, a little crooked; `rust-night` on the dark desk). It thunks into the top bar (`stamp.hit`) once the threshold is reached. At the verdict, confirming a theory stamps its note "Chosen" in the same style.
- **The report never reveals an unopened file**: a file pinned without being opened shows as "Sealed", with no status, and does not count as a legend trusted.
- **Every opening** of a file is written, a file read before as well (review-fixes brief, 3): a small dip-pen nib writes the title, the text settles in line by line from a slight blur, then the stamp lands and the paper takes its status. A click or a key skips it. "Opened" is still kept for the case logic as before. **Every stamp is a moment**, every time: a Record lands heavy, with a tiny shake of the folder (2px, under 150ms) and the ink spreading slightly, then "Written down at the time." is typed under it; a Disputed stamp lands a little crooked (and stays so), the second sheet slides in askew and the "?" is drawn, then "Historians argue over this one."; a Legend's ink drains slowly to ghost ink and drifts, the paper yellows, then the pen writes "You almost believed this." at the foot of the page. Each emits its own sound event (`stamp:record`, `stamp:disputed`, `stamp:legend`). Reduced motion: the stamp and the note simply appear.
- Below 1024px the investigation shows a gate ("This case is too big for a small screen."), with a "Continue anyway" link that shows the phone desk as it is.

## The verdict's reveal

- On the report page, above the report, when the player arrives from closing the case: the still lamp narrows (`scene`), the app types "Most historians lean toward…" (Special Elite), the quill writes the leading theories in one by one (Grenze Gotisch), then one typed line compares them with the player's choice, with the theory's standing reason after it when it is not a leading one. A later visit shows it all at once; reduced motion simply shows it.
- **The rank card:** typed paper with the rank as a rubber stamp and its one line.
- **The shareable card:** a 1200×630 canvas in the site's style: paper with an inked double rule, the case title (Grenze Gotisch) and years, "I closed the … case." (Old Standard TT), the rank as a rust rubber stamp, the legends line and `histor.space` (Special Elite), in the Ash palette's tokens. "Save the card" downloads the PNG; "Share" uses the Web Share API with the file where it can, and copies the text otherwise. Nothing is uploaded.
- **The result screen** (polish brief, A4): two columns on a laptop. On the left, the reveal ("Most historians lean toward…", the comparison line) and the rank card; on the right, the card's preview and its actions. One centred column on a phone. The full case report continues below, across the width.
  - **The player signs the card:** above the preview, "Sign your case file" (placeholder "Your name"). Once the player pauses typing (debounced), the pen writes the name onto the preview ("SIGNED" small in Special Elite, the name in Grenze Gotisch, at `SHARE_SIGNATURE`). Optional: no name, no signature. Saved in localStorage (`histor:player-name`) and prefilled next time, simply there. The saved and shared PNG draws the same signature line.
  - **Share:** "Save the card" (the PNG) and "Share" (the native share sheet, with the image where supported). Then direct links that open each site's own share page in a new tab with the words and the link filled in: X, Facebook, LinkedIn, WhatsApp, Reddit, Telegram, and "Copy link". The words: "I closed the {title} case on Histor. {rank}. I trusted {n} legends. Can you tell legend from history?", with the case's link on histor.space. A small line says share links can't carry images, so the card is saved for attaching.

## Evidence status: the visual language

The spooky effects encode trust. They are not decoration.

| Status | Look | Feel |
| --- | --- | --- |
| Record | Crisp `record`-blue ink on clean paper, sharp edges | Solid, official |
| Disputed | Smudged areas, struck-through words, notes in the margin | Argued over |
| Legend | Faded ghost ink: `ghost-ink` for text on paper, `ghost-night` at night, `ghost-day` for decoration. A slight blur (≤2px) only as the ink appears, then crisp; a faint flicker that rests at full opacity; translucent paper. Text at rest reaches 4.5:1 | Not quite real |
| Unexamined | Plain folder, status hidden | Unknown |

## Per-case themes

Each case sets its own accent, texture, video and sounds in its folder (`theme.css` and the case theme data). The Ash palette is shared.

### Mary Celeste theme

- Night sea blue-black, salt-stained paper, brass fittings.
- Sounds: creaking timber, rope and sailcloth, wind, water against the hull, a ship's bell, a pen nib on paper, a wax seal, a court gavel.

## Interaction

- **Portals work the same everywhere** (the story, inside an open file, inside a card): the provider handles their triggers by delegation, so a name keeps working after an animation rebuilds the text around it. With a fine pointer, resting on a name for about 0.3s opens its card without taking the focus; moving onto the card keeps it open, and moving away from both closes it after a short grace (`PORTAL_HOVER`). A click pins it open. Touch and the keyboard tap or press as before.
- Every clickable element (buttons, links, Skip, Continue) shows `cursor: pointer` on hover devices. Tailwind v4 no longer does this for buttons, so the rule is set globally in `src/index.css`. Do not override it per component.

## Images and video

- Every image and video carries a credit.
- **Chapter and portal images keep the credit behind a small ⓘ button** in a corner of the image. Hovering (on mouse devices), keyboard focus or a tap shows the credit in a small tooltip. Never print the full credit line over the image.
- **Story images carry no visible "Illustration" tag**: it obstructs the scene. Honesty stays in the ⓘ: for any image with `isIllustration: true` the credit always begins "AI illustration." (`src/lib/image-credit.ts`). The only label printed on a story image is its short caption when it has one (`caption`), e.g. "The Mary Celeste, 1861". Portal images keep their visible "Illustration" label and caption.
- The legend intro's video keeps its visible "Illustration" label and credit line.
- Never AI-generate real people. Real people appear only in real photos or period portraits.

## Avoid

- No book or page-flip interface, and no owls, wolves or heartbeat sounds. These were the 2025 Costume Contest winner's look.
- No séance, medium or ancestor framing.
- No generic Halloween decoration: pumpkins, bats, orange-and-purple.
- No gore. Dread comes from absence, not shock.
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

- **Steps.** Under full motion the story is a fixed, full-screen stage driven by GSAP Observer (wheel, touch, pointer); the page behind it does not scroll and Lenis is held off. The steps, in order: the play modal (step 0), then for each chapter its page, then its hook; then the central question, one line per step; then the fork. **One gesture moves exactly one step**, however hard the flick: wheel events closer than `STORY_PACE.gestureGapMs` are one gesture, and a gesture that meets a step still animating is swallowed, tail and all. While a step's animation plays, input is ignored. Going back works the same way. Every step ends by setting its exact state, so only the current step's hook or page can ever be on screen. Keyboard: ↓, PageDown and Space forward; ↑ and PageUp back; Home to the start; only while no modal or portal card is open.
- **The progress rail:** a thin rail on the left edge, one tick per chapter and one for the question, the current one lit in brass. Hovering or focusing a tick shows its heading; clicking jumps there with a quick dissolve, the pages before it already written. Hidden while a modal is open.
- **Scene:** the chapter's image fills the screen (`object-fit: cover`, `100svh`) under a slow camera on its own timer (scale 1.0 → 1.12 and a slight pan, each chapter a different way). A dark gradient over the bottom 45% keeps text at 4.5:1. All scenes share one stage; the next image cross-dissolves in over the old one.
- **No opening scene.** The story starts on chapter 1. The case header shows the case's title once the story starts, with a small typed UNSOLVED tag beside the years.
- **The play choice** is a real modal before chapter 1: once per page load, as soon as the story comes up the screen however the reader got there (after the legend intro, a return visit, a reload, a direct link), and each time the intro's scroll cue is pressed: the case title written by the pen, one short line, and two big buttons, "Play the story" and "Read at my pace". The reader must choose (Escape means "Read at my pace"); no gesture moves past it, and the story begins only once they choose; focus is trapped and returns afterwards. "Play the story" advances the steps on a timer: it waits for each page to be written, gives it its reading time, holds each hook and each line of the question, then moves on. Any gesture pauses it. The floating play/pause control stays.
- **A page per chapter, written by the pen.** On one side of the image (the left, about 42% wide; along the bottom on phones) a dark, softly faded panel holds the chapter's page: the kicker typed small, the heading written large and always on one line (it starts at its design size and shrinks to fit the panel, down to 24px; if it still does not fit, the panel widens for that chapter: `src/lib/fit-heading.ts`), then the body in Old Standard TT at 18 to 19px. The panel holds only the chapter's text. A roll call is a **crew list**: a small slip of aged paper (`.story-crew-slip`) pinned at a slight angle on the opposite side of the screen (along the top on phones), headed from the case data (`StorySection.rollCallTitle`, e.g. "Crew list · Mary Celeste · Nov. 1872"); the pen writes each name with its role beside it, in dark ink, after the body. At the hook the names fade off the slip, last to first, and leave the paper empty. The same pen writes it all, on a timer (not scrubbed) at about 3× reading pace, a word at a time for a long page, never more than about 10 seconds. Once written, the text stays. A click on the panel, or a forward gesture, finishes it at once and stays on the page: the next gesture moves on. The reader always sees the page complete. Portal names stay clickable in it. Weighted phrases (`StorySection.emphasis`) are written after a breath, a touch slower, and stay slightly brighter.
- **The hook between chapters** is its own step. Moving on from the page: the crew list's names fade off last to first, the panel and the image's corners dim away, the image darkens and the camera creeps closer, the hook line takes the centre of the screen, the whole line snapping in (about 0.8s) with its letters settling into place, and holds. Moving on from the hook: it decays letter by letter, and the next image cross-dissolves in. Nothing else is on screen while it is there (the chart inset goes quiet too).
- **No red lines in the story.** Weight comes from timing, a breath and slight brightness only, in the chapters and in the central question.
- **The central question is a chokepoint**: one solid black screen over the stage; it builds one line per step (the case's `centralQuestionLines` when it has them, otherwise split at its commas and before "and"), each line playing in (about 0.6s) when its step is reached; its weighted parts (`Case.centralQuestionEmphasis`) land on their own, slightly brighter.
- **The fork is a modal** over the question: the step after the last line (or after "Play the story" has held on the whole question), it rises and settles (`paper.lift`, then `paper.land`) over a darkened backdrop, with the fork's prompt typed and its two large choices. Focus is trapped; Escape or a gesture back closes it and returns to the whole question. No gesture moves past it.
- **Corners:** image labels top-left and the credit ⓘ top-right, below the case header. The voyage chart inset (old-chart look: `paper` lines on `night`) bottom-right, about 160px wide on desktop and 110px on phones. The play/pause control bottom-left.
- **Full text** is always in the DOM for screen readers; the written page is `aria-hidden`. A keyboard user who tabs to a portal sees the full chapter text as a panel.
- **Pace:** every timing of the story is in one object, `STORY_PACE` in `src/lib/story-pages.ts`.
- **Reduced motion:** a normal scrolling page (Lenis off) of plain stacked sections: each chapter's still image with its whole page already written on it, then the hook as plain text, then the question whole and the fork as the reader scrolls on. The modals appear without animation. No steps, camera or auto-play.

## The desk (desktop)

On a screen 1024px wide or more the investigation is **one fixed screen** that never scrolls: a compact header of fixed height (title, hints, the wax seal), the board of theories on top and the **floor** below, split floor-first (`src/lib/desk-split.ts`): the floor gets the height its folders need to lie apart with their labels at 12px or more, and at least 45%; the board takes the rest, never less than 300px (about 55/45; 50/50 at 1366×768), with the tray labelled "None of them" (13rem) beside it. Nothing that comes or goes in the header changes the size of the board or the floor.
- **The floor:** the files lie flat in rows across the table, seen from above, each a little off its spot (up to ±12px) and tilted (up to ±6°). **No folder covers another**: each lies inside its own cell, so every tab and label shows. Every floor folder has one fixed size (7.75rem by 6rem), drawn as large as fits, with every label in view. **A floor label is never below 12px:** labels are 14px at natural size and the folders never shrink below 12/14 of it (`MIN_SCALE`). Their places come from one pure function (`floorLayout`) of all the case's file ids and the floor size, so they are the same every visit.
- **An open file** is big, centred and exactly straight: both covers together are 80% of the screen wide (at most 75rem), and the folder is 70% to 86% of the screen high. Document text is at least 17px, the title at least 28px. Its document scrolls inside the paper, with a thin scrollbar.
- **Nothing moves by itself.** Opening, closing, pinning or dragging one file never moves another. A pinned file leaves a gap; a file sent back returns to its own spot or to where it was dropped. A folder the player drops elsewhere on the floor moves alone, and its spot is kept in storage under `histor:case:{caseId}:floor`, apart from the investigation. **The drop point always wins:** a file dragged to the floor (from the floor, a theory or the tray) lands exactly where it was let go, kept inside the floor, and that spot is saved. Only "Back to the floor" from the Pin menu returns it to its own spot.
- **The lamp never hides a file.** The ambient light is high enough that every label reads at 4.5:1 or more anywhere on the desk; the lamp only adds a warm highlight where it points.
- **Slate theories.** Each theory is a slate card (`slate`), like the ship's log slate, written in chalk (`chalk`): 9.4:1. The title stays Grenze Gotisch; the claim is Old Standard TT at 16px. The board sits above the lamp's shadow. The files stay manila.
- **Pinned files are always in view.** Under each theory they lie as a cascade of strips, each with its number and its full label (wrapping to a second line if needed, never cut off), slightly overlapping like cards laid down one after another. Only when the pile is taller than the space under its theory does the cascade scroll inside itself (a thin scrollbar); the board never grows. Strips can be dragged out (the cascade stops clipping while one is carried) and clicked to show their slip and open the file. Nothing is hidden behind a hover.
- **Threads.** One thread per theory, from the theory's pin to the pin at the top of its cascade (which stays put while it scrolls), with one gentle sag, measured after layout, after every Flip and on resize. The tray has none.
- **Pin without dragging.** A floor file with the focus shows a small "Pin to…", the same floating menu as in the open file; P opens it. A sealed file pinned this way (or by drag) stays sealed.
- **One name for each thing.** Every folder is a **file** and every note is a **theory**, in the guide, hints, labels, buttons and `aria` text. Quiet labels: "Theories" and "Case files · {n}".
- **The guide**, "How to investigate", is the first thing the player sees every time they arrive on the desk, until they close it; after the first visit it offers "Don't show this again" (remembered in storage). The **?** always reopens it. It opens at the top, with the focus on its heading. Its first sentence is the case's `deskGuideIntro`. The header has no count of opened files: the wax seal simply appears.
- **The report never reveals an unopened file**: a file pinned without being opened shows as "Sealed", with no status, and does not count as a legend trusted.
- **The first opening** of a file is written: a small dip-pen nib writes the title, the text settles in line by line from a slight blur, then the stamp lands and the paper takes its status.
- Below 1024px the investigation shows a gate ("This case is too big for a small screen."), with a "Continue anyway" link that shows the phone desk as it is.

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
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

## Day into night

- The **legend intro** happens at night: the myth lives in the dark.
- The **story** begins in ash daylight and darkens gradually as it goes, reaching full night at the central question. Each image's grade darkens chapter by chapter, and the sky colour around and behind the full-screen scenes (and the page's scrollbar gutter) follows the chapter on screen.
- The **board and verdict** sit in night, lit by brass and paper.
- A faint grain over everything; light is scarce but text stays readable.

## The story: cinematic scenes

The story is told like a documentary, one full-screen scene per chapter (`docs/briefs/story-redesign.md`).

- **Scene:** the chapter's image fills the screen (`object-fit: cover`, `100svh`) under a slow scrubbed camera (scale 1.0 → 1.12 and a slight pan, each chapter a different way). A dark gradient over the bottom 45% keeps text at 4.5:1. All scenes share one pinned stage; the next image cross-dissolves in over the old one.
- **One opening, on the first scene.** After the legend intro the story opens on chapter 1's own scene: its image, full screen, under its camera. Over it the quill writes the case title large, the years are typed under it one whole character at a time, the UNSOLVED stamp lands, then the teaser and a quiet scroll cue. As the reader scrolls they clear (`ink.out`, on their own timer, never left half faded), the title floats up and docks into the case header (empty until then), and chapter 1 begins on the same image: one image, one title. Under reduced motion the opening is a plain screen at night before chapter 1.
- **Entrances by moment.** Normal sentences rise word by word from behind a mask edge. Weighted words (`StorySection.emphasis`) hold their space, then land alone after a beat, and a thin rust line grows under them. Before a hook the column clears, the image darkens and the camera creeps closer, and nothing new appears; then the hook comes word by word, its letters snapping into place from slightly out of line. When a hook leaves, its letters decay one at a time in a random order. Tokens in `motion.md`.
- **The central question is a chokepoint**: a pinned, full-black screen; it builds phrase by phrase (at commas and before "and"), each a stop the scroll settles on (ScrollTrigger snap, never a lock); its weighted parts (`Case.centralQuestionEmphasis`) land like weighted words; the fork comes after the whole question and a hold. Reduced motion: the question whole, then the fork.
- **Type over the image:** kicker in Special Elite, heading in Grenze Gotisch written by the quill on its own timer (about 2 seconds, whatever the scroll speed), large and centred. The chapter's sentences stay on screen in a **text column** in the lower part of the scene, Old Standard TT, centred, about 32 characters a line on phones, about 3 to 4 lines visible. The column moves up as the reader scrolls, and older sentences fade out through a static mask at its top. The **hook** is Old Standard TT italic, large and centred, over an image dimmed almost to black; the column leaves before it.
- **Corners:** image labels top-left and the credit ⓘ top-right, below the case header. The voyage chart inset (old-chart look: `paper` lines on `night`) bottom-right, about 160px wide on desktop and 110px on phones. The play/pause control bottom-left. The text column and hooks keep clear of all four. A small **play card** ("Play the story", "Read at my pace") slides up at the bottom centre after the first scroll past the opening, and goes when either is chosen.
- **Full text** is always in the DOM for screen readers; the text column is `aria-hidden`. A keyboard user who tabs to a portal sees the full chapter text as a panel.
- **Reduced motion:** plain stacked sections, still images, text that fades in. No camera, scrub or auto-play.

## The desk (desktop)

On a screen 1024px wide or more the investigation is **one fixed screen** that never scrolls: a compact header of fixed height (title, hints, the wax seal), the board of theories on top (about 46% of the rest) and the **floor** below (about 54%), with the tray labelled "None of them" (13rem) beside it. Nothing that comes or goes in the header changes the size of the board or the floor.
- **The floor:** the files lie flat in rows across the table, seen from above, each a little off its spot (up to ±12px) and tilted (up to ±6°). **No folder covers another**: each lies inside its own cell, so every tab and label shows. Every floor folder has one fixed size (7.75rem by 6rem), drawn as large as fits, never below 75%. Their places come from one pure function (`floorLayout`) of all the case's file ids and the floor size, so they are the same every visit.
- **An open file** is big, centred and exactly straight: both covers together are 80% of the screen wide (at most 75rem), and the folder is 70% to 86% of the screen high. Document text is at least 17px, the title at least 28px. Its document scrolls inside the paper, with a thin scrollbar.
- **Nothing moves by itself.** Opening, closing, pinning or dragging one file never moves another. A pinned file leaves a gap; a file sent back returns to its own spot or to where it was dropped. A folder the player drops elsewhere on the floor moves alone, and its spot is kept in storage under `histor:case:{caseId}:floor`, apart from the investigation.
- **The lamp never hides a file.** The ambient light is high enough that every label reads at 4.5:1 or more anywhere on the desk; the lamp only adds a warm highlight where it points.
- **Slate theories.** Each theory is a slate card (`slate`), like the ship's log slate, written in chalk (`chalk`): 9.4:1. The title stays Grenze Gotisch; the claim is Old Standard TT at 16px. The board sits above the lamp's shadow. The files stay manila.
- **Piles under a theory.** The files pinned to a theory lie in one tidy pile under its note: at most four edges, the top file's label, and a brass "×7" badge. The pile keeps one height, so the board never grows. Clicking or hovering it opens a panel of its files over the board (it scrolls when long), from which a file opens or is dragged out.
- **Threads.** One thread per theory, from the note's pin to the top of its pile, with one gentle sag, measured after layout, after every Flip and on resize. The tray has none.
- **Labels and guide.** Quiet labels, "Theories" and "Evidence · {n} files". The guide, "How to investigate", opens by itself on the first visit and from the **?**; its first sentence is the case's `deskGuideIntro`. The header has no count of opened files: the wax seal simply appears.
- Full text of these rules, and the story's entrances and chokepoint: `docs/briefs/steering-updates.md`.
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

- Every clickable element (buttons, links, Skip, Continue) shows `cursor: pointer` on hover devices. Tailwind v4 no longer does this for buttons, so the rule is set globally in `src/index.css`. Do not override it per component.

## Images and video

- Every image and video carries a credit.
- **Chapter and portal images keep the credit behind a small ⓘ button** in a corner of the image. Hovering (on mouse devices), keyboard focus or a tap shows the credit in a small tooltip. Never print the full credit line over the image.
- **Two labels are always visible on an image:** "Illustration" on AI-generated or artist-made media (`isIllustration: true`), and the image's short caption when it has one (`caption`), e.g. "The Mary Celeste, 1861". Nothing else is printed on the image.
- The legend intro's video keeps its visible "Illustration" label and credit line.
- Never AI-generate real people. Real people appear only in real photos or period portraits.

## Avoid

- No book or page-flip interface, and no owls, wolves or heartbeat sounds. These were the 2025 Costume Contest winner's look.
- No séance, medium or ancestor framing.
- No generic Halloween decoration: pumpkins, bats, orange-and-purple.
- No gore. Dread comes from absence, not shock.
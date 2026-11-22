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

Body text must reach 4.5:1 contrast against its background; large display text at least 3:1.

## Day into night

- The **legend intro** happens at night: the myth lives in the dark.
- The **story** begins in ash daylight and darkens gradually as it goes, reaching full night at the central question. Each image's grade darkens chapter by chapter, and the sky colour around and behind the full-screen scenes (and the page's scrollbar gutter) follows the chapter on screen.
- The **board and verdict** sit in night, lit by brass and paper.
- A faint grain over everything; light is scarce but text stays readable.

## The story: cinematic scenes

The story is told like a documentary, one full-screen scene per chapter (`docs/briefs/story-redesign.md`).

- **Scene:** the chapter's image fills the screen (`object-fit: cover`, `100svh`) under a slow scrubbed camera (scale 1.0 → 1.12 and a slight pan, each chapter a different way). A dark gradient over the bottom 45% keeps text at 4.5:1. All scenes share one pinned stage; the next image cross-dissolves in over the old one.
- **The opening scene** comes after the legend intro: the first chapter's image, full screen, under a slow camera push. The quill writes the case title large, the years are typed under it, the UNSOLVED stamp lands, then the teaser and a quiet scroll cue. When the reader scrolls, the title docks into the case header (which stays hidden until then).
- **Type over the image:** kicker in Special Elite, heading in Grenze Gotisch written by the quill on its own timer (about 2 seconds, whatever the scroll speed), large and centred. The chapter's sentences stay on screen in a **text column** in the lower part of the scene, Old Standard TT, centred, about 32 characters a line on phones, about 3 to 4 lines visible. The column moves up as the reader scrolls, and older sentences fade out through a static mask at its top. The **hook** is Old Standard TT italic, large and centred, over an image dimmed almost to black; the column leaves before it.
- **Corners:** image labels top-left and the credit ⓘ top-right, below the case header. The voyage chart inset (old-chart look: `paper` lines on `night`) bottom-right, about 160px wide on desktop and 110px on phones. The play/pause control bottom-left. The text column and hooks keep clear of all four. A small **play card** ("Play the story", "Read at my pace") slides up at the bottom centre after the first scroll past the opening, and goes when either is chosen.
- **Full text** is always in the DOM for screen readers; the text column is `aria-hidden`. A keyboard user who tabs to a portal sees the full chapter text as a panel.
- **Reduced motion:** plain stacked sections, still images, text that fades in. No camera, scrub or auto-play.

## The desk (desktop)

On a screen 1024px wide or more the investigation is **one fixed screen** that never scrolls: a compact header (title, progress line, hints, the wax seal), the board of theories on top (about 55% of the height) and the **floor** below (about 45%), with the tray labelled "None of them" beside it.
- **The floor:** the files lie flat, tossed on the table and seen from above, each with a slight tilt (at most 8°), a little overlapping, every tab and label showing. Their places come from one pure function of the file ids and the floor size, so they are the same every visit.
- **An open file** is centred, straight and at most 86% of the screen high. Its document scrolls inside the paper, with a thin scrollbar.
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
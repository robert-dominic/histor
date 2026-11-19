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
- **Type over the image:** kicker in Special Elite, heading in Grenze Gotisch written by the quill, large and centred. The text arrives in **beats** (one sentence each) in the lower third, Old Standard TT, centred, about 32 characters a line on phones. The **hook** is Old Standard TT italic, large and centred, over an image dimmed almost to black.
- **Corners:** image labels top-left and the credit ⓘ top-right, below the case header. The voyage chart inset (old-chart look: `paper` lines on `night`) bottom-right, about 160px wide on desktop and 110px on phones. The play/pause control bottom-left. Beats and hooks keep clear of all four.
- **Full text** is always in the DOM for screen readers; the beats are `aria-hidden`. A keyboard user who tabs to a portal sees the full chapter text as a panel.
- **Reduced motion:** plain stacked sections, still images, text that fades in. No camera, scrub or auto-play.

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
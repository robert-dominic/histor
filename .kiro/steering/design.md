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
| `ghost-day` | #8f9ea6 | Legend text and ghost ink in day |
| `night` | #0d1317 | Night background |
| `night-ink` | #e6e1d3 | Main text at night |
| `ghost-night` | #a8c3d3 | Legend text and ghost ink at night |
| `brass` | #c49a5a | The one warm accent: highlights, focus, small fittings |

Body text must reach 4.5:1 contrast against its background; large display text at least 3:1.

## Day into night

- The **legend intro** happens at night: the myth lives in the dark.
- The **story** begins in ash daylight and darkens gradually as it goes, reaching full night at the central question.
- The **board and verdict** sit in night, lit by brass and paper.
- A faint grain over everything; light is scarce but text stays readable.

## Evidence status: the visual language

The spooky effects encode trust. They are not decoration.

| Status | Look | Feel |
| --- | --- | --- |
| Record | Crisp `record`-blue ink on clean paper, sharp edges | Solid, official |
| Disputed | Smudged areas, struck-through words, notes in the margin | Argued over |
| Legend | Faded ghost ink (`ghost-day` / `ghost-night`), slight blur (≤2px), a faint flicker, translucent paper | Not quite real |
| Unexamined | Plain folder, status hidden | Unknown |

## Per-case themes

Each case sets its own accent, texture, video and sounds in its folder (`theme.css` and the case theme data). The Ash palette is shared.

### Mary Celeste theme

- Night sea blue-black, salt-stained paper, brass fittings.
- Sounds: creaking timber, rope and sailcloth, wind, water against the hull, a ship's bell, a pen nib on paper, a wax seal, a court gavel.

## Interaction

- Every clickable element (buttons, links, Skip, Continue) shows `cursor: pointer` on hover devices. Tailwind v4 no longer does this for buttons, so the rule is set globally in `src/index.css`. Do not override it per component.

## Images and video

- Every image and video carries a credit. AI-generated or artist-made media is labelled "Illustration" on screen.
- Never AI-generate real people. Real people appear only in real photos or period portraits.

## Avoid

- No book or page-flip interface, and no owls, wolves or heartbeat sounds. These were the 2025 Costume Contest winner's look.
- No séance, medium or ancestor framing.
- No generic Halloween decoration: pumpkins, bats, orange-and-purple.
- No gore. Dread comes from absence, not shock.
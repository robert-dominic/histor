---
inclusion: always
---

# Design

## Typography: two eras, two voices

The app's own voice is modern. The record is from the 1870s. The contrast says "a modern investigator reading old documents."

| Role | Font | Source | Use |
| --- | --- | --- | --- |
| The legend, display titles | IM Fell English | Google Fonts | Legend intro, case titles, big moments |
| The record | Old Standard TT | Google Fonts | Story text, testimony, evidence files |
| The app's voice | Satoshi | Fontshare (load from Fontshare's CDN, never commit the font files) | Prompts, buttons, labels, the app talking |

**DECIDE:** confirm this set. A handwriting face for notes on files is optional.

## Evidence status: the visual language

The spooky effects encode trust. They are not decoration.

| Status | Look | Feel |
| --- | --- | --- |
| Record | Crisp ink on clean paper, sharp edges | Solid, official |
| Disputed | Smudged areas, struck-through words, handwritten notes in the margin | Argued over |
| Legend | Faded ghost ink, slight blur, a faint flicker, translucent paper | Not quite real |
| Unexamined | Plain folder, status hidden | Unknown |

## Atmosphere

- The screen grows darker as the story goes on.
- Light is scarce: one warm light source, deep shadows, grain over everything.
- Shared base: near-black with a cold tint, aged-paper tones, one warm brass accent.
- Each case sets its own accent colour, texture and sounds in its `theme.css`.

### Mary Celeste theme

- Night sea blue-black, salt-stained paper, brass fittings.
- Sounds: creaking timber, rope and sailcloth, wind, water against the hull, a ship's bell, a pen nib on paper, a wax seal, a court gavel.

## Avoid

- No book or page-flip interface, and no owls, wolves or heartbeat sounds. These were the 2025 Costume Contest winner's look.
- No séance, medium or ancestor framing.
- No generic Halloween decoration: pumpkins, bats, orange-and-purple.

# Brief: The landing page, an archive of cases (in the Estheet style)

Save as `docs/briefs/landing.md`, replacing the corridor version. The same ground rules as before apply:
- Don't stop to ask questions; list your choices in the report.
- One commit per item, starting `[claude-code]`.
- All motion goes through `motion.ts`, and all sound through the event table.
- Install nothing. Check at 375px and 1440px in the browser at the end.

**The reference:** estheet.com. A black page, large framed artworks that rise in as you scroll, an italic title beside each frame, a big editorial line under it, a progress rail on the left, and a "Scroll" cue. Histor's version: **each frame is a case.** Open cases can be entered; the rest are veiled and **Sealed**.

---

## 1. The case registry
- Extend `src/cases/index.ts` so each entry has:
  - `id`, `title`, `years`, a one-line `teaser` and `status: 'open' | 'sealed'`;
  - `frame: 'landscape' | 'portrait' | 'square' | 'wide'` (the frame's shape);
  - an editorial `headline` and `subline` for its section;
  - for open cases, a `frameImage` (one of the case's own chapter images).
- **A case is only `open` if its case data exists and validates.** The Ripper opens automatically once its case is added.
- **The exhibits, in order:**

  | Case | Years | Frame | Status | Headline | Subline |
  | --- | --- | --- | --- | --- | --- |
  | The Mary Celeste | 1872 – 1873 | landscape | Open | "Every legend began as something that happened." | "Histor is for anyone who has ever wondered which part of the story is true." |
  | Jack the Ripper | 1888 | portrait | Sealed (opens when its data exists) | "Some names were never written down." | "Whitechapel, 1888. Five women killed. The killer was never named." |
  | The Lost Colony of Roanoke | 1587 – 1590 | wide | Sealed | "A hundred people. One carved word." | "An English colony vanished from the coast of America, leaving almost nothing behind." |
  | The Princes in the Tower | 1483 | square | Sealed | "Two boys went in. History lost them." | "The young King Edward V and his brother were last seen in the Tower of London." |
  | The Dyatlov Pass | 1959 | portrait | Sealed | "The tent was cut from the inside." | "Nine hikers in the Ural Mountains. None came home." |
  | Amelia Earhart | 1937 | landscape | Sealed | "A last call over the Pacific." | "Then silence, and a search that has never ended." |

## 2. The opening
- The page starts **black**. The **Histor wordmark** (from `public/brand/histor-logo-cream.svg`) appears large in the centre.
- On the first scroll (or after about 1.5s), it **rises and shrinks into the header** (the same docking motion as the case title in the story). As it docks, the **first frame rises in from below**.
- **The header after docking:**
  - The wordmark on the left (linking to `/`).
  - On the right, a **"Music"** pill (an icon and a label) and a filled **"Start investigating"** pill linking to `/case/mary-celeste`.
  - The music pill toggles the landing playlist, `CaseTheme`-style data under `src/landing/music.ts` (empty for now). If there are no tracks, hide the pill.

## 3. One section per case, as you scroll
Each case is one full-screen section, laid out like Estheet:
- **The frame:**
  - Large, centred a little left, in its own shape (landscape, portrait, square or wide). The frames are **not all the same size or shape**.
  - Old gilt with carved texture, darkened and chipped at the edges, in keeping with the app's dread materials (SVG and CSS).
  - Open cases show their image, slightly graded.
  - Sealed cases are covered by a **dark cloth veil** that sways very slightly, with a small brass plaque reading **"Sealed"**.
- **The title,** to the right of the frame, low: the case title in italic serif, and under it a small line with the years (open cases) or "Sealed" (sealed ones).
- **The editorial block,** bottom left: the **headline** large (Old Standard TT, about 54–60px), and under it the **subline** in a smaller size.
- **A "Scroll" cue** at the bottom centre, with a thin vertical line, on the first section only.
- **The next frame peeks in** at the bottom right, and slides up into place as you scroll.

**Motion:**
- Frames rise in (`paper.move`) and the previous one moves up and away. The headline is typed or written in by line (`ink.in`).
- Smooth with Lenis. Animate only transforms and opacity.

## 4. Hover and click
- **Hover:** the frame tilts gently toward the cursor (a 3D tilt of about ±5°, smoothed), and a soft light glint moves across the gilt. A sealed veil stirs slightly.
- **Click an open case:** a short transition (the frame scales up, the screen fades to black), then go to `/case/{id}`.
- **Click a sealed case:** a small plaque card rises beside the frame (the shared Popover) with the title, years, subline and *"Sealed — case file in preparation."* Esc or a click outside closes it.
- **Sound:** the `modal` sound for the plaque; nothing on hover.

## 5. The progress rail and the end
- **The rail:** thin ticks on the left, one per case, the current one long and bright. Clicking a tick scrolls to that case.
- **After the last case:** a quiet section reading *"More cases are being recovered."*, with a small line, *"Legend or history? You decide."*, and then the **footer**.

## 6. Phones and reduced motion
- **Phones:** the same sections stacked: frame full width, title under it, then the headline and subline. No tilt, simple fade-ins. The header keeps the wordmark and "Start investigating" (Music in a small icon).
- **Reduced motion:** no rising, tilting or veil sway. Everything is in place, with fades only.

## 7. Performance and meta
- Lazy-load the frame images, sized as WebP.
- No blur on large layers. `will-change` only while moving.
- The page `<title>` is "Histor: Legend or history? You decide.", with a matching meta description.

## Also
- Set the s-aboard image credit to "An empty, wet ship's deck. An AI illustration made with Google Gemini in 2026, not a picture from the time."
- The phone gate ("better on a laptop") covers only the desk and file routes. Remove it from the verdict and report pages, and check that both read well at 375px.

---

## Done means
- Items 1 to 7 and "Also" are built, one commit each.
- Tests, build and lint pass.
- Checked in the browser at 375px and 1440px.
- One report. Push.
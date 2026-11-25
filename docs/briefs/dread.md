# Brief: The dread pass (decoration, ghosts, the eye, the lantern)

Save as `docs/briefs/dread.md`. The same ground rules as `docs/briefs/review-fixes.md` apply:
- Don't stop to ask questions; list your choices in the report.
- One commit per item, starting `[claude-code]`.
- All motion goes through `motion.ts`, and all sound through the event table.
- Install nothing, and skip browser runs.

**The idea that ties it all together: facts are solid, legends are ghosts, and the past is watching you judge it.** Every scare here has a purpose tied to that. Quiet beats loud, rare beats constant, and there's no gore. There is exactly **one** jump scare in the whole app (item 8).

Every item must have a reduced-motion version (static or off) and must be cheap to run: transforms, opacity, SVG and small textures only, with no canvas loop running when nothing is happening.

---

## 1. Materials: everything recovered from the sea
- **Film grain:**
  - A very faint animated grain over the whole site (a small tiled noise texture stepped in a few frames, not a canvas loop).
  - A soft vignette.
  - Both sit under the UI, never over text contrast.
- **The board:** it becomes worn **sailcloth**, with ragged, frayed edges (an SVG mask), faint salt and tide stains, and a coarse weave texture.
- **Theory slates:** chipped corners and faint chalk dust at the edges.
- **Files and documents:**
  - Torn and deckled edges (an SVG mask, a different one per file, chosen by a seeded pick from the id).
  - The odd water ring or stain, and a slightly curled corner on some.
  - Ink on legend files looks slightly bled.
- **Modals and slips:** aged paper with deckled edges.
- **The preloader:** on first load, a dark screen with a small ship's-bell mark and the typed line "Recovering the files…" and a thin progress line, shown while fonts and the first images load (at most about 3s). It fades into the legend intro.
- **Themes:** these textures belong to the case theme (`CaseTheme.materials`, optional), so Jack the Ripper can later bring soot, fog and gaslight instead of salt and sailcloth.

## 2. The lantern cursor, and the lamp fixed
- **Bug:** the desk's light that follows the cursor no longer works properly (probably since the board was lifted above the lamp layer). Fix it. The whole desk, board included, is lit by the cursor's light, while staying readable everywhere (the 4.5:1 rule still holds).
- **The cursor is a small lantern flame:** a warm dot with a soft, gently flickering halo. It replaces the system cursor on desktop with a fine pointer, and only there.
- **Cursor states** show a small typed word beside the flame:
  - *Open* over a file;
  - *Drag* while carrying one;
  - *Read* over a portal name;
  - *Pin* over a theory while carrying a file.
- The light flickers briefly when it passes over an opened legend file.
- Keyboard focus outlines stay fully visible. The system cursor comes back inside text fields.

## 3. Ghost text from the files on the floor
- Files lying on the floor sometimes **breathe out a line of their own text**: a short phrase taken from that file's detail.
  - It rises faintly out of the file like smoke, drifting upward and sideways in ghost-ink italic, and dissolves after 3–5s.
  - **Every** file on the floor can do this, opened or sealed, so it never gives away a status.
- **Rhythm:** a new ghost line every 4–8s, from a random floor file, at most **2** at once. It pauses while a file is open or a modal is showing.
- **The murmur:** a faint, low, wordless murmuring (filtered noise with formant-like band-pass sweeps), which grows a little with each active ghost line and fades when they're gone.
- Under reduced motion, there are no ghost lines.

## 4. The eye
- **Rarely,** at most once every 60–120s of activity and never in the first 30s, an **eye** opens in a dark area: a story image's shadow, a desk corner, the edge of the board.
- It's drawn in SVG: a heavy-lidded, realistic-ish eye in muted tones, not cartoonish.
- It opens slowly, **follows the cursor** for 2–3s, blinks once and closes. It never covers text or controls.
- **Sound:** a barely audible, wet blink and a low breath.
- Where it can appear is data-driven: the case lists safe zones per image (`StorySection.eyeZones?`), and the desk has fixed zones.
- Under reduced motion, it never appears.

## 5. Legends and the lamp
- **When a Legend stamp lands,** the lamp dips (dims and flickers for about 1s), as if something passed between it and the desk.
- **Opened legend files** (only once their stamp is known) twitch now and then while lying on the floor or the board: a tiny shiver every 10–20s.
- Sealed files never twitch.

## 6. The shadow on the deck
- In `s-aboard` ("Everything, except the people"), **once per visit**, a faint human-shaped shadow drifts slowly across the deck image while the page is being written, then it's gone.
- It's a soft, blurred silhouette with no face or features, at low opacity.
- Put it in the case data (`StorySection.apparition?`, with a path or silhouette id, a direction and a delay), not hard-coded.
- Under reduced motion, it doesn't appear.

## 7. A creepier sound layer, kept under control
- **Touching a file** (pick-up or hover) adds a very faint breath or whisper on top of the paper sound. Hovers are throttled.
- **Moving the cursor:** a very faint airy rush whose level follows cursor speed, heavily smoothed and capped. It should be felt more than heard, and stop instantly when the cursor stops.
- **The verdict:** a slow heartbeat while hovering the final choice, speeding up slightly the longer you hover.
- **Too quiet for too long** (about 25s without input on the desk): a distant creak, or a door somewhere far off. At most once every 90s.
- **The mixer must stop sounds from piling up:**
  - Give every sound a category: `ui`, `paper`, `dread`, `ambience` or `music`.
  - Only **one `dread` sound plays at a time**, with a cooldown of at least 6s between them.
  - `ui` and `paper` have per-sound cooldowns.
  - Total voices stay capped.
  - Priority order: voice > stamp > dread > paper > ui.
- **Music on the desk drops** to about half its story level, because the desk now carries its own sound.
- Add every new sound to `/dev/sound`.

## 8. The one jump scare
- After the player closes the case, if they relied on **any legend**:
  1. The screen cuts to black for a beat.
  2. The **eye** opens large in the centre.
  3. A sharp, short sting plays, the loudest moment in the app but still capped.
  4. The pen writes under it: *"You trusted a legend."*
  5. Then the reveal continues as now.
- It plays once per case completion. If the player relied on no legends, it doesn't happen; they earned the quiet.
- Under reduced motion, there's no cut or sting; the line simply appears.

---

## Done means
- Items 1 to 8 are built, one commit each.
- Tests, build and lint pass.
- The steering docs (`design.md`, `motion.md`, `sound.md`) describe the dread rules: purpose, rarity, one jump scare, reduced motion.
- One report with every choice and the constants to tune (rarity timers, levels, opacities). Push.
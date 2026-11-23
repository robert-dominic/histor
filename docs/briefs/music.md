# Brief: Music playlist, two sound controls, UI sounds, the autoplay bar

Save as `docs/briefs/music.md`. The same ground rules as `docs/briefs/polish-sound.md` apply:
- Don't stop to ask questions; list your choices in the report.
- One commit per item, starting `[claude-code]`.
- Install nothing (use `ffmpeg` only if it's already installed), and skip browser runs.

Robert's verdict on the sound build: **he loves the effects**, but he doesn't like the generated music and the sea "waves" ambience. Real music tracks he chooses will replace them.

---

## 1. Two controls: music and sound effects
- Replace the single speaker toggle with two icons in the header:
  - **Music** (a note icon) controls the music.
  - **Effects** (a speaker icon) controls the effects and the narrator's voice.
- Each is on/off, remembered separately (`histor:music`, `histor:effects`).
- Clicking **and holding** either icon, or hovering on desktop, shows a small popover with a volume slider (remembered as well).
- The play modal's "Sound on" switch becomes two small switches, "Music" and "Effects", both ticked by default.

## 2. A rotating playlist
- **Remove the generated score (the pad) and the generated sea and wind ambience** from what plays. Keep their code behind a constant (`AMBIENCE_ENABLED = false`) in case we want them back. The effects, including the ship's bell, stay.
- **The music player:**
  - It plays a **playlist** for the current place: `story` tracks in the story, `desk` tracks on the desk, verdict and report.
  - It shuffles, never plays the same track twice in a row, and **crossfades** over about 3s from one track to the next. It loops the playlist for ever.
  - **Moving between places** (story ↔ desk) crossfades to the other playlist.
  - **Turning music off and on resumes the same track from where it stopped.** Never restart it. (This is a reported bug.)
  - Tracks **stream** (`<audio>` with `preload="none"` routed into the music bus). Only the current track and the next one load.
- **Levels:**
  - Music sits under everything.
  - Under narration it ducks to about **12%**.
  - Under hooks and stamps it ducks gently, as the score did.
  - The desk playlist plays a little quieter than the story's.
  - All levels go in the tune constants.
- **Data:** replace `CaseTheme.music` with optional `CaseTheme.playlists?: { story?: Track[]; desk?: Track[] }`, where `Track = { src: string; title: string; credit: string }`. Validate it, and update the spec line and tests. With no playlist, there's no music, and nothing breaks.
- **Credits:** add a "Music" section to the case credits listing each track's title and credit.

## 3. Importing Robert's music (a script)
- Robert saves the tracks he picks from Pixabay in `/home/webnova/histor-media/music/story/` and `/home/webnova/histor-media/music/desk/`, outside the repo.
- Add `npm run music:import`. It:
  1. Converts each file with `ffmpeg` to MP3 (128 kbps stereo), trims leading and trailing silence, normalises loudness (`loudnorm`, about −18 LUFS, so tracks match), and writes the results to `public/audio/music/{caseId}/story/` and `.../desk/`.
  2. Writes `src/cases/{caseId}/music.ts` with the playlists. Each track's `title` comes from the file name. `credit` defaults to "Pixabay" plus a `TODO` comment for Robert to fill in the artist name.
  3. Prints each file's size before and after.
- The case is passed as an argument (`npm run music:import -- mary-celeste`).
- If `ffmpeg` isn't installed, the script says so clearly and stops. Don't install it.
- The Mary Celeste theme imports `music.ts` when it exists. Until Robert runs the script, the case has no playlists.

## 4. UI sounds
Subtle, short and never annoying. They go through the effects bus and the event table.
| Event | Sound |
| --- | --- |
| Any button or link click | A soft paper tick |
| Opening the ? guide | A page flip |
| Closing the guide | A softer page flip |
| A modal opening | A paper slide in |
| A modal closing | A paper slide out |
| Hovering a file on the floor | A very faint brush, at most 4 a second |
| A toggle switch | A small click |
- Add a shared `useUiSound()` hook, or a global click listener on `[data-sound]` elements; your choice. Don't fire twice where a component already emits its own event.
- Add each new sound to the `/dev/sound` page.

## 5. The autoplay bar
- While "Play the story" runs, show a clear bar at the bottom centre: **"▶ Playing — click or press Space to pause"**, with a thin progress line for the whole story.
- When paused it reads "❚❚ Paused — press Space to continue".
- It fades to faint after 3s without movement, and comes back on any mouse move.
- Space toggles play and pause (except while a modal or a text field has focus).
- It replaces the small floating button, so there's only one control.

---

## Done means
- Items 1 to 5 are built, one commit each.
- Tests, build and lint pass.
- `sound.md` in the steering docs is updated (music, playlists, the two controls and the UI sounds).
- A short note in the report tells Robert exactly where to put the tracks and which command to run. Push.
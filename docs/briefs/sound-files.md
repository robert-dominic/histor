# Brief: Real sound files, music off, and the intro fix

Save as `docs/briefs/sound-files.md`. The same ground rules as before apply:
- Don't stop to ask questions; list your choices in the report.
- One commit per item, starting `[claude-code]`.
- Skip browser runs.
- `ffmpeg` is installed and may be used.

Robert has gathered real sound files. **Every generated (synthesised) sound is replaced by a file. Nothing is generated any more.**

---

## 1. Fix: the legend intro is always the first screen
- **The bug:** the legend intro (the dark ship and the Legend stamp) can't be reached. The play modal appears first, even with storage cleared.
- **The story always begins at the legend intro,** on every visit and from every path (the header title, a reload or a direct link).
- **The play modal comes only after the intro,** when the reader moves past it ("See what really happened" or scrolling on), and **only if they have never chosen.** Once chosen (`histor:story-mode`), it never shows again. Space bar and the play bar start "Play the story" at any time anyway.
- Add tests for:
  - a fresh visit: the intro first, then the modal after it;
  - a return visit: the intro first, with no modal.

## 2. Import the sound files
- **The source:** `/home/webnova/histor-media/sfx/` (outside the repo, WAV files from Mixkit).
- Add `npm run sfx:import`. With `ffmpeg`, it:
  - converts each file to MP3 (96 kbps; mono for short effects, stereo for loops);
  - trims leading silence;
  - normalises loudness so the files match;
  - writes them to `public/audio/sfx/`;
  - prints each file's size before and after.
- **Make the one missing file:** `pen-legend` = `pen` slowed to about 75% speed and pitched down a little (`atempo` and `asetrate`), so it sounds slower and creakier.
- **The files and what each one is for:**

  | File | Used for |
  | --- | --- |
  | `click` | Every button and toggle |
  | `modal` | Every modal opening and closing (help guide included), and the share and volume popovers |
  | `pen` | All pen writing (headings, pages, crew list, signature, file titles) |
  | `pen-legend` | The legend intro's pen and "You almost believed this." |
  | `typewriter-key` | All typed text (kickers, years, notes, hints, the guide) |
  | `typewriter-ding` | The rank appearing; the end of long typed lines |
  | `stamp` | **Every** stamp: Record, Disputed, Legend, UNSOLVED, Close the case, CHOSEN |
  | `chapter` | A new chapter appearing |
  | `dread-1` to `dread-4` | The hook lines, picked without repeating the last one |
  | `question` | The central question appearing (a loop, held under the question) |
  | `question-pulse` | Each line of the question |
  | `room-tone` | The desk atmosphere (a loop) |
  | `file-pickup` | Picking up a file |
  | `file-open` | A file opening |
  | `pin` | Pinning to a theory or the "None of them" tray |
  | `file-drop` | A file dropped on the floor |
  | `heartbeat` | Hovering a final choice at the verdict (a loop) |
  | `murmur` | Ghost text on the desk (a loop, dread pass) |
  | `eye` | The eye appearing (dread pass) |
  | `creak` | Too quiet for too long on the desk (dread pass) |
  | `jump-sting` | "You trusted a legend." (dread pass) |

- Where a sound plays repeatedly (pen, typewriter), throttle it so there are no machine-gun repeats, and vary the pitch and volume slightly each time.

## 3. Remove the cut sounds and the music
- **Cut entirely:** hover sounds, the cursor-movement rush, the hook-fading whoosh, the thread drawing, the sea and wind ambience, and the ship's bell. Remove their events from the map.
- **The music is off:**
  - Remove the music playlists from playback and the **Music** control from the header and the play modal.
  - Keep one sound control, **Sound**, with its volume popover.
  - Keep the playlist code and the `music.ts` data in the repo, unused, in case we bring music back.
- Remove the generated (synth) sound recipes that are no longer used, but keep the engine, the buses and the event table.

## 4. The mix: one thing in focus
- **The priority order:** voice > stamp > dread / jump-sting > question > file actions > pen / typewriter > UI clicks > loops.
- **`room-tone`** plays very low on the desk. It ducks while **`murmur`** is rising, so only one of them is ever in focus. `murmur` swells only while ghost text is on screen.
- **`question`** fades in under the question and out as the fork modal opens.
- **`heartbeat`** fades in and out over about 0.5s.
- Update `/dev/sound` to list every file, with its level and a play button.
- Put every level in one tune table.

## 5. Update the docs
`sound.md` in the steering docs describes the file-based sounds, the cut list and the mix. Add a "Sound" section to the case credits listing Mixkit, which needs no attribution but gets a credit as good practice.

---

## Then: the dread pass
**After this brief is pushed,** build `docs/briefs/dread.md`, with these changes:
- Use these sound files, not generated sounds: `murmur`, `eye`, `creak`, `heartbeat` and `jump-sting`.
- **Skip from item 7:** the cursor-movement rush and the whisper on touching a file (both cut).
- Report both briefs in one final report.

## Done means
- Items 1 to 5 are built, then the dread pass, one commit per item.
- Tests, build and lint pass.
- One report. Push.
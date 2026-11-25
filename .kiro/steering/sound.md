---
inclusion: always
---

# Sound: Histor

> Steering doc for Kiro. Read this before any task that touches sound. The code is `src/lib/sound/`.

## The rule

**Every sound is a real file. Nothing is generated** (sound-files brief). The effects are recordings from Mixkit, chosen by the owner, imported by `npm run sfx:import` into `public/audio/sfx/`, and credited in the case credits ("Sound": Mixkit needs no attribution; it is credited as good practice). A narration clip, when a case has one, is a file too. **The music is off** (`MUSIC_ENABLED = false`). Quieter is better: the aim is atmosphere and weight, never a cartoon. **One thing is in focus at a time** (see "The mix").

## The engine (`src/lib/sound/engine.ts`)

- **One `AudioContext`**, created lazily on the first user gesture (a pointer, a click, a touch or a key, anywhere), never before. A browser without Web Audio simply has no sound. Once it starts, the sound files load (`samples.ts`, about 1.4 MB, decoded once).
- **Sound starts at the legend intro** (review-fixes brief, 6). Until the first click or key, the legend intro shows a small, quiet hint at its foot, "🔊 Click anywhere for sound" (`SoundHint`), which fades once the sound is unlocked. Choosing in the play modal counts too. Not shown with the sound off, or under reduced motion (where a gesture alone starts nothing).
- **Where the player is, said early, is not lost.** The case page says `place: story` in its own effect, which runs before the app's `startSound` (children's effects run first); the last `place` is kept (`lastPlaceEvent`) and picked up when the sound starts listening.
- **One control, Sound** (sound-files brief, 3): one icon in the case header (`SoundControls`, a speaker) for the effects and the narrator's voice, on or off (`histor:effects`; absent means on), with its volume (`histor:effects-volume`) in a popover. The play modal has one small switch, "Sound". There is no Music control while the music is off.
- **The popover rules (review-fixes brief, 2):** a click on the icon only turns the sound on or off; it never opens the popover. With a mouse, hovering opens it; moving into it keeps it; leaving both closes it after a 200ms grace. Only one popover is open at a time. Focus opens it; Escape or Tab away closes it. On touch, a long press opens it and a tap elsewhere closes it (`src/lib/use-popover.ts`, also used by the result screen's Share menu). Every popover is the one paper `Popover`.
- **Buses:** master, then a gate per channel; under the effects gate, the effects bus, and under it one gain per tier of the mix (`mix.ts`). The music side (its gate and duck) is kept for when music comes back.
- **The tab hidden:** everything fades out, and back in when it returns; the context then rests.
- **Components never call sounds.** They emit their moments (`src/lib/story-events.ts`); the engine listens, and the table in `src/lib/sound/sound-map.ts` says which file each moment plays. To change a sound, change its row there, or its file.
- **Every level and timing to tune is in `src/lib/sound/levels.ts`:** `SAMPLES` (each file's level, tier and whether it varies), `MIX` (the focus dip, the loops' levels and fades), `SOUND` (master, voices cap, throttles).

## The files (`npm run sfx:import`)

1. The owner keeps the WAVs (from Mixkit) in `~/histor-media/sfx/`, outside the repo (`HISTOR_MEDIA` overrides the folder).
2. `npm run sfx:import` converts each with `ffmpeg` (`src/lib/sfx-import.ts`, tested): MP3 at 96 kbps, mono for a short effect and stereo for a loop; the leading silence trimmed; loudness matched (`loudnorm`, about −18 LUFS); tiny fades so nothing clicks. A sound heard per letter keeps only its first key or stroke (`typewriter-key`, `pen`); a loop is capped at 24s. It prints each file's size before and after.
3. It makes the one missing file, **`pen-legend`**: the pen slowed to about 75% and pitched down a little (`asetrate`, `atempo`), slower and creakier.

| File | Used for | Tier |
| --- | --- | --- |
| `click` | Every button and toggle (`ui-click`, `ui-toggle`) | ui |
| `modal` | Every modal opening and closing (the play choice, the fork, the ? guide), and the popovers (share, volume) | ui |
| `pen` | All pen writing: headings, pages, the crew list (and its un-writing), the signature, file titles | writing |
| `pen-legend` | The legend intro's pen, and "You almost believed this." (`pen` with `hand: 'legend'`) | writing |
| `typewriter-key` | All typed text: kickers, years, notes, hints, the guide (`type-key`) | writing |
| `typewriter-ding` | The rank appearing; the end of a typed line over 40 characters (`type-return`) | writing |
| `stamp` | **Every** stamp: Record, Disputed, Legend (the files' and the legend intro's), UNSOLVED, Close the case, Chosen, the report's standing. `stampHit` (motion.ts) sends `stamp-hit` as it presses in. | stamp |
| `chapter` | A chapter appearing (forward, and back: its entrance plays again) | question |
| `dread-1` to `dread-4` | The hook lines, picked without repeating the last (`pickDread`); a chapter can name its own (`StorySection.hookSound`, one of the four, validated) | dread |
| `question` | Held under the central question (a loop) | question |
| `question-pulse` | Each line of the question | question |
| `room-tone` | The desk's atmosphere (a loop) | loop |
| `file-pickup` | Picking up a file (`folder-lift`) | file |
| `file-open` | A file opening (`flip` open; closing, the same, quieter) | file |
| `pin` | Pinning to a theory or "None of them" | file |
| `file-drop` | A file dropped on the floor (`folder-land`) | file |
| `heartbeat` | Hovering a final choice at the verdict (a loop; dread pass) | loop |
| `murmur` | Ghost text on the desk (a loop; dread pass) | loop |
| `eye` | The eye appearing (dread pass) | dread |
| `creak` | Too quiet for too long on the desk (dread pass) | dread |
| `jump-sting` | "You trusted a legend." (dread pass) | dread |

**Repeated sounds never machine-gun:** the pen at most 12 a second (`SOUND.penTicksPerSecond`), the typewriter at most 14 (`SOUND.typeKeysPerSecond`); they, the click and the file actions vary their pitch (±4%) and level (±12%) a little each time (`SAMPLES_VARY`). **Typed text gets the typewriter; written text gets the pen** (`src/lib/typewriter.ts`, `src/lib/quill-writing.ts`).

## Cut (sound-files brief, 3)

Hover sounds (a file on the floor), the cursor-movement rush, the hook-fading whoosh, the thread drawing, the sea and wind ambience, the ship's bell, the hook's drone, the legend's whisper, and every generated recipe (`voices.ts`, `ambience.ts`, `score.ts` are gone). Their events stay silent. `CaseTheme.ambience` (the old layers and the bell's cue) is still in the case data and types, unused.

## The mix: one thing in focus (`mix.ts`, sound-files brief, 4)

- **The priority order** (`TIERS`): voice > stamp > dread (and the jump sting) > question > file actions > pen and typewriter > UI clicks > loops. Every file plays through its tier's gain. While a sound plays, every tier below it dips to `MIX.focusDuck` (0.4) and comes back as it ends; the voice holds the dip for as long as it speaks.
- **`room-tone`** plays very low on the desk (and only there). While **`murmur`** rises (ghost text on screen: the `ghosts` event, a little louder with each line), the room tone drops further, so only one of them is ever in focus. The murmur swells only while ghost text is on screen.
- **`question`** fades in under the question (from its first line) and out as the fork modal opens; back if the fork closes on the question; out when the reader goes back into the story.
- **`heartbeat`** fades in and out over about 0.5s (the `heartbeat` event).
- The loops live in `loops.ts`; they follow the moments even before the sound starts, and begin once the files are in.
- **`/dev/sound`** (development builds only) lists every file with its level, its tier and what it is for, with a button that plays it.

## The dread layer, kept under control (dread pass, 7 and 8)

All files, nothing generated. Quiet beats loud, rare beats constant.

- **The verdict:** a slow `heartbeat` while a final choice (a theory note) is hovered, fading in and out over 0.5s and quickening slowly the longer the hover (to 1.3× over 12s: `MIX.heartbeat`).
- **Ghost text:** the `murmur` grows a little with each ghost line on the desk and fades when they are gone (`ghosts`); the room tone drops under it.
- **The eye:** `eye`, a barely audible wet blink and a low breath, as it opens.
- **Too quiet for too long:** after 25s without input on the desk, a distant `creak` (`quiet`), at most once every 90s (`MIX.quietMs`, `MIX.creakEveryMs`).
- **The one jump scare:** `jump-sting`, the loudest file in the app and still capped (`SAMPLES['jump-sting'].level`), with everything else ducked.
- **Cut:** the cursor-movement rush and the whisper on touching a file (sound-files brief).
- **The mixer stops sounds piling up:** every file has a category (`ui`, `paper`, `dread`, `ambience`, `music`: `SAMPLES[name].category`). **Only one `dread` sound plays at a time, at least 6s apart** (`MIX.dreadGapMs`; the jump sting excepted: it is the moment). `ui` and `paper` sounds have per-sound cooldowns (`cooldownMs`; the pen and the typewriter are throttled by the table). The voices stay capped (`SOUND.maxVoices`), and the tiers keep the priority order (voice > stamp > dread > paper > ui).
- **Music on the desk** (when it comes back) at about half its story level (`MUSIC.level.desk`).

## Music: off, kept (`music.ts`)

`MUSIC_ENABLED = false`: no playlist plays, there is no Music control, and no music is credited. The playlist player (`music.ts`: shuffled, crossfaded, streamed, resumed where it stopped), `CaseTheme.playlists`, the Mary Celeste's `music.ts` data, `npm run music:import` and their tests are kept, unused, in case music comes back.

## Narration (`narration.ts`), ready for recordings

- Optional `narration?: { src, credit }` on `StorySection`, and `Case.centralQuestionNarration` for the question; validated (both non-empty strings). The Mary Celeste has no recordings yet, and everything works without them.
- **"Play the story":** a chapter's clip plays as its page is written, and Play waits for the clip to end, plus a short beat (`NARRATION.beat`), before moving on. The question's clip starts with its first line; its last line waits for the clip.
- **"Read at my pace":** a clip plays only when the reader presses the small **"Listen"** button, with the recording's credit beside it. Pressing it again stops it.
- One clip at a time. The voice is first in the mix: every sound file dips while it speaks. With the sound off, there is no voice.

## The one listener

`startSound` hears every click on a button, a link, a switch or a menu item and sends `ui-click` or `ui-toggle`: no component asks for it. An element marked `data-ui-sound="off"` (or inside one) has its own sound already and gets no click. Disabled controls are silent.

## Quality bar

- Nothing loud or sudden except the stamps and the one jump sting: the stamp is the loudest file but the sting, and every other sits at 75% of the stamp's level or less (a test holds it). The master is modest.
- No clicks: every file starts and ends with a tiny fade; gains always glide, never jump.
- CPU: no more one-shot voices at once than `SOUND.maxVoices` (another is skipped); the pen and the typewriter are throttled; a loop is one buffer source; the context rests once the tab is hidden and faded.
- Under reduced motion, sound still works (it is separate from motion), but nothing starts by itself: only the player's own choice (the header's toggle, or the play modal's switch), and narration never plays without "Listen".

## Testing

Tests run on a fake `AudioContext` (`src/test/fake-audio.ts`, with `loadFakeSamples` for stand-in buffers): the files the import writes match the table, every moment's file, the throttles and variation, the dread pool, the tiers and the focus dip, the loops, the voices cap, and no sound before a gesture.

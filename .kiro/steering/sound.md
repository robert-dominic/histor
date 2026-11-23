---
inclusion: always
---

# Sound: Histor

> Steering doc for Kiro. Read this before any task that touches sound. The code is `src/lib/sound/`.

## The rule

**Effects are generated; music is real.** Every effect is generated in code with the Web Audio API: noise, oscillators, filters and envelopes. Nothing to download or license, no added weight. Each is small and tasteful; quieter is better. The aim is atmosphere and weight, never a cartoon effect. The music is real tracks the owner chooses (see "Music"), streamed; and a narration clip, when a case has one, is a file too.

## The engine (`src/lib/sound/engine.ts`)

- **One `AudioContext`**, created lazily on the first user gesture (a pointer or a key), never before. A browser without Web Audio simply has no sound.
- **Buses:** master, then a gate per control. Under the music gate, the music side (`music`, and the kept `ambience` and `score`) passes through a duck: it **dips under hooks and stamps, gently, and to about 12% under the voice**, and comes back after the moment's hold. Overlapping ducks keep the deepest dip and the latest end. Under the effects gate, `effects`, which never dip.
- **Two controls (music brief, 1):** two icons in the case header (`SoundControls`). **Music** (a note) controls the music; **Effects** (a speaker) controls the effects and the narrator's voice. Each is on or off, remembered apart (`histor:music`, `histor:effects`; absent means on; the old single `histor:sound` off is read as both off until a new choice). Pressing and holding an icon, hovering it with a mouse, or reaching it with the keyboard shows a small popover with its volume slider (remembered: `histor:music-volume`, `histor:effects-volume`). Each channel has its own gate under the master. The play modal ("Play the story" / "Read at my pace") has two small switches, "Music" and "Effects", ticked unless turned off before; that click is the gesture that starts the sound.
- **The tab hidden:** everything fades out, and back in when it returns.
- **Components never call sounds.** They emit their moments (`src/lib/story-events.ts`); the engine listens, and the table in `src/lib/sound/sound-map.ts` says what each moment sounds like. To change a sound, change its row there, or its recipe in `voices.ts`.
- **Every level and timing to tune is in `src/lib/sound/levels.ts`** (`SOUND`).

## Music: a rotating playlist (`music.ts`)

- Each case names its music in its theme: `CaseTheme.playlists = { story?: Track[], desk?: Track[] }`, with `Track = { src, title, credit }` (validated; optional: without a playlist there is no music, and nothing breaks). The Mary Celeste's come from `src/cases/mary-celeste/music.ts`, written by `npm run music:import` (see "Importing music").
- The player plays the playlist of the place the player is in: `story` tracks in the story (and its legend intro), `desk` tracks on the desk, the verdict and the report. It **shuffles**, never plays the same track twice in a row, **crossfades** over about 3s from one track to the next, and loops the playlist for ever. Moving between places crossfades to the other playlist.
- **Turning the music off pauses the track where it is; turning it back on resumes it from there, never from the start.** The tab hidden pauses it too, after the fade.
- Tracks **stream**: an `<audio>` with `preload="none"`, routed into the music bus through its own gain. Only the current track and the next one load (the next starts loading a few seconds into the current).
- Levels (`MUSIC` and `SOUND` in `levels.ts`): the music sits under everything; the desk's playlist a little quieter than the story's; ducked under the voice to about 12%, and gently under hooks and stamps.
- **Credits:** the report ends with a "Credits" section listing each track's title and credit under "Music".

## Importing music (`npm run music:import -- <caseId>`)

1. The owner saves the chosen tracks (from Pixabay) in `~/histor-media/music/story/` and `~/histor-media/music/desk/`, outside the repo (`HISTOR_MEDIA` overrides the folder).
2. `npm run music:import -- mary-celeste` converts each with `ffmpeg` to MP3 (128 kbps stereo), trims the silence at both ends, matches loudness (`loudnorm`, about −18 LUFS), and writes them to `public/audio/music/<caseId>/story/` and `.../desk/`, printing each file's size before and after.
3. It writes `src/cases/<caseId>/music.ts` with the playlists: each title from its file name (without Pixabay's trailing number), each credit "Pixabay" with a `TODO` until the artist is filled in. Running it again keeps credits already filled in.
4. The case's theme imports `music.ts` when it exists (`import.meta.glob`); until the script has run there are no playlists.

It needs `ffmpeg` and Node 22.18 or newer, and installs nothing: without either it says so and stops. Its pure parts are `src/lib/music-import.ts`, tested.

## Ambience and score: kept, off (`AMBIENCE_ENABLED = false`)

The generated ambience (sea, wind and the other layers below) and the generated score no longer play: real music replaced them (music brief, 2). Their code, recipes and tests are kept behind `AMBIENCE_ENABLED` in `levels.ts`, in case they come back. The effects, the ship's bell among them, still play.

## Ambience: the case's theme (`ambience.ts`)

Each case names its ambience in its theme: `CaseTheme.ambience = { story: AmbienceLayer[], desk: AmbienceLayer[] }` (optional; without it, silence). The pages say where the player is with a `place` event: the story page (legend intro and story) is `story`; the investigation layout (desk, verdict, report) is `desk`. Layers both places share play on unbroken; the others fade out and in.

| Layer | How it is made |
| --- | --- |
| `sea` | Brown noise through a slowly moving low-pass, swelling like waves: two slow, unrelated LFOs on the filter and two on the gain, so it never repeats exactly |
| `wind` | Band-passed noise with a slow, uneven sweep; rarely (every 25–60s) a gust |
| `timber` | An occasional low creak (a short resonant sawtooth pulse that bends in pitch), every 8–20s; sometimes the hull answers itself |
| `room-tone` | Brown noise, low-passed, very quiet |
| `lamp-hum` | A faint 60 Hz hum with its 120 Hz partial |
| `distant-sea` | The sea, far away: a lower low-pass and a lower level |

**Day into night:** as the story darkens (`chapter-enter`'s `depth`), the sea gets lower and duller, and the wind louder. The Mary Celeste: `story: ['sea', 'wind', 'timber']`, `desk: ['room-tone', 'lamp-hum', 'distant-sea']`. A later case adds its own layers (rain, fog, distant carriages) to `AmbienceLayer`, `ambience.ts` and the validator.

## The score (`score.ts`)

Background music, generated: a quiet, slowly evolving **pad** under the whole story. A few soft, detuned oscillators (two sawtooth roots a few cents apart, a triangle third and fifth) through a low-pass, playing long **minor chords** that change rarely (every 10–20s, crossfaded between two groups of oscillators that run all the time). No melody and no beat; it sits just above silence.

| Moment | The score |
| --- | --- |
| A chapter enters | The chord shifts slightly darker with the chapter's depth: lower (up to 2 semitones) and duller |
| A hook | Thinned to the drone: only the roots |
| The question | Dropped to almost nothing |
| The desk | Thinner still: a single low held tone that moves rarely (every 20–40s) |
| Away from a case | Fades out |

It has its own `score` bus and level (`SOUND.bus.score`), so it can be turned down without losing the effects; its moods and timings are `SCORE` in `levels.ts`.

## Story sounds (`sound-map.ts`, recipes in `voices.ts`)

| Event | Sound |
| --- | --- |
| `chapter-enter` (forward) | A soft low swell (low-passed brown noise rising, a 55 Hz sine under it) |
| `pen` | A faint scratch: a short tick of high-passed noise, with a little random pitch and level; throttled to about 12 a second at most, never one per letter |
| `hook` (forward) | A deep drone fading in under it (two detuned low oscillators, low-passed), plus one low, distant boom as the text snaps in; the ambience and the score duck |
| `hook-out` (forward) | A soft reversed whoosh (band-passed noise rising out of nothing, cut off softly); the drone fades out |
| `roll-call-out` | A breathy hiss for each name, a little lower in pitch for each |
| `chapter-enter` of a cued chapter | The ship's bell, once per visit, far away: an inharmonic bell of eight sine partials with a long decay, the upper ones dying first, low-passed. The Mary Celeste cues it at `s-found`, as the *Dei Gratia* sights her (`CaseAmbience.cues`) |
| `question-line` | The drone stays low and still; each line adds a faint, low pulse |
| `fork` | A paper slide |

## Desk sounds

| Event | Sound |
| --- | --- |
| `folder-lift` (a folder picked up by hand) | A paper lift: a quick swish of band-passed noise |
| `flip` (open) | The cover flipping: a swish and a soft thud (closing: the same, quieter) |
| `folder-land` (a folder let go) | A soft thud |
| `pin` | A small metallic tick (three high partials), with a faint string creak as the thread draws |
| `stamp:record` | A heavy, solid thud; the ambience ducks |
| `stamp:disputed` | A lighter thud, then a short pen scratch in the margin |
| `stamp:legend` | A thud, then an eerie detuned music-box phrase falling in pitch as the ink drains |
| `legend-pen` | A faint whisper of noise under "You almost believed this." |
| `close-stamp` (the "Close the case" stamp appears) | A thud, as it lands |
| `seal` (verdict: the "Chosen" stamp) | A heavy thud, as it lands |
| `rank` (the rank revealed) | A single typewriter bell ("ding") |

A thud is one recipe at three weights (`thud-soft`, `thud`, `thud-heavy`): a short low sine that drops in pitch, with a knock of low-passed noise.

## Narration (`narration.ts`), ready for recordings

- Optional `narration?: { src, credit }` on `StorySection`, and `Case.centralQuestionNarration` for the question; validated (both non-empty strings). The one place the app plays a file: a voice cannot be generated. The Mary Celeste has no recordings yet, and everything works without them.
- **"Play the story":** a chapter's clip plays as its page is written, and Play waits for the clip to end, plus a short beat (`NARRATION.beat`), before moving on. The question's clip starts with its first line; its last line waits for the clip.
- **"Read at my pace":** a clip plays only when the reader presses the small **"Listen"** button on the panel (or under the question), with the recording's credit beside it. Pressing it again stops it.
- One clip at a time; a step to another passage stops it (a chapter's clip carries on into its own hook). The ambience and the score duck under the voice until it ends. With the sound off, there is no voice.

## Quality bar

- Nothing loud or sudden except the stamps. The master level is modest.
- No clicks: every sound has an attack and a release envelope (`envelope` in `voices.ts`); gains always glide, never jump.
- CPU: no more one-shot voices at once than `SOUND.maxVoices` (another is skipped). The pen's scratch is throttled. The ambience and the score use a few long-running nodes, never new ones every frame. The context rests (suspends) once the tab is hidden and faded.
- Under reduced motion, sound still works (it is separate from motion), but nothing starts by itself: a gesture alone does not start it, only the player's own choice (the header's toggle, or the play modal with "Sound on" ticked), and narration never plays without "Listen".
- A test holds the bar: the heavy stamp is the loudest recipe and every non-stamp sound peaks at 70% of it or less; every recipe starts and ends in silence; every source stops.

## Testing

Tests run on a fake `AudioContext` (`src/test/fake-audio.ts`): the mapping, the choice remembered, ducking, and no sound before a gesture.

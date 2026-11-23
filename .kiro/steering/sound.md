---
inclusion: always
---

# Sound: Histor

> Steering doc for Kiro. Read this before any task that touches sound. The code is `src/lib/sound/`.

## The rule

**No audio files.** Every sound is generated in code with the Web Audio API: noise, oscillators, filters and envelopes. Nothing to download or license, no added weight. Each sound is small and tasteful; quieter is better. The aim is atmosphere and weight, never a cartoon effect.

## The engine (`src/lib/sound/engine.ts`)

- **One `AudioContext`**, created lazily on the first user gesture (a pointer or a key), never before. A browser without Web Audio simply has no sound.
- **Buses:** master, then `ambience`, `score` and `effects` under it. The ambience and the score each pass through a duck: they **dip under hooks, stamps and the voice**, and come back after the moment's hold. Overlapping ducks keep the deepest dip and the latest end. The effects never dip.
- **On and off:** a speaker toggle in the case header (`SoundToggle`), remembered in localStorage (`histor:sound`; absent means on). The play modal ("Play the story" / "Read at my pace") has a small "Sound on" switch, ticked unless the sound was turned off before; that click is the gesture that starts the sound.
- **The tab hidden:** everything fades out, and back in when it returns.
- **Components never call sounds.** They emit their moments (`src/lib/story-events.ts`); the engine listens, and the table in `src/lib/sound/sound-map.ts` says what each moment sounds like. To change a sound, change its row there, or its recipe in `voices.ts`.
- **Every level and timing to tune is in `src/lib/sound/levels.ts`** (`SOUND`).

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
- CPU: no more one-shot voices at once than `SOUND.maxVoices` (another is skipped). The pen's scratch is throttled. The ambience and the score use a few long-running nodes, never new ones every frame.

## Testing

Tests run on a fake `AudioContext` (`src/test/fake-audio.ts`): the mapping, the choice remembered, ducking, and no sound before a gesture.

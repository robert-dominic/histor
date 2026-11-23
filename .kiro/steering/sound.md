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

## Quality bar

- Nothing loud or sudden except the stamps. The master level is modest.
- No clicks: every sound has an attack and a release envelope (`envelope` in `voices.ts`); gains always glide, never jump.
- CPU: no more one-shot voices at once than `SOUND.maxVoices` (another is skipped). The pen's scratch is throttled. The ambience and the score use a few long-running nodes, never new ones every frame.

## Testing

Tests run on a fake `AudioContext` (`src/test/fake-audio.ts`): the mapping, the choice remembered, ducking, and no sound before a gesture.

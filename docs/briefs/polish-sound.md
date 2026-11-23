# Brief: Polish fixes, the result screen, and sound

Save as `docs/briefs/polish-sound.md`. The same ground rules as `docs/briefs/investigation.md` apply:
- Don't stop to ask questions; list your choices in the report.
- One commit per item, starting `[claude-code]`.
- All motion goes through `motion.ts`.
- Install nothing, and skip browser runs.

---

## Part A: Polish

### A1. Long pages fit by widening, never shrinking
- On long chapters (`s-aboard`), the page runs off the bottom of the screen. **Keep the text size exactly as it is.**
- Each chapter's panel widens just enough for its page to fit the screen height. Start at today's width and go up to about 58% of the screen. Short chapters keep today's width.
- Measure after fonts load and on resize.
- **Bug:** there's a hard vertical dark line where the panel ends. The panel must melt into the image with a soft gradient and no visible edge.

### A2. Legend line a little faster
The pen writing *"You almost believed this."* is a touch too slow. Make it about 25% faster, keeping its creepiness, and put the value in the tune constants.

### A3. The board sits higher
There's empty space at the top of the desk, and the board starts too low. Tighten the top bar and move the board up, giving the gained height to the board. Check at 1366×768 and 1440×900. Floor labels stay at least 12px.
- **Move the "Theories" label out of the board.** It goes in the top bar, on the left, on the same line as the "Close the case" stamp on the right. The board itself holds only the notes.

### A4. The result screen
- **Layout:** it's currently one long vertical column. On desktop, use two columns:
  - **Left:** the reveal ("Most historians lean toward…", the comparison line) and the rank.
  - **Right:** the shareable card preview with its actions.
  - The full report continues below, across the width.
- **The player's name on the card:**
  - Above the card, a field asks: "Sign your case file" (placeholder "Your name").
  - As they type, the pen writes the name onto the card preview (debounced, so it doesn't rewrite every keystroke).
  - The name is saved in local storage (`histor:player-name`) and prefilled next time. It's optional: with no name, the card simply has no signature.
  - The canvas render includes the name as a signature line.
- **Share:**
  - "Save the card" downloads the PNG.
  - "Share" uses the native share sheet with the image where supported.
  - Also add direct share links (they open in a new tab with the text and URL filled in): **X, Facebook, LinkedIn, WhatsApp, Reddit, Telegram**, plus "Copy link".
  - The share text reads: "I closed the {title} case on Histor. {rank}. I trusted {n} legends. Can you tell legend from history?" plus the URL.
  - Explain in a small line that the image is saved for attaching, because share links can't carry images.

---

## Part B: Sound, generated in code

**No audio files.** Every sound is synthesised with the Web Audio API: noise, oscillators, filters and envelopes. That means nothing to download or license, and no added weight. Keep each sound small and tasteful, and quieter is better. The aim is atmosphere and weight, not cartoon effects.

### B1. The sound engine
- Create `src/lib/sound/` with one `AudioContext`, created lazily on the first user gesture.
- **Buses:** master, ambience and effects. Ambience **ducks** under hooks and stamps.
- **On and off:** a sound toggle in the header (a speaker icon) is remembered in storage (`histor:sound`).
- **First visit:** the play modal ("Play the story" / "Read at my pace") has a small "Sound on" switch, ticked by default. That click is the gesture that unlocks audio.
- Fade everything out when the tab is hidden, and back in when it returns.
- The engine **listens to the existing events** (`story-events`, the desk and stamp events). Components don't call sounds directly.
- Add the mapping from events to sounds as a table in one file, so it's easy to tune.
- Tests use a fake `AudioContext`: mapping, mute persistence, ducking and no sound before a gesture.

### B2. Ambience: the case theme
- **Sea:** brown noise through a slowly moving low-pass filter, swelling like waves (an LFO on the filter and the gain, irregular).
- **Wind:** band-passed noise with a slow, uneven sweep. Rarely, a gust.
- **Timber:** an occasional low creak (a short resonant filtered pulse), at random intervals of 8–20s.
- **Day into night:** as the story darkens, the ambience gets lower and the wind louder.
- On the desk: a quieter room tone, a faint lamp hum, and the sea far away.
- Make the ambience recipe part of the case theme (`CaseTheme.ambience`, optional, defaulting to silence), so Jack the Ripper can later have rain, fog and distant carriages.

### B2b. The score: background music, generated
- A quiet, slowly evolving **pad** under the whole story: a few soft detuned oscillators through a low-pass filter, playing long minor chords that change rarely (every 10–20s). No melody and no beat. It should sit just above silence, like film-score atmosphere.
- Each chapter can shift the chord slightly darker. Hooks thin it out to the drone. The question drops it to almost nothing.
- On the desk, the score is thinner still: a single low held tone that moves rarely.
- It has its own `score` bus, with a separate level in the tune constants, so it can be turned down without losing the effects.

### B3. Story sounds
| Event | Sound |
| --- | --- |
| Chapter enters | A soft low swell |
| Pen writing | A faint scratch: short high-passed noise ticks, throttled (not one per letter, about 12 per second at most), with tiny random pitch and volume |
| Hook arrives | A deep drone fading in under it (two detuned low oscillators), plus one low, distant boom as the text snaps in |
| Hook decays | A soft reversed whoosh |
| Names un-writing | A breathy hiss for each name, falling in pitch |
| Ship's bell | Once, when the *Dei Gratia* sights her (`s-found` enters): an inharmonic bell built from a few sine partials, with a long decay, far away |
| The question | The drone stays low and still; each line adds a faint, low pulse |
| Fork modal | A paper slide |

### B4. Desk sounds
| Event | Sound |
| --- | --- |
| Picking up a folder | A paper lift (a quick noise swish) |
| Opening a folder | The cover flipping (a swish and a soft thud) |
| A folder landing | A soft thud |
| Pinning | A small metallic tick, with a faint string creak as the thread draws |
| `stamp:record` | A heavy, solid thud |
| `stamp:disputed` | A lighter thud and a pen scratch |
| `stamp:legend` | A thud, then an eerie **detuned music-box phrase** falling in pitch as the ink drains, with a faint whisper of noise under "You almost believed this." |
| Close-the-case stamp appears | A thud |
| Verdict "CHOSEN" stamp | A heavy thud |
| Rank revealed | A single typewriter bell ("ding") |

### B5. Ready for narration (no audio yet)
- Add optional `narration?: { src: string; credit: string }` to `StorySection` and to the central question (`Case.centralQuestionNarration`). Validate them, with spec lines and tests.
- When a section has narration and "Play the story" is on, the clip plays as the page is written, and Play waits for the clip to end (plus a short beat) before moving on. The ambience and score duck under the voice.
- "Read at my pace" plays narration only if a small "Listen" button on the panel is pressed.
- The Mary Celeste has no narration files yet. Everything must work without them.

### B6. Quality bar
- Nothing loud or sudden except the stamps. The master level is modest.
- No clicks: every sound has an attack and release envelope.
- **CPU:** cap the number of voices playing at once. Ambience uses a few long-running nodes, not new ones every frame.
- Under reduced motion, sound still works (it's separate), but there's no autoplay.

---

## Done means
- Parts A and B are built, one commit per numbered item.
- Tests, build and lint pass.
- The steering docs are updated: a new `.kiro/steering/sound.md` with the event table and the rules, and `design.md` for the result screen.
- One report with every choice and the sound constants to tune. Push.
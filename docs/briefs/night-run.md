# Brief: Night run (story v3, desk and guide fixes)

Save as `docs/briefs/night-run.md`. Robert played the build after `desk-fixes` and `story-dread`. Some changes landed well; these didn't. He'll be asleep while this runs.

## Ground rules
- The same ground rules as `docs/briefs/story-dread.md`:
  - Read the steering docs first.
  - All motion goes through `src/lib/motion.ts`.
  - One commit per item, starting `[claude-code]`, with test, build and lint passing at each.
  - Install nothing, and skip browser runs.
- **Don't stop to ask questions. Robert is asleep.** Make the choice that best fits this brief and the steering docs, and list each choice in the report.
  - The only exception is something that can't be undone. Do any work that doesn't depend on it, and stop there.
- Approved type changes: any optional field on `Case` or `StorySection` you need, validated, with a spec line and tests (as you did for `deskGuideIntro`).
- Also apply the pending notes in `docs/briefs/steering-updates.md`.
- Push at the end and send one report: every error hit, every choice made, and the constants to tune.

---

## 1. Story v3: pages written by the pen

The scrolling text column and the line-by-line entrances don't work for Robert: the text comes in too small and too fast, and it feels busy. Replace them with a calmer, more cinematic page per chapter.

### 1.1 Layout of a chapter
- The chapter's image fills the screen, with the slow camera push as now.
- On one side (the left, about 40% of the width), a dark, softly faded panel holds the chapter's text. The image stays visible on the rest of the screen.
- **Text size:**
  - Body in Old Standard TT at about 18–19px, comfortable to read.
  - The kicker typed small above it.
  - The heading written large at the top of the panel.

### 1.2 The pen writes the whole page
- When the chapter reaches the screen, the **same pen that writes the heading** ("Ten people set sail") writes it, then carries on and writes the **whole chapter body**.
  - Writing is timed, not scrubbed: it starts when the chapter settles and runs at a steady pace that leads the eye (about 3× reading speed).
  - Long chapters may write a whole word at a time, so no chapter takes more than about 8–10 seconds.
- **Once written, the text stays.** Nothing fades in and out line by line.
- **Skip:** a click on the panel, or scrolling onward, finishes the writing at once. The reader is never stuck waiting.
- Portal names stay clickable inside the written text.
- **Weighted phrases** (`emphasis`) are written a touch slower and slightly brighter, with a breath before them. **No rust underline** (see 1.5).
- **The roll call** (chapter 1) is written as a short list in the panel after the body, then the names go out last to first when the hook comes.
- The voyage chart stays as the inset.

### 1.3 The hook between chapters
- When the reader scrolls on after the page is written:
  1. The panel dims away.
  2. The image darkens and the camera creeps closer.
  3. The hook line ("Not one of them would ever be seen again.") appears **large in the centre**, with the misaligned letters snapping into place, as now.
  4. After a held beat of scroll, the hook decays letter by letter.
  5. The next chapter's image cross-dissolves in.
- One hook per chapter, and nothing else on screen while it's there.

### 1.4 What goes away
- The scrolling text column (`story-column.ts` timings) and the per-sentence entrances. Keep the useful pieces (the emphasis data, the decay and the snap effects) and delete the rest cleanly, along with their tests.
- **The separate opening scene** with the title, years, UNSOLVED stamp and teaser over chapter 1's image. It repeats chapter 1's image and spoils the first chapter. Remove it.
  - The header simply shows the case title once the story starts.
  - The UNSOLVED idea can live in the header as a small typed tag next to the years.

### 1.5 No red lines in the story
- Remove the rust underlines under weighted words, in the chapters and in the central question.
- Weight comes from timing, a breath and slight brightness only.

### 1.6 The play choice is a real modal
- Remove the play card.
- After the legend intro, when the reader chooses to see what really happened, a **modal** opens over a darkened screen. It's large and on-theme: the case title written by the pen, one short line, and two big buttons, **"Play the story"** and **"Read at my pace"**.
- **The reader must choose.** The story doesn't start until they do (Esc means "Read at my pace").
- Focus is trapped while it's open and returns afterwards.
- It shows each time the story is entered from the legend intro.
- The floating play/pause control stays.
- "Play the story" now waits for each page to finish writing, then adds reading time before it moves on to the hook.

### 1.7 The central question, then the fork as a modal
- Remove the red lines (1.5).
- The question screen is **one solid black background that fills the full screen height**, with no lighter band below it. The phrase-by-phrase build and the snap stops stay.
- **The fork becomes a modal.** Remove the fork section that currently sits under the question ("Some people stop here…", Investigate or Leave).
  - Once the whole question is on screen and the reader scrolls on, a modal animates in over the question: rising and settling (`paper.lift` then `paper.land`) over a darkened backdrop.
  - It holds the fork's existing text and its two choices, **Investigate** and **Leave**, as large buttons.
  - Focus is trapped while it's open. Esc or scrolling back up closes it and returns to the question.
  - "Play the story" opens it after a hold at the end of the question.
  - Under reduced motion it appears without animation.

### 1.8 Reduced motion
- Each chapter shows its image with the whole page already written, then the hook as plain text.
- The modal appears without animation.

### 1.9 Tune constants
Writing speed, the hold before a hook, the hook hold and the auto-play reading time live in one exported, commented object.

---

## 2. Desk and guide

### 2.1 Pinned files are always visible
- Remove the hover-to-reveal panel on piles. Robert doesn't want to hover to see what he pinned.
- Under each theory, pinned files show as **a cascade of strips**: each one shows its number and label, slightly overlapping like cards laid down one after another.
- When there are too many to fit above the floor, the cascade scrolls inside itself (a thin scrollbar). The board never grows.
- Strips can be dragged out and clicked to open, as before.
- Keep one thread per theory, and keep re-measuring it.

### 2.2 The guide opens first, at the top
- **Every time** the player arrives on the desk, the guide is the first thing they see, until they close it. Closing it is their choice.
  - After the first visit, add a small "Don't show this again" checkbox, remembered in storage.
  - The **?** always reopens it.
- **Bug:** the guide opens scrolled to the middle. It must open at the top. Most likely, focus lands on the Close button at the bottom and scrolls the dialog. Focus the dialog's heading instead, and reset its scroll to the top on open.

### 2.3 One name for each thing
- The guide and labels mix "evidence", "files" and "folders". Use **file** for every folder and **theory** for every note, everywhere: the guide, the hints, labels, buttons and `aria` text.
- The floor label becomes **"Case files · {n}"**. "Theories" stays.
- Replace the guide text with this. `{intro}` is the case's `deskGuideIntro`; change the Mary Celeste value to: "In 1872 the Mary Celeste was found drifting with no one aboard. Nobody knows why."

> **How to investigate**
>
> *{intro}*
>
> **The theories are on the board.** Each one is an explanation people have given for what happened. Some still hold up. Some fell apart long ago.
>
> **The case files are on the floor.** Each file is one thing we know, or think we know. Open one and read it.
>
> **Every file you open gets a stamp:**
> - **Record:** written down at the time. The logbook, sworn testimony, official papers. You can trust it.
> - **Disputed:** real, but historians argue over what it means.
> - **Legend:** added later by storytellers. Famous, and false.
>
> **Think a file points to a theory?** Drag it onto that theory. If it points to none of them, drop it on "None of them". You can change your mind any time.
>
> **Open {closeThreshold} files and a wax seal appears.** Use it to close the case: choose the theory you believe, and see where you agree with the historians.
>
> *One warning: the details everyone remembers are often the ones that never happened.*

### 2.4 The report mustn't reveal unopened files
- A pinned file that was never opened still shows its status stamp in the report under "What you relied on". It must show as unopened ("Sealed"), with no status.
- Approved: change `buildCaseReport` or the report view, whichever is cleaner, with tests.

### 2.5 Pin a sealed file without dragging
- Keyboard users and anyone who doesn't drag can't pin a sealed file. When a floor file has focus, show a small **"Pin to…"** button on it, opening the same floating menu. Pressing P while a file has focus does the same.

---

## Done means
- Sections 1 and 2 are built, one commit per numbered item.
- Tests, build and lint pass, and the case validates.
- The steering docs match: `design.md`, `motion.md`, `product.md` (fix "read first and then pinned"), and `docs/content/mary-celeste-scenes.md`.
- One report, then push.
---
inclusion: always
---

# Product: Histor

> Steering doc for Kiro. Read this before any task

## Name

**Histor** (ancient Greek ἵστωρ: "the one who investigates", the witness and judge; the root of the word "history"). The user is the histor. Pronounced HISS-tor. Always written with a capital H.

## One-liner

An interactive archive of real historical mysteries. You hear the legend, learn the record, then open the case files yourself and reach your own verdict.

## The problem

Famous mysteries reach people as myths. Videos and articles blend sworn testimony, guesses and later fiction into one story, so people can't tell what actually happened. The app separates them, and lets the user do the separating.

## Who it's for

Curious people who love mysteries and dark history but have never checked the facts. Assume zero prior knowledge: the user may not know that the Mary Celeste is a ship, or who anyone in the story is.

## The experience

One fixed flow per case. Each step has one job.

### 1. Home: the landing page
An archive of cases hung like a gallery's dark rooms (`src/features/landing`). V1 has one open case, the Mary Celeste (1872); the other five (Jack the Ripper, D. B. Cooper, the Princes in the Tower, the Dancing Plague, Amelia Earhart) are sealed. Job: show this is a collection, and invite the first click.
- **Opening (about 3 to 4s):** black; the Histor wordmark fades in, then rises and shrinks into the header on its own path (about 0.8s, starting first) while a blurred, zoomed detail of the first case's picture shrinks down into its frame, sharpening and settling. The words come in only after the frame has settled. A scroll, key or click skips it; reduced motion goes straight to the end.
- **One case per gesture.** On a laptop and on a phone alike one scroll gesture, swipe or key press plays one quick move (about 0.6s) to the next or previous case, however hard the flick; the new headline is readable within about half a second, and the title is written in beside the frame. Only the centred frame can be pressed. The address carries the case (`/#mary-celeste`), a rail on the left jumps, and after the last case the page scrolls on into the footer; scrolling back up returns to the last case.
- **Each case** is a large frame (about 60% of the screen's height) in its own shape (landscape, portrait, landscape, square, portrait, landscape), a short headline and subline, the title beside the frame's bottom right. An open case opens its page; a sealed one raises a plaque ("Sealed — case file in preparation.").
- **The header:** the wordmark on the left (it scrolls back to the first case); on the right only a music button (the story playlist, quietly, off until clicked: a muted note when off, moving equaliser bars in a progress ring when playing). The first frame, the Mary Celeste, is the main painting: wider, with a heavier moulding.
- **The footer:** the giant HISTOR wordmark, the archive and about columns, © and "Designed and built by Robert".

### 2. The hook
The case's first screen, on its own, shown on every visit. The case's picture, very dark and slowly drifting under a soft moving fog; the hook lines appear one at a time, centred and unhurried (for the Mary Celeste: "The ship was sound. The cargo was untouched. There was food for six months. Everyone on board had vanished."); then the dateline ("December 1872. The Atlantic.") fades in and the screen dissolves into chapter 1. A small "Skip" is in the corner the whole time. It carries no legend, no stamp and no debunk: the case's legends are told, and taken apart, later. Job: put the mystery in the reader's head in under 20 seconds.

### 3. The real story
A telling of what the record says, in steps: one gesture (a scroll, a swipe, a key) moves exactly one step, built with GSAP Observer. A rail on the left shows where the reader is and jumps to any chapter. The story follows **the story pattern** below, for every case.
- Told in short chapters, in plain sentences. Each chapter ends on a line that creates suspicion, which pulls the user on.
- The screen grows darker as the story goes on.
- Before chapter 1 the reader chooses, in a modal, "Play the story" or "Read at my pace"; the story starts once they do. It opens once per page load however the reader arrives (after the hook, on a return visit, a reload or a direct link), and each time the hook's end is reached.
- Key references are marked and tappable: people, titles ("the captain"), pronouns for the ship ("she"), places, dates and terms. Tapping opens a **portal**: a short panel that explains the reference (with a mouse, resting on the name opens it too, and a click pins it). Portals work the same in the story and inside the case files. People show a portrait and profile. Places show an old map of that location. Terms show a plain definition.
- On a phone (under 768px) a chapter is read like a normal page: its text starts at the top of the screen and scrolls freely. The story moves to the next chapter only when the reader is at the bottom and scrolls again, and back to the previous one only from the very top.
- Job: give a newcomer full context, so nobody finishes the story confused.

#### The story pattern (the rule for every case)
Every case's story follows this order. The text lives in `docs/content/<case>-story.md`: a blank line separates steps, and the lines within a step appear one after another.
1. **The hook:** four short lines of what is strange, then the dateline.
2. **The people:** who was there, named (in bold), with their roles and ages. Say what is already sad or odd about them.
3. **The journey:** what they set out to do, and the last thing anyone knows for sure.
4. **The discovery:** who found it, what they found and what was missing. Say what the finders were met with.
5. **What doesn't add up:** the official inquiry, what it could not prove, and the questions that remain.
6. **The legend grows:** how the myth was built, by whom and when, and that nobody has proved what happened.
7. **The closing modal:** "The story ends here. The case doesn't." and one button into the case files.

Writing rules for the story:
- Plain sentences, one idea per line.
- Every sea word (or any technical word) is explained once, where it first appears: a chronometer is "the two instruments a ship needed to know where it was".
- Each chapter ends on a line that creates suspicion: a fact that fits badly, a question or a short flat sentence ("There was no one on board.").
- Facts only from the case's sources (`content-integrity.md`); anything uncertain is marked ("Some say…").

### 5. The board
Two kinds of objects: theories and evidence.
- **Theories** sit across the top, 5 for the Mary Celeste. Each shows its name and one-line claim. How historians rate it stays hidden until the verdict.
- **Evidence** is shown as case files: a set of numbered files lying on the floor of the desk. Every file starts unexamined.
- Opening a file opens its own screen: what the claim is, the source, and its status revealed with a stamp (Record, Disputed or Legend).
- At the end of each file the app asks: "Which theory does this point to?" The user picks a theory, or "None of them." The app then reveals how historians read that piece of evidence, so the user learns as they go.
- The board updates: a thread connects the file to the theory it was pinned to, and that theory visibly strengthens or weakens.
- On a desktop everything can also be moved by hand: a file dragged from the floor onto a theory is pinned at once, without opening it (a sealed file stays sealed and does not count as opened); a pinned or set-aside file can be dragged to another theory, to "None of them", or back to the floor, without opening it. The Pin menu does the same with the keyboard: inside an open file, and on a floor file with the focus ("Pin to…", or P). It lists "Back to the floor" for a file that is pinned or set aside. A file taken off the board stays as it was, opened or sealed.
- The report never reveals an unopened file: a file pinned without being opened shows as "Sealed".
- The investigation needs a laptop-sized screen: below 1024px wide it shows a gate, with a "Continue anyway" link.

### 6. The verdict
When the user has opened enough files (6 files, set per case by closeThreshold), "Close the case" unlocks. The user picks the theory they believe. Then **the reveal**: the lamp narrows, the app types "Most historians lean toward…", the pen writes in the leading theories one by one, and one line compares them with the user's choice ("You stand with the historians.", or "Historians ruled this one out:" with the reason). A typed **rank card** follows (`caseRank`, from the report only: Historian, Investigator or Deckhand, each with one line of the app's voice), and a **shareable card** (a 1200×630 image: the case closed, the rank, the legends trusted, the player's signature if they sign it, histor.space) that "Save the card" downloads and "Share" hands to the browser's share sheet; direct links share the words and the link on X, Facebook, LinkedIn, WhatsApp, Reddit and Telegram, or "Copy link". Nothing is uploaded. Then the **case report**:
- their verdict
- the evidence they relied on
- important evidence they never opened
- any legend they pinned as support ("You trusted a legend.")
- where historians stand, and that no one knows for sure

The report is not graded. It mirrors the user's reasoning. The rank is a playful title at the very end, worked out in its own pure module (`src/lib/case-rank.ts`); `buildCaseReport` stays as it is.

Rank lines (shared UI copy):
- Historian (no legends trusted, and a leading theory chosen): "You kept to the record. Not one story got past you."
- Investigator (at most one legend trusted, or a leading theory chosen): "Good instincts, and a loose thread or two."
- Deckhand (anything else): "You trusted the stories. The sea keeps its secrets."

## Core model

- **Case:** metadata, story sections, theme and assets.
- **Theory:** id, name, one-line claim, historians' standing (leading / considered / rejected). The standing is revealed only at the verdict.
- **Evidence:** id, claim, detail, sources, and exactly one **status**:
  - **Record:** in sworn testimony or official documents of the time.
  - **Disputed:** claimed, but challenged by other evidence.
  - **Legend:** invented or added later; not in the record.
  Each piece of evidence also holds the historians' reading of it: which theories it supports and which it weakens.
- **Reference:** anything tappable in the story. Its type is person, place, term or ship. It has a label, a short profile, and an optional portrait or map.
- **Source:** where a claim comes from. Every evidence file links to at least one.

## Tracking the investigation

The user's investigation is stored in the browser per case (localStorage, wrapped in try/catch) so they can leave and come back. No backend.

- `opened`: the evidence ids the user has opened
- `pins`: evidence id mapped to the theory id the user chose, or `none`
- `verdict`: the chosen theory id, once the case is closed

Actions that write to it: opening a file, answering "Which theory does this point to?", and closing the case. "Reopen the case" clears it. The case report is generated entirely from this record and the case data.

## UX principles

1. **The app talks.** It speaks in its own voice, prompts the user and reacts to what they do, like a guide in the room.
2. **Game-like, never a game.** It has discovery, reveals, choices and consequences. It has no score, lives, timers or penalties.
3. **The UI explains itself.** A first-time user never needs instructions. Each feature's first use is shown in context.
4. **Reveal, don't tell.** Status is earned by opening a file, never shown up front.
5. **Spooky serves meaning.** Every eerie effect encodes something true. Ghost ink means legend, smudges mean disputed, crisp ink means record, and growing darkness means the story deepening.
6. **Always skippable.** Intros and animations can be skipped. Respect `prefers-reduced-motion`: reduced means gentler, not none. Keep fades, remove movement.
7. **Phones work, desktop shines.** One responsive app. Desktop is the demo showpiece; on phones the board becomes a stack.

## Voice

Refined during the build. Working direction: dry, a little mischievous, never cheesy. It speaks plainly, then twists the knife.

- "Well... that part never happened."
- "Most people stop here."
- "You trusted a legend. Happens to the best of us."

When a file's stamp lands on its first opening, the app says one line (shared UI copy, `src/lib/ui-copy.ts`, never case data):
- Record: "Written down at the time."
- Disputed: "Historians argue over this one."
- Legend: "You almost believed this." (written by the pen at the foot of the page)

## Atmosphere

One shared design system: type, files, statuses, board, stamps, portals, case report. Each case adds its own atmosphere from its own folder of assets: images, maps, portraits, sounds and theme colours.

Assets must fit the case's time and place. No audio recordings exist from 1872, so "period sound" means sounds of things that existed then. For the Mary Celeste: creaking timber, rope and sailcloth, wind, water against the hull, a ship's bell, a pen nib on paper, a wax seal, a court gavel.

Avoid the look of the 2025 Costume Contest winner: no book or page-flip interface, no owl, wolf or heartbeat sounds, and no séance, medium or ancestor framing.

## V1 scope

- Home with one open case and sealed placeholders.
- Mary Celeste: hook, real story with portals and the closing modal, board, verdict and case report.
- Investigation saved in the browser.
- Sound with a mute control.
- Works on phones; desktop first.

## Stretch (only after V1 is complete and polished)

- **Chart transition:** choosing a case on Home shows an old sea chart that glides and zooms to where the case happened, then opens the case.
- A second case.

## Not in V1

User accounts, backend, AI chat, social features.

## Content rules

All historical content follows `content-integrity.md`. No claim ships without a status and a source.

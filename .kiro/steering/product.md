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

### 1. Home
A list of cases. V1 has one open case, the Mary Celeste (1872); other cases appear sealed. Job: show this is a collection, and invite the first click.

### 2. Legend intro
The case's most famous legend, told dramatically. For the Mary Celeste this is the version later storytellers made famous: breakfast half-eaten, tea still warm. The legend is written out as if by a quill; then one stamp lands: "Legend". The app answers, typed like a typewriter: "Well... that part never happened.", then explains what really happened. It makes its point quickly and is always skippable. Job: hook the user and show the product's point.

### 3. The real story
A telling of what the record says, in steps: one gesture (a scroll, a swipe, a key) moves exactly one step, built with GSAP Observer. A rail on the left shows where the reader is and jumps to any chapter.
- Told in short sections. Each section ends on a moment of curiosity (its hook) that pulls the user on.
- The screen grows darker as the story goes on.
- Before chapter 1 the reader chooses, in a modal, "Play the story" or "Read at my pace"; the story starts once they do. It opens once per page load however the reader arrives (after the legend intro, on a return visit, a reload or a direct link), and each time the intro's scroll cue is pressed. The case header carries the title. No gesture moves past the modal. Each chapter is a page beside its image, written by a pen; the next step brings the chapter's hook, then the next chapter.
- Key references are marked and tappable: people, titles ("the captain"), pronouns for the ship ("she"), places, dates and terms. Tapping opens a **portal**: a short panel that explains the reference. People show a portrait and profile. Places show an old map of that location. Terms show a plain definition.
- Job: give a newcomer full context, so nobody finishes the story confused.

### 4. The question and the fork
The story ends on the case's central question, stated plainly:

> Why would Captain Briggs abandon a sound ship, one he partly owned, and put his wife, his two-year-old daughter and his crew into a small lifeboat in the middle of the Atlantic?

The question builds one line per step. Then, at the next step, the app speaks in a modal over the question: "Most people stop here. Want to see what the evidence says?"
- **Open the case files:** continue to the board.
- **I've heard enough:** a short close with where historians stand. The casual reader leaves satisfied.

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
When the user has opened enough files (6 files, set per case by closeThreshold), "Close the case" unlocks. The user picks the theory they believe and gets a **case report**:
- their verdict
- the evidence they relied on
- important evidence they never opened
- any legend they pinned as support ("You trusted a legend.")
- where historians stand, and that no one knows for sure

The report is not graded. It mirrors the user's reasoning.

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

## Atmosphere

One shared design system: type, files, statuses, board, stamps, portals, case report. Each case adds its own atmosphere from its own folder of assets: images, maps, portraits, sounds and theme colours.

Assets must fit the case's time and place. No audio recordings exist from 1872, so "period sound" means sounds of things that existed then. For the Mary Celeste: creaking timber, rope and sailcloth, wind, water against the hull, a ship's bell, a pen nib on paper, a wax seal, a court gavel.

Avoid the look of the 2025 Costume Contest winner: no book or page-flip interface, no owl, wolf or heartbeat sounds, and no séance, medium or ancestor framing.

## V1 scope

- Home with one open case and sealed placeholders.
- Mary Celeste: legend intro, real story with portals, question and fork, board, verdict and case report.
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

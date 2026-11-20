# Design Document: fix-pack

## Overview

The fix pack changes how the story and the desk move and lay out. It adds no new screens and keeps the data flow: every screen still reads `useInvestigation()`, the report still comes from `buildCaseReport`, and the routes are the same. The work falls into five parts:

1. **A motion system** in `src/lib/motion.ts` that every tween uses, plus smooth scrolling with Lenis.
2. **Story v2:** an opening scene, a play card, a text column that keeps sentences on screen, headings written on a timer, and the portal fix.
3. **Desk v2 on Desktop:** one fixed screen, a floor of scattered folders, a straight open file that fits the screen, a writing reveal, a floating Pin menu, and drag from anywhere to anywhere.
4. **One new state action**, `UNPIN_EVIDENCE` (approved).
5. **A phone gate** in front of the investigation below 1024px.

No API has been checked with Context7 in this spec session. The build session checks each API once, in the first task that needs it, and records what it found in that task's report. The APIs are: Lenis (setup with ScrollTrigger and `gsap.ticker`, `scrollTo`, `stop`/`start`, `data-lenis-prevent`), `CustomEase`, `Flip` (`getState`/`from` with rotation), `Draggable` (`hitTest`, triggers), `SplitText` (lines) and ScrollTrigger (`scrub` smoothing). Below, "expected" marks a detail that the Context7 check must confirm.

### Key decisions

1. **Motion as data.** `src/lib/motion.ts` exports `MOTION`, one entry per Motion_Token (`ease`, `duration`, plus `y` for `ink.in`), and `STEP` for the Duration_Steps. Tweens spread a token: `gsap.to(el, { ...tween('ink.in'), opacity: 1 })`. A source audit test fails if any GSAP call outside `motion.ts` writes a literal `ease` or `duration`. The rule becomes checkable, not just a convention.
2. **The opening scene is part of the story (Q1).** `StoryOpening.tsx` takes the place of `StoryStart.tsx` at the top of `Story`. The legend intro loses its title card. The title-docking code moves out of `LegendIntro` into a shared helper that the opening scene calls on scroll.
3. **One column per scene, scrubbed by distance.** Each scene's sentences sit in one column. The scene's timeline moves the column up by each sentence's height, over a scroll distance set by a pure helper (`columnPlan`) from the sentence's reading time. Older sentences pass under a static CSS mask, so only the column's `transform` and each sentence's `opacity` change.
4. **Headings run on their own clock.** The heading writer is a separate tween, started when the scene becomes active (the existing `chapter-enter` logic), not part of the scrubbed timeline.
5. **The portal bug (from reading the code; confirmed in a test first).** Every scene is `absolute inset-0` in the same stage, and later scenes sit above earlier ones at `opacity: 0`. An invisible scene still takes pointer events, so the top scene swallows clicks meant for the one on screen. The fix: only the active scene takes pointer events (`data-active` with `pointer-events: none` on the others), written with the same code that dissolves scenes.
6. **The desk has two compositions.** `Desk` renders the new desktop desk (`DeskScreen` with `Floor`) from 1024px up, and today's phone desk (`Pile` strip, inline Pin menu, current open file) below that. The phone desk stays unchanged (Requirement 20.4).
7. **Placement stays derived.** `deskLayout` (existing) still decides Board, tray or floor from the state. The new pure `floorLayout` decides where each floor folder lies. A folder dropped on the floor keeps its drop position in a `Map` held in a ref for the visit (Q7). Nothing new is stored.
8. **One drop rule.** A pure `dropOutcome(source, target)` in `src/features/board/drag.ts` maps every drag source and Drop_Target to one outcome. Every Draggable (floor, board tabs, tray tabs, the open file) calls it, and the Pin menu calls the same `pin` and `unpin` functions.
9. **Threads never animate their geometry.** When a pin changes, the threads whose ends moved fade out (`ink.out`), the tabs move with Flip (`layout`), and the new threads draw in with `stroke-dashoffset`. This keeps to Requirement 3.

## Architecture

```mermaid
flowchart TB
  M[lib/motion.ts: MOTION · STEP · tween()] --> ALL[every GSAP tween]
  SS[app/SmoothScroll.tsx: Lenis ↔ gsap.ticker ↔ ScrollTrigger] --> CASE[pages/Case.tsx]
  CASE --> LI[LegendIntro: myth · stamp · debunk, no title card]
  CASE --> ST[Story]
  ST --> SO[StoryOpening: image · quill title · typed years · UNSOLVED · teaser · cue]
  ST --> PC[PlayCard]
  ST --> SC[StoryScene ×6: image · heading on timer · TextColumn · roll call · hook]
  CP[lib/story-column.ts: columnPlan] --> SC
  CI[app/CaseInvestigation] --> PG{PhoneGate: below 1024px and not continued?}
  PG -- yes --> GATE[Gate screen]
  PG -- no --> D[Desk]
  D -- Desktop --> DS[DeskScreen: header row · Board 55% · Floor 45%]
  D -- below 1024 --> PH[today's phone desk]
  DS --> B[TheoryBoard · HangingTab · Threads]
  DS --> F[Floor: Folder ×n]
  DS --> T[SetAsideTray]
  FL[lib/floor.ts: floorLayout] --> F
  DS --> O[Outlet → OpenFile: fits 86svh · Writing_Reveal · PinMenu popover]
  DR[board/drag.ts: dropOutcome · useDeskDrag] --> F
  DR --> B
  DR --> T
  DR --> O
  IP[InvestigationProvider: + UNPIN_EVIDENCE] --> D
```

## Components and Interfaces

### Motion: `src/lib/motion.ts` (rewritten)

```ts
export const STEP = { fast: 0.2, base: 0.45, slow: 0.9, scene: 1.2 } as const;

type TokenName = 'ink.in' | 'ink.out' | 'paper.lift' | 'paper.move' | 'paper.land'
  | 'stamp.hit' | 'hover' | 'layout' | 'scene' | 'ghost';

export const MOTION: Record<TokenName, { ease: string; duration: number; y?: number }>;
/** The ease and duration of a token, to spread into a tween. */
export function tween(name: TokenName): { ease: string; duration: number };
/** `ghost`: a duration between 2 and 4s, irregular but deterministic per element (from hashUnit). */
export function ghostDuration(key: string): number;
/** `stamp.hit`: a small timeline, the hard expo.in press then the settle. */
export function stampHit(target: gsap.TweenTarget, options?: { reduced?: boolean }): gsap.core.Timeline;
export const MOTION_QUERIES; // unchanged
```

- Values as in Requirement 1.1. How they relate to `STEP` follows Q2.
- `stamp.hit`'s settle is a named `CustomEase` (`histor-settle`), registered once. The old `histor-out`, `histor-in-out` and `histor-drawer` eases are removed once nothing uses them (task 4).
- CSS mirror (Q9): `--motion-hover-ease` and `--motion-hover-duration` in the `@theme` block of `src/index.css`. Hover and focus transitions use them.
- **Audit test** (`src/lib/__tests__/motion-audit.test.ts`): reads every `src/**/*.{ts,tsx}` file except `motion.ts` and the tests, and fails on `ease:` followed by a string literal, or `duration:` followed by a number, inside a GSAP call. Reduced-motion tweens use tokens too (usually `hover` or `ink.in` without the rise).

### Smooth scrolling: `src/app/SmoothScroll.tsx` and `src/lib/smooth-scroll.ts`

- `SmoothScroll` is mounted once around the router in `src/App.tsx`. Under full motion it creates one Lenis instance with `autoRaf: false` (expected). It adds `lenis.raf(time * 1000)` to `gsap.ticker`, calls `gsap.ticker.lagSmoothing(0)`, and calls `ScrollTrigger.update` on Lenis's `scroll` event (expected). Under Reduced_Motion it creates nothing, and it reacts to a change of the media query.
- `smooth-scroll.ts` gives `getLenis(): Lenis | null`, `scrollToY(y, { duration })` (through Lenis when present, else native), `pauseSmoothScroll()` and `resumeSmoothScroll()`.
- Inner_Scrollers carry `data-lenis-prevent` (expected attribute), so they scroll natively.
- **Play the story** (`use-story-player.ts`): the build checks with Context7 whether playing should scroll through Lenis (`lenis.scrollTo` with a linear easing and a duration of `distance / pxPerSecond()`) or stop Lenis and keep today's `gsap.to(window, { scrollTo })`. Either way, any wheel, touch, key or scrollbar input still pauses it.
- **The desk:** Lenis stops while the desktop desk is mounted, because that page never scrolls. It starts again on leaving.

### Story

#### `StoryOpening.tsx` (new; replaces `StoryStart.tsx`)

- Full screen (`100svh`): the first chapter's image with the `scene` camera push (scale 1.0 → about 1.06, transform only) and a dark gradient over the bottom.
- The title is written by the existing `Quill` and `createQuillWriter` (Grenze Gotisch, large). The years are typed in Special Elite (TextPlugin, `ink.in` timing). Then the UNSOLVED stamp lands (`stampHit`). The teaser follows (`ink.in`; Old Standard TT), then a quiet scroll cue.
- The title, years and stamp come from the case data that `Case.tsx` passes today as `titleCard` (title, `formatCaseYears`, `unsolved`). The teaser is `caseData.teaser`.
- Docking: `dockTitle(titleEl)` moves out of `LegendIntro.tsx` into `src/features/story/dock-title.ts`. It is called once, when the opening scene has scrolled about 15% out of view, and the title stays docked, as now. The case header stays hidden until then (Q1).
- `LegendIntro` loses its title card (`titleCard` prop, `TITLE` and `TITLE_REDUCED` timings, and their markup). Its myth, stamp, debunk and scroll cue stay.
- Reduced motion: no camera; the title, years, stamp and teaser fade in, and the title docks without moving.

#### `PlayCard.tsx` (new)

- A fixed card at the bottom centre, outside the stage, so it never takes layout space. It is not a dialog and not modal, and scrolling keeps working.
- Shown after the first scroll past the opening scene: a ScrollTrigger on the opening scene's bottom edge, `onLeave` forward, the first time only. It enters with `paper.lift` (rise and fade).
- "Play the story" calls `player.play()`, "Read at my pace" calls the existing glide to the first scene, and either one sends the card away with `ink.out`. A ref in `Story` remembers that it was chosen, for this visit: it is reset when the page loads, not stored.
- The hint "Scroll, or press play." sits on the card. Under Reduced_Motion there is nothing to play: the card is not shown, and the opening scene's cue reads "Scroll to read." (today's reduced wording).
- `PlayControl` (the floating play/pause) is unchanged.

#### `lib/story-column.ts` (new, pure)

```ts
export const COLUMN = {
  wordsPerMinute: 240,
  /** A generous minimum per sentence, in timeline seconds. */
  minSeconds: 3.2,
  /** Lines shown at once. */
  visibleLines: 3.5,
  /** Scrub smoothing, in seconds (ScrollTrigger `scrub`). */
  scrub: 1.2,
} as const;

/** Seconds of the scrubbed timeline that each sentence gets. */
export function sentenceSeconds(sentence: string): number; // max(minSeconds, words / wpm * 60)
export function columnPlan(sentences: string[]): { start: number; seconds: number }[];
```

- One second of the timeline is `pxPerSecond()` pixels of scroll (today's rule), so the scroll distance is proportional to reading time.
- `splitIntoBeats` in `story-beats.ts` stays as the sentence splitter. `beatSeconds` is replaced by `sentenceSeconds`.

#### `StoryScene.tsx` and the stage timeline (`Story.tsx`)

- `data-story="column"`: an absolutely placed box in the lower part of the scene, over the existing bottom gradient. Its height is `visibleLines` lines plus the mask height. The mask is a static `mask-image: linear-gradient(to bottom, transparent, black 30%)` on the box. The inner list (`data-story="sentences"`) is moved with `y`. About 32 characters a line on phones, as today.
- Per sentence, at its `start` in the scene's part of the timeline: the list moves up by that sentence's height (`scene` ease, linear inside the scrub), and the sentence goes from `opacity 0, y +10` to `1, 0` (`ink.in`). A sentence that has moved above the Visible_Band is faded by the mask, not by a tween, so it never blinks.
- Portal_Names inside the column stay tappable and out of the Tab order, as the beats were. The full text panel (`data-story="text"`) and its screen-reader role stay as they are.
- Roll call, hook, stillness, camera, chart, day into night and sound events keep their timeline places. The column sits after the roll call in chapter 1, and it fades out (`ink.out`) before the hook takes the screen.
- The stage's ScrollTrigger gets `scrub: COLUMN.scrub`. Heading tweens are removed from the scrubbed timeline (below).
- Images: `<img srcset sizes>` with the sized WebP versions. `will-change: transform` is added when a scene becomes active and removed when it leaves, instead of a permanent class.

#### Headings on a timer

- When a scene becomes active going forward (`chapter-enter`, `direction: 'forward'`), a separate tween writes its kicker and heading with `createQuillWriter`, about 2.2s in total, whatever the scroll speed.
- When the reader scrolls back above the scene (`direction: 'backward'` into the scene before), the heading fades out with `ink.out`. It is written again the next time the scene is entered.
- The heading tween lives in the same `gsap.matchMedia` context, so it is cleaned up with the timeline.

#### Portal fix

- On every change of active scene (the code that already emits `chapter-enter`), set `data-active="true"` on the active scene and `false` on the others. CSS: `[data-story="chapter"][data-active="false"] { pointer-events: none }`. The hook and column of the active scene stay clickable.
- `PortalProvider onOpen={player.pause}` is already wired. A test checks that a click on a column Portal_Name opens the card and calls `pause`.

### Desk (Desktop)

#### `DeskScreen` layout (`Desk.tsx`)

- `main` is `h-svh` with `overflow: hidden`, a CSS grid: `grid-rows-[auto_minmax(0,55fr)_minmax(0,45fr)]`. The page itself does not scroll: Lenis is stopped, and `overflow: hidden` is set on `html` while the desk is mounted on Desktop, then removed.
- **Header row** (compact): "The case files", the progress line, the hint line (`DeskHints`), and the wax seal when it is shown. The ? guide button stays in its corner.
- **Board row:** the five `TheoryNote`s with their `HangingTab`s and `Threads`. Tabs under a note compress (their overlap grows) to fit the row's height. The amount comes from measuring the note column once per layout change, written as a CSS variable, never through React state.
- **Floor row:** `Floor` on the left, `SetAsideTray` on the right (tabs compress the same way).
- At heights where the notes cannot fit at full size, the note text uses `clamp()` sizes tied to `svh`. The final check runs at 1440×900, and at 1366×768 with DOM measurements only.

#### `src/lib/floor.ts` (new, pure)

```ts
export interface FloorSize { width: number; height: number }
export interface FolderBox { width: number; height: number; label: { x: number; y: number; width: number; height: number } }
export interface FloorPlace { id: string; x: number; y: number; rotate: number; z: number }
export interface FloorLayout { places: FloorPlace[]; scale: number }

export function floorLayout(ids: string[], floor: FloorSize, folder: FolderBox): FloorLayout;
```

- **Grid with jitter.** Pick the column and row count that best fits `ids.length` into the floor's aspect. Each folder goes to its cell in case order, with jitter and a tilt from `hashUnit(id, 'fx' | 'fy' | 'rot')`. The tilt is within ±8°.
- **Z order** is reading order: later rows lie over earlier ones, and within a row, later folders lie over earlier ones. The label sits at the folder's top left, so a folder can only be covered by one later in the reading order.
- **No label covered.** For each folder, the rotated label rectangle must not intersect any later folder's rotated rectangle (separating-axis test, in `floor.ts`). If it does, that folder's jitter is halved, up to three times, then set to zero. If the grid itself is too tight, the whole layout is tried again at a smaller `scale` (steps of 0.05, down to 0.7).
- **Inside the floor.** Every rotated folder rectangle lies inside the floor, which also bounds the jitter.
- Deterministic: the same inputs always give the same output. There is no randomness.
- `Floor.tsx` measures the floor (a `ResizeObserver`), calls `floorLayout` and writes the positions with `gsap.set` (`x`, `y`, `rotation`, `zIndex`). It moves folders with Flip (`layout`) when the floor size or the set of floor files changes.
- Hover (fine pointer, behind the hover media query): scale 1.04 and `zIndex` raised to the top, with `hover`. The deeper shadow is a pseudo-element whose opacity changes. On pointer out the folder goes back down.
- Opened-but-unpinned files lie on the floor with their stamp, as `Folder` shows it today (D1 of the desk spec).
- Dropped positions (Q7): `droppedAt: Map<id, { x, y, rotate }>` in a ref in `DeskScreen`, overriding `floorLayout` for that id for the visit.

#### Opening a file (`OpenFile.tsx`, `Floor.tsx`)

- **The click bug.** The floor folders are plain links, with no Draggable. Dragging is attached through `useDeskDrag` (below) with a movement threshold, so a click is always a click. A click records the Flip state (as `Desk.handleClickCapture` does today) and navigates, and `OpenFile` plays the full flight. A test checks that one click navigates and records exactly one `in` flight.
- **Flight:** `Flip.from` from the floor state, `paper.move`. The floor tilt goes to 0° during the flight (Flip interpolates `rotation`, expected), with a `paper.lift` scale bump at the start. Then the cover opens.
- **Straight and whole:** the cover opens to `rotateY(-180deg)` and lies flat, so nothing looks tilted. The folder frame is centred, `max-h-[86svh]`. Its two halves (inner cover, document) take the frame's full height.
- **Inner_Scroller:** the document's sheet area is `overflow-y: auto`, `overscroll-behavior: contain`, `scrollbar-width: thin`, with `data-lenis-prevent`. The folder and the page do not move.
- **Closing:** Escape, a click on the backdrop outside the folder, or "Back to the board". The cover closes (reverse flip). Then `Flip.from` flies the folder to its place on the floor (`droppedAt` or `floorLayout`) or to its tab under its note, with `paper.move`, and lands with `paper.land`.

#### The writing reveal (`OpenFile.tsx`, `FileDocument.tsx`, `src/components/Nib.tsx`)

- `Nib.tsx`: a small SVG dip-pen nib, about 24px, `aria-hidden`. It follows the letters the way `Quill` does, through `createQuillWriter` with a `nib` option, at about 1.2s for the title.
- The timeline, first opening only (`!openedBefore`): (1) the Nib writes the title; (2) `SplitText` splits the document's paragraphs into lines, and the lines settle with `ink.in` plus `filter: blur(2px) → blur(0)`, with a stagger of `STEP.fast / 2` or so, quicker than the title; the split is reverted at the end; (3) `stampHit` on the stamp, then the existing status treatment (record seal, disputed second sheet and margin, legend paper and drift with `ghost`).
- **Skip:** a `pointerdown` on the document, or a `keydown` other than Escape, calls `timeline.progress(1)`. That jumps straight to the end state, including the stamp and the status treatment.
- Files already read: `openedBefore` shows the end state at once, as today. The flight still plays (Requirement 14.1).
- Reduced motion: the title, the text and the stamp appear with an opacity fade (`hover` duration): no Nib, no blur, no rise.

#### Pin menu (`PinMenu.tsx`)

- On Desktop, a popover: the button sits in a `relative` wrapper, and the menu is `position: absolute` with a z-index above the paper, anchored to the button. It opens downward, or upward if there is no room below inside the folder frame (measured on open). It takes no layout space.
- Open: transform-origin at the button, `scale 0.96 → 1` and opacity with `hover`; the menu's size change uses `layout`; the items stagger in. Close: `ink.out`, quicker.
- Items: every theory, "None of them" (target `"none"`, as in the report), then "Back to the floor" when the file is pinned or set aside (calls `unpin`). Keyboard behaviour as today: arrows, Home/End, Enter/Space, Escape back to the button.
- Below 1024px the phone desk keeps today's inline menu and labels, unchanged (Requirement 20.4, Q5).

#### Drag: `src/features/board/drag.ts` and `useDeskDrag`

```ts
export type DragSource = { from: 'floor'; sealed: boolean } | { from: 'board'; theoryId: string } | { from: 'tray' } | { from: 'open-file' };
export type DropTarget = { kind: 'theory'; theoryId: string } | { kind: 'board' } | { kind: 'tray' } | { kind: 'floor'; x: number; y: number } | { kind: 'nothing' };
export type DropOutcome =
  | { kind: 'reveal-then-pin'; target: PinTarget }   // a sealed floor file on a theory, or on the tray (Q6)
  | { kind: 'pin'; target: PinTarget }               // re-pin, set aside, an opened floor file on a theory (Q6), the open file
  | { kind: 'open' }                                 // a floor file on the board outside any note
  | { kind: 'unpin'; x: number; y: number }          // a board or tray file onto the floor
  | { kind: 'settle'; x: number; y: number }         // a floor file onto the floor
  | { kind: 'return' };                              // onto its own place, or onto nothing

export function dropOutcome(source: DragSource, target: DropTarget): DropOutcome;
```

- `useDeskDrag` creates the Draggables (fine pointer, Desktop, full motion only, as today). Floor folders and the tabs on the Board and in the tray use a movement threshold, so clicks stay clicks. While dragging it hit-tests the `[data-drop-target]` elements (the notes, `board`, `none` for the tray, `floor`) and marks the hot one.
- **Over a note:** the dragged element scales to 0.55 and fades to 0.85 (`hover`), and the note lights (`data-drop-hot`). It returns to full size off the note.
- **Reveal then pin:** navigate to the file with `state: { pinAfterReveal: target }`. `OpenFile` plays the full open and the Writing_Reveal. When the stamp has landed (or the reveal is skipped) it runs the existing pin flow: reverse flip, `PIN_EVIDENCE`, back to `/files`, flight to the note or the tray, slip opens. If the user presses Escape during it, the pin still applies, because the drop was the choice.
- **Threads:** `Threads` keeps the previous endpoints. On a pin change, the threads whose ends moved fade out with `ink.out`, the tabs move with Flip (`layout`), then the new paths draw in with `stroke-dashoffset` (`layout`).
- The open file's own drag (grab by the manila edge, desk spec D9) stays and goes through `dropOutcome` with `from: 'open-file'`.

#### Unpin (`InvestigationProvider.tsx`)

- Q4: `export type CaseAction = InvestigationAction | { type: 'UNPIN_EVIDENCE'; evidenceId: string }`. The reducer and the context's `dispatch` take `CaseAction`; `src/types/case.ts` is unchanged.
- `UNPIN_EVIDENCE`: if `pins` has no entry for the id, the same state object comes back. Otherwise a new state without that entry; `opened` and `verdict` are unchanged.
- Storage needs no change: a missing entry already means "not pinned".
- The desk's `pin(target)` and `unpin()` helpers call `dispatch`. `pin` emits the existing `pin` event, as now. The brief names no unpin event, so `unpin` emits none, and the event union in `story-events.ts` is unchanged.

#### The phone gate (`src/app/PhoneGate.tsx`, `src/lib/phone-gate.ts`)

- `CaseInvestigation` renders `PhoneGate` in place of its `<Outlet />` when `!useMediaQuery(DESKTOP_QUERY)` and the session flag is not set. This covers every investigation URL (Q8). The fork's link goes to `/files`, so it reaches the gate.
- One screen on the night desk surface: "This case is too big for a small screen." (Grenze Gotisch) and "Open Histor on a laptop to investigate." (Special Elite), with a "Continue anyway" button styled as a link under them. Its entrance uses `ink.in`.
- `phone-gate.ts`: `hasContinuedOnPhone()` and `markContinuedOnPhone()` using `sessionStorage` key `histor:phone-gate`, both in try/catch. If storage fails, a module-level flag keeps it for the page load.
- After "Continue anyway", today's phone desk shows.

### Steering and docs

- `.kiro/steering/motion.md`: a new first section with the Motion_Token table, the steps, the audit rule, "no instant visual changes", the performance rules and Lenis. Its old frequency table and ease list are replaced, so the file has one source of truth. `.kiro/steering/tech.md` rule 5 is brought in line with Requirement 3.
- At the end: `design.md` (steering; the story and desk sections), `product.md` (the actions that write to the investigation, now including returning a file to the floor), and `docs/content/mary-celeste-scenes.md` (the opening scene, the play card, the text column, headings on a timer) are updated to match what was built.

## Data Models

| Thing | Where it lives | Stored? |
| --- | --- | --- |
| Pins, opened, verdict | `InvestigationState` (unchanged shape) | localStorage, as now |
| Unpinned | no entry in `pins` | as now |
| Floor positions | `floorLayout(ids, floor, folder)` | no, derived |
| Dropped floor positions | ref `Map` in `DeskScreen` | no, for the visit (Q7) |
| Play card chosen | ref in `Story` | no, for the visit |
| Phone gate continued | `sessionStorage` `histor:phone-gate` | for the session |
| Motion tokens | `MOTION`, `STEP` in `motion.ts` | n/a |
| Column timing | `COLUMN`, `columnPlan` in `story-column.ts` | n/a |

## Correctness Properties

The property tests use fast-check 4.10.2, one `test` per property, each tagged `// Feature: fix-pack, Property N: ...`.

### Property 1: Every floor folder lies inside the floor

For any list of up to 30 unique ids and any floor from 800×300 to 2000×600, every folder's rotated rectangle, at the returned `scale`, lies inside the floor.

**Validates: Requirements 13.3, 13.4**

### Property 2: The floor layout is deterministic

For any inputs, two calls to `floorLayout` return `toStrictEqual` results, and the inputs are unchanged.

**Validates: Requirements 13.3, 13.4**

### Property 3: No folder label is covered

For any inputs, no folder's rotated label rectangle intersects the rotated rectangle of any folder above it in the z order.

**Validates: Requirements 13.2, 13.4**

### Property 4: Floor tilts stay within eight degrees

For any inputs, every `rotate` is between −8 and 8, and every id appears exactly once in `places`.

**Validates: Requirements 13.2, 13.3**

### Property 5: Sentences get their reading time

For any sentence, `sentenceSeconds` equals `max(COLUMN.minSeconds, words / 240 × 60)`. For any list of sentences, `columnPlan` starts each sentence where the one before ends, with no gap or overlap, in order.

**Validates: Requirements 8.5**

### Property 6: Unpin removes only the pin

For any case, any state and any evidence id, `UNPIN_EVIDENCE` leaves `opened` and `verdict` unchanged. It removes exactly that id from `pins` when present, and returns the same state object when the id has no pin. A pin followed by an unpin of the same file gives back the original `pins`.

**Validates: Requirements 18.2, 18.3**

### Property 7: Every drop has exactly one outcome

For any drag source and Drop_Target, `dropOutcome` returns one outcome; a pin outcome's target is the dropped-on theory or `"none"`; a drop on the source's own place is `return`.

**Validates: Requirements 17.2, 17.3, 17.4, 17.5, 17.6**

## Error Handling

- **Lenis unavailable or failing to start:** the page scrolls natively and ScrollTrigger works as today.
- **The floor is too small** for 23 folders at full size: `floorLayout` lowers `scale` down to 0.7. Below that, it returns the 0.7 layout with jitter at zero. The label rule still holds, because the grid spacing is set from the label size.
- **The route changes mid-reveal or mid-flight:** every tween lives in a `gsap.matchMedia` or `useGSAP` context and is reverted on unmount. A pending `pinAfterReveal` is dropped if the file closes before the open completes (the dispatch happens only from the reveal's end).
- **Storage unavailable:** the investigation behaves as today. The phone gate flag falls back to memory for the page load.
- **No matchMedia (jsdom):** no Lenis, no Draggable, no camera. Components render their end states, as today.
- **A drop on an unknown target:** `dropOutcome` returns `return`, and the folder flies back.

## Testing Strategy

- **Unit and property tests (Vitest 5.1.0, fast-check 4.10.2):** `motion.ts` (every token present, durations positive, `ink.out` quicker than `ink.in`, `ghostDuration` within 2–4s and deterministic); the motion audit; `story-column.ts` (Property 5); `floor.ts` (Properties 1–4); `dropOutcome` (Property 7 and the named cases); the reducer (Property 6 and the named cases); `phone-gate.ts` (round trip; storage throwing).
- **Component and route tests (jsdom):** the opening scene's content from the case data and its docking call; the Play_Card showing after the first scroll past the opening and leaving after a choice; column sentences in order, with the full text still in the DOM; the heading tween started on `chapter-enter` and not in the scrubbed timeline; a Portal_Name click opening its card and pausing the player; inactive scenes having `pointer-events: none`; the desk's desktop grid and `overflow: hidden`; floor folders from `floorLayout`; one click opening a file; the document carrying `data-lenis-prevent`; the reveal skip on click and on a key, and Escape closing instead; an already-read file opening revealed; the Pin menu as an absolutely positioned popover with "None of them" and "Back to the floor"; unpin from the menu putting the file back on the floor; drag handlers called directly for each outcome; the phone gate at a narrow width and after "Continue anyway"; reduced motion (no Lenis, no Draggable, end states shown).
- **Existing tests** that no longer match a changed structure are updated in the task that changes it, and listed in that task's report with before and after. Many investigation tests render with no matching media, which the phone gate treats as a phone. Task 16 makes them set the gate's session flag or stub a desktop.
- **The final browser check (one run, Requirement 21):** headless Chrome against `npm run preview`, with the profile flags of Requirement 21.4. Headless Chrome reports no pointer, so the desktop run also passes `--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4` to act as a mouse (learned in the desk spec's final check; it adds no download). It is driven over the DevTools protocol with a small Node script in `/tmp`, so nothing is installed. DOM measurements come first: scroll height against the viewport, rectangles, `elementFromPoint`, computed transforms, saved state and console events. A second desktop pass at 1366×768 uses DOM measurements only, with no screenshots: the desk's scroll height against the viewport, that the Board and the Floor are fully in view, and that no folder label is covered. The screenshots, at most 6: the opening scene, the text column, the desk at 1440×900, a file mid-reveal, a long document scrolled inside the paper, and the phone gate at 375×667.

## Decisions
The open questions Q1–Q9 are listed, with their answers, at the end of `requirements.md`. All nine are answered. Where an answer differs from the first assumption, this design follows the answer:
- **Q1:** the legend intro first, then the opening scene, then the play card as chapter 1 begins.
- **Q3 (performance):** the stamps' `clip-path`, the quill's letter blur and the hold-to-close fill stay. Hover `filter` and `box-shadow` become a shadow layer whose `opacity` changes. The legend paper's `filter` is converted only if it animates. The lamp is unchanged.
- **Q5 (wording):** "None of them" stays on the Pin menu option and the tray label. The hint and the ? guide say "floor" on Desktop.

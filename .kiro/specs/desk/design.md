# Design Document: desk

## Overview

The desk replaces the look of the investigation screens (`/files`, `/files/:evidenceId`, `/verdict`, `/report`) with a night desk under one lamp. The data flow does not change: every screen still reads `useInvestigation()` and dispatches the same four actions, and the report and the historians' reading still come from `buildCaseReport`. What changes is the components under `src/features/board/` and `src/features/verdict/`, a few new pure helpers in `src/lib/`, and the CSS effects in `src/styles/effects.css`.

GSAP APIs were checked with Context7 against the installed `gsap` 3.15.1: `Flip.getState` / `Flip.from` (with `absolute` and `scale`), `Draggable.create` with `onDrag` / `onRelease` and `this.hitTest(target, threshold)`, and `gsap.quickSetter(target, '--var', 'px')`. `Draggable.js`, `Flip.js` and `InertiaPlugin.js` ship in the package. Each task that writes GSAP code checks the API again with Context7.

### Key decisions

1. **The desk stays mounted while a file is open.** The file route becomes a child of the desk route: `<Route path="/case/:id/files" element={<Desk />}><Route path=":evidenceId" element={<OpenFile />} /></Route>`. The URLs do not change (D0). Because the Pile stays in the DOM, Flip can fly a Folder from its place in the Pile to the centre, and back to the Board when pinned. A deep link to a file shows the desk with that file open over it.
2. **One layout state, derived, not stored.** Where every Folder sits (Pile, Board under a theory, Set_Aside_Tray) is computed from `state.opened` and `state.pins` by a pure function, `deskLayout`. Nothing about placement is kept in React state or storage, so it always matches the saved investigation.
3. **Every Folder has one stable `data-flip-id`.** Moving a Folder between places is a React re-render that moves the element with that id; `Flip.getState` before and `Flip.from` after animate the move. Without motion (reduced motion, jsdom), the re-render alone is correct.
4. **Deterministic scatter from a hash.** Rotations and offsets come from a small string hash of the id (`hashUnit(id)` in `src/lib/desk.ts`), so the pile looks the same on every render and every device, with no randomness.
5. **The lamp never touches React.** One fixed overlay; a pointer listener stores the target position; a `gsap.ticker` callback eases toward it and writes `--lamp-x` and `--lamp-y` with `gsap.quickSetter`. The overlay's `mask-image` reads those variables.
6. **Drag is an enhancement.** The Pin_Menu is always rendered and always works. Draggable is attached only on Desktop with a fine pointer and without reduced motion. Both paths call the same `pin(target)` function.
7. **The historians' reading has one source.** The Historians_Slip reads `buildCaseReport(caseData, state).pins`, as `OpenedFile` does today. No new reading logic.

## Architecture

```mermaid
flowchart TB
  CI[CaseInvestigation layout<br/>InvestigationProvider · CaseHeader · PortalProvider] --> D[Desk /files]
  D --> L[Lamp overlay]
  D --> B[Board: TheoryNote ×5 · HangingTab · Threads]
  D --> P[Pile: Folder ×n]
  D --> T[SetAsideTray]
  D --> W[WaxSeal · progress line · ? guide · hints]
  D --> O[Outlet → OpenFile /files/:evidenceId]
  O --> IC[InnerCover: label · source index card]
  O --> DOC[Document: Record / Disputed / Legend sheet]
  O --> PM[PinMenu · drag handle]
  CI --> V[Verdict /verdict]
  CI --> R[Report /report]
  DL[lib/desk.ts: deskLayout · scatter · hashUnit] --> D
  CR[lib/case-report.ts: buildCaseReport] --> O
  CR --> R
  EV[lib/story-events.ts] <-- emit --- D
  EV <-- emit --- O
```

## Components and Interfaces

### `src/lib/desk.ts` (new, pure)

```ts
/** A number in [0, 1) from a string, the same on every device. FNV-1a, 32-bit. */
export function hashUnit(id: string, salt?: string): number;

/** A slight, deterministic tilt and offset for a folder or note. Degrees and pixels. */
export function scatter(id: string, maxDegrees: number, maxOffset: number): { rotate: number; x: number; y: number };

export type FolderPlace =
  | { kind: 'pile'; opened: boolean }           // Sealed, or opened but not yet pinned: on top, stamped (D1)
  | { kind: 'board'; theoryId: string }
  | { kind: 'aside' };

export interface DeskLayout {
  /** In case order. Each with its number "01".."23". */
  folders: { evidence: Evidence; number: string; place: FolderPlace }[];
  /** Per theory id, the pinned folders in case order. */
  byTheory: Map<string, Evidence[]>;
  aside: Evidence[];
  pile: Evidence[];
  openedCount: number;
  canClose: boolean;
}

export function deskLayout(caseData: Case, state: InvestigationState): DeskLayout;

/** The first full sentence of a text, never cut mid-sentence (D6). */
export function firstSentence(text: string): string;
```

Rules: a file goes to the Board only if it is opened **and** pinned to a known theory; to the aside tray only if opened and pinned to `"none"`; otherwise to the Pile (Requirement 4.6). Unknown ids in the state are ignored, as in `buildCaseReport`.

### Routes (`src/App.tsx`)

```tsx
<Route element={<CaseInvestigation />}>
  <Route path="/case/:id/files" element={<Desk />}>
    <Route path=":evidenceId" element={<OpenFile />} />
  </Route>
  <Route path="/case/:id/verdict" element={<Verdict />} />
  <Route path="/case/:id/report" element={<Report />} />
</Route>
```

`OpenFile` keeps today's "File not found" for an unknown id. `Verdict` and `Report` keep their redirects.

### The desk (`src/features/board/Desk.tsx`)

Replaces `Board.tsx`. Layout:

| Area | Desktop (≥1024px) | Phone (<640px) |
| --- | --- | --- |
| Board | top band, 5 notes in a row, Hanging_Tabs below each | the compact sticky row from the last fix |
| Pile | lower left, arc fan on hover | a horizontal swipe strip (scroll-snap), centred folder lifts |
| Set_Aside_Tray | lower right | below the strip |
| Progress line | beside the Pile | above the strip |
| Wax_Seal | beside the progress line, at the threshold | same |
| **?** guide button | top-right corner below the header | same |

Tablet widths (640–1023px) use the phone layout with a wider strip.

**Surface (2.1):** `bg-night` with layered `repeating-linear-gradient`s for grain lines, an inline SVG `feTurbulence` filter for noise, the existing body grain, and a radial vignette. All colours are tokens.

### The lamp (`src/features/board/Lamp.tsx`)

- A `fixed inset-0 pointer-events-none` div filled with near-black at the opacity that brings the surroundings to about 25% brightness, with `mask-image: radial-gradient(circle var(--lamp-r) at var(--lamp-x) var(--lamp-y), transparent 0, transparent 35%, black 100%)`. A second layer below it adds the brass tint inside the pool.
- **Desktop:** `pointermove` stores the target point; a `gsap.ticker.add` callback eases the current point toward it (factor 0.18) and calls the two quickSetters. `--lamp-r` is 420px.
- **Phone:** the target is the centre of the element that holds focus or was last tapped (`pointerdown`, `focusin`); the radius is about 260px.
- **Reduced motion:** no listeners and no ticker; the variables are fixed at the centre with a wider, softer radius.
- **Contrast (2.7):** text sits on paper (notes, folders, the open file) or on the progress line. The open file, the Pin_Menu, the guide and the hints are always lit: the lamp centres on the open file while one is shown, and the overlay sits below those layers (`z-index`). The progress line and the Wax_Seal label sit inside a small lit area of their own, so they meet 4.5:1 even when the lamp is elsewhere.

### The board (`TheoryNote.tsx`, `HangingTab.tsx`, `Threads.tsx`)

- `TheoryNote`: paper note, brass pin, `rotate` from `scatter(theory.id, 2.5, 0)`, title (Grenze Gotisch) and claim (Old Standard TT). Each note is a drop target (`data-drop-target={theory.id}`) and is keyboard-focusable as a group label (Requirement 11.4). Never a standing.
- Phone: today's compact `TheoryCard` behaviour is kept; tapping a theory shows its claim and its pinned files (D3).
- `HangingTab`: a small folder tab with number and title, overlapping its neighbours (negative margin), a link to its file. The tab of the folder just pinned carries the open Historians_Slip until the next action (any pointer or key input on the desk); tapping a pinned tab shows its slip again (D2). Which slip is open is UI state (`openSlip: evidenceId | null`) in the Desk.
- `Threads`: as today (an SVG behind the paper, reading positions from the DOM), but each path has a slight sag from note pin to tab pin, and brass pin heads at both ends. The thread to a just-pinned tab draws in with `stroke-dashoffset`.

### The pile (`Pile.tsx`, `Folder.tsx`)

- Each sealed `Folder` is a manila card with a tab (number, typed title), `scatter(evidence.id, 4, 6)` for its resting tilt and offset, stacked with a negative top margin. No status, no stamp, no pin label while sealed (4.3).
- **Desktop fan:** on `pointerenter` of the Pile, GSAP tweens each folder's `rotate` and `x` / `y` to its place on an arc (angle spread across the folder count, radius from the Pile's width); on `pointerleave` it tweens back. The folder under the pointer lifts (`y: -14`, shadow via a filter `drop-shadow`). Emits `pile-hover` once per enter.
- **Phone strip:** a horizontal `overflow-x-auto snap-x` row; an `IntersectionObserver` with a centre root margin marks the centred folder, which lifts. No arc.
- Every Folder is a link (`<Link to=":evidenceId">`), so Tab and Enter open it (11.4). On Desktop, a Draggable on the pile folders lets the user drag one out; releasing it more than 60px outside the Pile opens it (5.1).

### Opening a file (`OpenFile.tsx`, `InnerCover.tsx`, `FileDocument.tsx`)

Sequence on open (full motion):

1. `Flip.getState('[data-flip-id="file-<id>"]')` is captured by the Desk when the folder is activated (click handler or drag release), and kept in a ref.
2. Navigation renders `OpenFile` in the Outlet; it renders the same `data-flip-id` element, centred, closed. `Flip.from(state, { absolute: true, scale: true, duration: 0.5, ease: EASE.drawer })` flies it from the Pile. A deep link has no stored state: the folder fades and scales in from 0.95.
3. The cover (`transform-origin: left center`, parent `perspective: 1600px`, `backface-visibility: hidden` on both faces) rotates `rotateY 0 → -165deg` over 0.6s. Emits `flip`.
4. `OPEN_EVIDENCE` is dispatched when the cover opens (5.7). Emits `folder-open`.
5. The document shows as plain paper; after 0.6s the stamp presses in (motion.md stamp rule: `scale 1.15 → 1`, clip-path reveal) and the status treatment plays (Requirement 6). Emits `stamp`.
6. The question "Which theory does this point to?" and the Pin_Menu sit below the document, on the folder's manila back. The file stays open, so the user can read it, until the user pins it (7.1, D9). On Desktop the manila edge around the document is the drag handle (7.2).

A file that was opened before skips steps 2–5: it opens straight to its stamped state, open, with its choice and slip shown (7.8).

**Inner cover (5.3):** typed label `HISTOR · CASE FILE {number} · {TITLE IN CAPITALS}`, built from the case data (`fileNumber`, `evidence.title`); an index card listing `evidence.sources` by title, as links where there is a URL.

**Document (5.4, 6):** paper sheet with a paper clip (SVG); detail paragraphs through `PortalText`.

| Status | Treatment | Implementation |
| --- | --- | --- |
| Record | crisp paper, typed heading, embossed `record` seal presses in beside the stamp | seal: SVG ring + text, `scale 1.1 → 1` and `filter: drop-shadow` inset look |
| Disputed | second sheet slides in askew; "The claim" / "The challenge"; the claim line underlined wavy in `rust` with a hand-drawn "?" in the margin; a margin note; smudged stamp | sheet 2: `x/rotate` tween; the claim line gets a wavy `rust` underline (`text-decoration: wavy underline`, revealed with `clip-path: inset(0 100% 0 0) → inset(0)`) and a hand-drawn "?" (an SVG path, stroke revealed by `stroke-dashoffset`) in the margin; it is never struck through (D7); the margin note is the first full sentence of `dispute.challenge` (D6); stamp uses `.stamp-smudged` |
| Legend | paper yellows and turns faintly see-through; ink drifts in slow waves; "Where this came from" slip slides out with the origin | yellow: a `filter: sepia() saturate()` tween on the sheet plus `opacity: 0.88` so the desk shows through; ink drift: SplitText into words, a looping stagger on each word's `opacity` between 1 and 0.72 (opacity only); at rest every word returns to 1 and colour is `ghost-ink` (6.5); the slip: `y` tween from under the sheet |

**Escape and links (5.8, D4):** Escape and "Back to the board" navigate to `/files`; the folder flies back to its place (Pile, Board or tray) with Flip. "Next file" goes to the next unopened file. Focus is trapped in the open file while it is shown, and returns to the folder on close (tech.md rule 9).

**Disputed margin note (D6):** the first full sentence of `evidence.dispute.challenge`, from `firstSentence()` in `src/lib/desk.ts`, which reuses the beat splitter (`splitIntoBeats`) so a sentence is never cut in the middle; a challenge of one sentence is shown whole.

### Pinning (`PinMenu.tsx`, drag in `OpenFile.tsx`)

- `pin(target)`, from the Pin_Menu: on Desktop with full motion, the cover closes first (reverse flip, `rotateY -165deg → 0`, 0.35s, emits `flip` with `direction: 'close'`), so the folder is In_Hand; then it records the folder's Flip state, dispatches `PIN_EVIDENCE`, emits `pin`, and navigates to `/files`. The desk re-renders the folder in its new place (`deskLayout`), and `Flip.from` flies it there; the thread to it draws in; its Historians_Slip opens (7.1, 7.3, 7.6). On a Phone, or with reduced motion, there is no reverse flip: the same dispatch and navigation, and the folder simply appears in its place.
- **Pin_Menu (7.5, 11.4):** a "Pin to…" button with `aria-haspopup="menu"`, below the document; the menu is a `role="menu"` list of six `role="menuitemradio"` items (the current pin checked). Arrow keys move, Home/End jump, Enter or Space chooses, Escape closes the menu and returns focus to the button. Always rendered, every screen size.
- **Drag (7.2–7.4, D9):** on Desktop with a fine pointer and full motion, `Draggable.create(folder, { type: 'x,y', trigger: '[data-file="grip"]', onPress, onDrag, onRelease })`. The trigger is the manila edge around the document (the folder's back), so the paper's text can still be selected and its links used. As the drag starts the cover closes in the hand (the reverse flip) and the folder shrinks to a held size (`scale 0.42`), and the backdrop fades so the desk shows. `onDrag` tests every `[data-drop-target]` with `this.hitTest(el, '40%')` and sets `data-drop-hot` on the hit one (CSS brightens it). `onRelease` pins to the hot target, or `"none"` on the tray; with no target, the folder tweens back to the centre, opens again, and the backdrop returns.
- **Historians_Slip:** reads `buildCaseReport(caseData, state).pins.find(p => p.evidenceId === id)`; shows the reading label (from `READING_LABEL`) and `note`. On the open file it is clipped to the folder (7.7); on the board it hangs from the latest tab.

### Teaching (`DeskHints.tsx`, `DeskGuide.tsx`, `src/lib/desk-hints.ts`)

- `desk-hints.ts`: `hasSeenDeskHints(caseId)` and `markDeskHintsSeen(caseId)`, key `histor:desk-hints:<caseId>`, each in try/catch (8.2), like `intro-seen.ts`.
- Hint 1 shows next to the Pile when the desk first loads; hint 2 next to the Pin_Menu, below the document, the first time a file's question appears (D9); hint 3 next to the progress line after the first pin.
- Hint 2's wording (D5): "Drag it…" when the device has a fine pointer (`(hover: hover) and (pointer: fine)`) and the last input was the pointer; "Pin it…" on touch, or after the last input was a key press. The last input is tracked with `pointerdown` / `keydown` listeners in `DeskHints`. Each hint is a small typed label with `role="status"`. The hints are marked seen once hint 3 has shown (8.3). If storage fails, they show once per page load.
- `DeskGuide`: the **?** button opens a dialog panel listing the same three steps; focus trapped, Escape closes (8.4).

### Closing the case (`WaxSeal.tsx`, `Verdict.tsx`, `HoldToClose.tsx`, `Report.tsx`)

- `WaxSeal` (9.1): an SVG seal (rust-night wax blob, brass "H" glyph reused from the favicon path), a `<Link>` to `/verdict` labelled "Close the case". Shown only when `deskLayout(...).canClose`. Emits `seal` when activated.
- `Verdict` (9.2): the five `TheoryNote`s on the desk surface under a static lamp; choosing one selects it; `HoldToClose` keeps today's hold logic, and on completion a wax seal presses onto the chosen note (`scale 1.4 → 1`, `opacity 0 → 1`) before `CLOSE_CASE` and the navigation. Emits `seal`. Reduced motion: today's plain confirm button.
- `Report` (9.3, 9.4): today's component and its seven sections, restyled as typed paper on the desk under a static lamp. Logic, order, wording and "Reopen the case" / "Back to all cases" unchanged.

### Events (`src/lib/story-events.ts`)

The union gains:

```ts
| { type: 'pile-hover' }
| { type: 'folder-open'; evidence: string }
| { type: 'flip'; evidence: string; direction: 'open' | 'close' }
| { type: 'stamp'; evidence: string; status: EvidenceStatus }
| { type: 'pin'; evidence: string; target: PinTarget }
| { type: 'seal'; where: 'desk' | 'verdict' }
```

Same `onStoryEvent` / `emitStoryEvent`; no new module (10.1).

### Effects (`src/styles/effects.css`)

New, all static or opacity/transform-only: desk grain and vignette, felt texture for the Board, manila and paper surfaces, the paper clip, the embossed seal, the yellowed legend paper. The existing `.stamp-smudged` and ghost ink stay. The ink drift is driven by GSAP (opacity), not keyframes, so it can stop at rest and under reduced motion.

## Data Models

No new types in `src/types/case.ts`. New module types (`FolderPlace`, `DeskLayout`, the desk events) live in their modules. The only stored value added is the hints flag in localStorage.

| Desk element | Source |
| --- | --- |
| Theory notes | `case.theories` (title, claim) |
| Folders, numbers, titles | `case.evidence` in order, `fileNumber` |
| Inner-cover label | `fileNumber`, `evidence.title` |
| Index card | `evidence.sources` → `case.sources` |
| Document | `evidence.detail` via `PortalText`; `dispute`; `origin` |
| Placement | `deskLayout(case, state)` |
| Historians_Slip | `buildCaseReport(case, state).pins` |
| Progress and Wax_Seal | `state.opened.length`, `case.closeThreshold` |

## Correctness Properties

Property tests in `src/lib/__tests__/desk.property.test.ts`, with generators like the case-report ones:

1. **Every file has exactly one place.** For any case and state, each evidence id appears exactly once across `pile`, `aside` and the `byTheory` lists. *(4.6)*
2. **Places follow the state.** A file is on the Board under theory T if and only if it is opened and pinned to T; in the aside tray if and only if opened and pinned to `"none"`; in the Pile otherwise. *(4.6)*
3. **Sealed files are in the Pile.** No unopened file is on the Board or in the tray. *(4.3, 4.6)*
4. **Scatter is deterministic and bounded.** `scatter(id, d, o)` returns the same value on every call, with `|rotate| ≤ d` and `|x|, |y| ≤ o`. *(3.2, 4.1)*
5. **`deskLayout` never throws** on garbage state, and ignores unknown ids. *(as `buildCaseReport`)*

## Error Handling

- Unknown evidence id at `/files/:evidenceId`: today's "File not found" with a link back.
- `/verdict` below the threshold and `/report` without a verdict: today's redirects.
- localStorage unavailable: hints show once per page load; the investigation itself already copes.
- Flip state missing (deep link, refresh): the file appears with a scale-and-fade instead of a flight.
- Draggable not available (touch, coarse pointer, reduced motion): not created; the Pin_Menu remains.
- jsdom (tests): no layout, so Flip and Draggable are skipped when `matchMedia` is missing or reports reduced motion; the DOM result is the same either way.

## Testing Strategy

Vitest 5.1.0 and fast-check 4.10.2; Context7 checked again in each task that writes tests.

- **Unit, pure:** `src/lib/__tests__/desk.test.ts` for `hashUnit`, `scatter`, `deskLayout` on the Mary Celeste case; `desk-hints` storage with a throwing `localStorage`.
- **Property:** `desk.property.test.ts` (Properties 1–5).
- **Component and route:** `src/features/board/__tests__/Investigation.test.tsx` updated to the new structure (12.1), plus the new tests from 12.2–12.6: the Pile has 23 sealed folders with no status; opening dispatches `OPEN_EVIDENCE` and shows the status after the stamp (fake timers or the reduced-motion path); the Pin_Menu pins, moves the folder under the right note, and "None of them" moves it to the tray; hints show once and not on the next render with the stored flag; reduced motion renders with no flip classes, no Draggable and a static lamp (`--lamp-x` fixed).
- **Keyboard:** Tab reaches every folder and note; Enter opens; the Pin_Menu's arrows and Enter; Escape closes the file.
- **Flaky test (Requirement 1):** replay seed `-1131047925` once in a temporary run to confirm it passes, then run Property 8 many times.
- **Browser (13.2):** Chrome at 375px and 1440px against the preview build: a full investigation to the report by drag, and one by buttons; lamp movement, the fan, the flip, the three reveals, contrast on lit text, no overflow, no console errors.

## Decisions

The review answered every open question; see D0–D9 in `requirements.md`. The design above follows them. D9 was decided at task 10: the file stays open until it is pinned.

---
inclusion: fileMatch
fileMatchPattern: "src/**/*.{tsx,ts,css}"
---
# Motion

Distilled from Emil Kowalski's design-engineering rules, adapted for Histor and GSAP. `src/lib/motion.ts` is the one source of truth for eases and durations.

## 1. Decide whether it should animate

Every animation needs a purpose: feedback, explanation, showing a change of state, or preventing a jarring change. "It looks cool" is only enough for moments users see once. The more often the user sees something, the shorter it is: once per visit can be cinematic, a few times is one clear move, many times is fast, constantly is near-instant or none.

## 2. The motion tokens

Every GSAP tween spreads a token: `gsap.to(el, { ...tween('ink.in'), opacity: 1 })`. **No tween writes its own `ease` or `duration`.** A test (`motion-audit.test.ts`) fails on a literal `ease` or `duration` in a GSAP call outside `motion.ts`. If no named GSAP ease fits, register one once with `CustomEase` in `motion.ts`.

| Token | Ease | Duration | Use |
| --- | --- | --- | --- |
| `ink.in` | `power3.out` | 0.9s, rise 10px | Text and ink arriving: fade in with a small rise |
| `ink.out` | `power2.in` | 0.45s | Anything leaving |
| `paper.lift` | `power2.out` | 0.35s | A paper lifting off the table, a card sliding up |
| `paper.move` | `power3.inOut` | 0.6s | A paper travelling across the screen |
| `paper.land` | `back.out(1.15)` | 0.5s | A paper coming to rest, a small overshoot |
| `stamp.hit` | `expo.in` | 0.16s | The press of a stamp, then a small settle (`stampHit`) |
| `stamp.shake` | `power1.inOut` | 0.14s | A record's stamp landing heavy: the folder's tiny shake (about 2px) |
| `stamp.spread` | `power2.out` | 0.6s | A stamp's ink spreading slightly into the paper as it settles |
| `hover` | `power2.out` | 0.2s | Hover and focus feedback. CSS mirror: `--motion-hover-ease`, `--motion-hover-duration` |
| `layout` | `power2.inOut` | 0.5s | Anything that changes place or size (with Flip) |
| `scene` | `sine.inOut` | 1.2s or more | Camera moves and scene changes |
| `ghost` | `sine.inOut` | 2 to 4s | Ghost ink drifting and flickering: slow and irregular (`ghostDuration(key)`) |
| `story.weighted` | `power4.out` | 0.7s | A weighted part of the central question landing alone after a breath, slightly brighter (no line under it) |
| `story.breath` | `sine.inOut` | 2.4s | Before a hook: the page has dimmed away, the image darkens, the camera creeps closer (1.05); nothing new appears |
| `story.hook` | `back.out(2.2)` | 0.45s per letter | A hook snapping in whole on a timer once reached (not scrubbed): its letters settle from slightly out of line, staggered over `STORY_PACE.hookIn` (about 0.8s) |
| `story.decay` | `power1.in` | 0.35s per letter | A hook leaving: letters go one at a time in a fixed random order |
**The story moves in steps, not on the scroll** (`docs/briefs/story-steps.md`): nothing in it is scrubbed. GSAP **Observer** turns one gesture into one step (`src/features/story/story-steps.ts`), and each step plays its own short timeline; input is ignored while it plays. Every step ends by setting that step's exact state. **The pen** writes each chapter's page on its own timer (`page-writer.ts`, using the quill writer in `src/lib/quill-writing.ts`), every time the page is reached: a click or any gesture finishes it at once. Its words and letters are split by React (`PenText.tsx`, `StoryWords.tsx` for hooks), so portals stay whole; screen readers get the full text once. **Every timing of the story** (writing speed, the gesture gap, each step's animation, the camera drift, and how long "Play the story" holds each step) is in one commented object, `STORY_PACE` in `src/lib/story-pages.ts`.

`QUICK_OUT` (the `ink.out` ease over half a fast step) is the exit for small things: a menu, a slip, a panel. **Duration steps** for everything that is not a token (delays, holds, staggers): `STEP.fast` 0.2s, `STEP.base` 0.45s, `STEP.slow` 0.9s, `STEP.scene` 1.2s.

Linear is only for constant motion and scroll-scrubbed timelines. Never use the browser's built-in `ease-in`. CSS hover and focus transitions use `--motion-hover-ease` and `--motion-hover-duration`.

## 2b. Both ways, every time (review-fixes brief, 3)

Motion gives the UI its life, so it is never a one-off. An entrance plays every time its moment is reached, not only the first time:
- **The story:** stepping back plays each step's entrance too: the page re-written by the pen (`PageWriter.restart`), the crew list written again, the hook snapping in, a line of the question playing in. Going back runs `STORY_PACE.backSpeed` (1.5×) faster than forward. Any gesture, forward or back, finishes the pen at once and stays on the page.
- **The desk:** every opening of a file plays its full reveal (the nib writing the title, the text settling, the stamp's moment, "You almost believed this." for a legend), a file read before as well. A click or a key skips it.

## 3. No instant visual changes

Every visible change of state animates: menus opening, items moving, slips appearing, threads drawing, files returning. Nothing snaps, and nothing pushes something else out of the way without moving smoothly.

- A change of position or size from a layout change uses **Flip** with the `layout` token: the floor's folders when the floor changes, the hanging tabs when a pin changes or a slip opens. A folder flying between the floor, a tab and the open file uses `paper.move`, then `paper.land`.
- Exits are always quicker than entrances.
- Reduced motion keeps the fades and removes the movement. Every animation has a reduced version (`gsap.matchMedia()` or `@media (prefers-reduced-motion: reduce)`).

## 4. Performance rules

- Animate only `transform` and `opacity`. The exceptions are `filter: blur()` on text lines during a file's writing reveal (never on whole images, never during scroll) and `stroke-dashoffset` for drawn lines.
- Short, small effects that already use other properties stay: the stamps' `clip-path` reveal, the quill's letter blur and the hold-to-close `clip-path` fill. The lamp's mask stays as it is.
- Hover glows and shadows are a separate layer whose `opacity` changes. Never transition `filter` or `box-shadow` on hover.
- Never blur a large image or a full-screen layer. The legend paper's `filter` is converted only if it animates.
- Set `will-change` only while an element animates, and remove it afterwards. No permanent `will-change` classes.
- Story images ship as properly sized WebP with `srcset`, so camera moves do not stutter.

## 5. Rules

1. **Nothing appears from nothing.** Enter from `scale(0.95)` plus opacity 0, never `scale(0)`.
2. **Portals grow from the word that was tapped** (`transform-origin` at the trigger). Full-screen file views and modals stay centred.
3. **Buttons and pressable things** scale to 0.97 on press, over 100 to 160ms.
4. **Stagger** groups of entering items by 30 to 80ms. Never block interaction while a stagger plays.
5. **Blur** up to 2px during crossfades or reveals. Never animate blur above 20px.
6. **Interruptible UI uses transitions or GSAP tweens, not CSS keyframes.** Constant motion (caret, scroll cue) may use keyframes.
7. **Slow when the user decides, fast when the app responds.** "Close the case" is a press-and-hold: a seal fills over about 1.5s, and releasing early snaps back in 200ms.
8. **Numbers that change** use `font-variant-numeric: tabular-nums`.

## 6. GSAP and smooth scrolling

- Set up and clean up every animation with `useGSAP` from `@gsap/react`, scoped to the component.
- The story is a stage of steps driven by GSAP Observer, not ScrollTrigger: no scrub and no pin. ScrollTrigger stays for the reduced-motion story page and for anything that scrolls normally.
- Use `gsap.matchMedia()` to give every scroll and entrance animation a reduced-motion version.
- Never store tween progress or scroll position in React state.
- **Lenis** (`lenis`) gives smooth scrolling, driven by GSAP's ticker and synced with ScrollTrigger. It is off under reduced motion, and held off while the story's stage has the screen (`holdSmoothScroll`). Inner scrolling areas (such as an open file's document) carry `data-lenis-prevent` and scroll natively.

## 6b. Dread motion (dread pass)

The dread is rare, slow and quiet, and has a purpose (`design.md`, "Dread"). Its tokens:

| Token | Ease | Duration | Use |
| --- | --- | --- | --- |
| `dread.rise` | `sine.out` | 4s (3 to 5s per line) | A ghost line rising and drifting like smoke, dissolving |
| `dread.lid` | `power2.inOut` | 1.4s | The face coming out of the dark, its eyes closing slowly, and its fading |
| `dread.blink` | `power2.inOut` | 0.18s | The eye's one blink; the jump scare's eye snapping open |
| `dread.gaze` | `power3.out` | 0.7s | The face's points of light looking left, then right: heavy |
| `dread.flicker` | `sine.inOut` | 0.09s per stutter | The lamp dipping as a Legend stamp lands: about a second |
| `dread.twitch` | `power1.inOut` | 0.07s per shiver | An opened legend's twitch (on the file's drawing, never its place) |
| `dread.drift` | `none` | 7s | The shadow drifting across the deck: constant |
| `dread.cut` | `power4.in` | 0.08s | The one jump scare's cut to black |
| `dread.progress` | `power2.out` | 0.4s | The preloader's progress line catching up |

- **Rarity is a rule, not a mood:** the eye at most once every 60–120s of activity, never in the first 30s; ghost lines every 4–8s, at most two; a twitch every 10–20s; the shadow once per visit; the jump scare once per case completion, and only for a player who relied on a legend.
- **Cheap:** transforms and opacity only (the grain steps by transform); timers, never a frame loop, when nothing is happening.
- **Reduced motion:** the grain is still, no ghost lines, no eye, no twitch, no lamp dip, no shadow; the jump scare has no cut and no sting, its line simply appears; the preloader simply fades.

## 7. Check before shipping

Slow the animation to 2 to 5 times its speed and check:
- Is the transform origin right?
- Are opacity and transform in sync?
- Does the easing start and stop cleanly?
- Does it still feel right on a phone?

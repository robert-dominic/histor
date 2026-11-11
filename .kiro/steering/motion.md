---
inclusion: fileMatch
fileMatchPattern: "src/**/*.{tsx,ts,css}"
---

# Motion

Distilled from Emil Kowalski's design-engineering rules, adapted for Histor and GSAP.

## 1. Decide whether it should animate

Every animation needs a purpose: feedback, explanation, showing a change of state, or preventing a jarring change. "It looks cool" is only enough for moments users see once.

| How often the user sees it | Histor examples | Treatment |
| --- | --- | --- |
| Once per visit | legend intro, debunk stamp, story beats, verdict stamp | Cinematic. Can be long and dramatic. |
| A few times | opening the board, the fork, closing the case | Considered: 300 to 600ms, one clear move. |
| Many times | opening a file, pinning, opening a portal | Fast: 150 to 250ms. |
| Constantly | hover, button press, scrolling the board | Instant or nearly: 100 to 160ms, or none. |

## 2. Easing

Use these tokens (defined in `lib/motion.ts` and `styles/tokens.css`). Never use the browser's built-in `ease-in`.

- `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` for anything appearing or responding.
- `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)` for things moving across the screen.
- `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)` for panels and file screens sliding in.
- Linear only for constant motion and scroll-scrubbed timelines.

## 3. Rules

1. **Exits are faster than entrances.**
2. **Nothing appears from nothing.** Enter from `scale(0.95)` plus opacity 0, never `scale(0)`.
3. **Portals grow from the word that was tapped** (`transform-origin` at the trigger). Full-screen file views and modals stay centred.
4. **Buttons and pressable things** scale to 0.97 on press, over 100 to 160ms.
5. **Stagger** groups of entering items by 30 to 80ms. Never block interaction while a stagger plays.
6. **Blur** up to 2px during crossfades to hide the seam. Never animate blur above 20px.
7. **Interruptible UI uses transitions or GSAP tweens, not CSS keyframes.**
8. **Slow when the user decides, fast when the app responds.** "Close the case" is a press-and-hold: a seal fills over about 1.5s, and releasing early snaps back in 200ms.
9. **`clip-path` for reveals:** stamps pressing in, files opening, images uncovering on scroll.
10. **Numbers that change** use `font-variant-numeric: tabular-nums`.

## 4. GSAP specifics

- Set up and clean up every animation with `useGSAP` from `@gsap/react`, scoped to the component.
- The story uses ScrollTrigger with `scrub` for scroll-linked beats and `pin` only where a beat needs to hold.
- Use `gsap.matchMedia()` to give every scroll and entrance animation a reduced-motion version.
- Never store tween progress or scroll position in React state.

## 5. Check before shipping

Slow the animation to 2 to 5 times its speed and check:
- Is the transform origin right?
- Are opacity and transform in sync?
- Does the easing start and stop cleanly?
- Does it still feel right on a phone?

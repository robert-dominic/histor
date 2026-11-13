# Brief: Legend intro screen (Mary Celeste)

For Claude Code. Read `CLAUDE.md` and every file in `.kiro/steering/` first, especially `design.md` and `motion.md`. Apply the emil-design-eng skill.

## What this screen is

The first thing a visitor sees when they open a case. It tells the famous myth, dramatically, then slams a stamp on it: **NOT IN THE RECORD**. Then: *"Well... that never happened."* In ten seconds, a judge understands the whole product: this app separates the record from the legend.

## The flow

1. **Dark.** The legend lives at night. Background `night` (#0d1317). Behind the text: the ghost-ship video, darkened and quiet.
2. **The myth, line by line.** Each line of `legendIntro.lines` appears in turn, in Grenze Gotisch, colour `ghost-night` (#a8c3d3), large. Slow and deliberate: about 1.2s between lines, reveal with opacity and a small upward move (clip-path or blur ≤2px allowed). Previous lines stay on screen.
3. **The stamp.** A short pause after the last line, then `legendIntro.stamp` lands over the lines: Special Elite, uppercase, `rust` (#9e3326), bordered like an ink stamp, rotated about -6°. Enter from scale 1.15 → 1 with opacity 0 → 1, fast (~180ms, `--ease-out`). No bounce, no shake. The myth lines behind it dim to about 40% opacity.
4. **The debunk.** `legendIntro.debunk` appears below in Old Standard TT, `night-ink` (#e6e1d3). Its first sentence, "Well... that never happened.", is the voice of the app: dry, a little mischievous. Give it its own beat before the rest of the paragraph.
5. **Continue.** A "Continue" button appears. It leads to the case story. The story itself isn't built yet, so for now Continue reveals the current plain case page.

**Skip** is visible from the first frame, in a corner, Special Elite, small. Skip jumps straight to the end state (all lines, stamp, debunk and Continue shown), so the user can still read what they skipped. Pressing Continue ends the intro.

## Video

- File: the night ghost-ship clip (Robert will copy it into the repo). Put it at `src/cases/mary-celeste/assets/video/legend-night.mp4`.
- Compress it first: 1280px wide max, H.264, no audio track, target under 1.5 MB. With ffmpeg: `-vf scale=1280:-2 -an -c:v libx264 -preset veryfast -crf 30 -movflags +faststart`. Also export a still frame as a poster image (`legend-night-poster.jpg`, under 150 KB).
- Play it `muted autoplay loop playsInline`, behind a dark overlay so the text stays readable (aim for text contrast of at least 4.5:1).
- It's AI-generated, so it must carry a small label in a corner: **"Illustration"** (Special Elite, small, muted). This is a content-integrity rule, not optional.
- The video is optional per case. Add a field to the case theme for it only if needed; otherwise pass it from the case folder. Do **not** change `src/types/case.ts` without asking first. If you need a type change, stop and propose it.
- Reduced motion: show the poster image instead of the video.

## Reduced motion

"Gentler, not none" (product.md). With `prefers-reduced-motion`: lines fade in without movement, the stamp fades in without scaling, no video (poster only). Same order, same beats, shorter.

## Content

Put this exact text into `legendIntro` in `src/cases/mary-celeste/case.ts`. Do not reword it.

```ts
legendIntro: {
  lines: [
    'December 1872. A ship is found drifting in the Atlantic.',
    'Not a soul aboard.',
    "In the captain's cabin, breakfast is laid out.",
    'Half-eaten. The tea is still warm.',
    'As if everyone simply vanished.',
  ],
  stamp: 'Not in the record',
  debunk:
    'Well... that never happened. The men who boarded her found nothing to eat or drink on the table. The warm breakfast grew out of a short story Arthur Conan Doyle published in 1884, and the retellings that followed it.',
},
```

The stamp text is stored in sentence case; display it uppercase with CSS.

## Where it goes

- Component: `src/features/legend/LegendIntro.tsx`. It takes the `legendIntro` data, the video sources and an `onDone` callback as props. No case content hard-coded in the component.
- `src/pages/Case.tsx`: for an open case, show `LegendIntro` first; after Continue, show the existing plain page.
- Animation with GSAP via `useGSAP`, inside `gsap.matchMedia()` for reduced motion. No animation values in React state. Only animate transform, opacity, filter and clip-path.
- Fonts: load Grenze Gotisch, Special Elite and Old Standard TT if they aren't loaded yet, and add the Ash palette and easing tokens to the `@theme` block in `src/index.css` as named tokens. Other screens will use them.

## Must work on

- 375px wide (phone) and 1440px (desktop). On a phone the lines get smaller but stay dramatic; nothing overflows.
- Keyboard: Skip and Continue are reachable with Tab and work with Enter. Focus is visible.
- Screen readers: all text is real text in the DOM, not images.

## Tests

- A component test (jsdom): every line, the stamp and the debunk from the data are rendered; Skip shows the end state; Continue calls `onDone`.
- Update the existing Case page tests if the intro changes what they see first.
- The registry test must still pass with the new content (`validateCase` returns zero errors).

## Done means

- `npm test`, `npm run build` and `npm run lint` all pass.
- Robert has looked at it on his phone and on desktop.
- Report in the usual format: what changed, every error hit (even fixed ones), real test output, notes. Commit with `[claude-code]`, don't push, then stop.
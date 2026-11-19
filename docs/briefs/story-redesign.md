# Brief: Story redesign (cinematic scroll)

For Kiro (default agent, Opus). Read every file in `.kiro/steering/` first. Use Context7 for current GSAP docs (ScrollTrigger pin and scrub, ScrollToPlugin, SplitText). All GSAP plugins ship free in the `gsap` package.

## Why

The story informs but doesn't pull. A casual reader should not want to stop scrolling. This replaces the 50/50 image/text layout with full-screen cinematic scenes, documentary-style.

Keep everything that works: the title card, the legend intro, the quill, the portals, the image credits (ⓘ, "Illustration", captions), day into night, the fork.

## 1. Scenes

Each chapter becomes a **pinned full-screen scene** (ScrollTrigger `pin` with `scrub`). The chapter's scroll length controls a timeline:

- **The image fills the screen** (`object-fit: cover`, `100svh`), with the existing per-chapter colour grade (darker and colder chapter by chapter).
- **A slow documentary camera:** the image scales from 1.0 to about 1.12 and pans slightly over the chapter's scroll length, scrubbed. Each chapter pans in a different direction.
- **Readability:** a dark gradient over the bottom 45% of the image, so text always reaches 4.5:1.
- **Opening:** the kicker fades in, then the quill writes the heading large, centred over the image.
- **Beats:** the body text is split into beats (one sentence each). Each beat appears alone in the lower third, entering with opacity 0 → 1, translateY 20px → 0 and blur 2px → 0, then leaving before the next arrives. Old Standard TT, large and readable, centred, max about 32 characters per line on phones. Portals inside beats stay tappable.
- **The hook** is a full-screen moment: the image dims almost to black, and the hook line appears large and centred in Old Standard TT italic. Then hold a short stretch of scroll where nothing changes, a beat of stillness, before the next scene.
- **Between scenes:** the next image cross-dissolves in over the old one (no hard cuts).

Screen readers and search engines must get the full text: render each paragraph complete in the DOM (visually hidden where the beats are shown), with the beats `aria-hidden`.

## 2. The roll call (chapter 1)

Approved type change: add `rollCall?: { name: string; role: string }[]` to `StorySection`. Validate that both strings are non-empty; add unit tests and one spec line.

Mary Celeste chapter 1 roll call, in this order:
Benjamin Briggs, captain · Sarah Briggs, his wife · Sophia Briggs, their daughter, aged two · Albert Richardson, first mate · Andrew Gilling, second mate · William Head, steward and cook · Volkert Lorenzen, seaman · Boz Lorenzen, seaman · Arian Martens, seaman · Gottlieb Goodschaal, seaman

In chapter 1, after the beat "On board: ten people.", the names appear one by one in a column over the darkened image (name in Old Standard TT, role small in Special Elite). They stay while the chapter continues. At the hook "Not one of them would ever be seen again." they go out one by one, last to first, like candles: a slight flicker, then gone. Then the hook line.

## 3. The voyage chart

Approved type change: add an optional `voyage` field to `Case` with a list of points (`id`, `label`, `lat`, `lon`, the story chapter id where it appears, and a `kind`: `port`, `record` or `found`). Validate it, with unit tests and one spec line.

Mary Celeste points:
- New York, 40.70 N, 74.00 W (s-voyage, port)
- Last log entry, 36.93 N, 27.33 W (s-last-entry, record)
- The last slate note, 37.02 N, 25.02 W (s-last-entry, record)
- Found adrift, 38.33 N, 17.25 W (s-found, found)
- Gibraltar, 36.14 N, 5.35 W (s-inquiry, port)
- Genoa, never reached, 44.41 N, 8.93 E (s-voyage, port, shown faint and dotted)

(Positions from maryceleste.net's facts page, item 15.)

The chart:
- A small inset (about 160px desktop, 110px phone) in a corner that doesn't collide with text or credits. An old-chart look: `paper` lines on `night`, a faint latitude/longitude grid, simplified coastlines of the North Atlantic, Europe and North Africa from Natural Earth 110m (public domain), simplified to under 30 KB.
- The route draws itself as the reader scrolls (stroke-dashoffset, scrubbed): New York → last log → slate. From the slate to "Found adrift" the line turns **dashed and ghostly**: the stretch she sailed alone. Then a solid line on to Gibraltar. Genoa stays a faint dotted destination she never reached.
- A small ship marker moves along the line. Tapping the chart expands it to a larger view with labels; tap again or press Escape to close.

## 4. Play the story

- At the start of the story: two choices, **"Play the story"** and **"Read at my pace."** Also a small floating play/pause control throughout the story.
- Play auto-scrolls (ScrollToPlugin) at reading pace: each beat holds long enough to read (about 240 words per minute, minimum 2.5s), hooks hold about 4s.
- Any wheel, touch, key or scrollbar input pauses it immediately. Opening a portal pauses it.
- It stops at the fork.
- Reduced motion: no auto-scroll option, and no camera movement or scrub. Scenes become normal stacked sections with static images, and text fades in.

## 5. Day into night

Keep the existing logic (background, gutter, text colours), now applied to the letterbox areas and overlays around the full-screen scenes.

## 6. Ready for sound later

Emit simple events (chapter enter, beat, hook, roll-call name out) through one small module, with no sound yet, so sound can be attached in a later task without touching the story code.

## 7. Phones

Same experience. Use `svh`. Pinning must not jump when the browser bar shows or hides (use ScrollTrigger's recommended settings for mobile). Beats and hooks must fit a 375×667 screen without overflow.

## 8. First-use hint

At the start of the story, a small hint in the app's voice: "Scroll, or press play." It disappears after the first scroll.

## Update docs

Update the layout section of `docs/content/mary-celeste-scenes.md` and `design.md` to describe the new cinematic layout.

## Tests

- Every chapter's full text is in the DOM.
- The roll call renders ten names with roles from the data.
- Voyage points are validated (unit tests for the validator).
- Play / pause toggles, and user input pauses playback.
- The reduced-motion path renders static stacked scenes.

## Done means

Test, build and lint pass. Checked in Chrome at 375px and 1440px, including a full scroll and a full auto-play run. Report in the usual format (what changed, every error hit including fixed ones, real test output, notes). Commit with [kiro], push, stop.
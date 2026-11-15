# Brief: The story screen (Mary Celeste)

For Claude Code. Read `CLAUDE.md`, every file in `.kiro/steering/`, `docs/content/mary-celeste-story.md` and `docs/content/mary-celeste-scenes.md` first. Apply the emil-design-eng skill.

## What this screen is

After the legend intro, the reader scrolls through the real story: six chapters, each with its own historical image, from a New York harbour by day to an empty sea at night. Names, places and terms in the text are tappable portals. The story ends at full night on the case's central question.

The flow of a case page becomes: **title card → legend intro → scroll cue → six chapters → the central question.**

## 1. Content

- Copy Part 2 of `docs/content/mary-celeste-story.md` into `src/cases/mary-celeste/case.ts` exactly: `centralQuestion`, `story`, `references`, `sources`. Don't reword anything. Keep any placeholder sources that existing evidence still points to, so the validator passes.
- Also set in the case: `title: 'The Mary Celeste'`, and the Home teaser: `'A ship found sailing with no one aboard. Ten people, never seen again.'`

## 2. Approved type changes (src/types/case.ts)

Only these three, all optional:
- `StorySection.image?: ImageAsset`: the chapter's image.
- `Case.yearEnd?: number`: for "1872 – 1873".
- `Case.unsolved?: boolean`: shows the UNSOLVED stamp.

Set `year: 1872`, `yearEnd: 1873`, `unsolved: true` for the Mary Celeste. Make `validateCase` check `StorySection.image` when present (src, alt, credit non-empty) and that `yearEnd >= year`. Add unit tests. Add the new fields to the data-foundation spec's requirements.md and design.md, one line each.

## 3. Images

Originals are in `/home/webnova/histor-media/` (outside the repo). Never copy the originals into the repo.

- For each chapter image listed in the scene list: crop off any frame, border or printed caption; resize to 1600px wide; export WebP to `src/cases/mary-celeste/assets/images/<same name>.webp`. Target under 250 KB each.
- Chapter 4: extract a clean frame from `s-aboard.mp4` (around the 2-second mark) as `s-aboard.webp`.
- Portal: `ref-mary-celeste.jpg` (the full 1861 painting, inscription kept) → `ref-mary-celeste.webp`, 1000px wide, under 150 KB. Attach it to the `mary-celeste` reference's `image`.
- Credits: use the exact credit lines from the scene list. The chapter 4 still has `isIllustration: true`; the rest are real historical works (`isIllustration: false`).
- Alt text: look at each image and write one plain sentence describing what's visible, e.g. "Painting of a sailing ship leaving a harbour, with a red stone fort on the shore." No interpretation.

## 4. Layout

- **Phone:** the chapter image fills the top half of the screen and stays put (`position: sticky`). The text sits in the bottom half and is the only part that scrolls.
- **Desktop (≥1024px):** side by side: the image is sticky on the left half at full screen height, and the text scrolls on the right half.
- Use `svh` units so mobile browser bars don't break the halves.
- When the reader scrolls past a chapter's text, the next chapter's image takes over. **The reader sets the pace: nothing advances by itself.**
- The credit line sits small in a corner of each image (Special Elite, muted), plus "Illustration" when `isIllustration` is true.

## 5. Typography per chapter

- **Kicker** (e.g. "New York, November 1872"): Special Elite, small, uppercase, letter-spaced.
- **Heading:** Grenze Gotisch, large, written over the image by the quill.
- **Body paragraphs:** Old Standard TT, comfortable reading size and line height.
- **Hook** (the last line): Old Standard TT italic, larger, with space above it. It is the line that pulls the reader on.

## 6. Day into night

- Chapter backgrounds step from `ash` (chapter 1) to `night` (chapter 6), evenly in between. Body text switches from `ink` to `night-ink` once the background is dark enough to need it. Body text must keep at least 4.5:1 contrast at every step.
- Image grade: a CSS filter that gets darker and colder chapter by chapter (desaturated, slightly sepia; brightness from about 1.0 at chapter 1 down to about 0.55 at chapter 6), plus a subtle dark gradient where text overlaps the image. The grade is what makes paintings, an engraving and a video still feel like one set.
- Background colour changes ease smoothly as the reader scrolls between chapters (GSAP ScrollTrigger scrub), never as a hard cut.

## 7. Animation (motion.md applies)

- **Every time a chapter comes into view** (scrolling down or back up), its entrance replays: the kicker fades in, then the heading is written by the quill (reuse the legend intro's quill writer; move it into a shared component), then the paragraphs drop in one by one as they scroll into view (opacity 0 → 1, translateY 16px → 0, ~400ms, `--ease-out`, about 80ms stagger). Nothing is remembered between visits.
- The image fades and settles in (opacity, scale 1.04 → 1) when its chapter takes over.
- Reduced motion: no quill, no movement. Everything fades in, in the same order. The colour changes still happen.

## 8. Portals

- Render case text through the story engine's `parseRefs`. Each ref segment becomes a button styled as part of the text: brass dotted underline, pointer cursor, visible focus ring. Unknown ids fall back to plain text.
- Tapping opens a **portal card** that grows from the tapped word (motion.md: portals grow from their trigger, scale 0.95 → 1 with opacity):
  - **Desktop:** a card anchored next to the word.
  - **Phone:** a bottom sheet.
- Card contents: the kind ("Person", "Place", "Ship", "Term") in Special Elite, the label in Grenze Gotisch, the profile paragraphs in Old Standard TT, the image with its credit when there is one, and a small "Sources" list linking each source by its title.
- Close with ×, Escape, a tap outside, or (phone) swiping the sheet down. Focus moves into the card on open and back to the word on close.

## 9. Title card and scroll cue

- **Title card**, as the first beat of the intro sequence: the case title written by the quill, then "1872 – 1873" (from `year` and `yearEnd`), then a small stamp, "UNSOLVED" (from `unsolved`), in rust-night. About 3 seconds, then it flows into the legend intro. Skip covers both. Home shows the same years next to the case.
- **After the legend intro:** replace the Continue button with a scroll cue: "See what really happened" (Special Elite) with a small downward arrow. Clicking it scrolls smoothly to chapter 1; scrolling works too.

## 10. The end of the story

After chapter 6, at full night: the `centralQuestion` on its own screen, large, in Old Standard TT, centred, written in slowly (fade per phrase). Nothing comes after it yet: the fork and the board are the next brief.

## Performance

- Lazy-load chapter images; preload the next chapter's image when the reader is one chapter away.
- Only animate transform, opacity, filter and clip-path. No layout thrashing on scroll.

## Tests

- All six chapters render from the case data, with heading, kicker, body, hook and image (alt and credit present).
- A portal opens on click and on Enter, shows the profile, and closes on Escape, returning focus.
- The new type fields are validated, with unit tests.
- The registry test passes with the new content (zero `validateCase` errors).

## Done means

`npm test`, `npm run build` and `npm run lint` pass; checked at 375px and 1440px. Report in the usual format (what changed, every error hit including fixed ones, real test output, notes). Commit with `[claude-code]`, don't push, stop.
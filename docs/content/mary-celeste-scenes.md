# Mary Celeste: scene list (one image per chapter)

## The layout (decided): story v3, in steps, pages written by the pen

From docs/briefs/story-redesign.md, reworked by docs/briefs/night-run.md and docs/briefs/story-steps.md. The same on phones and desktops, except where the page lies.

- **After the legend intro:** the "Continue" button becomes a scroll cue: **"See what really happened"**. It opens a modal over a darkened screen: the case title written by the pen, one short line, and two big buttons, **"Play the story"** and **"Read at my pace"**. The story starts once the reader chooses (Escape means "Read at my pace"); nothing moves past it. It opens on every arrival, also on a return visit, a reload or a direct link.
- **No opening scene.** The story starts on chapter 1. The case header shows **The Mary Celeste** and **1872 – 1873** once the story starts, with a small typed **UNSOLVED** tag beside the years.
- **Each chapter is a full-screen scene.** The image fills the screen (`object-fit: cover`, `100svh`) under a slow documentary camera (from 1.0 to 1.12 and a little pan, a different way each chapter). All six scenes lie in one fixed stage. **The story moves in steps:** one scroll, swipe or key press moves exactly one step (each page, each hook, each line of the question, then the fork), however hard the flick. A thin rail on the left shows the chapters and the question, lights the current one, and jumps to any of them.
- **A page per chapter.** On the left, about 42% of the width (along the bottom on phones), a dark, softly faded panel holds the chapter's page: the kicker typed small, the heading written large, the body in Old Standard TT at 18 to 19px. In chapter 1 the ten aboard are on a **crew list**: a small slip of aged paper pinned at a slight angle on the right (along the top on phones), headed **Crew list · Mary Celeste · Nov. 1872**; the slip appears only as the pen reaches it, and the pen writes each name, with the role beside it, in dark ink. The image stays visible on the rest of the screen.
- **The pen writes the whole page.** When the chapter settles, the same pen that writes the heading carries on and writes the body, at about 3× reading pace, a whole word at a time for a long chapter, never more than about 10 seconds. Once written, the text stays. A click on the panel, or a forward gesture, finishes it at once and stays on the page; the next gesture moves on. Portal names stay clickable. Weighted phrases are written after a breath, a touch slower, slightly brighter. No red lines.
- **The hook between chapters** is its own step: the pen un-writes the names, last to first; the empty slip leaves; then the panel dims away; the image darkens and the camera creeps closer; the hook line appears large in the centre, the whole line snapping in on a timer (about 0.8s) as its letters settle into place; it holds; at the next step it decays letter by letter and the next image cross-dissolves in. Nothing else is on screen while it is there.
- **The voyage chart:** a small inset in the bottom-right corner draws each stretch of the route once its chapter's page is on screen. The stretch from the last slate note to where she was found is dashed and ghostly. Genoa stays a faint dotted destination. Tap it for a larger view with labels. It goes quiet while a hook is on screen.
- **Play the story** waits for each page to be written, then gives it its reading time, then moves on through the hook to the next page, and reads the central question line by line. Any wheel, touch, pointer or key input, or opening a portal, pauses it. The play/pause control stays in the bottom-left corner.
- **The central question** is one solid black screen, the full height of the screen. It builds one line per step, in five lines (`centralQuestionLines`): "Why would Captain Briggs abandon a sound ship," / "one he partly owned, and put his wife," / "his two-year-old daughter" / "and his crew into a small lifeboat" / "in the middle of the Atlantic?". At the next step (or once "Play" has held on it), **the fork** rises over it as a modal: "Most people stop here. Want to see what the evidence says?", with **Open the case files** and **I've heard enough**. Escape or a gesture back closes it.
- **Day into night:** each image gets a colour grade (desaturated, sepia-cool) that darkens chapter by chapter, and the sky colour around and behind the scenes (and the page's scrollbar gutter) follows the chapter on screen.
- **Screen readers** get every paragraph whole; the written page is for the eyes only.
- **Reduced motion:** a normal scrolling page: no steps, no camera, no pen and no auto-play. Each chapter shows its still image with the whole page already written on it, then the hook as plain text. The modals appear without animation.
- **The pace** of all of this is one object to tune by feel: `STORY_PACE` in `src/lib/story-pages.ts`.

## The case title (in the case header)

- **The Mary Celeste**, in Grenze Gotisch
- **1872 – 1873**: from the voyage to the end of the Gibraltar inquiry (the salvage award, 1873)
- A small typed tag: **UNSOLVED**

The same title and years appear on the case's entry on Home.

## The images (final)

Originals are in `~/histor-media/`. Claude Code crops, compresses and copies them into `src/cases/mary-celeste/assets/images/`. Every image has its credit behind an ⓘ; the deck still has no visible "Illustration" tag, and its credit begins "AI illustration."

| Chapter | File | What it is | Credit line | Mood / grade |
| --- | --- | --- | --- | --- |
| 1. Ten people set sail | `s-voyage.jpg` | Edward Moran, *Shipping off Governors Island, New York*, c. 1870 | Painting by Edward Moran, c. 1870. Not the Mary Celeste. Public domain, via Wikimedia Commons. | Daylight |
| 2. Six miles from land | `s-last-entry.jpg` | Ivan Aivazovsky, *Stürmische See im Abendrot* (Stormy Sea at Sunset), 1896. Commons: https://commons.wikimedia.org/wiki/File:Ivan_Konstantinovich_Aivazovsky_-_St%C3%BCrmische_See_im_Abendrot,_1896.jpg | Painting by Ivan Aivazovsky, 1896. Not the Mary Celeste. Public domain, via Wikimedia Commons. | Storm, dim |
| 3. She kept sailing | `s-found.jpg` | The Mary Celeste in 1861, under her first name, *Amazon*, entering Marseilles (cropped) | The Mary Celeste as the *Amazon*, 1861. Artist unconfirmed. Public domain, via Wikimedia Commons. | Overcast, colder |
| 4. Everything, except the people | still from `s-aboard.mp4` | AI-generated still of an empty deck | AI illustration. AI-generated (Google Gemini). | Dusk |
| 5. Murder? | `s-inquiry.jpg` | *Gibraltar from the northwest*, engraving, 1870 | Engraving by J.H. Mann, 1870. U.S. Naval History and Heritage Command. Public domain, via Wikimedia Commons. | Evening |
| 6. Why? | `s-question.jpg` | Ivan Aivazovsky, *A Moonlit Night at Sea*, 1885 | Painting by Ivan Aivazovsky, 1885. Not the Mary Celeste. Public domain, via Wikimedia Commons. | Full night |

Crop out frames, borders and printed captions for the chapter backgrounds.
Each chapter image also ships in sized WebP versions next to it, named by width (`s-voyage-828.webp` and a larger one up to 1920w, each under 300 KB). The scenes use them through `srcset`; the file named in the table is the fallback.

## For the portal cards

| Card | File | Credit line |
| --- | --- | --- |
| Mary Celeste | `ref-mary-celeste.jpg` (the full 1861 painting, with its inscription "Amazon of Parrsboro... entering Marseilles, Nov'b'r 1861") | The Mary Celeste as the *Amazon*, 1861. Artist unconfirmed. Public domain, via Wikimedia Commons. |

Later: real photos of Captain Briggs, Sarah and Sophia from the Mary Celeste page on Commons, and old maps of the Azores and Gibraltar.
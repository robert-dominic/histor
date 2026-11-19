# Mary Celeste: scene list (one image per chapter)

## The layout (decided): cinematic scenes

From docs/briefs/story-redesign.md. The same on phones and desktops.

- **Each chapter is a full-screen scene.** The image fills the screen (`object-fit: cover`, `100svh`). All six scenes lie in one pinned stage, and the scroll scrubs one timeline that plays them in turn.
- **A slow documentary camera:** over each chapter the image pushes in from 1.0 to 1.12 and pans a little, in a different direction each chapter.
- **The opening:** the kicker fades in, then the quill writes the heading large and centred over the image.
- **Beats:** the text arrives one sentence at a time in the lower third, over a dark gradient on the bottom 45% of the image. Each beat comes in (fade, rise, unblur), holds for its reading time, and leaves before the next.
- **The hook** takes the whole screen: the image dims almost to black and the line appears large, in italic. Then a short stretch of stillness before the next scene dissolves in over it. No hard cuts.
- **The roll call (chapter 1):** after "On board: ten people.", the ten names appear one by one in a column over the darkened image, and stay. At the hook they go out last to first, like candles.
- **The voyage chart:** a small inset in the bottom-right corner draws the route as the reader scrolls. The stretch from the last slate note to where she was found is dashed and ghostly. Genoa stays a faint dotted destination. Tap it for a larger view with labels.
- **Play the story:** at the start, "Play the story" or "Read at my pace". Playing scrolls at reading pace (240 words a minute, at least 2.5s a beat, about 4s a hook) and stops at the fork. Any wheel, touch, key or scrollbar input, or opening a portal, pauses it. A small play/pause control floats in the bottom-left corner throughout.
- **Day into night:** each image gets a colour grade (desaturated, sepia-cool) that darkens chapter by chapter, and the sky colour around and behind the scenes (and the page's scrollbar gutter) follows the chapter on screen.
- **Screen readers** get every paragraph whole; the beats are for the eyes only.
- **Reduced motion:** no camera, no scrub and no auto-play. The chapters are plain stacked sections with still images, and the text fades in.
- **After the legend intro:** the "Continue" button becomes a scroll cue: **"See what really happened"**.

## The case title card (before the legend intro)

- **The Mary Celeste**, written by the quill in Grenze Gotisch
- **1872 – 1873**: from the voyage to the end of the Gibraltar inquiry (the salvage award, 1873)
- A small stamp: **UNSOLVED**

The same title and years appear on the case's entry on Home.

## The images (final)

Originals are in `~/histor-media/`. Claude Code crops, compresses and copies them into `src/cases/mary-celeste/assets/images/`. Every image shows a credit line; the deck still also shows "Illustration".

| Chapter | File | What it is | Credit line | Mood / grade |
| --- | --- | --- | --- | --- |
| 1. Ten people set sail | `s-voyage.jpg` | Edward Moran, *Shipping off Governors Island, New York*, c. 1870 | Painting by Edward Moran, c. 1870. Not the Mary Celeste. Public domain, via Wikimedia Commons. | Daylight |
| 2. Six miles from land | `s-last-entry.jpg` | Ivan Aivazovsky, *Stürmische See im Abendrot* (Stormy Sea at Sunset), 1896. Commons: https://commons.wikimedia.org/wiki/File:Ivan_Konstantinovich_Aivazovsky_-_St%C3%BCrmische_See_im_Abendrot,_1896.jpg | Painting by Ivan Aivazovsky, 1896. Not the Mary Celeste. Public domain, via Wikimedia Commons. | Storm, dim |
| 3. She kept sailing | `s-found.jpg` | The Mary Celeste in 1861, under her first name, *Amazon*, entering Marseilles (cropped) | The Mary Celeste as the *Amazon*, 1861. Artist unconfirmed. Public domain, via Wikimedia Commons. | Overcast, colder |
| 4. Everything, except the people | still from `s-aboard.mp4` | AI-generated still of an empty deck | Illustration. AI-generated (Google Gemini). | Dusk |
| 5. Murder? | `s-inquiry.jpg` | *Gibraltar from the northwest*, engraving, 1870 | Engraving by J.H. Mann, 1870. U.S. Naval History and Heritage Command. Public domain, via Wikimedia Commons. | Evening |
| 6. Why? | `s-question.jpg` | Ivan Aivazovsky, *A Moonlit Night at Sea*, 1885 | Painting by Ivan Aivazovsky, 1885. Not the Mary Celeste. Public domain, via Wikimedia Commons. | Full night |

Crop out frames, borders and printed captions for the chapter backgrounds.

## For the portal cards

| Card | File | Credit line |
| --- | --- | --- |
| Mary Celeste | `ref-mary-celeste.jpg` (the full 1861 painting, with its inscription "Amazon of Parrsboro... entering Marseilles, Nov'b'r 1861") | The Mary Celeste as the *Amazon*, 1861. Artist unconfirmed. Public domain, via Wikimedia Commons. |

Later: real photos of Captain Briggs, Sarah and Sophia from the Mary Celeste page on Commons, and old maps of the Azores and Gibraltar.
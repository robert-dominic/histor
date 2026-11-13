# Mary Celeste: scene list (one image per chapter)

## The layout (decided)

- **Phone:** the image fills the top half of the screen and stays pinned. The text fills the bottom half and is the only part that scrolls.
- **Desktop:** the same idea side by side: the image is pinned on the left half and the text scrolls on the right half.
- **The reader sets the pace.** Nothing advances by itself. The next chapter's image takes over only when the reader scrolls on.
- **Each chapter:** its title is written by the quill over the image, then the paragraphs drop in one by one as you scroll.
- **Entrance animations replay every time** a chapter comes into view, in both scroll directions. They are not remembered like the legend intro.
- **Day into night:** each image gets a colour grade (desaturated, sepia-cool) that darkens chapter by chapter. The grade also makes the different paintings, engravings and stills look like one set.
- **After the legend intro:** the "Continue" button becomes a scroll cue: **"See what really happened"**.

## The case title card (before the legend intro)

- **The Mary Celeste**, written by the quill in Grenze Gotisch
- **1872 – 1873**: from the voyage to the end of the Gibraltar inquiry (the salvage award, March 1873)
- A small stamp: **UNSOLVED**

The same title and years appear on the case's entry on Home.

## The images (final)

Originals are in `~/histor-media/`. Claude Code crops, compresses and copies them into `src/cases/mary-celeste/assets/images/`. Every image shows a credit line; the deck still also shows "Illustration".

| Chapter | File | What it is | Credit line | Mood / grade |
| --- | --- | --- | --- | --- |
| 1. Ten people set sail | `s-voyage.jpg` | Edward Moran, *Off Governors Island* (New York harbour), c. 1870 | Painting by Edward Moran, c. 1870. Public domain, via Wikimedia Commons. | Daylight |
| 2. Six miles from land | `s-last-entry.jpg` | Ivan Aivazovsky, *Stormy Sea at Sunset*, 1896 | Painting by Ivan Aivazovsky, 1896. Not the Mary Celeste. Public domain, via Wikimedia Commons. | Storm, dim |
| 3. She kept sailing | `s-found.jpg` | The Mary Celeste in 1861, under her first name, *Amazon*, entering Marseilles (cropped) | The Mary Celeste as the *Amazon*, 1861. Artist unconfirmed. Public domain, via Wikimedia Commons. | Overcast, colder |
| 4. Everything, except the people | still from `s-aboard.mp4` | AI-generated still of an empty deck | Illustration. AI-generated (Google Gemini). | Dusk |
| 5. Murder? | `s-inquiry.jpg` | *Gibraltar from the northwest*, engraving, 1870 | Engraving by J.H. Mann, 1870. Public domain, via Wikimedia Commons. | Evening |
| 6. Why? | `s-question.jpg` | Ivan Aivazovsky, *A Moonlit Night at Sea*, 1885 | Painting by Ivan Aivazovsky, 1885. Not the Mary Celeste. Public domain, via Wikimedia Commons. | Full night |

Crop out frames, borders and printed captions for the chapter backgrounds.

## For the portal cards

| Card | File | Credit line |
| --- | --- | --- |
| Mary Celeste | `ref-mary-celeste.jpg` (the full 1861 painting, with its inscription "Amazon of Parrsboro... entering Marseilles, Nov'b'r 1861") | The Mary Celeste as the *Amazon*, 1861. Artist unconfirmed. Public domain, via Wikimedia Commons. |

Later: real photos of Captain Briggs, Sarah and Sophia from the Mary Celeste page on Commons, and old maps of the Azores and Gibraltar.
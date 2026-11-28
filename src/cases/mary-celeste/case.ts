// src/cases/mary-celeste/case.ts
import type { Case, CaseTheme } from '@/types/case';
import refBenjaminBriggsImage from './assets/images/ref-benjamin-briggs.webp';
import refGibraltarImage from './assets/images/ref-gibraltar.webp';
import refMaryCelesteImage from './assets/images/ref-mary-celeste.webp';
import refSarahBriggsImage from './assets/images/ref-sarah-briggs.webp';
import refSophiaBriggsImage from './assets/images/ref-sophia-briggs.webp';
import foundImage from './assets/images/s-found.webp';
import inquiryImage from './assets/images/s-inquiry.webp';
import lastEntryImage from './assets/images/s-last-entry.webp';
import questionImage from './assets/images/s-question.webp';
import voyageImage from './assets/images/s-voyage.webp';

/**
 * The Mary Celeste (1872).
 * The legend intro, the story, the central question, the references and their sources are real content,
 * from docs/content/mary-celeste-story.md and docs/content/mary-celeste-evidence.md. Image credits come from docs/content/mary-celeste-scenes.md.
 * The theories, evidence and historians' summary are real content, copied from docs/content/mary-celeste-evidence.md.
 * The fork's wording comes from product.md.
 */
// The case's music: written by `npm run music:import -- mary-celeste` (scripts/music-import.mjs). Until it has been
// run there is no music.ts, and so no playlists.
const music = Object.values(import.meta.glob<{ playlists: NonNullable<CaseTheme['playlists']> }>('./music.ts', { eager: true }))[0];

export const maryCeleste: Case = {
  id: 'mary-celeste',
  title: 'The Mary Celeste',
  year: 1872,
  yearEnd: 1873,
  unsolved: true,
  teaser: 'A ship found sailing with no one aboard. Ten people, never seen again.',
  deskGuideIntro: 'In 1872 the Mary Celeste was found drifting with no one aboard. Nobody knows why.',

  // The hook: the case's first screen (docs/content/mary-celeste-story.md, "Hook"), over the first chapter's picture.
  hook: {
    lines: ['The ship was sound.', 'The cargo was untouched.', 'There was food for six months.', 'Everyone on board had vanished.'],
    dateline: 'December 1872. The Atlantic.',
  },

  // The story text is docs/content/mary-celeste-story.md: five chapters, then the closing modal (`fork`). In a chapter, a
  // blank line in the file is a paragraph here, and its lines are separated by "\n": the pen writes them one after
  // another. Every chapter ends on a line that makes the reader suspicious. No central question, no per-chapter hooks.
  story: [
    {
      id: 's-voyage',
      emphasis: ['That decision saved his life.'],
      image: {
        src: voyageImage,
        alt: 'Painting of a tall sailing ship under full sail on choppy green water, with smaller boats around it and a red stone fort on the shore.',
        credit: 'A tall ship under full sail, painted by Edward Moran around 1870. Not the Mary Celeste. Public domain, via Wikimedia Commons.',
        isIllustration: false,
      },
      kicker: 'November 1872',
      heading: 'The ship and her people',
      body: [
        'In November 1872, a small cargo ship called the {{ref:mary-celeste|Mary Celeste}} left New York.\nToday, the world remembers her as the ghost ship.\nShe was heading for {{ref:genoa|Genoa}}, in Italy, carrying 1,701 barrels of {{ref:alcohol|industrial alcohol}}.',
        'She was not a lucky ship.\nShe was built in Nova Scotia, Canada, eleven years earlier, under another name: the Amazon.\nHer first captain fell ill on her very first voyage, and died.\nYears later she was wrecked in a storm, rebuilt, and renamed, in the hope that her luck would change.',
        'Ten people sailed on her that November:\n**Benjamin Briggs**, the captain, 37.\n**Sarah Briggs**, his wife.\n**Sophia Briggs**, their daughter, two years old.\n**Albert Richardson**, first mate.\n**Andrew Gilling**, second mate.\n**Edward Head**, the cook.\n**Volkert and Boz Lorenzen**, brothers, sailors.\n**Arian Martens** and **Gottlieb Goodschaad**, sailors.',
        "The Briggs had a son, too: Arthur, seven years old.\nHe stayed at home, so he wouldn't miss school.",
        'That decision saved his life.',
      ],
    },
    {
      id: 's-last-entry',
      emphasis: ['It is the last thing anyone on board ever wrote.'],
      image: {
        src: lastEntryImage,
        alt: 'Painting of a small ship with a slanted sail riding a large wave beside a rocky shore, under a hazy orange sun.',
        credit: 'A small ship on a large wave by a rocky shore, painted by Ivan Aivazovsky in 1896. Not the Mary Celeste. Public domain, via Wikimedia Commons.',
        isIllustration: false,
      },
      kicker: 'November 1872',
      heading: 'The voyage',
      body: [
        'On 7 November 1872, the Mary Celeste sailed out of New York.\nBefore leaving, Captain Briggs wrote to his mother that the ship was "in beautiful trim".',
        'The crossing was rough, with strong winds for days.\nBut the ship made good time across the Atlantic.',
        "On 25 November, at eight in the morning, someone noted the ship's position.\nThe island of {{ref:santa-maria|Santa Maria}}, in the {{ref:azores|Azores}}, was six miles away.",
        'It is the last thing anyone on board ever wrote.',
        'Eight days behind them, another ship had left New York on almost the same route.\nThe {{ref:dei-gratia|Dei Gratia}}, under Captain {{ref:david-morehouse|David Morehouse}}.\nSome say he and Briggs were friends, and had dinner together the night before the Mary Celeste sailed.',
      ],
    },
    {
      id: 's-found',
      emphasis: ['There was no one on board.'],
      image: {
        src: foundImage,
        alt: 'Painting of a two-masted sailing ship with pale sails and a red flag on calm blue water, seen from the side.',
        credit: 'The ship as the Amazon, her original name, painted in 1861. Artist unconfirmed. Public domain, via Wikimedia Commons.',
        isIllustration: false,
      },
      kicker: '4 December 1872',
      heading: 'The discovery',
      body: [
        'On 4 December 1872, the crew of the Dei Gratia saw a ship on the horizon.\nShe was about 400 miles east of the Azores, halfway between the islands and Portugal.\nShe was moving strangely, drifting off course with her sails in disorder.',
        'Captain Morehouse watched her for two hours.\nHe signalled. No one answered.',
        'He sent his first mate, {{ref:oliver-deveau|Oliver Deveau}}, across in a small boat.\nIt was the Mary Celeste.',
        'There was no one on board.',
        "Here is what Deveau found:\nThe ship's only {{ref:lifeboat|lifeboat}} was gone.\nThere was water in the hold, a lot of it, but not enough to sink her.\nThere was food and fresh water for six months.\nThe crew's clothes and belongings were still in their places.\nThe cargo of alcohol was almost untouched.",
        "But a few things were missing:\nthe captain's sextant and {{ref:chronometer|chronometer}}, the two instruments a ship needed to know where it was,\nand all the ship's papers except the logbook.",
        "The Dei Gratia's men sailed the empty ship to {{ref:gibraltar|Gibraltar}}, expecting a reward for saving her.",
        'Instead, they were met with suspicion.',
      ],
    },
    {
      id: 's-inquiry',
      emphasis: ['No trace of it, or of the ten people in it, was ever found.'],
      image: {
        src: inquiryImage,
        alt: 'Engraving of the Rock of Gibraltar seen across a bay, with a town at its foot, small sailing boats on the water and three people sitting on the shore.',
        credit: 'The Rock of Gibraltar seen across the bay, engraved by J.H. Mann in 1870. U.S. Naval History and Heritage Command. Public domain, via Wikimedia Commons.',
        isIllustration: false,
      },
      kicker: 'Gibraltar',
      heading: "What doesn't add up",
      body: [
        "In Gibraltar, a court began to ask questions.\nLeading them was {{ref:solly-flood|Frederick Solly-Flood}}, the colony's Attorney General.\nHe was sure there had been a crime: mutiny, murder, or a trick by the men who found her.",
        'The hearings went on for three months.\nNo proof of any crime was ever found.',
        "The Dei Gratia's crew were paid for saving the ship, but only about a sixth of what she and her cargo were worth.\nMany saw it as a sign that the court never fully trusted them.",
        'But the bigger questions remain.',
        "Why would an experienced captain leave a ship that wasn't sinking,\nfor a small open boat, in the middle of the Atlantic, with his wife and baby daughter?",
        'Why take the instruments and the papers, but leave the food, the water, and everything they owned?',
        'And what happened to the lifeboat?\nNo trace of it, or of the ten people in it, was ever found.',
      ],
    },
    {
      id: 's-legend',
      emphasis: ['No one has proved what happened.'],
      image: {
        src: questionImage,
        alt: 'Painting of a dark, cloudy night at sea, with moonlight on the waves, a small boat pulled up on the beach and two ships far off on the horizon.',
        credit: 'A cloudy night at sea, painted by Ivan Aivazovsky in 1885. Not the Mary Celeste. Public domain, via Wikimedia Commons.',
        isIllustration: false,
      },
      // The eye may open in the storm clouds, top right, away from the page (dread pass, 4).
      eyeZones: [{ x: 62, y: 8, w: 26, h: 20 }],
      kicker: 'Twelve years later',
      heading: 'The legend grows',
      body: [
        'The court closed the case. The mystery stayed open.',
        'Twelve years later, a young writer named Arthur Conan Doyle published a story about the ship, without signing his name.\nHe called her the *Marie* Celeste, and filled the tale with invented details.\nMany readers believed it was true.\nThe wrong name stuck. So did some of the details.',
        'Since then, people have blamed almost everything:\na mutiny, pirates, a sea monster, a waterspout,\na seaquake, poisoned food, fumes from the alcohol in the hold,\nand, of course, ghosts.',
        'Scientists have tested theories in laboratories.\nWriters have filled books, and filmmakers have made films.\nIn Britain, her name even became a word: an empty place, abandoned without explanation, is called "a Mary Celeste".',
        'For 150 years, people have argued.\nNo one has proved what happened.',
      ],
    },
  ],

  // The closing modal, over the last chapter (docs/content/mary-celeste-story.md, "Closing modal").
  fork: {
    prompt: "The story ends here. The case doesn't.",
    body: [
      "We've gathered every claim ever made about the Mary Celeste.\nHistory and legend, side by side, waiting for you to investigate.",
      'Some come from sworn records. Some were made up later. Some, no one can agree on.',
      'Read what people said. Weigh the evidence. Decide what really happened.',
    ],
    investigateLabel: 'Open the case files',
  },

  theories: [
    { id: 't-sinking', title: 'She was sinking', standing: 'leading',
      claim: 'A clogged pump and a mistaken position made the captain believe the ship was sinking. After a stormy night, with land close, he ordered everyone into the lifeboat.',
      standingReason: 'It fits the water in the hold, the dismantled pump and the missing instruments. But the water was manageable for a ship her size, and the position error is a modern reconstruction.' },
    { id: 't-explosion', title: 'Fear of explosion', standing: 'leading',
      claim: 'Fumes from the alcohol cargo flared or burst, and the crew fled in the lifeboat, meaning to return once it was safe.',
      standingReason: 'A 2006 demonstration suggested such a flash could leave no scorch marks. But no fumes were reported, the empty barrels may simply have leaked, and why the hatches were open is unclear.' },
    { id: 't-mutiny', title: 'Drunken mutiny', standing: 'rejected',
      claim: 'The crew drank the cargo, killed the captain, his family and the officers, and escaped in the lifeboat.',
      standingReason: 'A survey found none of the barrels had been tampered with, the stains on the sword were not blood, and nothing of value was taken.' },
    { id: 't-salvage-murder', title: 'Murder for salvage', standing: 'rejected',
      claim: "The Dei Gratia's crew killed everyone aboard to claim the ship as salvage.",
      standingReason: 'The inquiry turned up no evidence of it, and the reward was small.' },
    { id: 't-fraud', title: 'Insurance fraud', standing: 'rejected',
      claim: 'The captain and others staged the loss to collect the insurance.',
      standingReason: 'Briggs owned part of the ship and had his wife and daughter aboard. The insurers never opened an inquiry, and no evidence of a plot was ever found.' },
  ],

  evidence: [
    // Record
    { id: 'e-no-one-aboard', status: 'record', title: 'No one aboard',
      detail: ['All ten people were gone. No bodies were ever found.'],
      sources: ['src-rmg', 'src-maryceleste-net'],
      reading: { supports: [], weakens: [], note: 'The starting point. It points to no theory on its own.' } },
    { id: 'e-lifeboat', status: 'record', title: 'The missing lifeboat',
      detail: ["The ship's only {{ref:lifeboat|lifeboat}} was gone, and no boat was found aboard."],
      sources: ['src-rmg', 'src-maryceleste-net'],
      reading: { supports: ['t-sinking', 't-explosion', 't-mutiny'], weakens: [], note: 'The people most likely left on purpose, in the lifeboat.' } },
    { id: 'e-instruments', status: 'record', title: 'Instruments and papers gone',
      detail: ["The {{ref:chronometer|chronometer}}, sextant, navigation book and ship's papers were missing."],
      sources: ['src-rmg', 'src-american-heritage'],
      reading: { supports: ['t-sinking', 't-explosion'], weakens: [], note: 'Whoever left took what they needed to navigate, which points to a deliberate departure.' } },
    { id: 'e-last-note', status: 'record', title: 'The last note on the slate',
      detail: ["The {{ref:log-slate|log slate}}'s final note, on the morning of 25 November, put {{ref:santa-maria|Santa Maria}} island six miles away."],
      sources: ['src-maryceleste-net', 'src-rmg'],
      reading: { supports: ['t-sinking'], weakens: [], note: 'The last sign of anyone aboard, and it was close to land.' } },
    { id: 'e-water', status: 'record', title: 'Water in the hold',
      detail: ['About three and a half feet of water in the hold, and water between decks.'],
      sources: ['src-american-heritage', 'src-maryceleste-net'],
      reading: { supports: ['t-sinking'], weakens: [], note: 'Enough to worry a crew, but manageable for a ship her size: the men who sailed her to Gibraltar pumped her dry.' } },
    { id: 'e-pump', status: 'record', title: 'The dismantled pump',
      detail: ['One of the two {{ref:pump|pumps}} was partly taken apart, with a sounding rod nearby.'],
      sources: ['src-rmg', 'src-smithsonian'],
      reading: { supports: ['t-sinking'], weakens: [], note: 'Someone may have been trying to measure, or clear, the water.' } },
    { id: 'e-sails', status: 'record', title: 'Sails and rigging',
      detail: ['Only a few sails were set. Two had blown away, and the rigging was damaged.'],
      sources: ['src-maryceleste-net', 'src-rmg'],
      reading: { supports: [], weakens: [], note: 'Signs of rough weather, before or after they left.' } },
    { id: 'e-cargo-food', status: 'record', title: 'Cargo and food',
      detail: ['The cargo was nearly all there, with food and water for about six months.'],
      sources: ['src-maryceleste-net', 'src-smithsonian'],
      reading: { supports: [], weakens: ['t-mutiny'], note: 'Nothing of value was taken, which weakens mutiny and makes piracy unlikely.' } },
    { id: 'e-belongings', status: 'record', title: 'Belongings left behind',
      detail: ["The crew's belongings were still in their quarters."],
      sources: ['src-rmg', 'src-american-heritage'],
      reading: { supports: ['t-sinking', 't-explosion'], weakens: [], note: 'They left in a hurry, or expected to come back.' } },
    { id: 'e-galley', status: 'record', title: 'The galley',
      detail: ['Nothing to eat or drink on the table, no meal being prepared, and the stove knocked out of place.'],
      sources: ['src-maryceleste-net'],
      reading: { supports: [], weakens: [], note: 'No sign of a sudden vanishing during a meal. This record is what disproves the warm-breakfast legend.' } },
    { id: 'e-findings', status: 'record', title: "The inquiry's findings",
      detail: ['The inquiry in {{ref:gibraltar|Gibraltar}} turned up no evidence of foul play.'],
      sources: ['src-smithsonian'],
      reading: { supports: [], weakens: ['t-mutiny', 't-salvage-murder', 't-fraud'], note: 'Weakens every theory of murder or fraud.' } },

    // Disputed
    { id: 'e-course-change', status: 'disputed', title: 'The turn north',
      detail: ['The day before the last note, the captain turned north of Santa Maria island.'],
      dispute: { claim: 'He turned north of Santa Maria to seek shelter.', challenge: "The turn is in Solly-Flood's copy of the log. Why he made it is a modern guess." },
      sources: ['src-smithsonian'],
      reading: { supports: ['t-sinking'], weakens: [], note: 'If he was seeking shelter, he was already worried.' } },
    { id: 'e-empty-barrels', status: 'disputed', title: 'The empty barrels',
      detail: ['Nine of the 1,701 barrels were found empty when the cargo was unloaded in Genoa.'],
      dispute: { claim: 'Alcohol vapour from the empty barrels filled the hold.', challenge: 'The nine were red oak, which is more porous, and the consul at Genoa saw nothing unusual in nine empty barrels.' },
      sources: ['src-maryceleste-net', 'src-ucl'],
      reading: { supports: ['t-explosion'], weakens: [], note: 'The key evidence for the explosion theory, and its weakest point.' } },
    { id: 'e-sword', status: 'disputed', title: 'The sword',
      detail: ["Marks on the captain's sword were examined during the inquiry."],
      dispute: { claim: 'The stains were blood, a sign of murder.', challenge: 'Tests found the stains were not blood.' },
      sources: ['src-american-heritage', 'src-rmg'],
      reading: { supports: [], weakens: ['t-mutiny'], note: 'Without blood, the main physical sign of violence disappears.' } },
    { id: 'e-bow-marks', status: 'disputed', title: 'The marks on the bow',
      detail: ["Cuts were found on the ship's bow."],
      dispute: { claim: 'They were made on purpose, perhaps to fake a collision.', challenge: 'A US Navy captain judged them the work of the sea.' },
      sources: ['src-wikipedia'],
      reading: { supports: [], weakens: ['t-mutiny', 't-fraud'], note: 'The experts split, so the marks prove nothing either way.' } },
    { id: 'e-hatches', status: 'disputed', title: 'The open hatches',
      detail: ['The fore hatch and the lazarette hatch were open. The main hatch was closed.'],
      dispute: { claim: 'A burst of fumes blew the fore hatch open.', challenge: 'Why the hatches were open is not known.' },
      sources: ['src-american-heritage', 'src-smithsonian'],
      reading: { supports: ['t-explosion'], weakens: [], note: 'Open hatches fit the explosion theory, but they could have been opened for many reasons.' } },

    // Legend
    { id: 'e-legend-breakfast', status: 'legend', title: 'The warm breakfast',
      detail: ['Breakfast half-eaten on the table, tea still warm.'],
      origin: 'Added by storytellers in the years after. A newspaper was printing a dinner "scarcely cold" by 1883, a year before Conan Doyle\'s story, which has no meal at all.',
      sources: ['src-american-heritage', 'src-wikipedia', 'src-maryceleste-net'],
      reading: { supports: [], weakens: [], note: 'Not in the record.' } },
    { id: 'e-legend-name', status: 'legend', title: '"Marie Celeste"',
      detail: ['The ship was called the Marie Celeste.'],
      origin: "Conan Doyle's spelling in his 1884 story. Her real name was Mary Celeste.",
      sources: ['src-doyle', 'src-maryceleste-net'],
      reading: { supports: [], weakens: [], note: 'Not in the record.' } },
    { id: 'e-legend-boats', status: 'legend', title: 'Boats still aboard',
      detail: ['Her lifeboats were still hanging in place.'],
      origin: "Conan Doyle's 1884 story. No boat was found aboard.",
      sources: ['src-doyle', 'src-maryceleste-net'],
      reading: { supports: [], weakens: [], note: 'Not in the record.' } },
    { id: 'e-legend-full-sail', status: 'legend', title: 'Full sail',
      detail: ['She was found sailing under full sail.'],
      origin: 'Later retellings. A newspaper claimed in 1883 that every sail was set. Only a few were.',
      sources: ['src-wikipedia', 'src-maryceleste-net'],
      reading: { supports: [], weakens: [], note: 'Not in the record.' } },
    { id: 'e-legend-towed', status: 'legend', title: 'Towed into port',
      detail: ['The Dei Gratia towed her into Gibraltar.'],
      origin: "Conan Doyle's 1884 story. In fact Deveau and two sailors sailed her in.",
      sources: ['src-doyle', 'src-maryceleste-net'],
      reading: { supports: [], weakens: [], note: 'Not in the record.' } },
    { id: 'e-legend-cat', status: 'legend', title: "The ship's cat",
      detail: ['A cat was found aboard when she was discovered.'],
      origin: 'Later retellings. There was a cat aboard in New York, but the testimony does not say whether it was still there.',
      sources: ['src-maryceleste-net'],
      reading: { supports: [], weakens: [], note: 'Not in the record.' } },
    { id: 'e-legend-unnatural', status: 'legend', title: 'Something unnatural',
      detail: ['Sea monsters, aliens or other supernatural causes.'],
      origin: 'Popular speculation. There is no evidence at all.',
      sources: ['src-rmg'],
      reading: { supports: [], weakens: [], note: 'Not in the record.' } },
  ],

  sources: [
    { id: 'src-rmg', kind: 'secondary', title: 'The mystery of the Mary Celeste',
      url: 'https://www.rmg.co.uk/stories/maritime-history/mystery-mary-celeste',
      citation: 'Royal Museums Greenwich, "The mystery of the Mary Celeste"' },
    { id: 'src-maryceleste-net', kind: 'secondary', title: 'The Mary Celeste: Facts not fiction',
      url: 'https://www.maryceleste.net/facts.htm',
      citation: "maryceleste.net, \"The Mary Celeste: Facts not fiction\", drawing on Charles Edey Fay's 1942 study" },
    { id: 'src-smithsonian', kind: 'secondary', title: 'Abandoned Ship: The Mary Celeste',
      url: 'https://www.smithsonianmag.com/history/abandoned-ship-the-mary-celeste-174488104',
      citation: 'Smithsonian Magazine, "Abandoned Ship: The Mary Celeste"' },
    { id: 'src-american-heritage', kind: 'secondary', title: 'The Mystery of the Mary Celeste',
      url: 'https://www.americanheritage.com/mystery-mary-celeste',
      citation: 'American Heritage, "The Mystery of the Mary Celeste", Vol. 32, Issue 2 (1981)' },
    { id: 'src-doyle', kind: 'fiction', title: "J. Habakuk Jephson's Statement",
      url: 'https://babel.hathitrust.org/cgi/pt?id=umn.319510019047482&seq=13',
      citation: "Arthur Conan Doyle, \"J. Habakuk Jephson's Statement\", The Cornhill Magazine, January 1884 (fiction, published anonymously)" },
    { id: 'src-ucl', kind: 'secondary', title: 'Solved: The Mystery of the Mary Celeste',
      url: 'https://www.ucl.ac.uk/news/2006/may/solved-mystery-mary-celeste',
      citation: 'UCL News, "Solved: The Mystery of the Mary Celeste", 20 May 2006' },
    { id: 'src-wikipedia', kind: 'secondary', title: 'Mary Celeste',
      url: 'https://en.wikipedia.org/wiki/Mary_Celeste',
      citation: 'Wikipedia, "Mary Celeste"' },
  ],

  references: [
    { id: 'mary-celeste', kind: 'ship', label: 'Mary Celeste', sources: ['src-rmg', 'src-maryceleste-net'],
      image: {
        src: refMaryCelesteImage,
        alt: 'Painting of a two-masted sailing ship with pale sails and a red flag on blue water, with a handwritten inscription along the bottom edge.',
        credit: 'The Mary Celeste as the Amazon, 1861. Artist unconfirmed. Public domain, via Wikimedia Commons.',
        isIllustration: false,
      },
      profile: ['A two-masted merchant ship, a brigantine. Built in Nova Scotia in 1861 under the name Amazon.', 'In 1872 she sailed from New York for Genoa with ten people aboard.'] },
    { id: 'dei-gratia', kind: 'ship', label: 'Dei Gratia', sources: ['src-rmg'],
      profile: ['The ship whose crew found the Mary Celeste drifting on 4 December 1872. Her captain was David Morehouse.'] },
    { id: 'benjamin-briggs', kind: 'person', label: 'Captain Benjamin Briggs', sources: ['src-rmg', 'src-maryceleste-net', 'src-smithsonian'],
      image: {
        src: refBenjaminBriggsImage,
        alt: 'Black-and-white photograph of a seated man with a short beard, wearing a dark buttoned jacket.',
        credit: 'Photograph, before 1872. Photographer unknown. Via Wikimedia Commons.',
        isIllustration: false,
      },
      profile: ['Captain of the Mary Celeste. An experienced, respected sailor who also owned a third of the ship, so losing her would have cost him money.', 'His wife and young daughter sailed with him.'] },
    { id: 'sarah-briggs', kind: 'person', label: 'Sarah Briggs', sources: ['src-rmg', 'src-maryceleste-net'],
      image: {
        src: refSarahBriggsImage,
        alt: 'Black-and-white photograph of a seated woman with her hair pulled back, wearing a striped dress with a dark belt.',
        credit: 'Photograph, before 1872. Photographer unknown. Via Wikimedia Commons.',
        isIllustration: false,
      },
      profile: ['Wife of Captain Briggs. She sailed with him, together with their two-year-old daughter.'] },
    { id: 'sophia-briggs', kind: 'person', label: 'Sophia Briggs', sources: ['src-rmg', 'src-maryceleste-net'],
      image: {
        src: refSophiaBriggsImage,
        alt: 'Black-and-white photograph of a baby in a pale dress sitting in a dark upholstered chair.',
        credit: 'Photograph, before 1872. Photographer unknown. Via Wikimedia Commons.',
        isIllustration: false,
      },
      profile: ["The Briggses' two-year-old daughter. Her brother Arthur, seven, stayed home in Massachusetts with his grandmother."] },
    { id: 'albert-richardson', kind: 'person', label: 'Albert Richardson', sources: ['src-rmg', 'src-maryceleste-net'],
      profile: ['First mate of the Mary Celeste, and a man Captain Briggs knew well.'] },
    { id: 'david-morehouse', kind: 'person', label: 'David Morehouse', sources: ['src-rmg', 'src-smithsonian', 'src-american-heritage'],
      profile: ['Captain of the Dei Gratia. His crew claimed salvage money for bringing the Mary Celeste in, which later made him a suspect.', 'The court found no evidence of foul play.'] },
    { id: 'oliver-deveau', kind: 'person', label: 'Oliver Deveau', sources: ['src-rmg', 'src-american-heritage'],
      profile: ['First mate of the Dei Gratia. He led the boarding party and sailed the Mary Celeste to Gibraltar.', 'His sworn testimony is one of our main sources.'] },
    { id: 'solly-flood', kind: 'person', label: 'Frederick Solly-Flood', sources: ['src-rmg', 'src-american-heritage'],
      profile: ["Attorney General of Gibraltar, the Crown's lawyer at the inquiry.", 'Convinced early on that there had been murder, he kept arguing it as the evidence turned against him.'] },
    { id: 'genoa', kind: 'place', label: 'Genoa', sources: ['src-rmg'],
      profile: ["A port city in northwestern Italy, and the Mary Celeste's destination."] },
    { id: 'azores', kind: 'place', label: 'Azores',
      profile: ['A group of Portuguese islands in the middle of the Atlantic, roughly 1,400 km west of mainland Portugal.'] },
    { id: 'santa-maria', kind: 'place', label: 'Santa Maria', sources: ['src-maryceleste-net'],
      profile: ['The southernmost island of the Azores. The last note on the log slate put it six miles away.'] },
    { id: 'gibraltar', kind: 'place', label: 'Gibraltar', sources: ['src-rmg', 'src-maryceleste-net'],
      image: {
        src: refGibraltarImage,
        alt: 'Old printed map of the Gibraltar peninsula, with Gibraltar Bay on the left and the Mediterranean on the right.',
        credit: 'Map of Gibraltar, from A History of Gibraltar and its Sieges (1870). Public domain, via Wikimedia Commons.',
        isIllustration: false,
      },
      profile: ['A British territory at the southern tip of Spain, where the inquiry was held.'] },
    { id: 'log-slate', kind: 'term', label: 'log slate', sources: ['src-rmg', 'src-maryceleste-net'],
      profile: ['A board for rough notes. Sailors wrote positions and times on it during the day, then copied them into the logbook.', 'The last note never made it into the logbook.'] },
    { id: 'alcohol', kind: 'term', label: 'high-grade alcohol', sources: ['src-rmg', 'src-maryceleste-net', 'src-smithsonian'],
      profile: ['Strong alcohol, shipped for industry and for fortifying wine.', 'Whether it was fit to drink is disputed, and that question matters for one of the theories.'] },
    { id: 'pump', kind: 'term', label: 'pumps', sources: ['src-rmg'],
      profile: ['Ships pumped seawater out of their hold. A sounding rod, found nearby, measures how much water is inside.'] },
    { id: 'lifeboat', kind: 'term', label: 'lifeboat', sources: ['src-rmg', 'src-american-heritage'],
      profile: ['A small open boat carried for emergencies. The Mary Celeste had one, and it was gone.'] },
    { id: 'chronometer', kind: 'term', label: 'chronometer', sources: ['src-rmg'],
      profile: ['A very accurate clock that navigators used to work out their position. Without one, a captain struggles to know how far east or west he is.'] },
  ],

  historiansSummary: [
    'No one knows for sure what happened. The inquiry in Gibraltar turned up no evidence of foul play.',
    'Two theories are most often put forward: the captain feared the ship was sinking, or feared the cargo would explode. Both say the ten left in the lifeboat, expecting to return or reach land, and were lost.',
    'No evidence for mutiny, murder for salvage or insurance fraud has ever been found.',
  ],

  closeThreshold: 6,

  // Positions from maryceleste.net, "Facts not fiction", item 15 (the slate position is worked out there,
  // not given in the testimony). West and south are negative.
  voyage: {
    points: [
      { id: 'new-york', label: 'New York', lat: 40.7, lon: -74.0, chapter: 's-voyage', kind: 'port' },
      { id: 'last-log', label: 'Last log entry', lat: 36.93, lon: -27.33, chapter: 's-last-entry', kind: 'record' },
      { id: 'last-slate', label: 'The last slate note', lat: 37.02, lon: -25.02, chapter: 's-last-entry', kind: 'record' },
      { id: 'found', label: 'Found adrift', lat: 38.33, lon: -17.25, chapter: 's-found', kind: 'found' },
      { id: 'gibraltar', label: 'Gibraltar', lat: 36.14, lon: -5.35, chapter: 's-inquiry', kind: 'port' },
      { id: 'genoa', label: 'Genoa, never reached', lat: 44.41, lon: 8.93, chapter: 's-voyage', kind: 'port', unreached: true },
    ],
  },

  theme: {
    id: 'mary-celeste-theme',
    ambientAudio: undefined,
    sounds: undefined,
    // Generated in code (src/lib/sound): the open sea under the story; a quiet room, a lamp and the sea far away at
    // the desk.
    ambience: {
      story: ['sea', 'wind', 'timber'],
      desk: ['room-tone', 'lamp-hum', 'distant-sea'],
      // A ship's bell, far away, once, as the Dei Gratia sights her.
      cues: [{ chapter: 's-found', sound: 'ships-bell' }]
    },
    // Everything recovered from the sea (dread pass, 1): a sailcloth board, salt and tide stains.
    materials: { board: 'sailcloth', stains: 'salt' },
    ...(music === undefined ? {} : { playlists: music.playlists })
  }
};

export default maryCeleste;

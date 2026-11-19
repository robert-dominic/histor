// src/cases/mary-celeste/case.ts
import type { Case } from '@/types/case';
import refBenjaminBriggsImage from './assets/images/ref-benjamin-briggs.webp';
import refGibraltarImage from './assets/images/ref-gibraltar.webp';
import refMaryCelesteImage from './assets/images/ref-mary-celeste.webp';
import refSarahBriggsImage from './assets/images/ref-sarah-briggs.webp';
import refSophiaBriggsImage from './assets/images/ref-sophia-briggs.webp';
import aboardImage from './assets/images/s-aboard.webp';
import foundImage from './assets/images/s-found.webp';
import inquiryImage from './assets/images/s-inquiry.webp';
import lastEntryImage from './assets/images/s-last-entry.webp';
import questionImage from './assets/images/s-question.webp';
import voyageImage from './assets/images/s-voyage.webp';
import legendVideoPoster from './assets/video/legend-night-poster.webp';
import legendVideoSrc from './assets/video/legend-night.mp4';

/**
 * The Mary Celeste (1872).
 * The legend intro, the story, the central question, the references and their sources are real content,
 * from docs/content/mary-celeste-story.md and docs/content/mary-celeste-evidence.md. Image credits come from docs/content/mary-celeste-scenes.md.
 * The theories, evidence and historians' summary are real content, copied from docs/content/mary-celeste-evidence.md.
 * The fork's wording comes from product.md.
 */
export const maryCeleste: Case = {
  id: 'mary-celeste',
  title: 'The Mary Celeste',
  year: 1872,
  yearEnd: 1873,
  unsolved: true,
  teaser: 'A ship found sailing with no one aboard. Ten people, never seen again.',

  legendIntro: {
    lines: [
      'December 1872. A ship is found drifting in the Atlantic.',
      'Not a soul aboard.',
      "In the captain's cabin, breakfast is laid out.",
      'Half-eaten. The tea is still warm.',
      'As if everyone simply vanished.',
    ],
    stamp: 'Legend',
    debunk: 'Well... that part never happened. The men who boarded her found nothing to eat or drink on the table. The famous "warm breakfast" was invented by storytellers in the years that followed.',
  },

  story: [
    {
      id: 's-voyage',
      image: {
        src: voyageImage,
        alt: 'Painting of a tall sailing ship under full sail on choppy green water, with smaller boats around it and a red stone fort on the shore.',
        credit: 'Painting by Edward Moran, c. 1870. Not the Mary Celeste. Public domain, via Wikimedia Commons.',
        isIllustration: false,
      },
      kicker: 'New York, November 1872',
      heading: 'Ten people set sail',
      body: [
        'In November 1872, the {{ref:mary-celeste|Mary Celeste}}, a small merchant ship, left New York for {{ref:genoa|Genoa}}, Italy.',
        'In her hold: 1,701 barrels of {{ref:alcohol|high-grade alcohol}}. On board: ten people.',
        'Her captain, {{ref:benjamin-briggs|Benjamin Briggs}}, was an experienced sailor. He had brought his family along: his wife, {{ref:sarah-briggs|Sarah}}, and their two-year-old daughter, {{ref:sophia-briggs|Sophia}}. Their seven-year-old son stayed home for school.',
        'The other seven were the crew: first mate {{ref:albert-richardson|Albert Richardson}}, second mate Andrew Gilling, the steward and cook, William Head, and four seamen: the brothers Volkert and Boz Lorenzen, Arian Martens and Gottlieb Goodschaal.',
      ],
      hook: 'Not one of them would ever be seen again.',
      rollCall: [
        { name: 'Benjamin Briggs', role: 'captain' },
        { name: 'Sarah Briggs', role: 'his wife' },
        { name: 'Sophia Briggs', role: 'their daughter, aged two' },
        { name: 'Albert Richardson', role: 'first mate' },
        { name: 'Andrew Gilling', role: 'second mate' },
        { name: 'William Head', role: 'steward and cook' },
        { name: 'Volkert Lorenzen', role: 'seaman' },
        { name: 'Boz Lorenzen', role: 'seaman' },
        { name: 'Arian Martens', role: 'seaman' },
        { name: 'Gottlieb Goodschaal', role: 'seaman' },
      ],
    },
    {
      id: 's-last-entry',
      image: {
        src: lastEntryImage,
        alt: 'Painting of a small ship with a slanted sail riding a large wave beside a rocky shore, under a hazy orange sun.',
        credit: 'Painting by Ivan Aivazovsky, 1896. Not the Mary Celeste. Public domain, via Wikimedia Commons.',
        isIllustration: false,
      },
      kicker: 'Near the Azores, 24–25 November',
      heading: 'Six miles from land',
      body: [
        "On 24 November, near the {{ref:azores|Azores}}, a group of islands in the middle of the Atlantic, someone made the last entry in the ship's logbook.",
        'Weather records suggest the wind rose hard that night.',
        'In the morning, someone wrote one more line on the {{ref:log-slate|log slate}}, the board for rough notes: "Eastern point of St. Mary\'s bore 6 miles SSW." St. Mary\'s was {{ref:santa-maria|Santa Maria}} island. Land was six miles away.',
      ],
      hook: 'Then the writing stops.',
    },
    {
      id: 's-found',
      image: {
        src: foundImage,
        alt: 'Painting of a two-masted sailing ship with pale sails and a red flag on calm blue water, seen from the side.',
        credit: 'The Mary Celeste as the Amazon, 1861. Artist unconfirmed. Public domain, via Wikimedia Commons.',
        caption: 'The Mary Celeste, 1861',
        isIllustration: false,
      },
      kicker: '4 December 1872',
      heading: 'She kept sailing',
      body: [
        'Nine days later, the crew of the {{ref:dei-gratia|Dei Gratia}}, another ship crossing the Atlantic, saw a vessel on the horizon, drifting under a few sails.',
        'If her people left soon after that last note, she had sailed on alone for nine days, hundreds of miles past the island on the slate.',
        'Their captain, {{ref:david-morehouse|David Morehouse}}, sent his first mate, {{ref:oliver-deveau|Oliver Deveau}}, across in a boat.',
      ],
      hook: 'It was the Mary Celeste. {{ref:mary-celeste|She}} was empty.',
    },
    {
      id: 's-aboard',
      image: {
        src: aboardImage,
        alt: "A wet, empty wooden ship's deck under a grey sky, with coiled ropes, an open hatch and a mast.",
        credit: 'AI-generated (Google Gemini).',
        isIllustration: true,
      },
      kicker: 'What the boarders found',
      heading: 'Everything, except the people',
      body: [
        'Deveau climbed aboard. No one was there.',
        'Not the captain. Not Sarah. Not little Sophia. Not one of the seven crew.',
        "The ship herself was sound. The cargo was nearly all there. There was food and water for six months. In the crew's quarters, their belongings lay where they had left them.",
        'But some things were wrong. Water sloshed in the hold, three and a half feet deep. One of the {{ref:pump|pumps}} had been pulled half apart. In the galley, the stove had been knocked out of place. Two sails had blown away.',
        "And some things were missing. The only {{ref:lifeboat|lifeboat}}. The captain's {{ref:chronometer|chronometer}}, his sextant, his navigation book, the ship's papers.",
      ],
      hook: 'It looked as if they had left on purpose.',
    },
    {
      id: 's-inquiry',
      image: {
        src: inquiryImage,
        alt: 'Engraving of the Rock of Gibraltar seen across a bay, with a town at its foot, small sailing boats on the water and three people sitting on the shore.',
        credit: 'Engraving by J.H. Mann, 1870. U.S. Naval History and Heritage Command. Public domain, via Wikimedia Commons.',
        isIllustration: false,
      },
      kicker: 'Gibraltar, December 1872',
      heading: 'Murder?',
      body: [
        'Deveau and two sailors brought her 600 nautical miles to {{ref:gibraltar|Gibraltar}}, where a court spent more than two months on the case.',
        "The Crown's lawyer, {{ref:solly-flood|Frederick Solly-Flood}}, believed there had been murder. He pointed to faint marks on Captain Briggs's sword, and cuts on the ship's bow.",
        'Tests showed the marks were not blood. No proof of violence was ever found. Not one body was ever found.',
        "The court paid the Dei Gratia's crew for bringing her in, but only a small sum. Some writers read it as a sign that suspicion lingered.",
      ],
      hook: 'The case was closed. The question was not.',
    },
    {
      id: 's-question',
      image: {
        src: questionImage,
        alt: 'Painting of a dark, cloudy night at sea, with moonlight on the waves, a small boat pulled up on the beach and two ships far off on the horizon.',
        credit: 'Painting by Ivan Aivazovsky, 1885. Not the Mary Celeste. Public domain, via Wikimedia Commons.',
        isIllustration: false,
      },
      kicker: 'The question',
      heading: 'Why?',
      body: [
        'Most accounts agree that the ten left the ship on purpose, in the small lifeboat, and were lost at sea.',
        "That explains where they went. It doesn't explain why they went.",
      ],
    },
  ],

  centralQuestion:
    'Why would Captain Briggs abandon a sound ship, one he partly owned, and put his wife, his two-year-old daughter and his crew into a small lifeboat in the middle of the Atlantic?',

  fork: {
    prompt: 'Most people stop here. Want to see what the evidence says?',
    investigateLabel: 'Open the case files',
    leaveLabel: "I've heard enough",
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
    legendVideo: {
      src: legendVideoSrc,
      poster: legendVideoPoster,
      credit: 'AI-generated illustration (Google Gemini)'
    }
  }
};

export default maryCeleste;

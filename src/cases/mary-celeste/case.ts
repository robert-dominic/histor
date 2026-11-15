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
 * copied from docs/content/mary-celeste-story.md. Image credits come from docs/content/mary-celeste-scenes.md.
 * The fork, theories, evidence and historians' summary are still placeholders, marked "TODO: real content".
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
    debunk:
      'Well... that part never happened. The men who boarded her found nothing to eat or drink on the table. The famous "warm breakfast" grew out of a short story Arthur Conan Doyle published in 1884, and the retellings that followed it.',
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
        'The other seven were the crew.',
      ],
      hook: 'Not one of them would ever be seen again.',
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
        'In the morning, someone wrote one more line on the {{ref:log-slate|log slate}}, the board for rough notes: {{ref:santa-maria|Santa Maria}} island, six miles away.',
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
        "The Crown's lawyer, {{ref:solly-flood|Frederick Solly-Flood}}, believed there had been murder. He pointed to faint marks on the captain's sword, and cuts on the ship's bow.",
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
    prompt: 'TODO: real content - continue investigating?',
    investigateLabel: 'TODO: real content - label for investigate button',
    leaveLabel: 'TODO: real content - label for leave button'
  },

  theories: [
    {
      id: 't-1',
      title: 'TODO: real content - theory title',
      claim: 'TODO: real content - one-line theory claim',
      standing: 'leading',
      standingReason: 'TODO: real content - why historians rate this theory'
    }
  ],

  evidence: [
    {
      id: 'e-1',
      title: 'TODO: real content - evidence title',
      detail: [
        'TODO: real content - evidence detail paragraph 1',
        'TODO: real content - evidence detail paragraph 2'
      ],
      sources: ['src-1'],
      reading: {
        supports: ['t-1'],
        weakens: [],
        note: 'TODO: real content - how historians read this'
      },
      status: 'record'
    }
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
    // Placeholder: the placeholder evidence below still points to this source.
    {
      id: 'src-1',
      title: 'TODO: real content - source title',
      kind: 'testimony',
      author: 'TODO: real content - author name',
      year: 1872,
      url: 'https://example.com/mary-celeste',
      citation: 'TODO: real content - citation if available',
    },
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
    'TODO: real content - historian summary paragraph 1',
    'TODO: real content - historian summary paragraph 2'
  ],

  closeThreshold: 1,

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

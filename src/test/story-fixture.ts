// src/test/story-fixture.ts
// The Mary Celeste's story as it was before the new story text (docs/content/mary-celeste-story.md): chapters with
// hooks, a crew list, the apparition, the central question and a fork with two choices. The story engine still
// supports all of these, and its tests (Story.test.tsx) exercise them on this fixture. The real case has none of them.
import { maryCeleste } from '@/cases/mary-celeste/case';
import foundImage from '@/cases/mary-celeste/assets/images/s-found.webp';
import inquiryImage from '@/cases/mary-celeste/assets/images/s-inquiry.webp';
import lastEntryImage from '@/cases/mary-celeste/assets/images/s-last-entry.webp';
import questionImage from '@/cases/mary-celeste/assets/images/s-question.webp';
import voyageImage from '@/cases/mary-celeste/assets/images/s-voyage.webp';
import type { Case } from '@/types/case';

const parts = {
  story: [
    {
      id: 's-voyage',
      emphasis: ['ten people', 'two-year-old daughter'],
      image: {
        src: voyageImage,
        alt: 'Painting of a tall sailing ship under full sail on choppy green water, with smaller boats around it and a red stone fort on the shore.',
        credit: 'A tall ship under full sail, painted by Edward Moran around 1870. Not the Mary Celeste. Public domain, via Wikimedia Commons.',
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
      rollCallTitle: 'Crew list · Mary Celeste · Nov. 1872',
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
      emphasis: ['last entry', 'six miles'],
      image: {
        src: lastEntryImage,
        alt: 'Painting of a small ship with a slanted sail riding a large wave beside a rocky shore, under a hazy orange sun.',
        credit: 'A small ship on a large wave by a rocky shore, painted by Ivan Aivazovsky in 1896. Not the Mary Celeste. Public domain, via Wikimedia Commons.',
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
      emphasis: ['Nine days later', 'alone for nine days'],
      image: {
        src: foundImage,
        alt: 'Painting of a two-masted sailing ship with pale sails and a red flag on calm blue water, seen from the side.',
        // The caption is no longer shown on the image: what it said is in the credit (two fixes, 1).
        credit: 'The ship as the Amazon, her original name, painted in 1861. Artist unconfirmed. Public domain, via Wikimedia Commons.',
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
      emphasis: ['No one was there.', 'Not little Sophia.', 'three and a half feet deep'],
      image: {
        src: foundImage,
        alt: "A wet, empty wooden ship's deck under a grey sky, with coiled ropes, an open hatch and a mast.",
        credit: "An empty, wet ship's deck. An AI illustration made with Google Gemini in 2026, not a picture from the time.",
        isIllustration: true,
      },
      // The eye may open in the dark bulwark on the right, away from the page (dread pass, 4).
      eyeZones: [{ x: 80, y: 45, w: 16, h: 22 }],
      // Once per visit, a faint shadow crosses the empty deck while the page is written (dread pass, 6).
      apparition: { silhouette: 'figure', direction: 'right-to-left', delay: 1.6 },
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
      emphasis: ['not blood', 'Not one body was ever found.'],
      image: {
        src: inquiryImage,
        alt: 'Engraving of the Rock of Gibraltar seen across a bay, with a town at its foot, small sailing boats on the water and three people sitting on the shore.',
        credit: 'The Rock of Gibraltar seen across the bay, engraved by J.H. Mann in 1870. U.S. Naval History and Heritage Command. Public domain, via Wikimedia Commons.',
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
      emphasis: ['why they went'],
      image: {
        src: questionImage,
        alt: 'Painting of a dark, cloudy night at sea, with moonlight on the waves, a small boat pulled up on the beach and two ships far off on the horizon.',
        credit: 'A cloudy night at sea, painted by Ivan Aivazovsky in 1885. Not the Mary Celeste. Public domain, via Wikimedia Commons.',
        isIllustration: false,
      },
      // The eye may open in the storm clouds, top right, away from the page (dread pass, 4).
      eyeZones: [{ x: 62, y: 8, w: 26, h: 20 }],
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
  centralQuestionEmphasis: ['his two-year-old daughter', 'in the middle of the Atlantic'],
  centralQuestionLines: [
    'Why would Captain Briggs abandon a sound ship,',
    'one he partly owned, and put his wife,',
    'his two-year-old daughter',
    'and his crew into a small lifeboat',
    'in the middle of the Atlantic?',
  ],

  fork: {
    prompt: 'Most people stop here. Want to see what the evidence says?',
    investigateLabel: 'Open the case files',
    leaveLabel: "I've heard enough",
  }
} satisfies Partial<Case>;

export const storyFixture: Case = { ...maryCeleste, ...parts, fork: { ...parts.fork, body: undefined } };

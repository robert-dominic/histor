# Mary Celeste: the real story (draft 3, fact-checked)

Part 1 is the story as a reader sees it. **Bold** words are portals: tap one and a small card opens. Part 2 is the same content as data, for `src/cases/mary-celeste/case.ts`.

Draft 3 applies every fix from the `histor-content-reviewer` agent's report (15 Nov 2026): 62 claims checked, 49 confirmed, 12 too strong, 1 wrong. Each fix softens a claim to what the sources actually support.

---

## Part 1: The story

### 1. New York, November 1872: Ten people set sail

In November 1872, the **Mary Celeste**, a small merchant ship, left New York for **Genoa**, Italy.

In her hold: 1,701 barrels of **high-grade alcohol**. On board: ten people.

Her captain, **Benjamin Briggs**, was an experienced sailor. He had brought his family along: his wife, **Sarah**, and their two-year-old daughter, **Sophia**. Their seven-year-old son stayed home for school.

The other seven were the crew.

> *Not one of them would ever be seen again.*

### 2. Near the Azores, 24–25 November: Six miles from land

On 24 November, near the **Azores**, a group of islands in the middle of the Atlantic, someone made the last entry in the ship's logbook.

Weather records suggest the wind rose hard that night.

In the morning, someone wrote one more line on the **log slate**, the board for rough notes: **Santa Maria** island, six miles away.

> *Then the writing stops.*

### 3. 4 December 1872: She kept sailing

Nine days later, the crew of the **Dei Gratia**, another ship crossing the Atlantic, saw a vessel on the horizon, drifting under a few sails.

If her people left soon after that last note, she had sailed on alone for nine days, hundreds of miles past the island on the slate.

Their captain, **David Morehouse**, sent his first mate, **Oliver Deveau**, across in a boat.

> *It was the Mary Celeste. **She** was empty.*

### 4. What the boarders found: Everything, except the people

Deveau climbed aboard. No one was there.

Not the captain. Not Sarah. Not little Sophia. Not one of the seven crew.

The ship herself was sound. The cargo was nearly all there. There was food and water for six months. In the crew's quarters, their belongings lay where they had left them.

But some things were wrong. Water sloshed in the hold, three and a half feet deep. One of the **pumps** had been pulled half apart. In the galley, the stove had been knocked out of place. Two sails had blown away.

And some things were missing. The only **lifeboat**. The captain's **chronometer**, his sextant, his navigation book, the ship's papers.

> *It looked as if they had left on purpose.*

### 5. Gibraltar, December 1872: Murder?

Deveau and two sailors brought her 600 nautical miles to **Gibraltar**, where a court spent more than two months on the case.

The Crown's lawyer, **Frederick Solly-Flood**, believed there had been murder. He pointed to faint marks on the captain's sword, and cuts on the ship's bow.

Tests showed the marks were not blood. No proof of violence was ever found. Not one body was ever found.

The court paid the Dei Gratia's crew for bringing her in, but only a small sum. Some writers read it as a sign that suspicion lingered.

> *The case was closed. The question was not.*

### 6. The question: Why?

Most accounts agree that the ten left the ship on purpose, in the small lifeboat, and were lost at sea.

That explains where they went. It doesn't explain why they went.

**Central question** (shown at full night, from product.md):
*Why would Captain Briggs abandon a sound ship, one he partly owned, and put his wife, his two-year-old daughter and his crew into a small lifeboat in the middle of the Atlantic?*

### The portals

| Portal | Kind | What the card says |
| --- | --- | --- |
| Mary Celeste / She | Ship | A two-masted merchant ship, a brigantine. Built in Nova Scotia in 1861 under the name Amazon. In 1872 she sailed from New York for Genoa with ten people aboard. |
| Dei Gratia | Ship | The ship whose crew found the Mary Celeste drifting on 4 December 1872. Her captain was David Morehouse. |
| Benjamin Briggs | Person | Captain of the Mary Celeste. An experienced, respected sailor who also owned a third of the ship, so losing her would have cost him money. His wife and young daughter sailed with him. |
| Sarah | Person | Sarah Briggs, wife of the captain. She sailed with him, together with their two-year-old daughter. |
| Sophia | Person | Sophia Briggs, the couple's two-year-old daughter. Her brother Arthur, seven, stayed home in Massachusetts with his grandmother. |
| David Morehouse | Person | Captain of the Dei Gratia. His crew claimed salvage money for bringing the Mary Celeste in, which later made him a suspect. The court found no evidence of foul play. |
| Oliver Deveau | Person | First mate of the Dei Gratia. He led the boarding party and sailed the Mary Celeste to Gibraltar. His sworn testimony is one of our main sources. |
| Frederick Solly-Flood | Person | Attorney General of Gibraltar, the Crown's lawyer at the inquiry. Convinced early on that there had been murder, he kept arguing it as the evidence turned against him. |
| Genoa | Place | A port city in northwestern Italy, and the Mary Celeste's destination. |
| Azores | Place | A group of Portuguese islands in the middle of the Atlantic, roughly 1,400 km west of mainland Portugal. |
| Santa Maria | Place | The southernmost island of the Azores. The last note on the log slate put it six miles away. |
| Gibraltar | Place | A British territory at the southern tip of Spain, where the inquiry was held. |
| log slate | Term | A board for rough notes. Sailors wrote positions and times on it during the day, then copied them into the logbook. The last note never made it into the logbook. |
| high-grade alcohol | Term | Strong alcohol, shipped for industry and for fortifying wine. Whether it was fit to drink is disputed, and that question matters for one of the theories. |
| pumps | Term | Ships pumped seawater out of their hold. A sounding rod, found nearby, measures how much water is inside. |
| lifeboat | Term | A small open boat carried for emergencies. The Mary Celeste had one, and it was gone. |
| chronometer | Term | A very accurate clock that navigators used to work out their position. Without one, a captain struggles to know how far east or west he is. |

---

## Part 2: The data

For `src/cases/mary-celeste/case.ts`. Replace the `story`, `centralQuestion`, `references` and `sources` placeholders. Leave theories and evidence as they are for now.

```ts
centralQuestion:
  'Why would Captain Briggs abandon a sound ship, one he partly owned, and put his wife, his two-year-old daughter and his crew into a small lifeboat in the middle of the Atlantic?',

story: [
  {
    id: 's-voyage',
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
    kicker: 'The question',
    heading: 'Why?',
    body: [
      'Most accounts agree that the ten left the ship on purpose, in the small lifeboat, and were lost at sea.',
      "That explains where they went. It doesn't explain why they went.",
    ],
  },
],

references: [
  { id: 'mary-celeste', kind: 'ship', label: 'Mary Celeste', sources: ['src-rmg', 'src-maryceleste-net'],
    profile: ['A two-masted merchant ship, a brigantine. Built in Nova Scotia in 1861 under the name Amazon.', 'In 1872 she sailed from New York for Genoa with ten people aboard.'] },
  { id: 'dei-gratia', kind: 'ship', label: 'Dei Gratia', sources: ['src-rmg'],
    profile: ['The ship whose crew found the Mary Celeste drifting on 4 December 1872. Her captain was David Morehouse.'] },
  { id: 'benjamin-briggs', kind: 'person', label: 'Captain Benjamin Briggs', sources: ['src-rmg', 'src-maryceleste-net', 'src-smithsonian'],
    profile: ['Captain of the Mary Celeste. An experienced, respected sailor who also owned a third of the ship, so losing her would have cost him money.', 'His wife and young daughter sailed with him.'] },
  { id: 'sarah-briggs', kind: 'person', label: 'Sarah Briggs', sources: ['src-rmg', 'src-maryceleste-net'],
    profile: ['Wife of Captain Briggs. She sailed with him, together with their two-year-old daughter.'] },
  { id: 'sophia-briggs', kind: 'person', label: 'Sophia Briggs', sources: ['src-rmg', 'src-maryceleste-net'],
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
],
```

Notes:
- If the placeholder evidence still points at old source ids, keep those sources too, so the validator passes.
- Removed after review: "the captain had turned north toward Santa Maria" (one documentary's reconstruction) and "in a hurry" (sources disagree).
- The central question stays as written in product.md. Note that it assumes the captain gave the order to leave, which no source proves; it is posed as a question, not a claim.
# Mary Celeste: evidence, theories and story update (draft 1)

For review by `histor-content-reviewer`, then for `src/cases/mary-celeste/case.ts`.

Part 1 is readable. Part 2 is the data. Every item comes from the Mary Celeste study brief; nothing is new research. Each evidence file has one status: **Record** (sworn testimony or official records of the time), **Disputed** (claimed, but challenged), or **Legend** (invented or added later).

---

## Part 1: Readable version

### Story update (chapter 1)

Replace "The other seven were the crew." with:

> The other seven were the crew: first mate **Albert Richardson**, second mate Andrew Gilling, Edward Head, who was steward and cook, and four seamen: the brothers Volkert and Boz Lorenzen, Arian Martens and Gottlieb Goodschaal.

New portal: **Albert Richardson**: First mate of the Mary Celeste, and a man Captain Briggs knew well.

### The theories (5)

| # | Theory | The claim | Historians' standing |
| --- | --- | --- | --- |
| 1 | She was sinking | A clogged pump and a mistaken position made the captain believe the ship was sinking. After a stormy night, with land close, he ordered everyone into the lifeboat. | **Leading.** It fits the water in the hold, the dismantled pump and the missing instruments. But the water was manageable for a ship her size, and the position error is a modern reconstruction. |
| 2 | Fear of explosion | Fumes from the alcohol cargo flared or burst, and the crew fled in the lifeboat, meaning to return once it was safe. | **Leading.** A 2006 experiment showed such a blast could leave no scorch marks. But no fumes were reported, the empty barrels may simply have leaked, and accounts disagree on the hatches. |
| 3 | Drunken mutiny | The crew drank the cargo, killed the captain, his family and the officers, and escaped in the lifeboat. | **Rejected.** Drinking the cargo is doubtful, the stains on the sword were not blood, and nothing of value was taken. |
| 4 | Murder for salvage | The Dei Gratia's crew killed everyone aboard to claim the ship as salvage. | **Rejected.** The court found no evidence, and the reward was small. |
| 5 | Insurance fraud | The captain and others staged the loss to collect the insurance. | **Rejected.** Briggs owned part of the ship and had his wife and daughter aboard. No evidence of a plot was ever found. |

### The evidence files (23)

**Record (11)**

| File | What it says | Historians' reading |
| --- | --- | --- |
| No one aboard | All ten people were gone. No bodies were ever found. | The starting point. It points to no theory on its own. |
| The missing lifeboat | The ship's only lifeboat was gone, and no boat was found aboard. | The people most likely left on purpose, in the lifeboat. Supports sinking, explosion and mutiny alike. |
| Instruments and papers gone | The chronometer, sextant, navigation book and ship's papers were missing. | Whoever left took what they needed to navigate, which points to a planned departure ordered by the captain. |
| The last note on the slate | The log slate's final note, on the morning of 25 November, put Santa Maria island six miles away. | It tells us roughly when and where they left: close to land. Supports the sinking theory. |
| Water in the hold | About three and a half feet of water in the hold, and more between decks. | Enough to worry a crew, but historians call it manageable for a ship her size. Supports sinking, with a caveat. |
| The dismantled pump | One of the two pumps was partly taken apart, with a sounding rod nearby. | Someone was checking how much water was in the hold. Supports sinking. |
| Sails and rigging | Only a few sails were set. Two had blown away, and the rigging was damaged. | Signs of rough weather. Supports sinking. |
| Cargo and food | The cargo was nearly all there, with food and water for about six months. | Nothing of value was taken, which weakens mutiny and rules out piracy. |
| Belongings left behind | The crew's belongings were still in their quarters. | They left without their things, as if they expected to come back. Supports sinking and explosion. |
| The galley | Nothing to eat or drink on the table, no meal being prepared, and the stove knocked out of place. | No sign of a sudden vanishing during a meal. This record is what disproves the warm-breakfast legend. |
| The inquiry's verdict | The Gibraltar court found no evidence of foul play. | Weakens every theory of murder or fraud. |

**Disputed (5)**

| File | The claim | The challenge | Historians' reading |
| --- | --- | --- | --- |
| The course change | The day before the last note, the captain changed course toward Santa Maria, perhaps seeking shelter. | This comes from a modern reading of the inquiry notes, not from the logbook itself. | If true, it supports the sinking theory: he was heading for land. |
| The empty barrels | Nine of the 1,701 barrels were found empty, so alcohol vapour may have filled the hold. | The nine were made of red oak, which is more porous. They may simply have leaked. | The key evidence for the explosion theory, and its weakest point. |
| The sword | Stains on the captain's sword were blood, a sign of murder. | Tests found the stains were not blood. | Weakens the mutiny theory. |
| The marks on the bow | Cuts on the bow were made on purpose, perhaps to fake a collision. | They were later judged to be ordinary wear and weather damage. | Weakens mutiny and fraud. |
| The hatches | The cargo hatches were found open, as if someone had aired the hold. | Other accounts say the main hatch was securely closed. | If open, it supports the explosion theory. |

**Legend (7)**

| File | What people believe | Where it came from |
| --- | --- | --- |
| The warm breakfast | Breakfast half-eaten on the table, tea still warm. | Conan Doyle's 1884 short story and the retellings after it. The record says there was nothing on the table. |
| "Marie Celeste" | The ship was called the Marie Celeste. | Conan Doyle's spelling in his 1884 story. Her real name was Mary Celeste. |
| Boats still aboard | Her lifeboats were still hanging in place. | Conan Doyle's story. No boat was found aboard. |
| Full sail | She was found sailing under full sail. | Later retellings. Only a few sails were set. |
| No one at the wheel | She sailed into Gibraltar with nobody at the wheel. | Conan Doyle's story. Deveau and two sailors brought her in. |
| The ship's cat | A cat was found aboard, and a hatch cover lay upside down. | Later retellings. The testimony mentions neither. |
| Something unnatural | Sea monsters, aliens or other supernatural causes. | Popular speculation. There is no evidence at all. |

### Where historians stand (shown at the end)

- No one knows for sure what happened. The court in Gibraltar found no evidence of foul play.
- Two theories lead today: the captain feared the ship was sinking, or feared the cargo would explode. Both say the ten left in the lifeboat, expecting to return or reach land, and were lost.
- Mutiny, murder for salvage and insurance fraud have all been rejected.

---

## Part 2: The data

Story update for chapter 1, `story[0].body[3]`:

```ts
'The other seven were the crew: first mate {{ref:albert-richardson|Albert Richardson}}, second mate Andrew Gilling, Edward Head, who was steward and cook, and four seamen: the brothers Volkert and Boz Lorenzen, Arian Martens and Gottlieb Goodschaal.',
```

New reference:

```ts
{ id: 'albert-richardson', kind: 'person', label: 'Albert Richardson', sources: ['src-rmg', 'src-maryceleste-net'],
  profile: ['First mate of the Mary Celeste, and a man Captain Briggs knew well.'] },
```

New sources (add to `sources`; URLs to be confirmed by the reviewer, never guessed):

```ts
{ id: 'src-doyle', kind: 'fiction', title: "J. Habakuk Jephson's Statement",
  url: 'https://babel.hathitrust.org/cgi/pt?id=umn.319510019047482&seq=13',
  citation: "Arthur Conan Doyle, \"J. Habakuk Jephson's Statement\", The Cornhill Magazine, January 1884 (fiction, published anonymously)" },
{ id: 'src-ucl', kind: 'secondary', title: 'Solved: mystery of the Mary Celeste',
  citation: 'UCL News, "Solved: mystery of the Mary Celeste", 2006 (experiment by chemist Andrea Sella)' },
```

Theories:

```ts
theories: [
  { id: 't-sinking', title: 'She was sinking', standing: 'leading',
    claim: 'A clogged pump and a mistaken position made the captain believe the ship was sinking. After a stormy night, with land close, he ordered everyone into the lifeboat.',
    standingReason: 'It fits the water in the hold, the dismantled pump and the missing instruments. But the water was manageable for a ship her size, and the position error is a modern reconstruction.' },
  { id: 't-explosion', title: 'Fear of explosion', standing: 'leading',
    claim: 'Fumes from the alcohol cargo flared or burst, and the crew fled in the lifeboat, meaning to return once it was safe.',
    standingReason: 'A 2006 experiment showed such a blast could leave no scorch marks. But no fumes were reported, the empty barrels may simply have leaked, and accounts disagree on the hatches.' },
  { id: 't-mutiny', title: 'Drunken mutiny', standing: 'rejected',
    claim: 'The crew drank the cargo, killed the captain, his family and the officers, and escaped in the lifeboat.',
    standingReason: 'Drinking the cargo is doubtful, the stains on the sword were not blood, and nothing of value was taken.' },
  { id: 't-salvage-murder', title: 'Murder for salvage', standing: 'rejected',
    claim: "The Dei Gratia's crew killed everyone aboard to claim the ship as salvage.",
    standingReason: 'The court found no evidence, and the reward was small.' },
  { id: 't-fraud', title: 'Insurance fraud', standing: 'rejected',
    claim: 'The captain and others staged the loss to collect the insurance.',
    standingReason: 'Briggs owned part of the ship and had his wife and daughter aboard. No evidence of a plot was ever found.' },
],
```

Evidence:

```ts
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
    reading: { supports: ['t-sinking', 't-explosion'], weakens: [], note: 'Whoever left took what they needed to navigate, which points to a planned departure ordered by the captain.' } },
  { id: 'e-last-note', status: 'record', title: 'The last note on the slate',
    detail: ["The {{ref:log-slate|log slate}}'s final note, on the morning of 25 November, put {{ref:santa-maria|Santa Maria}} island six miles away."],
    sources: ['src-maryceleste-net', 'src-rmg'],
    reading: { supports: ['t-sinking'], weakens: [], note: 'It tells us roughly when and where they left: close to land.' } },
  { id: 'e-water', status: 'record', title: 'Water in the hold',
    detail: ['About three and a half feet of water in the hold, and more between decks.'],
    sources: ['src-american-heritage', 'src-maryceleste-net'],
    reading: { supports: ['t-sinking'], weakens: [], note: 'Enough to worry a crew, but historians call it manageable for a ship her size.' } },
  { id: 'e-pump', status: 'record', title: 'The dismantled pump',
    detail: ['One of the two {{ref:pump|pumps}} was partly taken apart, with a sounding rod nearby.'],
    sources: ['src-rmg'],
    reading: { supports: ['t-sinking'], weakens: [], note: 'Someone was checking how much water was in the hold.' } },
  { id: 'e-sails', status: 'record', title: 'Sails and rigging',
    detail: ['Only a few sails were set. Two had blown away, and the rigging was damaged.'],
    sources: ['src-maryceleste-net', 'src-rmg'],
    reading: { supports: ['t-sinking'], weakens: [], note: 'Signs of rough weather.' } },
  { id: 'e-cargo-food', status: 'record', title: 'Cargo and food',
    detail: ['The cargo was nearly all there, with food and water for about six months.'],
    sources: ['src-maryceleste-net', 'src-smithsonian'],
    reading: { supports: [], weakens: ['t-mutiny'], note: 'Nothing of value was taken, which weakens mutiny and rules out piracy.' } },
  { id: 'e-belongings', status: 'record', title: 'Belongings left behind',
    detail: ["The crew's belongings were still in their quarters."],
    sources: ['src-rmg', 'src-american-heritage'],
    reading: { supports: ['t-sinking', 't-explosion'], weakens: [], note: 'They left without their things, as if they expected to come back.' } },
  { id: 'e-galley', status: 'record', title: 'The galley',
    detail: ['Nothing to eat or drink on the table, no meal being prepared, and the stove knocked out of place.'],
    sources: ['src-maryceleste-net'],
    reading: { supports: [], weakens: [], note: 'No sign of a sudden vanishing during a meal. This record is what disproves the warm-breakfast legend.' } },
  { id: 'e-verdict', status: 'record', title: "The inquiry's verdict",
    detail: ['The court in {{ref:gibraltar|Gibraltar}} found no evidence of foul play.'],
    sources: ['src-rmg', 'src-american-heritage'],
    reading: { supports: [], weakens: ['t-mutiny', 't-salvage-murder', 't-fraud'], note: 'Weakens every theory of murder or fraud.' } },

  // Disputed
  { id: 'e-course-change', status: 'disputed', title: 'The course change',
    detail: ['The day before the last note, the captain may have changed course toward Santa Maria.'],
    dispute: { claim: 'He changed course toward Santa Maria, perhaps seeking shelter.', challenge: 'This comes from a modern reading of the inquiry notes, not from the logbook itself.' },
    sources: ['src-smithsonian'],
    reading: { supports: ['t-sinking'], weakens: [], note: 'If true, he was heading for land.' } },
  { id: 'e-empty-barrels', status: 'disputed', title: 'The empty barrels',
    detail: ['Nine of the 1,701 barrels were found empty when the cargo was unloaded in Genoa.'],
    dispute: { claim: 'Alcohol vapour from the empty barrels filled the hold.', challenge: 'The nine were made of red oak, which is more porous. They may simply have leaked.' },
    sources: ['src-maryceleste-net', 'src-ucl'],
    reading: { supports: ['t-explosion'], weakens: [], note: 'The key evidence for the explosion theory, and its weakest point.' } },
  { id: 'e-sword', status: 'disputed', title: 'The sword',
    detail: ["Marks on the captain's sword were examined during the inquiry."],
    dispute: { claim: 'The stains were blood, a sign of murder.', challenge: 'Tests found the stains were not blood.' },
    sources: ['src-american-heritage', 'src-rmg'],
    reading: { supports: [], weakens: ['t-mutiny'], note: 'Without blood, the main physical sign of violence disappears.' } },
  { id: 'e-bow-marks', status: 'disputed', title: 'The marks on the bow',
    detail: ["Cuts were found on the ship's bow."],
    dispute: { claim: 'They were made on purpose, perhaps to fake a collision.', challenge: 'They were later judged to be ordinary wear and weather damage.' },
    sources: ['src-american-heritage'],
    reading: { supports: [], weakens: ['t-mutiny', 't-fraud'], note: 'No sign of a staged accident.' } },
  { id: 'e-hatches', status: 'disputed', title: 'The hatches',
    detail: ['Accounts disagree about whether the cargo hatches were open or shut.'],
    dispute: { claim: 'The cargo hatches were found open, as if someone had aired the hold.', challenge: 'Other accounts say the main hatch was securely closed.' },
    sources: ['src-rmg', 'src-smithsonian'],
    reading: { supports: ['t-explosion'], weakens: [], note: 'If they were open, it fits the explosion theory.' } },

  // Legend
  { id: 'e-legend-breakfast', status: 'legend', title: 'The warm breakfast',
    detail: ['Breakfast half-eaten on the table, tea still warm.'],
    origin: "Arthur Conan Doyle's 1884 short story and the retellings that followed. The record says there was nothing on the table.",
    sources: ['src-doyle', 'src-maryceleste-net'],
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
    origin: 'Later retellings. Only a few sails were set.',
    sources: ['src-maryceleste-net'],
    reading: { supports: [], weakens: [], note: 'Not in the record.' } },
  { id: 'e-legend-wheel', status: 'legend', title: 'No one at the wheel',
    detail: ['She sailed into Gibraltar with nobody at the wheel.'],
    origin: "Conan Doyle's 1884 story. Deveau and two sailors brought her in.",
    sources: ['src-doyle', 'src-rmg'],
    reading: { supports: [], weakens: [], note: 'Not in the record.' } },
  { id: 'e-legend-cat', status: 'legend', title: "The ship's cat",
    detail: ['A cat was found aboard, and a hatch cover lay upside down.'],
    origin: 'Later retellings. The testimony mentions neither.',
    sources: ['src-maryceleste-net'],
    reading: { supports: [], weakens: [], note: 'Not in the record.' } },
  { id: 'e-legend-unnatural', status: 'legend', title: 'Something unnatural',
    detail: ['Sea monsters, aliens or other supernatural causes.'],
    origin: 'Popular speculation. There is no evidence at all.',
    sources: ['src-rmg'],
    reading: { supports: [], weakens: [], note: 'Not in the record.' } },
],

historiansSummary: [
  'No one knows for sure what happened. The court in Gibraltar found no evidence of foul play.',
  'Two theories lead today: the captain feared the ship was sinking, or feared the cargo would explode. Both say the ten left in the lifeboat, expecting to return or reach land, and were lost.',
  'Mutiny, murder for salvage and insurance fraud have all been rejected.',
],

closeThreshold: 6,
```

Notes for the reviewer:
- Counts: 11 record, 5 disputed, 7 legend = 23 files.
- "The inquiry's verdict" is a new record file not in the study brief; check it against the sources.
- Check every "Historians' reading" note: it must not claim more than the sources support.
- The Doyle URL came from the Royal Museums Greenwich article's own link. Confirm it. Find the UCL URL.
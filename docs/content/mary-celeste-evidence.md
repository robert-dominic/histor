# Mary Celeste: evidence, theories and story update (draft 2, fact-checked)

Draft 2 applies every fix from the `histor-content-reviewer` report (15 Nov 2026): 33 items checked, 15 confirmed, 14 too strong, 4 wrong.

## What changed from draft 1

- **The warm breakfast did not come from Conan Doyle.** His 1884 story has no meal in it. Other storytellers added the meal, and a newspaper printed a dinner "scarcely cold" in 1883, a year before Doyle. Fixed in the legend file, the live intro debunk and product.md.
- **"No one at the wheel"** had no source. It is replaced by a real Doyle invention: the ship being **towed** into port.
- **The hatches:** accounts describe different hatches. The fore and lazarette hatches were open; the main hatch was closed. Only *why* is unknown.
- **The course change:** the turn is in Solly-Flood's copy of the log. Its reason is the guess.
- The steward is **William Head** ("Edward" was a guess). Softer wording for every "Too strong" item, and Wikipedia added as a source where facts came only from there.

Counts: 11 record, 5 disputed, 7 legend = 23 files. 5 theories.

---

## The data

For `src/cases/mary-celeste/case.ts`.

Story update, `story[0].body[3]`:

```ts
'The other seven were the crew: first mate {{ref:albert-richardson|Albert Richardson}}, second mate Andrew Gilling, the steward and cook, William Head, and four seamen: the brothers Volkert and Boz Lorenzen, Arian Martens and Gottlieb Goodschaal.',
```

Legend intro debunk (replaces the current one; fixes the Doyle error):

```ts
debunk: 'Well... that part never happened. The men who boarded her found nothing to eat or drink on the table. The famous "warm breakfast" was invented by storytellers in the years that followed.',
```

New reference:

```ts
{ id: 'albert-richardson', kind: 'person', label: 'Albert Richardson', sources: ['src-rmg', 'src-maryceleste-net'],
  profile: ['First mate of the Mary Celeste, and a man Captain Briggs knew well.'] },
```

New sources:

```ts
{ id: 'src-doyle', kind: 'fiction', title: "J. Habakuk Jephson's Statement",
  url: 'https://babel.hathitrust.org/cgi/pt?id=umn.319510019047482&seq=13',
  citation: "Arthur Conan Doyle, \"J. Habakuk Jephson's Statement\", The Cornhill Magazine, January 1884 (fiction, published anonymously)" },
{ id: 'src-ucl', kind: 'secondary', title: 'Solved: The Mystery of the Mary Celeste',
  url: 'https://www.ucl.ac.uk/news/2006/may/solved-mystery-mary-celeste',
  citation: 'UCL News, "Solved: The Mystery of the Mary Celeste", 20 May 2006' },
{ id: 'src-wikipedia', kind: 'secondary', title: 'Mary Celeste',
  url: 'https://en.wikipedia.org/wiki/Mary_Celeste',
  citation: 'Wikipedia, "Mary Celeste"' },
```

Theories:

```ts
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

historiansSummary: [
  'No one knows for sure what happened. The inquiry in Gibraltar turned up no evidence of foul play.',
  'Two theories are most often put forward: the captain feared the ship was sinking, or feared the cargo would explode. Both say the ten left in the lifeboat, expecting to return or reach land, and were lost.',
  'No evidence for mutiny, murder for salvage or insurance fraud has ever been found.',
],

closeThreshold: 6,
```
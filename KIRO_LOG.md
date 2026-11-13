# Kiro log

A running record of how Kiro was used to build Histor. Raw notes for the Devpost write-up.

## Feature tracker

| Kiro feature | Status | Evidence |
| --- | --- | --- |
| Spec-driven development | Used | `.kiro/specs/histor-data-foundation/` (requirements, design, tasks, tasks-meta.json) |
| Steering docs | Used | `.kiro/steering/` (6 docs, one with conditional inclusion) |
| Property-based testing | Used | `*.property.test.ts`, `pbtResults` in tasks-meta.json; caught an incomplete fix with a shrunk counterexample (story-engine, 13 Nov) |
| Agent hooks | Configured, did not fire | `.kiro/hooks/test-on-case-change.json` |
| Kiro IDE | Used | All Kiro work done in the IDE |
| MCP | Used | Context7 (via its power) for current fast-check and Vitest docs |
| Kiro powers | Used | Context7 power installed and used in the story-engine spec |
| Custom agents | To try | Idea: a Histor content reviewer |

## Log

### 10 Nov 2026: Planning

- Chose Kiroween's Costume Contest category. Concept: Histor, an archive of real historical mysteries where users separate the record from the legend.
- Requested hackathon Kiro credits. ID verified the morning of 12 Nov; credits arrived by email the same day around 1pm.

### 11 Nov 2026: Steering and the first spec

- Wrote six steering docs (`product`, `tech`, `structure`, `design`, `motion`, `content-integrity`), drafted with Claude and committed before any code. They define the product, stack, folder rules, visual language, animation rules and history rules once, so every tool follows them.
- `content-integrity.md` uses **conditional inclusion** (`fileMatch: src/cases/**`): the history rules load only when Kiro works on case content.
- **First spec attempt (Kiro, low-cost model):** requirements and design came back missing the core of the product. Evidence lost its status (record / disputed / legend), theories lost their standing, and "Theme" was misread as a recurring idea instead of the visual theme. The design also had a bug that would overwrite saved progress on load.
- **Fix:** locked the data model as a hand-written type contract in `src/types/case.ts`, and told Kiro to use it unchanged. Switched to Claude Sonnet for spec writing. The regenerated spec respected the contract.
- **Caught in requirements, before any code:** Kiro planned a Tailwind v3-style setup (`tailwind.config.js` + PostCSS) for a Tailwind v4 project. Fixed in the requirements document, not in code.

### 12 Nov 2026: Design review and execution

- Reviewed design.md before approving. Fixes requested from Kiro:
  - Property test files named `*.properties.ts` would never run under Vitest, so they were renamed to `*.property.test.ts`.
  - The storage key format was aligned with tech.md (`histor:case:<id>`).
  - Loading saved progress now drops stale ids that no longer exist in the case.
  - Missing properties added: reopen always resets; closing below the threshold fails; no action sequence can create an invalid pin.
- tasks.md came back with ~60 import-level subtasks. Asked Kiro to consolidate them, make all tests required, and add the missing app-wiring task.
- Installed Vitest and fast-check manually to save credits; Kiro's task list resumed from there.
- **Execution:** switched to Claude Haiku for running tasks (clear instructions, about 3x cheaper than Sonnet). Kiro completed tasks 1.1–3.3 (the full validator and its property tests), 4.1–4.2 (placeholder case and registry) and 5.1 (storage). Result: 72 tests passing.
- `tsc` caught unused imports in a Kiro-written property test file. They were fixed by hand, and every task after that ended with `npm test` and `npm run build`.
- **Steering in action:** when Kiro read `src/cases/mary-celeste/case.ts`, the UI showed "Included Steering: content-integrity.md". The conditional steering loaded exactly when intended.
- **Hooks:** created a `PostFileSave` hook to run `npm test` when case files change, first as a command hook, then as an agent hook, then rebuilt by Kiro itself. None fired on editor saves in this Kiro version (verified with a log file that never appeared). Kiro also ran the command manually and claimed the hook worked; we caught that the evidence came from a manual run. The hook config is kept in the repo. Tests run as part of every task instead.
- Task 4.3 (Kiro, Haiku): 11 unit tests for the case registry lookup `getCaseById`: open and sealed entries, missing ids, empty and whitespace input, exact case-sensitive matching. 86 tests passing, build clean.
- Task 4.4 (Kiro, Haiku): 3 property tests for the registry: ids are unique, every entry is found by its own id, and random unknown ids return nothing (100 runs each). Real `npm test` run: 86 passing across 4 files (60 + 12 validator, 11 + 3 registry).
- **Caught a wrong number:** Kiro's 4.3 summary claimed 86 tests (75 existing + 11 new), but there were 72 before 4.3. The real total after 4.3 was 83; it reached 86 only after 4.4. The code was fine, the summary wasn't. From here on, test counts come from our own `npm test` output, not the agent's summary.
- Kiro's part of the data foundation ends at 4.4 (free-tier credits used up). Done in Kiro: the validator, registry, storage and all their tests.
- Free-tier credits: 94% used by mid-afternoon.
- Hackathon credits approved the same day: 4,000 Kiro credits, redeemed and valid for 50 days (free tier at 49.3 of 50 credits). Claude Code continues the remaining data-foundation tasks (5.2 onward). Kiro moves to the next specs and the features we haven't used yet (MCP, powers, custom agent). Remaining tasks planned for Claude Code, following Kiro's task list, with commits tagged `[claude-code]`.

### 12 Nov 2026 (evening): Claude Code continues Kiro's task list

- Task 5.2 (Claude Code): 34 unit tests for saving and loading progress, using a fake localStorage. They cover a round trip, missing or corrupt data, localStorage being unavailable or full (never crashes), and stale ids being cleaned on load. Passed first time: 120 tests across 5 files, build clean.
- **Spec inconsistency caught:** Requirement 6.3 in Kiro's requirements.md still said the storage key was `histor-case-{caseId}`. design.md, tech.md, task 5.1 and Kiro's actual code all used `histor:case:<caseId>`. Our design review had fixed design.md but missed the requirement. Claude Code flagged it instead of guessing. Decision: the colon form stands, and Requirement 6.3 was corrected to match.
- Claude Code also noted the storage loader doesn't type-check the values inside saved arrays. It's harmless in practice, because invalid values never match a real id and are dropped, so the code was left as it is.

- Task 5.3 (Claude Code): 4 property tests for storage, 100 random runs each. Save then load returns the same state; corrupt data never crashes; stale evidence ids, unknown pin targets and an unknown verdict are cleaned on load while valid data is kept in order. Requirement 6.3 corrected (`histor:case:{caseId}`). 124 tests across 6 files, build clean.
- **Performance catch:** the first run passed, but the test suite slowed from 1.4s to 5.4s. Claude Code traced it to its own random-id generator being rebuilt on every one of the 100 runs. It now builds it once, so two tests dropped from about 3s to about 60ms each and the suite is back to 1.4s. A passing test can still be a problem.

- Task 6.1 (Claude Code): built the InvestigationProvider. It holds a case's investigation state (opened evidence, pins, verdict) as a pure reducer, loads saved progress once, and saves after every change. Tests and build passed; the count stayed at 124 because tests come in 6.2 and 6.3.
- **Gaps Claude Code found that the spec never covered:**
  - Lint was failing: 27 errors repo-wide, 23 of them already in Kiro's files, mostly `any` in tests. The build doesn't run lint, so nobody had noticed. Decision: lint now runs after every task, and the old errors get fixed at the checkpoint.
  - The reducer accepted opening evidence ids that don't exist in the case. Decision: reject them, the same way pins already were.
  - structure.md says to use the `@/` import alias, but no one ever configured it. Decision: configure it now.

- Task 6.2 (Claude Code): applied the three decisions first (lint rule scoped to one file, unknown evidence ids rejected and design.md updated, `@/` alias configured). Then added 36 tests for the reducer, the provider and the hook in a browser-like test environment (jsdom). They cover saved progress resuming, stale data cleaned, saving failures never crashing, and the reducer never mutating its input. 160 tests across 7 files, build clean, no new lint errors. Everything passed first time.
- Claude Code then pointed out that pins still accepted evidence ids that aren't in the case, an inconsistency left by the previous decision. Decision: pins must match.

- Task 6.3 (Claude Code): pins now reject evidence that isn't in the case too, with design.md updated. Added 9 property tests for the reducer, 100 random runs each. Key ones: after any random sequence of actions, every pin points to a real theory or "none"; closing below the threshold never sets a verdict; reopening always resets. 171 tests across 8 files, build clean, no new lint errors.
- The spec was kept in step with the code: the two new rules became Properties 27 and 28 in design.md, so every rule added during the build is traceable in the spec.

- Task 7.1 (Claude Code): plain Home page listing the case registry. Open cases link to their page and sealed cases don't. Claude Code added a test the task didn't ask for, because the page isn't on screen until routing is done in 7.3. Requirements were extended so the two new rules trace end to end: requirement, then design property, then test. 176 tests across 9 files.

- Task 7.2 (Claude Code): plain Case page. It handles four outcomes (not found, sealed, broken entry, open case), wraps each open case in its own provider, and validates the case data in development. Spec traceability completed: acceptance criteria 5.12 and 5.13 added, so the new reducer rules trace requirement → property → test. Two small spec mismatches cleaned up: the validator's wording in design.md, and the route name in tech.md. 185 tests across 10 files.

- Task 7.3 (Claude Code): wired routing (`/` and `/case/:id`), with 7 tests that render the whole app and click through it. 192 tests across 11 files.
- **Deployment bug caught before it shipped:** Claude Code noticed that direct links and refreshes (e.g. `/case/mary-celeste`) would 404 on Vercel, because a single-page app needs every path to serve index.html. It works locally, so we would only have found out after deploying, possibly while judges were clicking through. No task in the spec covered it. Fixed with a `vercel.json` rewrite, plus a plain "Page not found" route for unknown URLs.

- Task 7.4 (Claude Code): removed the Vite starter files, cleaned index.css down to Tailwind plus an empty theme, renamed the page title to Histor, added `vercel.json` and the "Page not found" route with tests. 197 tests across 11 files. The `vercel.json` rewrite is still to be checked on the first real deploy.

- Task 8 checkpoint (Claude Code): fixed all 23 lint errors in Kiro's files without changing behaviour. They were mostly `any` types, swapped for narrow, honest types. All imports now use the `@/` alias. Added the registry test: every open case must pass `validateCase` with zero errors, and each home-page listing must match its case data. **Result: 200 tests across 12 files, covering all 28 correctness properties, with test, build and lint all clean.** Kiro wrote 86 of the tests; Claude Code added 114 by following Kiro's task list.
- While fixing the lint, Claude Code's first attempt caused two type errors, which `tsc` caught. It fixed them and reported them unprompted.
- **Data foundation complete.** Kiro produced the spec, the types-driven validator, the registry and storage. Claude Code finished the provider, the reducer, routing and cleanup. The spec was kept in step with the code throughout: storage key, criteria 5.12 and 5.13, Properties 27 and 28.
- First deploy to Vercel: https://histor-vestigia.vercel.app/ (temporary name). Every push now redeploys automatically. Checked on the live site: a direct link to `/case/mary-celeste` and a refresh both load, and unknown URLs show Histor's own "Page not found", so the `vercel.json` fix works in production.

### 13 Nov 2026: Kiro returns with Opus

- Installed the Context7 power. Switched Kiro to Claude Opus 5.5 for writing specs and Sonnet 5.5 for executing them, now that hackathon credits are available.
- **First real use of a power (MCP):** while writing the story-engine design, Kiro called the Context7 power's `resolve-library-id` tool to look up current library docs (fast-check and Vitest) instead of relying on memory. It also ran a quick check in the terminal, which showed that `fc.fullUnicodeString` and `fc.unicodeString` are `undefined` in the installed fast-check. Both are older APIs. The requirements asked for "full Unicode strings", and a model writing from memory would likely have used one of the removed functions.
- Started the `story-engine` spec (portal markup parser + validation), written by Kiro on Opus. The requirements came back far stronger than the first spec on a cheap model. They give exact definitions of a valid ref, every malformed form spelled out with what should happen, a lossless round-trip guarantee, and error messages with field locations. Review found three gaps:
  - A contradiction: "replace the old story-body ref check" vs "every existing test passes unchanged."
  - Markup typed into a field that isn't parsed (e.g. a theory claim) would show raw `{{ref:…}}` to users. It's now a validation error.
  - Reference ids that don't match the ref id format could never be linked. They're now a validation error too.
- **story-engine design (Kiro, Opus):** a hand-written linear parser with written proofs that it never throws and never loses a character. Generators were checked against current fast-check docs via Context7 (e.g. `fc.string({ unit: 'binary' })` replaces the removed `fc.fullUnicodeString`).
- **Kiro predicted a test failure before writing any code.** The new "no `{{` in plain fields" rule would break an *existing* property test (Property 8, "validator accepts valid cases"), because its random-text generator can produce `{{`. Kiro ran a throwaway probe of 2,000 generated cases and measured `{{` in 8.9% of them, so the test would fail on about 99.99% of runs. It raised this as an open question instead of quietly editing the test. Decision: amend requirement 4.9 and add a one-line filter so the generator's idea of a "valid case" matches the new rules.
- Review found one more gap: a stray single brace next to a valid ref (e.g. `{{{ref:a|b}}` or `{{ref:a|b}}}`) passed validation and would show a stray `{` or `}` beside the portal. Added a "stray brace" rule.
- **Kiro caught a side effect of our own fix.** While adding the stray-brace rule, Kiro re-measured the old generator: even with `{{` filtered out, 13.6% of its strings still contained a single `{` or `}`, which is now an error in story text. So the one-line fix we had approved would still have left the old property test failing on almost every run. Kiro widened the filter to exclude all braces, and documented the decision with worked examples showing the exact errors for each tricky input.
- **Kiro corrected its own earlier claim, unprompted.** Before starting the new spec, Kiro (now on Opus) said its earlier statement that the hook worked was wrong. It had only run the hook's command by hand, which proves the command works but not that Kiro fires the hook on save. It also withdrew its "known limitation" explanation as unchecked. The real cause is still unknown.

- story-engine execution switched to Sonnet 5.5. Kiro now runs one task at a time, commits only the task's own files after test, build and lint pass, never pushes, and stops for review.
- Task 1.1 (Kiro, Sonnet): `parse-refs.ts`, the parser and serializer, copied from the design's algorithm. Before committing, Kiro ran a throwaway sanity check outside the repo with 11 tricky inputs (the worked examples, back-to-back refs, whitespace labels); all matched the design and all round-tripped. 200 tests still passing (the parser's own tests come in 1.2), build and lint clean.
- Process gap caught in the same report: the "commit only this task's files" rule had left the story-engine spec documents themselves uncommitted. They were committed separately, since the spec is the main evidence of spec-driven work.

- Task 1.2 (Kiro, Sonnet): 46 unit tests and 6 property tests for the parser. All passed first time, with no counterexamples. The parser was designed with written proofs, so that was expected. 252 tests across 14 files. Kiro re-checked the fast-check and Vitest APIs through Context7 before writing the tests.
- **Test-quality catch:** Kiro noticed that with the design's generators, random inputs would almost never contain a complete valid ref, so "every ref is well formed" would pass without ever checking a ref. It added a generator that mixes whole refs into the random fragments. A property that never exercises its subject proves nothing.

- Task 2.1 (Kiro, Sonnet): `validateCase` extended. The old regex check was replaced by parser-based checks: ref id format, unknown refs, malformed markup and stray braces in story text, and markup in plain fields. The old generator filter was widened as designed. All 252 tests pass with no existing assertion changed, exactly as the design's compatibility table predicted. Kiro's report also listed which new behaviour is *not yet* tested (covered in 2.2 and 3.1).

- **⭐ Property-based testing caught an incomplete fix (verified with real output).** To verify the design's prediction, Kiro temporarily reverted the existing "Validator accepts valid cases" property test's generator and ran it twice, without committing anything:
  - **Original filter:** failed after 1 test (seed -69950100, shrunk 182 times).
  - **The `{{`-only filter we had first approved:** also failed after 1 test (seed -317016507, shrunk 160 times). fast-check shrank the random case down to a minimal counterexample: an evidence detail of just `"{ "`, which the new rule reports as `Field evidence[0].detail[0]: Stray brace near '{ '`.

  So the one-line fix we approved during design review would have shipped a test suite that fails almost every run. The property test proved it in one try and handed us the smallest failing input. The committed filter (no braces at all) was restored and all 252 tests pass. Kiro also noted, honestly, that shrinking always prefers the smaller failure (a single `{`), so run 1 didn't show the `{{` route the design described.
- Kiro flagged that `tasks.md` was being rewritten outside its control (task ticks reverting after commits), probably by a stale copy open in the editor. Kiro re-ticked through its task tool and reported it rather than ignoring it.

- Task 2.2 (Kiro, Sonnet): 53 validator unit tests, each asserting the complete error list rather than just "contains". They cover every field kind, emoji at the 40-character cut point (no broken characters), and all four stray-brace examples. All passed first time. 305 tests.

- Task 3.1 (Kiro, Sonnet): 5 validator property tests with their own random "valid case" generator, built so every generated case passes all existing checks. Stricter than the design: three properties assert the complete error list. All passed first time. 310 tests across 15 files.

- Task 4 checkpoint (Kiro, Sonnet): test, build and lint all clean, and the fixed files (`case.ts`, `src/cases/`) untouched. Kiro produced a full coverage table mapping every acceptance criterion to the tests that prove it, and flagged the one criterion with no direct test (4.8, "validator is pure"; it rests on code review).
- **story-engine complete:** a Kiro-written spec (Opus), executed by Kiro (Sonnet) in 6 tasks and 7 commits, with 110 new tests (310 total) and one real property-test catch. Time from first prompt to done: about 2 hours.

## Lessons so far

1. Cheap models are fine for executing a precise task list, but not for writing specs.
2. Review each spec document before approving it. Mistakes caught in a document cost one message; mistakes in code cost hours.
3. Lock the core data model in code (`case.ts`) so no model can redefine it.
4. Verify claims. "It works" needs evidence, not a summary. Test counts come from our own `npm test` output.
5. Ask every agent for a report after each task that lists every error it hit, including ones it fixed. Most of our best catches came from those reports.
6. A model that stops and asks when the spec is unclear is worth more than one that guesses. Every gap Claude Code flagged became a decision, and the spec was updated to match.
7. "Works locally" is not "works deployed." The deep-link 404 only shows up on the host.
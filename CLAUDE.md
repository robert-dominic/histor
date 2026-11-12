# Histor

An interactive archive of real historical mysteries, built for Kiroween 2026 (Costume Contest). First case: the Mary Celeste (1872).

## Read before any task

The project rules live in `.kiro/steering/`. They are the source of truth for every tool working in this repo. Read and follow all of them:

- `product.md`: what Histor is, the flow, UX principles
- `tech.md`: stack and technical rules
- `structure.md`: folders and conventions
- `design.md`: typography, evidence-status visuals, atmosphere
- `motion.md`: animation rules (GSAP)
- `content-integrity.md`: rules for historical content

For UI and animation work, also apply the `emil-design-eng` skill.

## Who owns what

- **Kiro** owns everything in `.kiro/` (steering, specs, hooks) and the data foundation: `src/types/case.ts`, the case registry, investigation state, storage, `validateCase` and their tests.
- **Claude Code** builds the interface: legend intro, story, portals, fork, board, verdict, styling and animation.

## Rules for Claude Code

1. Never edit files in `.kiro/` unless the owner asks.
2. Never change `src/types/case.ts` or the data-foundation code without asking first. If a change is needed, explain why and wait.
3. Never invent historical content. Case content comes from the owner. Use obvious placeholders (`TODO: real content`) if something is missing.
4. Before finishing a task, run `npm run build` and `npm test`, and check the result at 375px and 1440px wide.
5. Commit in small steps. Prefix commit messages with `[claude-code]` so the history shows which tool did which work.
---
inclusion: always
---

# Structure

## Folders

```
src/
  app/          router, layout, providers (investigation, audio)
  pages/        Home.tsx, Case.tsx
  features/
    legend/     legend intro and debunk stamp
    story/      scroll-driven story sections
    portals/    tappable references and their panels
    fork/       the central question and the two choices
    board/      theories, evidence files, pinning, threads
    verdict/    closing the case and the case report
  components/   shared UI (Stamp, CaseFile, Button, Panel)
  lib/          audio.ts, storage.ts, motion.ts (easing and duration tokens)
  styles/       tokens.css, effects.css
  types/        case.ts (all content types)
  cases/
    index.ts    registry of every case, in display order
    mary-celeste/
      case.ts   all content for this case, typed
      theme.css case colours and textures as CSS variables
      assets/
        images/
        audio/
```

## Rules

1. **One folder per case** under `src/cases/`. Everything a case needs lives in its folder. Adding a case means adding a folder and one line in `cases/index.ts`. No other code changes.
2. **Features never hard-code case content.** They read it from the case data. If a feature mentions "Mary Celeste" by name, it's a bug.
3. **Case data is TypeScript, not JSON**, so the compiler checks every case against the types in `src/types/case.ts`.
4. **References in story text** are written inline as `{{ref:<id>|<label>}}`, for example `{{ref:briggs|the captain}}`. The story renderer turns each one into a tappable portal trigger. Every `<id>` must exist in the case's `references`.
5. **Ids** are short kebab-case and stable: `briggs`, `gibraltar`, `e-lifeboat`, `t-feared-sinking`. Evidence ids start with `e-`, theories with `t-`.
6. **Components:** one component per file, PascalCase file names. Feature-only components stay inside their feature folder.
7. **Imports:** use the `@/` alias for `src/`.

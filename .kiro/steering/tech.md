---
inclusion: always
---

# Tech

## Stack

- **React 19 + TypeScript (strict) + Vite.** No server, no backend. The whole app is static.
- **React Router** for pages: `/` (home) and `/case/:caseId`.
- **GSAP** with `@gsap/react` (`useGSAP` for setup and cleanup). Plugins: ScrollTrigger (scroll story), SplitText (line and character reveals), ScrambleText (spinning numbers and glitching text), TextPlugin (typed text). All GSAP plugins are free.
- **Tailwind CSS v4** via `@tailwindcss/vite` for layout, spacing and responsiveness.
- **Plain CSS** in `src/styles/` for signature effects (ghost ink, stamps, paper, flicker) and for design tokens.
- **Audio:** a small in-house audio manager on the Web Audio API. No audio library unless a real problem needs one.
- **Deploy:** Vercel, static build.

## Rules

1. **No network at runtime** except loading fonts. All case content and assets ship with the app.
2. **State:** React context + `useReducer` for the investigation. No external state library.
3. **Persistence:** localStorage, one key per case (`histor:case:<caseId>`), always wrapped in try/catch. The app must work if storage is unavailable.
4. **Animation values never go in React state.** Animate with GSAP or CSS, writing to the element directly.
5. **Only animate `transform`, `opacity`, `filter` and `clip-path`.** Never animate width, height, top, left, margin or padding.
6. **Reduced motion:** every animation has a reduced version via `gsap.matchMedia()` or `@media (prefers-reduced-motion: reduce)`. Reduced means gentler, not none: keep fades, remove movement.
7. **Phones work, desktop first.** Test every feature at 375px and 1440px wide.
8. **Hover effects only behind** `@media (hover: hover) and (pointer: fine)`.
9. **Accessibility:** every interactive element is keyboard reachable with a visible focus state. Panels trap focus and close on Escape. Decorative motion is `aria-hidden`.
10. **Assets:** images as WebP or AVIF, under 300 KB each where possible. Audio as `.ogg` with `.mp3` fallback, under 300 KB per clip. Lazy-load anything below the first screen.
11. **Audio** never autoplays. It starts after the first user gesture, and a mute control is always visible.
12. **Types first:** all case content is typed (see `structure.md`). A case that doesn't type-check doesn't ship.

## Commands

- `npm run dev`: local dev server
- `npm run build`: production build (must pass with no type errors)
- `npm run preview`: preview the build

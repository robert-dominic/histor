// src/test/setup.ts
// Runs before every test file (vite.config.ts). jsdom's getComputedStyle is very slow, and GSAP reads it once for
// every element whose transform it animates. The story animates hundreds of hook letters (StoryWords.tsx), so
// for those spans only it is answered from their inline style, which is all jsdom has for them anyway (no CSS is
// loaded in tests). Every other element gets the real computed style. Not a mock: `vi.restoreAllMocks` keeps it.
if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
  const real = window.getComputedStyle.bind(window);
  const FAST = new Set(['hook-char']);
  window.getComputedStyle = (element: Element, pseudo?: string | null) =>
    pseudo == null && element instanceof HTMLElement && FAST.has(element.dataset.story ?? '') ? element.style : real(element, pseudo);
}

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

// jsdom lays nothing out, so every element's `offsetParent` is null. GSAP takes a null offsetParent to mean an element
// is hidden (display: none), and to read its transform it moves the element to the document's root and back, which
// silently drops the focus from anything inside it (a menu item the keyboard is on). A browser never does this for a
// visible element. Give every element in the document the parent a browser would report, so GSAP behaves as it does
// in a browser.
if (typeof HTMLElement !== 'undefined') {
  Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
    configurable: true,
    get(this: HTMLElement) {
      return this.isConnected ? this.parentElement : null;
    },
  });
}

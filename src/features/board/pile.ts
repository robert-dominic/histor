// src/features/board/pile.ts
// Helpers for the piles of pinned files under the theory notes on the desktop desk (TheoryPile.tsx).

/** The most edges of a pile that show, the top file included. */
export const PILE_EDGES = 4;

/**
 * A tab is picked up from a pile's panel: the panel stops clipping (it no longer scrolls, and its list keeps its
 * place), and its paper and the other tabs fade, so only the tab in the hand is left. `false` puts it back.
 */
export function carryOut(tab: HTMLElement, carrying: boolean): void {
  const panel = tab.closest<HTMLElement>('[data-board="pile-panel"]');
  const list = panel?.querySelector<HTMLElement>('[data-board="tabs"]');
  if (panel == null || list == null) {
    return;
  }
  if (carrying) {
    list.style.translate = `0 ${-panel.scrollTop}px`;
    tab.dataset.carried = 'true';
    panel.dataset.carrying = 'true';
  } else {
    delete panel.dataset.carrying;
    delete tab.dataset.carried;
    list.style.translate = '';
  }
}

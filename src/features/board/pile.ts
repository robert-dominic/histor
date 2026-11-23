// src/features/board/pile.ts
// Helpers for the cascades of pinned files under the theory notes on the desktop desk (TheoryCascade.tsx).

/**
 * A tab is picked up from a cascade that scrolls: the cascade stops clipping (it no longer scrolls, and its list keeps
 * its place), so the tab in the hand shows wherever it goes. `false` puts it back.
 */
export function carryOut(tab: HTMLElement, carrying: boolean): void {
  const scroller = tab.closest<HTMLElement>('[data-board="cascade-scroll"]');
  const list = scroller?.querySelector<HTMLElement>('[data-board="tabs"]');
  if (scroller == null || list == null) {
    return;
  }
  if (carrying) {
    list.style.translate = `0 ${-scroller.scrollTop}px`;
    tab.dataset.carried = 'true';
    scroller.dataset.carrying = 'true';
  } else {
    delete scroller.dataset.carrying;
    delete tab.dataset.carried;
    list.style.translate = '';
  }
}

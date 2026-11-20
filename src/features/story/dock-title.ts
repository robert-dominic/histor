// src/features/story/dock-title.ts
// The case title docks into the case header once the reader has scrolled the opening scene a little way out of
// view. The big title flies up to where the header's title sits, and the header fades in over it. Under reduced
// motion the title does not fly: the header just fades in. Docking happens once per page.
import gsap from 'gsap';
import { tween } from '@/lib/motion';

/** The share of the opening scene that has scrolled out of view when the title docks. */
export const DOCK_AT = 0.15;

/**
 * Calls `onDock` once, the first time `opening` has scrolled about 15% out of view (or is already further than that).
 * @returns a function that stops watching
 */
export function watchForDock(opening: HTMLElement, onDock: () => void): () => void {
  let docked = false;
  const check = () => {
    if (docked) {
      return;
    }
    const box = opening.getBoundingClientRect();
    if (box.height > 0 && -box.top / box.height >= DOCK_AT) {
      docked = true;
      window.removeEventListener('scroll', check);
      onDock();
    }
  };
  window.addEventListener('scroll', check, { passive: true });
  check();
  return () => window.removeEventListener('scroll', check);
}

/**
 * Docks the big title into the case header.
 * @param title - the big title, in the opening scene
 */
export function dockTitle(title: HTMLElement, { reduced }: { reduced: boolean }): void {
  const bar = document.querySelector<HTMLElement>('[data-case-header="bar"]');
  const target = document.querySelector<HTMLElement>('[data-case-header="title"]');
  if (bar === null) {
    return;
  }
  const from = title.getBoundingClientRect();
  if (reduced || target === null || from.width === 0) {
    gsap.to(bar, { opacity: 1, ...tween('hover') });
    return;
  }
  // The page keeps scrolling while the title flies, so the flight is made by a fixed copy of the title. The
  // copy starts exactly over the big one, which goes away at once. The two are then the same size in the same
  // place, so the swap cannot be seen.
  const to = target.getBoundingClientRect();
  const style = getComputedStyle(title);
  const copy = title.cloneNode(true) as HTMLElement;
  copy.setAttribute('aria-hidden', 'true');
  Object.assign(copy.style, {
    position: 'fixed',
    left: `${from.left}px`,
    top: `${from.top}px`,
    margin: '0',
    zIndex: '35',
    pointerEvents: 'none',
    transformOrigin: 'top left',
    whiteSpace: 'nowrap',
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing,
    color: style.color,
  });
  document.body.appendChild(copy);
  gsap.set(title, { opacity: 0 });
  gsap.to(copy, {
    x: to.left - from.left,
    y: to.top - from.top,
    scale: to.width / from.width,
    ...tween('paper.move'),
    onComplete: () => {
      gsap.to(bar, { opacity: 1, ...tween('hover') });
      gsap.to(copy, { opacity: 0, ...tween('hover'), onComplete: () => copy.remove() });
    },
  });
}

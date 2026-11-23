// src/features/story/use-heading-fit.ts
// Fits a chapter's page to its panel: measured on mount, on resize and once the web fonts are in.
// - A long page fits the screen's height by widening the panel (fitPageWidth), up to PAGE_FIT.maxShare of the
//   screen, never by shrinking the text (polish brief, A1). Only on a laptop-sized screen, and only when asked.
// - The heading stays on one line (fitHeading): it shrinks to fit, and the panel widens further if it must.
import { useLayoutEffect, useRef } from 'react';
import { PAGE_FIT, fitHeading, fitPageWidth } from '@/lib/fit-heading';

/** Where the panel's side-by-side layout starts (Tailwind's `lg`). */
const SIDE_BY_SIDE = '(min-width: 1024px)';

interface HeadingFitOptions {
  /** Widens the panel until its page fits the screen's height (the cinematic story; not the stacked one). */
  fitHeight?: boolean;
}

/**
 * Returns the refs to put on the chapter's elements: `headingRef` (set `white-space: nowrap`; its inline font size is the
 * one that fits), `headingTextRef` (the inline element inside it whose width is the text's), `boxRef` (whose content width the
 * heading has), `panelRef` (the page's panel) and `widenRef` (where `--page-widen`, the panel's extra width, is written,
 * so the panel's shade can follow it too; the panel itself when it is not set).
 */
export function useHeadingFit({ fitHeight = false }: HeadingFitOptions = {}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const headingTextRef = useRef<HTMLSpanElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const widenRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const headingEl = headingRef.current;
    const textEl = headingTextRef.current;
    const boxEl = boxRef.current;
    const panelEl = panelRef.current;
    if (headingEl === null || textEl === null || boxEl === null || panelEl === null) {
      return;
    }
    const varEl = widenRef.current ?? panelEl;
    let current = true;
    const widen = (px: number) => {
      if (px > 0) {
        varEl.style.setProperty('--page-widen', `${px}px`);
      } else {
        varEl.style.removeProperty('--page-widen');
      }
    };
    const measure = () => {
      if (!current) {
        return;
      }
      // Back to the design size (the stylesheet's) and the panel's own width, then measure.
      headingEl.style.removeProperty('font-size');
      widen(0);
      // First the height: the narrowest panel at which the whole page fits between the panel's paddings.
      let heightPx = 0;
      const stageWidth = (panelEl.parentElement ?? panelEl).clientWidth;
      if (fitHeight && stageWidth > 0 && window.matchMedia?.(SIDE_BY_SIDE).matches === true) {
        const panelStyle = getComputedStyle(panelEl);
        const room = () => panelEl.clientHeight - parseFloat(panelStyle.paddingTop || '0') - parseFloat(panelStyle.paddingBottom || '0');
        const fits = (px: number) => {
          widen(px);
          return boxEl.getBoundingClientRect().height <= room();
        };
        heightPx = fitPageWidth(fits, 0, Math.round(stageWidth * (PAGE_FIT.maxShare - PAGE_FIT.baseShare)));
        widen(heightPx);
      }
      // Then the heading, at that width.
      const designPx = parseFloat(getComputedStyle(headingEl).fontSize);
      const style = getComputedStyle(boxEl);
      const available = boxEl.clientWidth - parseFloat(style.paddingLeft || '0') - parseFloat(style.paddingRight || '0');
      const { fontPx, widenPx } = fitHeading(textEl.getBoundingClientRect().width, available, designPx);
      if (fontPx !== designPx) {
        headingEl.style.fontSize = `${fontPx}px`;
      }
      widen(heightPx + widenPx);
    };
    measure();
    document.fonts?.ready.then(measure);
    window.addEventListener('resize', measure);
    return () => {
      current = false;
      window.removeEventListener('resize', measure);
    };
  }, [fitHeight]);

  return { headingRef, headingTextRef, boxRef, panelRef, widenRef };
}

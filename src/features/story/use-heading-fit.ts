// src/features/story/use-heading-fit.ts
// Keeps a chapter heading on one line (fitHeading): measured on mount, on resize and once the web fonts are in.
import { useLayoutEffect, useRef } from 'react';
import { fitHeading } from '@/lib/fit-heading';

/**
 * Returns the refs to put on the chapter's elements: `headingRef` (set `white-space: nowrap`; its inline font size is the
 * one that fits), `headingTextRef` (the inline element inside it whose width is the text's), `boxRef` (whose content width the
 * heading has) and `panelRef` (where `--heading-widen` is written when the heading needs a wider panel).
 */
export function useHeadingFit() {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const headingTextRef = useRef<HTMLSpanElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const headingEl = headingRef.current;
    const textEl = headingTextRef.current;
    const boxEl = boxRef.current;
    const panelEl = panelRef.current;
    if (headingEl === null || textEl === null || boxEl === null || panelEl === null) {
      return;
    }
    let current = true;
    const measure = () => {
      if (!current) {
        return;
      }
      // Back to the design size (the stylesheet's) and the panel's own width, then measure.
      headingEl.style.removeProperty('font-size');
      panelEl.style.removeProperty('--heading-widen');
      const designPx = parseFloat(getComputedStyle(headingEl).fontSize);
      const style = getComputedStyle(boxEl);
      const available = boxEl.clientWidth - parseFloat(style.paddingLeft || '0') - parseFloat(style.paddingRight || '0');
      const { fontPx, widenPx } = fitHeading(textEl.getBoundingClientRect().width, available, designPx);
      if (fontPx !== designPx) {
        headingEl.style.fontSize = `${fontPx}px`;
      }
      if (widenPx > 0) {
        panelEl.style.setProperty('--heading-widen', `${widenPx}px`);
      }
    };
    measure();
    document.fonts?.ready.then(measure);
    window.addEventListener('resize', measure);
    return () => {
      current = false;
      window.removeEventListener('resize', measure);
    };
  }, []);

  return { headingRef, headingTextRef, boxRef, panelRef };
}

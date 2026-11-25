// src/lib/use-tooltip.ts
// The icons' tooltip (ui-pass brief, 3): resting on it with a mouse, or reaching it with the keyboard, shows a small
// paper label after a short delay (about 400ms); leaving, blurring, pressing or Escape hides it. Shared by the icon
// buttons and the icon links.
import { useEffect, useRef, useState, type FocusEvent, type PointerEvent } from 'react';

/** How long the pointer or the focus rests before the tooltip shows, in ms. */
export const TOOLTIP_DELAY_MS = 400;

function focusVisible(element: Element) {
  try {
    return element.matches(':focus-visible');
  } catch {
    return false;
  }
}

export function useTooltip() {
  const [tip, setTip] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clear = () => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };
  const later = () => {
    clear();
    timer.current = setTimeout(() => setTip(true), TOOLTIP_DELAY_MS);
  };
  const hide = () => {
    clear();
    setTip(false);
  };
  useEffect(() => clear, []);
  useEffect(() => {
    if (!tip) {
      return;
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setTip(false);
      }
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [tip]);
  return {
    tip,
    handlers: {
      onPointerEnter: (event: PointerEvent) => event.pointerType === 'mouse' && later(),
      onPointerLeave: () => hide(),
      onPointerDown: () => hide(),
      onFocus: (event: FocusEvent) => focusVisible(event.currentTarget) && later(),
      onBlur: () => hide(),
    },
  };
}

// src/lib/use-popover.ts
// The popover rules (review-fixes brief, 2 and 10), shared by the header's sound controls and the result screen's
// Share menu:
// - Only one popover is open at a time: opening one closes any other at once (one module-level slot).
// - With a mouse, hovering opens it (`hover`); moving into the popover keeps it open; leaving both the trigger and
//   the popover closes it after a short grace (`POPOVER.graceMs`).
// - From the keyboard, focusing the trigger opens it (`focus`); Escape, or Tab away, closes it.
// - On touch, a long press opens it (`longPress`); a tap elsewhere closes it.
// - A click on the trigger only does what the trigger does. `clickToggles` makes the click open and close it instead
//   (the Share button), and a press outside or Escape closes it.
// The hook gives props for the wrapper (which holds the trigger and the popover) and for the trigger.
import { useCallback, useEffect, useId, useRef, useState, type FocusEvent, type PointerEvent } from 'react';

export const POPOVER = {
  /** How long the pointer may be away from the trigger and the popover before it closes, in ms. */
  graceMs: 200,
  /** How long a mouse rests on the trigger before it opens, in ms: a pointer passing over does not flash it. */
  openAfterMs: 120,
  /** How long a touch press is held to open it, in ms (shorter is a tap). */
  longPressMs: 450,
} as const;

// ---- One open at a time ----
let openId: string | null = null;
const listeners = new Set<(id: string | null) => void>();

function claim(id: string | null) {
  openId = id;
  for (const listener of listeners) {
    listener(id);
  }
}

/** Closes whichever popover is open (for tests, and for a page change). */
export function closeAllPopovers() {
  claim(null);
}

export interface PopoverOptions {
  hover?: boolean;
  focus?: boolean;
  longPress?: boolean;
  clickToggles?: boolean;
}

type TimerRef = { current: ReturnType<typeof setTimeout> | null };

function clearTimer(ref: TimerRef) {
  if (ref.current !== null) {
    clearTimeout(ref.current);
    ref.current = null;
  }
}

function focusVisible(element: Element) {
  try {
    return element.matches(':focus-visible');
  } catch {
    return false;
  }
}

export function usePopover({ hover = false, focus = false, longPress = false, clickToggles = false }: PopoverOptions = {}) {
  const id = useId();
  const [open, setOpenState] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const graceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressedRef = useRef(false);
  const hoveringRef = useRef(false);

  const clearAll = useCallback(() => {
    clearTimer(graceRef);
    clearTimer(openTimerRef);
    clearTimer(pressRef);
  }, []);

  // Another popover opening closes this one at once.
  useEffect(() => {
    const listener = (next: string | null) => setOpenState(next === id);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (openId === id) {
        openId = null;
      }
      clearAll();
    };
  }, [id, clearAll]);

  const show = useCallback(() => {
    clearTimer(graceRef);
    clearTimer(openTimerRef);
    if (openId !== id) {
      claim(id);
    }
  }, [id]);

  const hide = useCallback(() => {
    clearAll();
    if (openId === id) {
      claim(null);
    }
  }, [id, clearAll]);

  // While it is open, a press outside or Escape closes it.
  useEffect(() => {
    if (!open) {
      return;
    }
    const outside = (event: globalThis.PointerEvent) => {
      if (!(event.target instanceof Node && rootRef.current?.contains(event.target))) {
        hide();
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        hide();
      }
    };
    // A slider dragged out of the popover: once the button is let go away from it, it closes after the grace.
    const released = () => {
      if (hover && !hoveringRef.current && graceRef.current === null) {
        graceRef.current = setTimeout(hide, POPOVER.graceMs);
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    document.addEventListener('pointerup', released);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
      document.removeEventListener('pointerup', released);
    };
  }, [open, hide, hover]);

  const rootProps = {
    ref: rootRef,
    onPointerEnter: (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') {
        return;
      }
      hoveringRef.current = true;
      clearTimer(graceRef);
      if (hover && openId !== id && openTimerRef.current === null) {
        openTimerRef.current = setTimeout(show, POPOVER.openAfterMs);
      }
    },
    onPointerLeave: (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') {
        return;
      }
      hoveringRef.current = false;
      clearTimer(openTimerRef);
      clearTimer(pressRef);
      // Leaving with a button held (dragging the slider) waits for the release.
      if (hover && open && event.buttons === 0) {
        clearTimer(graceRef);
        graceRef.current = setTimeout(hide, POPOVER.graceMs);
      }
    },
    onBlur: (event: FocusEvent) => {
      // Tab away: the focus leaves the trigger and the popover.
      if ((focus || clickToggles) && !(event.relatedTarget instanceof Node && rootRef.current?.contains(event.relatedTarget))) {
        if (event.relatedTarget !== null) {
          hide();
        }
      }
    },
  };

  const triggerProps = {
    'aria-expanded': open,
    onPointerDown: (event: PointerEvent) => {
      longPressedRef.current = false;
      clearTimer(pressRef);
      if (longPress && event.pointerType !== 'mouse') {
        pressRef.current = setTimeout(() => {
          longPressedRef.current = true;
          show();
        }, POPOVER.longPressMs);
      }
    },
    onPointerUp: () => clearTimer(pressRef),
    onPointerCancel: () => clearTimer(pressRef),
    onFocus: (event: FocusEvent) => {
      if (focus && focusVisible(event.currentTarget)) {
        show();
      }
    },
    onContextMenu: (event: { preventDefault: () => void }) => {
      if (longPress) {
        event.preventDefault();
      }
    },
  };

  /**
   * Call first in the trigger's click handler. True when the click is the end of a long press (it only opened the
   * popover) and must do nothing else. A click also cancels a hover that was about to open it.
   */
  const consumeClick = () => {
    clearTimer(openTimerRef);
    if (longPressedRef.current) {
      longPressedRef.current = false;
      return true;
    }
    if (clickToggles) {
      if (openId === id) {
        hide();
      } else {
        show();
      }
    }
    return false;
  };

  return { open, show, hide, rootProps, triggerProps, consumeClick };
}

// src/features/board/PinMenu.tsx
// "Pin to…": a button that opens a menu of the case's theories plus "None of them". Choosing one pins the file.
// It is always there, on every screen size, and it is the only way to pin on a phone or with a keyboard.
// Dragging the folder (desktop) is an extra, never required.
// Keyboard: Enter, Space or ArrowDown opens it on the current choice (ArrowUp on the last item); ArrowUp and
// ArrowDown move, Home and End jump, Enter or Space chooses, Escape closes it and gives the button the focus back.
// The menu is a popover: it floats over the file, anchored to its button, and takes no layout space, so nothing
// shifts when it opens. It opens downward, or upward when there is no room below inside the folder. It opens and
// closes with an animation (closing is the quicker); with reduced motion it fades.

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import gsap from 'gsap';
import { NO_THEORY } from '@/lib/case-files';
import { MOTION, MOTION_QUERIES, STEP, tween } from '@/lib/motion';
import type { PinTarget, Theory } from '@/types/case';

interface PinMenuProps {
  theories: Theory[];
  /** The current pin, if the file has one: its item is checked. */
  current: PinTarget | undefined;
  onPin: (target: PinTarget) => void;
  /** Desktop: takes the file off the board and back to the floor. When given, a pinned file's menu lists it. */
  onUnpin?: () => void;
  /** True while a pin is being carried out: the button does nothing more. */
  busy?: boolean;
  /** A small button, for a file on the floor. */
  compact?: boolean;
  /** Said after "Pin to…" to screen readers, e.g. the file's number and title. */
  srSuffix?: string;
}

/** The menu's last item, for a file that is pinned or set aside. */
export const BACK_TO_FLOOR = 'Back to the floor';

const FLOOR_ITEM = 'back-to-floor';
type MenuItemId = PinTarget | typeof FLOOR_ITEM;

export default function PinMenu({ theories, current, onPin, onUnpin, busy = false, compact = false, srSuffix }: PinMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const menuId = useId();
  const items: { id: MenuItemId; label: string }[] = [
    ...theories.map(theory => ({ id: theory.id, label: theory.title })),
    { id: 'none', label: NO_THEORY },
    ...(current !== undefined && onUnpin !== undefined ? [{ id: FLOOR_ITEM as MenuItemId, label: BACK_TO_FLOOR }] : []),
  ];

  const itemElements = () => [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? [])];

  /** Opens the menu with the focus on item `index` (or on the current choice). */
  const openAt = (index?: number) => {
    setOpen(true);
    const start = index ?? Math.max(0, items.findIndex(item => item.id === current));
    // The menu renders hidden until open; focus once it shows.
    requestAnimationFrame(() => {
      const elements = itemElements();
      elements[Math.min(start, elements.length - 1)]?.focus();
    });
  };

  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) {
      buttonRef.current?.focus();
    }
  };

  // A press anywhere outside closes the menu.
  useEffect(() => {
    if (!open) {
      return;
    }
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  const handleButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      openAt();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      openAt(items.length - 1);
    }
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const elements = itemElements();
    const index = elements.indexOf(document.activeElement as HTMLElement);
    const focusAt = (next: number) => elements[(next + elements.length) % elements.length]?.focus();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusAt(index + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusAt(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusAt(0);
        break;
      case 'End':
        event.preventDefault();
        focusAt(elements.length - 1);
        break;
      case 'Escape':
        // Only the menu closes; the open file stays.
        event.preventDefault();
        event.stopPropagation();
        event.nativeEvent.stopImmediatePropagation();
        close(true);
        break;
      case 'Tab':
        setOpen(false);
        break;
      default:
        break;
    }
  };

  const choose = (target: MenuItemId) => {
    setOpen(false);
    if (target === FLOOR_ITEM) {
      onUnpin?.();
    } else {
      onPin(target);
    }
  };

  // Opening and closing, written to the menu itself. `hidden` is not a React prop: the menu is shown while it opens
  // and until its closing animation is done.
  useEffect(() => {
    const menu = menuRef.current;
    const root = rootRef.current;
    if (menu === null || root === null) {
      return;
    }
    const canQuery = typeof window.matchMedia === 'function';
    const reduced = canQuery && window.matchMedia(MOTION_QUERIES.reduced).matches;
    const items = itemElements();
    gsap.killTweensOf([menu, ...items]);
    if (open) {
      menu.hidden = false;
      // Down, unless there is no room below inside the folder and more above.
      const frame = root.closest('[data-file="grip"]')?.getBoundingClientRect();
      const button = root.getBoundingClientRect();
      const below = (frame?.bottom ?? window.innerHeight) - button.bottom;
      const above = button.top - (frame?.top ?? 0);
      const up = menu.offsetHeight + 8 > below && above > below;
      menu.dataset.placement = up ? 'up' : 'down';
      if (!canQuery) {
        return;
      }
      if (reduced) {
        gsap.fromTo(menu, { opacity: 0 }, { opacity: 1, ...tween('hover'), clearProps: 'opacity' });
      } else {
        gsap.fromTo(menu, { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, ...tween('hover'), clearProps: 'opacity,transform' });
        gsap.fromTo(
          items,
          { opacity: 0, y: up ? 4 : -4 },
          { opacity: 1, y: 0, ...tween('hover'), stagger: STEP.fast / 10, clearProps: 'opacity,transform' }
        );
      }
      return;
    }
    if (menu.hidden) {
      return;
    }
    if (!canQuery) {
      menu.hidden = true;
      return;
    }
    // Closing is quicker than opening.
    gsap.to(menu, {
      opacity: 0,
      scale: reduced ? 1 : 0.96,
      ease: MOTION['ink.out'].ease,
      duration: STEP.fast / 2,
      onComplete: () => {
        menu.hidden = true;
        gsap.set(menu, { clearProps: 'opacity,transform' });
      },
    });
    return () => {
      gsap.killTweensOf(menu);
    };
  }, [open]);

  return (
    <div ref={rootRef} data-file="pin-menu" className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        disabled={busy}
        onClick={() => (open ? close(false) : openAt())}
        onKeyDown={handleButtonKeyDown}
        className={`inline-flex items-center rounded-sm border border-ink bg-ink font-voice tracking-[0.1em] text-paper uppercase transition-[scale,background-color] duration-150 ease-out hover:bg-ink/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass active:scale-[0.97] disabled:opacity-60 ${
          compact ? 'min-h-7 gap-1 px-2 py-0.5 text-[0.6875rem]' : 'min-h-11 gap-2 px-5 py-2 text-sm'
        }`}
      >
        Pin to…
        {srSuffix !== undefined && <span className="sr-only"> {srSuffix}</span>}
        <svg aria-hidden="true" viewBox="0 0 10 6" className="h-1.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M1 1 L5 5 L9 1" />
        </svg>
      </button>
      <ul
        ref={menuRef}
        id={menuId}
        role="menu"
        aria-label="Pin to…"
        hidden
        data-placement="down"
        onKeyDown={handleMenuKeyDown}
        className="absolute top-full left-0 z-30 mt-2 w-[min(18rem,calc(100vw-3rem))] origin-top-left data-[placement=up]:top-auto data-[placement=up]:bottom-full data-[placement=up]:mt-0 data-[placement=up]:mb-2 data-[placement=up]:origin-bottom-left rounded-sm bg-paper py-1.5 text-ink shadow-xl shadow-black/50 ring-1 ring-ink/15"
      >
        {items.map(item => {
          const checked = item.id === current && item.id !== FLOOR_ITEM;
          return (
            <li key={item.id} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={checked}
                tabIndex={-1}
                data-ui-sound="off"
                onClick={() => choose(item.id)}
                className={`flex min-h-11 w-full items-center gap-3 px-4 py-2 text-left font-voice text-sm leading-snug transition-[background-color] duration-100 ease-out hover:bg-ink/[0.07] focus-visible:bg-ink/[0.09] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brass ${
                  item.id === 'none' || item.id === FLOOR_ITEM ? 'mt-1 border-t border-ink/15' : ''
                }`}
              >
                <span aria-hidden="true" className="w-3 text-record">
                  {checked ? '✓' : ''}
                </span>
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

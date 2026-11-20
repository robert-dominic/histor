// src/features/board/PinMenu.tsx
// "Pin to…": a button that opens a menu of the case's theories plus "None of them". Choosing one pins the file.
// It is always there, on every screen size, and it is the only way to pin on a phone or with a keyboard.
// Dragging the folder (desktop) is an extra, never required.
// Keyboard: Enter, Space or ArrowDown opens it on the current choice (ArrowUp on the last item); ArrowUp and
// ArrowDown move, Home and End jump, Enter or Space chooses, Escape closes it and gives the button the focus back.

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { NO_THEORY } from '@/lib/case-files';
import type { PinTarget, Theory } from '@/types/case';

interface PinMenuProps {
  theories: Theory[];
  /** The current pin, if the file has one: its item is checked. */
  current: PinTarget | undefined;
  onPin: (target: PinTarget) => void;
  /** True while a pin is being carried out: the button does nothing more. */
  busy?: boolean;
}

export default function PinMenu({ theories, current, onPin, busy = false }: PinMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const menuId = useId();
  const items: { id: PinTarget; label: string }[] = [
    ...theories.map(theory => ({ id: theory.id, label: theory.title })),
    { id: 'none', label: NO_THEORY },
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
      menuRef.current?.scrollIntoView?.({ block: 'nearest' });
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

  const choose = (target: PinTarget) => {
    setOpen(false);
    onPin(target);
  };

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
        className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-ink bg-ink px-5 py-2 font-voice text-sm tracking-[0.1em] text-paper uppercase transition-[scale,background-color] duration-150 ease-out hover:bg-ink/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass active:scale-[0.97] disabled:opacity-60"
      >
        Pin to…
        <svg aria-hidden="true" viewBox="0 0 10 6" className="h-1.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M1 1 L5 5 L9 1" />
        </svg>
      </button>
      <ul
        ref={menuRef}
        id={menuId}
        role="menu"
        aria-label="Pin to…"
        hidden={!open}
        onKeyDown={handleMenuKeyDown}
        className="absolute top-full left-0 z-30 mt-2 w-[min(18rem,calc(100vw-3rem))] rounded-sm bg-paper py-1.5 text-ink shadow-xl shadow-black/50 ring-1 ring-ink/15"
      >
        {items.map(item => {
          const checked = item.id === current;
          return (
            <li key={item.id} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={checked}
                tabIndex={-1}
                onClick={() => choose(item.id)}
                className={`flex min-h-11 w-full items-center gap-3 px-4 py-2 text-left font-voice text-sm leading-snug transition-[background-color] duration-100 ease-out hover:bg-ink/[0.07] focus-visible:bg-ink/[0.09] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brass ${
                  item.id === 'none' ? 'mt-1 border-t border-ink/15' : ''
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

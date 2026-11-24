// src/features/verdict/ShareMenu.tsx
// One "Share" button on the result screen (review-fixes brief, 10), in place of the row of platform links. It opens a
// small menu on typed paper: X, Facebook, LinkedIn, WhatsApp, Reddit and Telegram (each site's own share page, in a
// new tab), "Copy link", "Save the image" and, where the browser can share files, "More…" (the native share sheet,
// with the card). Escape or a press outside closes it. It follows the header's popover rules (`usePopover`): only one
// open at a time, a mouse resting on it opens it, leaving both closes it after a short grace, a click opens and
// closes it, Tab away closes it. The arrow keys move between its items.
import { useRef, useState, type KeyboardEvent } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { MOTION_QUERIES, QUICK_OUT, tween } from '@/lib/motion';
import { shareLinks } from '@/lib/share-card';
import { usePopover } from '@/lib/use-popover';

gsap.registerPlugin(useGSAP);

const TRIGGER_CLASSES =
  'inline-flex min-h-11 items-center gap-2 rounded-sm border border-brass bg-brass px-6 font-voice text-sm tracking-[0.12em] text-night uppercase transition-[scale,background-color,color] duration-(--motion-hover-duration) ease-(--motion-hover-ease) hover:bg-transparent hover:text-brass focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass active:scale-[0.97]';
const ITEM_CLASSES =
  'flex min-h-10 w-full items-center rounded-[1px] px-3 text-left font-voice text-[0.875rem] tracking-[0.04em] text-ink transition-colors duration-(--motion-hover-duration) ease-(--motion-hover-ease) hover:bg-ink/8 focus-visible:bg-ink/8 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-record';

interface ShareMenuProps {
  /** The words that are shared. */
  text: string;
  /** The link that is shared. */
  url: string;
  onCopy: () => void;
  onSave: () => void;
  /** The native share sheet with the card; only where the browser can share files. */
  onMore?: () => void;
}

export default function ShareMenu({ text, url, onCopy, onSave, onMore }: ShareMenuProps) {
  const { open, hide, rootProps, triggerProps, consumeClick } = usePopover({ hover: true, clickToggles: true });
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Drawn while open, and until it has finished leaving (exits are quick, never a snap).
  const [shown, setShown] = useState(open);
  if (open && !shown) {
    setShown(true);
  }

  useGSAP(
    () => {
      const menu = menuRef.current;
      if (menu === null) {
        return;
      }
      const reduced = typeof window.matchMedia !== 'function' || window.matchMedia(MOTION_QUERIES.reduced).matches;
      if (open) {
        gsap.fromTo(menu, reduced ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, ...tween('paper.lift'), overwrite: true });
      } else {
        gsap.to(menu, { opacity: 0, ...QUICK_OUT, overwrite: true, onComplete: () => setShown(false) });
      }
    },
    { dependencies: [open, shown] }
  );

  /** An item chosen: it does its thing, and the menu closes. */
  const choose = (run?: () => void) => {
    run?.();
    hide();
  };

  const onMenuKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const here = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      items[(here + step + items.length) % items.length]?.focus();
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      items[event.key === 'Home' ? 0 : items.length - 1]?.focus();
    } else if (event.key === 'Escape') {
      triggerRef.current?.focus();
    }
  };

  return (
    <div {...rootProps} data-share-menu="" className="relative">
      <button
        ref={triggerRef}
        type="button"
        data-share="open"
        aria-haspopup="menu"
        {...triggerProps}
        onClick={() => {
          consumeClick();
        }}
        onKeyDown={event => {
          // Down arrow on the button opens the menu and goes into it.
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (!open) {
              consumeClick();
            }
            requestAnimationFrame(() => menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus());
          }
        }}
        className={TRIGGER_CLASSES}
      >
        Share
        <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
          <path d="M8 10V2.5M5 5.5l3-3 3 3M3 9v4.5h10V9" />
        </svg>
      </button>
      {shown && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Share"
          data-share="menu"
          onKeyDown={onMenuKey}
          // Opens above the button, so it never runs off the foot of the screen on a phone.
          className="desk-typed-paper absolute bottom-[calc(100%+0.5rem)] left-1/2 z-40 w-60 -translate-x-1/2 origin-bottom rounded-[2px] p-1.5 lg:left-0 lg:translate-x-0 lg:origin-bottom-left"
        >
          {shareLinks(text, url).map(link => (
            <a
              key={link.id}
              role="menuitem"
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              data-share={link.id}
              onClick={() => choose()}
              className={ITEM_CLASSES}
            >
              {link.label}
            </a>
          ))}
          <div aria-hidden="true" className="mx-2 my-1 border-t border-ink/15" />
          <button type="button" role="menuitem" data-share="copy" onClick={() => choose(onCopy)} className={ITEM_CLASSES}>
            Copy link
          </button>
          <button type="button" role="menuitem" data-share="save" onClick={() => choose(onSave)} className={ITEM_CLASSES}>
            Save the image
          </button>
          {onMore !== undefined && (
            <button type="button" role="menuitem" data-share="more" onClick={() => choose(onMore)} className={ITEM_CLASSES}>
              More…
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// src/features/verdict/ShareMenu.tsx
// The Share icon of the result screen's action bar (ui-pass brief, 3; review-fixes brief, 10). It opens a small menu on
// paper (the shared Popover, ui-pass brief, 4): X, Facebook, LinkedIn, WhatsApp, Reddit and Telegram (each site's own share page, in a
// new tab), "Copy link", "Save the image" and, where the browser can share files, "More…" (the native share sheet,
// with the card). Escape or a press outside closes it. It follows the header's popover rules (`usePopover`): only one
// open at a time, a click opens and closes it, Tab away closes it (the icon's tooltip, not the menu, answers a
// resting mouse). The arrow keys move between its items.
import { useRef, type KeyboardEvent } from 'react';
import Popover from '@/components/Popover';
import { shareLinks } from '@/lib/share-card';
import { usePopover } from '@/lib/use-popover';
import IconButton from '@/components/IconButton';
import { ShareIcon } from '@/components/icons';

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
  // A click opens and closes it (its icon's tooltip has the hover); Esc, a press outside or Tab away closes it.
  const { open, hide, rootProps, triggerProps, consumeClick } = usePopover({ clickToggles: true });
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
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
      <IconButton
        ref={triggerRef}
        label="Share your result"
        icon={<ShareIcon />}
        quiet={open}
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
      />
      {/* The shared paper popover (ui-pass brief, 4), below the action bar's icon, along the right edge. */}
      <Popover
        open={open}
        ref={menuRef}
        role="menu"
        aria-label="Share"
        data-share="menu"
        onKeyDown={onMenuKey}
        className="top-[calc(100%+0.5rem)] right-0 w-60 origin-top-right"
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
      </Popover>
    </div>
  );
}

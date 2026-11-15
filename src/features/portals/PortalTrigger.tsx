// src/features/portals/PortalTrigger.tsx
// A tappable word in case text. It reads as part of the sentence, marked by a brass dotted underline.
// A span with the button role, not a <button>: a button cannot wrap across lines, and labels can be several words.

import { useContext, type KeyboardEvent } from 'react';
import { PortalContext } from '@/features/portals/portal-context';

interface PortalTriggerProps {
  /** Reference id. */
  id: string;
  /** The words shown in the text. */
  label: string;
}

export default function PortalTrigger({ id, label }: PortalTriggerProps) {
  const portals = useContext(PortalContext);

  const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      // Space would scroll the page.
      event.preventDefault();
      portals?.open(id, event.currentTarget);
    }
  };

  return (
    <span
      role="button"
      tabIndex={0}
      aria-haspopup="dialog"
      aria-expanded={portals?.openId === id}
      data-portal-trigger={id}
      onClick={event => portals?.open(id, event.currentTarget)}
      onKeyDown={handleKeyDown}
      className="rounded-[0.12em] underline decoration-brass decoration-dotted decoration-[0.1em] underline-offset-[0.22em] transition-[background-color] duration-150 ease-out hover:bg-brass/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass active:bg-brass/35"
    >
      {label}
    </span>
  );
}

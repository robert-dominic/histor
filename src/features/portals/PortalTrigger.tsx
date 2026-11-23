// src/features/portals/PortalTrigger.tsx
// A tappable word in case text. It reads as part of the sentence, marked by a brass dotted underline.
// A span with the button role, not a <button>: a button cannot wrap across lines, and labels can be several words.
// Clicks, keys and hovering are handled by the PortalProvider, by delegation from the document, so a trigger keeps
// working when an animation rebuilds the text around it.

import { useContext } from 'react';
import { PortalContext } from '@/features/portals/portal-context';

interface PortalTriggerProps {
  /** Reference id. */
  id: string;
  /** The words shown in the text. */
  label: string;
  /** False to keep it out of the Tab order (it stays tappable). */
  tabbable?: boolean;
}

export default function PortalTrigger({ id, label, tabbable = true }: PortalTriggerProps) {
  const portals = useContext(PortalContext);

  return (
    <span
      role="button"
      tabIndex={tabbable ? 0 : -1}
      aria-haspopup="dialog"
      aria-expanded={portals?.openId === id}
      data-portal-trigger={id}
      className="rounded-[0.12em] underline decoration-brass decoration-dotted decoration-[0.1em] underline-offset-[0.22em] transition-[background-color] duration-150 ease-out hover:bg-brass/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass active:bg-brass/35"
    >
      {label}
    </span>
  );
}

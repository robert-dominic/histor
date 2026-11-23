// src/features/portals/portal-context.ts
// What portal triggers need from the provider: look up a reference, and open its card.

import { createContext } from 'react';
import type { Reference } from '@/types/case';

export interface PortalContextValue {
  /** The reference with this id, or undefined when the case has none. */
  getReference: (id: string) => Reference | undefined;
  /** Opens the card for a reference. `trigger` is the word that was tapped: the card grows from it. */
  open: (id: string, trigger: HTMLElement) => void;
  /** The id of the reference whose card is open, or null. */
  openId: string | null;
}

/** Null outside a PortalProvider: text is then rendered without portals. */
export const PortalContext = createContext<PortalContextValue | null>(null);

/** Hovering, with a mouse: how long to rest on a name before its card opens, and the grace before it closes (ms). */
export const PORTAL_HOVER = { openAfterMs: 300, graceMs: 250 } as const;

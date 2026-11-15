// src/features/portals/PortalProvider.tsx
// Holds the one open portal card for the text inside it. Wrap any case text that contains {{ref:id|label}} markup.

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import PortalCard from '@/features/portals/PortalCard';
import { PortalContext, type PortalContextValue } from '@/features/portals/portal-context';
import type { Reference, Source } from '@/types/case';

interface PortalProviderProps {
  /** Every reference of the case. */
  references: Reference[];
  /** Every source of the case. A card lists the ones its reference names. */
  sources: Source[];
  children: ReactNode;
}

interface OpenPortal {
  reference: Reference;
  trigger: HTMLElement;
}

export default function PortalProvider({ references, sources, children }: PortalProviderProps) {
  const [openPortal, setOpenPortal] = useState<OpenPortal | null>(null);

  const referencesById = useMemo(() => new Map(references.map(reference => [reference.id, reference])), [references]);
  const sourcesById = useMemo(() => new Map(sources.map(source => [source.id, source])), [sources]);

  const openId = openPortal?.reference.id ?? null;
  const value = useMemo<PortalContextValue>(
    () => ({
      getReference: id => referencesById.get(id),
      open: (id, trigger) => {
        const reference = referencesById.get(id);
        if (reference !== undefined) {
          setOpenPortal({ reference, trigger });
        }
      },
      openId,
    }),
    [referencesById, openId]
  );

  const handleClosed = useCallback(() => setOpenPortal(null), []);

  // Unknown source ids are left out: the validator reports them, the card stays clean.
  const cardSources = useMemo(
    () =>
      (openPortal?.reference.sources ?? [])
        .map(id => sourcesById.get(id))
        .filter((source): source is Source => source !== undefined),
    [openPortal, sourcesById]
  );

  return (
    <PortalContext value={value}>
      {children}
      {openPortal !== null &&
        createPortal(
          <PortalCard
            key={openPortal.reference.id}
            reference={openPortal.reference}
            sources={cardSources}
            trigger={openPortal.trigger}
            onClosed={handleClosed}
          />,
          document.body
        )}
    </PortalContext>
  );
}

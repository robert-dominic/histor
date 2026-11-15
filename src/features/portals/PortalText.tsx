// src/features/portals/PortalText.tsx
// Renders one string of case text. {{ref:id|label}} markup becomes a tappable portal trigger.
// An id the case does not know, or text outside a PortalProvider, falls back to the plain label.

import { Fragment, useContext } from 'react';
import { PortalContext } from '@/features/portals/portal-context';
import PortalTrigger from '@/features/portals/PortalTrigger';
import { parseRefs } from '@/lib/parse-refs';

interface PortalTextProps {
  text: string;
  /** False to show every label as plain text, e.g. inside a portal card. */
  interactive?: boolean;
}

export default function PortalText({ text, interactive = true }: PortalTextProps) {
  const portals = useContext(PortalContext);

  return (
    <>
      {parseRefs(text).map((segment, index) => {
        if (segment.kind === 'text') {
          return <Fragment key={index}>{segment.text}</Fragment>;
        }
        const known = interactive && portals?.getReference(segment.id) !== undefined;
        return known ? (
          <PortalTrigger key={index} id={segment.id} label={segment.label} />
        ) : (
          <Fragment key={index}>{segment.label}</Fragment>
        );
      })}
    </>
  );
}

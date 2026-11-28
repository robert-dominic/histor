// src/features/portals/PortalText.tsx
// Renders one string of case text. {{ref:id|label}} markup becomes a tappable portal trigger.
// An id the case does not know, or text outside a PortalProvider, falls back to the plain label.

import { Fragment, useContext } from 'react';
import { PortalContext } from '@/features/portals/portal-context';
import PortalTrigger from '@/features/portals/PortalTrigger';
import { splitInline } from '@/lib/inline-markup';
import { parseRefs } from '@/lib/parse-refs';

interface PortalTextProps {
  text: string;
  /** False to show every label as plain text, e.g. inside a portal card. */
  interactive?: boolean;
  /**
   * False to keep the triggers out of the Tab order while they stay tappable: for a copy of the text that is
   * hidden from screen readers, whose complete version is reachable elsewhere.
   */
  tabbable?: boolean;
}

export default function PortalText({ text, interactive = true, tabbable = true }: PortalTextProps) {
  const portals = useContext(PortalContext);

  const refs = (part: string) =>
    parseRefs(part).map((segment, index) => {
      if (segment.kind === 'text') {
        return <Fragment key={index}>{segment.text}</Fragment>;
      }
      const known = interactive && portals?.getReference(segment.id) !== undefined;
      return known ? (
        <PortalTrigger key={index} id={segment.id} label={segment.label} tabbable={tabbable} />
      ) : (
        <Fragment key={index}>{segment.label}</Fragment>
      );
    });

  // **Bold** and *italic* runs (src/lib/inline-markup.ts) are wrapped; their portals stay whole inside them.
  return (
    <>
      {splitInline(text).map((part, index) =>
        part.style === 'bold' ? (
          <strong key={index} className="font-semibold">
            {refs(part.text)}
          </strong>
        ) : part.style === 'italic' ? (
          <em key={index}>{refs(part.text)}</em>
        ) : (
          <Fragment key={index}>{refs(part.text)}</Fragment>
        )
      )}
    </>
  );
}

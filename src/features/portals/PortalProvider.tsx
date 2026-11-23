// src/features/portals/PortalProvider.tsx
// Holds the one open portal card for the text inside it. Wrap any case text that contains {{ref:id|label}} markup.
//
// The triggers are handled here, by delegation from the document, not by handlers on each trigger: a trigger keeps
// working even after an animation has rebuilt the text around it (an open file's writing reveal splits its
// paragraphs into lines and puts them back, which leaves the trigger elements without React's handlers).
// A click, Enter or Space opens a card. With a fine pointer (a mouse), resting on a name for a moment opens its card
// too, without taking the focus; moving onto the card keeps it open, moving away from both closes it after a short
// grace, and a click pins it open. Touch and the keyboard work as before.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import PortalCard from '@/features/portals/PortalCard';
import { PORTAL_HOVER, PortalContext, type PortalContextValue } from '@/features/portals/portal-context';
import type { Reference, Source } from '@/types/case';

/** A mouse or trackpad: a pointer that can rest on a name. */
const FINE_POINTER = '(hover: hover) and (pointer: fine)';

const TRIGGER = '[data-portal-trigger]';
const CARD = '[data-portal="card"]';

interface PortalProviderProps {
  /** Every reference of the case. */
  references: Reference[];
  /** Every source of the case. A card lists the ones its reference names. */
  sources: Source[];
  /** Called each time a card opens, e.g. to pause a story that plays itself. */
  onOpen?: () => void;
  children: ReactNode;
}

interface OpenPortal {
  reference: Reference;
  trigger: HTMLElement;
  /** Opened by resting the pointer on the name: it has not taken the focus, and closes when the pointer leaves. */
  hover: boolean;
}

const finePointer = () => typeof window.matchMedia === 'function' && window.matchMedia(FINE_POINTER).matches;

export default function PortalProvider({ references, sources, onOpen, children }: PortalProviderProps) {
  const [openPortal, setOpenPortal] = useState<OpenPortal | null>(null);
  /** Counts the requests to close the card that is open: the card closes, with its own exit, when it changes. */
  const [closeSignal, setCloseSignal] = useState(0);

  const referencesById = useMemo(() => new Map(references.map(reference => [reference.id, reference])), [references]);
  const sourcesById = useMemo(() => new Map(sources.map(source => [source.id, source])), [sources]);
  const onOpenRef = useRef(onOpen);
  useEffect(() => {
    onOpenRef.current = onOpen;
  }, [onOpen]);
  const openRef = useRef<OpenPortal | null>(null);
  useEffect(() => {
    openRef.current = openPortal;
  }, [openPortal]);

  const open = useCallback(
    (id: string, trigger: HTMLElement, hover = false) => {
      const reference = referencesById.get(id);
      if (reference === undefined) {
        return;
      }
      const now = openRef.current;
      // A click on the name whose card the pointer opened pins it open.
      if (now !== null && now.reference.id === id && now.hover && !hover) {
        const pinned = { ...now, trigger, hover: false };
        openRef.current = pinned;
        setOpenPortal(pinned);
        return;
      }
      if (now !== null && now.reference.id === id) {
        return;
      }
      const next = { reference, trigger, hover };
      openRef.current = next;
      setOpenPortal(next);
      onOpenRef.current?.();
    },
    [referencesById]
  );

  const openId = openPortal?.reference.id ?? null;
  const value = useMemo<PortalContextValue>(
    () => ({ getReference: id => referencesById.get(id), open: (id, trigger) => open(id, trigger), openId }),
    [referencesById, openId, open]
  );

  const handleClosed = useCallback(() => {
    openRef.current = null;
    setOpenPortal(null);
  }, []);

  // ---- The triggers, by delegation.
  useEffect(() => {
    let openTimer = 0;
    let graceTimer = 0;
    const triggerOf = (target: EventTarget | null) => {
      const element = target instanceof Element ? target.closest<HTMLElement>(TRIGGER) : null;
      const id = element?.dataset.portalTrigger;
      return element !== null && id !== undefined && referencesById.has(id) ? { element, id } : null;
    };
    const within = (target: EventTarget | null, selector: string) => target instanceof Element && target.closest(selector) !== null;
    const stopTimers = () => {
      window.clearTimeout(openTimer);
      window.clearTimeout(graceTimer);
    };
    /** A card the pointer opened closes once the pointer has been away from both it and its name for a moment. */
    const closeSoon = () => {
      window.clearTimeout(graceTimer);
      if (openRef.current?.hover !== true) {
        return;
      }
      graceTimer = window.setTimeout(() => {
        if (openRef.current?.hover === true) {
          setCloseSignal(signal => signal + 1);
        }
      }, PORTAL_HOVER.graceMs);
    };

    const onClick = (event: MouseEvent) => {
      const trigger = triggerOf(event.target);
      if (trigger !== null) {
        stopTimers();
        open(trigger.id, trigger.element);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const trigger = triggerOf(event.target);
      if (trigger !== null && (event.key === 'Enter' || event.key === ' ')) {
        // Space would scroll the page.
        event.preventDefault();
        open(trigger.id, trigger.element);
      }
    };
    const onPointerOver = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || !finePointer()) {
        return;
      }
      if (within(event.target, CARD)) {
        window.clearTimeout(graceTimer);
        return;
      }
      const trigger = triggerOf(event.target);
      if (trigger === null) {
        return;
      }
      window.clearTimeout(graceTimer);
      if (openRef.current?.reference.id === trigger.id) {
        return;
      }
      window.clearTimeout(openTimer);
      openTimer = window.setTimeout(() => open(trigger.id, trigger.element, true), PORTAL_HOVER.openAfterMs);
    };
    const onPointerOut = (event: PointerEvent) => {
      if (event.pointerType === 'touch') {
        return;
      }
      const from = triggerOf(event.target) !== null || within(event.target, CARD);
      if (!from) {
        return;
      }
      // Still on the same name or card (moving between its letters): nothing changes.
      const to = event.relatedTarget;
      const fromTrigger = triggerOf(event.target);
      if (fromTrigger !== null && triggerOf(to)?.element === fromTrigger.element) {
        return;
      }
      if (within(event.target, CARD) && within(to, CARD)) {
        return;
      }
      window.clearTimeout(openTimer);
      if (triggerOf(to)?.id === openRef.current?.reference.id || within(to, CARD)) {
        return;
      }
      closeSoon();
    };
    // A card the pointer opened has no backdrop to catch a click elsewhere: a press outside it closes it.
    const onPointerDown = (event: PointerEvent) => {
      if (openRef.current?.hover === true && !within(event.target, CARD) && triggerOf(event.target) === null) {
        setCloseSignal(signal => signal + 1);
      }
    };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerover', onPointerOver);
    document.addEventListener('pointerout', onPointerOut);
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      stopTimers();
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerover', onPointerOver);
      document.removeEventListener('pointerout', onPointerOut);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [open, referencesById]);

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
            hover={openPortal.hover}
            closeSignal={closeSignal}
            onClosed={handleClosed}
          />,
          document.body
        )}
    </PortalContext>
  );
}

// src/features/verdict/CardSignature.tsx
// The player's signature on the shareable card's preview (polish brief, A4). As they type in "Sign your case file",
// the pen writes the name onto the card, once they pause (debounced, so it never rewrites every keystroke). It lies
// over the canvas at the card's own signature place (SHARE_SIGNATURE), in the card's units: the container is a size
// container as wide as the canvas, so 1cqw is 12 of the card's 1200px. The canvas that is saved draws the same
// signature itself (share-card.ts). A name already saved is simply there; reduced motion: it simply appears.

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import Quill from '@/components/Quill';
import { cleanPlayerName } from '@/lib/player-name';
import { SHARE_CARD, SHARE_SIGNATURE } from '@/lib/share-card';
import { createQuillWriter } from '@/lib/quill-writing';
import { useReducedMotion } from '@/lib/use-reduced-motion';

gsap.registerPlugin(SplitText);

/** To tune: how long the player pauses before the pen writes (s), and the pen's letters a second. */
const SIGN_PACE = { settle: 0.6, penRate: 14 } as const;

/** The card's px as the preview's container units. */
const cq = (px: number) => `${(px / SHARE_CARD.width) * 100}cqw`;

interface CardSignatureProps {
  /** What is in the field now. */
  name: string;
  /** Called with the cleaned name once the player pauses: what the card is signed with. Keep it stable. */
  onSigned: (name: string) => void;
}

export default function CardSignature({ name, onSigned }: CardSignatureProps) {
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const [signed, setSigned] = useState(() => cleanPlayerName(name));
  // The first name (saved from last time) is simply there; only a name the player types is written.
  const [written, setWritten] = useState(false);

  useEffect(() => {
    const clean = cleanPlayerName(name);
    if (clean === signed) {
      return;
    }
    const timer = window.setTimeout(() => {
      setSigned(clean);
      setWritten(true);
      onSigned(clean);
    }, SIGN_PACE.settle * 1000);
    return () => window.clearTimeout(timer);
  }, [name, signed, onSigned]);

  useEffect(() => {
    const root = rootRef.current;
    const nameEl = root?.querySelector<HTMLElement>('[data-sign="name"]') ?? null;
    const point = root?.querySelector<HTMLElement>('[data-sign-pen="quill"]') ?? null;
    const body = root?.querySelector<HTMLElement>('[data-sign-pen="quill-body"]') ?? null;
    if (!written || reduced || signed === '' || nameEl === null || point === null || body === null) {
      return;
    }
    const split = SplitText.create(nameEl, { type: 'chars', aria: 'none' });
    const letters = split.chars as HTMLElement[];
    gsap.set(letters, { opacity: 0 });
    const timeline = gsap.timeline({ data: 'card-signature', onComplete: () => split.revert() });
    createQuillWriter(point, body).write(timeline, letters, 0, SIGN_PACE.penRate);
    return () => {
      timeline.kill();
      split.revert();
      gsap.set(body, { opacity: 0 });
    };
  }, [signed, written, reduced]);

  return (
    <div
      ref={rootRef}
      data-sign="root"
      aria-hidden="true"
      className="pointer-events-none absolute flex items-baseline leading-none text-ink"
      style={{
        left: cq(SHARE_SIGNATURE.left),
        top: cq(SHARE_SIGNATURE.baseline - SHARE_SIGNATURE.namePx * 0.82),
        gap: cq(SHARE_SIGNATURE.gap),
        visibility: signed === '' ? 'hidden' : undefined,
      }}
    >
      <span className="font-voice tracking-[0.02em] text-muted" style={{ fontSize: cq(SHARE_SIGNATURE.labelPx) }}>
        SIGNED
      </span>
      <span className="relative" style={{ fontSize: cq(SHARE_SIGNATURE.namePx) }}>
        {/* A fresh element for every name, so the pen's letter split never meets React's text. */}
        <span key={signed} data-sign="name" className="font-legend whitespace-nowrap">
          {signed}
        </span>
        <Quill attribute="data-sign-pen" sizeClassName="h-[clamp(1.5rem,3vw,2.25rem)]" toneClassName="text-ink" />
      </span>
    </div>
  );
}

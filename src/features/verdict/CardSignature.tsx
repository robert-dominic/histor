// src/features/verdict/CardSignature.tsx
// The player's signature on the shareable card's preview (polish brief, A4). As they type in "Sign your case file",
// the pen writes onto the card once they pause (debounced). The pen adds; it never rewrites (ui-pass brief, 5): only
// the new letters are written, where they go; a letter deleted fades out quickly on its own; a pasted name is written
// as it comes. Each letter is its own element, kept by React from one name to the next, so nothing already written is
// touched. It lies over the canvas at the card's own signature place (SHARE_SIGNATURE), in the card's units: the
// container is a size container as wide as the canvas, so 1cqw is 12 of the card's 1200px. The canvas that is saved
// draws the same signature itself (share-card.ts). A name already saved is simply there; reduced motion: letters
// simply appear and go.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import Quill from '@/components/Quill';
import { QUICK_OUT } from '@/lib/motion';
import { cleanPlayerName } from '@/lib/player-name';
import { SHARE_CARD, SHARE_SIGNATURE } from '@/lib/share-card';
import { createQuillWriter } from '@/lib/quill-writing';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { diffSignature, lettersOf, type Letter } from '@/lib/signature-letters';

/** To tune: how long the player pauses before the pen writes (s), and the pen's letters a second. */
const SIGN_PACE = { settle: 0.35, penRate: 14 } as const;

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
  // The first name (saved from last time) is simply there; only what the player types is written.
  const [letters, setLetters] = useState<Letter[]>(() => lettersOf(cleanPlayerName(name), 'kept'));

  useEffect(() => {
    const clean = cleanPlayerName(name);
    if (clean === signed) {
      return;
    }
    const timer = window.setTimeout(() => {
      setSigned(clean);
      setLetters(now => diffSignature(now, clean));
      onSigned(clean);
    }, SIGN_PACE.settle * 1000);
    return () => window.clearTimeout(timer);
  }, [name, signed, onSigned]);

  // The pen writes the new letters; the leaving ones fade out quickly and are gone.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (root === null) {
      return;
    }
    const element = (letter: Letter) => root.querySelector<HTMLElement>(`[data-sign-letter="${letter.id}"]`);
    const fresh = letters.filter(letter => letter.state === 'new').map(element).filter((el): el is HTMLElement => el !== null);
    const leaving = letters.filter(letter => letter.state === 'leaving');
    const settle = () =>
      setLetters(now =>
        now.some(letter => letter.state !== 'kept') ? now.filter(letter => letter.state !== 'leaving').map(letter => ({ ...letter, state: 'kept' })) : now
      );
    const point = root.querySelector<HTMLElement>('[data-sign-pen="quill"]');
    const body = root.querySelector<HTMLElement>('[data-sign-pen="quill-body"]');
    const animate = !reduced && typeof window.matchMedia === 'function';
    if (fresh.length === 0 && leaving.length === 0) {
      return;
    }
    if (!animate || point === null || body === null) {
      settle();
      return;
    }
    const timeline = gsap.timeline({ data: 'card-signature', onComplete: settle });
    const gone = leaving.map(element).filter((el): el is HTMLElement => el !== null);
    if (gone.length > 0) {
      timeline.to(gone, { opacity: 0, ...QUICK_OUT }, 0);
    }
    if (fresh.length > 0) {
      gsap.set(fresh, { opacity: 0 });
      createQuillWriter(point, body).write(timeline, fresh, gone.length > 0 ? QUICK_OUT.duration : 0, SIGN_PACE.penRate);
    }
    return () => {
      timeline.kill();
      gsap.set(body, { opacity: 0 });
      gsap.set(fresh, { opacity: 1 });
    };
  }, [letters, reduced]);

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
        visibility: signed === '' && letters.length === 0 ? 'hidden' : undefined,
      }}
    >
      <span className="font-voice tracking-[0.02em] text-muted" style={{ fontSize: cq(SHARE_SIGNATURE.labelPx) }}>
        SIGNED
      </span>
      <span className="relative" style={{ fontSize: cq(SHARE_SIGNATURE.namePx) }}>
        {/* Each letter its own element, kept from one name to the next: the pen only ever touches the new ones. */}
        <span data-sign="name" className="font-legend whitespace-pre">
          {letters.map(letter => (
            <span key={letter.id} data-sign-letter={letter.id} data-state={letter.state} className="inline-block whitespace-pre">
              {letter.char}
            </span>
          ))}
        </span>
        <Quill attribute="data-sign-pen" sizeClassName="h-[clamp(1.5rem,3vw,2.25rem)]" toneClassName="text-ink" />
      </span>
    </div>
  );
}

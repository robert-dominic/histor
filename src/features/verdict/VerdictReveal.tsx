// src/features/verdict/VerdictReveal.tsx
// The verdict becomes a reveal (investigation brief, item 3). Once the player has closed the case: the lamp narrows,
// the app types "Most historians lean toward…", the pen writes in the leading theories one by one, and one line
// compares them with the player's choice. Then a typed rank card, and the shareable card. The case report follows
// below it (Report.tsx).
// The full reveal plays when the player arrives from closing the case (`fresh`); otherwise it is simply there.
// Reduced motion: everything simply appears. Everything shown comes from the case report and the shared UI copy.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import Quill from '@/components/Quill';
import CardSignature from '@/features/verdict/CardSignature';
import { caseRank, leadingTheories, legendsTrustedCount, verdictComparison } from '@/lib/case-rank';
import type { CaseReport } from '@/lib/case-report';
import { MOTION, MOTION_QUERIES, STEP, tween } from '@/lib/motion';
import { createQuillWriter } from '@/lib/quill-writing';
import { PLAYER_NAME_MAX, loadPlayerName, savePlayerName } from '@/lib/player-name';
import {
  SHARE_CARD,
  copyText,
  drawShareCard,
  loadShareCardFonts,
  renderShareCard,
  saveShareCard,
  shareCardLines,
  shareCardText,
  shareLinks,
  shareShareCard,
  shareUrl,
  type ShareCardInput,
} from '@/lib/share-card';
import { emitStoryEvent } from '@/lib/story-events';
import { RANK_COPY, REVEAL_COPY } from '@/lib/ui-copy';

gsap.registerPlugin(useGSAP, SplitText);

/** The reveal's pace, to tune. Letters a second for what the app types, and for each theory the pen writes. */
const REVEAL_PACE = {
  /** The lamp narrows first, then the lead line is typed. */
  leadAfter: MOTION.scene.duration,
  typeRate: 30,
  penRate: 16,
  /** A breath between one theory written and the next, and before the comparison. */
  beat: STEP.base,
} as const;

const LINK_CLASSES =
  'inline-flex min-h-10 items-center rounded-sm px-3 font-voice text-[0.8125rem] tracking-[0.08em] text-night-ink/85 underline decoration-night-ink/30 underline-offset-4 transition-[color,text-decoration-color] duration-150 ease-out hover:text-night-ink hover:decoration-night-ink/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass';

const BUTTON_CLASSES =
  'inline-flex min-h-11 items-center rounded-sm border border-night-ink/40 px-5 font-voice text-sm tracking-[0.12em] text-night-ink uppercase transition-[scale,background-color,color] duration-150 ease-out hover:bg-night-ink/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass active:scale-[0.97]';

interface VerdictRevealProps {
  report: CaseReport;
  /** The case, for the card. */
  caseId: string;
  title: string;
  years: string;
  /** The player has just closed the case: the reveal plays. Otherwise it is simply shown. */
  fresh: boolean;
  /** Asks the lamp to narrow onto the reveal (true), and to open again (false). */
  onNarrow?: (narrow: boolean) => void;
}

export default function VerdictReveal({ report, caseId, title, years, fresh, onNarrow }: VerdictRevealProps) {
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shareNote, setShareNote] = useState('');
  // The player's signature: what is in the field, and what the card is signed with once they pause.
  const [typed, setTyped] = useState(loadPlayerName);
  const [signature, setSignature] = useState(() => loadPlayerName());
  const sign = useCallback((name: string) => {
    setSignature(name);
    savePlayerName(name);
  }, []);
  const leading = useMemo(() => leadingTheories(report), [report]);
  const comparison = useMemo(() => verdictComparison(report), [report]);
  const rank = useMemo(() => caseRank(report), [report]);
  const card: ShareCardInput = useMemo(
    () => ({ title, years, rank, legends: legendsTrustedCount(report) }),
    [title, years, rank, report]
  );
  // What is saved and shared: the card with its signature. The preview draws it without, and the pen writes the
  // name over it (CardSignature).
  const signedCard: ShareCardInput = useMemo(() => (signature === '' ? card : { ...card, name: signature }), [card, signature]);
  const fileName = `histor-${caseId}.png`;
  const url = shareUrl(caseId);
  const text = shareCardText(card);

  // The card is drawn once the site's fonts are ready (a canvas does not wait for them by itself).
  useEffect(() => {
    let live = true;
    const canvas = canvasRef.current;
    if (canvas === null) {
      return;
    }
    drawShareCard(canvas, card);
    void loadShareCardFonts().then(() => live && drawShareCard(canvas, card));
    return () => {
      live = false;
    };
  }, [card]);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (root === null || !fresh || typeof window.matchMedia !== 'function') {
        return;
      }
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES, context => {
        if (context.conditions?.reduced === true) {
          onNarrow?.(true);
          emitStoryEvent({ type: 'rank', rank });
          return;
        }
        const splits: SplitText[] = [];
        const lettersOf = (element: Element | null) => {
          if (element === null) {
            return [];
          }
          const split = SplitText.create(element, { type: 'chars', aria: 'none' });
          splits.push(split);
          const letters = split.chars as HTMLElement[];
          gsap.set(letters, { opacity: 0 });
          return letters;
        };
        const timeline = gsap.timeline({ data: 'verdict-reveal' });
        const type = (element: Element | null, at: number) => {
          const letters = lettersOf(element);
          letters.forEach((letter, index) => timeline.set(letter, { opacity: 1 }, at + index / REVEAL_PACE.typeRate));
          return at + letters.length / REVEAL_PACE.typeRate;
        };
        const later = root.querySelectorAll('[data-reveal="reason"], [data-reveal="rank"], [data-reveal="share"]');
        gsap.set(later, { opacity: 0 });

        // The lamp narrows; then the lead line is typed.
        onNarrow?.(true);
        let at: number = type(root.querySelector('[data-reveal="lead"]'), REVEAL_PACE.leadAfter);
        // The pen writes in the leading theories, one by one.
        const point = root.querySelector<HTMLElement>('[data-reveal-pen="quill"]');
        const body = root.querySelector<HTMLElement>('[data-reveal-pen="quill-body"]');
        if (point !== null && body !== null) {
          const pen = createQuillWriter(point, body);
          root.querySelectorAll('[data-reveal="leading"]').forEach(theory => {
            at += REVEAL_PACE.beat;
            const letters = lettersOf(theory);
            at += pen.write(timeline, letters, at, REVEAL_PACE.penRate);
          });
        }
        // The comparison with the player's choice; a theory not leading has its reason after it.
        at = type(root.querySelector('[data-reveal="compare"]'), at + REVEAL_PACE.beat);
        timeline.to(root.querySelectorAll('[data-reveal="reason"]'), { opacity: 1, ...tween('ink.in') }, at);
        // The rank card, typed; then the shareable card.
        at += MOTION['ink.in'].duration;
        timeline.fromTo(
          root.querySelectorAll('[data-reveal="rank"]'),
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, ...tween('paper.lift') },
          at
        );
        at = type(root.querySelector('[data-reveal="rank-name"]'), at + MOTION['paper.lift'].duration);
        timeline.call(() => emitStoryEvent({ type: 'rank', rank }), undefined, at);
        timeline.to(root.querySelectorAll('[data-reveal="share"]'), { opacity: 1, ...tween('ink.in') }, at + REVEAL_PACE.beat);
        // Everything is in: the lamp opens again, the letters go back to plain text.
        timeline.call(() => {
          onNarrow?.(false);
          splits.forEach(split => split.revert());
        });
        return () => {
          splits.forEach(split => split.revert());
          gsap.set(later, { clearProps: 'opacity,transform' });
        };
      });
    },
    { scope: rootRef, dependencies: [fresh] }
  );

  const save = async () => {
    setShareNote((await saveShareCard(renderShareCard(signedCard), fileName)) ? 'Saved.' : 'This browser cannot save the card.');
  };
  const share = async () => {
    const outcome = await shareShareCard(renderShareCard(signedCard), fileName, text, url);
    setShareNote(outcome === 'copied' ? 'Copied to the clipboard.' : outcome === 'shared' ? 'Shared.' : '');
  };
  const copyLink = async () => {
    setShareNote((await copyText(url)) === 'copied' ? 'Link copied.' : 'This browser cannot copy the link.');
  };

  const rankCopy = RANK_COPY[rank];
  const lines = shareCardLines(card);

  return (
    <section
      ref={rootRef}
      aria-labelledby="reveal-lead"
      data-reveal="root"
      // Two columns on a laptop (polish brief, A4): the reveal and the rank on the left, the card and its actions on the
      // right. One column, centred, on a phone.
      className="relative z-[21] mx-auto mb-10 grid max-w-3xl grid-cols-1 items-start gap-10 px-2 text-center text-night-ink lg:max-w-6xl lg:grid-cols-2 lg:gap-14 lg:text-left"
    >
      <div data-reveal="column" data-side="reveal" className="flex flex-col items-center gap-6 lg:items-start">
        <div className="flex flex-col items-center gap-3 lg:items-start">
          <p id="reveal-lead" data-reveal="lead" className="font-voice text-[clamp(1.125rem,1rem+0.6vw,1.5rem)] tracking-[0.04em]">
            {leading.length > 0 ? REVEAL_COPY.lead : REVEAL_COPY.noLeading}
          </p>
          {/* The pen writes the leading theories in, one by one. */}
          {leading.length > 0 && (
            <div className="relative">
              <ul className="flex flex-col items-center gap-1 lg:items-start">
                {leading.map(theory => (
                  <li key={theory.theoryId} data-reveal="leading" className="font-legend text-[clamp(2rem,1.4rem+2.4vw,3.25rem)] leading-[1.1]">
                    {theory.title}
                  </li>
                ))}
              </ul>
              <Quill attribute="data-reveal-pen" sizeClassName="h-[clamp(2.5rem,4vw,3.5rem)]" />
            </div>
          )}
          {comparison.kind !== 'none' && (
            <p data-reveal="compare" data-kind={comparison.kind} className="mt-2 max-w-[34rem] font-voice text-[1.0625rem] leading-snug">
              {comparison.line}
            </p>
          )}
          {comparison.reason !== undefined && (
            <p data-reveal="reason" className="max-w-[34rem] font-record text-[1.0625rem] leading-normal text-night-ink/85">
              {comparison.reason}
            </p>
          )}
        </div>

        {/* The rank, as a typed card. */}
        <div data-reveal="rank" className="desk-typed-paper flex w-full max-w-md flex-col items-center gap-2 rounded-[2px] px-6 pt-5 pb-5 text-center text-ink">
          <p className="font-voice text-[0.75rem] tracking-[0.2em] text-ink/75 uppercase">Your rank</p>
          <p data-reveal="rank-name" data-rank={rank} className="rubber-stamp text-[1.5rem]">
            {rankCopy.name}
          </p>
          <p data-reveal="rank-line" className="font-record text-[1.0625rem] leading-snug">
            {rankCopy.line}
          </p>
        </div>
      </div>

      {/* The shareable card: signed, drawn here, saved or shared from the browser. Nothing is uploaded. */}
      <div data-reveal="share" data-side="share" className="flex w-full flex-col items-center gap-4 lg:items-stretch">
        <label className="flex w-full max-w-xl flex-col gap-1.5 text-left">
          <span className="font-voice text-[0.8125rem] tracking-[0.14em] text-night-ink/80 uppercase">Sign your case file</span>
          <input
            type="text"
            name="player-name"
            data-reveal="name"
            value={typed}
            onChange={event => setTyped(event.target.value)}
            placeholder="Your name"
            maxLength={PLAYER_NAME_MAX}
            autoComplete="name"
            spellCheck={false}
            className="min-h-11 rounded-sm border border-night-ink/30 bg-night/60 px-3 font-record text-[1.0625rem] text-night-ink placeholder:text-night-ink/45 focus-visible:border-brass focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
          />
        </label>
        {/* The preview, with the pen-written signature over it, in the card's own units. */}
        <div data-reveal="preview" className="relative w-full max-w-xl [container-type:inline-size]">
          <canvas
            ref={canvasRef}
            width={SHARE_CARD.width}
            height={SHARE_CARD.height}
            role="img"
            aria-label={`${lines.closed} ${lines.rank}. ${lines.legends}${signature === '' ? '' : ` Signed ${signature}.`} ${lines.site}`}
            className="block aspect-[1200/630] w-full rounded-[2px] shadow-lg shadow-black/50"
          />
          <CardSignature name={typed} onSigned={sign} />
        </div>
        <div className="flex w-full max-w-xl flex-wrap justify-center gap-3 lg:justify-start">
          <button type="button" onClick={() => void save()} className={BUTTON_CLASSES}>
            Save the card
          </button>
          <button type="button" onClick={() => void share()} className={BUTTON_CLASSES}>
            Share
          </button>
        </div>
        {/* Direct links: each site's own share page, in a new tab, with the words and the link filled in. */}
        <ul aria-label="Share on" data-reveal="links" className="flex w-full max-w-xl flex-wrap justify-center gap-x-1 gap-y-1 lg:justify-start">
          {shareLinks(text, url).map(link => (
            <li key={link.id}>
              <a href={link.href} target="_blank" rel="noopener noreferrer" data-share={link.id} className={LINK_CLASSES}>
                {link.label}
              </a>
            </li>
          ))}
          <li>
            <button type="button" onClick={() => void copyLink()} data-share="copy" className={LINK_CLASSES}>
              Copy link
            </button>
          </li>
        </ul>
        <p data-reveal="attach-note" className="max-w-xl font-voice text-[0.8125rem] leading-snug text-ghost-night">
          Share links can’t carry images: save the card first, then attach it.
        </p>
        <p aria-live="polite" data-reveal="share-note" className="min-h-5 font-voice text-[0.8125rem] text-ghost-night">
          {shareNote}
        </p>
      </div>
    </section>
  );
}

// src/features/verdict/Verdict.tsx
// "Which theory do you believe?" The user picks one theory, then holds to close the case.
// Before enough files are open, this page sends the user back to the board.
// The five theories lie as notes on the desk, under a still lamp. When the hold completes, the chosen note is
// stamped "Chosen" (a rubber ink stamp, `stamp.hit`), and then the case closes.
// Reduced motion: a plain confirm button instead of the hold, and the stamp simply appears.
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useInvestigation } from '@/app/InvestigationProvider';
import DeskSurface from '@/features/board/DeskSurface';
import Lamp from '@/features/board/Lamp';
import HoldToClose from '@/features/verdict/HoldToClose';
import { scatter } from '@/lib/desk';
import { stampHit } from '@/lib/motion';
import { emitStoryEvent } from '@/lib/story-events';
import { useReducedMotion } from '@/lib/use-reduced-motion';

/** Seconds the "Chosen" stamp stays in view before the report opens. */
const STAMP_HOLD = 0.5;

export default function Verdict() {
  const { state, dispatch, caseData } = useInvestigation();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  // Starts on the verdict already given, if the case was closed before.
  const [choice, setChoice] = useState<string | null>(state.verdict);
  const base = `/case/${caseData.id}`;
  const rootRef = useRef<HTMLElement>(null);
  const pressRef = useRef<gsap.core.Timeline | null>(null);
  // Leaving the page mid-press stops it: the case is not closed behind the user's back.
  useEffect(() => () => void pressRef.current?.kill(), []);

  if (state.opened.length < caseData.closeThreshold) {
    return <Navigate to={`${base}/files`} replace />;
  }

  const close = () => {
    if (choice === null) {
      return;
    }
    const finish = () => {
      dispatch({ type: 'CLOSE_CASE', theoryId: choice });
      // The report opens on its reveal (VerdictReveal.tsx).
      navigate(`${base}/report`, { state: { fresh: true } });
    };
    emitStoryEvent({ type: 'seal', where: 'verdict' });
    const stamp = rootRef.current?.querySelector('[data-verdict="chosen"]');
    if (stamp == null) {
      finish();
      return;
    }
    // The chosen note is stamped, and rests a moment before the report.
    pressRef.current = stampHit(stamp, { reduced: reducedMotion }).call(finish, undefined, `+=${STAMP_HOLD}`);
  };

  return (
    <main
      ref={rootRef}
      data-page="case"
      aria-labelledby="verdict-question"
      className="relative isolate min-h-svh bg-night px-4 pt-[calc(var(--case-header)+2rem)] pb-16 text-night-ink lg:px-10 lg:pt-[calc(var(--case-header)+4rem)]"
    >
      <DeskSurface />
      {/* Above the lamp's shadow: the notes and the question stay fully readable. */}
      <div className="relative z-[21] mx-auto max-w-6xl">
        <h2 id="verdict-question" className="font-voice text-[clamp(1.25rem,1rem+1vw,1.75rem)] text-night-ink">
          Which theory do you believe?
        </h2>

        <div role="group" aria-labelledby="verdict-question" className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:gap-5">
          {caseData.theories.map(theory => {
            const chosen = choice === theory.id;
            const { rotate } = scatter(theory.id, 2.5, 0);
            return (
              <button
                key={theory.id}
                type="button"
                aria-pressed={chosen}
                data-verdict="note"
                data-theory-id={theory.id}
                onClick={() => setChoice(theory.id)}
                style={{ rotate: `${rotate}deg` }}
                className={`desk-note relative flex flex-col gap-2 rounded-[2px] px-4 pt-6 pb-4 text-left text-ink shadow-lg shadow-black/60 outline-offset-4 transition-[scale,opacity] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-brass active:scale-[0.97] ${
                  chosen || choice === null ? '' : 'opacity-70 hover:opacity-100'
                }`}
              >
                {/* The brass ring of the chosen note: a layer whose opacity changes. */}
                <span
                  aria-hidden="true"
                  data-verdict="ring"
                  data-on={chosen}
                  className="pointer-events-none absolute inset-0 rounded-[2px] ring-4 ring-brass opacity-0 transition-opacity duration-(--motion-hover-duration) ease-(--motion-hover-ease) data-[on=true]:opacity-100"
                />
                <span aria-hidden="true" className="desk-pin absolute top-2 left-1/2 size-3 -translate-x-1/2 rounded-full" />
                <span className="font-legend text-[1.375rem] leading-[1.05]">{theory.title}</span>
                <span className="font-record text-[0.9375rem] leading-snug text-ink/85">{theory.claim}</span>
                {/* The rubber stamp, pressed on when the case is closed. Hidden until then. */}
                {chosen && (
                  <span
                    aria-hidden="true"
                    data-verdict="chosen"
                    className="rubber-stamp pointer-events-none absolute -right-2 -bottom-3 bg-paper/70 text-[1.125rem]"
                    style={{ opacity: 0 }}
                  >
                    Chosen
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col items-center gap-6">
          {reducedMotion ? (
            <button
              type="button"
              disabled={choice === null}
              onClick={close}
              className="min-h-11 rounded-sm border border-rust-night px-6 font-voice text-sm tracking-[0.14em] text-night-ink uppercase transition-[scale,background-color,opacity] duration-150 ease-out hover:bg-rust focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass active:scale-[0.97] disabled:opacity-40"
            >
              Close the case
            </button>
          ) : (
            <HoldToClose disabled={choice === null} onComplete={close} />
          )}
          <Link
            to={`${base}/files`}
            className="inline-flex min-h-11 items-center font-voice text-sm tracking-[0.1em] text-ghost-night uppercase underline underline-offset-4 transition-[color] duration-150 ease-out hover:text-night-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
          >
            Back to the board
          </Link>
        </div>
      </div>
      <Lamp still />
    </main>
  );
}

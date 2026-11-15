// src/features/verdict/Verdict.tsx
// "Which theory do you believe?" The user picks one theory, then holds to close the case.
// Before enough files are open, this page sends the user back to the board.
// Reduced motion: a plain confirm button instead of the hold.

import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useInvestigation } from '@/app/InvestigationProvider';
import HoldToClose from '@/features/verdict/HoldToClose';
import { useReducedMotion } from '@/lib/use-reduced-motion';

export default function Verdict() {
  const { state, dispatch, caseData } = useInvestigation();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  // Starts on the verdict already given, if the case was closed before.
  const [choice, setChoice] = useState<string | null>(state.verdict);
  const base = `/case/${caseData.id}`;

  if (state.opened.length < caseData.closeThreshold) {
    return <Navigate to={`${base}/files`} replace />;
  }

  const close = () => {
    if (choice === null) {
      return;
    }
    dispatch({ type: 'CLOSE_CASE', theoryId: choice });
    navigate(`${base}/report`);
  };

  return (
    <main
      data-page="case"
      aria-labelledby="verdict-question"
      className="min-h-svh bg-night px-4 pt-[calc(var(--case-header)+2rem)] pb-16 text-night-ink lg:px-10 lg:pt-[calc(var(--case-header)+4rem)]"
    >
      <div className="mx-auto max-w-6xl">
        <h2 id="verdict-question" className="font-voice text-[clamp(1.25rem,1rem+1vw,1.75rem)] text-night-ink">
          Which theory do you believe?
        </h2>

        <div role="group" aria-labelledby="verdict-question" className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:gap-5">
          {caseData.theories.map(theory => {
            const chosen = choice === theory.id;
            return (
              <button
                key={theory.id}
                type="button"
                aria-pressed={chosen}
                onClick={() => setChoice(theory.id)}
                className={`flex flex-col gap-2 rounded-sm bg-paper px-4 pt-4 pb-4 text-left text-ink shadow-lg shadow-black/50 outline-offset-4 transition-[scale,box-shadow,opacity] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-brass active:scale-[0.97] ${
                  chosen ? 'ring-4 ring-brass' : choice === null ? '' : 'opacity-70 hover:opacity-100'
                }`}
              >
                <span className="font-legend text-[1.375rem] leading-[1.05]">{theory.title}</span>
                <span className="font-record text-[0.9375rem] leading-snug text-ink/85">{theory.claim}</span>
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
    </main>
  );
}

// src/features/story/CentralQuestion.tsx
// The end of the story: the case's central question, a chokepoint on one solid black screen. Story.tsx builds it one
// line per step: the case's own lines (`Case.centralQuestionLines`), or else split at its commas and before "and".
// Its weighted parts arrive on their own after a breath, slightly brighter (no lines drawn in the story). The fork
// comes only after the whole question. Under reduced motion it is simply shown whole.
// The text comes from the case data. Screen readers get the whole question at once.
import ListenButton from '@/features/story/ListenButton';
import { questionLines } from '@/lib/phrases';
import { weightedPieces } from '@/lib/story-emphasis';
import type { Narration } from '@/types/case';

interface CentralQuestionProps {
  question: string;
  /** Its weighted parts (`Case.centralQuestionEmphasis`). */
  emphasis?: string[];
  /** The lines it is shown in (`Case.centralQuestionLines`). */
  lines?: string[];
  /** It read aloud (`Case.centralQuestionNarration`): a "Listen" button under it. */
  narration?: Narration;
}

export default function CentralQuestion({ question, emphasis = [], lines, narration }: CentralQuestionProps) {
  return (
    <div
      data-story="question"
      className="relative z-10 grid min-h-svh place-items-center bg-black px-6 py-[8svh] text-center sm:px-10"
    >
      <h2 className="max-w-[24em] font-record text-[clamp(1.5rem,1.05rem+2.2vw,2.75rem)] leading-[1.32] text-balance text-night-ink/85">
        {/* Screen readers get the whole question at once; the phrases that are written in are for the eyes only. */}
        <span className="sr-only">{question}</span>
        <span aria-hidden="true" className="flex flex-col items-center gap-[0.15em]">
          {questionLines(question, lines).map((phrase, index) => (
            <span key={index} data-story="phrase" className="block">
              {weightedPieces(phrase, emphasis).map((piece, pieceIndex) =>
                piece.weighted ? (
                  <span
                    key={pieceIndex}
                    data-story="weighted"
                    className="inline-block whitespace-nowrap text-night-ink [text-shadow:0_0_18px_rgb(230_225_211/0.3)]"
                  >
                    {piece.text}
                  </span>
                ) : (
                  <span key={pieceIndex}>{piece.text}</span>
                )
              )}
            </span>
          ))}
        </span>
      </h2>
      {narration !== undefined && <ListenButton narration={narration} className="absolute inset-x-0 bottom-[8svh] justify-center" />}
    </div>
  );
}

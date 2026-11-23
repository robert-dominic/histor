// src/features/story/CentralQuestion.tsx
// The end of the story: the case's central question, a chokepoint on a full-black screen. Story.tsx pins it and
// builds it phrase by phrase (split at its commas and before "and", splitQuestion), each phrase a stop the scroll
// settles on; its weighted parts arrive on their own after a breath, slightly brighter (no lines in the story). The fork comes only after the whole
// question, and a short hold. Under reduced motion it is simply shown whole.
// The text comes from the case data. Screen readers get the whole question at once.
import { splitQuestion } from '@/lib/phrases';
import { weightedPieces } from '@/lib/story-emphasis';

interface CentralQuestionProps {
  question: string;
  /** Its weighted parts (`Case.centralQuestionEmphasis`). */
  emphasis?: string[];
}

export default function CentralQuestion({ question, emphasis = [] }: CentralQuestionProps) {
  return (
    <div
      data-story="question"
      className="relative z-10 grid min-h-svh place-items-center bg-black px-6 py-[12svh] text-center sm:px-10"
    >
      <h2 className="max-w-[24em] font-record text-[clamp(1.5rem,1.05rem+2.2vw,2.75rem)] leading-[1.32] text-balance text-night-ink/85">
        {/* Screen readers get the whole question at once; the phrases that are written in are for the eyes only. */}
        <span className="sr-only">{question}</span>
        <span aria-hidden="true" className="flex flex-col items-center gap-[0.15em]">
          {splitQuestion(question).map((phrase, index) => (
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
    </div>
  );
}

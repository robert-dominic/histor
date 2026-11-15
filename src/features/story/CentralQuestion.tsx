// src/features/story/CentralQuestion.tsx
// The end of the story: the case's central question on its own screen, at full night.
// Story.tsx fades it in phrase by phrase. The text comes from the case data.

import { splitIntoPhrases } from '@/lib/phrases';

interface CentralQuestionProps {
  question: string;
}

export default function CentralQuestion({ question }: CentralQuestionProps) {
  return (
    <div
      data-story="question"
      className="relative z-10 grid min-h-svh place-items-center bg-night px-6 py-[18svh] text-center sm:px-10"
    >
      <h2 className="max-w-[21em] font-record text-[clamp(1.5rem,1.05rem+2.2vw,2.75rem)] leading-[1.32] text-balance text-night-ink">
        {/* Screen readers get the whole question at once; the phrases that fade in are for the eyes only. */}
        <span className="sr-only">{question}</span>
        <span aria-hidden="true">
          {splitIntoPhrases(question).map((phrase, index) => (
            <span key={index} data-story="phrase">
              {phrase}{' '}
            </span>
          ))}
        </span>
      </h2>
    </div>
  );
}

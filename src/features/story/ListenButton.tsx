// src/features/story/ListenButton.tsx
// "Listen" (polish brief, B5): a small button on a chapter's panel, or under the central question, when it has a
// recording. Pressing it plays the narration (or stops it); with "Read at my pace" it is the only way a clip plays.
// The credit is beside it. Shown only when there is narration: no case has recordings yet.
import { narrator } from '@/lib/sound';
import { useNarration } from '@/lib/sound/narration';
import type { Narration } from '@/types/case';

export default function ListenButton({ narration, className = '' }: { narration: Narration; className?: string }) {
  const playing = useNarration(narrator) === narration.src;
  return (
    <p className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 ${className}`}>
      <button
        type="button"
        data-story="listen"
        aria-pressed={playing}
        onClick={event => {
          // Not a click on the page: it does not finish the pen's writing.
          event.stopPropagation();
          if (playing) {
            narrator.stop();
          } else {
            void narrator.play(narration.src);
          }
        }}
        className="inline-flex min-h-9 items-center gap-2 rounded-sm border border-night-ink/35 px-3 font-voice text-[0.75rem] tracking-[0.14em] text-night-ink/85 uppercase transition-[color,border-color,scale] duration-150 ease-out hover:border-night-ink/70 hover:text-night-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass active:scale-[0.97]"
      >
        <svg aria-hidden="true" viewBox="0 0 12 12" className="size-2.5 fill-current">
          {playing ? <path d="M2 2h3v8H2zM7 2h3v8H7z" /> : <path d="M3 1.5v9l7-4.5z" />}
        </svg>
        Listen
      </button>
      <span data-story="listen-credit" className="font-voice text-[0.6875rem] tracking-[0.04em] text-night-ink/60">
        {narration.credit}
      </span>
    </p>
  );
}

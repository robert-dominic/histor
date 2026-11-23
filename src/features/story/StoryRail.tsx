// src/features/story/StoryRail.tsx
// The story's progress rail (story-steps brief, 1.2): a thin line down the left edge with one tick per chapter, and
// one for the question. The current tick is lit in brass. Hovering or focusing a tick shows its chapter's heading;
// clicking it jumps there (Story.tsx: a quick dissolve, the pages before it already written). Hidden while a modal
// is open. Everything shown comes from props.

interface StoryRailProps {
  /** One label per tick: each chapter's heading, then the question's. */
  labels: string[];
  /** The lit tick, or -1 for none. */
  current: number;
  hidden: boolean;
  onJump: (tick: number) => void;
}

export default function StoryRail({ labels, current, hidden, onJump }: StoryRailProps) {
  return (
    <nav
      aria-label="Story progress"
      data-story="rail"
      data-story-control=""
      data-visible={String(!hidden)}
      inert={hidden}
      className="fixed top-1/2 left-0 z-30 -translate-y-1/2 pl-1.5 transition-[opacity,visibility] duration-200 ease-out data-[visible=false]:invisible data-[visible=false]:opacity-0 sm:pl-2.5"
    >
      {/* The rail itself: a hairline behind the ticks. */}
      <span aria-hidden="true" className="absolute top-3 bottom-3 left-[calc(0.375rem+0.6875rem)] w-px bg-night-ink/20 sm:left-[calc(0.625rem+0.6875rem)]" />
      <ol className="relative flex flex-col gap-1">
        {labels.map((label, tick) => {
          const lit = tick === current;
          return (
            <li key={tick} className="group/tick relative">
              <button
                type="button"
                data-story="rail-tick"
                data-current={String(lit)}
                aria-current={lit ? 'step' : undefined}
                aria-label={label}
                onClick={() => onJump(tick)}
                // A full-size target around a small tick.
                className="grid size-[1.375rem] place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-brass active:scale-[0.97]"
              >
                <span
                  aria-hidden="true"
                  className={`block h-2.5 w-0.5 rounded-full transition-[background-color,scale] duration-200 ease-out ${
                    lit ? 'scale-y-150 bg-brass' : 'bg-night-ink/45 group-hover/tick:bg-night-ink/80'
                  }`}
                />
              </button>
              {/* The chapter's heading, beside the tick on hover or focus. */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-7 -translate-y-1/2 rounded-[2px] bg-night/85 px-2 py-1 font-voice text-[0.6875rem] tracking-[0.08em] whitespace-nowrap text-night-ink opacity-0 transition-opacity duration-150 ease-out group-focus-within/tick:opacity-100 group-hover/tick:opacity-100"
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

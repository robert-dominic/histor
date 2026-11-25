// src/features/landing/ProgressRail.tsx
// The landing page's progress rail (landing brief, 5): thin ticks on the left, one per case, the current one long and
// bright. A tick goes to its case. On a laptop only; phones scroll a plain stack.
import type { Exhibit } from '@/cases';

interface ProgressRailProps {
  exhibits: Exhibit[];
  /** The case on screen. */
  current: number;
  onGo: (index: number) => void;
  /** Shown once the wordmark has docked. */
  shown: boolean;
}

export default function ProgressRail({ exhibits, current, onGo, shown }: ProgressRailProps) {
  return (
    <nav
      aria-label="Cases"
      data-landing="rail"
      data-shown={shown}
      className="fixed top-1/2 left-5 z-30 hidden -translate-y-1/2 flex-col gap-1 opacity-0 transition-opacity duration-500 ease-out data-[shown=true]:opacity-100 lg:flex xl:left-7"
    >
      {exhibits.map((exhibit, index) => (
        <button
          key={exhibit.id}
          type="button"
          aria-label={`Go to ${exhibit.title}`}
          aria-current={index === current ? 'true' : undefined}
          data-landing="rail-tick"
          onClick={() => onGo(index)}
          className="group flex h-6 w-10 items-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
        >
          <span
            aria-hidden="true"
            className="block h-px w-3 origin-left bg-night-ink/30 transition-[width,background-color] duration-300 ease-out group-hover:bg-night-ink/60 group-aria-[current=true]:w-9 group-aria-[current=true]:bg-night-ink"
          />
        </button>
      ))}
    </nav>
  );
}

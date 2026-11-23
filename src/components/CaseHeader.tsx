// src/components/CaseHeader.tsx
// The slim header of a case page: the case title and its years, fixed to the top for the whole page.
// It is the page's heading. It shows once the story starts (features/story/Story.tsx finds it by its
// `data-case-header` attribute), and the story's images start below it, so it never covers them.
// Its height is the `--case-header` variable in src/index.css. The two sound controls (music, effects) sit at its right end.
import SoundControls from '@/components/SoundControls';

interface CaseHeaderProps {
  title: string;
  /** e.g. "1872 – 1873". */
  years: string;
  /** True for a case with no accepted answer. */
  unsolved?: boolean;
  /** Starts invisible: the story fades it in once it starts. */
  startHidden?: boolean;
}

export default function CaseHeader({ title, years, unsolved = false, startHidden = false }: CaseHeaderProps) {
  return (
    <header
      data-case-header="bar"
      // Hidden by opacity only, so it is still the page's heading for screen readers.
      style={startHidden ? { opacity: 0 } : undefined}
      className="fixed inset-x-0 top-0 z-30 flex h-[var(--case-header)] items-center justify-between gap-4 border-b border-night-ink/10 bg-night px-4 lg:px-6"
    >
      <h1 className="min-w-0 truncate font-legend text-[1.1875rem] leading-none text-night-ink lg:text-[1.625rem]">
        <span data-case-header="title" className="inline-block">
          {title}
        </span>
      </h1>
      <div className="flex shrink-0 items-center gap-3 lg:gap-4">
        <p className="shrink-0 font-voice text-[0.6875rem] leading-none tracking-[0.18em] text-ghost-night tabular-nums lg:text-xs">
          <span data-case-header="years">{years}</span>
          {/* A small typed tag beside the years, for a case with no accepted answer. */}
          {unsolved && (
            <span
              data-case-header="unsolved"
              className="ml-2.5 inline-block -rotate-2 rounded-[0.14em] border border-rust-night px-1.5 pt-[0.3em] pb-[0.2em] text-rust-night uppercase"
            >
              <span className="sr-only">. </span>Unsolved
            </span>
          )}
        </p>
        <SoundControls />
      </div>
    </header>
  );
}

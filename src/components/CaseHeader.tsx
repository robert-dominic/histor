// src/components/CaseHeader.tsx
// The slim header of a case page: the case title and its years, fixed to the top for the whole page.
// It is the page's heading. The legend intro's title card docks into it (LegendIntro.tsx finds it by
// its `data-case-header` attributes), and the story's images start below it, so it never covers them.
// Its height is the `--case-header` variable in src/index.css.

interface CaseHeaderProps {
  title: string;
  /** e.g. "1872 – 1873". */
  years: string;
  /** True for a case with no accepted answer. */
  unsolved?: boolean;
}

export default function CaseHeader({ title, years, unsolved = false }: CaseHeaderProps) {
  return (
    <header
      data-case-header="bar"
      className="fixed inset-x-0 top-0 z-30 flex h-[var(--case-header)] items-center justify-between gap-4 border-b border-night-ink/10 bg-night px-4 lg:px-6"
    >
      <h1 className="min-w-0 truncate font-legend text-[1.1875rem] leading-none text-night-ink lg:text-[1.625rem]">
        <span data-case-header="title" className="inline-block">
          {title}
        </span>
      </h1>
      <p className="shrink-0 font-voice text-[0.6875rem] leading-none tracking-[0.18em] text-ghost-night tabular-nums lg:text-xs">
        <span data-case-header="years">{years}</span>
        {/* The stamp on the title card is decoration; this is how a screen reader hears it. */}
        {unsolved && <span className="sr-only">. Unsolved</span>}
      </p>
    </header>
  );
}

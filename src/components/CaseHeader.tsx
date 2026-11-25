// src/components/CaseHeader.tsx
// The slim header of a case page: the case title and its years, fixed to the top for the whole page.
// It is the page's heading. It shows once the story starts (features/story/Story.tsx finds it by its
// `data-case-header` attribute), and the story's images start below it, so it never covers them.
// Its height is the `--case-header` variable in src/index.css. The two sound controls (music, effects) sit at its right end.
// The title is a link to the start of the case's story (review-fixes brief, 5), from anywhere in the case: the desk,
// a file, the verdict, the report, the story itself. It carries a fresh `storyStart` token, so the case page goes
// to the story's first step (the play choice) even when it is already showing the story.
import { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import SoundControls from '@/components/SoundControls';
import { MOTION_QUERIES, stampHit } from '@/lib/motion';
import { typeElement } from '@/lib/typewriter';

gsap.registerPlugin(useGSAP);

/**
 * The years are typed, with the typewriter's keys (review-fixes brief, 8), the first time the header is seen: at once
 * on the desk, or when the story fades the header in. The UNSOLVED tag then stamps on (sound-files brief, 2).
 */
function useTypedYears(bar: React.RefObject<HTMLElement | null>, startHidden: boolean) {
  useGSAP(
    () => {
      const header = bar.current;
      const years = header?.querySelector<HTMLElement>('[data-case-header="years"]');
      if (header == null || years == null || typeof window.matchMedia !== 'function' || window.matchMedia(MOTION_QUERIES.reduced).matches) {
        return;
      }
      let timeline: gsap.core.Timeline | null = null;
      let revert: (() => void) | null = null;
      const unsolved = header.querySelector<HTMLElement>('[data-case-header="unsolved"]');
      const type = () => {
        timeline = gsap.timeline();
        const typed = typeElement(timeline, years, 0);
        if (typed !== null) {
          revert = () => typed.split.revert();
          timeline.call(() => revert?.(), undefined, typed.end);
        }
        // Then the UNSOLVED tag is stamped on beside them, and heard (sound-files brief, 2).
        if (unsolved !== null) {
          gsap.set(unsolved, { opacity: 0 });
          timeline.add(stampHit(unsolved), typed?.end ?? 0);
        }
      };
      const visible = () => Number.parseFloat(header.style.opacity || '1') > 0;
      let observer: MutationObserver | null = null;
      if (!startHidden || visible()) {
        type();
      } else if (typeof MutationObserver === 'function') {
        observer = new MutationObserver(() => {
          if (visible()) {
            observer?.disconnect();
            type();
          }
        });
        observer.observe(header, { attributes: true, attributeFilter: ['style'] });
      }
      return () => {
        observer?.disconnect();
        (timeline as gsap.core.Timeline | null)?.kill();
        (revert as (() => void) | null)?.();
      };
    },
    { scope: bar }
  );
}

/** What the title link tells the case page: go to the start of the story. A new token each click. */
export interface StoryStartState {
  storyStart: number;
}

interface CaseHeaderProps {
  /** The case's id: the title links to its story. */
  caseId: string;
  title: string;
  /** e.g. "1872 – 1873". */
  years: string;
  /** True for a case with no accepted answer. */
  unsolved?: boolean;
  /** Starts invisible: the story fades it in once it starts. */
  startHidden?: boolean;
}

export default function CaseHeader({ caseId, title, years, unsolved = false, startHidden = false }: CaseHeaderProps) {
  const navigate = useNavigate();
  const storyHref = `/case/${caseId}`;
  const barRef = useRef<HTMLElement>(null);
  useTypedYears(barRef, startHidden);
  return (
    <header
      ref={barRef}
      data-case-header="bar"
      // Hidden by opacity only, so it is still the page's heading for screen readers.
      style={startHidden ? { opacity: 0 } : undefined}
      className="fixed inset-x-0 top-0 z-30 flex h-[var(--case-header)] items-center justify-between gap-4 border-b border-night-ink/10 bg-night px-4 lg:px-6"
    >
      <h1 className="min-w-0 truncate font-legend text-[1.1875rem] leading-none text-night-ink lg:text-[1.625rem]">
        <Link
          to={storyHref}
          onClick={event => {
            // A plain click: a fresh token, so the page goes to the story's start even when it is already there.
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
              return;
            }
            event.preventDefault();
            navigate(storyHref, { state: { storyStart: Date.now() } satisfies StoryStartState });
          }}
          data-case-header="title-link"
          title="Back to the start of the story"
          className="rounded-sm transition-colors duration-(--motion-hover-duration) ease-(--motion-hover-ease) hover:text-brass focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brass"
        >
          <span data-case-header="title" className="inline-block">
            {title}
          </span>
        </Link>
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

// src/features/landing/LandingHeader.tsx
// The landing page's header once the wordmark has docked (landing brief, 2): the Histor wordmark on the left, linking
// to the top; on the right a "Music" pill (only when the landing playlist has tracks; a small icon on a phone) and a
// filled "Start investigating" pill to the first open case. Its wordmark is the docking target of the opening's.
import type { Ref } from 'react';
import { Link } from 'react-router-dom';
import { useLandingMusic } from '@/features/landing/use-landing-music';

const PILL =
  'inline-flex h-10 items-center gap-2 rounded-full px-4 font-voice text-[0.8125rem] tracking-[0.06em] transition-[background-color,color,scale] duration-(--motion-hover-duration) ease-(--motion-hover-ease) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass active:scale-[0.97]';

interface LandingHeaderProps {
  /** Where "Start investigating" goes: the first open case. */
  startHref: string;
  /** The header's wordmark: where the opening's wordmark docks. */
  markRef?: Ref<HTMLImageElement>;
  /** The header shows once the wordmark has docked. */
  docked: boolean;
}

export default function LandingHeader({ startHref, markRef, docked }: LandingHeaderProps) {
  const music = useLandingMusic();
  return (
    <header
      data-landing="header"
      data-docked={docked}
      className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between gap-4 bg-linear-to-b from-night via-night/85 to-transparent px-4 lg:h-20 lg:px-8"
    >
      <Link to="/" aria-label="Histor, back to the top" className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brass">
        <img ref={markRef} src="/brand/histor-logo-cream.svg" alt="" data-landing="header-mark" className="h-5 w-auto opacity-0 lg:h-6" />
      </Link>
      <nav
        aria-label="Histor"
        data-landing="header-actions"
        className="flex items-center gap-2 opacity-0 transition-opacity duration-500 ease-out group-data-[docked=true]:opacity-100 data-[docked=true]:opacity-100 sm:gap-3"
        data-docked={docked}
      >
        {music.available && (
          <button
            type="button"
            data-landing="music"
            aria-pressed={music.playing}
            aria-label="Music"
            onClick={music.toggle}
            className={`${PILL} border border-night-ink/25 text-night-ink/85 hover:border-night-ink/50 hover:text-night-ink max-sm:w-10 max-sm:justify-center max-sm:px-0`}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-4">
              <path d="M9 18V6l10-2v12" />
              <circle cx="6.5" cy="18" r="2.5" />
              <circle cx="16.5" cy="16" r="2.5" />
            </svg>
            <span className="max-sm:sr-only">Music</span>
          </button>
        )}
        <Link to={startHref} data-landing="start" className={`${PILL} bg-night-ink font-semibold text-night hover:bg-brass`}>
          Start investigating
        </Link>
      </nav>
    </header>
  );
}

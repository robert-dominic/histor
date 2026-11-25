// src/features/landing/LandingHeader.tsx
// The landing page's header once the wordmark has docked (landing v3 brief): the Histor wordmark on the left, linking
// to the top; on the right a round music button (off until clicked; its tooltip says "Play music", then the track
// playing) and a filled "Walk the archive" pill, which opens the archive room. Its wordmark is the docking target of
// the opening's.
import type { Ref } from 'react';
import { Link } from 'react-router-dom';
import { MusicIcon } from '@/components/icons';
import IconButton from '@/components/IconButton';
import { useLandingMusic } from '@/features/landing/use-landing-music';

const PILL =
  'inline-flex h-10 items-center gap-2 rounded-full px-4 font-voice text-[0.8125rem] tracking-[0.06em] transition-[background-color,color,scale] duration-(--motion-hover-duration) ease-(--motion-hover-ease) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass active:scale-[0.97]';

interface LandingHeaderProps {
  /** Opens the archive room. */
  onWalk: () => void;
  /** The "Walk the archive" button, so focus can come back to it. */
  walkRef?: Ref<HTMLButtonElement>;
  /** The header's wordmark: where the opening's wordmark docks. */
  markRef?: Ref<HTMLImageElement>;
  /** The header's pills show once the wordmark is on its way. */
  docked: boolean;
}

export default function LandingHeader({ onWalk, walkRef, markRef, docked }: LandingHeaderProps) {
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
        className="flex items-center gap-2 opacity-0 transition-opacity duration-500 ease-out data-[docked=true]:opacity-100 sm:gap-3"
        data-docked={docked}
      >
        {music.available && (
          <IconButton
            data-landing="music"
            label={music.playing ? 'Pause music' : 'Play music'}
            tip={music.tip}
            aria-pressed={music.playing}
            icon={<MusicIcon />}
            onClick={music.toggle}
            className="border border-night-ink/25"
          />
        )}
        <button ref={walkRef} type="button" data-landing="walk" onClick={onWalk} className={`${PILL} bg-night-ink font-semibold text-night hover:bg-brass`}>
          Walk the archive
        </button>
      </nav>
    </header>
  );
}

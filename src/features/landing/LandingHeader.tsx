// src/features/landing/LandingHeader.tsx
// The landing page's header once the wordmark has docked (landing v3 brief): the Histor wordmark on the left, linking
// to the top (on the landing page it scrolls softly back to the first case); on the right only a round music button (off until clicked; its tooltip says "Play music", then the track
// playing). Its wordmark is the docking target of the opening's. The same header, without the music button and with
// the wordmark simply linking to the landing, is the header of /credits and /sources (`plain`).
import type { Ref } from 'react';
import { Link } from 'react-router-dom';
import IconButton from '@/components/IconButton';
import MusicButtonFace from '@/features/landing/MusicButtonFace';
import { useLandingMusic } from '@/features/landing/use-landing-music';

/** The plain header plays nothing. */
const NO_TRACKS: never[] = [];

interface LandingHeaderProps {
  /** The wordmark was pressed: the page scrolls softly back to the first case. */
  onHome?: () => void;
  /** The header's wordmark: where the opening's wordmark docks. */
  markRef?: Ref<HTMLImageElement>;
  /** The header's pills show once the wordmark is on its way. */
  docked: boolean;
  /** The plain header of a page that is not the landing (/credits, /sources): the wordmark shown at once, no music. */
  plain?: boolean;
}

export default function LandingHeader({ onHome, markRef, docked, plain = false }: LandingHeaderProps) {
  const music = useLandingMusic(plain ? NO_TRACKS : undefined);
  return (
    <header
      data-landing="header"
      data-docked={docked}
      className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between gap-4 bg-linear-to-b from-night via-night/85 to-transparent px-4 lg:h-20 lg:px-8"
    >
      <Link
        to="/"
        aria-label={plain ? "Histor, back to the archive" : "Histor, back to the top"}
        onClick={event => {
          // On the landing page the wordmark is not a navigation: it scrolls softly back to the first case.
          if (onHome !== undefined && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
            event.preventDefault();
            onHome();
          }
        }}
        className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brass">
        <img ref={markRef} src="/brand/histor-logo-cream.svg" alt="" data-landing="header-mark" className={`h-5 w-auto lg:h-6 ${plain ? "" : "opacity-0"}`} />
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
            icon={<MusicButtonFace playing={music.playing} ringRef={music.ringRef} />}
            onClick={music.toggle}
            className="relative"
          />
        )}
      </nav>
    </header>
  );
}

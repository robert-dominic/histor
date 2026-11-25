// src/features/verdict/CaseCredits.tsx
// The case's credits, at the foot of the report: a "Sound" section crediting Mixkit for the sound effects (sound-files
// brief, 5; no attribution is required, it is good practice), and a "Music" section listing each track of the case's
// playlists while the music plays (music brief, 2; off for now).
import { MUSIC_ENABLED } from '@/lib/sound/levels';
import { SOUND_CREDIT } from '@/lib/sound-credit';
import type { CaseTheme } from '@/types/case';

export default function CaseCredits({ playlists }: { playlists: CaseTheme['playlists'] }) {
  // Each track once, even if both playlists list it.
  // No music plays while it is off (sound-files brief, 3), so none is credited.
  const tracks = (MUSIC_ENABLED ? [...(playlists?.story ?? []), ...(playlists?.desk ?? [])] : []).filter(
    (track, index, all) => all.findIndex(other => other.src === track.src) === index
  );
  return (
    <section data-report="credits" aria-labelledby="credits-title" className="relative z-[21] mx-auto mt-10 max-w-3xl px-2 text-night-ink/80 lg:max-w-6xl">
      <h2 id="credits-title" className="font-voice text-[0.75rem] tracking-[0.2em] uppercase">
        Credits
      </h2>
      <h3 className="mt-4 font-voice text-[0.6875rem] tracking-[0.16em] text-night-ink/65 uppercase">Sound</h3>
      <p data-credits="sound" className="mt-2 font-record text-[0.9375rem] leading-snug">
        <a href={SOUND_CREDIT.url} target="_blank" rel="noreferrer" className="text-night-ink underline underline-offset-2 hover:text-brass">
          {SOUND_CREDIT.source}
        </a>
        <span className="text-night-ink/65"> · {SOUND_CREDIT.note}</span>
      </p>
      {tracks.length > 0 && (
        <>
          <h3 className="mt-4 font-voice text-[0.6875rem] tracking-[0.16em] text-night-ink/65 uppercase">Music</h3>
          <ul data-credits="music" className="mt-2 flex flex-col gap-1 font-record text-[0.9375rem] leading-snug">
            {tracks.map(track => (
              <li key={track.src}>
                <span className="text-night-ink">{track.title}</span>
                <span className="text-night-ink/65"> · {track.credit}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

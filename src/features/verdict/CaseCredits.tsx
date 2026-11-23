// src/features/verdict/CaseCredits.tsx
// The case's credits, at the foot of the report (music brief, 2): a "Music" section listing each track of the case's
// playlists, its title and its credit. Nothing is shown for a case without music.
import type { CaseTheme } from '@/types/case';

export default function CaseCredits({ playlists }: { playlists: CaseTheme['playlists'] }) {
  // Each track once, even if both playlists list it.
  const tracks = [...(playlists?.story ?? []), ...(playlists?.desk ?? [])].filter(
    (track, index, all) => all.findIndex(other => other.src === track.src) === index
  );
  if (tracks.length === 0) {
    return null;
  }
  return (
    <section data-report="credits" aria-labelledby="credits-title" className="relative z-[21] mx-auto mt-10 max-w-3xl px-2 text-night-ink/80 lg:max-w-6xl">
      <h2 id="credits-title" className="font-voice text-[0.75rem] tracking-[0.2em] uppercase">
        Credits
      </h2>
      <h3 className="mt-4 font-voice text-[0.6875rem] tracking-[0.16em] text-night-ink/65 uppercase">Music</h3>
      <ul data-credits="music" className="mt-2 flex flex-col gap-1 font-record text-[0.9375rem] leading-snug">
        {tracks.map(track => (
          <li key={track.src}>
            <span className="text-night-ink">{track.title}</span>
            <span className="text-night-ink/65"> · {track.credit}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

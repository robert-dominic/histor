// src/components/SoundToggle.tsx
// The sound toggle in the case header (polish brief, B1): a small speaker, on or off, remembered (`histor:sound`).
// Turning it on is a gesture, so it starts the sound at once.
import { useSound } from '@/lib/sound';

export default function SoundToggle() {
  const { enabled, setEnabled } = useSound();
  return (
    <button
      type="button"
      data-sound="toggle"
      aria-pressed={enabled}
      aria-label="Sound"
      title={enabled ? 'Sound on' : 'Sound off'}
      onClick={() => setEnabled(!enabled)}
      className="-m-1.5 grid size-9 shrink-0 place-items-center rounded-sm text-night-ink/70 transition-[color,scale] duration-150 ease-out hover:text-night-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass active:scale-[0.94]"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-[1.125rem]">
        <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor" fillOpacity="0.2" />
        {enabled ? (
          <>
            <path data-sound="waves" d="M15.5 9.2a4 4 0 0 1 0 5.6" />
            <path d="M18 6.8a7.4 7.4 0 0 1 0 10.4" />
          </>
        ) : (
          <path data-sound="muted" d="M16 9.5l5 5m0-5l-5 5" />
        )}
      </svg>
    </button>
  );
}

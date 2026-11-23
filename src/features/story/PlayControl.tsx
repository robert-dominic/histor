// src/features/story/PlayControl.tsx
// The small floating play/pause control, shown while the story is on screen (Story.tsx sets `data-visible`).

import type { StoryPlayer } from '@/features/story/use-step-player';

export default function PlayControl({ player }: { player: StoryPlayer }) {
  return (
    <button
      type="button"
      data-story-control=""
      data-story="play-control"
      data-visible="false"
      aria-label={player.playing ? 'Pause the story' : 'Play the story'}
      aria-pressed={player.playing}
      onClick={player.toggle}
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-3 z-30 grid size-11 place-items-center rounded-full border border-night-ink/30 bg-night/80 text-night-ink shadow-lg shadow-black/40 backdrop-blur-sm transition-[opacity,visibility,scale,color] duration-200 ease-out hover:text-brass focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass active:scale-[0.97] data-[visible=false]:invisible data-[visible=false]:opacity-0 sm:bottom-6 sm:left-5"
    >
      <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="currentColor">
        {player.playing ? (
          <path d="M4 3h3v10H4zM9 3h3v10H9z" />
        ) : (
          <path d="M5 2.8v10.4L13 8z" />
        )}
      </svg>
    </button>
  );
}

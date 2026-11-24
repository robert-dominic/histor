// src/components/SoundControls.tsx
// The two sound controls in the case header (music brief, 1): Music (a note) and Effects (a speaker; the effects and
// the narrator's voice). A click only turns one on or off, remembered (`histor:music`, `histor:effects`); it never
// opens the popover. Hovering with a mouse, reaching it with the keyboard, or a long press on touch shows a small
// popover with its volume slider, remembered too; only one popover is open at a time (`usePopover`, the popover
// rules of the review-fixes brief, 2). Turning one on is a gesture, so it starts the sound at once.
import type { ReactNode } from 'react';
import { useSoundChannel } from '@/lib/sound';
import type { Channel } from '@/lib/sound/engine';
import { usePopover } from '@/lib/use-popover';

const NOTE = (
  <path d="M9 17.5V6.2l9-1.9v11.2M9 17.5a2.5 2.2 0 1 1-5 0 2.5 2.2 0 0 1 5 0Zm9-2a2.5 2.2 0 1 1-5 0 2.5 2.2 0 0 1 5 0Z" />
);
const SPEAKER = <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor" fillOpacity="0.2" />;

function SoundControl({ channel, label, icon, waves }: { channel: Channel; label: string; icon: ReactNode; waves: boolean }) {
  const { on, volume, setOn, setVolume } = useSoundChannel(channel);
  const { open, rootProps, triggerProps, consumeClick } = usePopover({ hover: true, focus: true, longPress: true });

  return (
    <div {...rootProps} data-sound-control={channel} className="relative">
      <button
        type="button"
        data-sound="toggle"
        data-channel={channel}
        aria-pressed={on}
        aria-label={label}
        title={`${label} ${on ? 'on' : 'off'}`}
        {...triggerProps}
        onClick={() => {
          // A click only turns the channel on or off; a long press only showed the slider.
          if (!consumeClick()) {
            setOn(!on);
          }
        }}
        className="-m-1 grid size-8 shrink-0 touch-manipulation place-items-center rounded-sm text-night-ink/70 transition-[color,scale,opacity] duration-150 ease-out select-none hover:text-night-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass active:scale-[0.94] aria-[pressed=false]:opacity-55"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-[1.0625rem]">
          {icon}
          {on ? (
            waves && (
              <>
                <path d="M15.5 9.2a4 4 0 0 1 0 5.6" />
                <path d="M18 6.8a7.4 7.4 0 0 1 0 10.4" />
              </>
            )
          ) : (
            <path data-sound="muted" d={waves ? 'M16 9.5l5 5m0-5l-5 5' : 'M3.5 3.5l17 17'} />
          )}
        </svg>
      </button>
      {open && (
        <div
          data-sound="popover"
          className="absolute top-[calc(100%+0.625rem)] right-[-0.5rem] z-40 flex w-44 flex-col gap-2 rounded-[2px] border border-night-ink/15 bg-night px-3.5 pt-3 pb-3.5 shadow-xl shadow-black/60"
        >
          <span className="flex items-baseline justify-between font-voice text-[0.6875rem] tracking-[0.14em] text-night-ink/80 uppercase">
            {label}
            <span className="tabular-nums text-night-ink/60">{Math.round(volume * 100)}%</span>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(volume * 100)}
            aria-label={`${label} volume`}
            onChange={event => setVolume(Number(event.target.value) / 100)}
            className="w-full accent-brass"
          />
        </div>
      )}
    </div>
  );
}

export default function SoundControls() {
  return (
    <div data-sound="controls" className="flex items-center gap-2.5">
      <SoundControl channel="music" label="Music" icon={NOTE} waves={false} />
      <SoundControl channel="effects" label="Effects" icon={SPEAKER} waves />
    </div>
  );
}

// src/components/SoundControls.tsx
// The sound control in the case header: one now, Sound (a speaker: the effects and the narrator's voice; the music is
// off, sound-files brief, 3). A click only turns it on or off, remembered (`histor:effects`); it never opens the
// popover. Hovering with a mouse, reaching it with the keyboard, or a long press on touch shows a small
// popover with its volume slider, remembered too; only one popover is open at a time (`usePopover`, the popover
// rules of the review-fixes brief, 2). Turning one on is a gesture, so it starts the sound at once.
// Sound after a reload (the fix list): while the sound is on but still locked (a saved choice, so no play modal to
// unlock it), the icon gently pulses with a small "Click anywhere for sound" under it; the first click or key anywhere
// unlocks it, and the pulse and the hint fade. Not under reduced motion, where a gesture alone starts nothing.
import { useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import Popover from '@/components/Popover';
import { sound, useSoundChannel } from '@/lib/sound';
import type { Channel, SoundEngine } from '@/lib/sound/engine';
import { SOUND_HINT } from '@/lib/sound-hint';
import { usePopover } from '@/lib/use-popover';
import { useReducedMotion } from '@/lib/use-reduced-motion';

const SPEAKER = <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor" fillOpacity="0.2" />;

/** On, but waiting for the browser's first gesture. */
function useLocked(engine: SoundEngine): boolean {
  return useSyncExternalStore(
    listener => engine.subscribe(listener),
    () => engine.enabled && !engine.running,
    () => false
  );
}

function SoundControl({ channel, label, icon, waves, hint, engine }: { channel: Channel; label: string; icon: ReactNode; waves: boolean; hint: boolean; engine: SoundEngine }) {
  const { on, volume, setOn, setVolume } = useSoundChannel(channel, engine);
  const locked = useLocked(engine);
  const reduced = useReducedMotion();
  const waiting = hint && on && locked && !reduced;
  const { open, rootProps, triggerProps, consumeClick } = usePopover({ hover: true, focus: true, longPress: true });

  return (
    <div {...rootProps} data-sound-control={channel} className="relative">
      <button
        type="button"
        data-sound="toggle"
        data-channel={channel}
        data-locked={waiting}
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
        className="sound-locked -m-1 grid size-8 shrink-0 touch-manipulation place-items-center rounded-sm text-night-ink/70 transition-[color,scale,opacity] duration-150 ease-out select-none hover:text-night-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass active:scale-[0.94] aria-[pressed=false]:opacity-55"
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
      {/* The hint: small, under the icon, so the header's layout never moves. Fades in, and out once unlocked. */}
      <span
        aria-hidden={!waiting}
        data-sound="hint"
        data-shown={waiting && !open}
        className="pointer-events-none absolute top-[calc(100%+0.4rem)] right-0 font-voice text-[0.6875rem] whitespace-nowrap text-night-ink/70 opacity-0 transition-opacity duration-500 ease-out data-[shown=true]:opacity-100"
      >
        {SOUND_HINT}
      </span>
      <Popover open={open} data-sound="popover" className="top-[calc(100%+0.625rem)] right-[-0.5rem] w-52">
        <span className="block font-voice text-[0.6875rem] tracking-[0.14em] text-ink/75 uppercase">{label}</span>
        <span className="mt-2 flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(volume * 100)}
            aria-label={`${label} volume`}
            onChange={event => setVolume(Number(event.target.value) / 100)}
            style={{ '--fill': `${Math.round(volume * 100)}%` } as CSSProperties}
            className="paper-range min-w-0 flex-1"
          />
          {/* The value, typed small beside it. */}
          <span aria-hidden="true" className="w-9 shrink-0 text-right font-voice text-[0.75rem] tabular-nums text-ink/80">
            {Math.round(volume * 100)}%
          </span>
        </span>
      </Popover>
    </div>
  );
}

/** `hint`: false while the play modal is up (its choice unlocks the sound itself). */
export default function SoundControls({ hint = true, engine = sound }: { hint?: boolean; engine?: SoundEngine }) {
  return (
    <div data-sound="controls" className="flex items-center gap-2.5">
      <SoundControl channel="effects" label="Sound" icon={SPEAKER} waves hint={hint} engine={engine} />
    </div>
  );
}

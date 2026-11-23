// src/components/SoundControls.tsx
// The two sound controls in the case header (music brief, 1): Music (a note) and Effects (a speaker; the effects and
// the narrator's voice). A click turns one on or off, remembered (`histor:music`, `histor:effects`). Pressing and
// holding it, hovering it with a mouse, or reaching it with the keyboard shows a small popover with its volume
// slider, remembered too. Turning one on is a gesture, so it starts the sound at once.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useSoundChannel } from '@/lib/sound';
import type { Channel } from '@/lib/sound/engine';

/** How long a press must be held to show the slider, in ms (shorter is a click). */
const HOLD_MS = 450;

const NOTE = (
  <path d="M9 17.5V6.2l9-1.9v11.2M9 17.5a2.5 2.2 0 1 1-5 0 2.5 2.2 0 0 1 5 0Zm9-2a2.5 2.2 0 1 1-5 0 2.5 2.2 0 0 1 5 0Z" />
);
const SPEAKER = <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor" fillOpacity="0.2" />;

function SoundControl({ channel, label, icon, waves }: { channel: Channel; label: string; icon: ReactNode; waves: boolean }) {
  const { on, volume, setOn, setVolume } = useSoundChannel(channel);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const holdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heldRef = useRef(false);

  const endHold = () => {
    if (holdRef.current !== null) {
      clearTimeout(holdRef.current);
      holdRef.current = null;
    }
  };
  useEffect(() => endHold, []);

  // While it is open, a press elsewhere or Escape closes it.
  useEffect(() => {
    if (!open) {
      return;
    }
    const outside = (event: PointerEvent) => {
      if (!(event.target instanceof Node && rootRef.current?.contains(event.target))) {
        setOpen(false);
      }
    };
    const escape = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  const focusVisible = (element: Element) => {
    try {
      return element.matches(':focus-visible');
    } catch {
      return false;
    }
  };

  return (
    <div
      ref={rootRef}
      data-sound-control={channel}
      className="relative"
      onPointerEnter={event => event.pointerType === 'mouse' && setOpen(true)}
      onPointerLeave={event => {
        endHold();
        if (event.pointerType === 'mouse' && !rootRef.current?.contains(document.activeElement)) {
          setOpen(false);
        }
      }}
      onBlur={event => {
        if (!(event.relatedTarget instanceof Node && rootRef.current?.contains(event.relatedTarget))) {
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        data-sound="toggle"
        data-channel={channel}
        aria-pressed={on}
        aria-label={label}
        aria-expanded={open}
        title={`${label} ${on ? 'on' : 'off'}`}
        onPointerDown={() => {
          heldRef.current = false;
          endHold();
          holdRef.current = setTimeout(() => {
            heldRef.current = true;
            setOpen(true);
          }, HOLD_MS);
        }}
        onPointerUp={endHold}
        onPointerCancel={endHold}
        onFocus={event => focusVisible(event.currentTarget) && setOpen(true)}
        onClick={() => {
          // A held press showed the slider: it is not a click.
          if (heldRef.current) {
            heldRef.current = false;
            return;
          }
          setOn(!on);
        }}
        onContextMenu={event => event.preventDefault()}
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

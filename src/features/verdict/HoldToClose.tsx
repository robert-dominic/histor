// src/features/verdict/HoldToClose.tsx
// "Hold to close the case": a press-and-hold that fills with ink over about 1.5s (motion.md, rule 8).
// Letting go early snaps it back in 200ms. Works with a pointer, or by holding Space or Enter.
// The fill is a GSAP tween on the element; its progress never enters React state.

import { useEffect, useId, useRef, type KeyboardEvent, type PointerEvent } from 'react';
import gsap from 'gsap';
import { LINEAR, tween } from '@/lib/motion';

/** Seconds. Slow when the user decides, fast when the app responds. */
const HOLD = 1.5;

const EMPTY = 'circle(0% at 50% 50%)';
const FULL = 'circle(75% at 50% 50%)';

interface HoldToCloseProps {
  disabled: boolean;
  onComplete: () => void;
}

export default function HoldToClose({ disabled, onComplete }: HoldToCloseProps) {
  const fillRef = useRef<HTMLSpanElement>(null);
  const doneRef = useRef(false);
  const hintId = useId();
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const fill = fillRef.current;
    return () => {
      gsap.killTweensOf(fill);
    };
  }, []);

  const start = () => {
    if (disabled || doneRef.current) {
      return;
    }
    gsap.to(fillRef.current, {
      clipPath: FULL,
      duration: HOLD,
      ease: LINEAR,
      overwrite: true,
      onComplete: () => {
        doneRef.current = true;
        onCompleteRef.current();
      },
    });
  };

  const release = () => {
    if (doneRef.current) {
      return;
    }
    gsap.to(fillRef.current, { clipPath: EMPTY, ...tween('hover'), overwrite: true });
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) {
      return;
    }
    event.currentTarget.setPointerCapture?.(event.pointerId);
    start();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === ' ' || event.key === 'Enter') {
      // Space would scroll the page; Enter would click. Holding it is the action.
      event.preventDefault();
      if (!event.repeat) {
        start();
      }
    }
  };

  const handleKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      release();
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        disabled={disabled}
        aria-describedby={hintId}
        data-verdict="hold"
        onPointerDown={handlePointerDown}
        onPointerUp={release}
        onPointerCancel={release}
        onLostPointerCapture={release}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onBlur={release}
        onContextMenu={event => event.preventDefault()}
        className="relative isolate grid size-36 touch-none place-items-center overflow-hidden rounded-full border-2 border-rust-night font-voice text-sm leading-tight tracking-[0.12em] text-night-ink uppercase transition-[scale,opacity] duration-150 ease-out select-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brass active:scale-[0.97] disabled:opacity-40"
      >
        {/* The ink: it pools from the centre while the button is held. */}
        <span
          ref={fillRef}
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-rust"
          style={{ clipPath: EMPTY }}
        />
        <span className="px-4 text-center">Hold to close the case</span>
      </button>
      <p id={hintId} className="font-voice text-xs text-ghost-night">
        Press and hold, or hold Space or Enter.
      </p>
    </div>
  );
}

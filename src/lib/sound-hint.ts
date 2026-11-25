// src/lib/sound-hint.ts
// Sound after a reload (the fix list): the sound is on but waits for the browser's first gesture (a saved choice, so
// no play modal to unlock it). The header's speaker pulses and "Click anywhere for sound" shows while it waits; the
// first click or key anywhere unlocks it. Not under reduced motion, where a gesture alone starts nothing.
import { useSyncExternalStore } from 'react';
import { sound } from '@/lib/sound';
import type { SoundEngine } from '@/lib/sound/engine';
import { useReducedMotion } from '@/lib/use-reduced-motion';

export const SOUND_HINT = 'Click anywhere for sound';

/** True while the sound is on and still locked. `allowed`: false while the play modal is up (its choice unlocks it). */
export function useSoundWaiting(allowed: boolean, engine: SoundEngine = sound): boolean {
  const locked = useSyncExternalStore(
    listener => engine.subscribe(listener),
    () => engine.isOn('effects') && engine.enabled && !engine.running,
    () => false
  );
  const reduced = useReducedMotion();
  return allowed && locked && !reduced;
}

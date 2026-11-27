// src/lib/loading.ts
// Whether a loading state is on screen (mobile pass): while any is, nothing else runs. No pen writing, no sounds, no
// autoplay, no animation behind it; the story starts only once the last loader has fully gone. A loader holds a token
// from the moment it is mounted (even while it waits to see whether it is needed at all) until it has gone.
import { useSyncExternalStore } from 'react';

let holds = 0;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach(listener => listener());

/** A loading state begins; call what it returns once it has fully gone (calling it again does nothing). */
export function beginLoading(): () => void {
  holds += 1;
  changed();
  let ended = false;
  return () => {
    if (!ended) {
      ended = true;
      holds = Math.max(0, holds - 1);
      changed();
    }
  };
}

/** Whether any loading state is on screen. */
export function isLoading(): boolean {
  return holds > 0;
}

/** Called whenever loading begins or ends. */
export function onLoadingChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/** For components: true while anything is loading. */
export function useLoading(): boolean {
  return useSyncExternalStore(onLoadingChange, isLoading, () => false);
}

/** For tests: nothing loading. */
export function resetLoading(): void {
  holds = 0;
  changed();
}

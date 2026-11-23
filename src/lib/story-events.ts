// src/lib/story-events.ts
// The story's and the desk's moments, as events, so sound (or anything else) can follow them later without
// touching their code. There is no sound yet: nothing listens by default.
//
//   const stop = onStoryEvent(event => { if (event.type === 'hook') playBell(); });
//
// Story events fire when the reader passes a moment, in either direction; `direction` says which way.
// Desk events fire when the user does something at the investigation desk.

import type { EvidenceStatus, PinTarget } from '@/types/case';

export type StoryDirection = 'forward' | 'backward';

export type StoryEvent =
  | { type: 'chapter-enter'; chapter: string; direction: StoryDirection }
  // A sentence of the text column starts to rise into view. `index` is its place in the chapter.
  | { type: 'beat'; chapter: string; index: number; direction: StoryDirection }
  | { type: 'hook'; chapter: string; direction: StoryDirection }
  | { type: 'roll-call-out'; chapter: string; name: string; direction: StoryDirection }
  // The desk
  | { type: 'pile-hover' }
  | { type: 'folder-open'; evidence: string }
  | { type: 'flip'; evidence: string; direction: 'open' | 'close' }
  | { type: 'stamp'; evidence: string; status: EvidenceStatus }
  // The same moment, one event per kind of stamp, for its own sound.
  | { type: 'stamp:record' | 'stamp:disputed' | 'stamp:legend'; evidence: string }
  | { type: 'pin'; evidence: string; target: PinTarget }
  | { type: 'seal'; where: 'desk' | 'verdict' };

type Listener = (event: StoryEvent) => void;

const listeners = new Set<Listener>();

/** Listens to every story event. Returns a function that stops listening. */
export function onStoryEvent(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Sends an event to every listener. A listener that throws never stops the story. */
export function emitStoryEvent(event: StoryEvent): void {
  for (const listener of [...listeners]) {
    try {
      listener(event);
    } catch {
      // A listener's problem is its own.
    }
  }
}

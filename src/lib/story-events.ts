// src/lib/story-events.ts
// The story's moments, as events, so sound (or anything else) can follow the story later without touching the
// story code. There is no sound yet: nothing listens by default.
//
//   const stop = onStoryEvent(event => { if (event.type === 'hook') playBell(); });
//
// Events fire when the reader passes a moment, in either direction; `direction` says which way.

export type StoryDirection = 'forward' | 'backward';

export type StoryEvent =
  | { type: 'chapter-enter'; chapter: string; direction: StoryDirection }
  | { type: 'beat'; chapter: string; index: number; direction: StoryDirection }
  | { type: 'hook'; chapter: string; direction: StoryDirection }
  | { type: 'roll-call-out'; chapter: string; name: string; direction: StoryDirection };

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

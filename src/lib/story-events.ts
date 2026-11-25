// src/lib/story-events.ts
// The story's and the desk's moments, as events, so sound (or anything else) can follow them without touching their
// code. The sound (src/lib/sound) listens to all of them, and its table (sound-map.ts) says what each sounds like.
//
//   const stop = onStoryEvent(event => { if (event.type === 'hook') playBell(); });
//
// Story events fire when the reader passes a moment, in either direction; `direction` says which way.
// Desk events fire when the user does something at the investigation desk.

import type { CaseRank } from '@/lib/case-rank';
import type { CaseAmbience, CaseTheme, EvidenceStatus, HookSound, PinTarget } from '@/types/case';

export type StoryDirection = 'forward' | 'backward';

export type StoryEvent =
  // Where the player is: the case's story (with its legend intro), its desk (the investigation, the verdict and the
  // report), or away from any case. Carries the case's ambience recipe and its playlists.
  | { type: 'place'; place: 'story' | 'desk' | 'away'; ambience?: CaseAmbience; playlists?: CaseTheme['playlists'] }
  // `depth`: how far into the night the story is, 0 (day) to 1 (night).
  | { type: 'chapter-enter'; chapter: string; direction: StoryDirection; depth?: number }
  // A sentence of the text column starts to rise into view. `index` is its place in the chapter.
  | { type: 'beat'; chapter: string; index: number; direction: StoryDirection }
  // As the hook snaps in, forward or back. `sound`: the chapter's own dread sound, when it names one.
  | { type: 'hook'; chapter: string; direction: StoryDirection; sound?: HookSound }
  // A line of the central question plays in (forward), or is returned to (backward).
  | { type: 'question-line'; index: number; direction: StoryDirection }
  // The hook leaves: its letters decay (forward), or it gives way to its page again (backward).
  | { type: 'hook-out'; chapter: string; direction: StoryDirection }
  // One name of the roll call un-written; `order` 0 is the first to go.
  | { type: 'roll-call-out'; chapter: string; name: string; order: number; direction: StoryDirection }
  // The pen writes a letter (anywhere: the legend, the story, a file, the verdict). Many a second.
  // `hand: 'legend'`: the legend intro's pen and "You almost believed this.", slower and creakier.
  | { type: 'pen'; hand?: 'legend' }
  // Any stamp pressing in (motion.ts `stampHit`): a file's status, the legend intro's, UNSOLVED, Close the case, Chosen.
  | { type: 'stamp-hit' }
  // A popover (the share menu, the volume) opening or closing (use-popover.ts).
  | { type: 'popover'; open: boolean }
  // How many ghost lines are on the desk now (dread pass): the murmur follows them.
  | { type: 'ghosts'; count: number }
  // A final choice hovered at the verdict (dread pass), or no longer: the heartbeat.
  | { type: 'heartbeat'; on: boolean }
  // The typewriter types a letter of the app's voice (src/lib/typewriter.ts); a longer line's carriage returns.
  | { type: 'type-key' }
  | { type: 'type-return' }
  // A modal opens or closes: the play choice, the fork over the question.
  | { type: 'modal'; name: 'play-choice' | 'fork'; open: boolean }
  // The interface (music brief, 4): any button or link pressed (the app's own click listener sends these), a toggle
  // switched, the ? guide opened or closed, the pointer onto a file on the floor.
  | { type: 'ui-click' }
  | { type: 'ui-toggle' }
  | { type: 'guide'; open: boolean }
  | { type: 'file-hover' }
  // The desk
  | { type: 'pile-hover' }
  // A folder picked up by hand, and let go (it lands).
  | { type: 'folder-lift' }
  | { type: 'folder-land' }
  | { type: 'folder-open'; evidence: string }
  | { type: 'flip'; evidence: string; direction: 'open' | 'close' }
  | { type: 'stamp'; evidence: string; status: EvidenceStatus }
  // The same moment, one event per kind of stamp, for its own sound.
  | { type: 'stamp:record' | 'stamp:disputed' | 'stamp:legend'; evidence: string }
  // A legend's pen starts writing "You almost believed this." at the foot of its page.
  | { type: 'legend-pen'; evidence: string }
  | { type: 'pin'; evidence: string; target: PinTarget }
  // The "Close the case" stamp thunks into the top bar as it appears.
  | { type: 'close-stamp' }
  // `seal`: "Close the case" is pressed (desk), or the chosen theory is stamped "Chosen" (verdict).
  | { type: 'seal'; where: 'desk' | 'verdict' }
  // The rank card is revealed on the result screen.
  | { type: 'rank'; rank: CaseRank };

type Listener = (event: StoryEvent) => void;

const listeners = new Set<Listener>();

/** Listens to every story event. Returns a function that stops listening. */
export function onStoryEvent(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

type PlaceEvent = Extract<StoryEvent, { type: 'place' }>;
/** The last `place` said, kept: a page can say where the player is before anyone listens (review-fixes brief, 6). */
let lastPlace: PlaceEvent | null = null;

/**
 * Where the player was last said to be, for a listener that starts late. The case page says "story" in its own effect,
 * which runs before the app's (children's effects run first), so the sound would otherwise never hear it.
 */
export function lastPlaceEvent(): PlaceEvent | null {
  return lastPlace;
}

/** Sends an event to every listener. A listener that throws never stops the story. */
export function emitStoryEvent(event: StoryEvent): void {
  if (event.type === 'place') {
    lastPlace = event;
  }
  for (const listener of [...listeners]) {
    try {
      listener(event);
    } catch {
      // A listener's problem is its own.
    }
  }
}

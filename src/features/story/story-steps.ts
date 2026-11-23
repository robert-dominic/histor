// src/features/story/story-steps.ts
// The story in steps (story-steps brief, item 1): one gesture moves exactly one step. This file is the pure part:
// the list of steps, and the gate that turns a burst of wheel events (a trackpad flick and its long tail of
// momentum) into one gesture. Story.tsx plays the steps.
import { STORY_PACE } from '@/lib/story-pages';

/**
 * One step of the story. Step 0, the play modal, is not in the list: the story begins only once the reader has
 * chosen, at the first page.
 */
export type StoryStep =
  | { kind: 'page'; chapter: number }
  | { kind: 'hook'; chapter: number }
  | { kind: 'line'; line: number }
  | { kind: 'fork' };

/**
 * The steps, in order: each chapter's page, then its hook (when it has one); then the central question, one line
 * per step; then the fork, when there is one.
 */
export function buildSteps(chapters: readonly { hook?: string }[], lines: number, hasFork: boolean): StoryStep[] {
  const steps: StoryStep[] = [];
  chapters.forEach((chapter, index) => {
    steps.push({ kind: 'page', chapter: index });
    if (chapter.hook !== undefined && chapter.hook.trim() !== '') {
      steps.push({ kind: 'hook', chapter: index });
    }
  });
  for (let line = 0; line < lines; line += 1) {
    steps.push({ kind: 'line', line });
  }
  if (hasFork) {
    steps.push({ kind: 'fork' });
  }
  return steps;
}

/** A short name for a step, written to the story's root as `data-step`, e.g. `page-0`, `hook-2`, `line-1`, `fork`. */
export function stepName(step: StoryStep | undefined): string {
  if (step === undefined) {
    return 'none';
  }
  switch (step.kind) {
    case 'page':
    case 'hook':
      return `${step.kind}-${step.chapter}`;
    case 'line':
      return `line-${step.line}`;
    case 'fork':
      return 'fork';
  }
}

/** The chapter a step shows (the question and the fork show none: -1). */
export function chapterOf(step: StoryStep | undefined): number {
  return step !== undefined && (step.kind === 'page' || step.kind === 'hook') ? step.chapter : -1;
}

/** The progress rail's tick for a step: its chapter, or one past the last chapter for the question and the fork. */
export function tickOf(step: StoryStep | undefined, chapters: number): number {
  if (step === undefined) {
    return -1;
  }
  return step.kind === 'page' || step.kind === 'hook' ? step.chapter : chapters;
}

/** The step a rail tick jumps to: the chapter's page, or the question's first line. */
export function stepOfTick(steps: readonly StoryStep[], tick: number, chapters: number): number {
  if (tick >= chapters) {
    return steps.findIndex(step => step.kind === 'line' || step.kind === 'fork');
  }
  return steps.findIndex(step => step.kind === 'page' && step.chapter === tick);
}

/**
 * Turns wheel events into gestures. Wheel events that come closer together than `gapMs` belong to one burst (a
 * flick, and the momentum a trackpad keeps sending after it). A burst may move one step, at most: the first time it
 * asks while the story is free, it does; everything else in it, before or after, is swallowed. So however hard the
 * flick, it is one step, and a long tail cannot fire a second.
 */
export function createWheelGate(gapMs: number = STORY_PACE.gestureGapMs) {
  let last = Number.NEGATIVE_INFINITY;
  let used = false;
  return {
    /** Every wheel event, at `now` (ms): a gap longer than `gapMs` starts a new burst. */
    note(now: number): void {
      if (now - last > gapMs) {
        used = false;
      }
      last = now;
    },
    /**
     * The burst asks to move a step. `free` is false while a step is animating.
     * @returns true when it may: the burst's one step
     */
    take(free: boolean): boolean {
      if (used) {
        return false;
      }
      // A burst that meets a step still animating is spent: its tail must not fire once the step is done.
      used = true;
      return free;
    },
  };
}

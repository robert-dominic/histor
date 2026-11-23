// src/features/story/page-writer.ts
// The pen that writes one chapter's page (story v3): the kicker typed, the heading written, then the whole body, and
// the roll call by the same pen in its own place. Timed, never scrubbed: it runs at a steady pace that leads the eye
// (penPlan), a word at a time for a long page. Weighted phrases get a breath before them and are written a touch
// slower. Once written, the text stays; `finish` writes it all at once.
import gsap from 'gsap';
import { createQuillWriter, splitForQuill } from '@/lib/quill-writing';
import { STORY_PACE, penPlan } from '@/lib/story-pages';

export interface PageWriter {
  /** How long the whole page takes to write, in seconds. */
  seconds: number;
  /** Starts writing, from the beginning, unless it has started or is written. */
  start: () => void;
  /** Writes the rest at once, and puts the pen away. */
  finish: () => void;
  written: () => boolean;
  /** True from `start` until the page is written. */
  writing: () => boolean;
  /** Resolves once the page is written. */
  whenWritten: () => Promise<void>;
  /** Undoes the letter splitting and kills the writing. */
  revert: () => void;
}

const NOTHING_TO_WRITE: PageWriter = {
  seconds: 0,
  start: () => undefined,
  finish: () => undefined,
  written: () => true,
  writing: () => false,
  whenWritten: () => Promise.resolve(),
  revert: () => undefined,
};

/** Builds the pen for the page in `scene`. Its letters are hidden until written. */
export function createPageWriter(scene: HTMLElement): PageWriter {
  const one = (selector: string) => scene.querySelector<HTMLElement>(selector);
  const all = (selector: string) => [...scene.querySelectorAll<HTMLElement>(selector)];
  const point = one('[data-story="quill"]');
  const quillBody = one('[data-story="quill-body"]');
  if (point === null || quillBody === null) {
    return NOTHING_TO_WRITE;
  }
  const pageEl = one('[data-story="page"]');
  const kicker = one('[data-story="kicker"]');
  const heading = one('[data-story="heading"]');
  const splits: ReturnType<typeof splitForQuill>[] = [];
  const writing = gsap.timeline({ paused: true });
  const pen = createQuillWriter(point, quillBody);
  let started = false;
  let waiting: (() => void)[] = [];
  let at = 0;

  if (kicker !== null) {
    const split = splitForQuill(kicker);
    splits.push(split);
    const letters = split.chars as HTMLElement[];
    letters.forEach((letter, index) => writing.set(letter, { opacity: 1 }, index / STORY_PACE.kickerRate));
    at += letters.length / STORY_PACE.kickerRate;
  }
  if (heading !== null) {
    const split = splitForQuill(heading);
    splits.push(split);
    const letters = split.chars as HTMLElement[];
    at += pen.write(writing, letters, at, letters.length / STORY_PACE.headingSeconds);
  }

  // The body, then the roll call: letters, or whole words for a long page.
  const letters = all('[data-story="body"] [data-pen="char"], [data-story="roll-call"] [data-pen="char"]');
  const words = all('[data-story="body"] [data-pen="word"], [data-story="roll-call"] [data-pen="word"]');
  // The roll call has its own place on the other side of the screen, and its own pen there.
  const rollPoint = one('[data-roll="quill"]');
  const rollBody = one('[data-roll="quill-body"]');
  const rollPen = rollPoint !== null && rollBody !== null ? createQuillWriter(rollPoint, rollBody) : pen;
  const inRoll = (unit: HTMLElement) => unit.closest('[data-story="roll-call"]') !== null;
  const plan = penPlan(letters.length, words.length);
  const units = plan.unit === 'letter' ? letters : words;
  gsap.set(units, { opacity: 0 });

  // Runs of plain units, and the weighted phrases between them. A run never spans the body and the roll call.
  let run: HTMLElement[] = [];
  const flush = () => {
    const body = run.filter(unit => !inRoll(unit));
    const roll = run.filter(inRoll);
    if (body.length > 0) {
      at += pen.write(writing, body, at, plan.rate);
    }
    if (roll.length > 0) {
      at += rollPen.write(writing, roll, at, plan.rate);
    }
    run = [];
  };
  let weightedRun: HTMLElement | null = null;
  let weightedUnits: HTMLElement[] = [];
  const flushWeighted = () => {
    if (weightedUnits.length > 0) {
      at += STORY_PACE.weightedBreath;
      at += pen.write(writing, weightedUnits, at, plan.rate / STORY_PACE.weightedSlowdown);
      weightedUnits = [];
    }
    weightedRun = null;
  };
  units.forEach(unit => {
    const weighted = unit.closest<HTMLElement>('[data-pen="weighted"]');
    if (weighted !== null) {
      if (weightedRun !== weighted) {
        flush();
        flushWeighted();
        weightedRun = weighted;
      }
      weightedUnits.push(unit);
    } else {
      flushWeighted();
      run.push(unit);
    }
  });
  flush();
  flushWeighted();

  const done = () => {
    if (pageEl !== null) {
      pageEl.dataset.written = 'true';
    }
    const callbacks = waiting;
    waiting = [];
    callbacks.forEach(callback => callback());
  };
  writing.call(done, undefined, at);

  return {
    seconds: writing.duration(),
    start: () => {
      if (!started && writing.progress() < 1) {
        started = true;
        writing.play(0);
      }
    },
    finish: () => {
      started = true;
      if (writing.progress() < 1) {
        writing.progress(1);
      }
      pen.hide();
      rollPen.hide();
    },
    written: () => writing.progress() === 1,
    writing: () => started && writing.progress() < 1,
    whenWritten: () =>
      writing.progress() === 1 ? Promise.resolve() : new Promise<void>(resolve => waiting.push(resolve)),
    revert: () => {
      writing.kill();
      splits.forEach(split => split.revert());
    },
  };
}

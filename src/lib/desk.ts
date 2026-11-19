// src/lib/desk.ts
// Pure helpers for the investigation desk (.kiro/specs/desk): where every folder lies, deterministic scatter
// for the pile and the notes, and the first sentence of a text. No DOM, no randomness.

import { fileNumber } from '@/lib/case-files';
import { splitIntoBeats } from '@/lib/story-beats';
import type { Case, Evidence, InvestigationState } from '@/types/case';

/** A number in [0, 1) from a string, the same on every device. FNV-1a, 32-bit. */
export function hashUnit(id: string, salt = ''): number {
  let hash = 0x811c9dc5;
  const text = `${salt}:${id}`;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) / 0x100000000;
}

/** A slight, deterministic tilt and offset for a folder or a note. Degrees and pixels. */
export function scatter(id: string, maxDegrees: number, maxOffset: number): { rotate: number; x: number; y: number } {
  const signed = (salt: string) => hashUnit(id, salt) * 2 - 1;
  const round = (value: number) => Math.round(value * 100) / 100;
  return {
    rotate: round(signed('rotate') * maxDegrees),
    x: round(signed('x') * maxOffset),
    y: round(signed('y') * maxOffset),
  };
}

/** Where a folder lies on the desk. */
export type FolderPlace =
  /** Sealed, or opened but not yet pinned: back on top of the pile, stamped (D1). */
  | { kind: 'pile'; opened: boolean }
  | { kind: 'board'; theoryId: string }
  | { kind: 'aside' };

export interface DeskFolder {
  evidence: Evidence;
  /** "01".."23", in case order. */
  number: string;
  place: FolderPlace;
}

export interface DeskLayout {
  /** Every file, in case order. */
  folders: DeskFolder[];
  /** Per theory id (every theory of the case), its pinned files in case order. */
  byTheory: Map<string, Evidence[]>;
  /** Files pinned to "None of them", in case order. */
  aside: Evidence[];
  /** The pile from the bottom up: sealed files in case order, then opened-but-unpinned ones on top. */
  pile: Evidence[];
  /** Files of the case that have been opened. */
  openedCount: number;
  canClose: boolean;
}

/**
 * Where every folder lies, worked out from the investigation, never stored.
 * A file is on the board only if it is opened and pinned to a theory of the case; in the aside tray only if it
 * is opened and pinned to "none"; in the pile otherwise. Ids that are not in the case are ignored. Never throws.
 */
export function deskLayout(caseData: Case, state: InvestigationState): DeskLayout {
  const theoryIds = new Set(caseData.theories.map(theory => theory.id));
  const evidenceIds = new Set(caseData.evidence.map(evidence => evidence.id));
  let opened = new Set<string>();
  const pins = new Map<string, string>();
  try {
    if (Array.isArray(state?.opened)) {
      opened = new Set(state.opened.filter((id): id is string => typeof id === 'string' && evidenceIds.has(id)));
    }
    const rawPins: unknown = state?.pins;
    if (typeof rawPins === 'object' && rawPins !== null && !Array.isArray(rawPins)) {
      for (const [id, target] of Object.entries(rawPins)) {
        if (evidenceIds.has(id) && typeof target === 'string' && (target === 'none' || theoryIds.has(target))) {
          pins.set(id, target);
        }
      }
    }
  } catch {
    opened = new Set();
    pins.clear();
  }

  const byTheory = new Map<string, Evidence[]>(caseData.theories.map(theory => [theory.id, []]));
  const aside: Evidence[] = [];
  const sealed: Evidence[] = [];
  const openedLoose: Evidence[] = [];

  const folders: DeskFolder[] = caseData.evidence.map((evidence, index) => {
    const isOpen = opened.has(evidence.id);
    const target = pins.get(evidence.id);
    let place: FolderPlace;
    if (isOpen && target === 'none') {
      place = { kind: 'aside' };
      aside.push(evidence);
    } else if (isOpen && target !== undefined) {
      place = { kind: 'board', theoryId: target };
      byTheory.get(target)?.push(evidence);
    } else {
      place = { kind: 'pile', opened: isOpen };
      (isOpen ? openedLoose : sealed).push(evidence);
    }
    return { evidence, number: fileNumber(index), place };
  });

  return {
    folders,
    byTheory,
    aside,
    pile: [...sealed, ...openedLoose],
    openedCount: opened.size,
    canClose: opened.size >= caseData.closeThreshold,
  };
}

/** The first full sentence of a text, never cut mid-sentence (D6). A text of one sentence comes back whole. */
export function firstSentence(text: string): string {
  return splitIntoBeats(text)[0] ?? text.trim();
}

/** The typed label inside a folder's cover: "Histor · Case file 07 · The galley" (set in capitals by CSS). */
export function coverLabel(number: string, title: string): string {
  return `Histor · Case file ${number} · ${title}`;
}

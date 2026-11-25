// src/lib/lantern.ts
// The lantern cursor's word (dread pass, 2): what a press would do where the pointer is. "Pin" over a theory while a
// file is carried (its drop target is hot), "Drag" while carrying elsewhere, "Read" over a portal name, "Open" over a
// file; nothing anywhere else.

/** What a press would do here, from the element under the pointer and whether a file is in the hand. */
export type LanternWord = 'Open' | 'Drag' | 'Read' | 'Pin' | '';

export function lanternWord(target: Element | null, carrying: boolean): LanternWord {
  if (carrying) {
    const hot = document.querySelector('[data-drop-hot="true"]');
    const value = hot?.getAttribute('data-drop-target');
    return value != null && !['floor', 'board', 'none'].includes(value) ? 'Pin' : 'Drag';
  }
  if (target?.closest('[data-portal-trigger]') != null) {
    return 'Read';
  }
  if (target?.closest('[data-board="folder"], [data-board="tab"], [data-pile="folder"]') != null) {
    return 'Open';
  }
  return '';
}

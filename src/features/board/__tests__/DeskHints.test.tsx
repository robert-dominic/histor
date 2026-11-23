// @vitest-environment jsdom
// src/features/board/__tests__/DeskHints.test.tsx
// Teaching the desk to a first-time user: three hints, one at a time, once only; and the "?" guide any time.
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { continuePastGate, resetPhoneGate } from '@/lib/phone-gate';
import App from '@/App';
import maryCeleste from '@/cases/mary-celeste/case';
import { FINE_POINTER_QUERY } from '@/features/board/drag';
import { forgetShownThisLoad } from '@/features/board/hints';
import { DESKTOP_QUERY } from '@/lib/use-media-query';
import { stubMatchMedia } from '@/test/match-media';
import { forgetDeskGuideThisLoad } from '@/lib/desk-guide-seen';

vi.setConfig({ testTimeout: 15_000 });

const CASE = maryCeleste;
const BASE = `/case/${CASE.id}`;
const FLAG = `histor:desk-hints:${CASE.id}`;
const HINT_1 = 'Open a file from the pile.';
const HINT_2_PIN = 'Pin it to the theory you think it points to.';
const HINT_2_DRAG = 'Drag it to the theory you think it points to.';
const HINT_3 = 'Open six files to close the case.';

function renderAt(path: string) {
  window.history.pushState({}, '', path);
  return render(<App />);
}

/** A desktop, with or without a fine pointer, and full motion. */
function stubDesktop(finePointer: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches:
        query === DESKTOP_QUERY ||
        (query === FINE_POINTER_QUERY && finePointer) ||
        query.includes('prefers-reduced-motion: no-preference'),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
    }))
  );
}

/** Opens the first folder of the pile, as a click on its link does. */
const openFirstFile = () => fireEvent.click(document.querySelector<HTMLElement>('[data-board="folder"] a')!);
const hintLines = () => [...document.querySelectorAll('[data-hint="line"]')].map(line => line.textContent);
const pinFirstFile = (id: string, themeTitle: string) => {
  fireEvent.click(screen.getByRole('button', { name: 'Pin to…' }));
  fireEvent.click(screen.getByRole('menuitemradio', { name: themeTitle }));
  expect(window.location.pathname).toBe(`${BASE}/files`);
  expect(id).toBeTruthy();
};

beforeEach(() => {
  forgetDeskGuideThisLoad();
  // These tests are about the desk, not the phone gate (which has its own tests): go past it.
  continuePastGate();
  localStorage.clear();
  forgetShownThisLoad();
  stubMatchMedia();
});

afterEach(() => {
  resetPhoneGate();
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.history.pushState({}, '', '/');
});

describe('The hints', () => {
  test('on the first visit, the first hint sits beside the pile', () => {
    renderAt(`${BASE}/files`);

    expect(hintLines()).toStrictEqual([HINT_1]);
  });

  test('they go one at a time: the pile, the Pin menu, then the progress line, and the flag is saved after the third', () => {
    renderAt(`${BASE}/files`);
    expect(hintLines()).toStrictEqual([HINT_1]);

    // A file opens: the second hint, beside the Pin menu, and nothing else.
    openFirstFile();
    expect(hintLines()).toStrictEqual([HINT_2_PIN]);
    expect(localStorage.getItem(FLAG)).toBeNull();

    // The first pin: the third hint, beside the progress line. Now it is remembered.
    pinFirstFile('first', CASE.theories[0].title);
    expect(hintLines()).toStrictEqual([HINT_3]);
    expect(localStorage.getItem(FLAG)).toBe('1');

    // The user's next action puts it away.
    fireEvent.pointerDown(document.querySelector('[data-board="progress"]')!);
    expect(hintLines()).toStrictEqual([]);
  });

  test('once shown, they do not come back: not on the next visit, with the stored flag', () => {
    localStorage.setItem(FLAG, '1');
    renderAt(`${BASE}/files`);

    expect(hintLines()).toStrictEqual([]);
    expect(document.querySelector('[data-hint="desk"]')).toBeNull();

    // And a file opened now has no hint beside its Pin menu.
    openFirstFile();
    expect(document.querySelector('[data-hint="pin"]')).toBeNull();
  });

  test('where storage fails, they still show only once in the page load', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    renderAt(`${BASE}/files`);
    expect(hintLines()).toStrictEqual([HINT_1]);

    openFirstFile();
    pinFirstFile('first', CASE.theories[0].title);
    expect(hintLines()).toStrictEqual([HINT_3]);
    cleanup();

    renderAt(`${BASE}/files`);
    expect(hintLines()).toStrictEqual([]);
  });

  test('the Pin menu hint is not shown to someone who has already pinned files', () => {
    localStorage.setItem(
      `histor:case:${CASE.id}`,
      JSON.stringify({ opened: [CASE.evidence[0].id], pins: { [CASE.evidence[0].id]: 'none' }, verdict: null })
    );
    renderAt(`${BASE}/files/${CASE.evidence[1].id}`);

    expect(document.querySelector('[data-hint="pin"]')).toBeNull();
  });
});

describe('Hint 2 wording', () => {
  test('on a desktop with a mouse: "Drag it"', () => {
    stubDesktop(true);
    renderAt(`${BASE}/files`);
    fireEvent.pointerDown(document.body, { pointerType: 'mouse' });
    openFirstFile();

    expect(hintLines()).toStrictEqual([HINT_2_DRAG]);
  });

  test('with a keyboard: "Pin it", even on a desktop with a mouse', () => {
    stubDesktop(true);
    renderAt(`${BASE}/files`);
    fireEvent.keyDown(document.body, { key: 'Tab' });
    openFirstFile();

    expect(hintLines()).toStrictEqual([HINT_2_PIN]);
  });

  test('on a touch screen (no fine pointer): "Pin it"', () => {
    stubDesktop(false);
    renderAt(`${BASE}/files`);
    fireEvent.pointerDown(document.body, { pointerType: 'mouse' });
    openFirstFile();

    expect(hintLines()).toStrictEqual([HINT_2_PIN]);
  });

  test('with reduced motion, where nothing can be dragged: "Pin it"', () => {
    stubMatchMedia({ reducedMotion: true });
    renderAt(`${BASE}/files`);
    fireEvent.pointerDown(document.body, { pointerType: 'mouse' });
    openFirstFile();

    expect(hintLines()).toStrictEqual([HINT_2_PIN]);
  });
});

describe('The guide', () => {
  test('it is the first thing the player sees on every arrival at the desk, until they close it', () => {
    localStorage.setItem(FLAG, '1');
    const first = renderAt(`${BASE}/files`);
    expect(screen.getByRole('dialog', { name: 'How to investigate' })).toBeDefined();
    first.unmount();
    forgetDeskGuideThisLoad();
    renderAt(`${BASE}/files`);
    expect(screen.getByRole('dialog', { name: 'How to investigate' })).toBeDefined();
  });

  test('after the first visit it offers "Don\'t show this again", which is remembered', () => {
    localStorage.setItem(FLAG, '1');
    const first = renderAt(`${BASE}/files`);
    // The first visit: no box yet.
    expect(screen.queryByRole('checkbox', { name: 'Don’t show this again' })).toBeNull();
    first.unmount();
    forgetDeskGuideThisLoad();
    const second = renderAt(`${BASE}/files`);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Don’t show this again' }));
    expect(localStorage.getItem(`histor:desk-guide-off:${CASE.id}`)).toBe('1');
    second.unmount();
    renderAt(`${BASE}/files`);
    expect(screen.queryByRole('dialog')).toBeNull();
    // The ? still opens it.
    fireEvent.click(screen.getByRole('button', { name: 'How the desk works' }));
    expect(screen.getByRole('dialog', { name: 'How to investigate' })).toBeDefined();
  });

  test('it opens at the top: the focus is on its heading, not the Close button, and its scroll is reset', () => {
    localStorage.setItem(FLAG, '1');
    renderAt(`${BASE}/files`);
    const guide = screen.getByRole('dialog', { name: 'How to investigate' });
    expect(document.activeElement).toBe(within(guide).getByRole('heading', { name: 'How to investigate' }));
    expect(guide.scrollTop).toBe(0);
  });


  test('says how to investigate, in the case\'s own words: its intro, its title and how many files close it', () => {
    localStorage.setItem(FLAG, '1');
    renderAt(`${BASE}/files`);
    const guide = screen.getByRole('dialog', { name: 'How to investigate' });
    const text = guide.textContent ?? '';
    expect(guide.querySelector('[data-guide="intro"]')?.textContent).toBe(
      `${CASE.deskGuideIntro} People have argued about why ever since. Your job is to weigh the evidence and decide what really happened.`
    );
    expect(text).toContain('The theories: the notes on the board.');
    expect(text).toContain(`a fact, a claim or a story about the ${CASE.title}`);
    expect([...guide.querySelectorAll('[data-guide="stamps"] li')].map(item => item.textContent?.split(':')[0])).toEqual([
      'Record',
      'Disputed',
      'Legend',
    ]);
    expect(text).toContain('If it fits none, choose “None of them”.');
    expect(text).toContain('open six files and a wax seal appears.');
    expect(guide.querySelector('[data-guide="warning"]')?.textContent).toBe(
      'A warning: the most famous details are often the ones that never happened.'
    );
  });

  test('the "?" opens the guide again, and Escape closes it and gives the focus back', async () => {
    localStorage.setItem(FLAG, '1');
    localStorage.setItem(`histor:desk-guide-off:${CASE.id}`, '1');
    renderAt(`${BASE}/files`);
    const button = screen.getByRole('button', { name: 'How the desk works' });
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(button);
    const guide = screen.getByRole('dialog', { name: 'How to investigate' });
    expect(document.activeElement).toBe(within(guide).getByRole('heading', { name: 'How to investigate' }));

    // Tab goes to its controls, and cannot leave the dialog.
    fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
    expect(document.activeElement).toBe(within(guide).getByRole('button', { name: 'Close' }));
    fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
    expect(document.activeElement).toBe(within(guide).getByRole('button', { name: 'Close' }));

    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    // The focus is back at once; the guide fades out (quickly), then it is gone.
    expect(document.activeElement).toBe(button);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  test('the Close button closes it too', async () => {
    localStorage.setItem(FLAG, '1');
    localStorage.setItem(`histor:desk-guide-off:${CASE.id}`, '1');
    renderAt(`${BASE}/files`);

    fireEvent.click(screen.getByRole('button', { name: 'How the desk works' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});

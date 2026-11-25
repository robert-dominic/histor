// @vitest-environment jsdom
// src/features/board/__tests__/Investigation.test.tsx
// The investigation from the fork to the report (docs/briefs/board.md), rendered as the whole app at a URL,
// the way a deep link or a refresh would open it. Titles and notes come from the case data.
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import gsap from 'gsap';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { continuePastGate, resetPhoneGate } from '@/lib/phone-gate';
import App from '@/App';
import maryCeleste from '@/cases/mary-celeste/case';
import { STATUS_LABEL } from '@/lib/case-files';
import { firstSentence } from '@/lib/desk';
import { Draggable, FINE_POINTER_QUERY } from '@/features/board/drag';
import { DESKTOP_QUERY, SMALL_PHONE_QUERY } from '@/lib/use-media-query';
import { onStoryEvent } from '@/lib/story-events';
import { stubMatchMedia } from '@/test/match-media';
import type { InvestigationState } from '@/types/case';

// The case page renders the whole intro and story. Give these tests the same room as the case page tests.
vi.setConfig({ testTimeout: 15_000 });

const CASE = maryCeleste;
const KEY = `histor:case:${CASE.id}`;
const BASE = `/case/${CASE.id}`;
const evidence = (id: string) => CASE.evidence.find(item => item.id === id)!;
const theory = (id: string) => CASE.theories.find(item => item.id === id)!;
/** The first `count` files of the case, in case order. */
const firstFiles = (count: number) => CASE.evidence.slice(0, count).map(item => item.id);

function seed(state: InvestigationState) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function saved(): InvestigationState {
  return JSON.parse(localStorage.getItem(KEY) ?? 'null') as InvestigationState;
}

function renderAt(path: string) {
  window.history.pushState({}, '', path);
  return render(<App />);
}

const folders = () => [...document.querySelectorAll<HTMLElement>('[data-board="folder"]')];
const folderFor = (id: string) => document.querySelector<HTMLElement>(`[data-board="folder"][data-evidence-id="${id}"]`)!;

beforeEach(() => {
  // These tests are about the desk, not the phone gate (which has its own tests): go past it.
  continuePastGate();
  localStorage.clear();
  // The guide opens on every arrival; these tests are about the desk under it.
  localStorage.setItem('histor:desk-guide-off:mary-celeste', '1');
  stubMatchMedia();
});

afterEach(() => {
  resetPhoneGate();
  cleanup();
  vi.unstubAllGlobals();
  window.history.pushState({}, '', '/');
});

describe('The board', () => {
  test('renders every file and every theory from the case data, numbered in case order', () => {
    renderAt(`${BASE}/files`);

    expect(folders()).toHaveLength(CASE.evidence.length);
    expect(folders().map(folder => folder.dataset.evidenceId)).toStrictEqual(CASE.evidence.map(item => item.id));
    expect(folders()[0].textContent).toContain('01');
    expect(folders()[CASE.evidence.length - 1].textContent).toContain(String(CASE.evidence.length).padStart(2, '0'));

    const theories = [...document.querySelectorAll<HTMLElement>('[data-board="theory"]')];
    expect(theories).toHaveLength(CASE.theories.length);
    CASE.theories.forEach((item, index) => {
      expect(theories[index].textContent).toContain(item.title);
      expect(theories[index].textContent).toContain(item.claim);
    });
  });

  test('on a small phone, theory cards show only the title and pin count; a tap shows the claim', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query === SMALL_PHONE_QUERY || query.includes('prefers-reduced-motion: no-preference'),
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(() => false),
      }))
    );
    renderAt(`${BASE}/files`);

    const [first, second] = CASE.theories;
    const cards = [...document.querySelectorAll<HTMLElement>('[data-board="theory"]')];
    expect(cards).toHaveLength(CASE.theories.length);
    for (const card of cards) {
      expect(card.textContent).not.toContain(CASE.theories.find(item => item.id === card.dataset.theoryId)!.claim);
    }
    expect(document.querySelector('[data-board="claim"]')).toBeNull();

    const firstButton = screen.getByRole('button', { name: new RegExp(first.title) });
    fireEvent.click(firstButton);
    expect(firstButton.getAttribute('aria-expanded')).toBe('true');
    expect(document.querySelector('[data-board="claim"]')?.textContent).toContain(first.claim);

    fireEvent.click(screen.getByRole('button', { name: new RegExp(second.title) }));
    expect(document.querySelector('[data-board="claim"]')?.textContent).toContain(second.claim);
    expect(firstButton.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: new RegExp(second.title) }));
    expect(document.querySelector('[data-board="claim"]')).toBeNull();
  });

  test('on a small phone, tapping a theory also shows the files pinned to it', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query === SMALL_PHONE_QUERY,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(() => false),
      }))
    );
    seed({ opened: ['e-lifeboat'], pins: { 'e-lifeboat': 't-sinking' }, verdict: null });
    renderAt(`${BASE}/files`);

    fireEvent.click(screen.getByRole('button', { name: new RegExp(theory('t-sinking').title) }));

    const claim = document.querySelector('[data-board="claim"]') as HTMLElement;
    expect(claim.textContent).toContain(theory('t-sinking').claim);
    // Tapping the pinned file shows its historians' slip, with the way back into the file.
    fireEvent.click(within(claim).getByRole('button', { name: new RegExp(evidence('e-lifeboat').title) }));
    expect(within(claim).getByRole('link', { name: new RegExp(`Open the file: ${evidence('e-lifeboat').title}`) }).getAttribute('href')).toBe(
      `${BASE}/files/e-lifeboat`
    );
  });

  test('theory cards never show a standing', () => {
    renderAt(`${BASE}/files`);

    for (const card of document.querySelectorAll('[data-board="theory"]')) {
      expect(card.querySelector('[data-stamp]')).toBeNull();
      for (const item of CASE.theories) {
        expect(card.textContent).not.toContain(item.standingReason);
      }
    }
  });

  test('unopened folders show no status', () => {
    renderAt(`${BASE}/files`);

    for (const folder of folders()) {
      expect(folder.dataset.opened).toBe('false');
      expect(folder.querySelector('[data-stamp]')).toBeNull();
      for (const label of Object.values(STATUS_LABEL)) {
        expect(folder.textContent).not.toContain(label);
      }
    }
  });

  test('a pinned file leaves the pile and hangs beneath its note', () => {
    seed({ opened: ['e-sword'], pins: { 'e-sword': 't-mutiny' }, verdict: null });
    renderAt(`${BASE}/files`);

    expect(document.querySelector('[data-board="pile"] [data-evidence-id="e-sword"]')).toBeNull();
    expect(folders()).toHaveLength(CASE.evidence.length - 1);
    const tabs = document.querySelector('[data-board="tabs"][data-theory-id="t-mutiny"]')!;
    expect([...tabs.querySelectorAll<HTMLElement>('[data-board="tab"]')].map(tab => tab.dataset.evidenceId)).toEqual(['e-sword']);
  });

  test('a file opened but not pinned goes back on top of the pile, with its status stamp', () => {
    seed({ opened: ['e-sword'], pins: {}, verdict: null });
    renderAt(`${BASE}/files`);

    const pile = folders();
    expect(pile).toHaveLength(CASE.evidence.length);
    expect(pile[pile.length - 1].dataset.evidenceId).toBe('e-sword');
    expect(folderFor('e-sword').dataset.opened).toBe('true');
    expect(folderFor('e-sword').querySelector('[data-stamp="disputed"]')?.textContent).toBe(STATUS_LABEL.disputed);
  });

  test('the pile: 23 sealed manila folders, each with its number and a typed title, and no status', () => {
    renderAt(`${BASE}/files`);

    const pile = folders();
    expect(pile).toHaveLength(23);
    pile.forEach((folder, index) => {
      expect(folder.closest('[data-board="pile"]')).not.toBeNull();
      expect(folder.textContent).toContain(String(index + 1).padStart(2, '0'));
      expect(folder.textContent).toContain(CASE.evidence[index].title);
      expect(folder.querySelector('[data-stamp]')).toBeNull();
      expect(folder.querySelector('a')?.getAttribute('href')).toBe(`${BASE}/files/${CASE.evidence[index].id}`);
    });
  });

  test('a file set aside ("None of them") goes to the tray, not the board', () => {
    seed({ opened: ['e-findings'], pins: { 'e-findings': 'none' }, verdict: null });
    renderAt(`${BASE}/files`);

    const tray = document.querySelector('[data-board="aside"]') as HTMLElement;
    expect(within(tray).getByRole('button', { name: new RegExp(evidence('e-findings').title) })).toBeDefined();
    expect(document.querySelector('[data-board="tabs"] [data-evidence-id="e-findings"]')).toBeNull();
    expect(document.querySelector('[data-board="pile"] [data-evidence-id="e-findings"]')).toBeNull();
  });

  test('the board: five paper notes from the data, each pinned and tilted the same way every time', () => {
    renderAt(`${BASE}/files`);

    const notes = [...document.querySelectorAll<HTMLElement>('[data-board="theory"]')];
    expect(notes.map(note => note.dataset.theoryId)).toEqual(CASE.theories.map(item => item.id));
    for (const note of notes) {
      expect(note.querySelector('[data-board="pin"]')).not.toBeNull();
      expect(note.querySelector('[data-board="anchor"]')).not.toBeNull();
      expect(note.querySelector<HTMLElement>('[data-board="paper"]')?.style.rotate).toMatch(/deg$/);
      expect(note.tabIndex).toBe(0);
    }
    const first = notes[0].querySelector<HTMLElement>('[data-board="paper"]')?.style.rotate;
    cleanup();
    renderAt(`${BASE}/files`);
    expect(document.querySelector<HTMLElement>('[data-board="theory"] [data-board="paper"]')?.style.rotate).toBe(first);
  });

  test('files pinned to a theory hang beneath its note, in case order, sealed ones too', () => {
    seed({
      opened: ['e-water', 'e-lifeboat', 'e-sword'],
      pins: { 'e-water': 't-sinking', 'e-lifeboat': 't-sinking', 'e-sword': 't-mutiny', 'e-galley': 't-sinking' },
      verdict: null,
    });
    renderAt(`${BASE}/files`);

    const tabs = (id: string) =>
      [...document.querySelectorAll<HTMLElement>(`[data-board="tabs"][data-theory-id="${id}"] [data-board="tab"]`)].map(
        tab => tab.dataset.evidenceId
      );
    expect(tabs('t-sinking').sort()).toEqual(['e-galley', 'e-lifeboat', 'e-water']);
    expect(tabs('t-mutiny')).toEqual(['e-sword']);
    expect(tabs('t-fraud')).toEqual([]);
    const threads = [...document.querySelectorAll<SVGPathElement>('[data-board="threads"] path')];
    expect(threads.map(path => path.dataset.evidenceId).sort()).toEqual(['e-galley', 'e-lifeboat', 'e-sword', 'e-water']);
    // A sealed pin does not count as opened.
    expect(JSON.parse(localStorage.getItem(`histor:case:${CASE.id}`) ?? '{}').opened).not.toContain('e-galley');
  });

  test('says how many files are open, and how many more it takes to close the case', () => {
    seed({ opened: firstFiles(4), pins: {}, verdict: null });
    renderAt(`${BASE}/files`);

    expect(document.querySelector('[data-board="progress"]')?.textContent).toBe(
      `4 of ${CASE.evidence.length} files opened. Open ${CASE.closeThreshold - 4} more to close the case.`
    );
  });
});

describe('Closing the case', () => {
  test('"Close the case" is hidden below the threshold', () => {
    seed({ opened: firstFiles(CASE.closeThreshold - 1), pins: {}, verdict: null });
    renderAt(`${BASE}/files`);

    expect(screen.queryByRole('link', { name: 'Close the case' })).toBeNull();
  });

  test('"Close the case" appears at the threshold, and leads to the verdict', () => {
    seed({ opened: firstFiles(CASE.closeThreshold), pins: {}, verdict: null });
    renderAt(`${BASE}/files`);

    expect(screen.getByRole('link', { name: 'Close the case' }).getAttribute('href')).toBe(`${BASE}/verdict`);
  });

  test('/verdict below the threshold redirects to the board', () => {
    seed({ opened: firstFiles(CASE.closeThreshold - 1), pins: {}, verdict: null });
    renderAt(`${BASE}/verdict`);

    expect(window.location.pathname).toBe(`${BASE}/files`);
    expect(folders()).toHaveLength(CASE.evidence.length);
    expect(screen.queryByText('Which theory do you believe?')).toBeNull();
  });

  test('with reduced motion, choosing a theory and confirming stamps it, closes the case and opens the report', async () => {
    stubMatchMedia({ reducedMotion: true });
    seed({ opened: firstFiles(CASE.closeThreshold), pins: {}, verdict: null });
    renderAt(`${BASE}/verdict`);

    expect(screen.getByText('Which theory do you believe?')).toBeDefined();
    const confirm = screen.getByRole('button', { name: 'Close the case' }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: new RegExp(theory('t-explosion').title) }));
    expect(confirm.disabled).toBe(false);
    fireEvent.click(confirm);

    // The stamp simply appears (a fade, no press), then the report opens.
    const stamp = document.querySelector<HTMLElement>('[data-verdict="chosen"]')!;
    expect(gsap.getTweensOf(stamp).every(tween => tween.vars.scale === undefined)).toBe(true);
    await waitFor(() => expect(window.location.pathname).toBe(`${BASE}/report`), { timeout: 4000 });
    expect(saved().verdict).toBe('t-explosion');
  });

  test('without reduced motion, the verdict is a hold to close the case', () => {
    seed({ opened: firstFiles(CASE.closeThreshold), pins: {}, verdict: null });
    renderAt(`${BASE}/verdict`);

    expect(screen.getByRole('button', { name: 'Hold to close the case' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Close the case' })).toBeNull();
  });

  test('the "Close the case" stamp on the desk is a link to the verdict, with no logo mark, and sounds `seal` when used', () => {
    seed({ opened: firstFiles(CASE.closeThreshold), pins: {}, verdict: null });
    renderAt(`${BASE}/files`);
    const seal = document.querySelector<HTMLAnchorElement>('[data-seal="desk"]')!;
    expect(seal.getAttribute('href')).toBe(`${BASE}/verdict`);
    expect(seal.textContent).toBe('Close the case');
    // A rubber ink stamp, like the header's UNSOLVED tag: no wax, no mark.
    expect(seal.querySelector('svg')).toBeNull();
    expect(seal.querySelector('[data-seal="mark"]')?.className).toContain('rubber-stamp');
    const heard = vi.fn();
    const stop = onStoryEvent(heard);
    fireEvent.click(seal);
    stop();
    // (Its press also ticks, like any link: the interface's sound, music brief 4.)
    expect(heard.mock.calls.map(([event]) => event).filter(event => event.type !== 'ui-click')).toStrictEqual([{ type: 'seal', where: 'desk' }]);
  });

  test('there is no seal below the threshold', () => {
    seed({ opened: firstFiles(CASE.closeThreshold - 1), pins: {}, verdict: null });
    renderAt(`${BASE}/files`);
    expect(document.querySelector('[data-seal="desk"]')).toBeNull();
  });

  test('the verdict lies on the desk: five theory notes under a still lamp', () => {
    seed({ opened: firstFiles(CASE.closeThreshold), pins: {}, verdict: null });
    renderAt(`${BASE}/verdict`);
    const notes = [...document.querySelectorAll<HTMLElement>('[data-verdict="note"]')];
    expect(notes.map(note => note.dataset.theoryId)).toStrictEqual(CASE.theories.map(item => item.id));
    expect(document.querySelector('[data-desk="surface"]')).not.toBeNull();
    expect(document.querySelector('[data-desk="lamp"]')?.getAttribute('data-lamp')).toBe('still');
    // No standing is shown before the report.
    expect(document.body.textContent).not.toContain('Leading');
  });

  test('holding to close stamps the chosen note "Chosen", then opens the report', async () => {
    seed({ opened: firstFiles(CASE.closeThreshold), pins: {}, verdict: null });
    renderAt(`${BASE}/verdict`);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(theory('t-explosion').title) }));
    const chosen = document.querySelector<HTMLElement>('[data-verdict="note"][data-theory-id="t-explosion"]')!;
    expect(chosen.querySelector('[data-verdict="chosen"]')?.textContent).toBe('Chosen');
    expect(chosen.querySelector('[data-verdict="chosen"]')?.className).toContain('rubber-stamp');
    expect(document.querySelectorAll('[data-verdict="chosen"]')).toHaveLength(1);
    const heard = vi.fn();
    const stop = onStoryEvent(heard);

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Hold to close the case' }));

    await waitFor(() => expect(window.location.pathname).toBe(`${BASE}/report`), { timeout: 6000 });
    stop();
    expect(saved().verdict).toBe('t-explosion');
    // (The typewriter's keys of the lines typed meanwhile aside.)
    expect(heard.mock.calls.map(([event]) => event).filter(event => !['type-key', 'type-return', 'stamp-hit'].includes(event.type))).toStrictEqual([
      { type: 'seal', where: 'verdict' },
    ]);
  });
});

describe('An opened file', () => {
  test('opening a file marks it opened', () => {
    renderAt(`${BASE}/files/e-lifeboat`);

    expect(screen.getByRole('heading', { name: evidence('e-lifeboat').title })).toBeDefined();
    expect(saved().opened).toStrictEqual(['e-lifeboat']);
  });

  test('"Pin to…" lists the theories and "None of them"; choosing one pins the file and returns to the desk', async () => {
    renderAt(`${BASE}/files/e-lifeboat`);

    const button = screen.getByRole('button', { name: 'Pin to…' });
    expect(button.getAttribute('aria-haspopup')).toBe('menu');
    fireEvent.click(button);
    const menu = screen.getByRole('menu', { name: 'Pin to…' });
    const items = within(menu).getAllByRole('menuitemradio');
    expect(items.map(item => item.textContent)).toStrictEqual([...CASE.theories.map(item => item.title), 'None of them']);
    expect(items.every(item => item.getAttribute('aria-checked') === 'false')).toBe(true);

    fireEvent.click(within(menu).getByRole('menuitemradio', { name: theory('t-sinking').title }));

    expect(saved().pins).toStrictEqual({ 'e-lifeboat': 't-sinking' });
    expect(window.location.pathname).toBe(`${BASE}/files`);
    expect(screen.queryByRole('dialog')).toBeNull();
    // The folder now hangs beneath its note, its thread drawn, and its historians' slip open.
    const tab = document.querySelector<HTMLElement>('[data-board="tabs"][data-theory-id="t-sinking"] [data-board="tab"]')!;
    expect(tab.dataset.evidenceId).toBe('e-lifeboat');
    expect(document.querySelector('[data-board="threads"] path[data-evidence-id="e-lifeboat"]')).not.toBeNull();
    const slip = tab.querySelector<HTMLElement>('[data-board="slip"]')!;
    expect(slip.querySelector('[data-board="reading"]')?.textContent).toBe('Historians agree');
    expect(slip.textContent).toContain(evidence('e-lifeboat').reading.note);
    await waitFor(() => expect(document.activeElement).toBe(tab.querySelector('button')));
  });

  test('the slip of the file just pinned stays until the next action; tapping a pinned tab shows it again', async () => {
    renderAt(`${BASE}/files/e-sword`);
    fireEvent.click(screen.getByRole('button', { name: 'Pin to…' }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: theory('t-mutiny').title }));

    const tab = () => document.querySelector<HTMLElement>('[data-board="tab"][data-evidence-id="e-sword"]')!;
    expect(tab().querySelector('[data-board="slip"]')).not.toBeNull();

    // The next action, anywhere else on the desk, puts it away.
    // A press alone does not put it away (that would shift the pile under a finger); the click does.
    fireEvent.pointerDown(document.querySelector('[data-board="progress"]')!);
    expect(tab().querySelector('[data-board="slip"]')).not.toBeNull();
    fireEvent.click(document.querySelector('[data-board="progress"]')!);
    // It slides away (quickly), then it is gone.
    await waitFor(() => expect(tab().querySelector('[data-board="slip"]')).toBeNull());

    // Tapping the tab shows it again; tapping it once more hides it.
    fireEvent.click(tab().querySelector('button')!);
    expect(tab().querySelector('[data-board="reading"]')?.textContent).toBe('Historians disagree');
    expect(tab().querySelector('button')?.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(tab().querySelector('button')!);
    await waitFor(() => expect(tab().querySelector('[data-board="slip"]')).toBeNull());
  });

  test('"None of them" sets the file aside: it goes to the tray, with its slip', () => {
    renderAt(`${BASE}/files/e-findings`);
    fireEvent.click(screen.getByRole('button', { name: 'Pin to…' }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'None of them' }));

    expect(saved().pins).toStrictEqual({ 'e-findings': 'none' });
    const tray = document.querySelector<HTMLElement>('[data-board="aside"]')!;
    const tab = tray.querySelector<HTMLElement>('[data-board="tab"][data-evidence-id="e-findings"]')!;
    expect(tab).not.toBeNull();
    expect(tab.querySelector('[data-board="slip"]')).not.toBeNull();
    expect(document.querySelector('[data-board="tabs"] [data-evidence-id="e-findings"]')).toBeNull();
  });

  test('the Pin menu works with the keyboard', async () => {
    renderAt(`${BASE}/files/e-lifeboat`);
    const button = screen.getByRole('button', { name: 'Pin to…' });

    fireEvent.keyDown(button, { key: 'ArrowDown' });
    const menu = screen.getByRole('menu', { name: 'Pin to…' });
    const items = within(menu).getAllByRole('menuitemradio');
    await waitFor(() => expect(document.activeElement).toBe(items[0]));

    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[1]);
    fireEvent.keyDown(menu, { key: 'End' });
    expect(document.activeElement).toBe(items[items.length - 1]);
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(menu, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(items[items.length - 1]);
    fireEvent.keyDown(menu, { key: 'Home' });
    expect(document.activeElement).toBe(items[0]);

    // Escape closes only the menu, and the button has the focus again; the file stays open.
    fireEvent.keyDown(menu, { key: 'Escape' });
    // It closes with a short animation, then it is hidden.
    await waitFor(() => expect(menu.hidden).toBe(true));
    expect(document.activeElement).toBe(button);
    expect(screen.getByRole('dialog')).toBeDefined();

    // Enter on an item chooses it (a button: Enter clicks it).
    fireEvent.keyDown(button, { key: 'ArrowUp' });
    await waitFor(() => expect(document.activeElement).toBe(items[items.length - 1]));
    fireEvent.keyDown(menu, { key: 'ArrowUp' });
    fireEvent.click(document.activeElement!);
    expect(saved().pins).toStrictEqual({ 'e-lifeboat': CASE.theories[CASE.theories.length - 1].id });
  });

  test('a disputed file shows the claim on sheet one and the challenge on sheet two', () => {
    renderAt(`${BASE}/files/e-sword`);
    const sword = evidence('e-sword');
    if (sword.status !== 'disputed') {
      throw new Error('Test setup: e-sword is disputed');
    }

    const claim = screen.getByRole('region', { name: 'The claim' });
    expect(claim.closest('[data-file="sheet"]')).not.toBeNull();
    expect(within(claim).getByText(sword.dispute.claim)).toBeDefined();
    const challenge = screen.getByRole('region', { name: 'The challenge' });
    expect(challenge.closest('[data-file="sheet-two"]')).not.toBeNull();
    expect(within(challenge).getByText(sword.dispute.challenge)).toBeDefined();
  });

  test('a legend shows where it came from, on a slip', () => {
    renderAt(`${BASE}/files/e-legend-breakfast`);
    const breakfast = evidence('e-legend-breakfast');
    if (breakfast.status !== 'legend') {
      throw new Error('Test setup: e-legend-breakfast is a legend');
    }

    const slip = screen.getByRole('region', { name: 'Where this came from' });
    expect(slip.getAttribute('data-file')).toBe('slip');
    expect(within(slip).getByText(breakfast.origin)).toBeDefined();
    expect(document.querySelector('[data-stamp="legend"]')?.textContent).toBe(STATUS_LABEL.legend);
  });

  test('coming back to a pinned file shows the choice and its slip, and the pin can be changed', () => {
    seed({ opened: ['e-sword'], pins: { 'e-sword': 't-mutiny' }, verdict: null });
    renderAt(`${BASE}/files/e-sword`);

    expect(document.querySelector('[data-file="pinned-to"]')?.textContent).toBe(`Pinned to ${theory('t-mutiny').title}`);
    expect(document.querySelector('[data-file="reading"]')?.textContent).toBe('Historians disagree');
    fireEvent.click(screen.getByRole('button', { name: 'Pin to…' }));
    expect(screen.getByRole('menuitemradio', { name: theory('t-mutiny').title }).getAttribute('aria-checked')).toBe('true');

    fireEvent.click(screen.getByRole('menuitemradio', { name: 'None of them' }));

    expect(saved().pins).toStrictEqual({ 'e-sword': 'none' });
    const tab = document.querySelector<HTMLElement>('[data-board="aside"] [data-board="tab"][data-evidence-id="e-sword"]')!;
    expect(tab.querySelector('[data-board="reading"]')?.textContent).toBe('Historians agree');
    expect(document.querySelector('[data-board="tabs"][data-theory-id="t-mutiny"]')).toBeNull();
  });

  test('"Next file" goes to the next unopened file, and "Back to the board" goes back', () => {
    seed({ opened: [CASE.evidence[1].id], pins: {}, verdict: null });
    renderAt(`${BASE}/files/${CASE.evidence[0].id}`);

    expect(screen.getByRole('link', { name: 'Next file' }).getAttribute('href')).toBe(`${BASE}/files/${CASE.evidence[2].id}`);
    expect(screen.getByRole('link', { name: 'Back to the board' }).getAttribute('href')).toBe(`${BASE}/files`);
  });

  test("opening a file's URL directly shows the desk with that file open over it", () => {
    renderAt(`${BASE}/files/e-lifeboat`);

    const file = screen.getByRole('dialog', { name: evidence('e-lifeboat').title });
    expect(file).toBeDefined();
    // The desk is still there underneath, and cannot be reached while the file is open.
    expect(folders()).toHaveLength(CASE.evidence.length);
    expect(document.querySelector('main[aria-labelledby="board-title"]')?.hasAttribute('inert')).toBe(true);
  });

  test('inside the cover: the typed label and an index card of the sources, from the data', () => {
    const lifeboat = evidence('e-lifeboat');
    const number = String(CASE.evidence.indexOf(lifeboat) + 1).padStart(2, '0');
    renderAt(`${BASE}/files/e-lifeboat`);

    const label = document.querySelector<HTMLElement>('[data-file="label"]')!;
    expect(label.textContent).toBe(`Histor · Case file ${number} · ${lifeboat.title}`);
    expect(label.className).toContain('uppercase');

    const card = document.querySelector<HTMLElement>('[data-file="index-card"]')!;
    const titles = lifeboat.sources.map(id => CASE.sources.find(source => source.id === id)!.title);
    expect(within(card).getAllByRole('listitem').map(item => item.textContent)).toStrictEqual(titles);
    for (const id of lifeboat.sources) {
      const source = CASE.sources.find(item => item.id === id)!;
      if (source.url !== undefined && source.url.trim() !== '') {
        expect(within(card).getByRole('link', { name: source.title }).getAttribute('href')).toBe(source.url);
      }
    }
    // The document is held by a paper clip, and its detail goes through the portal renderer.
    expect(document.querySelector('[data-file="sheet"] svg[aria-hidden="true"]')).not.toBeNull();
  });

  test('Escape closes the file, and the focus goes back to its folder on the desk', () => {
    renderAt(`${BASE}/files/e-lifeboat`);
    expect(screen.getByRole('dialog', { name: evidence('e-lifeboat').title })).toBeDefined();
    // While open, the folder on the desk is hidden: it is the one in the user's hands.
    expect(folderFor('e-lifeboat').style.visibility).toBe('hidden');

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(window.location.pathname).toBe(`${BASE}/files`);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.querySelector('main[aria-labelledby="board-title"]')?.hasAttribute('inert')).toBe(false);
    expect(folderFor('e-lifeboat').style.visibility).toBe('');
    expect(document.activeElement).toBe(folderFor('e-lifeboat').querySelector('a'));
  });

  test('"Back to the board" closes the file the same way', () => {
    renderAt(`${BASE}/files/e-lifeboat`);

    fireEvent.click(screen.getByRole('link', { name: 'Back to the board' }));

    expect(window.location.pathname).toBe(`${BASE}/files`);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(folderFor('e-lifeboat').querySelector('a'));
  });

  test('Tab stays inside the open file', () => {
    renderAt(`${BASE}/files/e-lifeboat`);
    const file = screen.getByRole('dialog', { name: evidence('e-lifeboat').title });
    // In document order: jsdom does not return a selector list's matches that way.
    const stops = [...file.querySelectorAll<HTMLElement>('a[href]:not([tabindex="-1"]), button:not(:disabled):not([tabindex="-1"])')]
      .filter(stop => !stop.closest('[hidden]'))
      .sort((a, b) =>
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
    );
    const first = stops[0];
    const last = stops[stops.length - 1];

    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(document.activeElement).toBe(first);

    first.focus();
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  test('with reduced motion, opening a file still marks it opened and shows it stamped', () => {
    stubMatchMedia({ reducedMotion: true });
    renderAt(`${BASE}/files/e-sword`);

    expect(saved().opened).toStrictEqual(['e-sword']);
    expect(document.querySelector('[data-stamp="disputed"]')?.textContent).toBe(STATUS_LABEL.disputed);
  });

  test('clicking a folder in the pile opens that file over the desk', () => {
    renderAt(`${BASE}/files`);

    fireEvent.click(folderFor('e-lifeboat').querySelector('a')!);

    expect(window.location.pathname).toBe(`${BASE}/files/e-lifeboat`);
    expect(screen.getByRole('dialog', { name: evidence('e-lifeboat').title })).toBeDefined();
    expect(saved().opened).toStrictEqual(['e-lifeboat']);
  });

  test('an unknown file id shows "File not found" with a link back to the board', () => {
    renderAt(`${BASE}/files/e-no-such-file`);

    expect(screen.getByText('File not found')).toBeDefined();
    expect(screen.getByRole('link', { name: 'Back to the board' }).getAttribute('href')).toBe(`${BASE}/files`);
    expect(saved()?.opened ?? []).toStrictEqual([]);
  });
});

describe('Dragging, as an extra', () => {
  /** A matchMedia for a desktop, with or without a fine pointer and full motion. */
  function stubDesktop({ finePointer, reducedMotion }: { finePointer: boolean; reducedMotion: boolean }) {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches:
          query === DESKTOP_QUERY ||
          (query === FINE_POINTER_QUERY && finePointer) ||
          (query.includes('prefers-reduced-motion: reduce') && reducedMotion) ||
          (query.includes('prefers-reduced-motion: no-preference') && !reducedMotion),
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
  const openFolder = () => document.querySelector<HTMLElement>('[data-file="folder"]')!;

  test.each([
    ['reduced motion', { finePointer: true, reducedMotion: true }],
    ['a coarse pointer', { finePointer: false, reducedMotion: false }],
  ])('with %s, no folder can be dragged, and the Pin menu is there', (_, media) => {
    stubDesktop(media);
    renderAt(`${BASE}/files/e-lifeboat`);

    expect(Draggable.get(openFolder())).toBeUndefined();
    for (const folder of folders()) {
      expect(Draggable.get(folder)).toBeUndefined();
    }
    expect(screen.getByRole('button', { name: 'Pin to…' })).toBeDefined();
  });

  test('on a desktop with a mouse, the open folder can be dragged, and the Pin menu stays', () => {
    stubDesktop({ finePointer: true, reducedMotion: false });
    renderAt(`${BASE}/files/e-lifeboat`);

    expect(Draggable.get(openFolder())).toBeDefined();
    expect(screen.getByRole('button', { name: 'Pin to…' })).toBeDefined();
  });
});
describe('The reveal', () => {
  const sheet = () => document.querySelector<HTMLElement>('[data-file="sheet"]')!;
  const stamp = () => document.querySelector<HTMLElement>('[data-file="stamp"]')!;

  test.each([
    ['record', 'e-lifeboat'],
    ['disputed', 'e-sword'],
    ['legend', 'e-legend-breakfast'],
  ] as const)('a %s file starts as plain paper, and becomes its status once the stamp lands', async (status, id) => {
    expect(evidence(id).status).toBe(status);
    renderAt(`${BASE}/files/${id}`);

    // Plain paper first: no status on the paper, and the stamp not yet down.
    expect(sheet().getAttribute('data-revealed')).toBeNull();
    expect(stamp().style.opacity).toBe('0');

    await waitFor(() => expect(sheet().getAttribute('data-revealed')).toBe('true'), { timeout: 4000 });
    expect(sheet().getAttribute('data-status')).toBe(status);
    expect(stamp().style.opacity).toBe('1');
    expect(stamp().textContent).toBe(STATUS_LABEL[status]);
  });

  test('a record carries an embossed seal beside its stamp', () => {
    renderAt(`${BASE}/files/e-lifeboat`);

    const seal = document.querySelector('[data-file="seal"]')!;
    expect(seal.querySelector('svg.record-seal')).not.toBeNull();
    expect(seal.previousElementSibling).toBe(stamp());
    expect(document.querySelector('[data-file="claim-line"], [data-file="slip"]')).toBeNull();
  });

  test('a disputed claim is underlined, never struck through, with a "?" and a whole sentence in the margin', () => {
    const challenge = 'The stains were tested. They were not blood. No one checked twice.';
    const sword = evidence('e-sword');
    if (sword.status !== 'disputed') {
      throw new Error('Test setup: e-sword is disputed');
    }
    renderAt(`${BASE}/files/e-sword`);

    const line = document.querySelector<HTMLElement>('[data-file="claim-line"]')!;
    expect(line.className).toContain('claim-underline');
    expect(line.dataset.text).toBe(sword.dispute.claim);
    // Nothing in the file is struck through.
    const file = screen.getByRole('dialog');
    expect(file.querySelector('s, del, strike, [class*="line-through"]')).toBeNull();
    expect(document.querySelector('[data-file="query"] path')).not.toBeNull();

    const note = document.querySelector<HTMLElement>('[data-file="margin-note"]')!;
    expect(note.textContent).toBe(firstSentence(sword.dispute.challenge));
    expect(sword.dispute.challenge.startsWith(note.textContent ?? '')).toBe(true);
    expect(note.textContent).toMatch(/[.!?]["”’)]?$/);
    // The note is cut at a sentence's end, never in the middle of one.
    expect(firstSentence(challenge)).toBe('The stains were tested.');
  });

  test('a file opened before plays its reveal again, and reaches its status (review-fixes 3)', () => {
    seed({ opened: ['e-legend-breakfast'], pins: {}, verdict: null });
    renderAt(`${BASE}/files/e-legend-breakfast`);

    expect(sheet().getAttribute('data-revealed')).toBeNull();
    // Played to its end, it is stamped as before.
    let reveal: gsap.core.Animation = gsap.getTweensOf(stamp())[0];
    while (reveal.parent !== null && reveal.parent !== gsap.globalTimeline) {
      reveal = reveal.parent;
    }
    reveal.progress(1);
    expect(sheet().getAttribute('data-revealed')).toBe('true');
  });

  test('with reduced motion, a legend reaches the same end state, with no drifting ink', async () => {
    stubMatchMedia({ reducedMotion: true });
    renderAt(`${BASE}/files/e-legend-breakfast`);

    await waitFor(() => expect(sheet().getAttribute('data-revealed')).toBe('true'), { timeout: 4000 });
    await waitFor(() => expect(document.querySelector<HTMLElement>('[data-file="slip"]')!.style.opacity).toBe('1'), {
      timeout: 4000,
    });
    expect(document.querySelector('.ink-word')).toBeNull();
    expect(document.querySelector<HTMLElement>('[data-file-ink]')!.style.filter).toBe('');
  });
});

describe('The case report', () => {
  /** A fixed investigation: a verdict, pins that agree, disagree and see no link, a trusted legend. */
  const fixed: InvestigationState = {
    opened: ['e-water', 'e-lifeboat', 'e-sword', 'e-legend-breakfast', 'e-findings', 'e-cargo-food'],
    pins: {
      'e-lifeboat': 't-sinking',
      'e-sword': 't-mutiny',
      'e-legend-breakfast': 't-sinking',
      'e-findings': 'none',
    },
    verdict: 't-sinking',
  };

  test('a file pinned without being opened shows as "Sealed" under "What you relied on", with no status', () => {
    seed({ ...fixed, pins: { ...fixed.pins, 'e-pump': 't-sinking' } });
    renderAt(`${BASE}/report`);
    const reliedOn = document.querySelector<HTMLElement>('section[data-report="relied-on"]')!;
    const row = [...reliedOn.querySelectorAll('li')].find(item => item.textContent?.includes(CASE.evidence.find(e => e.id === 'e-pump')!.title))!;
    expect(row.querySelector('[data-stamp="sealed"]')?.textContent).toBe('Sealed');
    expect(row.querySelector('[data-stamp="record"], [data-stamp="disputed"], [data-stamp="legend"]')).toBeNull();
  });

  test('lies on the desk as typed paper under a still lamp', () => {
    seed(fixed);
    renderAt(`${BASE}/report`);
    expect(document.querySelector('[data-desk="surface"]')).not.toBeNull();
    expect(document.querySelector('[data-desk="lamp"]')?.getAttribute('data-lamp')).toBe('still');
    expect(document.querySelector('article.desk-typed-paper')).not.toBeNull();
  });

  test('renders every section, in order, from the investigation', () => {
    seed(fixed);
    renderAt(`${BASE}/report`);

    // The credits (music, images) close the page but are not part of the report itself.
    const sections = [...document.querySelectorAll<HTMLElement>('[data-report]')].filter(
      element => element.tagName === 'SECTION' && element.dataset.report !== 'credits'
    );
    expect(sections.map(section => section.dataset.report)).toStrictEqual([
      'verdict',
      'relied-on',
      'pins',
      'against',
      'never-opened',
      'legends',
      'historians',
    ]);
    expect(sections.map(section => section.querySelector('h3')?.textContent)).toStrictEqual([
      'Your verdict',
      'What you relied on',
      'Your pins, and what historians say',
      'Against your verdict',
      'What you never opened',
      'Legends you trusted',
      'Where historians stand',
    ]);

    const [verdict, reliedOn, pins, against, neverOpened, legends, historians] = sections;
    const sinking = theory('t-sinking');

    expect(verdict.textContent).toContain(sinking.title);
    expect(verdict.querySelector('[data-stamp]')?.textContent).toBe('Leading');
    expect(verdict.textContent).toContain(sinking.standingReason);

    expect(reliedOn.textContent).toContain(evidence('e-lifeboat').title);
    expect(reliedOn.textContent).toContain(evidence('e-legend-breakfast').title);

    expect([...pins.querySelectorAll('li')].map(item => item.dataset.reading)).toStrictEqual([
      'agree',
      'agree',
      'disagree',
      'no-link',
    ]);
    expect(pins.textContent).toContain(evidence('e-sword').reading.note);

    expect(against.textContent).toContain('None of the files you opened count against it.');

    const missed = within(neverOpened).getAllByRole('link');
    expect(missed.map(link => link.getAttribute('href'))).toStrictEqual(
      ['e-instruments', 'e-last-note', 'e-pump', 'e-belongings', 'e-course-change'].map(id => `${BASE}/files/${id}`)
    );

    expect(legends.textContent).toContain('You trusted a legend. Happens to the best of us.');
    const breakfast = evidence('e-legend-breakfast');
    expect(legends.textContent).toContain(breakfast.status === 'legend' ? breakfast.origin : '');

    for (const item of CASE.theories) {
      expect(historians.textContent).toContain(item.title);
      expect(historians.textContent).toContain(item.standingReason);
    }
    for (const paragraph of CASE.historiansSummary) {
      expect(historians.textContent).toContain(paragraph);
    }
  });

  test('a verdict the opened files count against lists them; no trusted legend gets its own line', () => {
    seed({ opened: ['e-sword', 'e-cargo-food'], pins: { 'e-sword': 't-mutiny' }, verdict: 't-mutiny' });
    renderAt(`${BASE}/report`);

    const against = document.querySelector<HTMLElement>('section[data-report="against"]')!;
    expect(against.textContent).toContain(evidence('e-cargo-food').title);
    expect(against.textContent).toContain(evidence('e-sword').title);
    expect(document.querySelector('[data-report="legends-line"]')?.textContent).toBe('Not one legend got past you.');
  });

  test('without a verdict, /report redirects to the board', () => {
    seed({ opened: firstFiles(CASE.closeThreshold), pins: {}, verdict: null });
    renderAt(`${BASE}/report`);

    expect(window.location.pathname).toBe(`${BASE}/files`);
    expect(folders()).toHaveLength(CASE.evidence.length);
  });

  test('"Reopen the case" asks first, and clears the investigation only once confirmed', () => {
    seed(fixed);
    renderAt(`${BASE}/report`);

    fireEvent.click(screen.getByRole('button', { name: 'Reopen the case' }));
    expect(screen.getByText('Are you sure? Your pins will be cleared.')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(saved()).toStrictEqual(fixed);

    fireEvent.click(screen.getByRole('button', { name: 'Reopen the case' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, reopen it' }));

    expect(saved()).toStrictEqual({ opened: [], pins: {}, verdict: null });
    expect(window.location.pathname).toBe(`${BASE}/files`);
    expect(document.querySelector('[data-board="progress"]')?.textContent).toContain(`0 of ${CASE.evidence.length}`);
  });

  test('"Back to all cases" goes home', () => {
    seed(fixed);
    renderAt(`${BASE}/report`);

    expect(screen.getByRole('link', { name: 'Back to all cases' }).getAttribute('href')).toBe('/');
  });
});

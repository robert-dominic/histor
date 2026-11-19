// @vitest-environment jsdom
// src/features/board/__tests__/Investigation.test.tsx
// The investigation from the fork to the report (docs/briefs/board.md), rendered as the whole app at a URL,
// the way a deep link or a refresh would open it. Titles and notes come from the case data.
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import App from '@/App';
import maryCeleste from '@/cases/mary-celeste/case';
import { STATUS_LABEL } from '@/lib/case-files';
import { SMALL_PHONE_QUERY } from '@/lib/use-media-query';
import { finishLegendIntro } from '@/test/legend-intro';
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
  localStorage.clear();
  stubMatchMedia();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.pushState({}, '', '/');
});

describe('The fork', () => {
  test('after the story: the prompt, then "Open the case files" and "I\'ve heard enough"', () => {
    renderAt(BASE);
    finishLegendIntro();

    const fork = document.querySelector<HTMLElement>('[data-fork="root"]')!;
    expect(fork.textContent).toContain(CASE.fork.prompt);
    expect(within(fork).getByRole('link', { name: CASE.fork.investigateLabel }).getAttribute('href')).toBe(`${BASE}/files`);
    expect(within(fork).getByRole('button', { name: CASE.fork.leaveLabel })).toBeDefined();
  });

  test('"I\'ve heard enough" closes on where historians stand, with two quiet links', () => {
    renderAt(BASE);
    finishLegendIntro();

    const fork = document.querySelector<HTMLElement>('[data-fork="root"]')!;
    fireEvent.click(within(fork).getByRole('button', { name: CASE.fork.leaveLabel }));

    for (const paragraph of CASE.historiansSummary) {
      expect(within(fork).getByText(paragraph)).toBeDefined();
    }
    expect(within(fork).getByRole('link', { name: 'Open the case files anyway' }).getAttribute('href')).toBe(`${BASE}/files`);
    expect(within(fork).getByRole('link', { name: 'Back to all cases' }).getAttribute('href')).toBe('/');
  });
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
    expect(within(claim).getByRole('link', { name: new RegExp(evidence('e-lifeboat').title) }).getAttribute('href')).toBe(
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
    expect(within(tray).getByRole('link', { name: new RegExp(evidence('e-findings').title) })).toBeDefined();
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

  test('files pinned to a theory hang beneath its note, in case order, each with a thread; unopened pins do not', () => {
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
    expect(tabs('t-sinking')).toEqual(['e-lifeboat', 'e-water']);
    expect(tabs('t-mutiny')).toEqual(['e-sword']);
    expect(tabs('t-fraud')).toEqual([]);
    const threads = [...document.querySelectorAll<SVGPathElement>('[data-board="threads"] path')];
    expect(threads.map(path => path.dataset.evidenceId).sort()).toEqual(['e-lifeboat', 'e-sword', 'e-water']);
    expect(document.querySelector('[data-board="tab"] a')?.getAttribute('href')).toBe(`${BASE}/files/e-lifeboat`);
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

  test('with reduced motion, choosing a theory and confirming closes the case and opens the report', () => {
    stubMatchMedia({ reducedMotion: true });
    seed({ opened: firstFiles(CASE.closeThreshold), pins: {}, verdict: null });
    renderAt(`${BASE}/verdict`);

    expect(screen.getByText('Which theory do you believe?')).toBeDefined();
    const confirm = screen.getByRole('button', { name: 'Close the case' }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: new RegExp(theory('t-explosion').title) }));
    expect(confirm.disabled).toBe(false);
    fireEvent.click(confirm);

    expect(window.location.pathname).toBe(`${BASE}/report`);
    expect(saved().verdict).toBe('t-explosion');
  });

  test('without reduced motion, the verdict is a hold to close the case', () => {
    seed({ opened: firstFiles(CASE.closeThreshold), pins: {}, verdict: null });
    renderAt(`${BASE}/verdict`);

    expect(screen.getByRole('button', { name: 'Hold to close the case' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Close the case' })).toBeNull();
  });
});

describe('An opened file', () => {
  test('opening a file marks it opened', () => {
    renderAt(`${BASE}/files/e-lifeboat`);

    expect(screen.getByRole('heading', { name: evidence('e-lifeboat').title })).toBeDefined();
    expect(saved().opened).toStrictEqual(['e-lifeboat']);
  });

  test('choosing a theory pins it and shows how historians read the file', () => {
    renderAt(`${BASE}/files/e-lifeboat`);

    const question = screen.getByRole('group', { name: 'Which theory does this point to?' });
    const buttons = within(question).getAllByRole('button');
    expect(buttons.map(button => button.textContent)).toStrictEqual([...CASE.theories.map(item => item.title), 'None of them']);
    expect(document.querySelector('[data-file="reveal"]')).toBeNull();

    fireEvent.click(within(question).getByRole('button', { name: theory('t-sinking').title }));

    expect(saved().pins).toStrictEqual({ 'e-lifeboat': 't-sinking' });
    expect(within(question).getByRole('button', { name: theory('t-sinking').title }).getAttribute('aria-pressed')).toBe('true');
    const reveal = document.querySelector<HTMLElement>('[data-file="reveal"]')!;
    expect(reveal.querySelector('[data-file="reading"]')?.textContent).toBe('Historians agree');
    expect(reveal.textContent).toContain(evidence('e-lifeboat').reading.note);
  });

  test('a disputed file shows the claim and the challenge', () => {
    renderAt(`${BASE}/files/e-sword`);
    const sword = evidence('e-sword');
    if (sword.status !== 'disputed') {
      throw new Error('Test setup: e-sword is disputed');
    }

    expect(screen.getByText('The claim')).toBeDefined();
    expect(screen.getByText(sword.dispute.claim)).toBeDefined();
    expect(screen.getByText('The challenge')).toBeDefined();
    expect(screen.getByText(sword.dispute.challenge)).toBeDefined();
  });

  test('a legend shows where it came from', () => {
    renderAt(`${BASE}/files/e-legend-breakfast`);
    const breakfast = evidence('e-legend-breakfast');
    if (breakfast.status !== 'legend') {
      throw new Error('Test setup: e-legend-breakfast is a legend');
    }

    expect(screen.getByText(breakfast.origin)).toBeDefined();
    expect(document.querySelector('[data-stamp="legend"]')?.textContent).toBe(STATUS_LABEL.legend);
  });

  test('coming back to a pinned file shows the choice and the reveal, and the pin can be changed', () => {
    seed({ opened: ['e-sword'], pins: { 'e-sword': 't-mutiny' }, verdict: null });
    renderAt(`${BASE}/files/e-sword`);

    const question = screen.getByRole('group', { name: 'Which theory does this point to?' });
    expect(within(question).getByRole('button', { name: theory('t-mutiny').title }).getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('[data-file="reading"]')?.textContent).toBe('Historians disagree');

    fireEvent.click(within(question).getByRole('button', { name: 'None of them' }));

    expect(saved().pins).toStrictEqual({ 'e-sword': 'none' });
    expect(document.querySelector('[data-file="reading"]')?.textContent).toBe('Historians agree');
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
    const stops = [...file.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)')].sort((a, b) =>
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

  test('renders every section, in order, from the investigation', () => {
    seed(fixed);
    renderAt(`${BASE}/report`);

    const sections = [...document.querySelectorAll<HTMLElement>('[data-report]')].filter(element => element.tagName === 'SECTION');
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

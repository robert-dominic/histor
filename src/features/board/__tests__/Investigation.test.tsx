// @vitest-environment jsdom
// src/features/board/__tests__/Investigation.test.tsx
// The investigation from the fork to the report (docs/briefs/board.md), rendered as the whole app at a URL,
// the way a deep link or a refresh would open it. Titles and notes come from the case data.
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import App from '@/App';
import maryCeleste from '@/cases/mary-celeste/case';
import { STATUS_LABEL } from '@/lib/case-files';
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

  test('an opened folder shows its status stamp and the theory it was pinned to; the card counts the pin', () => {
    seed({ opened: ['e-sword'], pins: { 'e-sword': 't-mutiny' }, verdict: null });
    renderAt(`${BASE}/files`);

    const folder = folderFor('e-sword');
    expect(folder.querySelector('[data-stamp="disputed"]')?.textContent).toBe(STATUS_LABEL.disputed);
    expect(folder.querySelector('[data-board="pinned-to"]')?.textContent).toContain(theory('t-mutiny').title);

    const card = document.querySelector('[data-board="theory"][data-theory-id="t-mutiny"]')!;
    expect(card.querySelector('[data-board="pinned"]')?.textContent).toBe('1 file pinned');
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

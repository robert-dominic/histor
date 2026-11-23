// @vitest-environment jsdom
// src/pages/__tests__/Case.test.tsx
// Task 7.2: the case page handles a missing case, a sealed case and an open case.
// An open case is its legend intro, then its story below it.
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { registry } from '@/cases';
import { formatCaseYears } from '@/lib/case-years';
import { validateCase } from '@/lib/validate-case';
import Case from '@/pages/Case';
import { finishLegendIntro } from '@/test/legend-intro';
import { stubMatchMedia } from '@/test/match-media';
import type { RegistryEntry } from '@/types/case';

// Keep the real validator, but let single tests replace its result.
vi.mock('@/lib/validate-case', async importOriginal => {
  const original = await importOriginal<typeof import('@/lib/validate-case')>();
  return { ...original, validateCase: vi.fn(original.validateCase) };
});

// These tests render the whole case page, intro and story, and several take 4 to 5 seconds under load.
// A longer timeout for this file only; what they assert is unchanged.
vi.setConfig({ testTimeout: 15_000 });

type OpenEntry = Extract<RegistryEntry, { sealed: false }>;
type SealedEntry = Extract<RegistryEntry, { sealed: true }>;

const openEntry = registry.find((entry): entry is OpenEntry => !entry.sealed) as OpenEntry;
const sealedEntry = registry.find((entry): entry is SealedEntry => entry.sealed) as SealedEntry;

function renderCasePage(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<p>home page</p>} />
        <Route path="/case/:id" element={<Case />} />
      </Routes>
    </MemoryRouter>
  );
}

function expectHomeLink() {
  const link = screen.getByRole('link', { name: 'Return to home' });
  expect(link.getAttribute('href')).toBe('/');
}

beforeEach(() => {
  localStorage.clear();
  stubMatchMedia();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.mocked(validateCase).mockClear();
});

describe('Case page: case not found', () => {
  test('shows "Case not found" and a "Return to home" link for an id that is not in the registry', () => {
    renderCasePage('/case/no-such-case');

    expect(screen.getByText('Case not found')).toBeDefined();
    expectHomeLink();
  });

  test('does not validate anything when the case is not found', () => {
    renderCasePage('/case/no-such-case');

    expect(validateCase).not.toHaveBeenCalled();
  });
});

describe('Case page: sealed case', () => {
  test('shows "This case is sealed."', () => {
    renderCasePage(`/case/${sealedEntry.id}`);

    expect(screen.getByText('This case is sealed.')).toBeDefined();
  });

  test('has no case header', () => {
    renderCasePage(`/case/${sealedEntry.id}`);

    expect(document.querySelector('[data-case-header="bar"]')).toBeNull();
  });

  test('shows no case content and reads no saved investigation', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem');

    renderCasePage(`/case/${sealedEntry.id}`);

    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.queryByText(sealedEntry.title)).toBeNull();
    expect(getItem).not.toHaveBeenCalled();
    expect(validateCase).not.toHaveBeenCalled();
  });
});

describe('Case page: open case', () => {
  test('shows the legend intro first, with the lines, stamp and debunk from the case data', () => {
    renderCasePage(`/case/${openEntry.id}`);

    const { lines, stamp, debunk } = openEntry.data.legendIntro;
    const intro = screen.getByRole('region', { name: 'The legend' });
    for (const line of lines) {
      expect(intro.textContent).toContain(line);
    }
    expect(intro.textContent).toContain(stamp);
    expect(intro.textContent).toContain(debunk);
    expect(screen.queryByRole('region', { name: 'The story' })).toBeNull();
    expect(screen.queryByText('Case not found')).toBeNull();
    expect(screen.queryByText('This case is sealed.')).toBeNull();
  });

  test('the case title is the page heading, in a header that stays for the whole page, with the years', () => {
    renderCasePage(`/case/${openEntry.id}`);

    const header = document.querySelector('[data-case-header="bar"]') as HTMLElement;
    expect(within(header).getByRole('heading', { level: 1, name: openEntry.data.title })).toBeDefined();
    expect(header.textContent).toContain(formatCaseYears(openEntry.data.year, openEntry.data.yearEnd));
    expect(header.className).toContain('fixed');

    // Still there once the story is on the page.
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(screen.getByRole('region', { name: 'The story' })).toBeDefined();
    expect(document.querySelector('[data-case-header="bar"]')).toBe(header);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  test('the legend intro has no title card, and there is no opening scene: the header carries the title and years', () => {
    renderCasePage(`/case/${openEntry.id}`);

    const intro = screen.getByRole('region', { name: 'The legend' });
    expect(intro.querySelector('[data-legend="title"]')).toBeNull();
    expect(intro.querySelector('[data-legend="years"]')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(document.querySelector('[data-story="opening"]')).toBeNull();
    expect(document.querySelector('[data-case-header="title"]')?.textContent).toBe(openEntry.data.title);
    expect(document.querySelector('[data-case-header="years"]')?.textContent).toBe(
      formatCaseYears(openEntry.data.year, openEntry.data.yearEnd)
    );
    expect(document.querySelector('[data-case-header="unsolved"]') !== null).toBe(openEntry.data.unsolved === true);
  });

  test('the case header starts hidden, and is still the page heading for screen readers', () => {
    renderCasePage(`/case/${openEntry.id}`);
    const header = document.querySelector('[data-case-header="bar"]') as HTMLElement;
    expect(header.style.opacity).toBe('0');
    expect(screen.getByRole('heading', { level: 1, name: openEntry.data.title })).toBeDefined();
  });

  test('Skip keeps the intro on screen, and the story follows below it', () => {
    renderCasePage(`/case/${openEntry.id}`);

    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));

    const intro = screen.getByRole('region', { name: 'The legend' });
    const story = screen.getByRole('region', { name: 'The story' });
    expect(intro.compareDocumentPosition(story) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test('the story has every chapter of the case and ends on its central question', () => {
    renderCasePage(`/case/${openEntry.id}`);

    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));

    const story = screen.getByRole('region', { name: 'The story' });
    for (const section of openEntry.data.story) {
      expect(within(story).getByRole('heading', { name: section.heading })).toBeDefined();
    }
    expect(within(story).getByRole('heading', { name: openEntry.data.centralQuestion })).toBeDefined();
  });

  test('remembers that the intro was seen once its end state is reached', () => {
    renderCasePage(`/case/${openEntry.id}`);
    expect(localStorage.getItem(`histor:intro-seen:${openEntry.id}`)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));

    expect(localStorage.getItem(`histor:intro-seen:${openEntry.id}`)).toBe('1');
  });

  test('on a later visit the intro opens at its end state, with the scroll cue focused, no Skip, and the story below', () => {
    localStorage.setItem(`histor:intro-seen:${openEntry.id}`, '1');

    renderCasePage(`/case/${openEntry.id}`);

    const intro = screen.getByRole('region', { name: 'The legend' });
    expect(intro.getAttribute('data-ended')).toBe('true');
    expect(screen.queryByRole('button', { name: 'Skip' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'See what really happened' }));
    expect(screen.getByRole('region', { name: 'The story' })).toBeDefined();
  });

  test('the intro still plays when localStorage cannot be read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    renderCasePage(`/case/${openEntry.id}`);

    expect(screen.getByRole('button', { name: 'Skip' })).toBeDefined();
  });

  test('the scroll cue scrolls smoothly to the story', () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    try {
      renderCasePage(`/case/${openEntry.id}`);

      finishLegendIntro();

      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
      expect(scrollIntoView.mock.contexts[0]).toBe(screen.getByRole('region', { name: 'The story' }).parentElement);
    } finally {
      // jsdom has no scrollIntoView of its own.
      delete (Element.prototype as Partial<Element>).scrollIntoView;
    }
  });

  test('loads the saved investigation for that case', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem');

    renderCasePage(`/case/${openEntry.id}`);

    expect(getItem).toHaveBeenCalledWith(`histor:case:${openEntry.id}`);
  });

  test('validates the case in development and logs nothing when it is valid', () => {
    vi.mocked(validateCase).mockReturnValue([]);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderCasePage(`/case/${openEntry.id}`);

    expect(validateCase).toHaveBeenCalledWith(openEntry.data);
    expect(consoleError).not.toHaveBeenCalled();
  });

  test('logs the validation errors in development, and still shows the case', () => {
    const errors = ['Field title: Must be a non-empty string', 'Field year: Must be a positive integer'];
    vi.mocked(validateCase).mockReturnValue(errors);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderCasePage(`/case/${openEntry.id}`);

    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError.mock.calls[0][1]).toEqual(errors);
    finishLegendIntro();
    expect(screen.getByRole('heading', { name: openEntry.data.title })).toBeDefined();
  });
});

describe('Case page: case could not be loaded', () => {
  test('shows "Case could not be loaded" and a home link when an open entry has no data', () => {
    const broken = { id: 'broken-case', title: 'Broken', year: 1900, teaser: 'Broken', sealed: false } as RegistryEntry;
    registry.push(broken);
    try {
      renderCasePage('/case/broken-case');

      expect(screen.getByText('Case could not be loaded')).toBeDefined();
      expectHomeLink();
    } finally {
      registry.pop();
    }
  });
});

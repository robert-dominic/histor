// @vitest-environment jsdom
// src/pages/__tests__/Case.test.tsx
// Task 7.2: the case page handles a missing case, a sealed case and an open case.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { registry } from '@/cases';
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
    expect(screen.queryByRole('heading', { name: openEntry.data.title })).toBeNull();
    expect(screen.queryByText('Case not found')).toBeNull();
    expect(screen.queryByText('This case is sealed.')).toBeNull();
  });

  test('Skip alone keeps the intro on screen', () => {
    renderCasePage(`/case/${openEntry.id}`);

    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));

    expect(screen.getByRole('region', { name: 'The legend' })).toBeDefined();
    expect(screen.queryByRole('heading', { name: openEntry.data.title })).toBeNull();
  });

  test('after Continue, the intro is gone and the case title is shown', () => {
    renderCasePage(`/case/${openEntry.id}`);

    finishLegendIntro();

    expect(screen.queryByRole('region', { name: 'The legend' })).toBeNull();
    expect(screen.getByRole('heading', { name: openEntry.data.title })).toBeDefined();
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

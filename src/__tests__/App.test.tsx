// @vitest-environment jsdom
// src/__tests__/App.test.tsx
// Task 7.3: the app routes "/" to the home page and "/case/:id" to the case page.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import App from '@/App';
import { registry } from '@/cases';
import { finishLegendIntro } from '@/test/legend-intro';
import { stubMatchMedia } from '@/test/match-media';
import type { RegistryEntry } from '@/types/case';

type OpenEntry = Extract<RegistryEntry, { sealed: false }>;
type SealedEntry = Extract<RegistryEntry, { sealed: true }>;

const openEntry = registry.find((entry): entry is OpenEntry => !entry.sealed) as OpenEntry;
const sealedEntry = registry.find((entry): entry is SealedEntry => entry.sealed) as SealedEntry;

/** Renders the whole app as if the browser had been opened at `path`. */
function renderAppAt(path: string) {
  window.history.pushState({}, '', path);
  return render(<App />);
}

beforeEach(() => {
  localStorage.clear();
  stubMatchMedia();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.history.pushState({}, '', '/');
});

describe('App routing', () => {
  test('"/" renders the home page with every registry entry', () => {
    renderAppAt('/');

    expect(screen.getAllByRole('listitem')).toHaveLength(registry.length);
    for (const entry of registry) {
      expect(screen.getByText(entry.title, { exact: false })).toBeDefined();
    }
  });

  test('"/case/<open id>" renders the case page for that case', () => {
    renderAppAt(`/case/${openEntry.id}`);

    // An open case starts with its legend intro; the case page proper follows it.
    expect(screen.getByRole('region', { name: 'The legend' })).toBeDefined();
    finishLegendIntro();
    expect(screen.getByRole('heading', { name: openEntry.data.title })).toBeDefined();
  });

  test('"/case/<sealed id>" shows "This case is sealed."', () => {
    renderAppAt(`/case/${sealedEntry.id}`);

    expect(screen.getByText('This case is sealed.')).toBeDefined();
  });

  test('"/case/<unknown id>" shows "Case not found" with a link home', () => {
    renderAppAt('/case/no-such-case');

    expect(screen.getByText('Case not found')).toBeDefined();
    expect(screen.getByRole('link', { name: 'Return to home' }).getAttribute('href')).toBe('/');
  });

  test('clicking an open case on the home page navigates to its case page', () => {
    renderAppAt('/');

    fireEvent.click(screen.getByRole('link', { name: new RegExp(openEntry.title) }));

    expect(window.location.pathname).toBe(`/case/${openEntry.id}`);
    finishLegendIntro();
    expect(screen.getByRole('heading', { name: openEntry.data.title })).toBeDefined();
  });

  test('"Return to home" on a case page navigates back to the home page', () => {
    renderAppAt('/case/no-such-case');

    fireEvent.click(screen.getByRole('link', { name: 'Return to home' }));

    expect(window.location.pathname).toBe('/');
    expect(screen.getAllByRole('listitem')).toHaveLength(registry.length);
  });

  test.each(['/about', '/case', '/case/mary-celeste/extra', '/cases/mary-celeste'])(
    'any other address shows "Page not found" with a link home: %s',
    path => {
      renderAppAt(path);

      expect(screen.getByText('Page not found')).toBeDefined();
      expect(screen.getByRole('link', { name: 'Return to home' }).getAttribute('href')).toBe('/');
    }
  );

  test('"Return to home" on the "Page not found" page navigates to the home page', () => {
    renderAppAt('/about');

    fireEvent.click(screen.getByRole('link', { name: 'Return to home' }));

    expect(window.location.pathname).toBe('/');
    expect(screen.queryByText('Page not found')).toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(registry.length);
  });

  test('none of the Vite starter content is left', () => {
    renderAppAt('/');

    expect(screen.queryByText('Get started')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

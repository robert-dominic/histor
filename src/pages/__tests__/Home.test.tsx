// @vitest-environment jsdom
// src/pages/__tests__/Home.test.tsx
// Task 7.1: the home page lists every registry entry; open cases are links, sealed cases are not.
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, test } from 'vitest';
import { registry } from '@/cases';
import Home from '@/pages/Home';

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  );
}

afterEach(() => {
  cleanup();
});

describe('Home', () => {
  test('shows one list item for every registry entry, sealed and open', () => {
    renderHome();

    expect(screen.getAllByRole('listitem')).toHaveLength(registry.length);
  });

  test('shows the title, year and teaser of every entry as visible text', () => {
    renderHome();

    const items = screen.getAllByRole('listitem');
    registry.forEach((entry, index) => {
      const text = items[index].textContent ?? '';
      expect(text).toContain(entry.title);
      expect(text).toContain(String(entry.year));
      expect(text).toContain(entry.teaser);
    });
  });

  test('renders every open case as a link to /case/<id>', () => {
    renderHome();

    const items = screen.getAllByRole('listitem');
    const openEntries = registry.filter(entry => !entry.sealed);
    expect(openEntries.length).toBeGreaterThan(0);
    for (const entry of openEntries) {
      const link = within(items[registry.indexOf(entry)]).getByRole('link');
      expect(link.getAttribute('href')).toBe(`/case/${entry.id}`);
      expect(link.textContent).toContain(entry.title);
    }
  });

  test('renders every sealed case without a link', () => {
    renderHome();

    const items = screen.getAllByRole('listitem');
    const sealedEntries = registry.filter(entry => entry.sealed);
    expect(sealedEntries.length).toBeGreaterThan(0);
    for (const entry of sealedEntries) {
      expect(within(items[registry.indexOf(entry)]).queryByRole('link')).toBeNull();
    }
  });

  test('has exactly as many links as there are open cases', () => {
    renderHome();

    expect(screen.getAllByRole('link')).toHaveLength(registry.filter(entry => !entry.sealed).length);
  });
});

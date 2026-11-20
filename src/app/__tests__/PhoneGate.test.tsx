// @vitest-environment jsdom
// src/app/__tests__/PhoneGate.test.tsx
// Below 1024px wide, every investigation URL shows the phone gate; "Continue anyway" shows the screen as it is,
// and is remembered for the session. On a desktop there is no gate.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import CaseInvestigation from '@/app/CaseInvestigation';
import { hasContinuedPastGate, resetPhoneGate } from '@/lib/phone-gate';
import { stubMatchMedia } from '@/test/match-media';

const URLS = [
  '/case/mary-celeste/files',
  '/case/mary-celeste/files/e-lifeboat',
  '/case/mary-celeste/verdict',
  '/case/mary-celeste/report',
];

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route element={<CaseInvestigation />}>
          <Route path="/case/:id/files" element={<p>The desk</p>} />
          <Route path="/case/:id/files/:evidenceId" element={<p>The desk</p>} />
          <Route path="/case/:id/verdict" element={<p>The verdict</p>} />
          <Route path="/case/:id/report" element={<p>The report</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => resetPhoneGate());
afterEach(() => {
  cleanup();
  resetPhoneGate();
  vi.unstubAllGlobals();
});

describe('PhoneGate on a narrow screen', () => {
  beforeEach(() => stubMatchMedia());

  test.each(URLS)('%s shows the gate instead of the screen', url => {
    renderAt(url);
    expect(screen.getByRole('heading', { name: 'This case is too big for a small screen.' })).toBeDefined();
    expect(screen.getByText('Open Histor on a laptop to investigate.')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Continue anyway' })).toBeDefined();
    expect(screen.queryByText(/The (desk|verdict|report)/)).toBeNull();
  });

  test('the case header is still there', () => {
    renderAt(URLS[0]);
    expect(screen.getByRole('heading', { level: 1, name: 'The Mary Celeste' })).toBeDefined();
  });

  test('"Continue anyway" shows the screen as it was, and is remembered for the session', () => {
    const first = renderAt(URLS[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Continue anyway' }));
    expect(screen.getByText('The desk')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Continue anyway' })).toBeNull();
    expect(hasContinuedPastGate()).toBe(true);
    first.unmount();
    // Another investigation URL in the same session: no gate.
    renderAt(URLS[2]);
    expect(screen.getByText('The verdict')).toBeDefined();
  });

  test('works when storage throws: the choice is kept for the page', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => {
        throw new Error('no storage');
      },
      setItem: () => {
        throw new Error('no storage');
      },
      removeItem: () => undefined,
    });
    renderAt(URLS[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Continue anyway' }));
    expect(screen.getByText('The desk')).toBeDefined();
  });
});

describe('PhoneGate on a desktop', () => {
  test('there is no gate', () => {
    stubMatchMedia({ desktop: true });
    renderAt(URLS[0]);
    expect(screen.getByText('The desk')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Continue anyway' })).toBeNull();
  });

  test('a browser that cannot measure its screen gets the investigation, not the gate', () => {
    renderAt(URLS[0]);
    expect(screen.getByText('The desk')).toBeDefined();
  });
});

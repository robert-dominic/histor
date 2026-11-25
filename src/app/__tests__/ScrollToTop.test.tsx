// @vitest-environment jsdom
// src/app/__tests__/ScrollToTop.test.tsx
// Every page starts at the top (quick fixes, 2): restoration off app-wide; a change of page jumps to the top; the
// story, an anchor link and a file opened on the desk are left alone.
import { act, cleanup, render } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import ScrollToTop from '@/app/ScrollToTop';
import { pageOf } from '@/lib/page-of';

const driver: { go: (to: string) => void } = { go: () => undefined };
function Driver() {
  const navigate = useNavigate();
  useEffect(() => {
    driver.go = to => void navigate(to);
  }, [navigate]);
  return null;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('every page starts at the top', () => {
  test('which page a path is', () => {
    expect(pageOf('/case/mary-celeste')).toBeNull();
    expect(pageOf('/case/mary-celeste/')).toBeNull();
    expect(pageOf('/case/mary-celeste/files')).toBe('/case/mary-celeste/files');
    expect(pageOf('/case/mary-celeste/files/e-lifeboat')).toBe('/case/mary-celeste/files');
    expect(pageOf('/case/mary-celeste/report')).toBe('/case/mary-celeste/report');
    expect(pageOf('/credits')).toBe('/credits');
  });

  test('restoration manual; each new page jumps to the top; a file on the desk, an anchor and the story do not', () => {
    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);
    window.history.scrollRestoration = 'auto';
    render(
      <MemoryRouter initialEntries={['/case/c/files']}>
        <ScrollToTop />
        <Driver />
      </MemoryRouter>
    );
    expect(window.history.scrollRestoration).toBe('manual');
    expect(scrollTo).toHaveBeenCalledTimes(1);
    for (const [to, jumps] of [
      ['/case/c/files/e-one', 1],
      ['/case/c/files', 1],
      ['/case/c/verdict', 2],
      ['/case/c/report', 3],
      ['/credits#c', 3],
      ['/sources', 4],
      ['/case/c', 4],
    ] as const) {
      act(() => driver.go(to));
      expect(scrollTo, to).toHaveBeenCalledTimes(jumps);
    }
    expect(scrollTo).toHaveBeenLastCalledWith(0, 0);
  });
});

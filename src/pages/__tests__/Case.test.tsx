// @vitest-environment jsdom
// src/pages/__tests__/Case.test.tsx
// Task 7.2: the case page handles a missing case, a sealed case and an open case.
// An open case is its hook screen, then its story.
import gsap from 'gsap';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { registry } from '@/cases';
import { formatCaseYears } from '@/lib/case-years';
import { STORY_MODE_KEY } from '@/lib/story-mode';
import { validateCase } from '@/lib/validate-case';
import Case from '@/pages/Case';
import { finishHook } from '@/test/hook-screen';
import { stubMatchMedia } from '@/test/match-media';
import type { RegistryEntry } from '@/types/case';
import { sound } from '@/lib/sound';
import { beginLoading, resetLoading } from '@/lib/loading';

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
  test('shows the hook first, with its lines and its dateline from the case data, and no legend, stamp or debunk', () => {
    renderCasePage(`/case/${openEntry.id}`);

    const { lines, dateline } = openEntry.data.hook;
    const hook = screen.getByRole('region', { name: 'The hook' });
    for (const line of lines) {
      expect(hook.textContent).toContain(line);
    }
    expect(hook.textContent).toContain(dateline);
    expect(hook.querySelector('[data-legend], video')).toBeNull();
    expect(within(hook).getByRole('button', { name: 'Skip' })).toBeDefined();
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

  test('the title is a link to the start of the story: a click there goes back to the hook, with no modal (sound-files 1)', () => {
    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);
    vi.stubGlobal('requestAnimationFrame', (run: FrameRequestCallback) => {
      run(0);
      return 0;
    });
    renderCasePage(`/case/${openEntry.id}`);
    const header = document.querySelector('[data-case-header="bar"]') as HTMLElement;
    const link = within(header).getByRole('link', { name: openEntry.data.title });
    expect(link.getAttribute('href')).toBe(`/case/${openEntry.id}`);
    scrollTo.mockClear();
    fireEvent.click(link);
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
    expect(screen.getByRole('region', { name: 'The hook' })).toBeDefined();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('while a loader shows, nothing runs: no hook, no play choice, no story; they start once it has gone', () => {
    // A loader somewhere on the page (the desk's, say) holds everything.
    const end = beginLoading();
    renderCasePage(`/case/${openEntry.id}`);
    expect(screen.queryByRole('region', { name: 'The hook' })).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('region', { name: 'The story' })).toBeNull();
    act(() => end());
    expect(screen.getByRole('region', { name: 'The hook' })).toBeDefined();
    resetLoading();
  });

  test('a fresh visit (storage cleared): the hook first, then the play modal after it', () => {
    renderCasePage(`/case/${openEntry.id}`);
    expect(screen.getByRole('region', { name: 'The hook' })).toBeDefined();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('region', { name: 'The story' })).toBeNull();
    finishHook();
    expect(screen.getByRole('dialog', { name: openEntry.data.title })).toBeDefined();
  });

  test('with "Play the story" saved: the hook first, then no modal; the story starts playing at once, the sound still locked (two fixes, 2)', async () => {
    localStorage.setItem(STORY_MODE_KEY, JSON.stringify({ mode: 'play', sound: true }));
    renderCasePage(`/case/${openEntry.id}`);
    expect(screen.queryByRole('region', { name: 'The story' })).toBeNull();
    finishHook();
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    const story = screen.getByRole('region', { name: 'The story' });
    expect(story.dataset.step).toBe('page-0');
    const control = story.querySelector<HTMLButtonElement>('[data-story="play-control"]')!;
    expect(control.getAttribute('aria-pressed')).toBe('true');
    expect(control.dataset.visible).toBe('true');
    // No gesture yet: the sound is locked, and the story plays anyway.
    expect(sound.running).toBe(false);
  });

  test('with a mode saved: the hook still comes first on every visit, and then there is no modal at all', () => {
    localStorage.setItem(STORY_MODE_KEY, JSON.stringify({ mode: 'read', sound: true }));
    renderCasePage(`/case/${openEntry.id}`);
    expect(screen.getByRole('region', { name: 'The hook' })).toBeDefined();
    expect(screen.queryByRole('region', { name: 'The story' })).toBeNull();
    finishHook();
    expect(screen.queryByRole('region', { name: 'The hook' })).toBeNull();
    expect(screen.getByRole('region', { name: 'The story' })).toBeDefined();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('the page always opens at its top, with the browser\'s scroll restoration off (for the whole app now: quick fixes 2)', () => {
    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);
    window.history.scrollRestoration = 'auto';
    const { unmount } = renderCasePage(`/case/${openEntry.id}`);
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
    expect(window.history.scrollRestoration).toBe('manual');
    unmount();
    expect(window.history.scrollRestoration).toBe('manual');
  });

  test('the hook has no title card, and there is no opening scene: the header carries the title and years', () => {
    renderCasePage(`/case/${openEntry.id}`);

    const intro = screen.getByRole('region', { name: 'The hook' });
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

  test('Skip dissolves the hook into chapter 1: the story comes up under it, and then the hook is gone', () => {
    renderCasePage(`/case/${openEntry.id}`);

    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));

    const hook = screen.getByRole('region', { name: 'The hook' });
    const story = screen.getByRole('region', { name: 'The story' });
    expect(story).toBeDefined();
    expect(hook).toBeDefined();
    act(() => gsap.globalTimeline.getChildren(true, true, true).forEach(child => child.progress(1)));
    expect(screen.queryByRole('region', { name: 'The hook' })).toBeNull();
  });

  test('the story has every chapter of the case, and no central question or hooks', () => {
    renderCasePage(`/case/${openEntry.id}`);

    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));

    const story = screen.getByRole('region', { name: 'The story' });
    for (const section of openEntry.data.story) {
      expect(within(story).getByRole('heading', { name: section.heading })).toBeDefined();
    }
    expect(openEntry.data.centralQuestion).toBeUndefined();
    expect(story.querySelector('[data-story="question-layer"]')).toBeNull();
    expect(story.querySelector('[data-story="hook-moment"]')).toBeNull();
  });

  test('the hook shows on every visit: nothing is remembered', () => {
    const first = renderCasePage(`/case/${openEntry.id}`);
    finishHook();
    expect(localStorage.getItem(`histor:intro-seen:${openEntry.id}`)).toBeNull();
    first.unmount();

    renderCasePage(`/case/${openEntry.id}`);
    expect(screen.getByRole('region', { name: 'The hook' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Skip' })).toBeDefined();
  });

  test('the hook still plays when localStorage cannot be read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    renderCasePage(`/case/${openEntry.id}`);

    expect(screen.getByRole('button', { name: 'Skip' })).toBeDefined();
  });

  test('after the hook the play choice opens, and the story starts only once the reader has chosen', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    try {
      renderCasePage(`/case/${openEntry.id}`);

      finishHook();

      const choice = screen.getByRole('dialog', { name: openEntry.data.title });
      expect(within(choice).getByRole('button', { name: 'Play the story' })).toBeDefined();
      expect(scrollIntoView).not.toHaveBeenCalled();
      fireEvent.click(within(choice).getByRole('button', { name: 'Read at my pace' }));
      // It leaves quickly (a tween), then the story starts.
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), { timeout: 5000 });
      // The page scrolls again once the choice is made.
      expect(document.documentElement.style.overflow).toBe('');
    } finally {
      // jsdom has no scrollIntoView of its own.
      delete (Element.prototype as Partial<Element>).scrollIntoView;
    }
  });

  test('the choice is remembered (ui-pass 2): histor:story-mode keeps the mode and the Sound switch', async () => {
    renderCasePage(`/case/${openEntry.id}`);
    finishHook();
    const choice = screen.getByRole('dialog', { name: openEntry.data.title });
    fireEvent.click(within(choice).getByRole('switch', { name: 'Sound' }));
    fireEvent.click(within(choice).getByRole('button', { name: 'Play the story' }));
    expect(JSON.parse(localStorage.getItem(STORY_MODE_KEY)!)).toEqual({ mode: 'play', sound: false });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), { timeout: 5000 });
  });

  test('once chosen, the modal never shows again: after the hook and from the title the story starts at once', () => {
    localStorage.setItem(STORY_MODE_KEY, JSON.stringify({ mode: 'read', music: true, effects: true }));
    renderCasePage(`/case/${openEntry.id}`);
    finishHook();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('region', { name: 'The story' })).toBeDefined();
    fireEvent.click(document.querySelector<HTMLAnchorElement>('[data-case-header="title-link"]')!);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('a broken saved choice counts as no choice: the modal shows', () => {
    localStorage.setItem(STORY_MODE_KEY, '{"mode":"loud"}');
    renderCasePage(`/case/${openEntry.id}`);
    finishHook();
    expect(screen.getByRole('dialog', { name: openEntry.data.title })).toBeDefined();
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
    finishHook();
    expect(screen.getByRole('heading', { level: 1, name: openEntry.data.title })).toBeDefined();
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

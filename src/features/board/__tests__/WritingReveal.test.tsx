// @vitest-environment jsdom
// src/features/board/__tests__/WritingReveal.test.tsx
// The writing reveal of a file's first opening: the nib writes the title, the text settles in line by line, then
// the stamp lands and the paper takes its status. A click or any key but Escape finishes it; Escape closes the
// file. A file read before opens already revealed. Under reduced motion the text is simply there.
import { cleanup, fireEvent, render } from '@testing-library/react';
import gsap from 'gsap';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import App from '@/App';
import maryCeleste from '@/cases/mary-celeste/case';
import { forgetShownThisLoad } from '@/features/board/hints';
import { continuePastGate, resetPhoneGate } from '@/lib/phone-gate';
import { onStoryEvent, type StoryEvent } from '@/lib/story-events';
import { DESKTOP_QUERY } from '@/lib/use-media-query';

vi.setConfig({ testTimeout: 15_000 });
const CASE = maryCeleste;
const BASE = `/case/${CASE.id}`;
const KEY = `histor:case:${CASE.id}`;

function stubDesktop({ reduced = false }: { reduced?: boolean } = {}) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches:
        query === DESKTOP_QUERY ||
        query.includes('hover: hover') ||
        (query.includes('prefers-reduced-motion: reduce') ? reduced : query.includes('no-preference') ? !reduced : false),
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
function renderAt(path: string) {
  window.history.pushState({}, '', path);
  return render(<App />);
}
const sheet = () => document.querySelector<HTMLElement>('[data-file="sheet"]')!;
const stamp = () => document.querySelector<HTMLElement>('[data-file="stamp"]')!;
const title = () => document.querySelector<HTMLElement>('#file-title')!;
const titleLetters = () =>
  [...title().querySelectorAll<HTMLElement>('*')].filter(element => element.children.length === 0);
/** The scrubbed timeline of the open file: the one the nib's letters are written on. */
const timelineOf = () => gsap.getTweensOf(titleLetters()[0])[0].parent as gsap.core.Timeline;
/** Moves the playhead into the reveal, as if the cover had just opened. */
function intoReveal() {
  const timeline = timelineOf();
  const first = gsap.getTweensOf(titleLetters()[0])[0];
  timeline.time(first.startTime() + 0.01, true);
  return timeline;
}

beforeEach(() => {
  continuePastGate();
  localStorage.clear();
  // The guide opens on every arrival; these tests are about the desk under it.
  localStorage.setItem('histor:desk-guide-off:mary-celeste', '1');
  localStorage.setItem(`histor:desk-hints:${CASE.id}`, '1');
  forgetShownThisLoad();
  stubDesktop();
});
afterEach(() => {
  resetPhoneGate();
  cleanup();
  vi.unstubAllGlobals();
  window.history.pushState({}, '', '/');
  document.documentElement.style.overflow = '';
});

describe('the writing reveal, first opening', () => {
  test('the title is written by a small nib, letter by letter, in about 1.2 seconds', () => {
    renderAt(`${BASE}/files/e-lifeboat`);
    expect(document.querySelector('[data-file-nib="quill"]')).not.toBeNull();
    const letters = titleLetters();
    expect(letters.map(letter => letter.textContent).join('')).toBe(CASE.evidence.find(e => e.id === 'e-lifeboat')!.title.replace(/\s/g, ''));
    expect(letters.every(letter => letter.style.opacity === '0')).toBe(true);
    const first = gsap.getTweensOf(letters[0])[0];
    const last = gsap.getTweensOf(letters[letters.length - 1])[0];
    // From the first letter to the start of the last: the title's writing time (the last letter then soaks in).
    expect(last.startTime() - first.startTime()).toBeGreaterThan(0.9);
    expect(last.startTime() - first.startTime()).toBeLessThan(1.25);
  });

  test('the rest of the text settles in line by line, from a slight blur, quicker than the title', () => {
    renderAt(`${BASE}/files/e-lifeboat`);
    const lines = [...document.querySelectorAll<HTMLElement>('[data-file-ink] *')].filter(
      element => element.style.opacity === '0'
    );
    expect(lines.length).toBeGreaterThan(0);
    const settle = gsap.getTweensOf(lines[0])[0];
    expect(settle.vars.filter).toBe('blur(0px)');
    expect(settle.vars.ease).toBe('power3.out');
    expect((settle.vars.stagger as number) < 0.2).toBe(true);
    // It starts after the title is written.
    const lastLetter = gsap.getTweensOf(titleLetters().at(-1)!)[0];
    expect(settle.startTime()).toBeGreaterThanOrEqual(lastLetter.startTime());
  });

  test('the stamp lands after the text, and only then does the paper take its status', () => {
    renderAt(`${BASE}/files/e-lifeboat`);
    expect(sheet().getAttribute('data-revealed')).toBeNull();
    expect(stamp().style.opacity).toBe('0');
    const settle = gsap.getTweensOf([...document.querySelectorAll<HTMLElement>('[data-file-ink] *')].find(e => e.style.opacity === '0')!)[0];
    const stampTween = gsap.getTweensOf(stamp())[0];
    expect(stampTween.parent!.startTime() + stampTween.startTime()).toBeGreaterThan(settle.startTime());
  });

  test('blur is only on text: the lines that settle and the letters the pen writes (its ink). Nothing else is blurred', () => {
    renderAt(`${BASE}/files/e-legend-breakfast`);
    const blurred = gsap
      .getTweensOf('*')
      .filter(tween => typeof tween.vars.filter === 'string' && tween.vars.filter.includes('blur'));
    expect(blurred.length).toBeGreaterThan(0);
    for (const tween of blurred) {
      for (const target of tween.targets() as HTMLElement[]) {
        expect(target.closest('[data-file-ink], #file-title, [data-file="legend-pen"]')).not.toBeNull();
      }
    }
  });
});

describe('skipping the reveal', () => {
  test('a click on the document finishes it at once: text whole, stamp down, status taken', () => {
    renderAt(`${BASE}/files/e-lifeboat`);
    const events: StoryEvent[] = [];
    const stop = onStoryEvent(event => events.push(event));
    intoReveal();
    fireEvent.click(document.querySelector('[data-file="grip"]')!);
    stop();
    expect(sheet().getAttribute('data-revealed')).toBe('true');
    expect(stamp().style.opacity).toBe('1');
    // The title is plain markup again.
    expect(title().querySelectorAll('*')).toHaveLength(0);
    expect(title().textContent).toBe(CASE.evidence.find(e => e.id === 'e-lifeboat')!.title);
    // Each moment, once.
    expect(events.filter(event => event.type === 'stamp')).toHaveLength(1);
  });

  test('any key but Escape finishes it too', () => {
    renderAt(`${BASE}/files/e-sword`);
    intoReveal();
    fireEvent.keyDown(window, { key: 'a' });
    expect(sheet().getAttribute('data-revealed')).toBe('true');
    expect(window.location.pathname).toBe(`${BASE}/files/e-sword`);
  });

  test('Escape closes the file instead of skipping', () => {
    renderAt(`${BASE}/files/e-lifeboat`);
    intoReveal();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(window.location.pathname).toBe(`${BASE}/files`);
  });

  test('a modifier key on its own does not skip', () => {
    renderAt(`${BASE}/files/e-lifeboat`);
    intoReveal();
    fireEvent.keyDown(window, { key: 'Shift' });
    expect(sheet().getAttribute('data-revealed')).toBeNull();
  });

  test('a click before the cover has opened does nothing to the reveal', () => {
    renderAt(`${BASE}/files/e-lifeboat`);
    timelineOf().time(0, true);
    fireEvent.click(document.querySelector('[data-file="grip"]')!);
    expect(sheet().getAttribute('data-revealed')).toBeNull();
  });

  test.each([
    ['record', 'e-lifeboat'],
    ['disputed', 'e-sword'],
    ['legend', 'e-legend-breakfast'],
  ] as const)('a %s file still reaches its end state after a skip', (status, id) => {
    renderAt(`${BASE}/files/${id}`);
    intoReveal();
    fireEvent.click(document.querySelector('[data-file="grip"]')!);
    expect(sheet().getAttribute('data-status')).toBe(status);
    expect(sheet().getAttribute('data-revealed')).toBe('true');
    expect(stamp().style.opacity).toBe('1');
  });
});

describe('files already read, and reduced motion', () => {
  test('a file read before plays the full reveal again: the nib writes the title, the stamp waits (review-fixes 3)', () => {
    localStorage.setItem(KEY, JSON.stringify({ opened: ['e-lifeboat'], pins: {}, verdict: null }));
    renderAt(`${BASE}/files/e-lifeboat`);
    expect(sheet().getAttribute('data-revealed')).toBeNull();
    expect(titleLetters().length).toBeGreaterThan(0);
    expect(titleLetters().every(letter => letter.style.opacity === '0')).toBe(true);
    expect(gsap.getTweensOf('[data-file-nib="quill-body"]').length).toBeGreaterThan(0);
    // A key skips it, and it ends stamped; it is still counted as opened once.
    const timeline = intoReveal();
    fireEvent.keyDown(window, { key: 'a' });
    expect(timeline.progress()).toBe(1);
    expect(sheet().getAttribute('data-revealed')).toBe('true');
    expect(JSON.parse(localStorage.getItem(KEY)!).opened).toEqual(['e-lifeboat']);
  });

  test('reduced motion: the text simply appears, with no nib and no blur', () => {
    vi.unstubAllGlobals();
    stubDesktop({ reduced: true });
    renderAt(`${BASE}/files/e-lifeboat`);
    expect(title().querySelectorAll('*')).toHaveLength(0);
    for (const paragraph of document.querySelectorAll<HTMLElement>('[data-file-ink]')) {
      expect(paragraph.querySelectorAll('[style*="opacity: 0"]')).toHaveLength(0);
    }
    const blurred = gsap
      .getTweensOf('*')
      .filter(tween => typeof tween.vars.filter === 'string' && tween.vars.filter.includes('blur'));
    expect(blurred).toHaveLength(0);
    expect(gsap.getTweensOf('[data-file-nib="quill-body"]')).toHaveLength(0);
  });
});

describe('portals inside an opened file (story-steps 4)', () => {
  const withPortal = CASE.evidence.find(evidence => JSON.stringify(evidence).includes('{{ref:'))!;

  test('after the writing reveal has rebuilt the text, a portal name in the file still opens its card', () => {
    renderAt(`${BASE}/files/${withPortal.id}`);
    // The reveal runs to its end: its line splitting is put back, and the text around the names is rebuilt.
    timelineOf().progress(1);
    const names = [...document.querySelectorAll<HTMLElement>('[data-file="sheet"] [data-portal-trigger]')];
    expect(names.length).toBeGreaterThan(0);
    fireEvent.click(names[0]);
    expect(document.querySelector('[data-portal="card"]')).not.toBeNull();
    // The file stays open behind it.
    expect(sheet()).not.toBeNull();
  });

  test('a name whose element was replaced (as a split and revert does) still opens, by click and by Enter', () => {
    renderAt(`${BASE}/files/${withPortal.id}`);
    timelineOf().progress(1);
    const name = document.querySelector<HTMLElement>('[data-file="sheet"] [data-portal-trigger]')!;
    const paragraph = name.parentElement!;
    // The same HTML, new elements: React's own handlers would be gone.
    const html = paragraph.innerHTML;
    paragraph.innerHTML = html;
    const rebuilt = paragraph.querySelector<HTMLElement>('[data-portal-trigger]')!;
    expect(rebuilt).not.toBe(name);
    fireEvent.keyDown(rebuilt, { key: 'Enter' });
    expect(document.querySelector('[data-portal="card"]')).not.toBeNull();
  });
});

describe('every stamp is a moment (investigation 1)', () => {
  const ofStatus = (status: 'record' | 'disputed' | 'legend') => CASE.evidence.find(evidence => evidence.status === status)!;
  const note = () => document.querySelector<HTMLElement>('[data-file="stamp-note"]');
  const penLine = () => document.querySelector<HTMLElement>('[data-file="legend-pen"]');
  /** When a tween on the reveal's timeline starts, in the timeline's time. */
  const at = (tween: gsap.core.Tween) => (tween.parent === timelineOf() ? tween.startTime() : tween.parent!.startTime() + tween.startTime());
  const landedAt = () => {
    const press = gsap.getTweensOf(stamp())[0];
    return at(press) + press.duration();
  };

  test('a record lands heavy: a tiny shake of the folder, the ink spreading, then its note typed', () => {
    renderAt(`${BASE}/files/${ofStatus('record').id}`);
    const shake = gsap.getTweensOf(document.querySelector('[data-file="grip"]')!).find(tween => tween.vars.keyframes !== undefined)!;
    const offsets = (shake.vars.keyframes as { x: number[] }).x;
    expect(Math.max(...offsets.map(Math.abs))).toBeLessThanOrEqual(2);
    expect(shake.duration()).toBeLessThan(0.15);
    expect(gsap.getTweensOf(stamp()).some(tween => tween.vars.ease === 'power2.out' && (tween.vars.scale as number) > 1)).toBe(true);
    expect(note()?.textContent).toBe('Written down at the time.');
    const letters = [...note()!.querySelectorAll<HTMLElement>('*')].filter(element => element.children.length === 0);
    expect(letters.every(letter => letter.style.opacity === '0')).toBe(true);
    expect(at(gsap.getTweensOf(letters[0])[0])).toBeGreaterThanOrEqual(landedAt());
  });

  test('a disputed stamp lands a little crooked, with its note', () => {
    renderAt(`${BASE}/files/${ofStatus('disputed').id}`);
    const crooked = gsap.getTweensOf(stamp()).find(tween => tween.vars.rotation !== undefined)!;
    expect(crooked.vars.rotation).toBe(-4);
    expect(note()?.textContent).toBe('Historians argue over this one.');
    expect(document.querySelector('[data-file="sheet-two"]')).not.toBeNull();
  });

  test('a legend: the ink drains, then the pen writes "You almost believed this." at the foot of the page', () => {
    renderAt(`${BASE}/files/${ofStatus('legend').id}`);
    expect(note()).toBeNull();
    expect(penLine()?.textContent).toBe('You almost believed this.');
    const letters = [...penLine()!.querySelectorAll<HTMLElement>('*')].filter(element => element.children.length === 0);
    const firstLetter = gsap.getTweensOf(letters[0])[0];
    expect(at(firstLetter)).toBeGreaterThan(landedAt() + 2);
    expect(gsap.getTweensOf('[data-file-pen="quill-body"]').length).toBeGreaterThan(0);
  });

  test('one sound event per kind of stamp, as it lands', () => {
    for (const status of ['record', 'disputed', 'legend'] as const) {
      cleanup();
      localStorage.removeItem(KEY);
      const events: StoryEvent[] = [];
      const stop = onStoryEvent(event => events.push(event));
      try {
        renderAt(`${BASE}/files/${ofStatus(status).id}`);
        timelineOf().progress(1);
      } finally {
        stop();
      }
      expect(events.filter(event => event.type.startsWith('stamp:')).map(event => event.type)).toEqual([`stamp:${status}`]);
    }
  });

  test('a file read before has its stamp moment again: the shake, and the note typed (review-fixes 3)', () => {
    localStorage.setItem(KEY, JSON.stringify({ opened: [ofStatus('record').id], pins: {}, verdict: null }));
    renderAt(`${BASE}/files/${ofStatus('record').id}`);
    expect(sheet().getAttribute('data-revealed')).toBeNull();
    expect(note()!.querySelectorAll('*').length).toBeGreaterThan(0);
    expect(gsap.getTweensOf(document.querySelector('[data-file="grip"]')!).length).toBeGreaterThan(0);
  });

  test('reduced motion: the stamp and the note simply appear', () => {
    vi.unstubAllGlobals();
    stubDesktop({ reduced: true });
    renderAt(`${BASE}/files/${ofStatus('legend').id}`);
    expect(penLine()!.querySelectorAll('*')).toHaveLength(0);
    expect(gsap.getTweensOf('[data-file-pen="quill-body"]')).toHaveLength(0);
    expect(gsap.getTweensOf(document.querySelector('[data-file="grip"]')!)).toHaveLength(0);
  });
});

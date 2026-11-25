// @vitest-environment jsdom
// src/features/verdict/__tests__/ResultActions.test.tsx
// The result screen's action bar (ui-pass brief, 3): four icon buttons in a row at the top right (Download, Share,
// Save, Copy), each with an aria-label and a tooltip of the same words after about 400ms; "Link copied" after copying.
// The text buttons they replace are gone.
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import App from '@/App';
import maryCeleste from '@/cases/mary-celeste/case';
import { continuePastGate, resetPhoneGate } from '@/lib/phone-gate';
import { stubMatchMedia } from '@/test/match-media';

const CASE = maryCeleste;

function renderReport() {
  continuePastGate();
  localStorage.setItem(`histor:case:${CASE.id}`, JSON.stringify({ opened: [CASE.evidence[0].id], pins: {}, verdict: CASE.theories[0].id }));
  window.history.pushState({}, '', `/case/${CASE.id}/report`);
  return render(<App />);
}

beforeEach(() => stubMatchMedia({ desktop: true }));
afterEach(() => {
  cleanup();
  resetPhoneGate();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  localStorage.clear();
  window.history.pushState({}, '', '/');
});

describe('the action bar', () => {
  test('four icon buttons in a row, each named by its aria-label', () => {
    renderReport();
    const bar = screen.getByRole('toolbar', { name: 'Your result' });
    expect(within(bar).getAllByRole('button').map(button => button.getAttribute('aria-label'))).toEqual([
      'Download your case report (PDF)',
      'Share your result',
      'Save the card',
      'Copy the link',
    ]);
    expect(bar.className).toContain('fixed');
  });

  test('the text buttons they replace are gone', () => {
    renderReport();
    expect(screen.queryByText('Download your case report (PDF)', { selector: 'button' })).toBeNull();
    expect(screen.queryByText('Save the card', { selector: 'button' })).toBeNull();
    expect(document.querySelector('[data-report="pdf"]')).toBeNull();
  });

  test('a tooltip with the same words after about 400ms of a resting mouse; leaving hides it', () => {
    vi.useFakeTimers();
    renderReport();
    const save = screen.getByRole('button', { name: 'Save the card' });
    const tip = save.parentElement!.querySelector<HTMLElement>('[data-tooltip]')!;
    expect(tip.textContent).toBe('Save the card');
    fireEvent.pointerEnter(save, { pointerType: 'mouse' });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(tip.dataset.shown).toBe('false');
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(tip.dataset.shown).toBe('true');
    fireEvent.pointerLeave(save, { pointerType: 'mouse' });
    expect(tip.dataset.shown).toBe('false');
  });

  test('"Copy the link" says "Link copied" for a moment after copying', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    renderReport();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy the link' }));
    });
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Link copied' })).toBeDefined();
  });
});

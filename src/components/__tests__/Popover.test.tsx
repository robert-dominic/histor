// @vitest-environment jsdom
// src/components/__tests__/Popover.test.tsx
// The one popover style (ui-pass brief, 4): a paper panel at least 14px inside, rising in with paper.lift and
// leaving quicker; the volume popover and the Share menu both use it, with a styled slider and its typed value.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import gsap from 'gsap';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';
import CaseHeader from '@/components/CaseHeader';
import Popover from '@/components/Popover';
import { MOTION } from '@/lib/motion';
import { closeAllPopovers } from '@/lib/use-popover';
import { stubMatchMedia } from '@/test/match-media';

afterEach(() => {
  act(() => closeAllPopovers());
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('Popover', () => {
  test('paper, 14px inside; opens with paper.lift, closes quicker, and stays drawn until it has gone', () => {
    stubMatchMedia();
    const { rerender } = render(<Popover open>Inside</Popover>);
    const panel = screen.getByText('Inside');
    expect(panel.className).toContain('popover-paper');
    expect(panel.className).toContain('p-3.5');
    const opening = gsap.getTweensOf(panel)[0];
    expect(opening.vars.ease).toBe(MOTION['paper.lift'].ease);
    rerender(<Popover open={false}>Inside</Popover>);
    const closing = gsap.getTweensOf(panel).find(tween => tween.vars.opacity === 0)!;
    expect(closing.duration()).toBeLessThan(opening.duration());
    expect(screen.getByText('Inside')).toBeDefined();
    act(() => {
      closing.progress(1);
    });
    expect(screen.queryByText('Inside')).toBeNull();
  });

  test('the volume popover uses it: a styled slider with its value typed beside it', () => {
    vi.useFakeTimers();
    render(
      <MemoryRouter>
        <CaseHeader caseId="test" title="Test" years="1900" />
      </MemoryRouter>
    );
    const music = screen.getByRole('button', { name: 'Music' });
    fireEvent.pointerDown(music, { pointerType: 'touch' });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    const slider = screen.getByRole('slider', { name: 'Music volume' });
    expect(slider.className).toContain('paper-range');
    expect(slider.closest('[data-popover]')?.className).toContain('popover-paper');
    expect(slider.parentElement!.textContent).toMatch(/\d+%/);
    vi.useRealTimers();
  });
});

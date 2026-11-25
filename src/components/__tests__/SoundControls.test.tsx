// @vitest-environment jsdom
// src/components/__tests__/SoundControls.test.tsx
// The sound control in the case header: one now, Sound (sound-files brief, 3), on or off, remembered; a held press,
// a mouse hover or the keyboard shows its volume slider, remembered too.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CaseHeader from '@/components/CaseHeader';
import { sound } from '@/lib/sound';
import { SOUND_KEYS } from '@/lib/sound/levels';
import { POPOVER, closeAllPopovers, usePopover } from '@/lib/use-popover';

beforeEach(() => localStorage.clear());
afterEach(() => {
  act(() => closeAllPopovers());
  cleanup();
  vi.useRealTimers();
  sound.setOn('music', true);
  sound.setOn('effects', true);
  localStorage.clear();
});

describe('the sound controls', () => {
  test('one icon in the header, Sound (no Music: sound-files 3): a click turns it on or off, remembered', () => {
    render(<MemoryRouter><CaseHeader caseId="test-case" title="Test Case" years="1900" /></MemoryRouter>);
    expect(screen.queryByRole('button', { name: 'Music' })).toBeNull();
    const control = screen.getByRole('button', { name: 'Sound' });
    expect(control.closest('header')).not.toBeNull();
    expect(control.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(control);
    expect(control.getAttribute('aria-pressed')).toBe('false');
    expect(localStorage.getItem(SOUND_KEYS.effects)).toBe('0');
    expect(control.querySelector('[data-sound="muted"]')).not.toBeNull();
    fireEvent.click(control);
    expect(localStorage.getItem(SOUND_KEYS.effects)).toBe('1');
  });

  test('pressing and holding shows the volume slider, and is not a click; the volume is remembered', () => {
    vi.useFakeTimers();
    render(<MemoryRouter><CaseHeader caseId="test-case" title="Test Case" years="1900" /></MemoryRouter>);
    const control = screen.getByRole('button', { name: 'Sound' });
    fireEvent.pointerDown(control, { pointerType: 'touch' });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    fireEvent.pointerUp(control, { pointerType: 'touch' });
    fireEvent.click(control);
    // Still on: the held press only opened the slider.
    expect(control.getAttribute('aria-pressed')).toBe('true');
    const slider = screen.getByRole('slider', { name: 'Sound volume' });
    fireEvent.change(slider, { target: { value: '35' } });
    expect(sound.volume('effects')).toBe(0.35);
    expect(localStorage.getItem(SOUND_KEYS.effectsVolume)).toBe('0.35');
    // Escape closes it.
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('slider', { name: 'Sound volume' })).toBeNull();
    sound.setVolume('effects', 0.8);
  });

  test('a short press is a click: no slider', () => {
    vi.useFakeTimers();
    render(<MemoryRouter><CaseHeader caseId="test-case" title="Test Case" years="1900" /></MemoryRouter>);
    const effects = screen.getByRole('button', { name: 'Sound' });
    fireEvent.pointerDown(effects, { pointerType: 'touch' });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    fireEvent.pointerUp(effects, { pointerType: 'touch' });
    fireEvent.click(effects);
    expect(effects.getAttribute('aria-pressed')).toBe('false');
    expect(screen.queryByRole('slider')).toBeNull();
  });

  test('hovering with a mouse shows the slider; moving into it keeps it; leaving both hides it after the grace', () => {
    vi.useFakeTimers();
    render(<MemoryRouter><CaseHeader caseId="test-case" title="Test Case" years="1900" /></MemoryRouter>);
    const control = screen.getByRole('button', { name: 'Sound' }).parentElement!;
    fireEvent.pointerEnter(control, { pointerType: 'mouse' });
    act(() => {
      vi.advanceTimersByTime(POPOVER.openAfterMs + 10);
    });
    expect(screen.getByRole('slider', { name: 'Sound volume' })).toBeDefined();
    // Across the gap to the popover: out and back in within the grace keeps it.
    fireEvent.pointerLeave(control, { pointerType: 'mouse' });
    act(() => {
      vi.advanceTimersByTime(POPOVER.graceMs / 2);
    });
    fireEvent.pointerEnter(control, { pointerType: 'mouse' });
    act(() => {
      vi.advanceTimersByTime(POPOVER.graceMs * 2);
    });
    expect(screen.getByRole('slider', { name: 'Sound volume' })).toBeDefined();
    fireEvent.pointerLeave(control, { pointerType: 'mouse' });
    expect(screen.getByRole('slider', { name: 'Sound volume' })).toBeDefined();
    act(() => {
      vi.advanceTimersByTime(POPOVER.graceMs + 10);
    });
    expect(screen.queryByRole('slider')).toBeNull();
  });

  test('a click only toggles: it never opens the popover, and a hover about to open is cancelled', () => {
    vi.useFakeTimers();
    render(<MemoryRouter><CaseHeader caseId="test-case" title="Test Case" years="1900" /></MemoryRouter>);
    const control = screen.getByRole('button', { name: 'Sound' });
    fireEvent.pointerEnter(control.parentElement!, { pointerType: 'mouse' });
    fireEvent.pointerDown(control, { pointerType: 'mouse' });
    fireEvent.pointerUp(control, { pointerType: 'mouse' });
    fireEvent.click(control);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(control.getAttribute('aria-pressed')).toBe('false');
    expect(screen.queryByRole('slider')).toBeNull();
  });

  test('a hover-opened popover closes when the mouse leaves, even if the icon was clicked (it has the focus)', () => {
    vi.useFakeTimers();
    render(<MemoryRouter><CaseHeader caseId="test-case" title="Test Case" years="1900" /></MemoryRouter>);
    const control = screen.getByRole('button', { name: 'Sound' });
    fireEvent.pointerEnter(control.parentElement!, { pointerType: 'mouse' });
    act(() => {
      vi.advanceTimersByTime(POPOVER.openAfterMs + 10);
    });
    control.focus();
    fireEvent.click(control);
    expect(screen.getByRole('slider', { name: 'Sound volume' })).toBeDefined();
    fireEvent.pointerLeave(control.parentElement!, { pointerType: 'mouse' });
    act(() => {
      vi.advanceTimersByTime(POPOVER.graceMs + 10);
    });
    expect(screen.queryByRole('slider')).toBeNull();
  });

  test('only one popover at a time: opening another closes the first at once', () => {
    function Two() {
      const one = usePopover({ clickToggles: true });
      const two = usePopover({ clickToggles: true });
      return (
        <>
          <button type="button" onClick={() => one.consumeClick()}>One</button>
          {one.open && <p>first</p>}
          <button type="button" onClick={() => two.consumeClick()}>Two</button>
          {two.open && <p>second</p>}
        </>
      );
    }
    render(<Two />);
    fireEvent.click(screen.getByRole('button', { name: 'One' }));
    expect(screen.getByText('first')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Two' }));
    expect(screen.queryByText('first')).toBeNull();
    expect(screen.getByText('second')).toBeDefined();
  });

  test('a tap elsewhere closes a long-pressed popover', () => {
    vi.useFakeTimers();
    render(<MemoryRouter><CaseHeader caseId="test-case" title="Test Case" years="1900" /></MemoryRouter>);
    const control = screen.getByRole('button', { name: 'Sound' });
    fireEvent.pointerDown(control, { pointerType: 'touch' });
    act(() => {
      vi.advanceTimersByTime(POPOVER.longPressMs + 10);
    });
    fireEvent.pointerUp(control, { pointerType: 'touch' });
    expect(screen.getByRole('slider')).toBeDefined();
    fireEvent.pointerDown(document.body, { pointerType: 'touch' });
    expect(screen.queryByRole('slider')).toBeNull();
  });
});

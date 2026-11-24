// @vitest-environment jsdom
// src/components/__tests__/SoundControls.test.tsx
// The two sound controls in the case header (music brief, 1): Music and Effects, each on or off, remembered apart;
// a held press, a mouse hover or the keyboard shows its volume slider, remembered too.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import CaseHeader from '@/components/CaseHeader';
import { sound } from '@/lib/sound';
import { SOUND_KEYS } from '@/lib/sound/levels';
import { POPOVER, closeAllPopovers } from '@/lib/use-popover';

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
  test('two icons in the header, Music and Effects: each click turns its own on or off, kept apart', () => {
    render(<CaseHeader title="Test Case" years="1900" />);
    const music = screen.getByRole('button', { name: 'Music' });
    const effects = screen.getByRole('button', { name: 'Effects' });
    expect(music.closest('header')).not.toBeNull();
    expect([music.getAttribute('aria-pressed'), effects.getAttribute('aria-pressed')]).toEqual(['true', 'true']);
    fireEvent.click(music);
    expect(music.getAttribute('aria-pressed')).toBe('false');
    expect(effects.getAttribute('aria-pressed')).toBe('true');
    expect(localStorage.getItem(SOUND_KEYS.music)).toBe('0');
    expect(localStorage.getItem(SOUND_KEYS.effects)).toBeNull();
    fireEvent.click(effects);
    expect(localStorage.getItem(SOUND_KEYS.effects)).toBe('0');
    expect(effects.querySelector('[data-sound="muted"]')).not.toBeNull();
    fireEvent.click(music);
    expect(localStorage.getItem(SOUND_KEYS.music)).toBe('1');
  });

  test('pressing and holding shows the volume slider, and is not a click; the volume is remembered', () => {
    vi.useFakeTimers();
    render(<CaseHeader title="Test Case" years="1900" />);
    const music = screen.getByRole('button', { name: 'Music' });
    fireEvent.pointerDown(music, { pointerType: 'touch' });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    fireEvent.pointerUp(music, { pointerType: 'touch' });
    fireEvent.click(music);
    // Still on: the held press only opened the slider.
    expect(music.getAttribute('aria-pressed')).toBe('true');
    const slider = screen.getByRole('slider', { name: 'Music volume' });
    fireEvent.change(slider, { target: { value: '35' } });
    expect(sound.volume('music')).toBe(0.35);
    expect(localStorage.getItem(SOUND_KEYS.musicVolume)).toBe('0.35');
    // Escape closes it.
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('slider', { name: 'Music volume' })).toBeNull();
    sound.setVolume('music', 0.8);
  });

  test('a short press is a click: no slider', () => {
    vi.useFakeTimers();
    render(<CaseHeader title="Test Case" years="1900" />);
    const effects = screen.getByRole('button', { name: 'Effects' });
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
    render(<CaseHeader title="Test Case" years="1900" />);
    const control = screen.getByRole('button', { name: 'Effects' }).parentElement!;
    fireEvent.pointerEnter(control, { pointerType: 'mouse' });
    act(() => {
      vi.advanceTimersByTime(POPOVER.openAfterMs + 10);
    });
    expect(screen.getByRole('slider', { name: 'Effects volume' })).toBeDefined();
    // Across the gap to the popover: out and back in within the grace keeps it.
    fireEvent.pointerLeave(control, { pointerType: 'mouse' });
    act(() => {
      vi.advanceTimersByTime(POPOVER.graceMs / 2);
    });
    fireEvent.pointerEnter(control, { pointerType: 'mouse' });
    act(() => {
      vi.advanceTimersByTime(POPOVER.graceMs * 2);
    });
    expect(screen.getByRole('slider', { name: 'Effects volume' })).toBeDefined();
    fireEvent.pointerLeave(control, { pointerType: 'mouse' });
    expect(screen.getByRole('slider', { name: 'Effects volume' })).toBeDefined();
    act(() => {
      vi.advanceTimersByTime(POPOVER.graceMs + 10);
    });
    expect(screen.queryByRole('slider')).toBeNull();
  });

  test('a click only toggles: it never opens the popover, and a hover about to open is cancelled', () => {
    vi.useFakeTimers();
    render(<CaseHeader title="Test Case" years="1900" />);
    const music = screen.getByRole('button', { name: 'Music' });
    fireEvent.pointerEnter(music.parentElement!, { pointerType: 'mouse' });
    fireEvent.pointerDown(music, { pointerType: 'mouse' });
    fireEvent.pointerUp(music, { pointerType: 'mouse' });
    fireEvent.click(music);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(music.getAttribute('aria-pressed')).toBe('false');
    expect(screen.queryByRole('slider')).toBeNull();
  });

  test('a hover-opened popover closes when the mouse leaves, even if the icon was clicked (it has the focus)', () => {
    vi.useFakeTimers();
    render(<CaseHeader title="Test Case" years="1900" />);
    const music = screen.getByRole('button', { name: 'Music' });
    fireEvent.pointerEnter(music.parentElement!, { pointerType: 'mouse' });
    act(() => {
      vi.advanceTimersByTime(POPOVER.openAfterMs + 10);
    });
    music.focus();
    fireEvent.click(music);
    expect(screen.getByRole('slider', { name: 'Music volume' })).toBeDefined();
    fireEvent.pointerLeave(music.parentElement!, { pointerType: 'mouse' });
    act(() => {
      vi.advanceTimersByTime(POPOVER.graceMs + 10);
    });
    expect(screen.queryByRole('slider')).toBeNull();
  });

  test('only one popover at a time: opening the other closes the first at once', () => {
    vi.useFakeTimers();
    render(<CaseHeader title="Test Case" years="1900" />);
    const music = screen.getByRole('button', { name: 'Music' }).parentElement!;
    const effects = screen.getByRole('button', { name: 'Effects' }).parentElement!;
    fireEvent.pointerEnter(music, { pointerType: 'mouse' });
    act(() => {
      vi.advanceTimersByTime(POPOVER.openAfterMs + 10);
    });
    fireEvent.pointerLeave(music, { pointerType: 'mouse' });
    fireEvent.pointerEnter(effects, { pointerType: 'mouse' });
    act(() => {
      vi.advanceTimersByTime(POPOVER.openAfterMs + 10);
    });
    expect(screen.getAllByRole('slider').map(slider => slider.getAttribute('aria-label'))).toEqual(['Effects volume']);
  });

  test('a tap elsewhere closes a long-pressed popover', () => {
    vi.useFakeTimers();
    render(<CaseHeader title="Test Case" years="1900" />);
    const music = screen.getByRole('button', { name: 'Music' });
    fireEvent.pointerDown(music, { pointerType: 'touch' });
    act(() => {
      vi.advanceTimersByTime(POPOVER.longPressMs + 10);
    });
    fireEvent.pointerUp(music, { pointerType: 'touch' });
    expect(screen.getByRole('slider')).toBeDefined();
    fireEvent.pointerDown(document.body, { pointerType: 'touch' });
    expect(screen.queryByRole('slider')).toBeNull();
  });
});

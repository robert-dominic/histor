// @vitest-environment jsdom
// src/components/__tests__/SoundToggle.test.tsx
// The sound toggle in the case header (polish brief, B1): a speaker, on or off, remembered in histor:sound.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import CaseHeader from '@/components/CaseHeader';
import { sound } from '@/lib/sound';
import { SOUND_STORAGE_KEY } from '@/lib/sound/levels';

afterEach(() => {
  cleanup();
  sound.setEnabled(true);
  localStorage.clear();
});

describe('the sound toggle', () => {
  test('in the header; pressing it turns the sound off and on, and the choice is kept', () => {
    render(<CaseHeader title="Test Case" years="1900" />);
    const toggle = screen.getByRole('button', { name: 'Sound' });
    expect(toggle.closest('header')).not.toBeNull();
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(localStorage.getItem(SOUND_STORAGE_KEY)).toBe('0');
    expect(toggle.querySelector('[data-sound="muted"]')).not.toBeNull();
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(localStorage.getItem(SOUND_STORAGE_KEY)).toBe('1');
  });
});

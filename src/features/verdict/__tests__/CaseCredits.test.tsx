// @vitest-environment jsdom
// src/features/verdict/__tests__/CaseCredits.test.tsx
// The case's credits: Mixkit for the sound effects (sound-files brief, 5); no Music section while the music is off.
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import CaseCredits from '@/features/verdict/CaseCredits';

afterEach(cleanup);

describe('the case credits', () => {
  test('while the music is off (sound-files 3), no "Music" section: nothing unplayed is credited', () => {
    const one = { src: '/a.mp3', title: 'Low Tide', credit: 'An Artist (Pixabay)' };
    render(<CaseCredits playlists={{ story: [one], desk: [] }} />);
    expect(screen.queryByRole('heading', { name: 'Music' })).toBeNull();
  });

  test('a "Sound" section credits Mixkit for the sound effects (sound-files 5), with or without music', () => {
    render(<CaseCredits playlists={undefined} />);
    expect(screen.getByRole('heading', { name: 'Sound' })).toBeDefined();
    const line = document.querySelector('[data-credits="sound"]')!;
    expect(line.textContent).toContain('Mixkit');
    expect(line.querySelector('a')!.getAttribute('href')).toBe('https://mixkit.co');
  });
});

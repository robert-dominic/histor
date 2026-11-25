// @vitest-environment jsdom
// src/features/verdict/__tests__/CaseCredits.test.tsx
// The case's credits (music brief, 2): a "Music" section listing each track's title and credit; none without music.
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

  test('no playlists, no section', () => {
    const { container } = render(<CaseCredits playlists={undefined} />);
    expect(container.innerHTML).toBe('');
  });
});

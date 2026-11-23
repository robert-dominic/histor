// @vitest-environment jsdom
// src/features/verdict/__tests__/CaseCredits.test.tsx
// The case's credits (music brief, 2): a "Music" section listing each track's title and credit; none without music.
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import CaseCredits from '@/features/verdict/CaseCredits';

afterEach(cleanup);

describe('the case credits', () => {
  test('a "Music" section with each track\'s title and credit, each track once', () => {
    const one = { src: '/a.mp3', title: 'Low Tide', credit: 'An Artist (Pixabay)' };
    const two = { src: '/b.mp3', title: 'Lamplight', credit: 'Another (Pixabay)' };
    render(<CaseCredits playlists={{ story: [one, two], desk: [two] }} />);
    expect(screen.getByRole('heading', { name: 'Music' })).toBeDefined();
    const items = screen.getAllByRole('listitem').map(item => item.textContent);
    expect(items).toEqual(['Low Tide · An Artist (Pixabay)', 'Lamplight · Another (Pixabay)']);
  });

  test('no playlists, no section', () => {
    const { container } = render(<CaseCredits playlists={undefined} />);
    expect(container.innerHTML).toBe('');
  });
});

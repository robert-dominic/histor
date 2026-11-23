// @vitest-environment jsdom
// src/features/story/__tests__/PlayChoice.test.tsx
// The play choice after the legend intro: a real modal. The reader must choose; Escape means "Read at my pace";
// the focus stays inside and goes back afterwards; the page does not scroll meanwhile.
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import gsap from 'gsap';
import { afterEach, describe, expect, test, vi } from 'vitest';
import PlayChoice from '@/features/story/PlayChoice';
import { stubMatchMedia } from '@/test/match-media';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.documentElement.style.overflow = '';
});

function renderChoice() {
  const onChoose = vi.fn();
  const before = document.createElement('button');
  before.textContent = 'Before';
  document.body.appendChild(before);
  before.focus();
  const view = render(<PlayChoice title="Test Case" onChoose={onChoose} />);
  return { ...view, onChoose, before };
}
const finish = () => gsap.globalTimeline.getChildren(true, true, false).forEach(tween => tween.progress(1));

describe('PlayChoice', () => {
  test('a modal titled with the case, one short line and two big choices; the focus is on "Play the story"', () => {
    renderChoice();
    const dialog = screen.getByRole('dialog', { name: 'Test Case' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    const play = within(dialog).getByRole('button', { name: 'Play the story' });
    expect(within(dialog).getByRole('button', { name: 'Read at my pace' })).toBeDefined();
    expect(play.className).toContain('min-h-14');
    expect(document.activeElement).toBe(play);
  });

  test('the page does not scroll while it is open: the story waits for the choice', () => {
    renderChoice();
    expect(document.documentElement.style.overflow).toBe('hidden');
  });

  test('choosing plays or reads; Escape means "Read at my pace"', () => {
    const first = renderChoice();
    fireEvent.click(screen.getByRole('button', { name: 'Play the story' }));
    expect(first.onChoose).toHaveBeenCalledWith('play');
    cleanup();
    const second = renderChoice();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(second.onChoose).toHaveBeenCalledWith('read');
  });

  test('Tab stays on the two choices, and the focus goes back where it was when it closes', () => {
    const { unmount, before } = renderChoice();
    const play = screen.getByRole('button', { name: 'Play the story' });
    const read = screen.getByRole('button', { name: 'Read at my pace' });
    fireEvent.keyDown(play, { key: 'Tab' });
    expect(document.activeElement).toBe(read);
    fireEvent.keyDown(read, { key: 'Tab' });
    expect(document.activeElement).toBe(play);
    unmount();
    expect(document.activeElement).toBe(before);
    expect(document.documentElement.style.overflow).toBe('');
  });

  test('with full motion the pen writes the title and the modal leaves quickly once chosen', () => {
    stubMatchMedia();
    const { onChoose, container } = renderChoice();
    const letters = [...container.querySelectorAll<HTMLElement>('[data-choice="title"] *')].filter(element => element.children.length === 0);
    expect(letters.length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Read at my pace' }));
    expect(onChoose).not.toHaveBeenCalled();
    act(() => finish());
    expect(onChoose).toHaveBeenCalledWith('read');
  });

  test('reduced motion: it simply appears, and goes at once', () => {
    stubMatchMedia({ reducedMotion: true });
    const { onChoose, container } = renderChoice();
    expect(gsap.getTweensOf(container.querySelector('[data-choice="panel"]'))).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Play the story' }));
    expect(onChoose).toHaveBeenCalledWith('play');
  });
});

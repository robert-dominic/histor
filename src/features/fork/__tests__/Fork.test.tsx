// @vitest-environment jsdom
// The closing modal: the Mary Celeste's text from docs/content/mary-celeste-story.md, one button, no second way out.
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import Fork from '@/features/fork/Fork';
import { stubMatchMedia } from '@/test/match-media';

beforeEach(() => stubMatchMedia({ reducedMotion: true }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderFork(onClose = vi.fn()) {
  render(
    <MemoryRouter>
      <Fork fork={maryCeleste.fork} filesHref="/case/mary-celeste/files" open onClose={onClose} />
    </MemoryRouter>
  );
  return onClose;
}

describe('Fork: the closing modal', () => {
  test('shows the bold line and every line of the closing text', () => {
    renderFork();
    const dialog = screen.getByRole('dialog', { name: 'What next' });
    expect(within(dialog).getAllByText("The story ends here. The case doesn't.").length).toBeGreaterThan(0);
    for (const paragraph of maryCeleste.fork.body ?? []) {
      expect(dialog.textContent).toContain(paragraph.split('\n')[0]);
    }
  });

  test('has one button, "Open the case files", into the files', () => {
    renderFork();
    const dialog = screen.getByRole('dialog', { name: 'What next' });
    expect(within(dialog).queryAllByRole('button')).toHaveLength(0);
    const link = within(dialog).getByRole('link', { name: 'Open the case files' });
    expect(link.getAttribute('href')).toBe('/case/mary-celeste/files');
    expect(within(dialog).getAllByRole('link')).toHaveLength(1);
  });

  test('Escape closes it', () => {
    const onClose = renderFork();
    const dialog = screen.getByRole('dialog', { name: 'What next' });
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

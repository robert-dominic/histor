// @vitest-environment jsdom
// src/features/portals/__tests__/Portals.test.tsx
// A portal opens from its word on click and on Enter, shows the reference, and closes on Escape, returning focus.
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import PortalProvider from '@/features/portals/PortalProvider';
import PortalText from '@/features/portals/PortalText';
import { stubMatchMedia } from '@/test/match-media';
import type { Reference, Source } from '@/types/case';

/** Test data, not history. */
const references: Reference[] = [
  {
    id: 'captain',
    kind: 'person',
    label: 'Captain Test',
    profile: ['First paragraph of the profile.', 'Second paragraph, naming {{ref:port|the port}}.'],
    sources: ['src-linked', 'src-cited', 'src-missing'],
  },
  {
    id: 'port',
    kind: 'place',
    label: 'Test Port',
    profile: ['A port that does not exist.'],
    image: { src: '/port.webp', alt: 'Test alt for the port.', credit: 'Test credit for the port.', isIllustration: true },
  },
  { id: 'vessel', kind: 'ship', label: 'Test Vessel', profile: ['A ship.'] },
  { id: 'word', kind: 'term', label: 'test word', profile: ['A term.'] },
];

const sources: Source[] = [
  { id: 'src-linked', kind: 'secondary', title: 'A linked source', url: 'https://example.com/linked' },
  { id: 'src-cited', kind: 'official', title: 'A cited source', citation: 'Test archive, box 1' },
];

const TEXT =
  'Here {{ref:captain|the captain}} left {{ref:port|port}} aboard {{ref:vessel|her}}, a {{ref:word|word}} and {{ref:ghost|a ghost}}.';

function renderText(text = TEXT) {
  return render(
    <PortalProvider references={references} sources={sources}>
      <p data-testid="text">
        <PortalText text={text} />
      </p>
    </PortalProvider>
  );
}

const trigger = (label: string) => screen.getByRole('button', { name: label });

beforeEach(() => {
  stubMatchMedia();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('PortalText', () => {
  test('shows the text with every label in place of its markup', () => {
    renderText();

    expect(screen.getByTestId('text').textContent).toBe('Here the captain left port aboard her, a word and a ghost.');
  });

  test('turns every known reference into a button that is part of the text', () => {
    renderText();

    for (const label of ['the captain', 'port', 'her', 'word']) {
      const button = trigger(label);
      expect(button.tabIndex).toBe(0);
      expect(button.getAttribute('aria-haspopup')).toBe('dialog');
      expect(button.getAttribute('aria-expanded')).toBe('false');
      expect(button.className).toContain('decoration-brass');
      expect(button.className).toContain('decoration-dotted');
      expect(button.className).toContain('focus-visible:outline-brass');
    }
  });

  test('an unknown id falls back to plain text', () => {
    renderText();

    expect(screen.queryByRole('button', { name: 'a ghost' })).toBeNull();
    expect(screen.getByTestId('text').textContent).toContain('a ghost');
  });

  test('outside a provider every label is plain text', () => {
    render(
      <p data-testid="text">
        <PortalText text={TEXT} />
      </p>
    );

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByTestId('text').textContent).toBe('Here the captain left port aboard her, a word and a ghost.');
  });
});

describe('Portal card: opening', () => {
  test('no card is open at first', () => {
    renderText();

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('a click opens the card, named after the reference', () => {
    renderText();

    fireEvent.click(trigger('the captain'));

    expect(screen.getByRole('dialog', { name: 'Captain Test' })).toBeDefined();
    expect(trigger('the captain').getAttribute('aria-expanded')).toBe('true');
  });

  test('Enter opens the card', () => {
    renderText();

    fireEvent.keyDown(trigger('the captain'), { key: 'Enter' });

    expect(screen.getByRole('dialog', { name: 'Captain Test' })).toBeDefined();
  });

  test('Space opens the card too, without scrolling the page', () => {
    renderText();

    const notPrevented = fireEvent.keyDown(trigger('the captain'), { key: ' ' });

    expect(screen.getByRole('dialog', { name: 'Captain Test' })).toBeDefined();
    expect(notPrevented).toBe(false);
  });

  test('any other key does nothing', () => {
    renderText();

    fireEvent.keyDown(trigger('the captain'), { key: 'a' });

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('focus moves into the card', () => {
    renderText();

    fireEvent.click(trigger('the captain'));

    expect(document.activeElement).toBe(screen.getByRole('dialog'));
  });
});

describe('Portal card: contents', () => {
  test.each([
    ['the captain', 'Person'],
    ['port', 'Place'],
    ['her', 'Ship'],
    ['word', 'Term'],
  ])('"%s" shows its kind as "%s"', (label, kind) => {
    renderText();

    fireEvent.click(trigger(label));

    expect(screen.getByRole('dialog').querySelector('[data-portal="kind"]')?.textContent).toBe(kind);
  });

  test('shows the label in the legend face and every paragraph of the profile in the record face', () => {
    renderText();

    fireEvent.click(trigger('the captain'));

    const card = screen.getByRole('dialog');
    expect(within(card).getByRole('heading', { name: 'Captain Test' }).className).toContain('font-legend');
    const profile = card.querySelector('[data-portal="profile"]') as HTMLElement;
    expect(profile.className).toContain('font-record');
    expect([...profile.querySelectorAll('p')].map(paragraph => paragraph.textContent)).toEqual([
      'First paragraph of the profile.',
      'Second paragraph, naming the port.',
    ]);
  });

  test('a label inside a profile is plain text: a card does not open another card', () => {
    renderText();

    fireEvent.click(trigger('the captain'));

    expect(within(screen.getByRole('dialog')).queryByRole('button', { name: 'the port' })).toBeNull();
  });

  test('lists the sources by title: linked when there is a link, with the citation when there is not', () => {
    renderText();

    fireEvent.click(trigger('the captain'));

    const card = screen.getByRole('dialog');
    const list = card.querySelector('[data-portal="sources"]') as HTMLElement;
    // The id that is not in the case's sources is left out.
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    const link = within(list).getByRole('link', { name: 'A linked source' });
    expect(link.getAttribute('href')).toBe('https://example.com/linked');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noreferrer');
    expect(list.textContent).toContain('A cited source. Test archive, box 1');
    expect(within(list).getAllByRole('link')).toHaveLength(1);
  });

  test('a reference without sources has no Sources list', () => {
    renderText();

    fireEvent.click(trigger('port'));

    expect(screen.getByRole('dialog').querySelector('[data-portal="sources"]')).toBeNull();
    expect(within(screen.getByRole('dialog')).queryByText('Sources')).toBeNull();
  });

  test('shows the image with its alt text and credit, labelled "Illustration" when it is one', () => {
    renderText();

    fireEvent.click(trigger('port'));

    const card = screen.getByRole('dialog');
    expect(within(card).getByRole('img', { name: 'Test alt for the port.' }).getAttribute('src')).toBe('/port.webp');
    expect(card.querySelector('[data-portal="credit"]')?.textContent).toBe('Test credit for the port.');
    expect(within(card).getByText('Illustration')).toBeDefined();
  });

  test('a reference without an image has none', () => {
    renderText();

    fireEvent.click(trigger('the captain'));

    expect(within(screen.getByRole('dialog')).queryByRole('img')).toBeNull();
  });
});

describe('Portal card: closing', () => {
  test('Escape closes the card and returns the focus to the word', async () => {
    renderText();
    fireEvent.click(trigger('the captain'));

    fireEvent.keyDown(document.activeElement as Element, { key: 'Escape' });

    // Focus goes back at once; the card leaves after its short exit.
    expect(document.activeElement).toBe(trigger('the captain'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(trigger('the captain').getAttribute('aria-expanded')).toBe('false');
  });

  test('the close button closes the card and returns the focus', async () => {
    renderText();
    fireEvent.click(trigger('the captain'));

    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }));

    expect(document.activeElement).toBe(trigger('the captain'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  test('a tap outside the card closes it', async () => {
    renderText();
    fireEvent.click(trigger('the captain'));

    fireEvent.click(document.querySelector('[data-portal="backdrop"]') as Element);

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  test('a click inside the card does not close it', () => {
    renderText();
    fireEvent.click(trigger('the captain'));

    fireEvent.click(within(screen.getByRole('dialog')).getByRole('heading', { name: 'Captain Test' }));

    expect(screen.getByRole('dialog')).toBeDefined();
  });

  test('another portal can be opened after the first one has closed', async () => {
    renderText();
    fireEvent.click(trigger('the captain'));
    fireEvent.keyDown(document.activeElement as Element, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    fireEvent.click(trigger('port'));

    expect(screen.getByRole('dialog', { name: 'Test Port' })).toBeDefined();
  });

  test('without matchMedia the card closes at once', () => {
    vi.unstubAllGlobals();
    renderText();
    fireEvent.click(trigger('the captain'));

    fireEvent.keyDown(document.activeElement as Element, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger('the captain'));
  });
});

describe('Portal card: keyboard', () => {
  test('Tab from the last stop goes to the first, so the focus stays inside the card', () => {
    renderText();
    fireEvent.click(trigger('the captain'));
    const card = screen.getByRole('dialog');
    const close = within(card).getByRole('button', { name: 'Close' });
    const link = within(card).getByRole('link', { name: 'A linked source' });

    link.focus();
    const notPrevented = fireEvent.keyDown(link, { key: 'Tab' });

    expect(notPrevented).toBe(false);
    expect(document.activeElement).toBe(close);
  });

  test('Shift+Tab from the first stop goes to the last', () => {
    renderText();
    fireEvent.click(trigger('the captain'));
    const card = screen.getByRole('dialog');
    const close = within(card).getByRole('button', { name: 'Close' });

    close.focus();
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });

    expect(document.activeElement).toBe(within(card).getByRole('link', { name: 'A linked source' }));
  });
});

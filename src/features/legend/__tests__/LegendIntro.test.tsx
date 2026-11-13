// @vitest-environment jsdom
// src/features/legend/__tests__/LegendIntro.test.tsx
// The legend intro renders everything from its data, Skip jumps to the end state, and Continue calls onDone.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import LegendIntro from '@/features/legend/LegendIntro';
import { stubMatchMedia } from '@/test/match-media';
import type { LegendIntro as LegendIntroData } from '@/types/case';

/** Test data, not history. */
const legendIntro: LegendIntroData = {
  lines: ['First line of the myth.', 'Second line.', 'Third and last line.'],
  stamp: 'Test stamp',
  debunk: 'Well... no. This is the second sentence. And a third.',
};

const video = { src: '/test-video.mp4', poster: '/test-poster.webp' };

function renderIntro(props: Partial<Parameters<typeof LegendIntro>[0]> = {}) {
  const onDone = vi.fn();
  const view = render(<LegendIntro legendIntro={legendIntro} onDone={onDone} {...props} />);
  return { ...view, onDone };
}

const opacityOf = (element: Element | null) => (element as HTMLElement).style.opacity;
const lineElements = (container: HTMLElement) => [...container.querySelectorAll('[data-legend="line"]')];

beforeEach(() => {
  stubMatchMedia();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('LegendIntro: content', () => {
  test('renders every line of the myth as real text, in order', () => {
    const { container } = renderIntro();

    expect(lineElements(container).map(line => line.textContent)).toEqual(legendIntro.lines);
  });

  test('renders the stamp text as stored (CSS makes it uppercase)', () => {
    const { container } = renderIntro();

    const stamp = container.querySelector('[data-legend="stamp"]') as HTMLElement;
    expect(stamp.textContent).toBe('Test stamp');
    expect(stamp.className).toContain('uppercase');
  });

  test('renders the whole debunk', () => {
    const { container } = renderIntro();

    const voice = container.querySelector('[data-legend="voice"]') as HTMLElement;
    const paragraph = voice.parentElement as HTMLElement;
    expect(paragraph.textContent).toBe(legendIntro.debunk);
  });

  test('gives the first sentence of the debunk its own element, and an ellipsis does not end it', () => {
    const { container } = renderIntro();

    expect(container.querySelector('[data-legend="voice"]')?.textContent).toBe('Well... no.');
    expect(container.querySelector('[data-legend="rest"]')?.textContent?.trim()).toBe(
      'This is the second sentence. And a third.'
    );
  });

  test('a debunk of one sentence is rendered whole, with nothing after it', () => {
    const { container } = renderIntro({ legendIntro: { ...legendIntro, debunk: 'Only one sentence here.' } });

    expect(container.querySelector('[data-legend="voice"]')?.textContent).toBe('Only one sentence here.');
    expect(container.querySelector('[data-legend="rest"]')).toBeNull();
  });
});

describe('LegendIntro: the sequence', () => {
  test('starts with the myth, the stamp, the debunk and Continue all hidden', () => {
    const { container } = renderIntro();

    for (const line of lineElements(container)) {
      expect(opacityOf(line)).toBe('0');
    }
    expect(opacityOf(container.querySelector('[data-legend="stamp"]'))).toBe('0');
    expect(opacityOf(container.querySelector('[data-legend="voice"]'))).toBe('0');
    expect(opacityOf(container.querySelector('[data-legend="rest"]'))).toBe('0');
    const next = container.querySelector('[data-legend="continue"]') as HTMLElement;
    expect(next.style.visibility).toBe('hidden');
  });

  test('Skip is there from the first frame', () => {
    renderIntro();

    expect(screen.getByRole('button', { name: 'Skip' })).toBeDefined();
  });

  test('Skip shows the end state: every line, the stamp, the debunk and Continue', () => {
    const { container } = renderIntro();

    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));

    for (const line of lineElements(container)) {
      expect(opacityOf(line)).toBe('1');
    }
    expect(opacityOf(container.querySelector('[data-legend="stamp"]'))).toBe('1');
    expect(opacityOf(container.querySelector('[data-legend="voice"]'))).toBe('1');
    expect(opacityOf(container.querySelector('[data-legend="rest"]'))).toBe('1');
    const next = container.querySelector('[data-legend="continue"]') as HTMLElement;
    expect(next.style.visibility).not.toBe('hidden');
    expect(next.style.opacity).toBe('1');
  });

  test('in the end state the myth is dimmed behind the stamp, but still there', () => {
    const { container } = renderIntro();

    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));

    expect(opacityOf(container.querySelector('[data-legend="myth"]'))).toBe('0.4');
    expect(lineElements(container).map(line => line.textContent)).toEqual(legendIntro.lines);
  });

  test('Skip does not end the intro: onDone is not called', () => {
    const { onDone } = renderIntro();

    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));

    expect(onDone).not.toHaveBeenCalled();
  });

  test('Skip goes away once the end state is shown, and focus moves to Continue', () => {
    renderIntro();
    const skip = screen.getByRole('button', { name: 'Skip' });
    skip.focus();

    fireEvent.click(skip);

    expect(screen.queryByRole('button', { name: 'Skip' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Continue' }));
  });

  test('Continue calls onDone', () => {
    const { onDone } = renderIntro();
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  test('Skip and Continue are real buttons, so Tab and Enter work', () => {
    renderIntro();

    const skip = screen.getByRole('button', { name: 'Skip' });
    expect(skip.tagName).toBe('BUTTON');
    expect(skip.getAttribute('tabindex')).toBeNull();
    fireEvent.click(skip);
    const next = screen.getByRole('button', { name: 'Continue' });
    expect(next.tagName).toBe('BUTTON');
    expect(next.getAttribute('tabindex')).toBeNull();
  });
});

describe('LegendIntro: onEnded', () => {
  test('is called once when Skip reaches the end state, and not again by Continue', () => {
    const onEnded = vi.fn();
    renderIntro({ onEnded });
    expect(onEnded).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(onEnded).toHaveBeenCalledTimes(1);
  });
});

describe('LegendIntro: a returning visitor (startAtEnd)', () => {
  test('opens at the end state: every line, the stamp, the debunk and Continue are shown at once', () => {
    const { container } = renderIntro({ startAtEnd: true });

    for (const line of lineElements(container)) {
      expect(opacityOf(line)).toBe('1');
    }
    expect(opacityOf(container.querySelector('[data-legend="myth"]'))).toBe('0.4');
    expect(opacityOf(container.querySelector('[data-legend="stamp"]'))).toBe('1');
    expect(opacityOf(container.querySelector('[data-legend="voice"]'))).toBe('1');
    expect(opacityOf(container.querySelector('[data-legend="rest"]'))).toBe('1');
    expect((container.querySelector('[data-legend="continue"]') as HTMLElement).style.visibility).not.toBe('hidden');
  });

  test('has no Skip, and Continue has the focus', () => {
    renderIntro({ startAtEnd: true });

    expect(screen.queryByRole('button', { name: 'Skip' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Continue' }));
  });

  test('does not call onEnded again, and Continue still calls onDone', () => {
    const onEnded = vi.fn();
    const { onDone } = renderIntro({ startAtEnd: true, onEnded });

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(onEnded).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  test('a first-time visitor does not get focus moved to Continue', () => {
    renderIntro();

    expect(document.activeElement).toBe(document.body);
  });
});

describe('LegendIntro: video', () => {
  test('plays the video muted, looping and inline, with the poster, hidden from screen readers', () => {
    const { container } = renderIntro({ video });

    const element = container.querySelector('video') as HTMLVideoElement;
    expect(element.getAttribute('src')).toBe(video.src);
    expect(element.getAttribute('poster')).toBe(video.poster);
    expect(element.muted).toBe(true);
    expect(element.autoplay).toBe(true);
    expect(element.loop).toBe(true);
    expect(element.playsInline).toBe(true);
    expect(element.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  test('labels the video "Illustration"', () => {
    renderIntro({ video });

    expect(screen.getByText('Illustration')).toBeDefined();
  });

  test('without a video there is no video element and no "Illustration" label', () => {
    const { container } = renderIntro();

    expect(container.querySelector('video')).toBeNull();
    expect(screen.queryByText('Illustration')).toBeNull();
  });
});

describe('LegendIntro: reduced motion', () => {
  beforeEach(() => {
    stubMatchMedia({ reducedMotion: true });
  });

  test('shows the poster image instead of the video, still labelled "Illustration"', () => {
    const { container } = renderIntro({ video });

    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('img')?.getAttribute('src')).toBe(video.poster);
    expect(screen.getByText('Illustration')).toBeDefined();
  });

  test('fades only: nothing is moved, scaled or blurred', () => {
    const { container } = renderIntro();

    for (const element of container.querySelectorAll<HTMLElement>('[data-legend]')) {
      expect(element.style.transform).toBe('');
      expect(element.style.filter).toBe('');
    }
    expect(opacityOf(lineElements(container)[0])).toBe('0');
  });

  test('Skip and Continue work the same way', () => {
    const { container, onDone } = renderIntro();

    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(opacityOf(container.querySelector('[data-legend="stamp"]'))).toBe('1');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

describe('LegendIntro: without matchMedia', () => {
  test('shows everything at once when the browser cannot report a motion preference', () => {
    vi.stubGlobal('matchMedia', undefined);
    const { container, onDone } = renderIntro();

    expect(opacityOf(lineElements(container)[0])).toBe('');
    expect(screen.queryByRole('button', { name: 'Skip' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

// @vitest-environment jsdom
// src/features/story/__tests__/PageFit.test.tsx
// A long chapter's page fits the screen by widening its panel (polish brief, A1). jsdom lays nothing out, so the
// layout is faked: the page's height falls as `--page-widen` grows.
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { useHeadingFit } from '@/features/story/use-heading-fit';

function Page({ fitHeight }: { fitHeight: boolean }) {
  const { headingRef, headingTextRef, boxRef, panelRef, widenRef } = useHeadingFit({ fitHeight });
  return (
    <article ref={widenRef} data-testid="scene">
      <div ref={panelRef} data-testid="panel">
        <div ref={boxRef} data-testid="box">
          <h2 ref={headingRef}>
            <span ref={headingTextRef}>Heading</span>
          </h2>
        </div>
      </div>
    </article>
  );
}

/** A screen `width` wide, a panel `room` tall, and a page `tall` px tall at its design width (1px less per px wider). */
function fakeLayout({ width, room, tall, laptop = true }: { width: number; room: number; tall: number; laptop?: boolean }) {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: laptop && query.includes('min-width: 1024px'), media: query, addEventListener: () => {}, removeEventListener: () => {} }));
  const widenOf = (element: Element) => parseFloat((element.closest('[data-testid="scene"]') as HTMLElement).style.getPropertyValue('--page-widen') || '0');
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
    return this.dataset.testid === 'scene' ? width : 400;
  });
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (this: HTMLElement) {
    return this.dataset.testid === 'panel' ? room : 0;
  });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const height = this.dataset.testid === 'box' ? tall - widenOf(this) : 0;
    // The heading's text is narrow: it always fits.
    return { width: 100, height, top: 0, left: 0, right: 100, bottom: height, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('a long page widens its panel to fit the screen', () => {
  test('a short page keeps today’s width', () => {
    fakeLayout({ width: 1440, room: 800, tall: 700 });
    const { getByTestId } = render(<Page fitHeight />);
    expect(getByTestId('scene').style.getPropertyValue('--page-widen')).toBe('');
  });

  test('a long page widens just enough, and the text size is untouched', () => {
    fakeLayout({ width: 1440, room: 800, tall: 900 });
    const { getByTestId, container } = render(<Page fitHeight />);
    const widen = parseFloat(getByTestId('scene').style.getPropertyValue('--page-widen'));
    expect(widen).toBeGreaterThanOrEqual(100);
    expect(widen).toBeLessThan(110);
    expect(container.querySelector('h2')!.style.fontSize).toBe('');
  });

  test('never past about 58% of the screen', () => {
    fakeLayout({ width: 1440, room: 300, tall: 2000 });
    const { getByTestId } = render(<Page fitHeight />);
    expect(parseFloat(getByTestId('scene').style.getPropertyValue('--page-widen'))).toBe(Math.round(1440 * 0.16));
  });

  test('on a phone, and in the stacked story, the panel is left alone', () => {
    fakeLayout({ width: 375, room: 300, tall: 2000, laptop: false });
    expect(render(<Page fitHeight />).getByTestId('scene').style.getPropertyValue('--page-widen')).toBe('');
    fakeLayout({ width: 1440, room: 300, tall: 2000 });
    expect(render(<Page fitHeight={false} />).getAllByTestId('scene')[1].style.getPropertyValue('--page-widen')).toBe('');
  });

  test('measured again on resize', () => {
    fakeLayout({ width: 1440, room: 800, tall: 700 });
    const { getByTestId } = render(<Page fitHeight />);
    fakeLayout({ width: 1440, room: 600, tall: 700 });
    window.dispatchEvent(new Event('resize'));
    expect(parseFloat(getByTestId('scene').style.getPropertyValue('--page-widen'))).toBeGreaterThanOrEqual(100);
  });
});

// src/features/story/VoyageChart.tsx
// The voyage on an old chart: paper lines on night, a faint grid, the coasts, and the route.
// Live (the cinematic story): a small inset in the bottom-right corner. Story.tsx draws the route and moves the
// ship as the reader scrolls, by the `data-chart` attributes; nothing here is animated through React state.
// Tapping it opens a larger view with labels; tapping again, the backdrop or Escape closes it.
// Still (reduced motion): drawn as far as a chapter, inline in that chapter's text, with labels.

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import {
  CHART_HEIGHT,
  CHART_WIDTH,
  COAST_PATHS,
  GRID,
  routeUpTo,
  type ChartPoint,
  type ChartRoute,
} from '@/lib/voyage-chart';

interface VoyageChartProps {
  route: ChartRoute;
  variant: 'live' | 'still';
  /** Still only: draw the route as it stands at the end of this chapter. */
  upTo?: number;
  /** Live only: called when the larger view opens. */
  onExpand?: () => void;
}

const POINT_FILL: Record<ChartPoint['kind'], string> = {
  port: 'var(--color-brass)',
  record: 'var(--color-night-ink)',
  found: 'var(--color-rust-night)',
};

export default function VoyageChart({ route, variant, upTo = 0, onExpand }: VoyageChartProps) {
  const [expanded, setExpanded] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const maskId = useId().replace(/:/g, '');
  const listId = useId();
  const live = variant === 'live';
  const still = routeUpTo(route, upTo);
  const start = route.points.find(point => point.unreached !== true);

  // Escape closes the larger view, wherever the focus is.
  useEffect(() => {
    if (!expanded) {
      return;
    }
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setExpanded(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    buttonRef.current?.focus({ preventScroll: true });
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [expanded]);

  if (route.segments.length === 0 && route.points.length === 0) {
    return null;
  }

  const toggle = () => {
    setExpanded(value => {
      if (!value) {
        onExpand?.();
      }
      return !value;
    });
  };

  // The larger view is a dialog: the focus stays on its one control.
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (expanded && event.key === 'Tab') {
      event.preventDefault();
      buttonRef.current?.focus();
    }
  };

  const isDrawn = (index: number) => !live && still.drawn.includes(route.segments[index]);
  const isShown = (point: ChartPoint) =>
    point.unreached === true || point === start || (!live && still.drawn.some(segment => segment.to === point));
  const ship = live ? start : still.ship;
  const showLabels = !live || expanded;

  const chart = (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      className="block h-auto w-full"
      data-chart="svg"
    >
      <rect width={CHART_WIDTH} height={CHART_HEIGHT} fill="var(--color-night)" />
      <g stroke="var(--color-paper)" strokeOpacity="0.12" strokeWidth="0.5" vectorEffect="non-scaling-stroke">
        {GRID.meridians.map(x => (
          <line key={`m${x}`} x1={x} x2={x} y1={0} y2={CHART_HEIGHT} vectorEffect="non-scaling-stroke" />
        ))}
        {GRID.parallels.map(y => (
          <line key={`p${y}`} x1={0} x2={CHART_WIDTH} y1={y} y2={y} vectorEffect="non-scaling-stroke" />
        ))}
      </g>
      <g fill="var(--color-paper)" fillOpacity="0.07" stroke="var(--color-paper)" strokeOpacity="0.55" strokeWidth="0.8">
        {COAST_PATHS.map((d, index) => (
          <path key={index} d={d} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        ))}
      </g>

      <defs>
        {route.segments.map((segment, index) => (
          <mask key={index} id={`${maskId}-${index}`} maskUnits="userSpaceOnUse">
            {/* Revealed from 1 (hidden) to 0 (drawn): the route draws itself. */}
            <path
              data-chart="reveal"
              data-index={index}
              d={segment.d}
              pathLength={1}
              stroke="white"
              strokeWidth="8"
              strokeDasharray="1 1"
              strokeDashoffset={isDrawn(index) ? 0 : 1}
              fill="none"
            />
          </mask>
        ))}
      </defs>
      {route.segments.map((segment, index) => (
        <path
          key={index}
          data-chart="segment"
          data-ghostly={segment.ghostly}
          d={segment.d}
          mask={`url(#${maskId}-${index})`}
          fill="none"
          stroke={segment.ghostly ? 'var(--color-ghost-night)' : 'var(--color-paper)'}
          strokeOpacity={segment.ghostly ? 0.75 : 0.95}
          strokeWidth={segment.ghostly ? 1.2 : 1.5}
          strokeDasharray={segment.ghostly ? '3 4' : undefined}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {route.unreached.map(point => (
        <circle
          key={point.id}
          data-chart="point"
          data-id={point.id}
          data-unreached="true"
          cx={point.x}
          cy={point.y}
          r={3.4}
          fill="none"
          stroke="var(--color-paper)"
          strokeOpacity="0.5"
          strokeWidth="1"
          strokeDasharray="1.5 2"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {route.points
        .filter(point => point.unreached !== true)
        .map(point => (
          <circle
            key={point.id}
            data-chart="point"
            data-id={point.id}
            cx={point.x}
            cy={point.y}
            r={point.kind === 'record' ? 2 : 2.8}
            fill={POINT_FILL[point.kind]}
            style={{ opacity: isShown(point) ? 1 : 0 }}
          />
        ))}

      {showLabels &&
        route.points.map(point => (
          <text
            key={point.id}
            data-chart="label"
            x={point.x + 5}
            y={point.y + (point.kind === 'record' && point.id !== route.points[1]?.id ? 9 : -5)}
            fontFamily="var(--font-voice)"
            fontSize="7"
            fill={point.unreached ? 'var(--color-ghost-night)' : 'var(--color-night-ink)'}
            fillOpacity={point.unreached ? 0.8 : 1}
          >
            {point.label}
          </text>
        ))}

      {ship !== undefined && (
        <g data-chart="ship" transform={`translate(${ship.x} ${ship.y})`}>
          {/* A small hull and sail, sitting on the point. */}
          <path d="M-4 0.5h8l-1.6 2.2h-4.8Z" fill="var(--color-brass)" />
          <path d="M0 0.2V-6l3.2 5.6Z" fill="var(--color-night-ink)" />
        </g>
      )}
    </svg>
  );

  const description = (
    <ul id={listId} className="sr-only">
      {route.points
        .filter(point => point.unreached !== true)
        .map(point => (
          <li key={point.id}>{point.label}</li>
        ))}
      {route.unreached.map(point => (
        <li key={point.id}>{point.label}</li>
      ))}
    </ul>
  );

  if (!live) {
    return (
      <figure data-chart="frame" data-variant="still" className="mt-8 w-full max-w-[26rem] overflow-hidden rounded-sm border border-paper/25">
        {chart}
        <figcaption className="sr-only">Chart of the voyage</figcaption>
        {description}
      </figure>
    );
  }

  return (
    <>
      {expanded && (
        <div aria-hidden="true" data-chart="backdrop" onClick={() => setExpanded(false)} className="fixed inset-0 z-[44] bg-night/80" />
      )}
      <div
        data-chart="frame"
        data-variant="live"
        data-expanded={expanded}
        data-visible="false"
        role={expanded ? 'dialog' : undefined}
        aria-modal={expanded ? true : undefined}
        aria-label={expanded ? 'Chart of the voyage' : undefined}
        onKeyDown={handleKeyDown}
        className={
          expanded
            ? 'fixed top-1/2 left-1/2 z-[45] w-[min(92vw,47.5rem)] -translate-x-1/2 -translate-y-1/2'
            : 'fixed right-3 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 w-[110px] transition-[opacity,visibility] duration-300 ease-out data-[visible=false]:invisible data-[visible=false]:opacity-0 sm:right-5 sm:bottom-6 sm:w-[160px]'
        }
      >
        <button
          ref={buttonRef}
          type="button"
          aria-label={expanded ? 'Close the chart' : 'Chart of the voyage'}
          aria-expanded={expanded}
          aria-describedby={listId}
          onClick={toggle}
          className="block w-full overflow-hidden rounded-sm border border-paper/30 shadow-lg shadow-black/50 transition-[scale] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass active:scale-[0.97]"
        >
          {chart}
        </button>
        {description}
      </div>
    </>
  );
}

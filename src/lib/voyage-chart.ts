// src/lib/voyage-chart.ts
// Geometry for the story's voyage chart: an old-chart projection of the North Atlantic, the coastlines,
// a latitude and longitude grid, and the route through a case's voyage points. Pure: no DOM.

import { COASTLINE } from '@/lib/chart-coastline';
import type { StorySection, Voyage, VoyagePoint } from '@/types/case';

/** The part of the world the chart shows, in degrees. */
export const CHART_VIEW = { west: -82, east: 16, south: 24, north: 54 } as const;

/** Units per degree of latitude, in the chart's viewBox. */
const SCALE = 4;
/** Longitude is narrowed by the cosine of the middle latitude, so the North Atlantic is not stretched sideways. */
const LON_FACTOR = Math.cos((((CHART_VIEW.south + CHART_VIEW.north) / 2) * Math.PI) / 180);

export const CHART_WIDTH = Math.round((CHART_VIEW.east - CHART_VIEW.west) * LON_FACTOR * SCALE);
export const CHART_HEIGHT = (CHART_VIEW.north - CHART_VIEW.south) * SCALE;

/** A position on the chart, in viewBox units, from degrees (east and north positive). */
export function project(lon: number, lat: number): { x: number; y: number } {
  return {
    x: Math.round((lon - CHART_VIEW.west) * LON_FACTOR * SCALE * 10) / 10,
    y: Math.round((CHART_VIEW.north - lat) * SCALE * 10) / 10,
  };
}

/** The coastlines as SVG path data, one closed ring each. Built once. */
export const COAST_PATHS: readonly string[] = COASTLINE.map(ring => {
  const points = ring.split(' ').map(pair => {
    const [lon, lat] = pair.split(',').map(Number);
    return project(lon, lat);
  });
  return `M${points.map(point => `${point.x} ${point.y}`).join('L')}Z`;
});

/** Faint grid lines every 10 degrees. */
export const GRID = {
  meridians: [-80, -70, -60, -50, -40, -30, -20, -10, 0, 10].map(lon => project(lon, CHART_VIEW.north).x),
  parallels: [30, 40, 50].map(lat => project(CHART_VIEW.west, lat).y),
};

export interface ChartPoint extends VoyagePoint {
  x: number;
  y: number;
  /** The chapter's place in the story, from 0. */
  chapterIndex: number;
}

export interface ChartSegment {
  /** The point the segment starts from. */
  from: ChartPoint;
  /** The point the segment ends at. */
  to: ChartPoint;
  /** SVG path data, from the previous reached point to `to`. */
  d: string;
  /** True for the stretch she sailed alone: the segment that ends where she was found. */
  ghostly: boolean;
  /** Within its chapter: this is segment `slot` of `slots` drawn there, from 0. */
  slot: number;
  slots: number;
}

export interface ChartRoute {
  points: ChartPoint[];
  /** The reached points' route, in order. The first reached point is where she set out. */
  segments: ChartSegment[];
  /** Destinations she never reached. */
  unreached: ChartPoint[];
}

/** The route through a voyage. Points whose chapter is not in the story are left out. */
export function buildRoute(voyage: Voyage | undefined, story: StorySection[]): ChartRoute {
  const chapterIndex = new Map(story.map((section, index) => [section.id, index]));
  const points: ChartPoint[] = (voyage?.points ?? []).flatMap(point => {
    const index = chapterIndex.get(point.chapter);
    return index === undefined ? [] : [{ ...point, ...project(point.lon, point.lat), chapterIndex: index }];
  });
  const reached = points.filter(point => point.unreached !== true);

  const segments: ChartSegment[] = reached.slice(1).map((to, index) => {
    const from = reached[index];
    return { from, to, d: `M${from.x} ${from.y}L${to.x} ${to.y}`, ghostly: to.kind === 'found', slot: 0, slots: 1 };
  });
  // Segments that end in the same chapter share its time, one after another.
  const byChapter = new Map<number, ChartSegment[]>();
  for (const segment of segments) {
    const list = byChapter.get(segment.to.chapterIndex) ?? [];
    list.push(segment);
    byChapter.set(segment.to.chapterIndex, list);
  }
  for (const list of byChapter.values()) {
    list.forEach((segment, slot) => {
      segment.slot = slot;
      segment.slots = list.length;
    });
  }

  return { points, segments, unreached: points.filter(point => point.unreached === true) };
}

/**
 * The chart as it stands at the end of chapter `index`: the segments drawn so far, and where the ship is.
 * Used where the chart is shown still (reduced motion).
 */
export function routeUpTo(route: ChartRoute, index: number): { drawn: ChartSegment[]; ship: ChartPoint | undefined } {
  const drawn = route.segments.filter(segment => segment.to.chapterIndex <= index);
  const start = route.points.find(point => point.unreached !== true);
  return { drawn, ship: drawn.length > 0 ? drawn[drawn.length - 1].to : start };
}

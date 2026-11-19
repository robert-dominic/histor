// src/lib/__tests__/voyage-chart.test.ts
import { describe, expect, test } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import { CHART_HEIGHT, CHART_WIDTH, COAST_PATHS, buildRoute, project, routeUpTo } from '@/lib/voyage-chart';

const route = buildRoute(maryCeleste.voyage, maryCeleste.story);

describe('voyage chart', () => {
  test('west is left, north is up, and the route lies inside the chart', () => {
    expect(project(-74, 40).x).toBeLessThan(project(-5, 36).x);
    expect(project(-20, 44).y).toBeLessThan(project(-20, 36).y);
    for (const point of route.points) {
      expect(point.x).toBeGreaterThan(0);
      expect(point.x).toBeLessThan(CHART_WIDTH);
      expect(point.y).toBeGreaterThan(0);
      expect(point.y).toBeLessThan(CHART_HEIGHT);
    }
  });

  test('the coastline data is small and every ring is a closed path', () => {
    expect(COAST_PATHS.length).toBeGreaterThan(5);
    expect(COAST_PATHS.join('').length).toBeLessThan(30_000);
    expect(COAST_PATHS.every(path => path.startsWith('M') && path.endsWith('Z'))).toBe(true);
  });

  test('the route runs New York, last log, slate, found, Gibraltar; Genoa is never reached', () => {
    expect(route.segments.map(segment => segment.to.id)).toEqual(['last-log', 'last-slate', 'found', 'gibraltar']);
    expect(route.unreached.map(point => point.id)).toEqual(['genoa']);
  });

  test('only the stretch that ends where she was found is ghostly', () => {
    expect(route.segments.map(segment => segment.ghostly)).toEqual([false, false, true, false]);
  });

  test('the two points of chapter 2 share its time, one after the other', () => {
    const chapterTwo = route.segments.filter(segment => segment.to.chapterIndex === 1);
    expect(chapterTwo.map(segment => [segment.slot, segment.slots])).toEqual([
      [0, 2],
      [1, 2],
    ]);
  });

  test('at the end of each chapter, the ship is at the last point reached', () => {
    expect(routeUpTo(route, 0).ship?.id).toBe('new-york');
    expect(routeUpTo(route, 1).ship?.id).toBe('last-slate');
    expect(routeUpTo(route, 2).ship?.id).toBe('found');
    expect(routeUpTo(route, 4).ship?.id).toBe('gibraltar');
    expect(routeUpTo(route, 4).drawn).toHaveLength(4);
  });

  test('no voyage, no route', () => {
    expect(buildRoute(undefined, maryCeleste.story)).toEqual({ points: [], segments: [], unreached: [] });
  });
});

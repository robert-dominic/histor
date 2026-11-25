// src/app/ScrollToTop.tsx
// Every page starts at the top (quick fixes, 2): the browser's own scroll restoration is off for the whole app, and
// changing page (the report, the verdict, the credits, the sources, the desk) puts it at its top at once. Not:
// the story (`/case/:id`, which keeps its own step position logic), a link to an anchor (the credits' #case), or
// opening and closing a file on the desk (the same page, the file shown over it).
import { useEffect, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { pageOf } from '@/lib/page-of';
import { jumpToY } from '@/lib/smooth-scroll';

export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const page = pageOf(pathname);
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);
  useLayoutEffect(() => {
    if (page === null || hash !== '') {
      return;
    }
    jumpToY(0);
  }, [page, hash]);
  return null;
}

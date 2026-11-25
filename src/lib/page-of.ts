// src/lib/page-of.ts
// Which page a path is, for starting each page at its top (quick fixes, 2). A file on the desk is the desk; the story
// (`/case/:id`) is null: it keeps its own position.
export function pageOf(pathname: string): string | null {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (/^\/case\/[^/]+$/.test(path)) {
    return null;
  }
  return path.replace(/^(\/case\/[^/]+\/files)\/.+$/, '$1');
}

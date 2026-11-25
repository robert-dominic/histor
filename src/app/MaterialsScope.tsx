// src/app/MaterialsScope.tsx
// A case's materials (dread pass, 1; CaseTheme.materials), written to the page's root while the case is open:
// `data-material-board` and `data-material-stains` on <html>, so the desk, an open file over it and the portals all
// take the case's textures from effects.css. Gone when the case is left.
import { useEffect, type ReactNode } from 'react';
import type { CaseMaterials } from '@/types/case';

export default function MaterialsScope({ materials, children }: { materials?: CaseMaterials; children: ReactNode }) {
  const board = materials?.board;
  const stains = materials?.stains;
  useEffect(() => {
    const html = document.documentElement;
    if (board !== undefined) {
      html.dataset.materialBoard = board;
    }
    if (stains !== undefined) {
      html.dataset.materialStains = stains;
    }
    return () => {
      delete html.dataset.materialBoard;
      delete html.dataset.materialStains;
    };
  }, [board, stains]);
  return <>{children}</>;
}

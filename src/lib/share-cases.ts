// src/lib/share-cases.ts
// What the shared certificate's image (/api/og) needs to know about each open case, without loading the case: its
// title and years as the case gives them, and its theories' titles and whether historians ruled each out (quick
// fixes, 5). Copied from the case data; a test (share-cases.test.ts) keeps it the same as the registry. Imported by the
// edge function: no '@/' imports here.

export interface ShareCase {
  title: string;
  years: string;
  theories: Record<string, { title: string; rejected: boolean }>;
}

export const SHARE_CASES: Record<string, ShareCase> = {
  'mary-celeste': {
    title: 'The Mary Celeste',
    years: '1872 – 1873',
    theories: {
      't-sinking': { title: 'She was sinking', rejected: false },
      't-explosion': { title: 'Fear of explosion', rejected: false },
      't-mutiny': { title: 'Drunken mutiny', rejected: true },
      't-salvage-murder': { title: 'Murder for salvage', rejected: true },
      't-fraud': { title: 'Insurance fraud', rejected: true },
    },
  },
};

// src/lib/footer-links.ts
// What the site's footer says and links to (review-fixes brief, 9; src/components/SiteFooter.tsx).
export const FOOTER = {
  tagline: 'Legend or history? You decide.',
  repository: 'https://github.com/robert-dominic/histor',
  kiro: 'https://kiro.dev',
  year: 2026,
  /** What Histor is, in one line: the footer's description. */
  about: 'Histor separates what really happened from what was added later.',
  /** The vertical line beside the giant wordmark. */
  vertical: 'Legend or history',
  description: 'An interactive archive of real historical mysteries. Legend or history? You decide.',
} as const;

/** Where "Robert" in "Designed and built by Robert" links to: the current Vercel site for now; change it here. */
export const DESIGNER_URL = 'https://histor-vestigia.vercel.app/';

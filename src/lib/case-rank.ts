// src/lib/case-rank.ts
// The verdict's reveal and the player's rank (investigation brief, 3.1 and 3.2), worked out only from the case
// report (buildCaseReport, which stays as it is). Pure: the same report always gives the same answer.
// The report mirrors the player's reasoning and never grades it; the rank is a playful title at the very end.
import type { CaseReport } from '@/lib/case-report';
import { RANK_COPY, REVEAL_COPY } from '@/lib/ui-copy';

export type CaseRank = keyof typeof RANK_COPY;

/** How many legends the player trusted: legends they opened and pinned to a theory as support. */
export function legendsTrustedCount(report: CaseReport): number {
  return report.legendsTrusted.length;
}

/**
 * The player's rank.
 * - Historian: no legends trusted, and a leading theory chosen.
 * - Investigator: at most one legend trusted, or a leading theory chosen.
 * - Deckhand: anything else.
 */
export function caseRank(report: CaseReport): CaseRank {
  const legends = legendsTrustedCount(report);
  const leading = report.verdict?.standing === 'leading';
  if (legends === 0 && leading) {
    return 'historian';
  }
  if (legends <= 1 || leading) {
    return 'investigator';
  }
  return 'deckhand';
}

export interface VerdictComparison {
  /** How the player's choice stands with the historians. */
  kind: 'with' | 'ruled-out' | 'considered' | 'none';
  /** The line the app types. */
  line: string;
  /** The standing reason that follows it, for a theory that is not a leading one. */
  reason?: string;
}

/** The theories most historians lean toward, in the case's order. */
export function leadingTheories(report: CaseReport): { theoryId: string; title: string }[] {
  return report.historiansStand.theories
    .filter(theory => theory.standing === 'leading')
    .map(({ theoryId, title }) => ({ theoryId, title }));
}

/** The one line that compares the leading theories with the player's choice. */
export function verdictComparison(report: CaseReport): VerdictComparison {
  const verdict = report.verdict;
  if (verdict === null) {
    return { kind: 'none', line: '' };
  }
  switch (verdict.standing) {
    case 'leading':
      return { kind: 'with', line: REVEAL_COPY.withHistorians };
    case 'rejected':
      return { kind: 'ruled-out', line: REVEAL_COPY.ruledOut, reason: verdict.standingReason };
    default:
      return { kind: 'considered', line: REVEAL_COPY.considered, reason: verdict.standingReason };
  }
}

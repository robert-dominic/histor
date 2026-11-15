// src/lib/case-report.ts
// The case report (product.md, step 6): built from the case and the user's investigation, as plain data.
// It mirrors the user's reasoning. It never scores, grades or marks anything right or wrong.
// Spec: .kiro/specs/case-report.

import type {
  Case,
  Evidence,
  EvidenceStatus,
  InvestigationState,
  PinTarget,
  Theory,
  TheoryStanding,
} from '@/types/case';

/** How historians read a pinned file against the user's choice (Requirement 2). */
export type HistoriansReading = 'agree' | 'disagree' | 'no-link';

/** How an unopened file bears on the chosen theory (Requirement 5). */
export type VerdictLink = 'supports' | 'weakens';

export interface ReportVerdict {
  theoryId: string;
  title: string;
  claim: string;
  standing: TheoryStanding;
  standingReason: string;
}

export interface PinReading {
  evidenceId: string;
  title: string;
  status: EvidenceStatus;
  /** The theory id the user chose, or "none". */
  target: PinTarget;
  reading: HistoriansReading;
  /** The evidence's reading.note. */
  note: string;
}

export interface ReliedOnEntry {
  evidenceId: string;
  title: string;
  status: EvidenceStatus;
  reading: HistoriansReading;
}

export interface AgainstVerdictEntry {
  evidenceId: string;
  title: string;
  status: EvidenceStatus;
  note: string;
}

/** No status: it is earned by opening the file (product.md, "Reveal, don't tell"). */
export interface NeverOpenedEntry {
  evidenceId: string;
  title: string;
  link: VerdictLink;
}

export interface LegendTrustedEntry {
  evidenceId: string;
  title: string;
  /** The theory the user pinned this legend to. */
  theoryId: string;
  origin: string;
}

export interface TheoryStandingEntry {
  theoryId: string;
  title: string;
  standing: TheoryStanding;
  standingReason: string;
}

export interface CaseReport {
  verdict: ReportVerdict | null;
  pins: PinReading[];
  reliedOn: ReliedOnEntry[];
  againstVerdict: AgainstVerdictEntry[];
  neverOpened: NeverOpenedEntry[];
  legendsTrusted: LegendTrustedEntry[];
  historiansStand: { theories: TheoryStandingEntry[]; summary: string[] };
}

/** The investigation, reduced to values that belong to the case. */
interface CleanState {
  opened: Set<string>;
  pins: Map<string, PinTarget>;
  chosen: Theory | null;
}

/**
 * Keeps only what in the state belongs to the case (Requirement 9.1 to 9.3).
 * The state comes from storage and is untrusted: every value is type-checked before it is used, and anything
 * that still throws (a getter, for example) is treated as an empty investigation.
 */
function cleanState(caseData: Case, state: unknown): CleanState {
  const empty: CleanState = { opened: new Set(), pins: new Map(), chosen: null };
  const evidenceIds = new Set(caseData.evidence.map(evidence => evidence.id));
  const theoriesById = new Map(caseData.theories.map(theory => [theory.id, theory] as const));

  try {
    if (typeof state !== 'object' || state === null) {
      return empty;
    }
    const { opened: rawOpened, pins: rawPins, verdict: rawVerdict } = state as Record<string, unknown>;

    // A Set drops duplicates.
    const opened = new Set<string>();
    if (Array.isArray(rawOpened)) {
      for (const id of rawOpened) {
        if (typeof id === 'string' && evidenceIds.has(id)) {
          opened.add(id);
        }
      }
    }

    // Object.entries reads only own enumerable keys, so nothing inherited becomes a pin.
    const pins = new Map<string, PinTarget>();
    if (typeof rawPins === 'object' && rawPins !== null && !Array.isArray(rawPins)) {
      for (const [evidenceId, target] of Object.entries(rawPins)) {
        if (
          evidenceIds.has(evidenceId) &&
          typeof target === 'string' &&
          (target === 'none' || theoriesById.has(target))
        ) {
          pins.set(evidenceId, target);
        }
      }
    }

    const chosen = typeof rawVerdict === 'string' ? (theoriesById.get(rawVerdict) ?? null) : null;

    return { opened, pins, chosen };
  } catch {
    return empty;
  }
}

/** Requirement 2.3 to 2.7. `supports` is checked first, so `agree` wins when a theory is in both lists. */
function historiansReading(evidence: Evidence, target: PinTarget): HistoriansReading {
  const { supports, weakens } = evidence.reading;
  if (target === 'none') {
    return supports.length === 0 ? 'agree' : 'disagree';
  }
  if (supports.includes(target)) {
    return 'agree';
  }
  if (weakens.includes(target)) {
    return 'disagree';
  }
  return 'no-link';
}

/** How the evidence bears on a theory, with the same precedence as `historiansReading`. */
function verdictLink(evidence: Evidence, theoryId: string): VerdictLink | null {
  if (evidence.reading.supports.includes(theoryId)) {
    return 'supports';
  }
  if (evidence.reading.weakens.includes(theoryId)) {
    return 'weakens';
  }
  return null;
}

/**
 * Builds the case report from the case and the user's investigation.
 *
 * Pure and total: it never throws, never changes its inputs, and gives equal reports for equal inputs.
 * Ids in the state that are not in the case are ignored. Every list is in the case's own order.
 *
 * @param caseData - The case, as it passes `validateCase`
 * @param state - The investigation. Typed for callers, but treated as untrusted at runtime
 */
export function buildCaseReport(caseData: Case, state: InvestigationState): CaseReport {
  const { opened, pins: validPins, chosen } = cleanState(caseData, state);

  const pins: PinReading[] = [];
  const reliedOn: ReliedOnEntry[] = [];
  const againstVerdict: AgainstVerdictEntry[] = [];
  const neverOpened: NeverOpenedEntry[] = [];
  const legendsTrusted: LegendTrustedEntry[] = [];

  // One walk over the evidence, so every list comes out in the case's order (Requirement 9.5).
  for (const evidence of caseData.evidence) {
    const { id: evidenceId, title, status } = evidence;
    const target = validPins.get(evidenceId);

    if (target !== undefined) {
      const reading = historiansReading(evidence, target);
      pins.push({ evidenceId, title, status, target, reading, note: evidence.reading.note });

      if (chosen !== null && target === chosen.id) {
        reliedOn.push({ evidenceId, title, status, reading });
      }
      if (evidence.status === 'legend' && target !== 'none') {
        legendsTrusted.push({ evidenceId, title, theoryId: target, origin: evidence.origin });
      }
    }

    if (chosen !== null) {
      // A file is either opened or not, so it can never be in both lists (Requirement 5.4).
      if (opened.has(evidenceId)) {
        if (evidence.reading.weakens.includes(chosen.id)) {
          againstVerdict.push({ evidenceId, title, status, note: evidence.reading.note });
        }
      } else {
        const link = verdictLink(evidence, chosen.id);
        if (link !== null) {
          neverOpened.push({ evidenceId, title, link });
        }
      }
    }
  }

  return {
    verdict:
      chosen === null
        ? null
        : {
            theoryId: chosen.id,
            title: chosen.title,
            claim: chosen.claim,
            standing: chosen.standing,
            standingReason: chosen.standingReason,
          },
    pins,
    reliedOn,
    againstVerdict,
    neverOpened,
    legendsTrusted,
    historiansStand: {
      theories: caseData.theories.map(theory => ({
        theoryId: theory.id,
        title: theory.title,
        standing: theory.standing,
        standingReason: theory.standingReason,
      })),
      // A copy: the report never shares an array with the case.
      summary: [...caseData.historiansSummary],
    },
  };
}

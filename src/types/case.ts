// src/types/case.ts
// The content contract for every Histor case. Written to match product.md and content-integrity.md.

/** An array with at least one item. */
export type NonEmptyArray<T> = [T, ...T[]];

// ---------- Sources ----------

export type SourceKind = 'testimony' | 'official' | 'secondary' | 'fiction';

interface SourceBase {
  id: string;
  title: string;
  kind: SourceKind;
  author?: string;
  /** Year of publication or of the record. */
  year?: number;
}

/** Every source needs a link, a citation, or both. */
export type Source = SourceBase &
  ({ url: string; citation?: string } | { url?: string; citation: string });

// ---------- Images ----------

export interface ImageAsset {
  /** Path to an asset inside the case folder. */
  src: string;
  alt: string;
  credit: string;
  /** True for drawings, reconstructions or AI images. Never shown as a photograph. */
  isIllustration: boolean;
}

// ---------- References (tappable portals in the story) ----------

export type ReferenceKind = 'person' | 'place' | 'term' | 'ship';

export interface Reference {
  /** Used in story text as {{ref:<id>|<label>}}. */
  id: string;
  kind: ReferenceKind;
  /** Display name, e.g. "Benjamin Briggs". */
  label: string;
  /** Short profile shown in the portal. One string per paragraph. */
  profile: string[];
  /** Portrait for a person, old map for a place. */
  image?: ImageAsset;
  sources?: string[];
}

// ---------- Theories ----------

export type TheoryStanding = 'leading' | 'considered' | 'rejected';

export interface Theory {
  /** Starts with "t-". */
  id: string;
  /** e.g. "Feared sinking". */
  title: string;
  /** One-line claim, e.g. "The captain believed the ship was sinking and abandoned her." */
  claim: string;
  /** How historians rate it. Revealed only at the verdict. */
  standing: TheoryStanding;
  /** One line explaining the standing. */
  standingReason: string;
}

// ---------- Evidence ----------

export type EvidenceStatus = 'record' | 'disputed' | 'legend';

export interface Reading {
  /** Theory ids this evidence supports, per historians. */
  supports: string[];
  /** Theory ids this evidence weakens, per historians. */
  weakens: string[];
  /** One line shown after the user pins: how historians read this. */
  note: string;
}

interface EvidenceBase {
  /** Starts with "e-". */
  id: string;
  /** Short claim shown on the closed file, e.g. "The only lifeboat was gone". */
  title: string;
  /** Full detail shown when the file is opened. One string per paragraph. */
  detail: string[];
  /** Source ids. At least one, enforced by the type. */
  sources: NonEmptyArray<string>;
  reading: Reading;
  image?: ImageAsset;
}

export type Evidence =
  | (EvidenceBase & { status: 'record' })
  | (EvidenceBase & {
      status: 'disputed';
      /** One line each for the two sides. */
      dispute: { claim: string; challenge: string };
    })
  | (EvidenceBase & {
      status: 'legend';
      /** Where the legend came from, e.g. "Arthur Conan Doyle's 1884 short story". */
      origin: string;
    });

// ---------- Story ----------

export interface LegendIntro {
  /** The legend, told line by line. */
  lines: string[];
  /** Text on the stamp, e.g. "Not in the record". */
  stamp: string;
  /** What the app says after the stamp, e.g. "Well... that never happened." */
  debunk: string;
}

export interface StorySection {
  id: string;
  /** Small label above the heading, e.g. "New York · 7 November 1872". */
  kicker?: string;
  heading: string;
  /** Paragraphs. May contain {{ref:<id>|<label>}} markup. */
  body: string[];
  /** Optional closing line that pulls the reader into the next section. */
  hook?: string;
}

export interface Fork {
  /** e.g. "Most people stop here. Want to see what the evidence says?" */
  prompt: string;
  investigateLabel: string;
  leaveLabel: string;
}

// ---------- Theme ----------

export interface CaseTheme {
  /** Matches [data-case-theme="<id>"] in the case's theme.css, where colours and textures live. */
  id: string;
  /** Looping ambience, e.g. creaking hull. */
  ambientAudio?: string;
  /** Named sound effects for this case. */
  sounds?: Partial<Record<'stamp' | 'open' | 'pin' | 'portal' | 'close', string>>;
  /** Illustration video behind the legend intro, with a still frame shown while it loads and under reduced motion. */
  legendVideo?: { src: string; poster: string };
}

// ---------- Case ----------

export interface Case {
  id: string;
  title: string;
  year: number;
  /** One line for the home page. */
  teaser: string;
  legendIntro: LegendIntro;
  story: StorySection[];
  centralQuestion: string;
  fork: Fork;
  theories: Theory[];
  evidence: Evidence[];
  sources: Source[];
  references: Reference[];
  /** Shown to readers who stop at the fork, and in the case report. */
  historiansSummary: string[];
  /** Files the user must open before "Close the case" unlocks. */
  closeThreshold: number;
  theme: CaseTheme;
}

// ---------- Registry ----------

interface RegistryBase {
  id: string;
  title: string;
  year: number;
  teaser: string;
}

export type RegistryEntry =
  | (RegistryBase & { sealed: true })
  | (RegistryBase & { sealed: false; data: Case });

// ---------- Investigation ----------

/** Pin value: a theory id, or "none" when the user says it points to no theory. */
export type PinTarget = string | 'none';

export interface InvestigationState {
  /** Evidence ids the user has opened, in order. */
  opened: string[];
  /** Evidence id → the theory the user chose. */
  pins: Record<string, PinTarget>;
  /** Chosen theory id once the case is closed. */
  verdict: string | null;
}

export type InvestigationAction =
  | { type: 'OPEN_EVIDENCE'; evidenceId: string }
  | { type: 'PIN_EVIDENCE'; evidenceId: string; target: PinTarget }
  | { type: 'CLOSE_CASE'; theoryId: string }
  | { type: 'REOPEN_CASE' };
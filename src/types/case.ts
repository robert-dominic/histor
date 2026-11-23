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
  /** Optional short caption that is always shown on the image, e.g. "The Mary Celeste, 1861". */
  caption?: string;
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
  /** Text on the stamp, e.g. "Legend". */
  stamp: string;
  /** What the app says after the stamp, e.g. "Well... that part never happened. The men who boarded her..." */
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
  /** The chapter's image, shown full screen behind the text, with its credit. */
  image?: ImageAsset;
  /**
   * The people this chapter calls by name, in order. They appear one by one just before the first beat that
   * names the first of them, and go out one by one at the chapter's hook.
   */
  rollCall?: RollCallEntry[];
  /**
   * The weighted words of the chapter: phrases the pen writes after a breath, a touch slower and slightly brighter
   * (no line under them). Each must appear word for word in the chapter's text (a body
   * paragraph or the hook, with {{ref:…}} markup read as its label), e.g. "two-year-old daughter".
   */
  emphasis?: string[];
}

export interface RollCallEntry {
  /** e.g. "Benjamin Briggs". */
  name: string;
  /** e.g. "captain". */
  role: string;
}

// ---------- Voyage chart ----------

export type VoyagePointKind = 'port' | 'record' | 'found';

export interface VoyagePoint {
  id: string;
  /** Shown on the expanded chart, e.g. "Found adrift". */
  label: string;
  /** Degrees, north positive. */
  lat: number;
  /** Degrees, east positive. */
  lon: number;
  /** The id of the story chapter in which the point appears on the chart. */
  chapter: string;
  kind: VoyagePointKind;
  /** A destination never reached: drawn faint and dotted, with no route to it. */
  unreached?: boolean;
}

/** The route drawn on the story's chart: through the reached points, in order. */
export interface Voyage {
  points: VoyagePoint[];
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
  /**
   * Illustration video behind the legend intro, with a still frame shown while it loads and under reduced motion.
   * The credit is shown on screen with the "Illustration" label.
   */
  legendVideo?: { src: string; poster: string; credit: string };
}

// ---------- Case ----------

export interface Case {
  id: string;
  title: string;
  year: number;
  /** Last year of the case when it spans more than one, e.g. 1873 for "1872 – 1873". Never before `year`. */
  yearEnd?: number;
  /** True for a case with no accepted answer. Shows the UNSOLVED stamp. */
  unsolved?: boolean;
  /** One line for the home page. */
  teaser: string;
  /**
   * The first sentence of the desk's guide: what happened, in this case's own words, e.g. "In 1872 the Mary Celeste
   * was found adrift with no one aboard." Without it the guide starts with its generic lines.
   */
  deskGuideIntro?: string;
  legendIntro: LegendIntro;
  story: StorySection[];
  centralQuestion: string;
  /**
   * The weighted parts of the central question: phrases that arrive like weighted words as the question builds.
   * Each must appear word for word in `centralQuestion`, e.g. "his two-year-old daughter".
   */
  centralQuestionEmphasis?: string[];
  /**
   * The lines the central question is shown in, one per step. Joined with single spaces they must give
   * `centralQuestion` exactly. Without them it is split at its commas and before "and".
   */
  centralQuestionLines?: string[];
  fork: Fork;
  theories: Theory[];
  evidence: Evidence[];
  sources: Source[];
  references: Reference[];
  /** Shown to readers who stop at the fork, and in the case report. */
  historiansSummary: string[];
  /** Files the user must open before "Close the case" unlocks. */
  closeThreshold: number;
  /** The voyage, drawn on a small chart that follows the story. */
  voyage?: Voyage;
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
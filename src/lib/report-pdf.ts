// src/lib/report-pdf.ts
// "Download your case report (PDF)" (review-fixes brief, 12): the case report as an A4 PDF in the site's style, paper
// coloured, its headings typed. The case's title and years, the date and the player's name if they signed; their
// theory and where historians lean; their rank; every section of the report, each file with its title, its status (or
// "Sealed") and what they did with it; the case's sources. Built entirely from the case report (buildCaseReport) and
// the case data, like the page. Fonts: the standard PDF fonts, no files (src/lib/pdf.ts): Courier for the app's typed
// voice (Special Elite is a typewriter face), Times for the case's title (Old Standard TT's family).
import { NO_THEORY, READING_LABEL, STANDING_LABEL, STATUS_LABEL, fileNumber, pinTargetTitle } from '@/lib/case-files';
import { leadingTheories, verdictComparison, type CaseRank } from '@/lib/case-rank';
import type { CaseReport } from '@/lib/case-report';
import { formatCaseYears } from '@/lib/case-years';
import { A4, COURIER_ADVANCE, PdfDocument, type PdfFont, type Rgb } from '@/lib/pdf';
import { RANK_COPY } from '@/lib/ui-copy';
import type { Case, EvidenceStatus, PinTarget } from '@/types/case';

/** The Ash palette (design.md), as RGB. */
const PAPER: Rgb = [0xe2, 0xdd, 0xcf];
const INK: Rgb = [0x23, 0x21, 0x1d];
const MUTED: Rgb = [0x6c, 0x6a, 0x62];
const RUST: Rgb = [0x9e, 0x33, 0x26];
const RECORD: Rgb = [0x2b, 0x47, 0x67];

/** The page's margins and the text's sizes and leading, in points. */
const PAGE = { margin: 48, foot: 40 } as const;
const TYPE = {
  title: 26,
  heading: 10,
  body: 8.6,
  small: 7.6,
  /** Line height as a multiple of the size. */
  leading: 1.32,
} as const;

export interface ReportPdfInput {
  caseData: Case;
  report: CaseReport;
  rank: CaseRank;
  /** The player's signature; empty when they did not sign. */
  name: string;
  /** When the report is downloaded. */
  date: Date;
}

/** The file's name. */
export function reportPdfName(caseId: string): string {
  return `histor-${caseId}-report.pdf`;
}

/** `text` broken into lines of at most `chars` characters, at spaces where it can. */
export function wrapText(text: string, chars: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    let rest = word;
    while (rest.length > chars) {
      if (line !== '') {
        lines.push(line);
        line = '';
      }
      lines.push(rest.slice(0, chars));
      rest = rest.slice(chars);
    }
    if (line === '') {
      line = rest;
    } else if (line.length + 1 + rest.length <= chars) {
      line += ` ${rest}`;
    } else {
      lines.push(line);
      line = rest;
    }
  }
  if (line !== '') {
    lines.push(line);
  }
  return lines;
}

/** A file's stamp in the PDF: its status, or "Sealed" for one never opened. */
const stampOf = (status: EvidenceStatus | null) => (status === null ? 'Sealed' : STATUS_LABEL[status]);

/** What the player did with a file. */
function didWith(caseData: Case, target: PinTarget | undefined): string {
  if (target === undefined) {
    return 'opened, not pinned';
  }
  return target === 'none' ? `set aside (${NO_THEORY})` : `pinned to ${pinTargetTitle(caseData, target)}`;
}

/** Lays the report out, top to bottom, page after page. */
class Writer {
  readonly pdf = new PdfDocument();
  private y = 0;
  private page = 0;
  private readonly footer: string;
  constructor(footer: string) {
    this.footer = footer;
    this.newPage();
  }

  private get width() {
    return A4.width - 2 * PAGE.margin;
  }

  private newPage() {
    this.pdf.addPage();
    this.page += 1;
    this.pdf.fillRect(0, 0, A4.width, A4.height, PAPER);
    // The inked double rule, as on the shareable card.
    this.pdf.strokeRect(18, 18, A4.width - 36, A4.height - 36, INK, 1.4);
    this.pdf.strokeRect(23, 23, A4.width - 46, A4.height - 46, INK, 0.5);
    this.pdf.text(`${this.footer} · ${this.page}`, PAGE.margin, PAGE.foot - 10, 'courier', TYPE.small, MUTED);
    this.y = A4.height - PAGE.margin;
  }

  /** Room for `height` more points on this page, or a new page. */
  need(height: number) {
    if (this.y - height < PAGE.foot + 14) {
      this.newPage();
    }
  }

  space(points: number) {
    this.y -= points;
  }

  /** Lines of Courier, wrapped to the width (less `indent`). */
  typed(text: string, { size = TYPE.body as number, font = 'courier' as PdfFont, colour = INK, indent = 0 } = {}) {
    const chars = Math.floor((this.width - indent) / (size * COURIER_ADVANCE));
    const step = size * TYPE.leading;
    for (const line of wrapText(text, chars)) {
      this.need(step);
      this.y -= step;
      this.pdf.text(line, PAGE.margin + indent, this.y, font, size, colour);
    }
  }

  /** A section's typed heading, with a thin rule under it. */
  heading(text: string) {
    this.need(TYPE.heading * 4.5);
    this.y -= TYPE.heading * 1.9;
    this.pdf.text(text.toUpperCase(), PAGE.margin, this.y, 'courier-bold', TYPE.heading, INK);
    this.y -= 4;
    this.pdf.line(PAGE.margin, this.y, A4.width - PAGE.margin, this.y, MUTED, 0.4);
    this.y -= 2;
  }

  /** The case's title, in Times, shrunk to fit one line. */
  title(text: string) {
    // Times' capitals and lower case average about half the size: a safe estimate to keep it on the page.
    const size = Math.min(TYPE.title, this.width / Math.max(1, text.length * 0.52));
    this.y -= size;
    this.pdf.text(text, PAGE.margin, this.y, 'times-bold', size, INK);
  }

  /** A rubber stamp in rust: a crooked frame around typed capitals. */
  stamp(text: string) {
    const size = 13;
    this.need(size * 3);
    this.y -= size * 2;
    this.pdf.stamp(text.toUpperCase(), PAGE.margin + 8, this.y, 'courier-bold', size, RUST, -1.5, { x: 8, y: 6 });
    this.y -= 8;
  }
}

/** The report, as the bytes of a PDF. */
export function buildReportPdf({ caseData, report, rank, name, date }: ReportPdfInput): Uint8Array {
  const years = formatCaseYears(caseData.year, caseData.yearEnd);
  const writer = new Writer(`Histor · ${caseData.title} · case report`);
  const numberOf = (evidenceId: string) => fileNumber(caseData.evidence.findIndex(evidence => evidence.id === evidenceId));
  const pins = new Map(report.pins.map(pin => [pin.evidenceId, pin.target] as const));
  /** One file: its number, title and stamp, then what the player did, then a note. */
  const file = (evidenceId: string, title: string, stamp: string, did: string, note?: string) => {
    writer.space(3);
    writer.typed(`${numberOf(evidenceId)}  ${title}  [${stamp.toUpperCase()}]`, { font: 'courier-bold' });
    writer.typed(did, { indent: 22, colour: MUTED });
    if (note !== undefined && note !== '') {
      writer.typed(note, { indent: 22 });
    }
  };

  // The case, its years, the date and the signature.
  writer.typed('HISTOR · CASE REPORT', { size: TYPE.small, colour: MUTED });
  writer.space(4);
  writer.title(caseData.title);
  writer.space(2);
  writer.typed(`${years}${caseData.unsolved === true ? ' · UNSOLVED' : ''}`, { colour: MUTED });
  const dated = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  writer.typed(name.trim() === '' ? `Closed on ${dated}` : `Closed on ${dated} · Signed: ${name.trim()}`, { colour: MUTED });

  // Their theory, and where historians lean.
  const verdict = report.verdict;
  writer.heading('Your verdict');
  if (verdict === null) {
    writer.typed('The case is still open.');
  } else {
    writer.typed(`${verdict.title}  [${STANDING_LABEL[verdict.standing].toUpperCase()}]`, { font: 'courier-bold' });
    writer.typed(verdict.claim);
    const leading = leadingTheories(report).map(theory => theory.title);
    writer.space(3);
    writer.typed(`Most historians lean toward: ${leading.length > 0 ? leading.join(', ') : 'no one theory'}.`, { colour: RECORD });
    const comparison = verdictComparison(report);
    writer.typed(comparison.kind === 'with' || comparison.kind === 'none' ? comparison.line : `${comparison.line} ${comparison.reason}`);
  }

  // Their rank.
  writer.heading('Your rank');
  writer.stamp(RANK_COPY[rank].name);
  writer.typed(RANK_COPY[rank].line);

  // Every section of the report.
  writer.heading('What you relied on');
  if (report.reliedOn.length === 0) {
    writer.typed('Nothing pinned to your verdict.');
  }
  report.reliedOn.forEach(entry => file(entry.evidenceId, entry.title, stampOf(entry.status), `${didWith(caseData, pins.get(entry.evidenceId))} · ${READING_LABEL[entry.reading]}`));

  writer.heading('Your pins, and what historians say');
  if (report.pins.length === 0) {
    writer.typed('You pinned no files.');
  }
  report.pins.forEach(pin => file(pin.evidenceId, pin.title, stampOf(pin.status), `${didWith(caseData, pin.target)} · ${READING_LABEL[pin.reading]}`, pin.status === null ? undefined : pin.note));

  writer.heading('Against your verdict');
  if (report.againstVerdict.length === 0) {
    writer.typed('Nothing you opened counts against it.');
  }
  report.againstVerdict.forEach(entry => file(entry.evidenceId, entry.title, stampOf(entry.status), didWith(caseData, pins.get(entry.evidenceId)), entry.note));

  writer.heading('What you never opened');
  if (report.neverOpened.length === 0) {
    writer.typed('You opened every file that bears on it.');
  }
  report.neverOpened.forEach(entry =>
    file(entry.evidenceId, entry.title, 'Sealed', `${pins.has(entry.evidenceId) ? `${didWith(caseData, pins.get(entry.evidenceId))}, never opened` : 'never opened'} · ${entry.link === 'supports' ? 'supports your verdict' : 'counts against it'}`)
  );

  writer.heading('Legends you trusted');
  writer.typed(report.legendsTrusted.length > 0 ? 'You trusted a legend. Happens to the best of us.' : 'Not one legend got past you.');
  report.legendsTrusted.forEach(entry => file(entry.evidenceId, entry.title, STATUS_LABEL.legend, didWith(caseData, entry.theoryId), `Where it came from: ${entry.origin}`));

  writer.heading('Where historians stand');
  report.historiansStand.theories.forEach(theory => {
    writer.space(3);
    writer.typed(`${theory.title}  [${STANDING_LABEL[theory.standing].toUpperCase()}]`, { font: 'courier-bold' });
    writer.typed(theory.standingReason, { indent: 22 });
  });
  writer.space(4);
  report.historiansStand.summary.forEach(paragraph => {
    writer.typed(paragraph);
    writer.space(3);
  });

  // The case's sources.
  writer.heading('Sources');
  caseData.sources.forEach((source, index) => {
    const parts = [source.title, source.author, source.year === undefined ? undefined : String(source.year), source.citation, source.url].filter(
      (part): part is string => part !== undefined && part !== ''
    );
    writer.typed(`${String(index + 1).padStart(2, '0')}. ${parts.join(' · ')}`, { size: TYPE.small });
  });

  return writer.pdf.toBytes();
}

/** Downloads the report's PDF. Returns false where the browser cannot. Nothing is sent anywhere. */
export function downloadReportPdf(input: ReportPdfInput): boolean {
  if (typeof URL.createObjectURL !== 'function') {
    return false;
  }
  const bytes = buildReportPdf(input);
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = reportPdfName(input.caseData.id);
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return true;
}

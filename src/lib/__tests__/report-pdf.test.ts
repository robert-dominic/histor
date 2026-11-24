// src/lib/__tests__/report-pdf.test.ts
// "Download your case report (PDF)" (review-fixes brief, 12): a well-formed A4 PDF of one or two pages, in the site's
// paper colour, with the case, the date and the signature, the verdict and where historians lean, the rank, every
// section's files with their status (or "Sealed") and what was done with them, and the sources.
import { describe, expect, test } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import { caseRank } from '@/lib/case-rank';
import { buildCaseReport } from '@/lib/case-report';
import { A4, PdfDocument, pdfString } from '@/lib/pdf';
import { buildReportPdf, reportPdfName, wrapText } from '@/lib/report-pdf';
import type { InvestigationState } from '@/types/case';

const CASE = maryCeleste;
const decode = (bytes: Uint8Array) => Array.from(bytes, byte => String.fromCharCode(byte)).join('');
/** Text drawn in the PDF, back from its string literals (enough for these words). */
const drawn = (pdf: string) =>
  [...pdf.matchAll(/\((.*?)\) Tj/g)].map(match => match[1].replace(/\\([()\\])/g, '$1')).join('\n');

function reportFor(state: InvestigationState, name = 'Ann') {
  const report = buildCaseReport(CASE, state);
  return { pdf: decode(buildReportPdf({ caseData: CASE, report, rank: caseRank(report), name, date: new Date(2026, 9, 31) })), report };
}

const opened = CASE.evidence.slice(0, CASE.closeThreshold).map(evidence => evidence.id);
const sealedId = CASE.evidence[CASE.evidence.length - 1].id;
const state: InvestigationState = {
  opened,
  pins: { [opened[0]]: CASE.theories[0].id, [opened[1]]: 'none', [sealedId]: CASE.theories[1].id },
  verdict: CASE.theories[0].id,
};

describe('the PDF writer', () => {
  test('a well-formed file: header, objects, an xref whose offsets point at them, and the end', () => {
    const doc = new PdfDocument();
    doc.text('Hello (world) \\ — “quoted” …', 50, 700, 'courier', 12, [0, 0, 0]);
    const file = decode(doc.toBytes());
    expect(file.startsWith('%PDF-1.4')).toBe(true);
    expect(file.trimEnd().endsWith('%%EOF')).toBe(true);
    const xref = Number(/startxref\n(\d+)/.exec(file)![1]);
    expect(file.slice(xref, xref + 4)).toBe('xref');
    const offsets = [...file.slice(xref).matchAll(/^(\d{10}) 00000 n $/gm)].map(match => Number(match[1]));
    offsets.forEach((offset, index) => expect(file.slice(offset).startsWith(`${index + 1} 0 obj`)).toBe(true));
  });

  test('text in WinAnsi: ( ) and \\ escaped, curly quotes and dashes kept, anything else "?"', () => {
    expect(pdfString('a(b)c\\')).toBe('(a\\(b\\)c\\\\)');
    expect(pdfString('’—…é')).toBe(`(${String.fromCharCode(0x92, 0x97, 0x85, 0xe9)})`);
    expect(pdfString('名')).toBe('(?)');
  });

  test('lines wrap at spaces, and a word too long is broken', () => {
    expect(wrapText('one two three four', 9)).toEqual(['one two', 'three', 'four']);
    expect(wrapText('abcdefghijkl', 5)).toEqual(['abcde', 'fghij', 'kl']);
  });
});

describe('the case report as a PDF', () => {
  test('named histor-{caseId}-report.pdf', () => {
    expect(reportPdfName(CASE.id)).toBe(`histor-${CASE.id}-report.pdf`);
  });

  test('one or two A4 pages, in the paper colour', () => {
    const { pdf } = reportFor(state);
    const pages = Number(/\/Type \/Pages \/Kids \[[^\]]*\] \/Count (\d+)/.exec(pdf)![1]);
    expect(pages).toBeGreaterThanOrEqual(1);
    expect(pages).toBeLessThanOrEqual(2);
    expect(pdf).toContain(`/MediaBox [0 0 ${A4.width} ${A4.height}]`);
    expect(pdf).toContain('0.89 0.87 0.81 rg');
  });

  test('the case, the date and the signature; the verdict, where historians lean, the rank', () => {
    const { pdf, report } = reportFor(state);
    const text = drawn(pdf);
    expect(text).toContain(CASE.title);
    expect(text).toContain('31 October 2026');
    expect(text).toContain('Signed: Ann');
    expect(text).toContain(report.verdict!.title);
    expect(text).toContain('Most historians lean toward:');
    expect(text).toContain(caseRank(report).toUpperCase());
    expect(reportFor(state, '').pdf).not.toContain('Signed:');
  });

  test('every section, each file with its status or "Sealed", and what was done with it; the sources', () => {
    const { pdf } = reportFor(state);
    const text = drawn(pdf);
    for (const heading of ['YOUR VERDICT', 'YOUR RANK', 'WHAT YOU RELIED ON', 'YOUR PINS, AND WHAT HISTORIANS SAY', 'AGAINST YOUR VERDICT', 'WHAT YOU NEVER OPENED', 'LEGENDS YOU TRUSTED', 'WHERE HISTORIANS STAND', 'SOURCES']) {
      expect(text).toContain(heading);
    }
    expect(text).toContain('[SEALED]');
    expect(text).toMatch(/pinned to /);
    expect(text).toContain('set aside (None of them)');
    expect(text).toContain(CASE.sources[0].title.slice(0, 20));
  });
});

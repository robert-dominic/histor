// @vitest-environment jsdom
// src/features/verdict/__tests__/ReportPdf.test.tsx
// The report's PDF button (review-fixes brief, 12): under the report, it saves histor-{caseId}-report.pdf, made in
// the browser (src/lib/report-pdf.ts). Nothing is sent anywhere.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach } from 'vitest';
import { describe, expect, test } from 'vitest';
import App from '@/App';
import maryCeleste from '@/cases/mary-celeste/case';
import { continuePastGate, resetPhoneGate } from '@/lib/phone-gate';

afterEach(() => {
  cleanup();
  resetPhoneGate();
  localStorage.clear();
  window.history.pushState({}, '', '/');
});
describe('the report PDF (review-fixes 12)', () => {
  test('under the report: "Download your case report (PDF)" saves histor-{caseId}-report.pdf, made in the browser', async () => {
    const { vi } = await import('vitest');
    continuePastGate();
    localStorage.setItem(
      `histor:case:${maryCeleste.id}`,
      JSON.stringify({ opened: [maryCeleste.evidence[0].id], pins: {}, verdict: maryCeleste.theories[0].id })
    );
    const create = vi.fn(() => 'blob:pdf');
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() }));
    const names: string[] = [];
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      names.push(this.download);
    });
    window.history.pushState({}, '', `/case/${maryCeleste.id}/report`);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Download your case report (PDF)' }));
    expect(names).toEqual([`histor-${maryCeleste.id}-report.pdf`]);
    const blob = (create.mock.calls[0] as unknown as [Blob])[0];
    expect(blob.type).toBe('application/pdf');
    click.mockRestore();
    vi.unstubAllGlobals();
  });
});

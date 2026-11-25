// src/features/verdict/Report.tsx
// The case report. Built entirely from buildCaseReport (src/lib/case-report.ts): it mirrors the user's
// reasoning, section by section, and never scores it. Without a verdict, this page sends the user to the board.
// It lies on the desk as typed paper under a still lamp; the paper sits above the lamp's shadow, fully readable.

import { useMemo, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useInvestigation } from '@/app/InvestigationProvider';
import Stamp from '@/components/Stamp';
import DeskSurface from '@/features/board/DeskSurface';
import Lamp from '@/features/board/Lamp';
import CaseCredits from '@/features/verdict/CaseCredits';
import SiteFooter from '@/components/SiteFooter';
import ReportSection from '@/features/verdict/ReportSection';
import VerdictReveal from '@/features/verdict/VerdictReveal';
import { formatCaseYears } from '@/lib/case-years';
import { READING_LABEL, STANDING_LABEL, STATUS_LABEL, fileNumber, pinTargetTitle } from '@/lib/case-files';
import { buildCaseReport } from '@/lib/case-report';
import { caseRank } from '@/lib/case-rank';
import { loadPlayerName } from '@/lib/player-name';
import { downloadReportPdf } from '@/lib/report-pdf';
import { MOTION, MOTION_QUERIES, STEP, stampHit, tween } from '@/lib/motion';

gsap.registerPlugin(useGSAP);

const EMPTY_CLASSES = 'font-voice text-[0.9375rem] text-ink/75';
const ITEM_TITLE_CLASSES = 'font-record text-[1.0625rem] leading-snug text-ink';
const ITEM_META_CLASSES = 'font-voice text-[0.75rem] tracking-[0.06em] text-ink/75 tabular-nums';
const ACTION_CLASSES =
  'inline-flex min-h-11 items-center rounded-sm px-4 font-voice text-sm tracking-[0.12em] uppercase transition-[scale,background-color,color] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass active:scale-[0.97]';

export default function Report() {
  const { state, dispatch, caseData } = useInvestigation();
  const navigate = useNavigate();
  const rootRef = useRef<HTMLElement>(null);
  const [confirming, setConfirming] = useState(false);
  const [pdfNote, setPdfNote] = useState('');
  // Just closed at the verdict: the reveal plays, under a narrowing lamp. Otherwise it is simply there.
  const location = useLocation();
  const [fresh] = useState(() => (location.state as { fresh?: boolean } | null)?.fresh === true);
  const [narrow, setNarrow] = useState(false);
  const report = useMemo(() => buildCaseReport(caseData, state), [caseData, state]);
  const base = `/case/${caseData.id}`;

  const numberOf = (evidenceId: string) => fileNumber(caseData.evidence.findIndex(item => item.id === evidenceId));

  useGSAP(
    () => {
      if (report.verdict === null || typeof window.matchMedia !== 'function') {
        return;
      }
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES, context => {
        const reduced = context.conditions?.reduced === true;
        const timeline = gsap.timeline({ defaults: { ease: MOTION['ink.in'].ease } });
        // The standing is revealed only now: it stamps onto the verdict after a beat.
        timeline.add(stampHit('[data-report="standing"]', { reduced }), 0.6);
        timeline.fromTo(
          '[data-report="reason"]',
          { opacity: 0 },
          { opacity: 1, ...tween('paper.lift') },
          `>+=${STEP.fast * 0.75}`
        );
      });
    },
    { scope: rootRef }
  );

  if (report.verdict === null) {
    return <Navigate to={`${base}/files`} replace />;
  }

  const { verdict } = report;

  const reopen = () => {
    dispatch({ type: 'REOPEN_CASE' });
    navigate(`${base}/files`);
  };

  return (
    <main
      ref={rootRef}
      data-page="case"
      aria-labelledby="report-title"
      className="relative isolate min-h-svh bg-night px-3 pt-[calc(var(--case-header)+1.25rem)] pb-16 sm:px-6 lg:pt-[calc(var(--case-header)+2.5rem)]"
    >
      <DeskSurface />
      {/* The reveal, the rank and the shareable card; the full report follows below, as before. */}
      <VerdictReveal
        report={report}
        caseId={caseData.id}
        title={caseData.title}
        years={formatCaseYears(caseData.year, caseData.yearEnd)}
        fresh={fresh}
        onNarrow={setNarrow}
        onDownloadPdf={() =>
          setPdfNote(
            downloadReportPdf({ caseData, report, rank: caseRank(report), name: loadPlayerName(), date: new Date() })
              ? ''
              : 'This browser cannot save the PDF.'
          )
        }
      />
      <article className="desk-typed-paper relative z-[21] mx-auto flex max-w-3xl flex-col lg:max-w-6xl gap-8 rounded-[2px] px-5 pt-8 pb-8 text-ink sm:px-10 sm:pt-10">
        <h2 id="report-title" className="font-legend text-[clamp(2rem,1.5rem+2vw,3rem)] leading-none">
          Case report
        </h2>

        {/* 1. The verdict, and the standing revealed with a stamp. */}
        <section data-report="verdict" aria-labelledby="report-verdict" className="border-t border-ink/15 pt-6">
          <h3 id="report-verdict" className="font-voice text-[0.8125rem] tracking-[0.2em] text-ink/80 uppercase">
            Your verdict
          </h3>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-[28rem]">
              <p className="font-legend text-[clamp(1.75rem,1.4rem+1.4vw,2.5rem)] leading-[1.02]">{verdict.title}</p>
              <p className="mt-2 font-record text-[1.0625rem] leading-normal text-ink/85">{verdict.claim}</p>
            </div>
            <div data-report="standing" className="pt-1">
              <Stamp label={STANDING_LABEL[verdict.standing]} tone={verdict.standing} size="lg" />
            </div>
          </div>
          <p data-report="reason" className="mt-4 font-record text-[1.0625rem] leading-normal">
            <span className="font-voice text-[0.8125rem] tracking-[0.06em] text-ink/75">Historians: </span>
            {verdict.standingReason}
          </p>
        </section>

        {/* 2. */}
        <ReportSection name="relied-on" heading="What you relied on">
          {report.reliedOn.length === 0 ? (
            <p className={EMPTY_CLASSES}>You pinned no files to this theory.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {report.reliedOn.map(entry => (
                <li key={entry.evidenceId} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className={ITEM_META_CLASSES}>{numberOf(entry.evidenceId)}</span>
                  <span className={ITEM_TITLE_CLASSES}>{entry.title}</span>
                  {/* A file pinned without being opened shows as sealed: its status is earned by opening it. */}
                  {entry.status === null ? (
                    <Stamp label="Sealed" tone="sealed" />
                  ) : (
                    <Stamp label={STATUS_LABEL[entry.status]} tone={entry.status} />
                  )}
                </li>
              ))}
            </ul>
          )}
        </ReportSection>

        {/* 3. */}
        <ReportSection name="pins" heading="Your pins, and what historians say">
          {report.pins.length === 0 ? (
            <p className={EMPTY_CLASSES}>You didn't pin any files.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {report.pins.map(pin => (
                <li key={pin.evidenceId} data-reading={pin.reading}>
                  <p className="flex flex-wrap items-baseline gap-x-2">
                    <span className={ITEM_META_CLASSES}>{numberOf(pin.evidenceId)}</span>
                    <span className={ITEM_TITLE_CLASSES}>{pin.title}</span>
                    <span className="font-voice text-[0.8125rem] text-ink/80">
                      <span aria-hidden="true">→ </span>
                      <span className="sr-only">pinned to </span>
                      {pinTargetTitle(caseData, pin.target)}
                    </span>
                  </p>
                  <p className="mt-1 font-voice text-[0.875rem] text-ink">{READING_LABEL[pin.reading]}</p>
                  <p className="mt-0.5 font-record text-[1rem] leading-normal text-ink/85">{pin.note}</p>
                </li>
              ))}
            </ul>
          )}
        </ReportSection>

        {/* 4. */}
        <ReportSection name="against" heading="Against your verdict">
          {report.againstVerdict.length === 0 ? (
            <p className={EMPTY_CLASSES}>None of the files you opened count against it.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {report.againstVerdict.map(entry => (
                <li key={entry.evidenceId}>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className={ITEM_META_CLASSES}>{numberOf(entry.evidenceId)}</span>
                    <span className={ITEM_TITLE_CLASSES}>{entry.title}</span>
                    <Stamp label={STATUS_LABEL[entry.status]} tone={entry.status} />
                  </p>
                  <p className="mt-1 font-record text-[1rem] leading-normal text-ink/85">{entry.note}</p>
                </li>
              ))}
            </ul>
          )}
        </ReportSection>

        {/* 5. Each missed file is a link to open it now. Its status stays hidden until it is opened. */}
        <ReportSection name="never-opened" heading="What you never opened">
          {report.neverOpened.length === 0 ? (
            <p className={EMPTY_CLASSES}>You opened every file that bears on it.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {report.neverOpened.map(entry => (
                <li key={entry.evidenceId} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <Link
                    to={`${base}/files/${entry.evidenceId}`}
                    className="rounded-[0.12em] font-record text-[1.0625rem] leading-snug text-record underline decoration-record/45 underline-offset-[0.2em] transition-[text-decoration-color] duration-150 ease-out hover:decoration-record focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
                  >
                    <span className="font-voice text-[0.8125rem] tabular-nums">{numberOf(entry.evidenceId)}</span>{' '}
                    {entry.title}
                  </Link>
                  <span className="font-voice text-[0.8125rem] text-ink/80">
                    {entry.link === 'supports' ? 'supports your verdict' : 'counts against it'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ReportSection>

        {/* 6. */}
        <ReportSection name="legends" heading="Legends you trusted">
          <p data-report="legends-line" className="font-voice text-[1rem] text-ink">
            {report.legendsTrusted.length > 0
              ? 'You trusted a legend. Happens to the best of us.'
              : 'Not one legend got past you.'}
          </p>
          {report.legendsTrusted.length > 0 && (
            <ul className="mt-3 flex flex-col gap-4">
              {report.legendsTrusted.map(entry => (
                <li key={entry.evidenceId}>
                  <p className="flex flex-wrap items-baseline gap-x-2">
                    <span className={ITEM_META_CLASSES}>{numberOf(entry.evidenceId)}</span>
                    <span className={ITEM_TITLE_CLASSES}>{entry.title}</span>
                    <span className="font-voice text-[0.8125rem] text-ink/80">
                      <span aria-hidden="true">→ </span>
                      <span className="sr-only">pinned to </span>
                      {pinTargetTitle(caseData, entry.theoryId)}
                    </span>
                  </p>
                  <p className="mt-1 font-record text-[1rem] leading-normal text-ink/85">
                    <span className="font-voice text-[0.8125rem] tracking-[0.06em] text-ink/75">Where it came from: </span>
                    {entry.origin}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </ReportSection>

        {/* 7. */}
        <ReportSection name="historians" heading="Where historians stand">
          <ul className="flex flex-col gap-4">
            {report.historiansStand.theories.map(theory => (
              <li key={theory.theoryId}>
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-legend text-[1.375rem] leading-none">{theory.title}</span>
                  <Stamp label={STANDING_LABEL[theory.standing]} tone={theory.standing} />
                </p>
                <p className="mt-1 font-record text-[1rem] leading-normal text-ink/85">{theory.standingReason}</p>
              </li>
            ))}
          </ul>
          <div data-report="summary" className="mt-6 flex flex-col gap-3 font-record text-[1.0625rem] leading-[1.6]">
            {report.historiansStand.summary.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </ReportSection>

        <nav aria-label="After the report" className="flex flex-col gap-3 border-t border-ink/15 pt-6 sm:flex-row sm:flex-wrap sm:items-center">
          {confirming ? (
            <div role="group" aria-labelledby="reopen-question" className="flex flex-wrap items-center gap-3">
              <p id="reopen-question" className="font-voice text-[0.9375rem] text-ink">
                Are you sure? Your pins will be cleared.
              </p>
              <button type="button" autoFocus onClick={reopen} className={`${ACTION_CLASSES} bg-rust text-paper hover:bg-ink`}>
                Yes, reopen it
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className={`${ACTION_CLASSES} border border-ink/30 text-ink hover:bg-ink/5`}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className={`${ACTION_CLASSES} border border-ink/30 text-ink hover:bg-ink/5`}
            >
              Reopen the case
            </button>
          )}
          <Link to="/" className={`${ACTION_CLASSES} text-record underline underline-offset-4 hover:text-ink`}>
            Back to all cases
          </Link>
        </nav>
      </article>
      {/* The PDF is downloaded from the action bar's icon (ui-pass brief, 3); a browser that cannot says so here. */}
      <p aria-live="polite" className="relative z-[21] mx-auto mt-4 min-h-5 max-w-3xl text-center font-voice text-[0.8125rem] text-ghost-night lg:max-w-6xl">
        {pdfNote}
      </p>
      <CaseCredits playlists={caseData.theme.playlists} />
      <SiteFooter caseData={caseData} />
      <Lamp still narrow={narrow} />
    </main>
  );
}

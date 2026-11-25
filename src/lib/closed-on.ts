// src/lib/closed-on.ts
// The day a case was closed (quick fixes, 5), for its certificate ("Closed 25 November 2026", and the case number,
// which comes from the name and this day). Kept in localStorage under "histor:closed-on:{caseId}" as YYYY-MM-DD,
// written as the case closes. Without storage, or for a case closed before this was kept, it is today.
import { certDay } from '@/lib/certificate';

const key = (caseId: string) => `histor:closed-on:${caseId}`;

/** Remembers that the case closed on `date` (today by default). Fails silently. */
export function saveClosedOn(caseId: string, date: Date = new Date()): void {
  try {
    localStorage.setItem(key(caseId), certDay(date));
  } catch {
    // Storage unavailable or full: the certificate says today.
  }
}

/** The day the case closed, YYYY-MM-DD; today when it was not kept. */
export function loadClosedOn(caseId: string, today: Date = new Date()): string {
  try {
    const saved = localStorage.getItem(key(caseId)) ?? '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(saved)) {
      return saved;
    }
  } catch {
    // Fall through to today.
  }
  return certDay(today);
}

/** A YYYY-MM-DD day as a local Date (noon, so no time zone moves it to another day). */
export function dayAsDate(day: string): Date {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date, 12);
}

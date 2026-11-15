// src/lib/case-years.ts
// The years of a case as shown on the title card and on Home: "1872", or "1872 – 1873" when the case spans years.

export function formatCaseYears(year: number, yearEnd?: number): string {
  return yearEnd !== undefined && yearEnd > year ? `${year} – ${yearEnd}` : String(year);
}

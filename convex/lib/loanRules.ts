// Pure loan rules: no database, no clock of their own. Every date is a UTC calendar
// date in YYYY-MM-DD form, so string comparison is date comparison.

export type StoredLoanStatus = "pending" | "approved" | "declined" | "cancelled" | "returned";
export type LoanStatus = StoredLoanStatus | "overdue";
export type Actor = "owner" | "borrower";

export const MAX_LOAN_DAYS = 30;

const TRANSITIONS: Record<string, { to: StoredLoanStatus; by: Actor }[]> = {
  pending: [
    { to: "approved", by: "owner" },
    { to: "declined", by: "owner" },
    { to: "cancelled", by: "borrower" },
  ],
  approved: [{ to: "returned", by: "owner" }],
};

export function canTransition(from: StoredLoanStatus, to: StoredLoanStatus, by: Actor): boolean {
  return (TRANSITIONS[from] ?? []).some((t) => t.to === to && t.by === by);
}

export function transitionError(from: StoredLoanStatus, to: StoredLoanStatus, by: Actor): string | null {
  if (canTransition(from, to, by)) return null;
  if ((TRANSITIONS[from] ?? []).some((t) => t.to === to)) {
    return by === "owner" ? "Only the borrower can do that." : "Only the owner can do that.";
  }
  return `This request is already ${from}.`;
}

export function todayUtc(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Inclusive day count: the same start and end date is one day. */
export function loanDays(startDate: string, endDate: string): number {
  const ms = Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`);
  return Math.round(ms / 86_400_000) + 1;
}

export function requestDatesError(startDate: string, endDate: string, today: string): string | null {
  if (!isIsoDate(startDate) || !isIsoDate(endDate)) return "Dates must look like 2026-11-24.";
  if (startDate < today) return "Start date can't be in the past.";
  if (endDate < startDate) return "End date must be on or after the start date.";
  if (loanDays(startDate, endDate) > MAX_LOAN_DAYS) return `Loans can last at most ${MAX_LOAN_DAYS} days.`;
  return null;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

/** Inclusive ranges: a loan ending on the 24th clashes with one starting on the 24th. */
export function rangesOverlap(a: DateRange, b: DateRange): boolean {
  return a.startDate <= b.endDate && b.startDate <= a.endDate;
}

export function findOverlap<T extends DateRange>(range: DateRange, others: readonly T[]): T | undefined {
  return others.find((o) => rangesOverlap(range, o));
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "24–26 Nov", "30 Nov–2 Dec", "24 Nov" — the voice used in error messages. */
export function formatRange({ startDate, endDate }: DateRange): string {
  const [, sm, sd] = startDate.split("-").map(Number);
  const [, em, ed] = endDate.split("-").map(Number);
  if (startDate === endDate) return `${sd} ${MONTHS[sm - 1]}`;
  if (sm === em) return `${sd}–${ed} ${MONTHS[em - 1]}`;
  return `${sd} ${MONTHS[sm - 1]}–${ed} ${MONTHS[em - 1]}`;
}

export function alreadyLentError(toolName: string, clash: DateRange): string {
  return `The ${toolName.toLowerCase()} is already lent for ${formatRange(clash)}.`;
}

export function isOverdue(loan: { status: StoredLoanStatus; endDate: string }, today: string): boolean {
  return loan.status === "approved" && loan.endDate < today;
}

export function isOutToday(loan: { status: StoredLoanStatus } & DateRange, today: string): boolean {
  return loan.status === "approved" && loan.startDate <= today && today <= loan.endDate;
}

export function displayStatus(loan: { status: StoredLoanStatus; endDate: string }, today: string): LoanStatus {
  return isOverdue(loan, today) ? "overdue" : loan.status;
}

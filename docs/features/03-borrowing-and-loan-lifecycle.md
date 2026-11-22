# 03 — Borrowing and the loan lifecycle

**Status:** delivered · **Requirements:** FR-2, FR-4 · **Stories:** US-12, US-21, US-22

## Goal

A borrower asks for a tool for specific dates; the owner approves or declines; the owner marks it returned. Every step is checked on the server and nothing can double-book a tool.

## Scope

- `loans` table with the tool, both parties, dates and status; `ownerId` copied from the tool.
- Pure rules in `convex/lib/loanRules.ts`: transitions, date checks, overlap, derived overdue and on-loan.
- Mutations: `request`, `approve`, `decline`, `cancel`, `markReturned`.
- `loans.booked` feeds the calendar with approved ranges (dates only).
- Collect and return calendars in `RequestForm` / `DateRangePicker`.

## Rules

- 1 to 30 days, inclusive; start today or later; real calendar dates.
- Not your own tool; one pending request per borrower per tool.
- No overlap with an approved loan, checked on request and again on approval.
- Owner: approve, decline, mark returned. Borrower: cancel while pending. Nothing else.
- Each state change schedules a notification to the other party in the same mutation.

## Plan

1. Write `loanRules.ts` with tests first (transitions table, date and overlap edges).
2. Add `loans` with the owner, borrower, tool and status indexes.
3. Write the mutations on top of `requireUser` and `requireLoanParty`.
4. Build the calendar, request dialog and request cards.

## Acceptance criteria

- Approving a loan that overlaps an approved one fails with "The drill is already lent for 24–26 Nov."
- A borrower cannot approve; an owner cannot cancel; a returned loan cannot change.
- Booked dates are greyed out on the calendar.

## Files

`convex/lib/loanRules.ts`, `convex/loans.ts`, `convex/schema.ts`, `components/RequestForm.tsx`, `components/DateRangePicker.tsx`, `components/RequestCard.tsx`, `lib/dates.ts`

## Verification

`tests/loanRules.test.ts`, `tests/dateRange.test.ts`, `tests/access.test.ts` (loans block).

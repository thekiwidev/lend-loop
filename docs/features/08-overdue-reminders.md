# 08 — Overdue reminders (n8n workflow 2)

**Status:** delivered · **Requirements:** FR-9, FR-10 · **Stories:** US-23, US-24

## Goal

Every day, each borrower with an overdue loan gets one reminder, and the app records that it was sent.

## Flow

1. n8n's schedule trigger fires daily at 09:00 UTC (plus a manual "Run now" trigger).
2. It signs and calls `GET /automation/overdue`.
3. Convex returns approved loans whose end date is before today and that have no `sent` reminder for today: `loanId`, `idempotencyKey` (`overdue:<loanId>:<YYYY-MM-DD>`), `borrowerEmail`, and the finished `email`.
4. n8n splits the list and sends each reminder through Resend with the idempotency key.
5. Success or failure, it signs and POSTs an ack per loan to `/automation/ack`.
6. The borrower's request card shows "Reminder sent 2 days ago"; a failure shows "Reminder failed" and lists on `/admin/automations`.

## Idempotency

- The key holds the date, so there is at most one reminder per loan per day.
- Running the workflow twice the same day returns nothing the second time (a `sent` row exists) and Resend drops a repeated key.
- A failed reminder is retried by the next run the same day; a later success upgrades the row from failed to sent.

## Failure handling

- Each send failure goes down an error branch to a `failed` ack, so one bad address does not stop the others.
- The fetch and ack nodes retry three times; a workflow-level failure runs the error handler.

## Files

`convex/automation.ts` (`overdueLoans`, `recordEvent`), `convex/http.ts`, `convex/lib/emails.ts` (`overdueEmail`), `n8n/overdue-reminders.json`

## Verification

`tests/access.test.ts` (`recordEvent` idempotency and failed-to-sent upgrade). Manual: with the seeded overdue loan, run the workflow twice; one email, one row.

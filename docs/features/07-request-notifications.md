# 07 — Request notifications (n8n workflow 1)

**Status:** delivered · **Requirements:** FR-8, FR-10 · **Stories:** US-13, US-23

## Goal

When a request is made or changes status, the person who did not act gets one email saying what happened, with a link back to the right page.

## Who hears what

| Change | Actor | Recipient |
| --- | --- | --- |
| Request made | Borrower | Owner |
| Approved, declined | Owner | Borrower |
| Cancelled by borrower | Borrower | Owner |
| Cancelled because the listing was removed | Owner or admin | Borrower |
| Marked returned | Owner | Borrower |

## Flow

1. The mutation that changes the loan calls `scheduleNotification`, so the change and the job commit together.
2. `automation.sendRequestNotification` builds a minimal payload: `eventId` (`loan:<id>:<status>`), `loanId`, `status`, `recipientEmail`, and the ready-made `email` (`subject`, `text`, `html`) from `convex/lib/emails.ts`.
3. It POSTs the payload, HMAC-signed, to `N8N_REQUEST_WEBHOOK_URL`.
4. n8n verifies the signature (401 if wrong), sends through Resend with `Idempotency-Key: eventId`, signs and POSTs an ack to `/automation/ack`, then answers 200.
5. Convex records one `sent` event; the request card shows "Email sent".

## Data minimisation

n8n receives one email address and the finished copy. It never sees the other person's address, the tool description or any IDs beyond the loan.

## Failure handling

- Convex retries the hand-off after 1, 5 and 15 minutes, then records a `failed` event ("Notification failed" on the card, a row on `/admin/automations`).
- n8n retries Resend and the ack three times, five seconds apart. A workflow failure runs the error handler ([09](09-integration-security-and-reliability.md)).
- Sample neighbours (`noEmail` or `@example.com`) are recorded as sent without calling n8n.

## Files

`convex/automation.ts`, `convex/lib/emails.ts`, `convex/http.ts`, `n8n/request-notification.json`

## Verification

`tests/access.test.ts` (signed minimal payload, retries then one failed event, sample neighbours skipped), `tests/emails.test.ts`. Manual: request a tool from a second account and check the owner's inbox.

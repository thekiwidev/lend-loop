# 09 — Integration security, reliability and activity

**Status:** delivered · **Requirements:** FR-10, FR-11 · **Stories:** US-24, US-34

## Goal

Make the Convex and n8n integration safe to expose and impossible to fail silently.

## Signing, both directions

- HMAC-SHA256 over `timestamp.METHOD.path.rawBody` with the shared `LENDLOOP_N8N_SECRET`.
- Headers `X-LendLoop-Timestamp` and `X-LendLoop-Signature`.
- Method and path in the signed string stop a captured signature being reused on another endpoint; the five-minute window stops it being replayed later.
- Convex verifies in constant time and logs only the reason for a rejection. n8n verifies with a Crypto node and an IF node.

## Secrets

- Convex deployment env: `LENDLOOP_N8N_SECRET`, `N8N_REQUEST_WEBHOOK_URL`, `CLERK_SECRET_KEY`, `CLERK_JWT_ISSUER_DOMAIN`, `APP_URL`.
- n8n container env (`.env.n8n`, git-ignored): the signing secret, `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_ALERT_EMAIL`, `CONVEX_SITE_URL`.
- Workflows read them through `$env`, so the exported JSON holds no secret. `.env.example` and `.env.n8n.example` document every key.

## Idempotent write-back

- Every email has a stable key: `loan:<id>:<status>`, `overdue:<loanId>:<date>`, `error:<executionId>`.
- The key goes to Resend as `Idempotency-Key` and back to Convex in the ack.
- `recordEvent` keeps one row per key inside a serialisable mutation; failed may become sent, sent never changes.

## Retries and the error workflow

| Layer | Behaviour |
| --- | --- |
| Convex to n8n | Retry after 1, 5, 15 minutes; then a `failed` event. |
| n8n HTTP nodes | Three tries, five seconds apart. |
| n8n workflow failure | `error-handler.json` records a `workflow_error` in Convex and emails the admin. |
| Visibility | Failed events show on request cards, on `/admin/automations`, and in the admin overview count. |

## Activity on each loan (bonus)

`loans.myRequests` and `loans.incoming` attach the latest three automation events per loan. `ActivityLine` renders them in relative time: "Email sent 2 hours ago", "Reminder sent 2 days ago", "Notification failed".

## Files

`convex/lib/signature.ts`, `convex/http.ts`, `convex/automation.ts`, `n8n/*.json`, `docker-compose.yml`, `components/ActivityLine.tsx`, `lib/activity.ts`, `.env.example`, `.env.n8n.example`

## Verification

`tests/signature.test.ts`; `tests/access.test.ts` (recordEvent, payload, retries); `grep -iE "re_[a-z0-9]{8}" n8n/*.json` finds nothing. Manual: wrong secret in `.env.n8n` gives 401, three retries, then "Notification failed".

# LendLoop — Technical Specification

How LendLoop will be built to meet [PRD.md](PRD.md). Each section names the files that will own it.

## 1. Architecture

```text
 Browser
   |  Clerk session cookie                       Clerk (hosted)
   v                                               ^  sign-in, JWTs, Backend API
 Next.js (App Router)  -----------------------------'
   |  proxy.ts: route gate before render (UX only)
   |  pages: live Convex queries with the Clerk "convex" JWT attached
   v
 Convex  (queries, mutations, actions, HTTP actions)
   |  every public function checks identity, ownership and role
   |  loan change -> scheduled action -> signed POST to n8n
   v                                         ^ signed POST /automation/ack
 n8n (Docker)                                | signed GET  /automation/overdue
   |  verifies signature, sends email, acks -'
   v
 Resend  -> inboxes
```

| Concern | Owner |
| --- | --- |
| Page routing and route protection | `app/`, `proxy.ts` |
| Auth provider wiring, JWT template | `app/providers.tsx`, `convex/auth.config.ts` |
| Data model | `convex/schema.ts` |
| Access checks | `convex/lib/access.ts` |
| Loan rules (pure) | `convex/lib/loanRules.ts` |
| Email copy (pure) | `convex/lib/emails.ts` |
| Signing (pure) | `convex/lib/signature.ts` |
| Outbound automation, idempotent write-back | `convex/automation.ts` |
| Inbound automation endpoints | `convex/http.ts` |
| Admin counts and paging | `convex/lib/counts.ts`, `convex/lib/pages.ts`, `convex/convex.config.ts` |
| Workflows | `n8n/*.json`, `docker-compose.yml` |
| UI components | `components/` (one per file), `app/tokens.css`, `app/components.css` |

## 2. Data model (`convex/schema.ts`)

| Table | Fields | Indexes | Notes |
| --- | --- | --- | --- |
| `users` | `clerkId`, `name`, `email`, `trustedLender`, `trustedBorrower?`, `noEmail?` | `by_clerkId` | No role column: the role lives only in Clerk claims. `noEmail` marks sample neighbours. |
| `tools` | `ownerId`, `name`, `category`, `condition`, `icon`, `description`, `removedAt?` | `by_category`, `by_owner` | Soft delete through `removedAt`. Availability is derived. |
| `loans` | `toolId`, `ownerId`, `borrowerId`, `startDate`, `endDate`, `status`, `returnedAt?` | `by_tool`, `by_tool_status`, `by_borrower(_status)`, `by_owner(_status)`, `by_status` | `ownerId` is copied from the tool so an access check is one read. Dates are `YYYY-MM-DD` UTC strings. |
| `automationEvents` | `loanId?`, `kind`, `idempotencyKey`, `status`, `at`, `detail?` | `by_idempotencyKey`, `by_status`, `by_loan` | One row per idempotency key. `kind`: `request_notification`, `overdue_reminder`, `workflow_error`. `status`: `sent`, `failed`. |

Enumerations: category `power | garden | kitchen | camping | other`; condition `new | good | fair | worn`; loan status `pending | approved | declined | cancelled | returned` (plus derived `overdue` for display).

## 3. Access control

### 3.1 Two gates

1. **`proxy.ts` (UX gate).** Signed-out visitors to `/app*` or `/admin*` go to `/sign-in?redirect_url=…`; signed-in users on `/`, `/sign-in`, `/sign-up` go to `/app`; non-admins on `/admin*` go to `/app`. The role is read from a `role` session-token claim, falling back to Clerk's API on `/admin` only.
2. **Convex (security gate).** Every public query and mutation starts with one helper from `convex/lib/access.ts`:

| Helper | Guarantees |
| --- | --- |
| `requireIdentity` | A valid Clerk JWT. |
| `requireUser` | Identity plus an existing `users` row. Returns `isAdmin` from the `role` claim. |
| `requireAdmin` | `requireUser` and `role === "admin"`. |
| `requireToolOwner(toolId)` | The tool exists, is not removed, and belongs to the caller. |
| `requireLoanParty(loanId)` | The caller is the loan's owner or borrower; returns which. |

The role is read only from the signed claim (`hasAdminRole`), never from arguments or the database.

### 3.2 Permission matrix

| Function | Visitor | User | Admin |
| --- | --- | --- | --- |
| `tools.listPublic` | yes | yes | yes |
| `tools.list`, `tools.mine`, `loans.booked`, `loans.dashboardStats`, `users.me` | no | yes | yes |
| `tools.create` | no | yes | yes |
| `tools.update`, `tools.remove` | no | own tool | own tool |
| `admin.removeTool` | no | no | any tool |
| `loans.request` | no | not own tool | not own tool |
| `loans.approve`, `loans.decline`, `loans.markReturned` | no | owner of the loan's tool | owner of the loan's tool |
| `loans.cancel` | no | borrower of the loan | borrower of the loan |
| `loans.myRequests`, `loans.incoming` | no | own | own |
| `admin.stats`, `admin.loans`, `admin.tools`, `admin.users`, `admin.workflowErrors`, `admin.setTrust` | no | no | yes |

Admins act on loans only as a party, like anyone else: the admin role grants oversight, not the right to approve other people's loans.

## 4. Loan state machine (`convex/lib/loanRules.ts`)

```text
            owner approves            owner marks returned
 pending  ------------------>  approved  ------------------>  returned
    |  \
    |   \ owner declines   -> declined
    |
    \ borrower cancels      -> cancelled   (also: owner removes the listing)
```

- `canTransition(from, to, actor)` and `transitionError` are the only place transitions are defined.
- `requestDatesError` checks real calendar dates, start not in the past, end on or after start, at most `MAX_LOAN_DAYS = 30`.
- `rangesOverlap` treats ranges as inclusive. `findOverlap` is run against approved loans on request and again on approval (excluding the loan itself).
- `isOverdue`, `isOutToday` and `displayStatus` derive status from today's UTC date.
- The module imports nothing from Convex so it is unit-tested directly.

## 5. Convex API

### Tools (`convex/tools.ts`)
- `listPublic()`: newest 24 non-removed tools, filtered to those available today; returns `name`, `category`, `icon` only.
- `list({ category?, paginationOpts })`: paginated listed tools with owner name, trusted-lender flag, availability, `isMine` and `requestPending`.
- `mine({ paginationOpts })`: the caller's listings with availability.
- `create(tool)`, `update({ toolId, ...tool })`: trimmed and validated (`name` 1–80, `description` up to 500, `icon` from the catalogue in `lib/toolIcons.ts`).
- `remove({ toolId })`: soft delete; refused with an approved loan; cancels pending requests and notifies their borrowers.

### Loans (`convex/loans.ts`)
- `request({ toolId, startDate, endDate })`, `approve`, `decline`, `cancel`, `markReturned({ loanId })`. Each state change schedules its notification in the same mutation.
- `myRequests`, `incoming({ filter: all | pending | active | closed, paginationOpts })`: request cards with the other party's name, trusted-borrower flag, derived status, days and the last three automation events.
- `dashboardStats()`: on loan now (street-wide), waiting on you, overdue (yours).
- `booked({ toolId })`: approved ranges from today on, dates only, for the calendar.

### Users (`convex/users.ts`)
- `sync()` action: reads name and email from Clerk's Backend API (falls back to JWT claims) and upserts the row. Called by the app shell on each visit.
- `me()`: the caller's profile, trust marks, admin flag and sidebar counts.

### Admin (`convex/admin.ts`)
- `stats()`, `loans`, `tools`, `users`, `workflowErrors({ page, pageSize })`: numbered pages backed by aggregate counts.
- `setTrust({ userId, lender?, borrower? })`.
- `removeTool({ toolId })`: same rules as `tools.remove`, for any owner's listing.

## 6. Automation contract (Convex and n8n)

### 6.1 Signing (`convex/lib/signature.ts`)
- HMAC-SHA256 with `LENDLOOP_N8N_SECRET` over `` `${timestamp}.${METHOD}.${path}.${rawBody}` ``.
- Headers `X-LendLoop-Timestamp` (Unix seconds) and `X-LendLoop-Signature` (hex).
- Refused when missing, older or newer than 300 seconds, or mismatched. Convex compares in constant time and logs only the reason.

### 6.2 Request notification (Convex to n8n)
- Trigger: `scheduleNotification(ctx, loanId, status, recipient)` inside the mutation that changed the loan.
- `automation.sendRequestNotification` builds the payload with `notificationPayload` and POSTs it signed to `N8N_REQUEST_WEBHOOK_URL` (30 s timeout).
- Payload: `{ eventId: "loan:<id>:<status>", loanId, status, recipientEmail, email: { subject, text, html } }`. Nothing else about either person.
- Sample neighbours (`noEmail` or `@example.com`) are recorded as sent without calling n8n.
- On a non-2xx or network error, retry after 1, 5 and 15 minutes, then record a `failed` event.

### 6.3 Write-back (n8n to Convex)
- `POST /automation/ack` with `{ idempotencyKey, loanId?, kind, status, detail? }`, signed.
- `automation.recordEvent` keeps one row per key. A `failed` row may become `sent`; a `sent` row never changes. Serialisable mutations make the check-and-insert race-free.

### 6.4 Overdue feed
- `GET /automation/overdue`, signed over an empty body.
- Returns approved loans past their end date that have no `sent` reminder for today: `{ loanId, idempotencyKey: "overdue:<loanId>:<today>", borrowerEmail, email }`.

### 6.5 Workflows (`n8n/`)

| File | Trigger | Steps |
| --- | --- | --- |
| `request-notification.json` | Webhook `POST /webhook/lendloop-request` | Compute HMAC, compare, 401 if invalid; send via Resend with `Idempotency-Key: eventId`; sign and POST ack; respond 200. |
| `overdue-reminders.json` | Daily 09:00 UTC, plus manual "Run now" | Sign and GET the feed; split; send each reminder (errors go to a failure branch, not a stop); sign and POST an ack per loan. |
| `error-handler.json` | Error Trigger | Record a `workflow_error` failure in Convex (`error:<executionId>`); email `ADMIN_ALERT_EMAIL`. |

Every HTTP node retries three times, five seconds apart. Both main workflows set the error handler as their error workflow. Secrets come from the container env (`$env`), so exported JSON holds none.

## 7. Paging and counts

- Neighbour lists use Convex `paginate` with "Show more", twelve at a time.
- Admin tables use numbered pages. `@convex-dev/aggregate` keeps a running count per table, keyed by `_creationTime` (`eventCount` namespaced by status). `pageWindow` in `convex/lib/pages.ts` turns a page number into the key to start from, so a page reads only its own rows.
- All inserts into counted tables go through `insertLoan`, `insertTool`, `insertUser`, `insertEvent`, and event status changes through `patchEvent`. `seed:rebuildAdminCounts` rebuilds counts after an import.

## 8. Environment

| Variable | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Next.js | Clerk |
| `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CONVEX_SITE_URL`, `CONVEX_DEPLOYMENT` | Next.js | Convex |
| `CLERK_JWT_ISSUER_DOMAIN`, `CLERK_SECRET_KEY` | Convex | Token issuer; profile lookup in `users.sync` |
| `LENDLOOP_N8N_SECRET` | Convex and n8n | Shared signing secret |
| `N8N_REQUEST_WEBHOOK_URL`, `APP_URL` | Convex | Webhook target; links in emails |
| `N8N_ENCRYPTION_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_ALERT_EMAIL`, `CONVEX_SITE_URL` | n8n | n8n storage, email sending, alerts, Convex address |

`.env.example` and `.env.n8n.example` list every key; real files are git-ignored.

## 9. Testing

| Test file | Covers |
| --- | --- |
| `tests/loanRules.test.ts` | Every allowed and refused transition, date validation, overlap edges, derived overdue. |
| `tests/dateRange.test.ts` | Calendar range selection helpers. |
| `tests/signature.test.ts` | Known HMAC vector; tampered body, wrong path, method or secret; expired timestamp. |
| `tests/emails.test.ts` | Copy per status and recipient, readable dates, HTML escaping. |
| `tests/toolIcons.test.ts` | Icon suggestions and catalogue completeness. |
| `tests/pages.test.ts` | Page window maths. |
| `tests/access.test.ts` | convex-test: ownership, admin-only functions, public list shape, idempotent `recordEvent`, signed minimal payload, retry exhaustion. |

Gates: `bun run typecheck`, `bun run lint`, `bun run test`.

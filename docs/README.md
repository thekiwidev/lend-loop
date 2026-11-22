# LendLoop documentation

The plan LendLoop is built from, written as the product and engineering documents for the first release. Setup and operation live at the repository root: [README.md](../README.md) (local setup, architecture, security), [DEPLOY.md](../DEPLOY.md) (production deployment) and [PRODUCTION.md](../PRODUCTION.md) (what changes or gets added next).

| Document | What it answers |
| --- | --- |
| [PRD.md](PRD.md) | What LendLoop does, for whom, the rules it keeps, what is out of scope, and how success is measured. |
| [SPEC.md](SPEC.md) | How it is built: architecture, data model, access control, loan state machine, Convex API, the n8n contract, environment and tests. |
| [DESIGN.md](DESIGN.md) | How it looks and behaves: tokens, layout, pages, components, status vocabulary, accessibility, email design. |
| [features/](features/) | One plan per feature, in build order, each with scope, rules, steps, acceptance criteria, files and verification. |

## Feature plans

1. [Foundation, sign-in and roles](features/01-foundation-and-auth.md)
2. [Tool listings](features/02-tool-listings.md)
3. [Borrowing and the loan lifecycle](features/03-borrowing-and-loan-lifecycle.md)
4. [Signed-in views](features/04-signed-in-views.md)
5. [Public landing page](features/05-public-landing.md)
6. [Admin console](features/06-admin-console.md)
7. [Request notifications (n8n workflow 1)](features/07-request-notifications.md)
8. [Overdue reminders (n8n workflow 2)](features/08-overdue-reminders.md)
9. [Integration security, reliability and activity](features/09-integration-security-and-reliability.md)
10. [Pagination and admin counts](features/10-pagination-and-counts.md)
11. [Sample data and test logins](features/11-sample-data.md)
12. [Production deployment](features/12-production-deployment.md)

## Requirement coverage

| Assignment requirement | Where it is met |
| --- | --- |
| Public page: name, tagline, available tools (name and category only), Clerk sign-in button | `app/page.tsx`, `tools.listPublic` |
| Signed-in: list a tool (name, category, condition, description) | `tools.create`, `ToolForm` |
| Request a tool for a date range | `loans.request`, `RequestForm` |
| Approve or decline on own tools; mark returned | `loans.approve`, `loans.decline`, `loans.markReturned` |
| All tools with availability, category filter | `/app`, `tools.list` |
| My listings, My requests, Incoming requests | `/app/listings`, `/app/requests`, `/app/incoming` |
| Admin: remove any listing, view all loans, Trusted Lender | `admin.removeTool`, `admin.loans`, `admin.setTrust` |
| User: own listings only, own loans only | `requireToolOwner`, `requireLoanParty` in every function |
| RBAC enforced in Convex | `convex/lib/access.ts`, `tests/access.test.ts` |
| Request notification workflow | `n8n/request-notification.json`, `automation.sendRequestNotification` |
| Daily overdue reminders with write-back | `n8n/overdue-reminders.json`, `GET /automation/overdue`, `POST /automation/ack` |
| Signed payloads both ways | `convex/lib/signature.ts`, Crypto + IF nodes in n8n |
| Secrets in env, not code or workflow JSON | `.env*.example`, `$env` in n8n |
| Idempotent write-backs | `automation.recordEvent`, Resend `Idempotency-Key` |
| Retries and an error workflow | Convex 1/5/15-minute retries, n8n node retries, `n8n/error-handler.json` |
| Bonus: automation activity on each loan | `ActivityLine` on request cards, last automation on `/admin/loans` |
| README, docker-compose, production note | `README.md`, `docker-compose.yml`, `PRODUCTION.md`, `DEPLOY.md` |

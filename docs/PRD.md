# LendLoop — Product Requirements

**Product:** LendLoop, a neighbourhood tool-lending board
**Tagline:** Borrow what you need. Lend what you don't.
**Stack (fixed):** Next.js App Router, Clerk, Convex, n8n, TypeScript

This document is the plan LendLoop is built from: what the product will do, for whom, and how we will know it works. The technical design is in [SPEC.md](SPEC.md), the visual design in [DESIGN.md](DESIGN.md), and each feature has its own plan under [features/](features/).

## 1. Problem

Most households own tools they use a few times a year: a drill, a ladder, a pressure washer, a tent. Their neighbours buy the same things because there is no easy way to ask. Lending informally works between friends but breaks down on a street: nobody knows what is available, requests get lost in group chats, and items are forgotten and never returned.

## 2. Goal

Give one neighbourhood a shared shed:

1. Anyone can see what the street has to lend, without signing in and without seeing who owns it.
2. Signed-in neighbours list their tools, ask to borrow others' tools for specific dates, and owners approve, decline and mark items returned.
3. Both sides are told about every change by email, and borrowers are reminded every day an item is overdue, without anyone having to remember.
4. Admins keep the board healthy: remove listings, see every loan, and mark reliable neighbours as trusted.

## 3. Users and roles

| Role | Who | Can |
| --- | --- | --- |
| Visitor | Anyone, signed out | See available tools (name, category, icon). Sign in or sign up. |
| User (neighbour) | Any signed-in person | Create, edit and remove their own listings. Request other people's tools. Approve, decline and mark returned on requests for their own tools. Cancel their own pending requests. |
| Admin | A neighbour with `role: "admin"` in Clerk public metadata | Everything a user can, plus remove any listing, view every loan, mark a neighbour as Trusted Lender (and Trusted Borrower), and see failed automations. |

Roles are carried in Clerk-signed claims and enforced in every Convex function. The interface hides what a person cannot do, but never relies on that.

## 4. User stories

### Visitor
- **US-01** As a visitor I see the LendLoop name, tagline and a list of tools available now (name and category only), so I know whether joining is worth it.
- **US-02** As a visitor I press "Sign in to lend or borrow" and land in the app after signing in.

### Lender
- **US-10** As a lender I list a tool with a name, category (power tools, garden, kitchen, camping, other), condition (new, good, fair, worn), short description and an icon.
- **US-11** As a lender I edit or remove my own listings. A listing with an approved loan cannot be removed until it is returned; pending requests on a removed listing are cancelled and the borrower is told.
- **US-12** As a lender I see incoming requests, approve or decline them, and mark an approved loan returned.
- **US-13** As a lender I am emailed when someone asks to borrow my tool or cancels a request.
- **US-14** As a lender I see which requesters an admin has marked as trusted borrowers.

### Borrower
- **US-20** As a borrower I browse every listed tool with its availability (available, or on loan until a date) and filter by category.
- **US-21** As a borrower I request a tool for a date range on a calendar that greys out dates already booked.
- **US-22** As a borrower I see my requests, cancel a pending one, and see when the owner approves, declines or marks it returned.
- **US-23** As a borrower I am emailed when my request changes status, and reminded each day a loan is overdue.
- **US-24** As a borrower I see on each request what the automation did, for example "Email sent 2 hours ago" or "Reminder sent 2 days ago".

### Admin
- **US-30** As an admin I see street-wide numbers: on loan now, pending, overdue, failed automations, totals.
- **US-31** As an admin I see every loan with both parties, dates, status and last automation.
- **US-32** As an admin I see every listing, including removed ones, and remove any listing.
- **US-33** As an admin I mark a neighbour as Trusted Lender and, separately, Trusted Borrower.
- **US-34** As an admin I see every failed automation with a reason, and I am emailed when a workflow fails.

## 5. Functional requirements

| ID | Requirement | Feature plan |
| --- | --- | --- |
| FR-1 | Public page with name, tagline, read-only list of available tools (name and category, no owner details) from Convex, and a Clerk sign-in button. | [05](features/05-public-landing.md) |
| FR-2 | Only signed-in users can list, request, approve, decline and mark returned. | [01](features/01-foundation-and-auth.md), [02](features/02-tool-listings.md), [03](features/03-borrowing-and-loan-lifecycle.md) |
| FR-3 | Listing fields: name, category, condition, short description. | [02](features/02-tool-listings.md) |
| FR-4 | Request a tool for a date range; approve or decline on own tools; mark returned. | [03](features/03-borrowing-and-loan-lifecycle.md) |
| FR-5 | All tools with availability, filterable by category; "My listings", "My requests", "Incoming requests" views. | [04](features/04-signed-in-views.md) |
| FR-6 | Two roles, admin and user, enforced in Convex functions. | [01](features/01-foundation-and-auth.md), [06](features/06-admin-console.md) |
| FR-7 | Admin: remove any listing, view all loans, mark Trusted Lender. | [06](features/06-admin-console.md) |
| FR-8 | Request notification workflow: Convex calls an n8n webhook on request create and status change; n8n notifies the right person with only the fields it needs. | [07](features/07-request-notifications.md) |
| FR-9 | Overdue reminder workflow: daily schedule, fetch overdue loans from a Convex HTTP endpoint, remind each borrower, write status back. | [08](features/08-overdue-reminders.md) |
| FR-10 | Signed payloads both directions, secrets only in env, idempotent write-backs, retries and an error workflow. | [09](features/09-integration-security-and-reliability.md) |
| FR-11 | (Bonus) Recent automation activity on each loan. | [09](features/09-integration-security-and-reliability.md) |

## 6. Business rules

- A loan lasts 1 to 30 days, inclusive of both dates, and cannot start in the past.
- A person cannot borrow their own tool, and cannot have two pending requests for the same tool.
- Approved loans on one tool cannot overlap. Overlap is checked when the request is made and again when it is approved.
- Status moves only along these paths: pending to approved, declined (owner) or cancelled (borrower); approved to returned (owner). Every other move is refused.
- "Overdue" and "on loan" are derived from dates, never stored. A loan is overdue when it is approved and its end date is before today (UTC).
- Removing a listing is a soft delete. It is refused while an approved loan exists.
- The person who did not act is the one who is notified.

## 7. Non-functional requirements

- **Security:** identity, ownership and role checked server-side on every call; no trust in client input; validated and length-limited arguments; HMAC-signed traffic between Convex and n8n with a five-minute replay window; no secrets in code, docs or exported workflows.
- **Data minimisation:** the public list carries no owner fields; emails never reach the browser except the viewer's own; n8n receives one recipient address and ready-made email copy, nothing else about either person.
- **Reliability:** every notification has a stable idempotency key, retried hand-offs never send twice or write twice, and every failure ends up visible to an admin.
- **UX:** minimal, calm layout; light, dark and system themes; usable on a phone; clear empty, loading and error states; plain-English errors.
- **Quality gates:** `bun run typecheck`, `bun run lint` and `bun run test` pass on every change.

## 8. Non-goals (first release)

- Payments, deposits or insurance.
- In-app chat between neighbours.
- Several neighbourhoods or groups in one deployment.
- Managing admins from inside the app (admins are set in the Clerk dashboard).
- Disputes, damage reports, or tool states such as "in repair".
- Push or SMS notifications.

These are candidates for later; see [PRODUCTION.md](../PRODUCTION.md).

## 9. Success measures

- A new neighbour can list a tool in under a minute and request one in under thirty seconds.
- Every request and status change produces exactly one email to the right person, or a visible failure.
- Running the overdue workflow twice on one day sends one reminder per loan.
- No unauthenticated or unauthorised call can read or change data it should not (covered by `tests/access.test.ts`).

## 10. Deliverables

- GitHub repository with the source.
- Exported n8n workflows in `n8n/`.
- `README.md`: local setup including `docker-compose.yml` for n8n, environment variables, architecture, security and data-minimisation decisions.
- `PRODUCTION.md`: what would change to run this in production. `DEPLOY.md`: the production deployment as done.
- This `docs/` folder: requirements, specification, design and one plan per feature.

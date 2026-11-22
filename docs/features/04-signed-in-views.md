# 04 — Signed-in views

**Status:** delivered · **Requirements:** FR-5 · **Stories:** US-20, US-22, US-12

## Goal

Four views that answer a neighbour's four questions: what can I borrow, what have I listed, what have I asked for, and what is waiting on me.

## Scope

| View | Route | Content |
| --- | --- | --- |
| All tools | `/app` | Stats row; every listed tool with availability (available, or on loan until a date), owner and trusted-lender mark; category filter chips; Request, Request sent or Manage per card. |
| My listings | `/app/listings` | The caller's tools with availability, Edit and Remove; List a tool. |
| My requests | `/app/requests` | Requests the caller made, filtered All / Pending / Active / Closed; Cancel on pending; activity line. |
| Incoming requests | `/app/incoming` | Requests for the caller's tools with the same filters; Approve, Decline, Mark returned; trusted-borrower badge; activity line. |

- Availability and overdue are derived from today's date, never stored.
- Lists load twelve at a time with "Show more" (Convex `paginate`), filtered on the server.
- Sidebar counts: listings, incoming pending (highlighted), my pending.

## Plan

1. Write `tools.list`, `tools.mine`, `loans.myRequests`, `loans.incoming`, `loans.dashboardStats`, `users.me`.
2. Build `FilterChips`, `ToolCard`, `RequestList`, `RequestCard`, `StatCard`, `LoadMore`.
3. Build the four pages with loading skeletons, empty states and error banners.

## Acceptance criteria

- Choosing a category shows only that category, loaded from the server.
- A tool out today shows "On loan until <date>".
- Every list stays responsive with hundreds of rows (only one page is read).

## Files

`app/(signed-in)/app/{page,listings/page,requests/page,incoming/page}.tsx`, `convex/tools.ts`, `convex/loans.ts`, `convex/users.ts`, `components/{FilterChips,ToolCard,RequestList,RequestCard,StatCard,LoadMore,EmptyState,Skeleton}.tsx`

## Verification

`tests/access.test.ts` (pagination block: one page at a time, server-side status filter, dashboard counts).

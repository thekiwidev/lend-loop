# 10 — Pagination and admin counts

**Status:** delivered · **Requirements:** FR-5, FR-7 (non-functional: scale)

## Goal

Keep every list fast as the street grows: no page reads more rows than it shows.

## Scope

- **Neighbour lists** (all tools, my listings, my requests, incoming): Convex `paginate`, twelve at a time, "Show more", filters applied in the query.
- **Admin tables**: numbered pages with rows-per-page and go-to-page. `@convex-dev/aggregate` keeps a running count for `loans`, `tools`, `users` and `automationEvents` (namespaced by status). `pageWindow` turns a page number into the creation time to start from, so each page reads only its rows.
- **Counts on dashboards** read active loans (pending, approved) through indexes, never the full history.

## Rules

- Inserts into counted tables go through `insertLoan`, `insertTool`, `insertUser`, `insertEvent`; event status changes through `patchEvent`.
- `seed:rebuildAdminCounts` rebuilds counts after an import.

## Files

`convex/convex.config.ts`, `convex/lib/counts.ts`, `convex/lib/pages.ts`, `lib/usePages.ts`, `components/{PagedTable,Pagination,LoadMore}.tsx`

## Verification

`tests/pages.test.ts`; `tests/access.test.ts` (numbered admin pages; failed-to-sent moves between counts).

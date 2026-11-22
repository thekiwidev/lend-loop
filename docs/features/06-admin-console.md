# 06 — Admin console

**Status:** delivered · **Requirements:** FR-6, FR-7 · **Stories:** US-30 to US-34

## Goal

Give admins oversight of the whole street: remove any listing, see every loan, mark trusted neighbours, and see what automation failed.

## Scope

| Page | Route | Function |
| --- | --- | --- |
| Overview | `/admin` | `admin.stats`: on loan now, pending, overdue, failed automations, totals. |
| All loans | `/admin/loans` | `admin.loans`: tool, owner, borrower, dates, status, last automation. |
| All listings | `/admin/listings` | `admin.tools` including removed rows; `admin.removeTool` behind a confirmation. |
| Neighbours | `/admin/neighbours` | `admin.users` (names only, no emails); `admin.setTrust` from a row menu. |
| Failed automations | `/admin/automations` | `admin.workflowErrors`: kind, time, reason. |

## Rules

- Every function starts with `requireAdmin`.
- `admin.removeTool` follows the owner's removal rules: refused with an approved loan; pending requests cancelled and their borrowers emailed.
- Trusted Lender and Trusted Borrower are independent marks; either or both can be set.
- Admins approve or decline only loans on their own tools, like any user.
- Admin tables never carry email addresses.

## Plan

1. Write the admin queries with numbered paging (see [10](10-pagination-and-counts.md)).
2. Write `setTrust` and `removeTool`; share the removal logic with `tools.remove` (`removeListing`).
3. Build the five pages on `PagedTable`, with `ActionMenu` for trust and a confirmation `Dialog` for removal.
4. Show the trusted-lender shield on tool cards and the trusted-borrower badge on incoming requests.

## Acceptance criteria

- A non-admin calling any `admin.*` function is refused.
- An admin can remove another neighbour's listing; the borrower of a pending request is told.
- An admin cannot remove a listing with an approved loan.

## Files

`convex/admin.ts`, `convex/tools.ts` (`removeListing`), `app/(signed-in)/admin/**`, `components/{PagedTable,DataTable,Pagination,ActionMenu,Dialog,Badge,Avatar}.tsx`

## Verification

`tests/access.test.ts` (admin block: refuses non-admins, admin removal and its approved-loan refusal, trust marks, no emails in rows).

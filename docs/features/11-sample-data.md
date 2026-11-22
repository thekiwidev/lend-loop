# 11 — Sample data and test logins

**Status:** delivered · **Scope:** development only

## Goal

Let a reviewer see a lived-in street in one command, without any email reaching a real inbox.

## Scope

- `bunx convex run seed:run`: sample neighbours, tools across every category, an overdue loan borrowed by you, and an incoming request for you. Runs only on an empty shed.
- `bunx convex run seed:reset`: clears tools, loans, automation events and sample neighbours; real users stay.
- `bun scripts/seed-clerk-users.ts`: creates a Clerk test login per sample neighbour, links it, and writes the logins to the git-ignored `seed-users.local.md`.
- Sample neighbours are flagged `noEmail` and use `example.com`; their notifications are recorded as sent without reaching n8n, and overdue reminders skip them.

## Rules

- Seeds are internal functions and are never run in production.
- Test logins use Clerk's `+clerk_test` addresses and development keys only.

## Files

`convex/seed.ts`, `scripts/seed-clerk-users.ts`, `convex/automation.ts` (`skipsEmail`)

## Verification

`tests/access.test.ts` (seed block, `skipsEmail`, sample notifications recorded without calling n8n).

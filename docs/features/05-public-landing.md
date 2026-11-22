# 05 — Public landing page

**Status:** delivered · **Requirements:** FR-1 · **Stories:** US-01, US-02

## Goal

Show a visitor, without signing in, what the street has to lend, and invite them in.

## Scope

- LendLoop logo and the tagline "Borrow what you need. Lend what you don't."
- A short paragraph and a "Sign in to lend or borrow" button linked to Clerk sign-in.
- A read-only grid of tools available now: name, category and icon only. No owner, no description, no actions.
- Rendered on the server at request time (`fetchQuery` after `connection()`), with a skeleton while loading, an empty state, and an error banner if Convex is unreachable.

## Rules

- `tools.listPublic` needs no sign-in and returns only `name`, `category`, `icon`.
- It previews the 24 newest listings and shows the ones available today, so the page stays fast however large the shed grows.
- Signed-in visitors to `/` go straight to `/app`.

## Files

`app/page.tsx`, `convex/tools.ts` (`listPublic`), `components/ToolCard.tsx`, `components/Logo.tsx`, `components/ThemeToggle.tsx`

## Verification

`tests/access.test.ts`: "gives the public list no owner fields" asserts the exact row shape.

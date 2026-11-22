# 01 — Foundation, sign-in and roles

**Status:** delivered · **Requirements:** FR-2, FR-6 · **Stories:** US-02

## Goal

Stand up the app on the fixed stack with Clerk sign-in, a Convex backend that knows who is calling, and two roles (user and admin) that the server enforces.

## Scope

- Next.js 16 App Router project with TypeScript strict, Bun as the package manager.
- Clerk for sign-in and sign-up (`/sign-in`, `/sign-up`), styled with the design tokens.
- Convex with Clerk as its auth provider (`convex/auth.config.ts`). The client always sends the Clerk `convex` JWT template (`app/providers.tsx`).
- A `users` row per person, created and refreshed by `users.sync` on each visit, reading name and email from Clerk's Backend API with JWT claims as fallback.
- Admin role from Clerk public metadata (`{"role":"admin"}`), carried as a `role` claim in the `convex` JWT template and in the session token.
- `proxy.ts` route gate (Next 16's replacement for `middleware.ts`).
- `convex/lib/access.ts` helpers used by every public function.

## Out of scope

- Managing admins inside the app (done in the Clerk dashboard).
- Clerk webhooks for user lifecycle (listed in `PRODUCTION.md`).

## Plan

1. Scaffold Next.js, add Clerk, Convex and the design-system CSS.
2. Configure the Clerk `convex` JWT template with `aud`, `name`, `email` and `role` claims; add `role` to the session token.
3. Write `requireIdentity`, `requireUser`, `requireAdmin`, `requireToolOwner`, `requireLoanParty`; read the role only through `hasAdminRole(identity)`.
4. Write `users.sync` (action) and `users.upsert` (internal mutation); call `sync` from `AppShell`, with a retry and a sign-out path if it fails.
5. Write `proxy.ts`: signed-out to sign-in with `redirect_url`; signed-in away from guest pages; non-admins away from `/admin`.
6. Add the account menu (manage account, theme, sign out) to the sidebar.

## Acceptance criteria

- Signed-out visits to `/app` or `/admin` land on sign-in and return to the page after.
- A non-admin opening `/admin` lands on `/app`, and every `admin.*` call from them fails.
- A role passed as an argument or stored in the database has no effect.
- If the account sync fails, the user sees a banner with Try again and Sign out.

## Files

`proxy.ts`, `app/providers.tsx`, `app/layout.tsx`, `app/(signed-in)/layout.tsx`, `app/(signed-in)/error.tsx`, `app/sign-in/`, `app/sign-up/`, `convex/auth.config.ts`, `convex/lib/access.ts`, `convex/users.ts`, `components/AppShell.tsx`, `components/Sidebar.tsx`, `types/clerk.d.ts`

## Verification

`tests/access.test.ts`: admin-only functions refuse non-admins; `users.sync` takes name and email from Clerk's API and falls back to claims.

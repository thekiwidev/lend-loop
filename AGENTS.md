<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# LendLoop: notes for coding agents

LendLoop is a neighbourhood tool-lending board: neighbours list tools, others request them for a date range, the owner approves, declines and marks them returned. n8n sends the emails and the daily overdue reminders. `README.md` covers setup and architecture, `DEPLOY.md` production, `PRODUCTION.md` what to harden.

## Stack

- Next.js 16 App Router (`app/`), React 19, TypeScript strict. Route protection is `proxy.ts` (Next 16 renamed `middleware.ts`). `cacheComponents` is off.
- Clerk v7 for auth. The admin role is `publicMetadata.role === "admin"`, carried in the `convex` JWT template and the session token.
- Convex for data and backend logic (`convex/`). `app/providers.tsx` always sends Convex the `convex` JWT template.
- n8n 2.46 in Docker (`docker-compose.yml`, workflows in `n8n/*.json`), Resend for email.
- Bun is the package manager. Use `bun` / `bunx`, never npm or yarn.

## Commands

```bash
bun dev                  # Next.js on localhost:3000
bunx convex dev          # Convex local backend (127.0.0.1:3210, HTTP actions on 3211)
docker compose up -d     # n8n on localhost:5678
bun run typecheck
bun run lint
bun run test             # vitest + convex-test
```

All three gates must pass before a change is done. Do not run `bun run build` while `bun dev` is running: both write `.next/` and the dev server then serves stale code.

## Where things live

- `convex/schema.ts`: tables `users`, `tools`, `loans`, `automationEvents` and their indexes.
- `convex/lib/access.ts`: `requireUser`, `requireAdmin`, `requireToolOwner`, `requireLoanParty`. Every public query and mutation starts with one of these.
- `convex/lib/loanRules.ts`: pure loan rules (transitions, dates, overlap, overdue). Keep it free of Convex imports so it stays unit-testable.
- `convex/lib/counts.ts`: `@convex-dev/aggregate` counts. Insert and patch `loans`, `tools`, `users` and `automationEvents` only through its helpers (`insertLoan`, `insertTool`, `insertUser`, `insertEvent`, `patchEvent`), or the admin totals drift.
- `convex/lib/pages.ts`: numbered paging for the admin tables. Neighbour-facing lists use Convex `paginate` with "Show more".
- `convex/lib/emails.ts`: all email copy (subject, text, HTML). n8n only sends what Convex gives it. Escape every user-supplied value in HTML.
- `convex/lib/signature.ts` and `convex/http.ts`: HMAC-signed traffic between Convex and n8n.
- `components/`: one component per file, ported from the LendLoop design system (`app/tokens.css`, `app/components.css`). Reuse these before writing new UI.

## Rules

- Never trust the client. Identity, ownership and role are checked in Convex on every call; `proxy.ts` is a UX gate only.
- The role comes from signed claims only, never from function arguments or the database.
- A loan state change schedules its notification in the same mutation (`scheduleNotification`), so the change and the job commit together.
- n8n calls into Convex are signed (`X-LendLoop-Timestamp`, `X-LendLoop-Signature` over `timestamp.METHOD.path.body`, 5-minute window). Keep secrets out of `n8n/*.json`; workflows read them from `$env`.
- No secrets in code or docs. Local secrets live in `.env.local`, `.env.n8n` and the Convex deployment env, all git-ignored. `.env.example` and `.env.n8n.example` list every key.
- `convex/seed.ts` is development-only sample data and is never run in production.
- Tests ship with the logic they test (`tests/`). Register the four aggregate components in convex-test, as `tests/access.test.ts` does.

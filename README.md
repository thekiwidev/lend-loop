# LendLoop

A neighbourhood tool-lending board. People list what is in their shed, neighbours ask to borrow it for some dates, and the owner approves, declines and marks it returned. Email notifications and daily overdue reminders run through n8n.

Built for the Fluence A-004 take-home on the required stack: Next.js (App Router), Clerk, Convex, n8n and TypeScript. Everything runs on your machine; the only hosted services are Clerk (sign-in) and Resend (email).

## Architecture

```text
 Browser
   |  Clerk session cookie                       Clerk (hosted)
   v                                               ^  sign-in, JWTs
 Next.js  localhost:3000 -------------------------'
   |  proxy.ts: route gate before render (role from signed session claims)
   |  pages: live Convex queries with the Clerk JWT attached
   v
 Convex local backend  127.0.0.1:3210 (functions)  127.0.0.1:3211 (HTTP actions)
   |  every query and mutation checks identity and ownership again
   |  loan change -> scheduled action -> signed POST
   v                                        ^ signed POST /automation/ack
 n8n in Docker  localhost:5678               | signed GET  /automation/overdue
   |  verifies signature, sends email, acks -'
   v
 Resend (hosted)  -> inboxes
```

| Piece | How it runs |
| --- | --- |
| Next.js | `bun dev` on `localhost:3000` |
| Convex | local deployment from `bunx convex dev` (no Convex account needed); functions on `127.0.0.1:3210`, HTTP actions on `127.0.0.1:3211` |
| n8n | `docker compose up -d` (image `n8nio/n8n:2.46.6`) on `localhost:5678`; reaches Convex at `host.docker.internal:3211` |
| Clerk | your Clerk development instance |
| Resend | Resend API |

The Convex local backend is a process on your host, so it calls n8n on `localhost:5678` directly. No tunnel is needed.

### Repository layout

```text
app/                    routes; app/(signed-in)/ holds /app/* and /admin behind one shell
  tokens.css            design-system tokens, copied as-is
  components.css        design-system component styles, copied as-is
components/             one React component per file, typed ports of the design system
convex/                 schema, functions, HTTP endpoints, seed
  lib/access.ts         requireUser, requireAdmin, requireToolOwner, requireLoanParty
  lib/loanRules.ts      pure loan rules: transitions, dates, overlap, overdue
  lib/signature.ts      pure HMAC signing and verification
lib/                    shared helpers: icon glyphs, tool-icon catalogue, labels, dates
n8n/                    exported workflows: request-notification, overdue-reminders, error-handler
tests/                  vitest + convex-test
proxy.ts                Clerk route protection (Next 16 renamed middleware.ts to proxy.ts)
docker-compose.yml      n8n
```

## Prerequisites

- [Bun](https://bun.sh) 1.x and Node 20+
- Docker Desktop (or Docker Engine with Compose)
- A free [Clerk](https://clerk.com) account and a free [Resend](https://resend.com) account

### Credentials

- **Option A (default):** create your own Clerk application and Resend key using the steps below. About ten minutes.
- **Option B:** ask the author for development-instance keys. They are sent through a one-time secret link, never by email or in the repo, and rotated after the review.

Convex needs no keys: it runs locally.

## Set up

### 1. Install

```bash
bun install
cp .env.example .env.local
cp .env.n8n.example .env.n8n
```

### 2. Clerk

1. Create an application with email sign-in.
2. **API keys**: copy the publishable and secret keys into `.env.local`.
3. **Integrations > Convex > Activate**. Copy the **Frontend API URL**: it is the issuer Convex trusts. This also creates a JWT template named `convex`.
4. **JWT templates > convex**: set the claims to `{"aud": "convex", "name": "{{user.full_name}}", "email": "{{user.primary_email_address}}", "role": "{{user.public_metadata.role}}"}`. The app always sends Convex this template (`app/providers.tsx`), and Convex reads the admin role from its `role` claim.
5. Optional: **Sessions > Customize session token** with `{"role": "{{user.public_metadata.role}}"}` lets `proxy.ts` check `/admin` without a call to Clerk. Without it, the proxy asks Clerk's API for the user's public metadata on `/admin` requests only.

### 3. Convex (local)

```bash
bunx convex dev
```

On first run choose to run Convex locally (no account). It writes `CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL` and `NEXT_PUBLIC_CONVEX_SITE_URL` into `.env.local`. Leave it running and, in a second terminal, set the deployment's variables:

```bash
openssl rand -hex 32   # the shared n8n signing secret; use the same value in .env.n8n
bunx convex env set CLERK_JWT_ISSUER_DOMAIN https://<your-app>.clerk.accounts.dev
bunx convex env set LENDLOOP_N8N_SECRET <the secret>
bunx convex env set N8N_REQUEST_WEBHOOK_URL http://localhost:5678/webhook/lendloop-request
bunx convex env set APP_URL http://localhost:3000
bunx convex env set CLERK_SECRET_KEY <the sk_test_ key from .env.local>
```

`users.sync` uses the Clerk secret key to read your name and email from Clerk's Backend API, so they do not depend on which claims the JWT template carries.

### 4. Next.js

```bash
bun dev
```

Open http://localhost:3000 and sign up.

### 5. n8n

Fill in `.env.n8n`: `N8N_ENCRYPTION_KEY` (`openssl rand -hex 32`), `LENDLOOP_N8N_SECRET` (same as Convex), `RESEND_API_KEY`, `EMAIL_FROM` (an address on a domain verified in Resend) and `ADMIN_ALERT_EMAIL`. Then:

```bash
docker compose up -d
docker compose exec n8n n8n import:workflow --separate --input=/workflows
docker compose exec n8n n8n publish:workflow --id=LLerrorHandler01
docker compose exec n8n n8n publish:workflow --id=LLrequestNotify1
docker compose exec n8n n8n publish:workflow --id=LLoverdueRemind1
docker compose restart n8n
```

The CLI import keeps the workflow IDs, so both workflows already point at the error handler. If you import through the n8n editor instead, open each of the two workflows, set **Settings > Error workflow** to "LendLoop: error handler", and publish all three.

Open http://localhost:5678 to create the n8n owner account and look at the workflows. No n8n credentials need creating: the workflows read the secret and Resend key from the container environment.

### 6. Admin and sample data

1. In Clerk **Users**, open your user and set **Public metadata** to `{"role":"admin"}`. Sign out and in again (or wait about a minute for the token to refresh). The Admin item appears in the sidebar.
2. Load sample tools, an overdue loan you borrowed and an incoming request for you:

```bash
bunx convex run seed:run
```

Sign in once before seeding so your user row exists. Sample neighbours use `example.com` addresses and are never emailed.

## Try it

- **List a tool**: type "cordless drill" and the icon picker suggests the drill first.
- **Request**: from a second Clerk user, request a tool. The owner gets an email; the card shows "Email sent".
- **Approve, decline, mark returned**: each sends the other person an email.
- **Overdue reminder**: in n8n, open "LendLoop: overdue reminders" and click **Execute workflow** (the Run now trigger). The seeded overdue loan gets a reminder and its card shows "Reminder sent". Run it again: no second email and no second row.
- **Failure**: put a wrong `LENDLOOP_N8N_SECRET` in `.env.n8n` and `docker compose up -d`. n8n answers 401, Convex retries after 1, 5 and 15 minutes, then the card shows "Notification failed" and the admin page lists it.

## Security and data minimisation

- **Two gates.** `proxy.ts` decides which page to render before anything reaches the browser: signed-out visitors to `/app` or `/admin` go to sign-in and come back afterwards, signed-in users never see the sign-in page, non-admins on `/admin` go to `/app`. That is a UX gate only. Every Convex query and mutation checks identity, ownership and role again through `convex/lib/access.ts`; nothing trusts the client.
- **Role in signed claims.** The admin role lives in Clerk public metadata, which users cannot edit, and reaches the proxy in the session token and Convex in the JWT. It is never taken from function arguments or stored in the database. Role changes apply on the next token refresh.
- **Validated input.** Convex validators on every argument, length limits (name 80, description 500), icons checked against the catalogue, dates checked as real calendar dates, loans limited to 30 days, no borrowing your own tool, no overlapping approved loans.
- **Minimal payloads.** The public tool list returns name, category and icon only. Tool cards show the owner's name; emails never leave Convex except as the single recipient address in the n8n payload. Admin tables show names, not emails.
- **Signed automation, both directions.** HMAC-SHA256 over `timestamp.METHOD.path.body`, sent in `X-LendLoop-Timestamp` and `X-LendLoop-Signature`. Method and path in the signed string stop a captured signature being replayed against another endpoint; requests older than 5 minutes are refused. Convex compares in constant time and logs rejections without the payload.
- **Secrets only in env.** Clerk keys in `.env.local`, the signing secret in Convex env and the n8n container env, the Resend key in the n8n container env. The exported workflow JSON holds no secret (`grep -iE "re_[a-z0-9]{8}" n8n/*.json` finds nothing).
- **Idempotency end to end.** Every email has a stable key (`loan:<id>:<status>`, `overdue:<loanId>:<date>`) sent to Resend as `Idempotency-Key` and back to Convex, where `recordEvent` keeps one row per key inside a serialisable mutation. Retries never send a second email or write a second row.
- **Retries and an error path.** Convex retries the hand-off to n8n after 1, 5 and 15 minutes and then records a failure. Every n8n HTTP node retries 3 times, 5 seconds apart. Any workflow error runs the error handler, which records a failure in Convex and emails the admin.

## Tests

```bash
bun run typecheck
bun run lint
bun run test
bun run build
```

- `tests/loanRules.test.ts`: every allowed and refused transition, date validation, overlap edges, derived overdue.
- `tests/signature.test.ts`: a known HMAC vector, valid, tampered body, wrong path, wrong method, wrong secret, expired timestamp.
- `tests/toolIcons.test.ts`: suggestions ("cordless drill" gives the drill first, plurals, category fallback), every catalogue icon has a glyph.
- `tests/access.test.ts` (convex-test): non-owners cannot edit, remove or approve; non-admins cannot use admin functions; the public list has no owner fields; unknown icons are refused; `recordEvent` with the same key twice leaves one row; a loan request posts one signed, minimal payload to n8n; three failed retries leave one failed event.

## Known limits

- **Dates are UTC calendar dates.** "Overdue" and "today" use UTC; the reminder runs at 09:00 UTC.
- **Resend without a verified domain** only delivers to the Resend account's own address from `onboarding@resend.dev`.
- **The n8n side compares signatures with an IF node**, which is not constant-time, and re-serialises the parsed JSON body to verify it. That equals the raw bytes for Convex's `JSON.stringify` payloads; a different sender would need a raw-body check.
- **Lists are paginated** (12 at a time, "Show more") and filtered on the server. Dashboard and admin counts read only active loans (pending, approved) through indexes; failed automations are counted up to 100. Exact totals over all history would need the Convex aggregate component.
- **The public landing page** previews the 24 newest listings and shows the available ones.
- **The user row is created and refreshed on each visit** to `/app` (`users.sync` reads the profile from Clerk's API), not by a Clerk webhook.

See [PRODUCTION.md](PRODUCTION.md) for what changes before real users.

## Credits

Tool glyphs are drawn on the design system's 24px grid; several follow the shapes of [Lucide](https://lucide.dev) icons (ISC licence).

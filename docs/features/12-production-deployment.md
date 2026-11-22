# 12 — Production deployment

**Status:** delivered · **Guide:** [DEPLOY.md](../../DEPLOY.md)

## Goal

Run LendLoop for real neighbours on production services, with production keys kept apart from development ones.

## Plan

| Piece | Production home |
| --- | --- |
| Next.js | Vercel, built with `bunx convex deploy --cmd 'bun run build'` so app and backend ship together |
| Auth | Clerk production instance on the app's domain, Google sign-in with its own OAuth client |
| Backend | Convex production deployment; HTTP actions on `*.convex.site` |
| Automations | Self-hosted n8n in Docker behind a TLS proxy (Caddy), port bound to localhost |
| Email | Resend with a verified sending domain and a production-only API key |

1. Create the Clerk production instance, DNS records, JWT template and session-token claim.
2. Deploy Convex and set its production env with a new signing secret.
3. Bring up n8n on an always-on host, import and publish the three workflows.
4. Create a production Resend key.
5. Configure Vercel env and domain, deploy.
6. Sign up, make yourself admin in Clerk, run the end-to-end check in DEPLOY.md.

## Acceptance criteria

- A request on the live site produces the email within a minute.
- `/admin/automations` stays empty in normal operation.
- Running the overdue workflow by hand reaches Convex without errors.

## Follow-ups

Hardening and product additions are in [PRODUCTION.md](../../PRODUCTION.md).

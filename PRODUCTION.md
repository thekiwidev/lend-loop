# Taking LendLoop to production

The take-home runs everything locally. Before real neighbours use it:

## Hosting

- **Convex cloud deployment** (`bunx convex deploy`) instead of the local backend. HTTP actions get a public `*.convex.site` URL, which n8n then calls.
- **Next.js on Vercel** (or any Node host), with production Clerk keys and `NEXT_PUBLIC_CONVEX_URL` pointing at the cloud deployment.
- **n8n in queue mode with Postgres** (workers plus Redis) so executions survive restarts and scale, or n8n Cloud. Webhook URL over HTTPS only.

## Email

- A **verified sending domain** in Resend with SPF, DKIM and DMARC, and a monitored reply-to address.
- Unsubscribe or notification preferences per user before sending anything beyond transactional mail.

## Secrets

- A **secret manager** (Vercel, Convex and n8n environment stores fed from one source) instead of hand-edited env files.
- **Rotation through a dual-secret window**: Convex and n8n accept the current and the previous signing secret for a short overlap, so rotating never drops a request.
- n8n **credentials or external secrets** instead of `$env` access in expressions, and `N8N_BLOCK_ENV_ACCESS_IN_NODE` back on.

## Abuse and load

- **Rate limits** on mutations (request, create) and on the HTTP endpoints, with the Convex rate-limiter component.
- **Exact totals** (all tools ever listed, all loans) with the Convex aggregate component, if those numbers are wanted.
- A raw-body, constant-time signature check in n8n (a Code node) rather than the IF node comparison.

## Users and data

- **Clerk webhooks** (`user.created`, `user.updated`, `user.deleted`, verified with Svix) to create, update and delete the user row, instead of `users.sync` on first visit. Deletion anonymises the user's loans.
- An **audit log** table for admin actions (trusted-lender changes) and loan state changes.
- **Per-user timezone** for "today" and the reminder hour, instead of UTC.
- A retention policy for `automationEvents`.

## Operations

- **Sentry** (or similar) in Next.js and Convex, and alerting on failed automation events.
- **Backups**: Convex scheduled exports; Postgres backups for n8n.
- **CI** running typecheck, lint, tests and build on every pull request, plus the secret grep over `n8n/*.json`.

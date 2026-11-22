# Running LendLoop in production

LendLoop already runs on production services: a Clerk production instance, a Convex production deployment, self-hosted n8n behind TLS, Resend on a verified domain and Next.js on Vercel. [DEPLOY.md](DEPLOY.md) is the step-by-step. Emails arrive, links in them open the right page for a signed-in neighbour and send anyone else to sign in first, and admins have the extra controls.

The app as submitted does what the brief asks and nothing more. This note is what I would change beyond the brief to run it for real neighbourhoods: product changes first, then hardening. None of it is built.

## What I would change in the product

The brief covers the lending loop. Real streets will need:

- **Admins managing admins.** Today an admin is made in the Clerk dashboard. An admin should be able to promote or demote another neighbour from the Neighbours page (written to Clerk public metadata through the Backend API, with an audit entry), and there should be admin groups or scoped permissions (for example, a moderator who can remove listings but not change trust).
- **Many neighbourhoods on one platform.** Today one deployment is one shared board: every signed-in neighbour sees every tool. I would host LendLoop once and let neighbourhoods be created on it, each with its own members and admins.
  - Every user belongs to a **home neighbourhood**. When they move, they update their address and their neighbourhood moves with them.
  - By default the app shows **only your own neighbourhood**, so you always know who is a neighbour and who is not.
  - An **Explore** view lets people look beyond it: how far each neighbourhood is from theirs, and whether borrowing from it is practical given the **distance** and the **relationship between the two neighbourhoods** (for example, partner neighbourhoods that agree to share).
  - Borrowing across neighbourhoods stays possible; it is a choice, not a wall. An owner decides whether a tool is lent at home only, to partner neighbourhoods, or to anyone within a set distance.
  - Locations stay coarse (a neighbourhood centre or postcode, never a person's exact address), and every neighbourhood rule is enforced in Convex, the same way ownership is today.
- **Several owners or copies of one tool.** Co-owned listings (a shared lawnmower) and a quantity on a listing, so two ladders do not need two listings and overlap checks count units.
- **Disputes.** A way for either side to report that an item was not returned, came back late or came back damaged, with the loan paused in a "disputed" state, both sides' notes, and an admin who resolves it.
- **Inventory states.** An owner can mark a tool broken, in repair, missing or temporarily unavailable, instead of removing the listing. Requests are paused while it is out of service, pending ones are told why, and its history stays intact.

## Hosting and scale

- **n8n in queue mode with Postgres** (workers plus Redis) so executions survive restarts and scale, with Postgres backups. Webhook URL over HTTPS only.
- **Convex scheduled exports** as backups.

## Email

- A monitored reply-to address on the verified sending domain, with SPF, DKIM and DMARC.
- Notification preferences per user (and unsubscribe) before sending anything beyond transactional mail.

## Secrets

- A **secret manager** feeding the Vercel, Convex and n8n environment stores from one source, instead of hand-edited env files.
- **Rotation through a dual-secret window**: Convex and n8n accept the current and the previous signing secret for a short overlap, so rotating never drops a request.
- n8n **credentials or external secrets** instead of `$env` access in expressions, and `N8N_BLOCK_ENV_ACCESS_IN_NODE` back on.

## Abuse and load

- **Rate limits** on mutations (request, create) and on the HTTP endpoints, with the Convex rate-limiter component.
- **Triggers** (convex-helpers) to keep the aggregate counts in sync automatically, instead of the insert helpers in `convex/lib/counts.ts`.
- A raw-body, constant-time signature check in n8n (a Code node) rather than the IF node comparison.

## Users and data

- **Clerk webhooks** (`user.created`, `user.updated`, `user.deleted`, verified with Svix) to create, update and delete the user row, instead of `users.sync` on each visit. Deletion anonymises the user's loans.
- An **audit log** table for admin actions (trust changes, listing removals, admin changes) and loan state changes.
- **Per-user timezone** for "today" and the reminder hour, instead of UTC.
- A retention policy for `automationEvents`.

## Operations

- **Sentry** (or similar) in Next.js and Convex, and alerting on failed automation events beyond the admin email.
- **CI** running typecheck, lint, tests and build on every pull request, plus the secret grep over `n8n/*.json`.

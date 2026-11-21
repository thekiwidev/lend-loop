# Deploying LendLoop

Step by step, from the local setup to production. Four services, each with its own production keys:

| Piece | Production home | Talks to |
| --- | --- | --- |
| Next.js app | Vercel | Clerk, Convex |
| Auth | Clerk production instance | — |
| Backend | Convex production deployment | Clerk (token check, profile), n8n (webhook) |
| Automations | Self-hosted n8n (Docker) on an always-on host | Convex (`*.convex.site`), Resend |

Pick the app's address first, because Clerk production needs it. The examples below use `lendloop.thekiwidev.me`; swap in your own.

Generate a **new** signing secret for production and keep it out of every file: `openssl rand -hex 32`. It goes into Convex and n8n only.

## 1. Clerk production instance

1. Clerk dashboard, top of the sidebar: switch the app from **Development** to **Production** and create the production instance. When asked, give it `lendloop.thekiwidev.me`.
2. **Domains**: add the DNS records Clerk lists (CNAMEs for `clerk.`, `accounts.` and the email records) at your DNS provider. Wait until every record shows Verified.
3. **Google sign-in**: production cannot use Clerk's shared Google keys. In Google Cloud Console create an OAuth client (Web), add the redirect URI Clerk shows under **SSO connections > Google**, and paste the client ID and secret into Clerk.
4. **Integrations > Convex > Activate** in production, then **JWT templates > convex**: set the claims exactly as in development: `{"aud": "convex", "name": "{{user.full_name}}", "email": "{{user.primary_email_address}}", "role": "{{user.public_metadata.role}}"}`.
5. **Sessions > Customize session token**: `{"role": "{{user.public_metadata.role}}"}`, as in development.
6. **API keys**: note the production `pk_live_…` and `sk_live_…`, and the **Frontend API URL** (`https://clerk.lendloop.thekiwidev.me`). That URL is the production `CLERK_JWT_ISSUER_DOMAIN`.
7. After you sign up on the live site, make yourself admin again. Production users are separate from development users. **Users > you > Metadata > Public**: `{ "role": "admin" }`.

Test users (`+clerk_test`) and `scripts/seed-clerk-users.ts` are development only. Never run them against production keys.

## 2. Convex production deployment

1. Create the production deployment and push the functions once:
   ```bash
   bunx convex deploy
   ```
   It prints the production URL (`https://<name>.convex.cloud`). The HTTP actions live at `https://<name>.convex.site`.
2. Set the production environment, one key at a time (`--prod` targets production):
   ```bash
   bunx convex env set --prod CLERK_JWT_ISSUER_DOMAIN https://clerk.lendloop.thekiwidev.me
   bunx convex env set --prod CLERK_SECRET_KEY sk_live_...
   bunx convex env set --prod APP_URL https://lendloop.thekiwidev.me
   bunx convex env set --prod LENDLOOP_N8N_SECRET <the new production secret>
   bunx convex env set --prod N8N_REQUEST_WEBHOOK_URL https://n8n.lendloop.thekiwidev.me/webhook/lendloop-request
   ```
   The last one only works once n8n is up (step 3); set it now and the notifications start as soon as n8n answers.
3. Convex dashboard, production deployment, **Settings > Deploy keys**: generate a **production deploy key** for Vercel.
4. Do not run `seed:run` or `seed:reset` in production. They are internal and only for local sample data.

## 3. n8n

Convex cloud must reach n8n over HTTPS, so n8n needs a public, always-on host. n8n Cloud is not an option for these workflows as written: it blocks `$env`, which is how the workflows read the secrets.

Any small Docker host works (a 1 GB VPS, Railway, Render with a persistent disk). With a VPS:

1. Point `n8n.lendloop.thekiwidev.me` at the server and put a TLS proxy in front of port 5678 (Caddy is the shortest: `n8n.lendloop.thekiwidev.me { reverse_proxy localhost:5678 }`).
2. Copy `docker-compose.yml`, the `n8n/` folder and a production `.env.n8n` to the server. In the compose file change `WEBHOOK_URL` to `https://n8n.lendloop.thekiwidev.me/` and drop the `ports` mapping to `127.0.0.1:5678:5678` so only the proxy can reach n8n.
3. Production `.env.n8n`:
   ```
   N8N_ENCRYPTION_KEY=<new, openssl rand -hex 32, back it up>
   GENERIC_TIMEZONE=UTC
   TZ=UTC
   LENDLOOP_N8N_SECRET=<same production secret as Convex>
   RESEND_API_KEY=<a separate production Resend key, sending access only>
   EMAIL_FROM=LendLoop <lendloop@thekiwidev.me>
   ADMIN_ALERT_EMAIL=<your address>
   CONVEX_SITE_URL=https://<name>.convex.site
   ```
4. Start it, then load and publish the workflows (the same commands as locally):
   ```bash
   docker compose up -d
   docker compose exec n8n n8n import:workflow --separate --input=/workflows
   docker compose exec n8n n8n publish:workflow --id=LLerrorHandler01
   docker compose exec n8n n8n publish:workflow --id=LLrequestNotify1
   docker compose exec n8n n8n publish:workflow --id=LLoverdueRemind1
   docker compose restart n8n
   ```
5. Open `https://n8n.lendloop.thekiwidev.me` once and create the owner account with a strong password.

## 4. Resend

The domain `thekiwidev.me` is already verified, so nothing changes for sending. Create a separate API key for production (**API Keys > Create**, sending access) so the local key can be revoked without touching production.

## 5. Vercel

1. Import the repository in Vercel (framework: Next.js).
2. **Settings > Build**: build command
   ```bash
   bunx convex deploy --cmd 'bun run build'
   ```
   This pushes the Convex functions and sets `NEXT_PUBLIC_CONVEX_URL` for the build, so the app and the backend always ship together.
3. **Environment variables** (Production):
   ```
   CONVEX_DEPLOY_KEY=<production deploy key from step 2.3>
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
   CLERK_SECRET_KEY=sk_live_...
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   ```
4. **Domains**: add `lendloop.thekiwidev.me` and the DNS record Vercel shows.
5. Deploy.

## 6. Check it works

1. Open `https://lendloop.thekiwidev.me`, sign up with Google, and make yourself admin (step 1.7). Sign out and back in, then open `/admin`.
2. List a tool. From a second account, request it. You should get the email within a minute.
3. `/admin/automations` should stay empty. A row there means a hand-off failed; its detail says why.
4. In n8n, run **LendLoop: overdue reminders** with **Run now** once to confirm it reaches Convex (no overdue loans means no emails, and no errors).

## Keys at a glance

| Key | Where | Value in production |
| --- | --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Vercel | `pk_live_…` |
| `CLERK_SECRET_KEY` | Vercel and Convex | `sk_live_…` |
| `CONVEX_DEPLOY_KEY` | Vercel | production deploy key |
| `CLERK_JWT_ISSUER_DOMAIN` | Convex | `https://clerk.<your domain>` |
| `APP_URL` | Convex | `https://<your domain>` (used for links in emails) |
| `LENDLOOP_N8N_SECRET` | Convex and n8n | new random secret, same in both |
| `N8N_REQUEST_WEBHOOK_URL` | Convex | `https://n8n.<your domain>/webhook/lendloop-request` |
| `N8N_ENCRYPTION_KEY` | n8n | new random value, backed up |
| `RESEND_API_KEY` | n8n | production Resend key |
| `EMAIL_FROM`, `ADMIN_ALERT_EMAIL` | n8n | sender on the verified domain; your alert address |
| `CONVEX_SITE_URL` | n8n | `https://<name>.convex.site` |

`PRODUCTION.md` lists what to harden after launch (rate limits, Clerk webhooks, backups, monitoring).

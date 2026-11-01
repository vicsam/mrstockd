# Deploying MrStockd

## Branch workflow

1. Create a short branch for one change.
2. Open a pull request. CI must pass (typecheck, test, build, Playwright smoke, Lighthouse).
3. Merge to `main` only after CI is green.
4. Render deploys `main` only when CI checks pass (`autoDeployTrigger: checksPass`).

## First-time Render setup

1. Create the workspace and connect the GitHub repo.
2. Apply the Blueprint (`render.yaml`) from the Render dashboard.
3. Fill in every env var marked `sync: false` in the dashboard.
4. Set `BETTER_AUTH_URL` and `GATEWAY_PUBLIC_URL` to the public service URLs after the first deploy.

## Environment variables to fill in

See `.env.example` for descriptions. Secrets use `sync: false` and are entered in the Render dashboard, never committed.

Required secrets: `BETTER_AUTH_SECRET` (generated), `UPSTREAM_SECRET_ENCRYPTION_KEY` (generated), `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`, `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, `ADMIN_EMAILS`, `GOOGLE_*`/`APPLE_*` (optional), `RESEND_API_KEY`, `R2_*`, `SENTRY_DSN`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_DEMO_VIDEO_URL`.

## Custom domain

Add the domain in the Render dashboard (Custom Domains), then point DNS as instructed. Set `BETTER_AUTH_URL` to the final public URL.

## Migrations on deploy

Free instances may start more than one copy, so `render.yaml` uses
`startCommand: node scripts/migrate-and-start.mjs`. That script takes a
Postgres advisory lock (`pg_advisory_lock`), runs `pnpm db:migrate`, releases
the lock, and then starts the Next.js server. This avoids concurrent
migration races on the free plan. `preDeployCommand` is only available on
paid plans and is not used.

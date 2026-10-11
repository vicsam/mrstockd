# MrStockd

**AI tools, in stock.**

Everything your team and your AI agents need, in stock. MrStockd is a marketplace where people *and* their AI agents discover, buy, and use AI tools, paid through PayPal. Sellers list a tool once; buyers pay with PayPal and get an API key in seconds. Agents can shop on a person's behalf through MrStockd's MCP server, with spend limits and PayPal approval keeping the human in control.

Built for the [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/) (Oct–Nov 2026).

> Status: early build. See the roadmap below.

## How it works

1. **Sellers** list a tool: endpoint, pricing (credit packs or monthly plan), docs. An AI vetting job tests it before it goes live.
2. **Buyers** search in plain language, pay through PayPal Checkout, and receive an API key.
3. **Agents** connect to the MrStockd MCP server, search, and request purchases. Anything over the agent's limit needs the owner's approval in PayPal.
4. **The gateway** checks every call against the buyer's key and credits, forwards it to the seller's tool, and meters usage.
5. **Sellers get paid** through PayPal and track sales in their dashboard.

## Repository layout

```
apps/
  web/        Next.js: storefront, checkout, seller and admin dashboards
  gateway/    Hono: API-key auth, credits, rate limits, metering, SSRF-safe proxy
  mcp/        MCP server: lets AI agents search and buy
  workflows/  Render Workflows: vetting, access provisioning, seller payouts
packages/
  auth/       Better Auth setup: accounts, sessions, teams (shared, tested)
  core/       Pricing, API keys, secret encryption, SSRF guard (shared, tested)
  db/         Drizzle schema, migrations, and an in-memory test database
  config/     Shared TypeScript config
```

## Tools used

The hackathon asks entrants to name each AI tool and PayPal capability and how it is used. This section is kept current as features land.

| Tool | How MrStockd uses it |
|---|---|
| PayPal Orders v2 | One-off credit-pack purchases |
| PayPal Subscriptions | Monthly tool plans |
| PayPal Multiparty / Payouts | Paying sellers and taking the platform fee |
| PayPal Webhooks | Server-side payment confirmation before any key is issued |
| PayPal Agent Toolkit | Lets the shopping agent create and manage orders |
| Vercel AI SDK | Provider-agnostic model access |
| Large language model (via Vercel AI SDK) | Agent reasoning and tool use in the purchase flow |
| Embedding model + pgvector | Semantic search over listings |
| Model Context Protocol | MrStockd's MCP server for outside agents |
| Render + Render Workflows | Hosting and durable background jobs |
| AG Grid | Seller and admin dashboards |

## Getting started

Requirements: Node 22+, pnpm 10+, and Postgres 15+ with the `pgvector` extension. The quickest way to get Postgres is Docker:

```bash
docker run -d --name mrstockd-db -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=mrstockd \
  pgvector/pgvector:pg17
```

Then, from the repo root (on Windows, use Git Bash):

```bash
npm install -g pnpm           # if pnpm isn't installed yet
pnpm install

cp .env.example .env
sed -i "s|^BETTER_AUTH_SECRET=.*|BETTER_AUTH_SECRET=$(openssl rand -base64 32)|" .env
sed -i "s|^UPSTREAM_SECRET_ENCRYPTION_KEY=.*|UPSTREAM_SECRET_ENCRYPTION_KEY=$(openssl rand -base64 32)|" .env

pnpm db:migrate               # creates the pgvector extension and all tables
pnpm dev                      # builds shared packages, then runs every app
```

All apps read the single `.env` at the repo root. Real environment variables always take precedence over it.

**Troubleshooting**

- `db:migrate` explains any failure in plain words (database not running, wrong password, missing database) and how to fix it.
- *Password rejected on Windows or macOS:* if PostgreSQL is also installed directly on your computer, it may be answering on port 5432 instead of Docker. Stop that service, or start the container with `-p 5433:5432` and change `DATABASE_URL` to use port `5433`.
- *"Cannot find module @mrstockd/…":* the shared packages aren't built. `pnpm dev` builds them automatically; to do it by hand, run `pnpm build`.

Tests need no database server: they run against an in-process Postgres (PGlite) with every migration applied.

| App | Local URL |
|---|---|
| Web | http://localhost:3000 |
| Gateway | http://localhost:8787/health |

Other commands: `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Calling a tool through the gateway

Every tool on MrStockd is called the same way, with the API key issued at purchase:

```bash
curl https://<gateway-host>/v1/tools/<tool-slug>/<path> \
  -H "Authorization: Bearer mrs_live_..." \
  -H "Content-Type: application/json" \
  -d '{"input": "..."}'
```

The gateway checks the key, the tool, the rate limit, and the buyer's credits or subscription, then forwards the call to the seller's endpoint with the seller's own credential. The buyer's key never reaches the seller.

| Response | Meaning |
|---|---|
| Seller's status and body | The call went through. `X-MrStockd-Credits-Remaining` shows the balance on credit-pack keys. |
| `401 invalid_api_key` / `api_key_revoked` | Missing, wrong, or revoked key |
| `402 insufficient_credits` / `subscription_inactive` | Buy more credits or renew |
| `403 key_not_valid_for_tool` | The key belongs to a different tool |
| `429 rate_limited` | Too many calls; wait for `Retry-After` seconds |
| `502` / `504` | The seller's tool failed, timed out, or tried to redirect. No credit is charged. |

## Security principles

These are built in from the first commit, not added later:

- Prices are computed on the server from the database. The client and the AI model never set an amount.
- PayPal webhooks are signature-verified, and each event id is processed once.
- Every PayPal create call sends a `PayPal-Request-Id`, so retries never double-charge.
- MrStockd API keys are stored as hashes only and shown once.
- Sellers' upstream secrets are encrypted with AES-256-GCM.
- Seller endpoints pass an SSRF guard on save and on every proxied call, re-checked at connect time so DNS rebinding can't reach internal addresses. Redirects are refused.
- Credits are taken with a single conditional database update, so concurrent calls can never spend the same credit. Failed seller calls are refunded.
- Agent spending limits are enforced server-side.
- Accounts: passwords hashed with scrypt; HttpOnly, SameSite=Lax session cookies (Secure in production); sign-in and sign-up rate-limited; CSRF and origin checks enforced in every environment, including tests.
- Auth forms use POST and stay disabled until the page is interactive, so credentials can never end up in a URL.
- The hackathon build runs on the PayPal **sandbox** only.

## Roadmap

| Dates | Focus |
|---|---|
| Oct 10–15 | Repo, CI, database, auth, PayPal sandbox spike |
| Oct 16–22 | Listings, search, checkout, subscriptions |
| Oct 23–29 | Gateway, metering, MCP server, agent purchase flow |
| Oct 30–Nov 4 | AG Grid dashboards, vetting workflow, guardrails |
| Nov 5–10 | Polish, docs, demo video, submission |

## License

[AGPL-3.0](./LICENSE). You may use, modify, and self-host MrStockd; if you run a modified version as a network service, you must publish your changes under the same license.

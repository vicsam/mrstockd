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
  gateway/    Hono: API-key auth, metering, proxy to sellers' tools
  mcp/        MCP server: lets AI agents search and buy
  workflows/  Render Workflows: vetting, access provisioning, seller payouts
packages/
  core/       Pricing, API keys, SSRF guard, env parsing (shared, tested)
  db/         Drizzle schema and client
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

Requirements: Node 22+, pnpm 10+, Postgres 15+ with the `pgvector` extension.

```bash
pnpm install
cp .env.example .env          # fill in values
pnpm db:migrate               # after the first migration is generated
pnpm dev                      # runs every app
```

| App | Local URL |
|---|---|
| Web | http://localhost:3000 |
| Gateway | http://localhost:8787/health |

Other commands: `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Security principles

These are built in from the first commit, not added later:

- Prices are computed on the server from the database. The client and the AI model never set an amount.
- PayPal webhooks are signature-verified, and each event id is processed once.
- Every PayPal create call sends a `PayPal-Request-Id`, so retries never double-charge.
- MrStockd API keys are stored as hashes only and shown once.
- Sellers' upstream secrets are encrypted with AES-256-GCM.
- Seller endpoints pass an SSRF guard on save and on every proxied call.
- Agent spending limits are enforced server-side.
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

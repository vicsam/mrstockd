import { serve } from "@hono/node-server";
import { getConnInfo } from "@hono/node-server/conninfo";
import { createCatalog } from "@mrstockd/catalog";
import { parseEncryptionKey, parseEnv } from "@mrstockd/core";
import { createDb } from "@mrstockd/db";
import { z } from "zod";
import { createApp } from "./app.js";
import { createDbStore } from "./db-store.js";
import { createMemoryRateLimiter } from "./rate-limit.js";
import { createUpstreamClient } from "./upstream.js";

const env = parseEnv(
  z.object({
    NODE_ENV: z.string().default("development"),
    PORT: z.coerce.number().default(8787),
    DATABASE_URL: z.string().min(1),
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
    UPSTREAM_SECRET_ENCRYPTION_KEY: z.string().min(1),
    RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(60),
    UPSTREAM_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
    GATEWAY_ALLOW_PRIVATE_UPSTREAMS: z.enum(["true", "false"]).default("false"),
    GATEWAY_PUBLIC_URL: z.string().url().optional(),
    BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
    /** Set on hosts behind a proxy (Render, Cloudflare) so rate limits see the real client IP. */
    TRUST_PROXY: z.enum(["true", "false"]).default("false"),
  }),
);

const allowPrivate = env.GATEWAY_ALLOW_PRIVATE_UPSTREAMS === "true";
if (allowPrivate && env.NODE_ENV === "production") {
  throw new Error("GATEWAY_ALLOW_PRIVATE_UPSTREAMS must never be enabled in production.");
}

const db = createDb(env.DATABASE_URL, { maxConnections: env.DATABASE_POOL_MAX });
const encryptionKey = parseEncryptionKey(env.UPSTREAM_SECRET_ENCRYPTION_KEY);

const app = createApp({
  store: createDbStore(db),
  catalog: createCatalog({ db, encryptionKey, allowPrivateEndpoints: allowPrivate }),
  publicUrls: { store: env.BETTER_AUTH_URL, gateway: env.GATEWAY_PUBLIC_URL ?? `http://localhost:${env.PORT}` },
  clientIp: (c) => {
    if (env.TRUST_PROXY === "true") {
      // The last entry is the one our own proxy added; earlier ones can be forged.
      const forwarded = c.req.header("x-forwarded-for")?.split(",").pop()?.trim();
      if (forwarded) return forwarded;
    }
    return getConnInfo(c).remote.address ?? "unknown";
  },
  upstream: createUpstreamClient({ allowPrivate, timeoutMs: env.UPSTREAM_TIMEOUT_MS }),
  rateLimiter: createMemoryRateLimiter(env.RATE_LIMIT_PER_MINUTE),
  encryptionKey,
});

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`MrStockd gateway listening on :${info.port}${allowPrivate ? " (private upstreams allowed: dev only)" : ""}`);
});

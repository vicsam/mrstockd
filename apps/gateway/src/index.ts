import { serve } from "@hono/node-server";
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
    UPSTREAM_SECRET_ENCRYPTION_KEY: z.string().min(1),
    RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(60),
    UPSTREAM_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
    GATEWAY_ALLOW_PRIVATE_UPSTREAMS: z.enum(["true", "false"]).default("false"),
  }),
);

const allowPrivate = env.GATEWAY_ALLOW_PRIVATE_UPSTREAMS === "true";
if (allowPrivate && env.NODE_ENV === "production") {
  throw new Error("GATEWAY_ALLOW_PRIVATE_UPSTREAMS must never be enabled in production.");
}

const app = createApp({
  store: createDbStore(createDb(env.DATABASE_URL)),
  upstream: createUpstreamClient({ allowPrivate, timeoutMs: env.UPSTREAM_TIMEOUT_MS }),
  rateLimiter: createMemoryRateLimiter(env.RATE_LIMIT_PER_MINUTE),
  encryptionKey: parseEncryptionKey(env.UPSTREAM_SECRET_ENCRYPTION_KEY),
});

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`MrStockd gateway listening on :${info.port}${allowPrivate ? " (private upstreams allowed: dev only)" : ""}`);
});

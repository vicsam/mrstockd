import { parseEnv } from "@mrstockd/core";
import { createDb, type Db } from "@mrstockd/db";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.string().default("development"),
  DATABASE_URL: z.string().min(1),
  /** Connections per web instance. Keep the total across services under your Postgres plan's limit. */
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  UPSTREAM_SECRET_ENCRYPTION_KEY: z.string().min(1),
  /** Comma-separated emails allowed to review listings. */
  ADMIN_EMAILS: z.string().default(""),
  /** Public base URL of the gateway, shown to sellers and buyers. */
  GATEWAY_PUBLIC_URL: z.url().default("http://localhost:8787"),
  GATEWAY_ALLOW_PRIVATE_UPSTREAMS: z.enum(["true", "false"]).default("false"),
});

export type ServerEnv = z.infer<typeof schema>;

let env: ServerEnv | undefined;
let db: Db | undefined;

/** Parsed on first use so `next build` needs no secrets. */
export function serverEnv(): ServerEnv {
  if (env) return env;
  env = parseEnv(schema);
  if (env.NODE_ENV === "production" && env.GATEWAY_ALLOW_PRIVATE_UPSTREAMS === "true") {
    throw new Error("GATEWAY_ALLOW_PRIVATE_UPSTREAMS must never be enabled in production.");
  }
  return env;
}

/** One connection pool for the whole web app. */
export function getDb(): Db {
  db ??= createDb(serverEnv().DATABASE_URL, { maxConnections: serverEnv().DATABASE_POOL_MAX });
  return db;
}

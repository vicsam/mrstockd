import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

export * from "./schema.js";
export { schema };

// Re-exported so every package uses this package's single copy of Drizzle.
export { and, asc, desc, eq, gt, gte, inArray, isNull, lt, lte, ne, or, sql } from "drizzle-orm";

/** Any Drizzle Postgres database using this schema (postgres-js in prod, PGlite in tests). */
export type AnyDb = PgDatabase<PgQueryResultHKT, typeof schema>;

export function createDb(databaseUrl: string, options: { maxConnections?: number } = {}) {
  const client = postgres(databaseUrl, { max: options.maxConnections ?? 10, prepare: false });
  return drizzle(client, { schema });
}

export type Db = ReturnType<typeof createDb>;

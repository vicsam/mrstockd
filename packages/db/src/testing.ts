import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { migrationsFolder } from "./index.js";
import * as schema from "./schema.js";

/**
 * A real Postgres (with pgvector) running in-process, with every migration
 * applied. For tests only: no Docker or database server needed.
 */
export async function createTestDb() {
  const client = new PGlite({ extensions: { vector } });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder });
  return { db, close: () => client.close() };
}

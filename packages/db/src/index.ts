import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

export * from "./schema.js";
export { schema };

export function createDb(databaseUrl: string) {
  const client = postgres(databaseUrl, { max: 10, prepare: false });
  return drizzle(client, { schema });
}

export type Db = ReturnType<typeof createDb>;

// Runs database migrations once per deploy, even if several instances start
// at the same time, then starts the web service.
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const dbPkg = resolve(process.cwd(), "packages/db/package.json");
const requireFromDb = createRequire(dbPkg);
const postgres = requireFromDb("postgres");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(url, { max: 1, connect_timeout: 10, onnotice: () => {} });
// Advisory lock serialises migrators across instances.
await sql`SELECT pg_advisory_lock(8642731)`;
let migrateStatus = 0;
try {
  const result = spawnSync("pnpm", ["db:migrate"], { stdio: "inherit", shell: true });
  migrateStatus = result.status ?? 1;
} finally {
  await sql`SELECT pg_advisory_unlock(8642731)`;
  await sql.end({ timeout: 5 });
}
if (migrateStatus !== 0) process.exit(migrateStatus);

console.log("starting web");
const start = spawnSync("pnpm", ["--filter", "@mrstockd/web", "start"], { stdio: "inherit", shell: true });
process.exit(start.status ?? 0);

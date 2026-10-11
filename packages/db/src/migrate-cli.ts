/**
 * `pnpm db:migrate`: applies every pending migration and, if it can't,
 * says exactly why. (drizzle-kit's own migrate command hides the cause.)
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { migrationsFolder } from "./migrations.js";

/** Shows where we're connecting without printing the password. */
function describe(url: string): string {
  try {
    const u = new URL(url);
    return `${u.username || "?"}@${u.hostname}:${u.port || "5432"}${u.pathname}`;
  } catch {
    return "(unparseable DATABASE_URL)";
  }
}

/** Turns a connection or SQL error into a plain explanation and a fix. */
export function explain(error: unknown, target: string): string {
  let e = error as { code?: string; message?: string; cause?: unknown };
  while (e && !e.code && e.cause) e = e.cause as typeof e;
  switch (e?.code) {
    case "ECONNREFUSED":
      return `Nothing is accepting connections at ${target}.\n  Is the database running? Check with: docker ps`;
    case "57P03":
      return `The database at ${target} is still starting up and didn't finish in time. Try again in a moment.`;
    case "ENOTFOUND":
    case "EAI_AGAIN":
      return `The database host in DATABASE_URL can't be found (${target}). Check the hostname.`;
    case "ETIMEDOUT":
    case "CONNECT_TIMEOUT":
      return `Timed out connecting to ${target}. Check the host, port, and any firewall.`;
    case "28P01":
    case "28000":
      return [
        `The database rejected the username or password for ${target}.`,
        "  If PostgreSQL is also installed directly on this computer, it may be the one answering on",
        "  port 5432 instead of Docker. Either stop that service, or run the Docker container on",
        "  another port (docker run ... -p 5433:5432 ...) and use :5433 in DATABASE_URL.",
      ].join("\n");
    case "3D000":
      return `The database named in DATABASE_URL doesn't exist on ${target}. Create it, or fix the name.`;
    case "42501":
      return `The database user lacks permission. Run migrations as the database owner.`;
    default:
      return e?.message ?? String(error);
  }
}

/** Errors that mean "the database is still booting": worth waiting for. */
function isStartingUp(error: unknown): boolean {
  let e = error as { code?: string; cause?: unknown };
  while (e && !e.code && e.cause) e = e.cause as typeof e;
  return e?.code === "57P03" || e?.code === "ECONNREFUSED" || e?.code === "ECONNRESET";
}

const STARTUP_WAIT_MS = 30_000;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("✗ DATABASE_URL is not set.\n  Copy .env.example to .env at the repo root and fill it in.");
    process.exit(1);
  }
  const target = describe(url);
  const deadline = Date.now() + STARTUP_WAIT_MS;
  let announced = false;

  for (;;) {
    const client = postgres(url, { max: 1, connect_timeout: 10, onnotice: () => {} });
    try {
      await migrate(drizzle(client), { migrationsFolder });
      console.log(`✓ Database is up to date (${target})`);
      return;
    } catch (error) {
      // A freshly started container needs a few seconds before it accepts connections.
      if (isStartingUp(error) && Date.now() < deadline) {
        if (!announced) console.log(`… Waiting for the database at ${target} to finish starting`);
        announced = true;
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      console.error(`✗ Migration failed (${target})\n  ${explain(error, target)}`);
      process.exitCode = 1;
      return;
    } finally {
      await client.end({ timeout: 5 });
    }
  }
}

await main();

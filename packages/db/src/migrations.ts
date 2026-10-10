import { fileURLToPath } from "node:url";

/**
 * Absolute path to the SQL migrations, for programmatic migrate() calls.
 * Kept out of the main entry so bundlers (Next.js) never try to include it.
 */
export const migrationsFolder = fileURLToPath(new URL("../migrations", import.meta.url));

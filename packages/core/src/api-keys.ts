import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * API keys issued by MrStockd. Only the hash is stored. The full key is
 * shown to the buyer once, at creation.
 *
 * Format: mrs_live_<prefix>_<secret> (or mrs_test_ in the sandbox).
 * The prefix is stored in plain text so a key can be looked up and shown
 * in dashboards ("mrs_test_a1b2c3d4e5f6…") without exposing the secret.
 */

export type KeyEnvironment = "live" | "test";

export interface IssuedApiKey {
  /** Full key. Return to the buyer once, never store. */
  key: string;
  /** Lookup prefix, safe to store and display. */
  prefix: string;
  /** SHA-256 hash of the full key, hex. Store this. */
  hash: string;
}

// 12 hex chars (48 bits) keeps prefix collisions negligible into the millions of keys.
const KEY_PATTERN = /^mrs_(live|test)_([a-f0-9]{12})_([A-Za-z0-9_-]{43})$/;

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("hex");
}

export function generateApiKey(env: KeyEnvironment): IssuedApiKey {
  const prefix = randomBytes(6).toString("hex");
  const secret = randomBytes(32).toString("base64url");
  const key = `mrs_${env}_${prefix}_${secret}`;
  return { key, prefix, hash: hashApiKey(key) };
}

/** Extracts the lookup prefix, or null if the key is malformed. */
export function parseApiKeyPrefix(key: string): string | null {
  const match = KEY_PATTERN.exec(key);
  return match?.[2] ?? null;
}

/** Constant-time comparison of a presented key against a stored hash. */
export function verifyApiKey(presented: string, storedHash: string): boolean {
  const a = Buffer.from(hashApiKey(presented), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

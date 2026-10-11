import { parseApiKeyPrefix } from "@mrstockd/core";
import { GatewayError, type GatewayClient, type KeyInfo } from "./gateway-client.js";

/**
 * The API keys this agent may use, one or more per tool. Keys are given in
 * MRSTOCKD_API_KEYS; the gateway says which tool each one is for. Keys never
 * appear in tool results: only their short prefix does.
 */

export interface KeyEntry {
  key: string;
  prefix: string;
  info: KeyInfo;
}

export interface KeyProblem {
  prefix: string | null;
  problem: string;
}

/** Splits a comma, space or newline separated list. */
export function parseKeyList(raw: string | undefined): { keys: string[]; malformed: number } {
  const parts = (raw ?? "").split(/[\s,]+/).filter(Boolean);
  const keys = parts.filter((k) => parseApiKeyPrefix(k));
  return { keys: [...new Set(keys)], malformed: parts.length - keys.length };
}

export function createKeyring(client: GatewayClient, rawKeys: string[], options: { ttlMs?: number; now?: () => number } = {}) {
  const ttlMs = options.ttlMs ?? 60_000;
  const now = options.now ?? Date.now;
  let cache: { at: number; entries: KeyEntry[]; problems: KeyProblem[] } | null = null;

  async function load() {
    if (cache && now() - cache.at < ttlMs) return cache;
    const entries: KeyEntry[] = [];
    const problems: KeyProblem[] = [];
    await Promise.all(
      rawKeys.map(async (key) => {
        const prefix = parseApiKeyPrefix(key)!;
        try {
          entries.push({ key, prefix, info: await client.keyInfo(key) });
        } catch (e) {
          if (e instanceof GatewayError && e.status === 0) throw e;
          problems.push({ prefix, problem: e instanceof GatewayError ? e.message : "Couldn't check this key." });
        }
      }),
    );
    cache = { at: now(), entries, problems };
    return cache;
  }

  /** Paid keys first, then those with the most credits left. */
  function rank(a: KeyEntry, b: KeyEntry) {
    if (a.info.environment !== b.info.environment) return a.info.environment === "live" ? -1 : 1;
    return (b.info.creditsRemaining ?? Infinity) - (a.info.creditsRemaining ?? Infinity);
  }

  return {
    get size() {
      return rawKeys.length;
    },
    async all() {
      return load();
    },
    async forTool(slug: string): Promise<KeyEntry | null> {
      const { entries } = await load();
      return entries.filter((e) => e.info.tool.slug === slug).sort(rank)[0] ?? null;
    },
    async slugs(): Promise<Set<string>> {
      return new Set((await load()).entries.map((e) => e.info.tool.slug));
    },
    /** Keeps the cached balance current after a call, without another lookup. */
    noteCredits(slug: string, prefix: string, creditsRemaining: number | null) {
      const entry = cache?.entries.find((e) => e.prefix === prefix && e.info.tool.slug === slug);
      if (entry && creditsRemaining !== null) entry.info.creditsRemaining = creditsRemaining;
    },
    /** Drops the cache, e.g. after a key was refused. */
    refresh() {
      cache = null;
    },
  };
}

export type Keyring = ReturnType<typeof createKeyring>;

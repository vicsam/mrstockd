export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Seconds until the window resets. */
  retryAfter: number;
}

export interface RateLimiter {
  hit(id: string): RateLimitResult;
}

/**
 * Fixed-window limiter kept in memory. Correct for a single gateway
 * instance; swap for a Redis-backed limiter when running several.
 */
export function createMemoryRateLimiter(limit: number, windowMs = 60_000, now = () => Date.now()): RateLimiter {
  const windows = new Map<string, { count: number; resetAt: number }>();
  let lastSweep = now();

  return {
    hit(id) {
      const t = now();
      if (t - lastSweep > windowMs) {
        for (const [key, w] of windows) if (w.resetAt <= t) windows.delete(key);
        lastSweep = t;
      }
      let w = windows.get(id);
      if (!w || w.resetAt <= t) {
        w = { count: 0, resetAt: t + windowMs };
        windows.set(id, w);
      }
      w.count += 1;
      return {
        allowed: w.count <= limit,
        remaining: Math.max(0, limit - w.count),
        retryAfter: Math.ceil((w.resetAt - t) / 1000),
      };
    },
  };
}

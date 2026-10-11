import { decryptSecret, parseApiKeyPrefix, UnsafeUrlError, verifyApiKey } from "@mrstockd/core";
import { Hono, type Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import type { RateLimiter } from "./rate-limit.js";
import type { GatewayStore, KeyRecord, ListingRecord } from "./store.js";
import type { UpstreamClient } from "./upstream.js";

/**
 * The gateway sits between buyers (people or agents) and sellers' tools.
 * Every call to /v1/tools/:slug/* goes through, in order:
 *
 *   1. API key: parsed, looked up by prefix, verified against its hash
 *   2. Tool:    the key must belong to this listing, and the listing must be
 *               live (sellers' own test keys work at any status)
 *   3. Rate limit per key
 *   4. Access:  subscription still valid, or one credit taken atomically
 *   5. Proxy:   SSRF-guarded call to the seller's endpoint with their
 *               decrypted secret; the buyer's key never leaves the gateway
 *   6. Metering: usage recorded; the credit is refunded if the seller's
 *               tool failed (5xx, timeout, unreachable, redirect)
 */

export interface GatewayDeps {
  store: GatewayStore;
  upstream: UpstreamClient;
  rateLimiter: RateLimiter;
  /** Key for decrypting sellers' upstream secrets. */
  encryptionKey: Buffer;
  now?: () => Date;
}

const CREDITS_PER_CALL = 1;
const TOOL_PREFIX = "/v1/tools/";

/** Request headers passed through to the seller. Everything else is dropped. */
const FORWARDED_REQUEST_HEADERS = ["accept", "accept-language", "content-type", "user-agent"];

/** Response headers never passed back to the buyer. */
const STRIPPED_RESPONSE_HEADERS = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "set-cookie",
  // undici decodes compressed bodies, so these would no longer be accurate
  "content-encoding",
  "content-length",
]);

function error(c: Context, status: number, code: string, message: string, headers?: Record<string, string>) {
  return c.json({ error: { code, message } }, status as 400, headers);
}

/** Joins the listing's base URL with the sub-path the buyer called. */
export function buildUpstreamUrl(endpointUrl: string, subPath: string, search: string): URL {
  const base = new URL(endpointUrl);
  const basePath = base.pathname.endsWith("/") ? base.pathname : `${base.pathname}/`;
  const target = new URL(base.toString());
  target.pathname = basePath + subPath.replace(/^\/+/, "");
  target.search = search;
  target.hash = "";
  if (target.host !== base.host) throw new UnsafeUrlError("path escaped the seller's host");
  return target;
}

export function createApp(deps: GatewayDeps) {
  const now = deps.now ?? (() => new Date());
  const app = new Hono();

  app.use("*", requestId());
  app.use("*", secureHeaders());
  app.use("/v1/*", bodyLimit({ maxSize: 5 * 1024 * 1024 }));

  app.get("/health", (c) => c.json({ ok: true, service: "gateway" }));

  // People sometimes open the gateway in a browser; say what it is.
  app.get("/", (c) =>
    c.json({
      service: "MrStockd gateway",
      about: "This is the API that buyers' apps and AI agents call. It has no web pages.",
      usage: "POST or GET /v1/tools/<tool-slug>/<path> with the header 'Authorization: Bearer <your MrStockd API key>'",
      health: "/health",
    }),
  );

  app.all("/v1/tools/:slug/*", async (c) => {
    const started = performance.now();
    const slug = c.req.param("slug");

    // 1. API key
    const header = c.req.header("authorization") ?? "";
    const presented = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    const prefix = parseApiKeyPrefix(presented);
    if (!prefix) return error(c, 401, "invalid_api_key", "Send a MrStockd API key as: Authorization: Bearer mrs_...");

    const key: KeyRecord | null = await deps.store.findKeyByPrefix(prefix);
    // Same response for unknown and wrong keys, so keys can't be probed.
    if (!key || !verifyApiKey(presented, key.keyHash)) {
      return error(c, 401, "invalid_api_key", "This API key is not valid.");
    }
    if (key.revokedAt) return error(c, 401, "api_key_revoked", "This API key has been revoked.");

    // 2. Tool
    const listing: ListingRecord | null = await deps.store.findListingBySlug(slug);
    if (!listing) return error(c, 404, "tool_not_found", `No tool named "${slug}".`);
    if (listing.id !== key.listingId) {
      return error(c, 403, "key_not_valid_for_tool", "This API key was issued for a different tool.");
    }
    // Sellers try their own tool with a test key before and during review.
    const isTest = key.environment === "test";
    if (!isTest && listing.status !== "live") return error(c, 503, "tool_unavailable", "This tool is not currently available.");

    // 3. Rate limit
    const limit = deps.rateLimiter.hit(key.id);
    if (!limit.allowed) {
      return error(c, 429, "rate_limited", "Too many requests. Slow down and retry.", {
        "Retry-After": String(limit.retryAfter),
      });
    }

    // 4. Access
    let creditsCharged = 0;
    let creditsRemaining: number | null = null;
    if (listing.pricingModel === "subscription") {
      if (!key.validUntil || key.validUntil <= now()) {
        return error(c, 402, "subscription_inactive", "This subscription has ended. Renew it on MrStockd.");
      }
      await deps.store.touchKey(key.id);
    } else {
      creditsRemaining = await deps.store.consumeCredits(key.id, CREDITS_PER_CALL);
      if (creditsRemaining === null) {
        return error(c, 402, "insufficient_credits", "No credits left on this key. Buy more on MrStockd.");
      }
      creditsCharged = CREDITS_PER_CALL;
    }

    const settle = async (statusCode: number, sellerFailed: boolean) => {
      let creditsUsed = creditsCharged;
      if (sellerFailed && creditsCharged > 0) {
        await deps.store.refundCredits(key.id, creditsCharged).catch((e) => console.error("refund failed", e));
        if (creditsRemaining !== null) creditsRemaining += creditsCharged;
        creditsUsed = 0;
      }
      await deps.store
        .recordUsage({
          apiKeyId: key.id,
          listingId: listing.id,
          creditsUsed,
          statusCode,
          latencyMs: Math.round(performance.now() - started),
        })
        .catch((e) => console.error("usage record failed", e));
    };

    const meterHeaders = (): Record<string, string> => ({
      ...(creditsRemaining === null ? {} : { "X-MrStockd-Credits-Remaining": String(creditsRemaining) }),
      ...(isTest ? { "X-MrStockd-Test-Key": "true" } : {}),
    });

    // 5. Proxy
    const subPath = c.req.path.slice(TOOL_PREFIX.length + slug.length);
    let target: URL;
    try {
      target = buildUpstreamUrl(listing.endpointUrl, subPath, new URL(c.req.url).search);
    } catch {
      await settle(502, true);
      return error(c, 502, "upstream_misconfigured", "This tool's endpoint is misconfigured.", meterHeaders());
    }

    const headers: Record<string, string> = {};
    for (const name of FORWARDED_REQUEST_HEADERS) {
      const value = c.req.header(name);
      if (value) headers[name] = value;
    }
    headers["x-mrstockd-request-id"] = c.get("requestId");
    // Lets the seller tell their own test traffic apart from paying buyers.
    headers["x-mrstockd-environment"] = key.environment;
    if (listing.upstreamSecretEnc) {
      headers.authorization = `Bearer ${decryptSecret(listing.upstreamSecretEnc, deps.encryptionKey)}`;
    }

    const method = c.req.method;
    const body = method === "GET" || method === "HEAD" ? null : c.req.raw.body;

    let upstream;
    try {
      upstream = await deps.upstream.send(target, { method, headers, body });
    } catch (e) {
      const blocked = e instanceof UnsafeUrlError || (e as { cause?: unknown })?.cause instanceof UnsafeUrlError;
      const timedOut = (e as Error)?.name === "TimeoutError";
      const status = timedOut ? 504 : 502;
      await settle(status, true);
      if (blocked) {
        console.error(`blocked upstream for listing ${listing.id}:`, e);
        return error(c, 502, "upstream_blocked", "This tool's endpoint is not allowed.", meterHeaders());
      }
      return timedOut
        ? error(c, 504, "upstream_timeout", "The tool took too long to respond.", meterHeaders())
        : error(c, 502, "upstream_unavailable", "The tool could not be reached.", meterHeaders());
    }

    if (upstream.status >= 300 && upstream.status < 400) {
      // Following redirects could bypass the SSRF guard, and passing them on
      // would leak the seller's real endpoint.
      await upstream.body?.cancel();
      await settle(502, true);
      return error(c, 502, "upstream_redirect", "The tool tried to redirect, which is not allowed.", meterHeaders());
    }

    // 6. Metering
    const sellerFailed = upstream.status >= 500;
    await settle(upstream.status, sellerFailed);

    const responseHeaders = new Headers();
    upstream.headers.forEach((value, name) => {
      if (!STRIPPED_RESPONSE_HEADERS.has(name.toLowerCase())) responseHeaders.set(name, value);
    });
    for (const [name, value] of Object.entries(meterHeaders())) responseHeaders.set(name, value);
    responseHeaders.set("x-mrstockd-request-id", c.get("requestId"));

    return new Response(upstream.body as ReadableStream | null, {
      status: upstream.status,
      headers: responseHeaders,
    });
  });

  app.notFound((c) => error(c, 404, "not_found", "Not found."));
  app.onError((err, c) => {
    console.error(err);
    return error(c, 500, "internal_error", "Something went wrong on our side.");
  });

  return app;
}

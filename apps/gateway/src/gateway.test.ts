import { randomBytes } from "node:crypto";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { encryptSecret, generateApiKey, parseEncryptionKey } from "@mrstockd/core";
import { apiKeys, eq, listings, sellers, usageEvents } from "@mrstockd/db";
import { createTestDb } from "@mrstockd/db/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { createDbStore } from "./db-store.js";
import { createMemoryRateLimiter } from "./rate-limit.js";
import { createUpstreamClient, safeLookup } from "./upstream.js";

/* ------------------------------------------------------------------ */
/* A fake seller tool                                                  */
/* ------------------------------------------------------------------ */

let seller: Server;
let sellerUrl: string;

function startSellerTool(): Promise<void> {
  seller = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const url = new URL(req.url ?? "/", "http://x");
      if (url.pathname.endsWith("/fail")) {
        res.writeHead(500, { "content-type": "application/json" }).end('{"oops":true}');
      } else if (url.pathname.endsWith("/redirect")) {
        res.writeHead(302, { location: "http://169.254.169.254/latest/meta-data" }).end();
      } else if (url.pathname.endsWith("/slow")) {
        setTimeout(() => res.writeHead(200).end("late"), 1500);
      } else {
        res
          .writeHead(200, { "content-type": "application/json", "set-cookie": "seller_session=abc", "x-seller-header": "yes" })
          .end(
            JSON.stringify({
              method: req.method,
              path: url.pathname,
              query: url.search,
              headers: req.headers,
              body: Buffer.concat(chunks).toString("utf8"),
            }),
          );
      }
    });
  });
  return new Promise((resolve) =>
    seller.listen(0, "127.0.0.1", () => {
      sellerUrl = `http://127.0.0.1:${(seller.address() as AddressInfo).port}/api`;
      resolve();
    }),
  );
}

/* ------------------------------------------------------------------ */
/* Database fixtures                                                   */
/* ------------------------------------------------------------------ */

const encryptionKey = parseEncryptionKey(randomBytes(32).toString("base64"));
let testDb: Awaited<ReturnType<typeof createTestDb>>;
const ids: Record<string, string> = {};

async function seed() {
  const { db } = testDb;
  const [s] = await db.insert(sellers).values({ ownerId: "seller-user", displayName: "Lagos Labs" }).returning();
  const base = {
    sellerId: s!.id,
    summary: "test",
    description: "test",
    unitPriceCents: 500,
    endpointUrl: sellerUrl,
    upstreamSecretEnc: encryptSecret("seller-upstream-secret", encryptionKey),
  };
  const rows = await db
    .insert(listings)
    .values([
      { ...base, slug: "invoice-extractor", name: "Invoice Extractor", pricingModel: "credits", status: "live" },
      { ...base, slug: "yoruba-translator", name: "Yoruba Translator", pricingModel: "subscription", status: "live" },
      { ...base, slug: "draft-tool", name: "Draft Tool", pricingModel: "credits", status: "draft" },
    ])
    .returning();
  for (const r of rows) ids[r.slug] = r.id;
}

async function issueKey(slug: string, opts: { credits?: number; validUntil?: Date; revoked?: boolean } = {}) {
  const issued = generateApiKey("test");
  const [row] = await testDb.db
    .insert(apiKeys)
    .values({
      ownerId: "buyer-user",
      listingId: ids[slug]!,
      prefix: issued.prefix,
      keyHash: issued.hash,
      creditsRemaining: opts.credits ?? 0,
      validUntil: opts.validUntil ?? null,
      revokedAt: opts.revoked ? new Date() : null,
    })
    .returning();
  return { key: issued.key, id: row!.id };
}

async function creditsOf(keyId: string) {
  const [row] = await testDb.db.select().from(apiKeys).where(eq(apiKeys.id, keyId));
  return row!.creditsRemaining;
}

async function usageFor(keyId: string) {
  return testDb.db.select().from(usageEvents).where(eq(usageEvents.apiKeyId, keyId));
}

function makeApp(overrides: { allowPrivate?: boolean; rateLimit?: number; timeoutMs?: number } = {}) {
  return createApp({
    store: createDbStore(testDb.db),
    upstream: createUpstreamClient({ allowPrivate: overrides.allowPrivate ?? true, timeoutMs: overrides.timeoutMs ?? 5000 }),
    rateLimiter: createMemoryRateLimiter(overrides.rateLimit ?? 1000),
    encryptionKey,
  });
}

const call = (app: ReturnType<typeof makeApp>, path: string, key?: string, init: RequestInit = {}) =>
  app.request(path, { ...init, headers: { ...(key ? { authorization: `Bearer ${key}` } : {}), ...(init.headers ?? {}) } });

beforeAll(async () => {
  await startSellerTool();
  testDb = await createTestDb();
  await seed();
}, 60_000);

afterAll(async () => {
  seller?.close();
  await testDb?.close();
});

/* ------------------------------------------------------------------ */
/* Tests                                                               */
/* ------------------------------------------------------------------ */

describe("authentication", () => {
  it("rejects a missing or malformed key", async () => {
    const app = makeApp();
    expect((await call(app, "/v1/tools/invoice-extractor/run")).status).toBe(401);
    expect((await call(app, "/v1/tools/invoice-extractor/run", "not-a-key")).status).toBe(401);
  });

  it("rejects a well-formed key with the wrong secret, identically to an unknown key", async () => {
    const app = makeApp();
    const { key } = await issueKey("invoice-extractor", { credits: 5 });
    const tampered = key.slice(0, -4) + "AAAA";
    const res = await call(app, "/v1/tools/invoice-extractor/run", tampered);
    expect(res.status).toBe(401);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("invalid_api_key");
  });

  it("rejects a revoked key", async () => {
    const { key } = await issueKey("invoice-extractor", { credits: 5, revoked: true });
    expect((await call(makeApp(), "/v1/tools/invoice-extractor/run", key)).status).toBe(401);
  });

  it("rejects a key used on a different tool", async () => {
    const { key, id } = await issueKey("invoice-extractor", { credits: 5 });
    const res = await call(makeApp(), "/v1/tools/yoruba-translator/run", key);
    expect(res.status).toBe(403);
    expect(await creditsOf(id)).toBe(5);
  });

  it("refuses tools that are not live", async () => {
    const { key } = await issueKey("draft-tool", { credits: 5 });
    expect((await call(makeApp(), "/v1/tools/draft-tool/run", key)).status).toBe(503);
  });
});

describe("proxying a paid call", () => {
  it("forwards path, query, and body, swaps in the seller's secret, and charges one credit", async () => {
    const { key, id } = await issueKey("invoice-extractor", { credits: 3 });
    const res = await call(makeApp(), "/v1/tools/invoice-extractor/v2/extract?lang=en", key, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: "buyer_session=secret" },
      body: JSON.stringify({ invoice: "INV-1" }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("x-mrstockd-credits-remaining")).toBe("2");
    expect(res.headers.get("x-seller-header")).toBe("yes");
    expect(res.headers.get("set-cookie")).toBeNull();

    const echo = (await res.json()) as { method: string; path: string; query: string; headers: Record<string, string>; body: string };
    expect(echo.method).toBe("POST");
    expect(echo.path).toBe("/api/v2/extract");
    expect(echo.query).toBe("?lang=en");
    expect(JSON.parse(echo.body)).toEqual({ invoice: "INV-1" });
    // The seller sees their own secret, never the buyer's MrStockd key or cookies.
    expect(echo.headers.authorization).toBe("Bearer seller-upstream-secret");
    expect(JSON.stringify(echo.headers)).not.toContain(key);
    expect(echo.headers.cookie).toBeUndefined();
    expect(echo.headers["x-mrstockd-request-id"]).toBeTruthy();

    expect(await creditsOf(id)).toBe(2);
    const usage = await usageFor(id);
    expect(usage).toHaveLength(1);
    expect(usage[0]).toMatchObject({ creditsUsed: 1, statusCode: 200 });
  });

  it("returns 402 once credits run out", async () => {
    const { key, id } = await issueKey("invoice-extractor", { credits: 1 });
    const app = makeApp();
    expect((await call(app, "/v1/tools/invoice-extractor/run", key)).status).toBe(200);
    const res = await call(app, "/v1/tools/invoice-extractor/run", key);
    expect(res.status).toBe(402);
    expect(await creditsOf(id)).toBe(0);
  });

  it("never spends the same credit twice under concurrent calls", async () => {
    const { key, id } = await issueKey("invoice-extractor", { credits: 3 });
    const app = makeApp();
    const results = await Promise.all(Array.from({ length: 8 }, () => call(app, "/v1/tools/invoice-extractor/run", key)));
    const ok = results.filter((r) => r.status === 200).length;
    expect(ok).toBe(3);
    expect(results.filter((r) => r.status === 402).length).toBe(5);
    expect(await creditsOf(id)).toBe(0);
  });
});

describe("seller-side failures are not charged", () => {
  it("refunds the credit when the tool returns a 5xx", async () => {
    const { key, id } = await issueKey("invoice-extractor", { credits: 2 });
    const res = await call(makeApp(), "/v1/tools/invoice-extractor/fail", key);
    expect(res.status).toBe(500);
    expect(res.headers.get("x-mrstockd-credits-remaining")).toBe("2");
    expect(await creditsOf(id)).toBe(2);
    expect((await usageFor(id))[0]).toMatchObject({ creditsUsed: 0, statusCode: 500 });
  });

  it("blocks redirects and refunds", async () => {
    const { key, id } = await issueKey("invoice-extractor", { credits: 2 });
    const res = await call(makeApp(), "/v1/tools/invoice-extractor/redirect", key);
    expect(res.status).toBe(502);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("upstream_redirect");
    expect(await creditsOf(id)).toBe(2);
  });

  it("times out slow tools and refunds", async () => {
    const { key, id } = await issueKey("invoice-extractor", { credits: 2 });
    const res = await call(makeApp({ timeoutMs: 300 }), "/v1/tools/invoice-extractor/slow", key);
    expect(res.status).toBe(504);
    expect(await creditsOf(id)).toBe(2);
  });
});

describe("subscriptions", () => {
  it("allows calls while active without spending credits", async () => {
    const { key, id } = await issueKey("yoruba-translator", { validUntil: new Date(Date.now() + 86_400_000) });
    const res = await call(makeApp(), "/v1/tools/yoruba-translator/translate", key);
    expect(res.status).toBe(200);
    expect(res.headers.get("x-mrstockd-credits-remaining")).toBeNull();
    expect((await usageFor(id))[0]).toMatchObject({ creditsUsed: 0, statusCode: 200 });
  });

  it("returns 402 after the subscription ends", async () => {
    const { key } = await issueKey("yoruba-translator", { validUntil: new Date(Date.now() - 1000) });
    expect((await call(makeApp(), "/v1/tools/yoruba-translator/translate", key)).status).toBe(402);
  });
});

describe("rate limiting", () => {
  it("returns 429 with Retry-After past the per-key limit", async () => {
    const { key } = await issueKey("invoice-extractor", { credits: 10 });
    const app = makeApp({ rateLimit: 2 });
    await call(app, "/v1/tools/invoice-extractor/run", key);
    await call(app, "/v1/tools/invoice-extractor/run", key);
    const res = await call(app, "/v1/tools/invoice-extractor/run", key);
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("retry-after"))).toBeGreaterThan(0);
  });
});

describe("SSRF protection (production mode)", () => {
  it("refuses a listing that points at a private address, and refunds", async () => {
    const { key, id } = await issueKey("invoice-extractor", { credits: 2 });
    const res = await call(makeApp({ allowPrivate: false }), "/v1/tools/invoice-extractor/run", key);
    expect(res.status).toBe(502);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("upstream_blocked");
    expect(await creditsOf(id)).toBe(2);
  });

  it("refuses https endpoints on internal addresses (cloud metadata, private network)", async () => {
    const app = makeApp({ allowPrivate: false });
    for (const [slug, endpointUrl] of [
      ["metadata-probe", "https://169.254.169.254/latest"],
      ["private-probe", "https://10.0.0.5/api"],
    ] as const) {
      const [s] = await testDb.db.select().from(sellers).limit(1);
      const [l] = await testDb.db
        .insert(listings)
        .values({ sellerId: s!.id, slug, name: slug, summary: "x", description: "x", unitPriceCents: 100, pricingModel: "credits", status: "live", endpointUrl })
        .returning();
      ids[slug] = l!.id;
      const { key, id } = await issueKey(slug, { credits: 1 });
      const res = await call(app, `/v1/tools/${slug}/run`, key);
      expect(res.status).toBe(502);
      expect(((await res.json()) as { error: { code: string } }).error.code).toBe("upstream_blocked");
      expect(await creditsOf(id)).toBe(1);
    }
  });

  it("refuses private addresses at connect time (DNS rebinding)", async () => {
    const err = await new Promise<Error | null>((resolve) => safeLookup("localhost", {}, (e) => resolve(e)));
    expect(err?.message).toMatch(/blocked address/);
  });
});

import { generateApiKey } from "@mrstockd/core";
import { apiKeys, listings, orders, sellers, usageEvents } from "@mrstockd/db";
import { createTestDb } from "@mrstockd/db/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAnalytics } from "./index.js";

const NOW = new Date("2026-10-11T12:00:00Z");
const ago = (hours: number) => new Date(NOW.getTime() - hours * 60 * 60 * 1000);

let testDb: Awaited<ReturnType<typeof createTestDb>>;
let analytics: ReturnType<typeof createAnalytics>;
const ids: Record<string, string> = {};

async function key(listing: string, ownerId: string, environment: "live" | "test" = "live", revoked = false) {
  const k = generateApiKey(environment);
  const [row] = await testDb.db
    .insert(apiKeys)
    .values({ ownerId, listingId: ids[listing]!, environment, prefix: k.prefix, keyHash: k.hash, creditsRemaining: 10, revokedAt: revoked ? NOW : null })
    .returning();
  return row!.id;
}

beforeAll(async () => {
  testDb = await createTestDb();
  analytics = createAnalytics({ db: testDb.db, now: () => NOW });
  const { db } = testDb;
  const [ada, bola] = await db
    .insert(sellers)
    .values([
      { ownerId: "ada", displayName: "Lagos Labs" },
      { ownerId: "bola", displayName: "Abuja AI" },
    ])
    .returning();
  const base = { summary: "s", description: "d", endpointUrl: "https://8.8.8.8/x", unitPriceCents: 500 };
  const rows = await db
    .insert(listings)
    .values([
      { ...base, sellerId: ada!.id, slug: "summary", name: "Summary", pricingModel: "credits", status: "live" },
      { ...base, sellerId: ada!.id, slug: "draft", name: "Draft", pricingModel: "credits", status: "in_review" },
      { ...base, sellerId: bola!.id, slug: "other", name: "Other", pricingModel: "subscription", status: "live" },
    ])
    .returning();
  for (const r of rows) ids[r.slug] = r.id;

  const buyer1 = await key("summary", "buyer-1");
  await key("summary", "buyer-1"); // same buyer, second key
  await key("summary", "buyer-2");
  await key("summary", "buyer-3", "live", true); // revoked: not active
  const test = await key("summary", "ada", "test");
  const other = await key("other", "buyer-1");

  const ev = (apiKeyId: string, listing: string, hoursAgo: number, statusCode: number, latencyMs: number) => ({
    apiKeyId,
    listingId: ids[listing]!,
    statusCode,
    latencyMs,
    creditsUsed: statusCode >= 500 ? 0 : 1,
    createdAt: ago(hoursAgo),
  });
  await db.insert(usageEvents).values([
    // last 24h: 3 calls, one failure
    ev(buyer1, "summary", 1, 200, 100),
    ev(buyer1, "summary", 2, 502, 300),
    ev(test, "summary", 3, 200, 200),
    // this week, older than a day
    ev(buyer1, "summary", 50, 200, 400),
    // older than a week: only in all-time
    ev(buyer1, "summary", 24 * 10, 200, 999),
    // someone else's tool
    ev(other, "other", 1, 200, 50),
  ]);

  const order = (listing: string, subtotal: number, status: "completed" | "created") => ({
    buyerId: "buyer-1",
    listingId: ids[listing]!,
    quantity: 1,
    subtotalCents: subtotal,
    platformFeeCents: subtotal / 10,
    sellerPayoutCents: subtotal - subtotal / 10,
    status,
  });
  await db.insert(orders).values([order("summary", 500, "completed"), order("summary", 1000, "completed"), order("summary", 9000, "created"), order("other", 3000, "completed")]);
}, 60_000);

afterAll(async () => testDb?.close());

describe("seller dashboard", () => {
  it("only includes the seller's own tools", async () => {
    const d = await analytics.sellerDashboard("ada");
    expect(d.tools.map((t) => t.slug)).toEqual(["draft", "summary"]);
    expect(JSON.stringify(d)).not.toContain("Other");
    expect(d.recentCalls.every((c) => c.toolSlug !== "other")).toBe(true);
  });

  it("counts calls, failures and latency over the right windows", async () => {
    const t = (await analytics.sellerDashboard("ada")).tools.find((x) => x.slug === "summary")!;
    expect(t).toMatchObject({ calls24h: 3, calls7d: 4, testCalls7d: 1, failures7d: 1, callsAllTime: 5, avgLatencyMs7d: 250 });
    expect(t.failureRate7d).toBeCloseTo(0.25);
    expect(t.p95LatencyMs7d).toBe(385); // between 300 and 400
    expect(t.lastCallAt?.toISOString()).toBe(ago(1).toISOString());
  });

  it("counts active paid keys, distinct buyers, and completed sales only", async () => {
    const d = await analytics.sellerDashboard("ada");
    const t = d.tools.find((x) => x.slug === "summary")!;
    expect(t).toMatchObject({ activeKeys: 3, buyers: 2, grossSalesCents: 1500, sellerRevenueCents: 1350 });
    expect(d.totals).toMatchObject({ tools: 2, liveTools: 1, inReview: 1, calls24h: 3, calls7d: 4, buyers: 2, sellerRevenueCents: 1350, platformFeesCents: 150 });
  });

  it("gives empty numbers, not nulls or errors, for a tool with no calls", async () => {
    const t = (await analytics.sellerDashboard("ada")).tools.find((x) => x.slug === "draft")!;
    expect(t).toMatchObject({ calls7d: 0, failureRate7d: null, avgLatencyMs7d: null, lastCallAt: null, activeKeys: 0, sellerRevenueCents: 0 });
  });

  it("fills every day, oldest first, including quiet ones", async () => {
    const { daily } = await analytics.sellerDashboard("ada", { days: 14 });
    expect(daily).toHaveLength(14);
    expect(daily.at(-1)).toEqual({ day: "2026-10-11", calls: 3, failures: 1 });
    expect(daily.find((d) => d.day === "2026-10-09")).toEqual({ day: "2026-10-09", calls: 1, failures: 0 });
    expect(daily.reduce((n, d) => n + d.calls, 0)).toBe(5); // includes the 10-day-old call
    const week = await analytics.sellerDashboard("ada", { days: 7 });
    expect(week.daily.reduce((n, d) => n + d.calls, 0)).toBe(4); // but not in a 7-day chart
  });

  it("returns an empty dashboard for someone with no tools", async () => {
    const d = await analytics.sellerDashboard("nobody");
    expect(d.tools).toEqual([]);
    expect(d.totals.calls7d).toBe(0);
    expect(d.daily).toHaveLength(14);
  });
});

describe("admin dashboard", () => {
  it("covers every seller's tools, with buyers counted once across tools", async () => {
    const d = await analytics.adminDashboard();
    expect(d.tools.map((t) => t.slug).sort()).toEqual(["draft", "other", "summary"]);
    expect(d.tools.find((t) => t.slug === "other")!.sellerName).toBe("Abuja AI");
    expect(d.totals).toMatchObject({ tools: 3, liveTools: 2, calls24h: 4, buyers: 2, grossSalesCents: 4500, platformFeesCents: 450 });
  });
});
